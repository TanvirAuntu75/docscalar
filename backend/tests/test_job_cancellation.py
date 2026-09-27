import time
import unittest
from backend.jobs.queue import (
    cancel_job,
    enqueue_job,
    get_job_status,
    in_memory_jobs,
    in_memory_jobs_lock,
    is_job_cancelled,
)


class TestJobCancellation(unittest.TestCase):
    def test_cancel_nonexistent_job(self):
        result = cancel_job("non-existent-uuid-12345")
        self.assertFalse(result)

    def test_cancel_active_job(self):
        def long_running_task():
            for _ in range(50):
                if is_job_cancelled():
                    return {"aborted": True}
                time.sleep(0.05)
            return {"finished": True}

        job_id = enqueue_job(long_running_task)
        self.assertIsNotNone(job_id)

        # Allow worker to start
        time.sleep(0.02)

        # Cancel job
        cancelled = cancel_job(job_id)
        self.assertTrue(cancelled)

        # Verify is_job_cancelled returns True
        self.assertTrue(is_job_cancelled(job_id))

        # Verify status in queue is cancelled
        status_info = get_job_status(job_id)
        self.assertEqual(status_info.get("status"), "cancelled")
        self.assertIn("cancelled", status_info.get("error", "").lower())

    def test_job_cancelled_in_queue_before_running(self):
        # Manually create a queued job and cancel it before run_task can proceed
        fake_id = "test-pre-cancel-id"
        with in_memory_jobs_lock:
            in_memory_jobs[fake_id] = {
                "status": "cancelled",
                "progress": 0,
                "result": None,
                "error": "Cancelled before start",
                "created_at": time.time(),
            }

        self.assertTrue(is_job_cancelled(fake_id))
        status_info = get_job_status(fake_id)
        self.assertEqual(status_info.get("status"), "cancelled")


if __name__ == "__main__":
    unittest.main()
