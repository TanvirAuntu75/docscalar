from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends
from fastapi.middleware.gzip import GZipMiddleware
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
from backend.services.split import split_pdf
from backend.services.edit_pdf import edit_pdf_backend
from backend.services.digital_sign import sign_pdf
from backend.services.url_to_pdf import convert_url_to_pdf
from backend.database import init_db, get_db, User, JobHistory
from backend.auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_optional
from backend.billing import router as billing_router
from backend.services.installer import (
    verify_dependencies_installed,
    get_install_status,
    start_install_dependencies
)
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

# Initialize Rate Limiter (disabled for local development to prevent rate-limit blocks)
limiter = Limiter(key_func=get_remote_address, enabled=False)

app = FastAPI(
    title="DocForge API Server",
    description="Hybrid conversion backend using headless LibreOffice and advanced document parsing.",
    version="1.0.0"
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Register rate limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Hard request body size gate — reject payloads > 210MB before they reach any endpoint
# (200MB PDF limit + multipart form overhead headroom)
MAX_REQUEST_BODY_BYTES = 210 * 1024 * 1024  # 210 MB

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/api/upload/chunk":
            return await call_next(request)
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
            return Response(
                content='{"detail":"Request payload too large. Maximum allowed upload size is 200MB."}',
                status_code=413,
                media_type="application/json"
            )
        return await call_next(request)

app.add_middleware(RequestSizeLimitMiddleware)

@app.get("/api/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok"}

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
    "application/zip",
    "application/octet-stream"
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

# Semantic Intent Command Router endpoint
class CommandRequest(BaseModel):
    query: str

@app.post("/api/canvas/command")
async def canvas_semantic_command(request: CommandRequest):
    try:
        from backend.services.router_service import match_semantic_intent
        action_id, score = match_semantic_intent(request.query)
        return {
            "success": True,
            "actionId": action_id,
            "confidence": score
        }
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error(f"Semantic command router error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

class AgentPlanRequest(BaseModel):
    query: str
    files: list[str]

@app.post("/api/canvas/agent-plan")
async def canvas_agent_plan(request: AgentPlanRequest):
    try:
        from backend.services.canvas_agent import generate_llm_plan, generate_heuristic_plan
        is_llm, steps = await generate_llm_plan(request.query, request.files)
        if not is_llm:
            steps = generate_heuristic_plan(request.query, request.files)
        return {
            "success": True,
            "steps": steps,
            "engine": "llm" if is_llm else "heuristic"
        }
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error(f"Canvas Agent Plan error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
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

# Core Endpoint: Upload File in Chunks (Premium Only)
@app.post("/api/upload/chunk")
@limiter.limit("30/minute")
async def upload_file_chunk(
    request: Request,
    file: UploadFile = File(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts sequential file chunk uploads from Premium (Pro) users.
    Saves chunks to a temporary file on disk and renames it to final on completion.
    """
    # 1. Premium Check
    if current_user.tier != "pro":
        raise HTTPException(
            status_code=403,
            detail="Chunked uploading is a Premium feature. Please upgrade your account to process large files."
        )

    # 2. Input Validation & Sanitization
    if not re.match(r"^[0-9a-fA-F-]{36}$", upload_id):
        raise HTTPException(status_code=400, detail="Invalid upload_id format.")

    raw_filename = Path(filename).name
    sanitized_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", raw_filename)
    
    ext = Path(sanitized_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension: {ext}."
        )

    try:
        # 3. Create target directory
        upload_folder = config.UPLOAD_DIR / upload_id
        upload_folder.mkdir(parents=True, exist_ok=True)
        
        temp_file_path = upload_folder / f"{sanitized_filename}.part"
        
        # 4. Append chunk directly to temp file
        with open(temp_file_path, "ab") as buffer:
            while True:
                chunk_data = await file.read(64 * 1024)
                if not chunk_data:
                    break
                buffer.write(chunk_data)

        # 5. Check if final chunk has arrived
        if chunk_index == total_chunks - 1:
            final_file_path = upload_folder / sanitized_filename
            if temp_file_path.exists():
                os.rename(temp_file_path, final_file_path)
            
            final_size = final_file_path.stat().st_size
            return {
                "success": True,
                "completed": True,
                "file_id": upload_id,
                "filename": sanitized_filename,
                "size_bytes": final_size
            }

        return {
            "success": True,
            "completed": False,
            "chunk_index": chunk_index
        }

    except Exception as e:
        # Clean up temp file/folder on failure
        shutil.rmtree(config.UPLOAD_DIR / upload_id, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Chunk upload failed: {str(e)}")

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
    target_language: str = Form(None),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue an AI document formatting, summarization, or translation job using local model.
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
        mode,
        target_language
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/smart-convert/direct")
@limiter.limit("30/minute")
async def smart_convert_direct(
    request: Request,
    text: str = Form(...),
    mode: str = Form(...),
    target_language: str = Form(None)
):
    """
    Directly run AI generation (summarize, clean, translate) on a text string.
    Returns the generated result immediately (no queue) for fast interactive calls.
    """
    from backend.services.ai_service import generate_ai_enhancement
    result = await generate_ai_enhancement(text, mode, target_language)
    return {"success": True, "result": result}

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

# Core Endpoint: Edit PDF (apply drawings, shapes, and font-preserving text-edit redactions)
@app.post("/api/edit-pdf")
@limiter.limit("5/minute")
async def edit_pdf_endpoint(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    annotations_json: str = Form(...),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue an edit PDF job to apply vectors, annotations, and text replacements.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")
        
    try:
        annotations = json.loads(annotations_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid annotations JSON format")
        
    job_id = enqueue_job(
        edit_pdf_backend,
        str(input_path),
        annotations
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

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

@app.post("/api/pdf/digitally-sign")
@limiter.limit("5/minute")
async def api_digitally_sign_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    certificate: Optional[UploadFile] = File(None),
    passphrase: Optional[str] = Form(None),
    common_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    page_index: Optional[int] = Form(0),
    x1: Optional[float] = Form(0.0),
    y1: Optional[float] = Form(0.0),
    x2: Optional[float] = Form(0.0),
    y2: Optional[float] = Form(0.0),
    signature_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a job to digitally sign a PDF with a PKCS12 certificate or an autogenerated seal.
    Can also stamp a visible cryptographic stamp overlay at the selected coordinate space.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")
        
    pfx_bytes_hex = ""
    passphrase_val = passphrase or ""
    
    if certificate:
        cert_bytes = await certificate.read()
        pfx_bytes_hex = cert_bytes.hex()
    else:
        cn = common_name or "DocForge Trust Seal"
        em = email or "security@docforge.com"
        try:
            from backend.services.digital_sign import generate_self_signed_pfx
            pfx_bytes = generate_self_signed_pfx(email=em, common_name=cn)
            pfx_bytes_hex = pfx_bytes.hex()
            passphrase_val = "docforge"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate self-signed key: {str(e)}")
            
    sig_image_hex = ""
    if signature_image:
        sig_bytes = await signature_image.read()
        sig_image_hex = sig_bytes.hex()
        
    job_id = enqueue_job(
        sign_pdf,
        str(input_path),
        pfx_bytes_hex,
        passphrase_val,
        page_index,
        x1,
        y1,
        x2,
        y2,
        sig_image_hex
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
    password: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a PDF password unlocking/decryption job.
    Password is optional — the backend will attempt auto-recovery from
    the protected_files table and fall back to an empty password before
    returning PASSWORD_REQUIRED to the client.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    # Queue the PyMuPDF unlock job (password may be None / empty)
    job_id = enqueue_job(
        unlock_pdf,
        str(input_path),
        password or ""
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
    filename: str = Form(...),
    safe_mode: bool = Form(False)
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
        str(input_path),
        safe_mode=safe_mode
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

@app.post("/api/convert/url-to-pdf")
@limiter.limit("5/minute")
async def api_url_to_pdf(
    request: Request,
    url: str = Form(...),
    format: str = Form("A4"),
    landscape: str = Form("false"),
    print_background: str = Form("true"),
    margin_type: str = Form("default"),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a job to convert an online website URL link to a PDF.
    """
    is_landscape = landscape.lower() == "true"
    is_print_bg = print_background.lower() == "true"
    
    job_id = enqueue_job(
        convert_url_to_pdf,
        url,
        format,
        is_landscape,
        is_print_bg,
        margin_type
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/convert/split-pdf")
@limiter.limit("5/minute")
async def api_split_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    mode: str = Form("all"),
    range: str = Form(""),
    extra_params: str = Form("{}"),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Queue a job to perform high-speed server-side PDF splitting (pikepdf).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    job_id = enqueue_job(
        split_pdf,
        str(input_path),
        mode,
        range,
        extra_params
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued"
    }

@app.post("/api/convert/ocr-image")
@limiter.limit("5/minute")
async def api_ocr_image(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Perform high-fidelity server-side OCR on an uploaded image.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")
        
    try:
        from backend.services.ocr_engine import RobustOCREngine
        engine = RobustOCREngine()
        # Default to paddleocr for high quality structure and layout preservation
        result = engine.process(str(input_path), engine_name="paddleocr")
        return result
    except Exception as e:
        logger.exception("OCR Image processing failed")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

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
    
    from backend.config import IS_DESKTOP_MODE, IS_PACKAGED
    tier_val = "pro" if (IS_DESKTOP_MODE or IS_PACKAGED) else "free"
    
    new_user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        password_hash=hash_password(payload.password),
        tier=tier_val
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token({"user_id": new_user.id, "email": new_user.email})
    return {"access_token": token, "token_type": "bearer", "tier": new_user.tier}

@app.post("/api/auth/login")
@limiter.limit("5/minute")
def login(request: Request, payload: AuthSchema, db: Session = Depends(get_db)):
    from backend.config import IS_DESKTOP_MODE, IS_PACKAGED
    
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        if IS_DESKTOP_MODE or IS_PACKAGED:
            # Auto-register local desktop users as Pro
            user = User(
                id=str(uuid.uuid4()),
                email=payload.email,
                password_hash=hash_password(payload.password),
                tier="pro"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=401, detail="Incorrect email or password.")
    else:
        if not verify_password(payload.password, user.password_hash):
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

@app.get("/api/bootstrap/status")
async def get_bootstrap_status():
    """Returns status of whether portable dependencies (LibreOffice and OCR models) are installed."""
    if not config.IS_DESKTOP_MODE and not config.IS_PACKAGED:
        return {"installed": True, "status": "ready"}
        
    installed = verify_dependencies_installed()
    status = get_install_status()
    
    return {
        "installed": installed,
        "status": status["status"],
        "step": status["step"],
        "percent": status["percent"],
        "speed_mb": status["speed_mb"],
        "error": status["error"]
    }

@app.post("/api/bootstrap/install")
async def trigger_bootstrap_install():
    """Triggers the background download and installation of dependencies."""
    started = start_install_dependencies()
    return {"started": started}

if __name__ == "__main__":
    # Pass the app object directly to uvicorn to avoid import resolution issues in packaged PyInstaller envs
    uvicorn.run(
        app, 
        host=config.HOST, 
        port=config.PORT, 
        reload=False
    )


