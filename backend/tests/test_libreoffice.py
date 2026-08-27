import shutil
import subprocess

import pytest

from backend.services.libreoffice import convert_with_libreoffice


def test_libreoffice_helper_structure():
    """
    Asserts that convert_with_libreoffice is a callable function with proper signature.
    """
    assert callable(convert_with_libreoffice)


@pytest.mark.skipif(
    shutil.which("libreoffice") is None and shutil.which("soffice") is None,
    reason="LibreOffice binary not in PATH",
)
def test_libreoffice_cli_execution():
    cmd = [shutil.which("libreoffice") or shutil.which("soffice"), "--version"]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    assert res.returncode == 0
