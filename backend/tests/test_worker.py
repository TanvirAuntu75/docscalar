import shutil

import pytest

from backend.worker import run_worker


def test_worker_entrypoint():
    """
    Asserts that backend.worker has a valid callable run_worker entrypoint.
    """
    assert callable(run_worker)


@pytest.mark.skipif(shutil.which("rq") is None, reason="RQ CLI not installed/available")
def test_worker_rq_cli():
    import subprocess

    res = subprocess.run(["rq", "--version"], capture_output=True, text=True, timeout=5)
    assert res.returncode == 0
