import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

from backend import config
from backend.services.libreoffice import ConversionResult


def convert_html_to_pdf(input_path: str) -> ConversionResult:
    """
    Convert HTML document to PDF using headless Playwright Chromium.

    Key requirements for correct rendering:
      - emulate_media("print") must be called so @media print and @page CSS rules fire.
      - document.fonts.ready must be awaited so Google Fonts render before capture.
      - Margins must NOT be overridden in Python — let the HTML @page CSS control them.
      - LibreOffice fallback is intentionally NOT used for HTML: its HTML renderer
        does not support CSS Grid, custom properties, or modern print layout.
        A LibreOffice fallback would produce output worse than a broken Playwright render.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}.pdf"

        # Calculate dynamic timeout based on file size (30s base + 6s per MB, max 3 mins)
        file_size_mb = input_file.stat().st_size / (1024 * 1024)
        dynamic_timeout_ms = min(180000, int(30000 + (file_size_mb * 6000)))
        print(
            f"[HTML_TO_PDF] File size: {file_size_mb:.2f} MB. Calculated timeout: {dynamic_timeout_ms / 1000:.1f}s"
        )

        with sync_playwright() as p:
            # Launch Chromium, prioritizing system Chrome or Edge to ensure all system fonts render correctly
            browser = None
            for channel in ["chrome", "msedge", None]:
                try:
                    # Pass --no-sandbox to avoid permission blocks on Windows font folders
                    args = ["--no-sandbox", "--disable-setuid-sandbox"]
                    if channel:
                        browser = p.chromium.launch(
                            headless=True, channel=channel, args=args
                        )
                    else:
                        browser = p.chromium.launch(headless=True, args=args)
                    if browser:
                        break
                except Exception as launch_err:
                    print(
                        f"[HTML_TO_PDF] Failed to launch Chromium with channel '{channel}': {launch_err}"
                    )

            if not browser:
                return ConversionResult(
                    success=False, error_message="Could not launch Chromium browser"
                )

            try:
                page = browser.new_page()
                page.set_default_timeout(dynamic_timeout_ms)
                page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

                # ── SECURITY: Route interceptor to prevent Local File Inclusion (LFI) ──
                def handle_route(route):
                    url = route.request.url
                    if url.startswith("file://"):
                        try:
                            raw_path = urllib.parse.unquote(
                                url.replace("file:///", "").replace("file://", "")
                            )
                            resolved_target = Path(raw_path).resolve()
                            resolved_upload_dir = config.UPLOAD_DIR.resolve()
                            is_main_file = resolved_target == input_file.resolve()
                            is_in_upload_dir = (
                                resolved_upload_dir in resolved_target.parents
                            )
                            if not is_main_file and not is_in_upload_dir:
                                print(
                                    f"Security Warning: Blocked local file access: {url}"
                                )
                                route.abort()
                                return
                        except Exception as route_err:
                            print(f"Error validating route path: {route_err}")
                            route.abort()
                            return
                    elif not (
                        url.startswith("http://")
                        or url.startswith("https://")
                        or url.startswith("data:")
                    ):
                        print(
                            f"Security Warning: Blocked invalid request scheme: {url}"
                        )
                        route.abort()
                        return
                    route.continue_()

                page.route("**/*", handle_route)

                # ── FIX 1: Emulate print media BEFORE loading the page ──────────────
                # Without this, @media print CSS and @page rules are never applied.
                # The browser renders in "screen" mode by default, which is wrong for PDF.
                print("[PLAYWRIGHT_DEBUG] Emulating print media for HTML conversion")
                page.emulate_media(media="print")

                # Load the HTML file
                # Load the HTML file with dynamic timeout
                page.goto(
                    f"file:///{input_file.absolute().as_posix()}",
                    timeout=dynamic_timeout_ms,
                )

                # Inject global print CSS overrides to control page breaks and prevent cut elements
                page.add_style_tag(
                    content="""
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;600;800&family=Sora:wght@400;600;800&display=swap');
                    
                    @media print {
                        .card, .warning, .success, .code, tr, td, th, li, pre, blockquote {
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                        h1, h2, h3, h4, h5, h6 {
                            break-after: avoid !important;
                            page-break-after: avoid !important;
                        }
                        hr {
                            break-before: page !important;
                            page-break-before: always !important;
                            border: none !important;
                            margin: 0 !important;
                            height: 0 !important;
                        }
                    }
                """
                )

                # Wait for network to be idle (external resources like Google Fonts CDN)
                # Set a 5s timeout so offline/sandboxed environments do not hang.
                try:
                    page.wait_for_load_state("networkidle", timeout=5000)
                except Exception as net_err:
                    print(f"Network idle wait timed out (continuing anyway): {net_err}")

                # ── FIX 2: Wait for fonts to be decoded and ready ─────────────────
                # networkidle catches the HTTP response for fonts, but not their decode.
                # document.fonts.ready resolves when all fonts are fully available.
                try:
                    page.wait_for_function("document.fonts.ready", timeout=5000)
                except Exception as font_err:
                    print(
                        f"Font ready check timed out or failed (continuing anyway): {font_err}"
                    )

                # ── AUTOMATED LAYOUT OPTIMIZER ─────────────────────────────────────
                # Inject a child wrapper and zoom the content wrapper so page-breaks
                # are computed correctly by the browser printing engine.
                page.evaluate("""
                    () => {
                        const maxPageHeight = 940; // Safe printable A4 height threshold
                        const containers = document.querySelectorAll('.page-wrapper, .cover, [class*="page-break"]');
                        containers.forEach((container, index) => {
                            if (container.classList.contains('cover')) {
                                return; // Skip cover page (uses absolute 297mm height)
                            }
                            
                            // 1. Create content wrapper
                            const wrapper = document.createElement('div');
                            wrapper.className = 'page-content-optimizer';
                            wrapper.style.display = 'flow-root'; // Prevent margin collapsing
                            
                            // 2. Move children into wrapper
                            while (container.firstChild) {
                                wrapper.appendChild(container.firstChild);
                            }
                            container.appendChild(wrapper);
                            
                            // 3. Compute actual padding of container
                            const style = window.getComputedStyle(container);
                            const paddingTop = parseFloat(style.paddingTop) || 0;
                            const paddingBottom = parseFloat(style.paddingBottom) || 0;
                            const maxContentHeight = maxPageHeight - paddingTop - paddingBottom;
                            
                            // 4. Measure wrapper height
                            const currentHeight = wrapper.getBoundingClientRect().height;
                            if (currentHeight > maxContentHeight) {
                                const scale = maxContentHeight / currentHeight;
                                const finalScale = Math.max(0.65, scale);
                                wrapper.style.zoom = finalScale.toString();
                                console.log(`[OPTIMIZER] Page ${index + 1} content height was ${currentHeight}px. Scaled by ${finalScale.toFixed(3)} to fit.`);
                            }
                        });
                    }
                """)

                # ── FIX 3: Do NOT set margins here — let CSS @page rules control them ──
                # Setting margin in page.pdf() overrides the CSS @page margin rules.
                # If your HTML has `@page { margin: 20mm 18mm 22mm 18mm }`, Python
                # margin:"0" silently wins and your CSS margin is ignored entirely.
                # Omitting the margin parameter lets CSS take full control.
                page.pdf(
                    path=str(output_pdf_path),
                    format="A4",
                    print_background=True,  # Required: renders background-color, background-image
                    prefer_css_page_size=True,  # Respect CSS @page size declarations
                    # margin intentionally omitted — controlled by CSS @page rules
                )

            finally:
                browser.close()

        if output_pdf_path.exists():
            return ConversionResult(
                success=True,
                output_path=str(output_pdf_path),
                file_size_bytes=output_pdf_path.stat().st_size,
            )

        return ConversionResult(
            success=False,
            error_message="Playwright finished but output PDF was not created.",
        )

    except Exception as e:
        # NOTE: No LibreOffice fallback here.
        # LibreOffice does not support CSS Grid, CSS custom properties, SVG inline,
        # or modern @page print layout. For HTML → PDF, a failed Playwright render
        # is better than a LibreOffice render. Surface the error to the user instead.
        return ConversionResult(
            success=False, error_message=f"HTML to PDF conversion failed: {e!s}"
        )
