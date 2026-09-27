import os
import sys

# Ensure parent and backend directories are in sys.path for PyInstaller frozen environments
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import json
import logging
import re
import shutil
import uuid
from pathlib import Path

import sentry_sdk
import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from backend import config
from backend.auth import (
    create_access_token,
    get_current_user,
    get_current_user_optional,
    hash_password,
    verify_password,
)
from backend.billing import router as billing_router
from backend.database import JobHistory, Subscription, User, get_db, init_db
from backend.jobs.cleanup import cleanup_expired_files
from backend.jobs.queue import cancel_job, enqueue_job, get_job_status
from backend.services.compression import compress_pdf
from backend.services.digital_sign import sign_pdf
from backend.services.edit_pdf import edit_pdf_backend
from backend.services.html_to_pdf import convert_html_to_pdf
from backend.services.installer import (
    start_install_dependencies,
)
from backend.services.libreoffice import SUPPORTED_CONVERSIONS, convert_with_libreoffice
from backend.services.ocr import run_ocr_on_pdf
from backend.services.pdf_to_excel import convert_pdf_to_excel
from backend.services.pdf_to_pdfa import convert_pdf_to_pdfa
from backend.services.pdf_to_powerpoint import convert_pdf_to_powerpoint
from backend.services.pdf_to_word import convert_pdf_to_docx
from backend.services.redaction import redact_pdf
from backend.services.repair import repair_pdf
from backend.services.security import protect_pdf, unlock_pdf
from backend.services.smart_service import process_smart_convert
from backend.services.split import split_pdf
from backend.services.url_to_pdf import convert_url_to_pdf
from backend.services.pdf_ops import (
    merge_pdfs,
    rotate_pdf,
    crop_pdf,
    add_watermark,
    add_page_numbers,
    pdf_to_images,
    extract_pages,
    remove_pages,
    image_to_pdf,
)

logger = logging.getLogger("docscalar_api")

# Initialize Sentry if configured
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.2")),
        profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.2")),
    )

# Initialize Rate Limiter (configurable via RATE_LIMIT_ENABLED; enabled by default in production)
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true" if os.getenv("DOCSCALAR_ENV") == "production" else "false").lower() in ("true", "1", "yes")
limiter = Limiter(key_func=get_remote_address, enabled=RATE_LIMIT_ENABLED)

app = FastAPI(
    title="DocScalar API Server",
    description="Hybrid conversion backend using headless LibreOffice and advanced document parsing.",
    version="1.0.0",
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
                media_type="application/json",
            )
        return await call_next(request)


app.add_middleware(RequestSizeLimitMiddleware)


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok"}


# Enable CORS for Vite frontend, Tauri desktop, and production domains
raw_cors = os.getenv("CORS_ORIGINS", "")
if raw_cors:
    cors_origins = [o.strip() for o in raw_cors.split(",") if o.strip()]
else:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8765",
        "http://127.0.0.1:8765",
        "tauri://localhost",
        "https://tauri.localhost",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize APScheduler for cleanup
scheduler = BackgroundScheduler()
scheduler.add_job(
    cleanup_expired_files, "interval", minutes=config.CLEANUP_INTERVAL_MINS
)


@app.on_event("startup")
def startup_event():
    init_db()
    scheduler.start()
    print("DocScalar Server: Initialized Database tables and started cleanup scheduler.")


@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()
    print("DocScalar Server: Shut down scheduler.")


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".doc",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".html",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".gif",
    ".zip",
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
    "application/octet-stream",
}

# Ceiling size configurations (10MB Guest, 15MB Free Account, 1GB Pro)
GUEST_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 Megabytes (Guest Mode)
FREE_MAX_FILE_SIZE = 15 * 1024 * 1024   # 15 Megabytes (Free Account Mode)
PRO_MAX_FILE_SIZE = 1024 * 1024 * 1024  # 1024 Megabytes / 1 GB (Pro Tier)

