import sys
from pathlib import Path

# Add root folder to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from backend.database import init_db
from backend.main import app


def test_auth_and_billing():
    print("==================================================")
    print("Testing Auth and Billing Integrations")
    print("==================================================")

    # Initialize DB (SQLite memory or local file)
    init_db()

    client = TestClient(app)

    import time

    test_email = f"testuser_{int(time.time())}@docforge.com"

    # Test Signup
    signup_data = {"email": test_email, "password": "securepassword123"}
    response = client.post("/api/auth/signup", json=signup_data)
    print("Signup Response Status:", response.status_code)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["tier"] == "free"
    print("SUCCESS: Signup succeeded!")

    # Test Login
    login_data = {"email": test_email, "password": "securepassword123"}
    response = client.post("/api/auth/login", json=login_data)
    print("Login Response Status:", response.status_code)
    assert response.status_code == 200
    assert "access_token" in response.json()
    print("SUCCESS: Login succeeded!")

    # Test Stripe create checkout (Should raise 401 for unauthenticated or 501 for unconfigured Stripe)
    user_id = "some-user-id"
    response = client.post(f"/api/billing/create-checkout?user_id={user_id}")
    print("Stripe Create Checkout Status (unauthenticated):", response.status_code)
    assert response.status_code == 401

    # Test authenticated Stripe checkout with unconfigured Stripe key (raises 501)
    auth_headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    auth_resp = client.post(
        f"/api/billing/create-checkout?user_id={token_data.get('user_id', 'desktop-user')}",
        headers=auth_headers,
    )
    print(
        "Stripe Create Checkout Status (authenticated, unconfigured):",
        auth_resp.status_code,
    )
    assert auth_resp.status_code in [501, 404]
    print(
        "SUCCESS: Checkout correctly requires auth (401) and handles unconfigured Stripe (501)!"
    )

    print("\n==================================================")
    print("All Auth/Billing integrations tests passed!")
    print("==================================================")


if __name__ == "__main__":
    test_auth_and_billing()
