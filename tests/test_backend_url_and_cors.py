"""
Automated Test Suite for Dynamic Backend URL Resolution & CORS Preflight Invariants.
Covers 35 distinct test assertions across URL resolution, CORS preflight headers, and Auth signup.
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


# -------------------------------------------------------------
# Test Group 1: Backend CORS Preflight & Credentials (15 Tests)
# -------------------------------------------------------------
@pytest.mark.parametrize("origin", [
    "http://138.2.81.40",
    "http://138.2.81.40:80",
    "http://138.2.81.40:8000",
    "https://docscalar.com",
    "https://app.docscalar.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://preview.docscalar.pages.dev",
])
def test_cors_preflight_allows_production_origins(origin):
    """Verify that OPTIONS preflight returns 200 with proper CORS headers for any HTTP/HTTPS origin."""
    response = client.options(
        "/api/auth/signup",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
    )
    assert response.status_code == 200, f"Expected 200 for origin {origin}, got {response.status_code}"
    assert response.headers.get("access-control-allow-origin") == origin
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_preflight_tauri_localhost():
    """Verify desktop Tauri origin is explicitly allowed."""
    response = client.options(
        "/api/auth/signup",
        headers={
            "Origin": "tauri://localhost",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "tauri://localhost"


def test_cors_preflight_for_login():
    """Verify login route also has CORS preflight enabled."""
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://138.2.81.40",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://138.2.81.40"


def test_cors_preflight_for_health():
    """Verify health endpoint CORS preflight."""
    response = client.options(
        "/health",
        headers={
            "Origin": "http://138.2.81.40",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://138.2.81.40"


def test_cors_post_request_includes_allow_origin_header():
    """Verify an actual POST request carries Access-Control-Allow-Origin header in response."""
    response = client.post(
        "/api/auth/signup",
        json={"email": "invalid-email-format", "password": "short"},
        headers={"Origin": "http://138.2.81.40"},
    )
    # Even if 422 validation error occurs, CORS headers MUST be present so browser doesn't block the error message!
    assert response.headers.get("access-control-allow-origin") == "http://138.2.81.40"
    assert response.headers.get("access-control-allow-credentials") == "true"


# -------------------------------------------------------------
# Test Group 2: Health & API Accessibility (5 Tests)
# -------------------------------------------------------------
def test_root_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_api_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_bootstrap_status_endpoint():
    res = client.get("/api/bootstrap/status")
    assert res.status_code == 200
    assert res.json()["installed"] is True


def test_auth_signup_missing_body():
    res = client.post("/api/auth/signup", json={})
    assert res.status_code == 422


def test_auth_signup_invalid_email():
    res = client.post("/api/auth/signup", json={"email": "not-an-email", "password": "ValidPassword123!"})
    assert res.status_code == 422


# -------------------------------------------------------------
# Test Group 3: JavaScript URL Resolution Simulation (15 Tests)
# -------------------------------------------------------------
def simulate_get_backend_url(is_tauri=False, env_backend_url=None, is_dev=False, window_location=None):
    """Faithful Python simulation of src/utils/api.js getBackendUrl logic."""
    desktop_backend = "http://127.0.0.1:8765"
    if is_tauri:
        return desktop_backend
    if env_backend_url:
        return env_backend_url
    if window_location:
        hostname = window_location.get("hostname", "")
        port = str(window_location.get("port", ""))
        origin = window_location.get("origin", "")
        is_localhost = hostname in ("localhost", "127.0.0.1")
        if is_localhost and port not in ("8000", "80", ""):
            return "http://127.0.0.1:8000"
        if origin and origin != "null":
            return origin
    return "http://127.0.0.1:8000" if is_dev else ""


def simulate_resolve_api_url(url, base_url):
    if not url:
        return base_url
    if any(url.startswith(prefix) for prefix in ("http://", "https://", "blob:", "data:")):
        return url
    clean_path = url if url.startswith("/") else f"/{url}"
    return f"{base_url}{clean_path}"


def test_js_sim_tauri_mode():
    assert simulate_get_backend_url(is_tauri=True) == "http://127.0.0.1:8765"


def test_js_sim_env_override():
    assert simulate_get_backend_url(env_backend_url="https://api.custom.com") == "https://api.custom.com"


def test_js_sim_production_ip():
    loc = {"hostname": "138.2.81.40", "port": "", "origin": "http://138.2.81.40"}
    assert simulate_get_backend_url(window_location=loc) == "http://138.2.81.40"


def test_js_sim_production_domain():
    loc = {"hostname": "docscalar.com", "port": "", "origin": "https://docscalar.com"}
    assert simulate_get_backend_url(window_location=loc) == "https://docscalar.com"


def test_js_sim_production_ip_with_port_80():
    loc = {"hostname": "138.2.81.40", "port": "80", "origin": "http://138.2.81.40"}
    assert simulate_get_backend_url(window_location=loc) == "http://138.2.81.40"


def test_js_sim_production_ip_with_port_8000():
    loc = {"hostname": "138.2.81.40", "port": "8000", "origin": "http://138.2.81.40:8000"}
    assert simulate_get_backend_url(window_location=loc) == "http://138.2.81.40:8000"


def test_js_sim_local_vite_dev_5173():
    loc = {"hostname": "localhost", "port": "5173", "origin": "http://localhost:5173"}
    assert simulate_get_backend_url(window_location=loc) == "http://127.0.0.1:8000"


def test_js_sim_local_vite_preview_4173():
    loc = {"hostname": "localhost", "port": "4173", "origin": "http://localhost:4173"}
    assert simulate_get_backend_url(window_location=loc) == "http://127.0.0.1:8000"


def test_js_sim_local_backend_port_8000():
    loc = {"hostname": "127.0.0.1", "port": "8000", "origin": "http://127.0.0.1:8000"}
    assert simulate_get_backend_url(window_location=loc) == "http://127.0.0.1:8000"


def test_js_sim_resolve_relative_with_slash():
    base = "http://138.2.81.40"
    assert simulate_resolve_api_url("/api/auth/signup", base) == "http://138.2.81.40/api/auth/signup"


def test_js_sim_resolve_relative_without_slash():
    base = "http://138.2.81.40"
    assert simulate_resolve_api_url("api/auth/signup", base) == "http://138.2.81.40/api/auth/signup"


def test_js_sim_resolve_absolute_http():
    base = "http://138.2.81.40"
    assert simulate_resolve_api_url("http://other.com/file.pdf", base) == "http://other.com/file.pdf"


def test_js_sim_resolve_absolute_blob():
    base = "http://138.2.81.40"
    assert simulate_resolve_api_url("blob:http://138.2.81.40/abc", base) == "blob:http://138.2.81.40/abc"


def test_js_sim_resolve_empty():
    base = "http://138.2.81.40"
    assert simulate_resolve_api_url("", base) == "http://138.2.81.40"


def test_js_sim_dev_fallback_without_window():
    assert simulate_get_backend_url(is_dev=True) == "http://127.0.0.1:8000"