# Extension limits matching DocScalar tier architecture
FREE_LIMITS = {
    "pdf": 15 * 1024 * 1024,
    "docx": 15 * 1024 * 1024,
    "doc": 15 * 1024 * 1024,
    "xlsx": 15 * 1024 * 1024,
    "xls": 15 * 1024 * 1024,
    "pptx": 15 * 1024 * 1024,
    "ppt": 15 * 1024 * 1024,
    "html": 15 * 1024 * 1024,
    "txt": 15 * 1024 * 1024,
    "png": 15 * 1024 * 1024,
    "jpg": 15 * 1024 * 1024,
    "jpeg": 15 * 1024 * 1024,
    "webp": 15 * 1024 * 1024,
    "bmp": 15 * 1024 * 1024,
    "gif": 15 * 1024 * 1024,
    "zip": 15 * 1024 * 1024,
}


# Semantic Intent Command Router endpoint
class CommandRequest(BaseModel):
    query: str


@app.post("/api/canvas/command")
async def canvas_semantic_command(request: CommandRequest):
    try:
        from backend.services.router_service import match_semantic_intent

        action_id, score = match_semantic_intent(request.query)
        return {"success": True, "actionId": action_id, "confidence": score}
    except Exception as e:
        import logging

        logging.getLogger("uvicorn.error").error(
            f"Semantic command router error: {e!s}"
        )
        return {"success": False, "error": str(e)}


class AgentPlanRequest(BaseModel):
    query: str
    files: Optional[List[str]] = []


@app.post("/api/canvas/agent-plan")
async def canvas_agent_plan(request: AgentPlanRequest):
    try:
        from backend.services.canvas_agent import (
            generate_heuristic_plan,
            generate_llm_plan,
        )

        is_llm, steps = await generate_llm_plan(request.query, request.files)
        if not is_llm:
            steps = generate_heuristic_plan(request.query, request.files)
        return {
            "success": True,
            "steps": steps,
            "engine": "llm" if is_llm else "heuristic",
        }
    except Exception as e:
        import logging

        logging.getLogger("uvicorn.error").error(f"Canvas Agent Plan error: {e!s}")
        return {"success": False, "error": str(e)}


