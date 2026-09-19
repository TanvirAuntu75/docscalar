#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use std::env;

fn main() {
    // Use fixed port 8765 for desktop mode (avoids conflicts with dev server on 8000)
    let backend_port: u16 = 8765;

    // Set env vars BEFORE anything starts so the sidecar inherits them
    env::set_var("DOCSCALAR_DESKTOP", "true");
    env::set_var("DOCFORGE_DESKTOP", "true");
    env::set_var("IS_PACKAGED", "true");
    env::set_var("PORT", backend_port.to_string());
    env::set_var("HOST", "127.0.0.1");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            let handle = app.handle().clone();

            // Spawn the backend sidecar with environment variables passed directly
            match handle.shell().sidecar("docscalar-backend") {
                Ok(sidecar) => {
                    match sidecar
                        .env("DOCSCALAR_DESKTOP", "true")
                        .env("DOCFORGE_DESKTOP", "true")
                        .env("IS_PACKAGED", "true")
                        .env("PORT", backend_port.to_string())
                        .env("HOST", "127.0.0.1")
                        .spawn()
                    {
                        Ok(_) => {
                            println!("DocScalar: Backend started on port {}", backend_port);
                        }
                        Err(e) => {
                            eprintln!("DocScalar: Backend spawn failed: {}", e);
                            // Do NOT panic - allow the app to open and show an error via the UI
                        }
                    }
                }
                Err(e) => {
                    eprintln!("DocScalar: Could not find backend sidecar binary: {}", e);
                    // Do NOT panic - allow the app to open
                }
            }

            // Inject backend URL into the WebView BEFORE the page scripts run
            if let Some(window) = app.get_webview_window("main") {
                // This runs before page JS - sets the backend URL globally
                let init_script = format!(
                    "window.__DOCSCALAR_BACKEND_URL__ = 'http://127.0.0.1:{}'; window.__DOCFORGE_BACKEND_URL__ = 'http://127.0.0.1:{}';",
                    backend_port, backend_port
                );
                let _ = window.eval(&init_script);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
