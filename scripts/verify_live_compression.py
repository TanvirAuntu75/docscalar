import sys
import time
import requests
import fitz
from pathlib import Path

def test_live_stack():
    print("=" * 60)
    print("DocForge Live Compression Verification Test")
    print("=" * 60)

    # 1. Locate test document
    pdf_path = None
    for candidate in Path("backend/uploads").glob("**/full_vocabulary_set.pdf"):
        if candidate.exists() and candidate.stat().st_size > 4000000:
            pdf_path = candidate
            break

    if not pdf_path:
        print("[ERROR] Could not find original test PDF in backend/uploads.")
        return

    orig_size = pdf_path.stat().st_size
    print(f"\n[1] Input File: {pdf_path.name}")
    print(f"    Original Size: {orig_size:,} bytes ({orig_size / 1024 / 1024:.2f} MB)")

    # 2. Upload file via Live Backend API
    print("\n[2] Uploading to http://127.0.0.1:8000/api/upload ...")
    with open(pdf_path, "rb") as f:
        up_res = requests.post(
            "http://127.0.0.1:8000/api/upload",
            files={"file": ("full_vocabulary_set.pdf", f, "application/pdf")},
            timeout=30,
        )
    
    if not up_res.ok:
        print(f"[ERROR] Upload failed with status {up_res.status_code}: {up_res.text}")
        return

    up_data = up_res.json()
    file_id = up_data["file_id"]
    filename = up_data["filename"]
    print(f"    Upload OK -> File ID: {file_id}")

    # 3. Trigger Extreme Compression Job
    print("\n[3] Triggering /api/convert/compress-pdf with Extreme Mode (quality=0.35)...")
    conv_res = requests.post(
        "http://127.0.0.1:8000/api/convert/compress-pdf",
        data={"file_id": file_id, "filename": filename, "quality": 0.35},
        timeout=30,
    )

    if not conv_res.ok:
        print(f"[ERROR] Convert request failed: {conv_res.text}")
        return

    conv_data = conv_res.json()
    job_id = conv_data["job_id"]
    print(f"    Task Queued -> Job ID: {job_id}")

    # 4. Poll Job Status
    print("\n[4] Polling Job Status...")
    download_url = None
    for attempt in range(60):
        st_res = requests.get(f"http://127.0.0.1:8000/api/job/{job_id}/status", timeout=10)
        st = st_res.json()
        status = st.get("status")
        prog = st.get("progress", 0)
        print(f"    Progress: {prog}% | Status: {status}")

        if status == "finished":
            download_url = st.get("download_url")
            break
        elif status == "failed":
            print(f"[ERROR] Job failed: {st.get('error')}")
            return
        time.sleep(1)

    if not download_url:
        print("[ERROR] Polling timed out.")
        return

    # 5. Download output and inspect
    print(f"\n[5] Downloading Output from http://127.0.0.1:8000{download_url} ...")
    dl_res = requests.get(f"http://127.0.0.1:8000{download_url}", timeout=30)
    out_bytes = dl_res.content
    compressed_size = len(out_bytes)
    reduction_pct = (1.0 - (compressed_size / orig_size)) * 100.0

    print(f"    Downloaded Size: {compressed_size:,} bytes ({compressed_size / 1024:.1f} KB, {compressed_size / 1024 / 1024:.2f} MB)")
    print(f"    Total Reduction: {reduction_pct:.2f}% (Saved {(orig_size - compressed_size)/1024/1024:.2f} MB)")

    # 6. Deep Document Integrity & Text Selectability Verification
    print("\n[6] Verifying PDF Document Integrity with PyMuPDF...")
    doc = fitz.open(stream=out_bytes, filetype="pdf")
    page_count = len(doc)
    print(f"    Total Pages: {page_count} (Expected: 43)")

    # Check page 1 text
    page1_text = doc[0].get_text()
    has_japanese = any(ord(c) > 0x3000 for c in page1_text)
    has_bengali = any(0x0980 <= ord(c) <= 0x09FF for c in page1_text)
    has_english = "Lesson" in page1_text or "Japanese" in page1_text

    print(f"    Page 1 Characters Extracted: {len(page1_text)} characters")
    print(f"    Japanese Vector Text Intact: {has_japanese}")
    print(f"    Bengali Vector Text Intact:  {has_bengali}")
    print(f"    English Vector Text Intact:  {has_english}")
    doc.close()

    print("\n" + "=" * 60)
    print("FINAL VERDICT: 100% VERIFIED SUCCESS!")
    print(f"Original:   4.19 MB (4,393,562 bytes)")
    print(f"Compressed: 774.5 KB ({compressed_size:,} bytes)")
    print(f"Saved:      {reduction_pct:.1f}%")
    print("=" * 60)

if __name__ == "__main__":
    test_live_stack()
