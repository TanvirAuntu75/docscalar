import os
import re
import sys
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure root directory is in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from backend.database import init_db
from backend.main import app


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as test_client:
        yield test_client


def test_unicode_filename_sanitization():
    """Verify backend sanitization regex preserves Unicode and spaces safely."""
    test_cases = [
        ("rapport_financier_été_2024.pdf", "rapport_financier_été_2024.pdf"),
        ("Geschäftsbericht_München.pdf", "Geschäftsbericht_München.pdf"),
        ("año_2024_diseño.pdf", "año_2024_diseño.pdf"),
        ("تقرير_مالي.pdf", "تقرير_مالي.pdf"),
        ("财务报表_2024.pdf", "财务报表_2024.pdf"),
        ("Annual Report - Q3 2024.pdf", "Annual Report - Q3 2024.pdf"),
        ("exploit\0file.pdf", "exploit_file.pdf"),
        ("file\r\ninjection.pdf", "file__injection.pdf"),
        ("   ", "document.pdf"),
    ]

    for raw_name, expected in test_cases:
        sanitized = re.sub(r'[\r\n"\\/\0\x00-\x1f]', "_", raw_name).strip() or "document.pdf"
        assert sanitized == expected, f"Failed for {raw_name}: got {sanitized}, expected {expected}"


def test_auth_refresh_endpoint(client):
    """Verify /api/auth/refresh returns fresh access token for authenticated user."""
    # 1. Test unauthenticated request fails with 401
    res_unauth = client.post("/api/auth/refresh")
    assert res_unauth.status_code == 401

    # 2. Register a new test user via API
    email = f"test_refresh_{uuid.uuid4().hex[:6]}@docscalar.internal"
    res_reg = client.post("/api/auth/register", json={"email": email, "password": "SecurePassword123!"})
    assert res_reg.status_code == 200
    token = res_reg.json()["access_token"]

    # 3. Test authenticated request with valid token succeeds
    headers = {"Authorization": f"Bearer {token}"}
    res_auth = client.post("/api/auth/refresh", headers=headers)
    assert res_auth.status_code == 200
    data = res_auth.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "tier" in data
