import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.config import DB_DIR
from backend.database import User, get_db


def _get_or_create_secret_key() -> str:
    env_secret = os.getenv("SECRET_KEY")
    if env_secret:
        return env_secret

    secret_file = DB_DIR / ".jwt_secret"
    if secret_file.exists():
        try:
            return secret_file.read_text(encoding="utf-8").strip()
        except Exception:
            pass

    generated_secret = secrets.token_hex(32)
    try:
        DB_DIR.mkdir(parents=True, exist_ok=True)
        secret_file.write_text(generated_secret, encoding="utf-8")
    except Exception:
        pass
    return generated_secret


SECRET_KEY = _get_or_create_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 Hours token expiration

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    from backend.config import IS_DESKTOP_MODE, IS_PACKAGED

    if IS_DESKTOP_MODE or IS_PACKAGED:
        local_user = (
            db.query(User).filter(User.email == "local@docforge.internal").first()
        )
        if not local_user:
            local_user = User(
                id="desktop-local-user-id",
                email="local@docforge.internal",
                password_hash="local-dummy",
                tier="pro",
            )
            try:
                db.add(local_user)
                db.commit()
                db.refresh(local_user)
            except Exception:
                db.rollback()
                local_user = (
                    db.query(User)
                    .filter(User.email == "local@docforge.internal")
                    .first()
                )
        return local_user

    if not credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("user_id")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    user = get_current_user_optional(credentials, db)
    if not user:
        raise HTTPException(
            status_code=401, detail="Invalid or expired authentication credentials."
        )
    return user
