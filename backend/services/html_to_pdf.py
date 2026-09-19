import asyncio
import logging
import re
import urllib.parse
import uuid
from pathlib import Path
from typing import Any, Dict, Optional, Union

from playwright.async_api import async_playwright

from backend import config
from backend.services.libreoffice import ConversionResult

logger = logging.getLogger("docscalar.html_to_pdf")


async def convert_html_to_pdf(
    html_or_path: str,
    output_path: Optional[str] = None,
    options: Optional[Dict[str, Any]] = None,
    as_bytes: Optional[bool] = None,
) -> Union[bytes, ConversionResult]:
    """
    Convert HTML document or raw HTML string to PDF using headless Playwright Chromium.

    Key requirements for correct rendering:
      - Accepts raw HTML string directly or local file path.
      - Launches headless Playwright/Chromium with --no-sandbox, --disable-setuid-sandbox,
        and --disable-gpu, searching Chrome, Edge, and bundled Chromium channels.
      - Emulates 'print' media so @media print and @page CSS rules fire deterministically.
      - Awaits network idle and document.fonts.ready for Google Fonts decode.
      - Renders A4 portrait with zero margins by default (respecting @page CSS and options).
      - Returns raw PDF bytes when converting raw HTML (or when as_bytes=True).
      - Writes to output path and returns ConversionResult when converting a file (or when as_bytes=False).
    """
    if not html_or_path or not str(html_or_path).strip():
        if as_bytes:
            raise ValueError("HTML content cannot be empty")
        return ConversionResult(success=False, error_message="HTML content cannot be empty")

    source_str = str(html_or_path).strip()
    is_file = False
    try:
        # If it doesn't contain HTML tags and isn't too long, check if it's an existing file
        if "<" not in source_str and len(source_str) < 1024:
            p = Path(source_str)
            if p.is_file():
                is_file = True
    except (OSError, ValueError):
        is_file = False

    # Determine return type: bytes if raw HTML and no explicit output_path, else ConversionResult
    return_bytes = as_bytes if as_bytes is not None else (not is_file and output_path is None)

    output_pdf_path: Optional[Path] = None
    if not return_bytes:
        if output_path:
            output_pdf_path = Path(output_path)
        elif is_file:
            output_pdf_path = config.OUTPUT_DIR / f"{Path(source_str).stem}.pdf"
        else:
            output_pdf_path = config.OUTPUT_DIR / f"{uuid.uuid4().hex}.pdf"
        output_pdf_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        if is_file:
            input_file = Path(source_str)
            file_size_mb = input_file.stat().st_size / (1024 * 1024)
            dynamic_timeout_ms = min(180000, int(30000 + (file_size_mb * 6000)))
            with open(input_file, "r", encoding="utf-8", errors="replace") as f:
                html_content = f.read()
        else:
            html_content = source_str
            payload_size_mb = len(html_content.encode("utf-8")) / (1024 * 1024)
            dynamic_timeout_ms = min(180000, int(30000 + (payload_size_mb * 6000)))

        args = [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
        ]

        async with async_playwright() as p:
            browser = None
            for channel in ["chrome", "msedge", None]:
                try:
                    if channel:
                        browser = await p.chromium.launch(
                            headless=True, channel=channel, args=args
                        )
                    else:
                        browser = await p.chromium.launch(headless=True, args=args)
                    if browser:
                        break
                except Exception as launch_err:
                    logger.debug(
                        f"[HTML_TO_PDF] Chromium launch failed with channel '{channel}': {launch_err}"
                    )

            if not browser:
                err_msg = "Could not launch Chromium browser. Please ensure Chrome or Edge is installed."
                if return_bytes:
                    raise RuntimeError(err_msg)
                return ConversionResult(success=False, error_message=err_msg)

            try:
                context = await browser.new_context()
                page = await context.new_page()
                page.set_default_timeout(dynamic_timeout_ms)

                # ── SECURITY: Route interceptor to prevent Local File Inclusion (LFI) & SSRF ──
                async def handle_route(route):
                    url = route.request.url
                    if url.startswith("file://"):
                        allowed = False
                        if is_file:
                            try:
                                raw_path = urllib.parse.unquote(
                                    url.replace("file:///", "").replace("file://", "")
                                )
                                resolved_target = Path(raw_path).resolve()
                                if (
                                    resolved_target == Path(source_str).resolve()
                                    or config.UPLOAD_DIR.resolve() in resolved_target.parents
                                ):
                                    allowed = True
                            except Exception:
                                allowed = False
                        if not allowed:
                            logger.warning(f"[HTML_TO_PDF Security] Blocked local file access: {url}")
                            await route.abort()
                            return
                    elif url.startswith("data:"):
                        await route.continue_()
                        return
                    elif url.startswith("http://") or url.startswith("https://"):
                        try:
                            from backend.services.url_to_pdf import is_safe_url

                            safe, reason = is_safe_url(url)
                            if not safe:
                                logger.warning(
                                    f"[HTML_TO_PDF Security] Blocked unsafe network request: {url} ({reason})"
                                )
                                await route.abort()
                                return
                        except Exception:
                            pass
                    else:
                        await route.abort()
                        return
                    await route.continue_()

                await page.route("**/*", handle_route)

                # ── Emulate print media BEFORE loading page so @media print and @page fire ──
                await page.emulate_media(media="print")

                # Load the HTML content
                await page.set_content(
                    html_content, wait_until="load", timeout=dynamic_timeout_ms
                )

                # Wait for external network assets (Google Fonts CDN, etc.) with 5s timeout
                try:
                    await page.wait_for_load_state("networkidle", timeout=5000)
                except Exception:
                    pass

                # Wait for all fonts to be decoded and rendered
                try:
                    await page.wait_for_function("document.fonts.ready", timeout=5000)
                except Exception:
                    pass

                # ── Render A4 PDF with Zero Margins by Default ──
                pdf_options: Dict[str, Any] = {
                    "format": "A4",
                    "landscape": False,
                    "print_background": True,
                    "prefer_css_page_size": True,
                    "margin": {
                        "top": "0px",
                        "right": "0px",
                        "bottom": "0px",
                        "left": "0px",
                    },
                }

                # Apply client options override if specified
                if options and isinstance(options, dict):
                    if "format" in options and options["format"]:
                        pdf_options["format"] = options["format"]
                    if "landscape" in options:
                        pdf_options["landscape"] = bool(options["landscape"])
                    if "printBackground" in options:
                        pdf_options["print_background"] = bool(options["printBackground"])
                    elif "print_background" in options:
                        pdf_options["print_background"] = bool(options["print_background"])
                    if "margin" in options and isinstance(options["margin"], dict):
                        pdf_options["margin"] = options["margin"]
                    if "prefer_css_page_size" in options:
                        pdf_options["prefer_css_page_size"] = bool(options["prefer_css_page_size"])

                if not return_bytes and output_pdf_path:
                    pdf_bytes = await page.pdf(path=str(output_pdf_path), **pdf_options)
                else:
                    pdf_bytes = await page.pdf(**pdf_options)

            finally:
                await browser.close()

        if return_bytes:
            return pdf_bytes

        if output_pdf_path and output_pdf_path.exists():
            return ConversionResult(
                success=True,
                output_path=str(output_pdf_path),
                file_size_bytes=output_pdf_path.stat().st_size,
            )

        return ConversionResult(
            success=False,
            error_message="Playwright completed but output PDF was not generated.",
        )

    except Exception as e:
        logger.error(f"[HTML_TO_PDF] Conversion failed: {e}", exc_info=True)
        if return_bytes:
            raise RuntimeError(f"HTML to PDF conversion failed: {e!s}") from e
        return ConversionResult(
            success=False, error_message=f"HTML to PDF conversion failed: {e!s}"
        )


def convert_html_to_pdf_sync(
    html_or_path: str,
    output_path: Optional[str] = None,
    options: Optional[Dict[str, Any]] = None,
    as_bytes: Optional[bool] = None,
) -> Union[bytes, ConversionResult]:
    """
    Synchronous wrapper for convert_html_to_pdf.
    """
    return asyncio.run(
        convert_html_to_pdf(
            html_or_path=html_or_path,
            output_path=output_path,
            options=options,
            as_bytes=as_bytes,
        )
    )


async def convert_html_file_to_pdf(input_path: str) -> ConversionResult:
    """
    Explicit file-to-PDF conversion helper for background job queues.
    """
    return await convert_html_to_pdf(input_path, as_bytes=False)

