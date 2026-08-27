import asyncio
from concurrent.futures import ThreadPoolExecutor

import pytest
from httpx import ASGITransport, AsyncClient

from backend.auth import create_access_token
from backend.database import Base, SessionLocal, User, engine, init_db
from backend.main import app


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()
    Base.metadata.create_all(bind=engine)
    yield


def test_concurrent_user_auth_requests():
    """
    Asserts that 10 simultaneous requests to /api/auth/me
    execute cleanly without SQLite locking collisions.
    """
    # Create test user and token
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "stress@docforge.internal").first()
        if not user:
            user = User(
                id="stress-user-id",
                email="stress@docforge.internal",
                password_hash="dummy_hash",
                tier="pro",
            )
            db.add(user)
            db.commit()
    finally:
        db.close()

    token = create_access_token(
        {"user_id": "stress-user-id", "email": "stress@docforge.internal"}
    )
    headers = {"Authorization": f"Bearer {token}"}

    async def _run_concurrent():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            tasks = [client.get("/api/auth/me", headers=headers) for _ in range(10)]
            return await asyncio.gather(*tasks, return_exceptions=True)

    responses = asyncio.run(_run_concurrent())

    for idx, resp in enumerate(responses):
        assert not isinstance(resp, Exception), (
            f"Request {idx} failed with exception: {resp}"
        )
        assert resp.status_code == 200, (
            f"Request {idx} returned status {resp.status_code}: {resp.text}"
        )
        data = resp.json()
        assert data.get("email") == "stress@docforge.internal"


def test_ocr_thread_safety_mutex():
    """
    Asserts that multithreaded tasks acquire backend.services.ocr.engine_lock
    and share the singleton RobustOCREngine instance without deadlocking or race conditions.
    """
    from backend.services.ocr import engine_lock, get_ocr_engine

    results = []

    def concurrent_ocr_worker(worker_id):
        engine = get_ocr_engine()
        with engine_lock:
            # Simulate synchronized access to shared neural session
            results.append((worker_id, id(engine)))

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(concurrent_ocr_worker, i) for i in range(12)]
        for f in futures:
            f.result()

    assert len(results) == 12
    # Verify all threads shared the exact same singleton instance ID
    engine_ids = {item[1] for item in results}
    assert len(engine_ids) == 1
