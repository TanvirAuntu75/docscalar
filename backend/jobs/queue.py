import asyncio
import inspect
import socket
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from redis import Redis
from rq import Queue

from backend import config


# Check if Redis port is open before initializing the Redis client to prevent hangs
def is_redis_available(host, port, timeout=1.0):
    try:
        # try to connect to the port
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


# Standard Redis client
try:
    if not is_redis_available(config.REDIS_HOST, config.REDIS_PORT, timeout=1.0):
        raise ConnectionError("Redis port is not reachable.")

    redis_conn = Redis(
        host=config.REDIS_HOST, port=config.REDIS_PORT, socket_connect_timeout=2
    )
    # Ping to verify active connection
    redis_conn.ping()
    # Use RQ Queue
    task_queue = Queue("docforge_conversions", connection=redis_conn)
    USE_REDIS = True
    print("Background Job Queue: Connected to Redis successfully.")
except Exception:
    USE_REDIS = False
    task_queue = None
    # ThreadPool fallback for development (multi-worker parallel processing)
    thread_pool = ThreadPoolExecutor(max_workers=3)
    # Simple in-memory database to store job status
    in_memory_jobs = {}
    in_memory_jobs_lock = threading.Lock()
    print(
        "Background Job Queue: Redis not available. Falling back to local in-memory ThreadPool queue."
    )


def run_sync_or_async(func, *args, **kwargs):
    """
    Executes a function synchronously, safely running an event loop if it is a coroutine.
    """
    if inspect.iscoroutinefunction(func):
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(asyncio.run, func(*args, **kwargs)).result()
        else:
            return asyncio.run(func(*args, **kwargs))
    return func(*args, **kwargs)


_current_job_state = threading.local()


def evict_expired_in_memory_jobs(max_age_seconds: int = 3600):
    """Prune completed/failed/stale jobs from in_memory_jobs dictionary."""
    if not USE_REDIS:
        now = time.time()
        with in_memory_jobs_lock:
            to_delete = [
                jid
                for jid, info in in_memory_jobs.items()
                if now - info.get("created_at", now) > max_age_seconds
            ]
            for jid in to_delete:
                del in_memory_jobs[jid]


# Unified job management wrapper
def enqueue_job(func, *args, **kwargs):
    """
    Enqueue a background job using Redis+RQ (production) or ThreadPool (fallback).
    """
    job_id = str(uuid.uuid4())

    if USE_REDIS:
        # In RQ, we pass run_sync_or_async as the job target, and the actual function + args as parameters
        job = task_queue.enqueue(
            run_sync_or_async, func, *args, **kwargs, job_id=job_id, result_ttl=3600
        )
        return job.id
    else:
        # Fallback tracking
        with in_memory_jobs_lock:
            in_memory_jobs[job_id] = {
                "status": "queued",
                "progress": 0,
                "result": None,
                "error": None,
                "created_at": time.time(),
            }

        def run_task():
            _current_job_state.current_job_id = job_id
            with in_memory_jobs_lock:
                in_memory_jobs[job_id]["status"] = "started"
            try:
                # Execute the function via helper
                res = run_sync_or_async(func, *args, **kwargs)
                with in_memory_jobs_lock:
                    in_memory_jobs[job_id]["status"] = "finished"
                    in_memory_jobs[job_id]["result"] = res
            except Exception as e:
                with in_memory_jobs_lock:
                    in_memory_jobs[job_id]["status"] = "failed"
                    in_memory_jobs[job_id]["error"] = str(e)
            finally:
                if hasattr(_current_job_state, "current_job_id"):
                    del _current_job_state.current_job_id

        thread_pool.submit(run_task)
        return job_id


def update_job_progress(percent: int, message: str = None):
    """
    Update progress percentage and status message of the current background job.
    Supports both Redis/RQ and ThreadPool fallback.
    """
    # 1. Try RQ
    try:
        from rq import get_current_job

        job = get_current_job()
        if job:
            job.meta["progress"] = percent
            if message:
                job.meta["message"] = message
            job.save_meta()
            return
    except Exception:
        pass

    # 2. Try ThreadPool fallback
    try:
        if hasattr(_current_job_state, "current_job_id"):
            job_id = _current_job_state.current_job_id
            with in_memory_jobs_lock:
                if job_id in in_memory_jobs:
                    in_memory_jobs[job_id]["progress"] = percent
                    if message:
                        in_memory_jobs[job_id]["message"] = message
    except Exception:
        pass


def get_job_status(job_id: str):
    """
    Fetch job status, progress percentage, message, and result.
    """
    if USE_REDIS:
        try:
            from rq.job import Job

            job = Job.fetch(job_id, connection=redis_conn)
            return {
                "status": job.get_status(),  # 'queued', 'started', 'finished', 'failed'
                "progress": job.meta.get("progress", 0),
                "message": job.meta.get("message", ""),
                "result": job.result,
                "error": job.exc_info if job.is_failed else None,
            }
        except Exception as e:
            return {"status": "failed", "error": f"Job not found or Redis error: {e!s}"}
    else:
        with in_memory_jobs_lock:
            job = in_memory_jobs.get(job_id)
            if not job:
                return {"status": "failed", "error": "Job not found"}
            return dict(job)
