import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from backend.auth import (
    _get_or_create_secret_key,
    create_access_token,
    decode_access_token,
)
from backend.database import (
    JobHistory,
    SessionLocal,
    Subscription,
    User,
    init_db,
)
from backend.services.security import (
    _decrypt_password_storage,
    _encrypt_password_storage,
)
from backend.services.url_to_pdf import is_safe_url


class TestBackendAuditFixes(unittest.TestCase):
    def test_ssrf_blocking(self):
        # 1. Test loopback
        safe, msg = is_safe_url("http://127.0.0.1:8000/admin")
        self.assertFalse(safe)
        self.assertIn("Security Error", msg)

        # 2. Test localhost
        safe, msg = is_safe_url("http://localhost:5173")
        self.assertFalse(safe)

        # 3. Test private IP range (RFC 1918)
        safe, msg = is_safe_url("http://192.168.1.1/router")
        self.assertFalse(safe)

        # 4. Test AWS metadata IP
        safe, msg = is_safe_url("http://169.254.169.254/latest/meta-data")
        self.assertFalse(safe)

        # 5. Test non-http protocols
        safe, msg = is_safe_url("file:///etc/passwd")
        self.assertFalse(safe)

    def test_password_storage_encryption(self):
        original_pwd = "SuperSecretPassword123!"
        encrypted = _encrypt_password_storage(original_pwd)
        self.assertTrue(encrypted.startswith("enc:"))
        self.assertNotEqual(encrypted, original_pwd)

        decrypted = _decrypt_password_storage(encrypted)
        self.assertEqual(decrypted, original_pwd)

        # Empty password
        self.assertEqual(_decrypt_password_storage(_encrypt_password_storage("")), "")

    def test_jwt_persistent_secret(self):
        secret = _get_or_create_secret_key()
        self.assertIsInstance(secret, str)
        self.assertGreater(len(secret), 10)

        # Encode and decode token
        payload = {"user_id": "test-user-123", "email": "test@docscalar.internal"}
        token = create_access_token(payload)
        decoded = decode_access_token(token)
        self.assertEqual(decoded["user_id"], "test-user-123")
        self.assertEqual(decoded["email"], "test@docscalar.internal")

    def test_database_cascades_and_account_deletion(self):
        init_db()
        db = SessionLocal()
        try:
            import uuid

            u_id = f"test-user-{uuid.uuid4().hex[:8]}"
            user = User(
                id=u_id,
                email=f"{u_id}@test.com",
                password_hash="dummy_hash",
                tier="pro",
            )
            db.add(user)

            sub = Subscription(
                user_id=u_id, stripe_customer_id=f"cus_{u_id}", status="active"
            )
            db.add(sub)

            job = JobHistory(
                id=f"job_{uuid.uuid4().hex[:8]}",
                user_id=u_id,
                tool_name="merge-pdf",
                status="finished",
            )
            db.add(job)
            db.commit()

            # Verify presence
            self.assertIsNotNone(db.query(User).filter(User.id == u_id).first())
            self.assertIsNotNone(
                db.query(Subscription).filter(Subscription.user_id == u_id).first()
            )
            self.assertIsNotNone(
                db.query(JobHistory).filter(JobHistory.user_id == u_id).first()
            )

            # Delete subscriptions & jobs then user (mirrors delete_account in main.py)
            db.query(JobHistory).filter(JobHistory.user_id == u_id).delete()
            db.query(Subscription).filter(Subscription.user_id == u_id).delete()
            db.delete(user)
            db.commit()

            # Verify clean deletion
            self.assertIsNone(db.query(User).filter(User.id == u_id).first())
            self.assertIsNone(
                db.query(Subscription).filter(Subscription.user_id == u_id).first()
            )
            self.assertIsNone(
                db.query(JobHistory).filter(JobHistory.user_id == u_id).first()
            )
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
