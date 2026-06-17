import requests

with open("test.docx", "w") as f:
    f.write("hello")

with open("test.docx", "rb") as f:
    r = requests.post("http://localhost:8000/api/upload", files={"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    data = r.json()
    print(data)
    file_id = data["file_id"]
    filename = data["filename"]

r2 = requests.post("http://localhost:8000/api/convert", data={
    "file_id": file_id,
    "filename": filename,
    "target_format": "pdf"
})
job_data = r2.json()
print(job_data)
job_id = job_data["job_id"]

import time
while True:
    r3 = requests.get(f"http://localhost:8000/api/job/{job_id}/status")
    print(r3.json())
    if r3.json()["status"] in ["finished", "failed"]:
        break
    time.sleep(1)
