from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from apscheduler.schedulers.background import BackgroundScheduler
from pathlib import Path
import os
import shutil
import uuid
import re
import sentry_sdk
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from backend import config
from backend.jobs.cleanup import cleanup_expired_files
from backend.jobs.queue import enqueue_job, get_job_status
from backend.services.libreoffice import convert_with_libreoffice, SUPPORTED_CONVERSIONS
from backend.services.smart_service import process_smart_convert
from backend.services.security import protect_pdf, unlock_pdf
from backend.services.pdf_to_word import convert_pdf_to_docx
from backend.services.html_to_pdf import convert_html_to_pdf
from backend.services.pdf_to_excel import convert_pdf_to_excel
from backend.services.pdf_to_powerpoint import convert_pdf_to_powerpoint
from backend.services.pdf_to_pdfa import convert_pdf_to_pdfa
from backend.services.redaction import redact_pdf
from backend.services.ocr import run_ocr_on_pdf
from backend.services.compression import compress_pdf
from backend.database import init_db, get_db, User, JobHistory
from backend.auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_optional
from backend.billing import router as billing_router
import json
import uvicorn

# Initialize Sentry if configured
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="DocForge API Server",
    description="Hybrid conversion backend using headless LibreOffice and advanced document parsing.",
    version="1.0.0"
)

# Register rate limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Hard request body size gate — reject payloads > 210MB before they reach any endpoint
# (200MB PDF limit + multipart form overhead headroom)
MAX_REQUEST_BODY_BYTES = 210 * 1024 * 1024  # 210 MB

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
            return Response(
                content='{"detail":"Request payload too large. Maximum allowed upload size is 200MB."}',
                status_code=413,
                media_type="application/json"
            )
        return await call_next(request)

app.add_middleware(RequestSizeLimitMiddleware)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize APScheduler for cleanup
scheduler = BackgroundScheduler()
scheduler.add_job(
    cleanup_expired_files, 
    'interval', 
    minutes=config.CLEANUP_INTERVAL_MINS
)

@app.on_event("startup")
def startup_event():
    init_db()
    scheduler.start()
    print("DocForge Server: Initialized Database tables and started cleanup scheduler.")

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()
    print("DocForge Server: Shut down scheduler.")

ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".xls", ".xlsx", ".ppt", ".pptx", ".html", ".txt",
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".zip"
}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/html",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/bmp",
    "image/gif",
    "application/zip"
}

# Ceiling size configurations
FREE_MAX_FILE_SIZE = 100 * 1024 * 1024     # 100 Megabytes
PRO_MAX_FILE_SIZE = 500 * 1024 * 1024     # 500 Megabytes

# iLovePDF Free Limits by file extension
FREE_LIMITS = {
    "pdf": 200 * 1024 * 1024,
    "docx": 15 * 1024 * 1024, "doc": 15 * 1024 * 1024,
    "xlsx": 15 * 1024 * 1024, "xls": 15 * 1024 * 1024,
    "pptx": 15 * 1024 * 1024, "ppt": 15 * 1024 * 1024,
    "html": 15 * 1024 * 1024, "txt": 15 * 1024 * 1024,
    "png": 40 * 1024 * 1024, "jpg": 40 * 1024 * 1024, "jpeg": 40 * 1024 * 1024,
    "webp": 40 * 1024 * 1024, "bmp": 40 * 1024 * 1024, "gif": 40 * 1024 * 1024,
    "zip": 100 * 1024 * 1024,
}

