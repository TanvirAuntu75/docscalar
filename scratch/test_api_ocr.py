import requests
import time
import os

def test_ocr_api():
    base_url = "http://localhost:8000"
    file_path = "backend/uploads/c2099e5c-85a5-40c7-bec8-3b738ea8835c/numbers_gs150.pdf"
    
    print(f"1. Uploading file {file_path}...")
    with open(file_path, "rb") as f:
        r = requests.post(f"{base_url}/api/upload", files={"file": ("numbers_gs150.pdf", f, "application/pdf")})
    
    if r.status_code != 200:
        print("Upload failed:", r.text)
        return
        
    upload_res = r.json()
    print("Upload response:", upload_res)
    
    file_id = upload_res["file_id"]
    filename = upload_res["filename"]
    
    print("\n2. Queueing OCR job (using Tesseract)...")
    payload = {
        "file_id": file_id,
        "filename": filename,
        "language": "eng",
        "pagesegmode": "3",
        "deskew": "true",
        "engine": "tesseract"
    }
    
    t0 = time.time()
    r = requests.post(f"{base_url}/api/convert/ocr-pdf", data=payload)
    if r.status_code != 200:
        print("Queue job failed:", r.text)
        return
        
    job_res = r.json()
    print("Queue response:", job_res)
    
    job_id = job_res["job_id"]
    
    print(f"\n3. Polling job status for job_id {job_id}...")
    while True:
        r = requests.get(f"{base_url}/api/job/{job_id}/status")
        if r.status_code != 200:
            print("Status fetch failed:", r.text)
            break
            
        status_res = r.json()
        print(f"Status: {status_res['status']} | Progress: {status_res.get('progress')}%")
        
        if status_res["status"] == "finished":
            print(f"\nSUCCESS! OCR finished in {time.time() - t0:.2f}s.")
            print("Result:", status_res)
            break
        elif status_res["status"] == "failed":
            print("\nOCR failed:", status_res.get("error"))
            break
            
        time.sleep(1.0)

if __name__ == "__main__":
    # Wait a second to ensure server is listening
    time.sleep(1.0)
    test_ocr_api()
