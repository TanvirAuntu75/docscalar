import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.jobs.queue import enqueue_job, get_job_status, update_job_progress
from backend.services.libreoffice import ConversionResult


def mock_worker_task(total_steps=4):
    print("Task started in background thread.")
    for i in range(1, total_steps + 1):
        time.sleep(0.2)
        pct = int((i / total_steps) * 100)
        msg = f"Processing step {i} of {total_steps} (testing message stream)..."
        update_job_progress(pct, msg)

    return ConversionResult(
        success=True, output_path="test_output.docx", file_size_bytes=1024
    )


def run_test():
    print("--- 1. Enqueueing background job ---")
    job_id = enqueue_job(mock_worker_task, total_steps=4)
    print(f"Job ID created: {job_id}")

    print("\n--- 2. Polling job status through get_job_status ---")
    completed = False
    status_info = {}
    for attempt in range(20):
        status_info = get_job_status(job_id)
        print(
            f"Poll #{attempt + 1}: status='{status_info.get('status')}', progress={status_info.get('progress')}%, message='{status_info.get('message')}'"
        )

        if status_info.get("status") == "finished":
            completed = True
            print("\nSUCCESS: Job finished!")
            print(f"Result: {status_info.get('result')}")
            break
        elif status_info.get("status") == "failed":
            print(f"\nFAILED: Job failed with error: {status_info.get('error')}")
            break

        time.sleep(0.25)

    assert completed, "Job did not complete in time"
    assert status_info.get("progress") == 100, (
        f"Expected 100% progress, got {status_info.get('progress')}"
    )
    print(
        "\nAll assertions passed! Background job status & message streaming is 100% functional."
    )


if __name__ == "__main__":
    run_test()
