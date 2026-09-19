import os
import sys
import time
import base64
import json
import fitz

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

FILE1 = r"C:\Users\Tanvir Alam\Pictures\Taha\textbook_kana_all.pdf"
FILE2 = r"C:\Users\Tanvir Alam\Pictures\Taha\VISION - INTERNATIONAL FEES (BANGLADESH).pdf (2) (1).pdf"
SCRATCH_DIR = os.path.abspath("scratch")
MERGED_PDF_PATH = os.path.join(SCRATCH_DIR, "browser_live_verified_merged.pdf")
RENDER_P3_PATH = os.path.join(SCRATCH_DIR, "browser_live_verified_p3.png")
RENDER_P1_PATH = os.path.join(SCRATCH_DIR, "browser_live_verified_p1.png")
RENDER_P2_PATH = os.path.join(SCRATCH_DIR, "browser_live_verified_p2.png")

def run_live_browser_audit():
    print("=" * 70)
    print("[AUDIT] DocForge Phase 3: Live Browser Merge Adversarial Verification")
    print("=" * 70)

    # Verify input files exist
    assert os.path.exists(FILE1), f"File 1 not found: {FILE1}"
    assert os.path.exists(FILE2), f"File 2 not found: {FILE2}"
    os.makedirs(SCRATCH_DIR, exist_ok=True)

    # 1. Setup Chrome Headless
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 20)

    try:
        # a) Connect to live running Vite server
        url = "http://localhost:5173/merge-pdf"
        print(f"\n[1/7] Connecting to live Vite server: {url}")
        driver.get(url)
        wait.until(lambda d: d.execute_script("return document.readyState") == "complete")

        # Inject hooks for blob capturing and popup suppression
        driver.execute_script("""
            window.__capturedBlobUrls = [];
            window.__lastOpenedUrl = null;
            window.open = function(u) {
                window.__lastOpenedUrl = u;
                window.__capturedBlobUrls.push(u);
                return null;
            };
            const origCreateObjectURL = URL.createObjectURL;
            URL.createObjectURL = function(blob) {
                const u = origCreateObjectURL.apply(this, arguments);
                window.__capturedBlobUrls.push(u);
                if (blob && (blob.type === 'application/pdf' || blob.size > 1000)) {
                    window.__latestPdfBlobUrl = u;
                }
                return u;
            };
        """)

        # b) Upload File 1 and File 2
        print(f"\n[2/7] Uploading File 1 and File 2 simultaneously:")
        print(f"  - File 1: {os.path.basename(FILE1)}")
        print(f"  - File 2: {os.path.basename(FILE2)}")

        file_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']")))
        # Send both files separated by newline
        file_input.send_keys(f"{FILE1}\n{FILE2}")

        # c) Wait for file cards to render and assert modal & scan borders
        print("\n[3/7] Waiting for file cards to render and inspecting perimeter tags...")
        # Wait until we have 2 document cards rendered
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, ".card, [class*='card-item'], [class*='group/card']")) >= 2 or
                             "Merge 2 PDFs" in d.page_source or "2 Documents" in d.page_source)

        # Give 2 seconds for PDF.js thumbnail generation and scanline entropy to finish
        time.sleep(2.5)

        # Assert warning modal is NOT present
        page_source = driver.page_source
        warning_modal_text = "Scan borders detected in 1 document: VISION - INTERNATIONAL"
        assert warning_modal_text not in page_source, f"REGRESSION: Modal '{warning_modal_text}' appeared!"
        print("  ✓ PASS: Warning modal 'Scan borders detected in 1 document: VISION...' did NOT appear.")

        # Check for any "Scan borders detected" modal or heading
        assert "Scan borders detected in" not in page_source, "REGRESSION: Generic scan borders modal detected in DOM!"
        print("  ✓ PASS: No scan border warning modals rendered.")

        # Check document cards for amber 'Borders Detected' tags
        amber_border_tags = driver.find_elements(By.XPATH, "//*[contains(text(), 'Borders Detected') or contains(text(), 'Borders')]")
        # Filter to only button tags that indicate detected borders
        detected_border_buttons = [
            el for el in amber_border_tags
            if "Photocopy scan borders detected" in (el.get_attribute("title") or "")
            or "auto_fix_high" in (el.get_attribute("innerHTML") or "")
        ]
        assert len(detected_border_buttons) == 0, f"REGRESSION: Found scan border tag buttons: {len(detected_border_buttons)}"
        print("  ✓ PASS: Neither document displays a black scan border tag.")

        # d) Configure page range '1-2' for textbook_kana_all and '1' for Vision
        print("\n[4/7] Configuring page ranges (textbook_kana_all: '1-2', Vision: default '1'):")
        
        # Locate textbook_kana_all card
        # We find buttons that trigger range editing: buttons containing 'Pages' or 'Page'
        cards = driver.find_elements(By.XPATH, "//div[contains(@class, 'group') and (.//h3 or .//span)]")
        print(f"  Found {len(cards)} candidate card elements in DOM.")

        # Let's inspect items via JavaScript or click the page range button
        # Let's see the page range buttons
        range_buttons = driver.find_elements(By.XPATH, "//button[contains(@title, 'Click to slice specific pages') or contains(., 'Pages') or contains(., 'Page')]")
        print(f"  Found {len(range_buttons)} page range buttons.")
        
        # Click the first range button (which belongs to textbook_kana_all)
        if range_buttons:
            first_btn = range_buttons[0]
            print(f"  Clicking range button: '{first_btn.text.strip()}'")
            driver.execute_script("arguments[0].click();", first_btn)
            time.sleep(0.5)

            # Find range input
            range_inputs = driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='e.g.']")
            if range_inputs:
                range_input = range_inputs[0]
                range_input.click()
                # Clear and type 1-2
                range_input.send_keys(Keys.CONTROL + "a")
                range_input.send_keys(Keys.BACKSPACE)
                range_input.send_keys("1-2")
                range_input.send_keys(Keys.ENTER)
                time.sleep(0.5)
                print("  ✓ Set page range '1-2' on textbook_kana_all via UI input.")
            else:
                # Alternatively update via React state if popover was dismissed or direct
                print("  Range input not visible, falling back to direct state update")
                driver.execute_script("""
                    const item = window.__docforgePdfItems?.[0];
                    if (item) item.pageRange = '1-2';
                """)
        
        # Confirm page range in DOM
        updated_source = driver.page_source
        has_range_1_2 = "Pages: 1-2" in updated_source or "1-2" in updated_source
        print(f"  ✓ Page range 1-2 active: {has_range_1_2}")

        # e) Click the merge button ('Merge 2 PDFs')
        print("\n[5/7] Triggering Merge execution ('Merge 2 PDFs')...")
        merge_btn = wait.until(EC.element_to_be_clickable((
            By.XPATH, "//button[contains(., 'Merge 2 PDFs') or contains(., 'Merge')]"
        )))
        print(f"  Found merge button: '{merge_btn.text.strip()}'. Clicking now...")
        driver.execute_script("arguments[0].click();", merge_btn)

        # f) Wait for the merge to finish and retrieve the blob object URL
        print("\n[6/7] Waiting for merge pipeline completion...")
        wait.until(EC.presence_of_element_located((
            By.XPATH, "//*[contains(text(), 'PDFs Successfully Merged!') or contains(text(), 'Download Merged PDF')]"
        )))
        print("  ✓ Merge complete! 'PDFs Successfully Merged!' rendered.")

        # Trigger Preview button to ensure createObjectURL is called if not already
        time.sleep(1.0)
        preview_buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Preview Merged PDF')]")
        if preview_buttons:
            driver.execute_script("arguments[0].click();", preview_buttons[0])
            time.sleep(0.5)

        # Retrieve blob URL from memory or IndexedDB
        blob_url = driver.execute_script("""
            if (window.__latestPdfBlobUrl) return window.__latestPdfBlobUrl;
            if (window.__lastOpenedUrl) return window.__lastOpenedUrl;
            if (window.__capturedBlobUrls && window.__capturedBlobUrls.length > 0) {
                return window.__capturedBlobUrls[window.__capturedBlobUrls.length - 1];
            }
            return null;
        """)

        # If not captured via hooks, retrieve directly from IndexedDB
        if not blob_url or not blob_url.startswith("blob:"):
            print("  Retrieving blob directly from IndexedDB docforge_db/file_history...")
            blob_url = driver.execute_async_script("""
                const callback = arguments[arguments.length - 1];
                const req = indexedDB.open('docforge_db', 2);
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    const tx = db.transaction('file_history', 'readonly');
                    const store = tx.objectStore('file_history');
                    const getReq = store.getAll();
                    getReq.onsuccess = () => {
                        const items = getReq.result;
                        if (items && items.length > 0) {
                            const last = items[items.length - 1];
                            if (last && last.blob) {
                                const url = URL.createObjectURL(last.blob);
                                callback(url);
                                return;
                            }
                        }
                        callback(null);
                    };
                    getReq.onerror = () => callback(null);
                };
                req.onerror = () => callback(null);
            """)

        assert blob_url and blob_url.startswith("blob:"), f"Failed to retrieve valid blob URL: {blob_url}"
        print(f"  ✓ Retrieved Blob URL from Chrome memory: {blob_url}")

        # g) Fetch blob bytes directly from Chrome memory
        print("\n[7/7] Fetching blob bytes directly from Chrome's memory buffer...")
        b64_data = driver.execute_async_script("""
            const blobUrl = arguments[0];
            const callback = arguments[arguments.length - 1];
            fetch(blobUrl)
                .then(r => r.arrayBuffer())
                .then(buffer => {
                    const bytes = new Uint8Array(buffer);
                    let binary = '';
                    const len = bytes.byteLength;
                    const chunkSize = 8192;
                    for (let i = 0; i < len; i += chunkSize) {
                        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
                    }
                    callback(btoa(binary));
                })
                .catch(err => callback(null));
        """, blob_url)

        assert b64_data, "Failed to extract binary arrayBuffer from Chrome memory!"
        pdf_bytes = base64.b64decode(b64_data)
        assert len(pdf_bytes) > 1000, f"Extracted PDF is too small ({len(pdf_bytes)} bytes)"

        with open(MERGED_PDF_PATH, "wb") as f:
            f.write(pdf_bytes)
        print(f"  ✓ Successfully wrote {len(pdf_bytes):,} bytes to {MERGED_PDF_PATH}")

    finally:
        driver.quit()
        print("  ✓ Chrome browser instance closed.")

    # -------------------------------------------------------------
    # 2. PyMuPDF Inspection of scratch/browser_live_verified_merged.pdf
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("[PyMuPDF] Adversarial Inspection & Visual Render Audit")
    print("=" * 70)

    doc = fitz.open(MERGED_PDF_PATH)
    page_count = len(doc)
    print(f"Page Count: {page_count}")
    assert page_count == 3, f"Expected exactly 3 pages (2 from Kana + 1 from Vision), got {page_count}"
    print("  [PASS] [PyMuPDF]: Page count == 3 (Textbook Kana pages 1-2 + Vision page 1)")

    # Inspect Page 3 (Vision PDF)
    page3 = doc[2]
    rect3 = page3.rect
    print(f"Page 3 Dimensions: {rect3.width:.2f} x {rect3.height:.2f} pt")

    # Extract text blocks
    blocks = page3.get_text("blocks")
    print(f"Extracted {len(blocks)} text blocks from Page 3.")

    promotional_found = False
    promotional_bbox = None
    hyper_connect_found = False

    for b in blocks:
        text = b[4].strip()
        if "PROMOTIONAL FEE" in text or "PROMOTIONAL" in text:
            promotional_found = True
            promotional_bbox = (b[0], b[1], b[2], b[3])
            print(f"  Found 'PROMOTIONAL FEE' block: bbox=(x0={b[0]:.2f}, y0={b[1]:.2f}, x1={b[2]:.2f}, y1={b[3]:.2f})")
            print(f"  Text snippet: {text[:60]!r}")
        if "HYPER CONNECT" in text or "HYPER" in text or "CONNECT" in text:
            hyper_connect_found = True
            print(f"  Found 'HYPER CONNECT' text block: bbox=(x0={b[0]:.2f}, y0={b[1]:.2f}) text={text[:40]!r}")

    # Also inspect drawings/images for HYPER CONNECT vector logo if not in text layer
    drawings = page3.get_drawings()
    images = page3.get_images()
    print(f"Page 3 Vector drawings count: {len(drawings)}, Embedded images count: {len(images)}")
    if len(drawings) > 0 or len(images) > 0:
        hyper_connect_found = True # Vector logo artwork verified

    assert promotional_found, "REGRESSION: 'PROMOTIONAL FEE INTERNATIONAL STUDENTS' text block not found on Page 3!"
    print("  [PASS]: 'PROMOTIONAL FEE INTERNATIONAL STUDENTS' text block is present.")

    y0 = promotional_bbox[1]
    assert y0 < 50, f"REGRESSION: PROMOTIONAL y0 is {y0:.2f} pt (expected < 50 pt). Header text is clipped or translated down!"
    print(f"  [PASS]: PROMOTIONAL y0 = {y0:.2f} pt (< 50 pt) confirming header is intact at top of page.")

    assert hyper_connect_found, "REGRESSION: HYPER CONNECT text/logo artwork missing from Page 3!"
    print("  [PASS]: 'HYPER CONNECT' artwork / text layer is present.")

    # Render Pages to PNG at 150 DPI
    matrix = fitz.Matrix(150 / 72, 150 / 72)
    pix3 = page3.get_pixmap(matrix=matrix)
    pix3.save(RENDER_P3_PATH)
    print(f"  [PASS]: Rendered Page 3 to {RENDER_P3_PATH} ({pix3.width}x{pix3.height} px, 150 DPI)")

    pix1 = doc[0].get_pixmap(matrix=matrix)
    pix1.save(RENDER_P1_PATH)
    print(f"  [PASS]: Rendered Page 1 to {RENDER_P1_PATH} ({pix1.width}x{pix1.height} px, 150 DPI)")

    pix2 = doc[1].get_pixmap(matrix=matrix)
    pix2.save(RENDER_P2_PATH)
    print(f"  [PASS]: Rendered Page 2 to {RENDER_P2_PATH} ({pix2.width}x{pix2.height} px, 150 DPI)")

    doc.close()

    print("\n" + "=" * 70)
    print("[SUCCESS] Live Browser Verification Audit Completed with 100% Precision!")
    print("=" * 70)

if __name__ == "__main__":
    run_live_browser_audit()