# Core Endpoint: Upload File
@app.post("/api/upload")
@limiter.limit("10/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Accepts file upload, validates size/MIME type, sanitizes filenames, and streams to secure path.
    Enforces extension-specific limits matching iLovePDF for Free users and 500MB for Pro.
    """
    try:
        # 1. Path Traversal Protection & Filename Sanitization (Unicode-safe for international filenames)
        raw_filename = Path(file.filename).name
        sanitized_filename = re.sub(r'[\r\n"\\/\0\x00-\x1f]', '_', raw_filename).strip() or "document.pdf"

        # 2. File Extension Validation
        ext = Path(sanitized_filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension: {ext}. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        # 3. MIME Type Validation
        content_type = file.content_type
        if content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file content type: {content_type}.",
            )

        # Determine current user tier and limits (10MB Guest, 15MB Free Account, 1GB Pro)
        user_tier = "guest"
        if current_user:
            user_tier = current_user.tier

        if user_tier == "pro":
            max_allowed_size = PRO_MAX_FILE_SIZE
            max_allowed_label = "1GB"
        elif user_tier == "free":
            max_allowed_size = FREE_MAX_FILE_SIZE
            max_allowed_label = "15MB"
        else:
            max_allowed_size = GUEST_MAX_FILE_SIZE
            max_allowed_label = "10MB"

        # 4. Generate unique folder per upload to avoid filename collisions
        upload_id = str(uuid.uuid4())
        upload_folder = config.UPLOAD_DIR / upload_id
        upload_folder.mkdir(parents=True, exist_ok=True)

        file_path = upload_folder / sanitized_filename

        # 5. Stream file in chunks & Validate file size against limits
        total_size = 0
        size_exceeded = False
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(64 * 1024)  # Read 64KB chunk
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_allowed_size:
                    size_exceeded = True
                    break
                buffer.write(chunk)

        if size_exceeded:
            # Clean up temporary file and folder outside active buffer context
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            if upload_folder.exists():
                shutil.rmtree(upload_folder, ignore_errors=True)

            if user_tier == "pro":
                detail_msg = "File exceeds maximum allowed size of 1GB for DocScalar Pro."
            elif user_tier == "free":
                detail_msg = "File exceeds the 15MB limit for free registered accounts. Upgrade to Pro for up to 1GB files."
            else:
                detail_msg = "File exceeds the 10MB limit for guest mode. Create a free account to upload files up to 15MB."
            raise HTTPException(status_code=400, detail=detail_msg)

        if total_size == 0:
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            if upload_folder.exists():
                shutil.rmtree(upload_folder, ignore_errors=True)
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty (0 bytes). Please upload a valid document.",
            )

        return {
            "success": True,
            "file_id": upload_id,
            "filename": sanitized_filename,
            "size_bytes": total_size,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while saving the file: {e!s}",
        )


@app.post("/api/upload/chunk")
@app.post("/api/upload-chunk")
@limiter.limit("200/minute")
async def upload_file_chunk(
    request: Request,
    file: UploadFile = File(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form(...),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Handles chunked file uploads for massive documents (>100MB).
    Appends binary slices incrementally and stitches on the final chunk.
    """
    try:
        # 1. Sanitize filename
        sanitized_filename = re.sub(r"[^\w\.\-\_ ]", "_", filename)
        sanitized_filename = os.path.basename(sanitized_filename)

        # 2. Prevent path traversal
        upload_id = os.path.basename(upload_id)

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
                os.replace(temp_file_path, final_file_path)

            final_size = final_file_path.stat().st_size
            return {
                "success": True,
                "completed": True,
                "file_id": upload_id,
                "filename": sanitized_filename,
                "size_bytes": final_size,
            }

        return {"success": True, "completed": False, "chunk_index": chunk_index}

    except Exception as e:
        # Clean up temp file/folder on failure
        shutil.rmtree(config.UPLOAD_DIR / upload_id, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Chunk upload failed: {e!s}")


# Core Endpoint: Queue Conversion Job
@app.post("/api/convert")
@limiter.limit("30/minute")
async def convert_file(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    target_format: str = Form(...),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a document conversion job.
    """
    # Verify input file exists
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    # Queue the conversion job (HTML goes through WeasyPrint, others via LibreOffice)
    ext = input_path.suffix.lower()
    if ext == ".html" and target_format == "pdf":
        job_id = enqueue_job(convert_html_to_pdf, str(input_path))
    else:
        job_id = enqueue_job(convert_with_libreoffice, str(input_path), target_format)

    return {"success": True, "job_id": job_id, "status": "queued"}


# Core Endpoint: AI-Powered SmartConvert Job
@app.post("/api/smart-convert")
@limiter.limit("30/minute")
async def smart_convert_file(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    mode: str = Form(...),  # 'summarize' | 'clean' | 'translate'
    target_language: str = Form(None),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue an AI document formatting, summarization, or translation job using local model.
    """
    # Verify input file exists
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    # Queue the AI conversion pipeline task
    job_id = enqueue_job(process_smart_convert, str(input_path), mode, target_language)

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/translate-pdf")
@limiter.limit("30/minute")
async def api_convert_translate_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    target_lang: str = Form("Bengali"),
    target_language: Optional[str] = Form(None),
    source_lang: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a PDF translation job (alias forwarding to smart-convert).
    """
    target = target_language or target_lang
    return await smart_convert_file(
        request=request,
        file_id=file_id,
        filename=filename,
        mode="translate",
        target_language=target,
        current_user=current_user,
    )


@app.post("/api/smart-convert/direct")
@limiter.limit("30/minute")
async def smart_convert_direct(
    request: Request,
    text: str = Form(...),
    mode: str = Form(...),
    target_language: str = Form(None),
):
    """
    Directly run AI generation (summarize, clean, translate) on a text string.
    Returns the generated result immediately (no queue) for fast interactive calls.
    """
    from backend.services.ai_service import generate_ai_enhancement

    result = await generate_ai_enhancement(text, mode, target_language)
    return {"success": True, "result": result}


# Core Endpoint: Poll Job Status (with plural and legacy route aliases)
@app.get("/api/job/{job_id}/status")
@app.get("/api/jobs/status/{job_id}")
@app.get("/api/jobs/{job_id}/status")
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

        if hasattr(res, "success"):
            is_success = res.success
            output_path = res.output_path
            error_msg = res.error_message
        elif isinstance(res, dict):
            is_success = res.get("success", False)
            output_path = res.get("output_path")
            error_msg = res.get("error_message")

        if is_success and output_path:
            filename = Path(output_path).name
            status_info["download_url"] = f"/api/download/{job_id}/{filename}"
        else:
            status_info["status"] = "failed"
            status_info["error"] = error_msg or "Conversion failed on server."

    return status_info


# Core Endpoint: Cancel Conversion Job (Cooperative Worker Termination)
@app.post("/api/job/{job_id}/cancel")
@app.post("/api/jobs/{job_id}/cancel")
async def cancel_job_endpoint(job_id: str):
    """
    Cooperative job cancellation endpoint. Cancels a queued or in-flight conversion job.
    """
    cancelled = cancel_job(job_id)
    return {
        "success": cancelled,
        "job_id": job_id,
        "status": "cancelled" if cancelled else "not_found",
    }


# Core Endpoint: Stream Converted Output File (Multi-Tenant Isolated)
@app.get("/api/download/{job_id}/{filename}")
async def download_converted_file(job_id: str, filename: str):
    """
    Downloads/streams the converted document back to the user.
    Enforces job_id isolation to prevent multi-tenant file collision and data leaks.
    """
    safe_job_id = os.path.basename(job_id)
    safe_filename = os.path.basename(filename)

    # Search isolated job directory first, then fallback to flat output dir for backward compatibility
    isolated_path = config.OUTPUT_DIR / safe_job_id / safe_filename
    flat_path = config.OUTPUT_DIR / safe_filename

    target_path = (
        isolated_path
        if isolated_path.exists()
        else (flat_path if flat_path.exists() else None)
    )

    if not target_path or not target_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Requested file was not found or has expired (documents are purged after 30 minutes for security).",
        )

    return FileResponse(
        path=target_path,
        filename=safe_filename,
        media_type="application/octet-stream",
    )


@app.get("/api/download/{filename}")
async def download_file_direct(filename: str):
    """
    Direct download fallback for backward-compatible single filename requests.
    """
    safe_filename = os.path.basename(filename)
    file_path = config.OUTPUT_DIR / safe_filename
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Requested file was not found or has expired (documents are purged after 30 minutes for security).",
        )

    return FileResponse(
        path=file_path,
        filename=safe_filename,
        media_type="application/octet-stream",
    )


# Core Endpoint: Edit PDF (apply drawings, shapes, and font-preserving text-edit redactions)
@app.post("/api/edit-pdf")
@limiter.limit("30/minute")
async def edit_pdf_endpoint(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    annotations_json: str = Form(...),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue an edit PDF job to apply vectors, annotations, and text replacements.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    try:
        annotations = json.loads(annotations_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid annotations JSON format")

    job_id = enqueue_job(edit_pdf_backend, str(input_path), annotations)

    return {"success": True, "job_id": job_id, "status": "queued"}


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
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a PDF password protection/encryption job.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    # Queue the PyMuPDF protect job
    job_id = enqueue_job(
        protect_pdf, str(input_path), password, allow_print, allow_copy, allow_edit
    )

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/pdf/digitally-sign")
@limiter.limit("30/minute")
async def api_digitally_sign_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    certificate: UploadFile | None = File(None),
    passphrase: str | None = Form(None),
    common_name: str | None = Form(None),
    email: str | None = Form(None),
    page_index: int | None = Form(0),
    x1: float | None = Form(0.0),
    y1: float | None = Form(0.0),
    x2: float | None = Form(0.0),
    y2: float | None = Form(0.0),
    signature_image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to digitally sign a PDF with a PKCS12 certificate or an autogenerated seal.
    Can also stamp a visible cryptographic stamp overlay at the selected coordinate space.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    pfx_bytes_hex = ""
    passphrase_val = passphrase or ""

    if certificate:
        cert_bytes = await certificate.read()
        pfx_bytes_hex = cert_bytes.hex()
    else:
        cn = common_name or "DocScalar Trust Seal"
        em = email or "security@docscalar.com"
        try:
            from backend.services.digital_sign import generate_self_signed_pfx

            pfx_bytes = generate_self_signed_pfx(email=em, common_name=cn)
            pfx_bytes_hex = pfx_bytes.hex()
            passphrase_val = "docscalar"
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to generate self-signed key: {e!s}"
            )

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
        sig_image_hex,
    )

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/security/unlock")
@limiter.limit("10/minute")
async def security_unlock_file(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    password: str | None = Form(default=None),
    current_user: User = Depends(get_current_user_optional),
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
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    # Queue the PyMuPDF unlock job (password may be None / empty)
    job_id = enqueue_job(unlock_pdf, str(input_path), password or "")

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/pdf-to-docx")
@limiter.limit("30/minute")
async def api_pdf_to_word(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    safe_mode: bool = Form(False),
):
    """
    Queue a job to convert PDF to DOCX format using pdf2docx.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    # Queue the pdf2docx job
    job_id = enqueue_job(convert_pdf_to_docx, str(input_path), safe_mode=safe_mode)

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/pdf-to-excel")
@limiter.limit("30/minute")
async def api_pdf_to_excel(
    request: Request, file_id: str = Form(...), filename: str = Form(...)
):
    """
    Queue a job to convert PDF to Excel spreadsheet.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    job_id = enqueue_job(convert_pdf_to_excel, str(input_path))

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/excel-to-pdf")
@limiter.limit("30/minute")
async def api_excel_to_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    page_size: Optional[str] = Form("a4"),
    orientation: Optional[str] = Form("auto"),
    gridlines: Optional[bool] = Form(True),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to convert Excel spreadsheet (.xlsx, .xls, .csv) to high-fidelity PDF.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    job_id = enqueue_job(convert_with_libreoffice, str(input_path), "pdf")

    return {"success": True, "job_id": job_id, "status": "queued"}



@app.post("/api/convert/pdf-to-powerpoint")
@limiter.limit("30/minute")
async def api_pdf_to_powerpoint(
    request: Request, file_id: str = Form(...), filename: str = Form(...)
):
    """
    Queue a job to convert PDF to PowerPoint slides.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    job_id = enqueue_job(convert_pdf_to_powerpoint, str(input_path))

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/pdf-to-pdfa")
@limiter.limit("30/minute")
async def api_pdf_to_pdfa(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to convert PDF to ISO-compliant PDF/A.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    job_id = enqueue_job(convert_pdf_to_pdfa, str(input_path))

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/security/redact")
@limiter.limit("30/minute")
async def api_redact_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    redactions_json: str = Form(...),
    sanitize_metadata: bool = Form(False),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to apply coordinate-based secure redactions & metadata sanitization to PDF.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    try:
        redactions = json.loads(redactions_json)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Invalid JSON format for redactions_json"
        )

    job_id = enqueue_job(redact_pdf, str(input_path), redactions, sanitize_metadata)

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/repair-pdf")
@app.post("/api/convert/repair-pdf")
@limiter.limit("10/minute")
async def api_repair_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    mode: str = Form("standard"),
    strip_corrupt_metadata: bool = Form(True),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to repair a damaged or corrupted PDF structure.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    job_id = enqueue_job(repair_pdf, str(input_path), mode, strip_corrupt_metadata)

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/ocr-pdf")
@limiter.limit("30/minute")
async def api_ocr_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    language: str = Form("eng"),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to perform server-side OCR on a PDF file.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    job_id = enqueue_job(run_ocr_on_pdf, str(input_path), language)

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/compress-pdf")
@limiter.limit("30/minute")
async def api_compress_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    quality: float = Form(0.6),
    target_size_bytes: Optional[int] = Form(None),
    rasterize_fallback: bool = Form(False),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to perform PDF compression (Ghostscript, PyMuPDF, pikepdf, or compact rasterizer).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    job_id = enqueue_job(
        compress_pdf,
        str(input_path),
        quality,
        target_size_bytes,
        rasterize_fallback,
    )

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/url-to-pdf")
@limiter.limit("30/minute")
async def api_url_to_pdf(
    request: Request,
    url: str = Form(...),
    format: str = Form("A4"),
    landscape: str = Form("false"),
    print_background: str = Form("true"),
    margin_type: str = Form("default"),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to convert an online website URL link to a PDF.
    """
    is_landscape = landscape.lower() == "true"
    is_print_bg = print_background.lower() == "true"

    job_id = enqueue_job(
        convert_url_to_pdf, url, format, is_landscape, is_print_bg, margin_type
    )

    return {"success": True, "job_id": job_id, "status": "queued"}


class HtmlToPdfRequest(BaseModel):
    html: str
    filename: Optional[str] = "document.pdf"
    options: Optional[Dict[str, Any]] = None


@app.post("/api/convert/html-to-pdf")
async def convert_html_to_pdf_endpoint(payload: HtmlToPdfRequest):
    """
    Dedicated endpoint to convert raw HTML (with CSS and print layouts) directly to PDF.
    Returns binary PDF stream with attachment filename for direct download or preview.
    """
    if not payload.html or not payload.html.strip():
        raise HTTPException(status_code=400, detail="HTML content cannot be empty")

    try:
        pdf_bytes = await convert_html_to_pdf(payload.html, options=payload.options)
    except Exception as e:
        logger.error(f"[HTML_TO_PDF_ENDPOINT] Conversion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"HTML to PDF conversion failed: {e!s}"
        )

    filename = payload.filename if payload.filename else "document.pdf"
    if not filename.endswith(".pdf"):
        filename = f"{filename}.pdf"

    safe_filename = re.sub(r'[\r\n"\\/]', '_', filename)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"'
        },
    )


@app.post("/api/convert/split-pdf")
@limiter.limit("30/minute")
async def api_split_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    mode: str = Form("all"),
    range: str = Form(""),
    extra_params: str = Form("{}"),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a job to perform high-speed server-side PDF splitting (pikepdf).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    job_id = enqueue_job(split_pdf, str(input_path), mode, range, extra_params)

    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/merge-pdf")
@limiter.limit("30/minute")
async def api_merge_pdf(
    request: Request,
    files_json: Optional[str] = Form(None),
    file_ids: Optional[str] = Form(None),
    filenames: Optional[str] = Form(None),
    file_id: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side PDF merge job (PyMuPDF).
    """
    paths = []
    if files_json:
        try:
            items = json.loads(files_json)
            for it in items:
                f_id = it.get("file_id") or it.get("fileId")
                f_name = it.get("filename") or it.get("fileName")
                if f_id and f_name:
                    p = config.UPLOAD_DIR / f_id / f_name
                    if p.exists():
                        paths.append(str(p))
        except Exception:
            pass

    if not paths and file_ids and filenames:
        try:
            f_ids = json.loads(file_ids) if file_ids.startswith("[") else [x.strip() for x in file_ids.split(",")]
            f_names = json.loads(filenames) if filenames.startswith("[") else [x.strip() for x in filenames.split(",")]
            for f_id, f_name in zip(f_ids, f_names):
                p = config.UPLOAD_DIR / f_id / f_name
                if p.exists():
                    paths.append(str(p))
        except Exception:
            pass

    if not paths and file_id and filename:
        p = config.UPLOAD_DIR / file_id / filename
        if p.exists():
            paths.append(str(p))

    if not paths:
        raise HTTPException(status_code=400, detail="No valid input files found for merging.")

    job_id = enqueue_job(merge_pdfs, paths)
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/rotate-pdf")
@limiter.limit("30/minute")
async def api_rotate_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    angle: int = Form(90),
    pages: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side PDF rotation job (PyMuPDF).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    parsed_pages = None
    if pages:
        try:
            if pages.startswith("["):
                parsed_pages = [int(x) for x in json.loads(pages)]
            else:
                parsed_pages = [int(x.strip()) for x in pages.split(",") if x.strip().isdigit()]
        except Exception:
            parsed_pages = None

    job_id = enqueue_job(rotate_pdf, str(input_path), angle, parsed_pages)
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/crop-pdf")
@limiter.limit("30/minute")
async def api_crop_pdf(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    crop_boxes: Optional[str] = Form(None),
    margin_top: float = Form(0.0),
    margin_bottom: float = Form(0.0),
    margin_left: float = Form(0.0),
    margin_right: float = Form(0.0),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side PDF cropping job (PyMuPDF).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    parsed_boxes = None
    if crop_boxes:
        try:
            parsed_boxes = json.loads(crop_boxes)
        except Exception:
            parsed_boxes = None

    job_id = enqueue_job(
        crop_pdf,
        str(input_path),
        parsed_boxes,
        margin_top,
        margin_bottom,
        margin_left,
        margin_right,
    )
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/add-watermark")
@limiter.limit("30/minute")
async def api_add_watermark(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    watermark_type: str = Form("text"),
    text: str = Form("CONFIDENTIAL"),
    color: str = Form("#FF0000"),
    opacity: float = Form(0.25),
    font_size: float = Form(36.0),
    rotation: float = Form(45.0),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side PDF watermark job (PyMuPDF).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    job_id = enqueue_job(
        add_watermark,
        str(input_path),
        watermark_type,
        text,
        color,
        opacity,
        font_size,
        rotation,
    )
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/add-page-numbers")
@limiter.limit("30/minute")
async def api_add_page_numbers(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    format_str: str = Form("Page {page} of {total}"),
    position: str = Form("bottom-center"),
    font_size: float = Form(10.0),
    start_page: int = Form(1),
    margin: float = Form(36.0),
    color: str = Form("#4A5568"),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side PDF page numbering job (PyMuPDF).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    job_id = enqueue_job(
        add_page_numbers,
        str(input_path),
        format_str,
        position,
        font_size,
        start_page,
        margin,
        color,
    )
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/pdf-to-image")
@limiter.limit("30/minute")
async def api_pdf_to_image(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    dpi: int = Form(150),
    format: str = Form("png"),
    pages: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side PDF to image rendering job (PyMuPDF).
    Destroys pixmaps per-page to prevent client-side browser RAM exhaustion.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    parsed_pages = None
    if pages:
        try:
            if pages.startswith("["):
                parsed_pages = [int(x) for x in json.loads(pages)]
            else:
                parsed_pages = [int(x.strip()) for x in pages.split(",") if x.strip().isdigit()]
        except Exception:
            parsed_pages = None

    job_id = enqueue_job(pdf_to_images, str(input_path), dpi, format, parsed_pages)
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/extract-pages")
@limiter.limit("30/minute")
async def api_extract_pages(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    pages: str = Form(...),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side page extraction job (PyMuPDF).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    parsed_pages = []
    try:
        if pages.startswith("["):
            parsed_pages = [int(x) for x in json.loads(pages)]
        else:
            parsed_pages = [int(x.strip()) for x in pages.split(",") if x.strip().isdigit()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid pages format. Expected list of integers.")

    job_id = enqueue_job(extract_pages, str(input_path), parsed_pages)
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/remove-pages")
@limiter.limit("30/minute")
async def api_remove_pages(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    pages: str = Form(...),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side page deletion job (PyMuPDF).
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")

    parsed_pages = []
    try:
        if pages.startswith("["):
            parsed_pages = [int(x) for x in json.loads(pages)]
        else:
            parsed_pages = [int(x.strip()) for x in pages.split(",") if x.strip().isdigit()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid pages format. Expected list of integers.")

    job_id = enqueue_job(remove_pages, str(input_path), parsed_pages)
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/image-to-pdf")
@limiter.limit("30/minute")
async def api_image_to_pdf(
    request: Request,
    files_json: Optional[str] = Form(None),
    file_id: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Queue a high-performance server-side Image to PDF conversion job (PyMuPDF).
    """
    paths = []
    if files_json:
        try:
            items = json.loads(files_json)
            for it in items:
                f_id = it.get("file_id") or it.get("fileId")
                f_name = it.get("filename") or it.get("fileName")
                if f_id and f_name:
                    p = config.UPLOAD_DIR / f_id / f_name
                    if p.exists():
                        paths.append(str(p))
        except Exception:
            pass

    if not paths and file_id and filename:
        p = config.UPLOAD_DIR / file_id / filename
        if p.exists():
            paths.append(str(p))

    if not paths:
        raise HTTPException(status_code=400, detail="No valid image files found.")

    job_id = enqueue_job(image_to_pdf, paths)
    return {"success": True, "job_id": job_id, "status": "queued"}


@app.post("/api/convert/ocr-image")
@limiter.limit("30/minute")
async def api_ocr_image(
    request: Request,
    file_id: str = Form(...),
    filename: str = Form(...),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Perform high-fidelity server-side OCR on an uploaded image.
    """
    upload_folder = config.UPLOAD_DIR / file_id
    input_path = upload_folder / filename

    if not input_path.exists():
        raise HTTPException(
            status_code=404, detail="Uploaded file not found or expired"
        )

    try:
        from backend.services.ocr_engine import RobustOCREngine

        engine = RobustOCREngine()
        # Default to paddleocr for high quality structure and layout preservation
        result = engine.process(str(input_path), engine_name="paddleocr")
        return result
    except Exception as e:
        logger.exception("OCR Image processing failed")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {e!s}")
    finally:
        try:
            from backend.services.ocr import teardown_ocr_engine
            teardown_ocr_engine()
        except Exception:
            pass


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
@app.post("/api/auth/register")
@limiter.limit("3/minute")
def signup(request: Request, payload: AuthSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        raise HTTPException(
            status_code=400, detail="An account with this email already exists."
        )

    from backend.config import IS_DESKTOP_MODE, IS_PACKAGED

    tier_val = "pro" if (IS_DESKTOP_MODE or IS_PACKAGED) else "free"

    new_user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        password_hash=hash_password(payload.password),
        tier=tier_val,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"user_id": new_user.id, "email": new_user.email})
    return {"access_token": token, "token_type": "bearer", "tier": new_user.tier}


@app.post("/api/auth/login")
@limiter.limit("30/minute")
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
                tier="pro",
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


@app.post("/api/auth/refresh")
def refresh_token(current_user: User = Depends(get_current_user)):
    """
    Refreshes the user's access token, extending session lifetime without requiring re-login.
    """
    token = create_access_token({"user_id": current_user.id, "email": current_user.email})
    return {"access_token": token, "token_type": "bearer", "tier": current_user.tier}


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "tier": current_user.tier,
    }


class UpgradeProRequest(BaseModel):
    license_key: Optional[str] = None


@app.post("/api/auth/upgrade-pro")
@app.post("/api/billing/activate-beta")
def upgrade_to_pro(
    payload: Optional[UpgradeProRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently updates current_user.tier to 'pro' in the SQLite database.
    Persists across logouts, server restarts, and cross-device logins.
    """
    current_user.tier = "pro"
    db.commit()
    db.refresh(current_user)
    return {
        "success": True,
        "tier": current_user.tier,
        "email": current_user.email,
        "message": "User successfully upgraded to Pro tier in database.",
    }


@app.delete("/api/auth/delete-account")
def delete_account(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Completely deletes the user account, billing settings, and history to comply with GDPR.
    """
    # Delete job history and subscriptions associated with user to prevent FK violations
    db.query(JobHistory).filter(JobHistory.user_id == current_user.id).delete()
    db.query(Subscription).filter(Subscription.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"success": True, "message": "Your account has been permanently deleted."}


@app.get("/api/bootstrap/status")
async def get_bootstrap_status():
    """Returns status of whether portable dependencies are installed."""
    return {
        "installed": True,
        "status": "ready",
        "step": "Ready",
        "percent": 100,
        "speed_mb": 0.0,
        "error": None,
    }


@app.post("/api/bootstrap/install")
async def trigger_bootstrap_install():
    """Triggers the background download and installation of dependencies."""
    started = start_install_dependencies()
    return {"started": started}


# --- Production Static Files & SPA Routing ---
dist_dir = Path(__file__).resolve().parent.parent / "dist"
if dist_dir.exists():
    from fastapi.staticfiles import StaticFiles

    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_root():
        index_file = dist_dir / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        return {"status": "DocScalar API is running"}

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path in ("docs", "openapi.json", "redoc"):
            raise HTTPException(status_code=404, detail="Not Found")
        target = dist_dir / full_path
        if target.is_file():
            return FileResponse(target)
        index_file = dist_dir / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build missing")


if __name__ == "__main__":
    # Pass the app object directly to uvicorn to avoid import resolution issues in packaged PyInstaller envs
    uvicorn.run(app, host=config.HOST, port=config.PORT, reload=False)