# Core Endpoint: Upload File
@app.post("/api/upload")
@limiter.limit("10/minute")
async def upload_file(
    request: Request, 
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Accepts file upload, validates size/MIME type, sanitizes filenames, and streams to secure path.
    Enforces extension-specific limits matching iLovePDF for Free users and 500MB for Pro.
    """
    try:
        # 1. Path Traversal Protection & Filename Sanitization
        raw_filename = Path(file.filename).name
        sanitized_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', raw_filename)
        
        # 2. File Extension Validation
        ext = Path(sanitized_filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension: {ext}. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )
            
        # 3. MIME Type Validation
        content_type = file.content_type
        if content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file content type: {content_type}."
            )

        # Determine current user tier and limits
        user_tier = "free"
        if current_user:
            user_tier = current_user.tier

        if user_tier == "pro":
            max_allowed_size = PRO_MAX_FILE_SIZE
            max_allowed_label = "500MB"
        else:
            ext_key = ext.lstrip(".")
            max_allowed_size = FREE_LIMITS.get(ext_key, 15 * 1024 * 1024)
            max_allowed_label = f"{max_allowed_size // (1024 * 1024)}MB"

        # 4. Generate unique folder per upload to avoid filename collisions
        upload_id = str(uuid.uuid4())
        upload_folder = config.UPLOAD_DIR / upload_id
        upload_folder.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_folder / sanitized_filename
        
        # 5. Stream file in chunks & Validate file size against limits
        total_size = 0
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(64 * 1024)  # Read 64KB chunk
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_allowed_size:
                    # Clean up temporary file and folder on violation
                    buffer.close()
                    if file_path.exists():
                        file_path.unlink()
                    if upload_folder.exists():
                        shutil.rmtree(upload_folder, ignore_errors=True)
                    
                    if user_tier == "pro":
                        detail_msg = f"File exceeds maximum allowed size of 500MB for your account tier."
                    else:
                        detail_msg = f"File exceeds the {max_allowed_label} limit for {ext.upper().lstrip('.')} files."
                    raise HTTPException(
                        status_code=400,
                        detail=detail_msg
                    )
                buffer.write(chunk)
                
        return {
            "success": True,
            "file_id": upload_id,
            "filename": sanitized_filename,
            "size_bytes": total_size
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Core Endpoint: Queue Conversion Job
@app.post("/api/convert")
@limiter.limit("5/minute")
async def convert_file(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    target_format: str = Form(...),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a document conversion job.
    """
    # Verify input file exists
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    # Queue the conversion job (HTML goes through WeasyPrint, others via LibreOffice)
    ext = input_path.suffix.lower()
    if ext == ".html" and target_format == "pdf":
        job_id = enqueue_job(
            convert_html_to_pdf,
            str(input_path)
        )
    else:
        job_id = enqueue_job(
            convert_with_libreoffice,
            str(input_path),
            target_format
        )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

# Core Endpoint: AI-Powered SmartConvert Job
@app.post("/api/smart-convert")
@limiter.limit("5/minute")
async def smart_convert_file(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    mode: str = Form(...), # 'summarize' | 'clean' | 'translate'
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue an AI document formatting, summarization, or translation job using local Gemma-3-4B model.
    """
    # Verify input file exists
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    # Queue the AI conversion pipeline task
    job_id = enqueue_job(
        process_smart_convert,
        str(input_path),
        mode
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

# Core Endpoint: Poll Job Status
@app.get("/api/job/{job_id}/status")
async def check_job_status(job_id: str):
    """
    Check the status and results of a queued conversion job.
    """
    status_info = get_job_status(job_id)
    
    # If finished, make a download path relative to main server
    if status_info.get("status") == "finished" and status_info.get("result"):
        res = status_info["result"]
        
        # Check success regardless of whether it's serialized as a dict or object
        is_success = False
        output_path = None
        error_msg = None
        
        if hasattr(res, 'success'):
            is_success = res.success
            output_path = res.output_path
            error_msg = res.error_message
        elif isinstance(res, dict):
            is_success = res.get('success', False)
            output_path = res.get('output_path')
            error_msg = res.get('error_message')
            
        if is_success and output_path:
            filename = Path(output_path).name
            status_info["download_url"] = f"/api/download/{job_id}/{filename}"
        else:
            status_info["status"] = "failed"
            status_info["error"] = error_msg or "Conversion failed on server."
            
    return status_info

# Core Endpoint: Stream Converted Output File
@app.get("/api/download/{job_id}/{filename}")
async def download_converted_file(job_id: str, filename: str):
    """
    Downloads/streams the converted document back to the user.
    """
    # Search for matching file inside output directory
    file_path = config.OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Requested file was not found or has expired")
        
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )

@app.post("/api/security/protect")
@limiter.limit("10/minute")
async def security_protect_file(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    password: str = Form(...),
    allow_print: bool = Form(True),
    allow_copy: bool = Form(True),
    allow_edit: bool = Form(True),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a PDF password protection/encryption job.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    # Queue the PyMuPDF protect job
    job_id = enqueue_job(
        protect_pdf,
        str(input_path),
        password,
        allow_print,
        allow_copy,
        allow_edit
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/security/unlock")
@limiter.limit("10/minute")
async def security_unlock_file(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a PDF password unlocking/decryption job.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    # Queue the PyMuPDF unlock job
    job_id = enqueue_job(
        unlock_pdf,
        str(input_path),
        password
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/convert/pdf-to-docx")
@limiter.limit("5/minute")
async def api_pdf_to_word(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...)
):
    """
    Queue a job to convert PDF to DOCX format using pdf2docx.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    # Queue the pdf2docx job
    job_id = enqueue_job(
        convert_pdf_to_docx,
        str(input_path)
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/convert/pdf-to-excel")
@limiter.limit("5/minute")
async def api_pdf_to_excel(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...)
):
    """
    Queue a job to convert PDF to Excel spreadsheet.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    job_id = enqueue_job(
        convert_pdf_to_excel,
        str(input_path)
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/convert/pdf-to-powerpoint")
@limiter.limit("5/minute")
async def api_pdf_to_powerpoint(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...)
):
    """
    Queue a job to convert PDF to PowerPoint slides.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    job_id = enqueue_job(
        convert_pdf_to_powerpoint,
        str(input_path)
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/convert/pdf-to-pdfa")
@limiter.limit("5/minute")
async def api_pdf_to_pdfa(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a job to convert PDF to ISO-compliant PDF/A.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    job_id = enqueue_job(
        convert_pdf_to_pdfa,
        str(input_path)
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/security/redact")
@limiter.limit("5/minute")
async def api_redact_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    redactions_json: str = Form(...),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a job to apply coordinate-based secure redactions to PDF.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    try:
        redactions = json.loads(redactions_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON format for redactions_json")

    job_id = enqueue_job(
        redact_pdf,
        str(input_path),
        redactions
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/convert/ocr-pdf")
@limiter.limit("5/minute")
async def api_ocr_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    language: str = Form("eng"),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a job to perform server-side OCR on a PDF file.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    job_id = enqueue_job(
        run_ocr_on_pdf,
        str(input_path),
        language
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/convert/compress-pdf")
@limiter.limit("5/minute")
async def api_compress_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    quality: float = Form(0.6),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a job to perform PDF compression (Ghostscript or PyMuPDF).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    job_id = enqueue_job(
        compress_pdf,
        str(input_path),
        quality
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

# Metadata endpoint: Available LibreOffice conversions
@app.get("/api/meta/conversions")
async def get_supported_conversions():
    return SUPPORTED_CONVERSIONS

# Include Billing routes
app.include_router(billing_router)

class AuthSchema(BaseModel):
    email: EmailStr
    password: str

@app.post("/api/auth/signup")
@limiter.limit("3/minute")
def signup(request: Request, payload: AuthSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    new_user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        password_hash=hash_password(payload.password),
        tier="free"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token({"user_id": new_user.id, "email": new_user.email})
    return {"access_token": token, "token_type": "bearer", "tier": new_user.tier}

@app.post("/api/auth/login")
@limiter.limit("5/minute")
def login(request: Request, payload: AuthSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
        
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {"access_token": token, "token_type": "bearer", "tier": user.tier}

@app.delete("/api/auth/delete-account")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Completely deletes the user account, billing settings, and history to comply with GDPR.
    """
    # Delete job history associated with user
    db.query(JobHistory).filter(JobHistory.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"success": True, "message": "Your account has been permanently deleted."}

# Server entry run command
if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app", 
        host=config.HOST, 
        port=config.PORT, 
        reload=True
    )

