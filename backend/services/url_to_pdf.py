import ipaddress
import socket
import uuid
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

from backend import config
from backend.services.libreoffice import ConversionResult


def is_safe_url(url: str) -> tuple[bool, str]:
    """
    Validate URL to protect against SSRF (Server-Side Request Forgery).
    Blocks localhost, private subnets (RFC 1918), loopback, link-local, and cloud metadata IPs.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, "Security Error: Only http and https protocols are allowed."

        hostname = parsed.hostname
        if not hostname:
            return False, "Security Error: Invalid URL hostname."

        if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):  # nosec B104
            return (
                False,
                "Security Error: Access to localhost or loopback addresses is blocked.",
            )

        # Resolve all IP addresses for hostname
        addr_info = socket.getaddrinfo(hostname, None)
        for entry in addr_info:
            ip_str = entry[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_reserved
                or ip_obj.is_multicast
            ):
                return (
                    False,
                    f"Security Error: Access to private/internal IP address ({ip_str}) is blocked.",
                )
    except socket.gaierror:
        return False, "Security Error: Could not resolve hostname."
    except Exception as e:
        return False, f"Security Error validating host: {e!s}"

    return True, ""


def convert_url_to_pdf(
    url: str,
    paper_format: str = "A4",
    landscape: bool = False,
    print_background: bool = True,
    margin_type: str = "default",
) -> ConversionResult:
    """
    Render an online URL link to a PDF document using Playwright Chromium with SSRF protection.
    """
    try:
        from backend.jobs.queue import update_job_progress

        update_job_progress(10)

        safe, err_msg = is_safe_url(url)
        if not safe:
            return ConversionResult(success=False, error_message=err_msg)

        parsed = urlparse(url)
        host = parsed.netloc or "webpage"
        safe_host = "".join(c for c in host if c.isalnum() or c in "._-")
        output_pdf_path = config.OUTPUT_DIR / f"{safe_host}_{uuid.uuid4().hex[:6]}.pdf"

        update_job_progress(20)

        margin_map = {
            "none": {"top": "0px", "right": "0px", "bottom": "0px", "left": "0px"},
            "minimum": {
                "top": "10px",
                "right": "10px",
                "bottom": "10px",
                "left": "10px",
            },
            "default": {
                "top": "40px",
                "right": "40px",
                "bottom": "40px",
                "left": "40px",
            },
        }
        margins = margin_map.get(margin_type, margin_map["default"])

        with sync_playwright() as p:
            browser = None
            channels_to_try = [None, "chrome", "msedge"]
            for channel in channels_to_try:
                try:
                    if channel:
                        browser = p.chromium.launch(headless=True, channel=channel)
                    else:
                        browser = p.chromium.launch(headless=True)
                    if browser:
                        break
                except Exception:
                    continue

            if not browser:
                return ConversionResult(
                    success=False,
                    error_message="Could not launch Chromium/Chrome/Edge browser engine for URL capture.",
                )

            try:
                page = browser.new_page()
                page.set_default_timeout(60000)

                update_job_progress(40)
                page.goto(url, wait_until="load", timeout=60000)

                page.emulate_media(media="print")

                update_job_progress(70)
                try:
                    page.wait_for_load_state("networkidle", timeout=5000)
                except Exception:
                    pass
                try:
                    page.wait_for_function("document.fonts.ready", timeout=5000)
                except Exception:
                    pass

                # Hide cookie consent popups, newsletter banners, and fixed modal overlays before PDF capture
                try:
                    page.add_style_tag(
                        content="""
                        div[class*="cookie" i], div[id*="cookie" i],
                        div[class*="consent" i], div[id*="consent" i],
                        div[class*="gdpr" i], div[id*="gdpr" i],
                        div[class*="popup" i], div[id*="popup" i],
                        div[class*="newsletter" i], div[id*="newsletter" i],
                        div[class*="modal-backdrop" i],
                        .cookie-banner, #cookie-banner, .consent-banner, #consent-banner {
                            display: none !important;
                            visibility: hidden !important;
                        }
                    """
                    )
                except Exception:
                    pass

                update_job_progress(90)
                page.pdf(
                    path=str(output_pdf_path),
                    format=paper_format,
                    landscape=landscape,
                    print_background=print_background,
                    margin=margins,
                )
            finally:
                if browser:
                    browser.close()

        update_job_progress(100)

        if output_pdf_path.exists():
            return ConversionResult(
                success=True,
                output_path=str(output_pdf_path),
                file_size_bytes=output_pdf_path.stat().st_size,
            )

        return ConversionResult(
            success=False,
            error_message="Playwright completed but output PDF file was not created",
        )
    except Exception as e:
        return ConversionResult(
            success=False, error_message=f"URL to PDF failed: {e!s}"
        )
