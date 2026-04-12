from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from pathlib import Path

import jwt
from jwt.exceptions import InvalidTokenError

from app.config import settings


def _load_jwt_secret() -> str:
    secret_file = Path(settings.jwt_secret_file)
    if secret_file.exists():
        return secret_file.read_text(encoding="utf-8").strip()
    import os
    secret = os.environ.get("JWT_SECRET")
    if secret:
        return secret
    return "development-secret-do-not-use-in-production"


def create_access_token(user_id: str, role: str) -> tuple[str, datetime]:
    now = datetime.utcnow()
    exp = now + timedelta(seconds=settings.jwt_expire_seconds)
    jti = uuid.uuid4()

    payload = {
        "user_id": user_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": str(jti),
    }

    secret = _load_jwt_secret()
    token = jwt.encode(payload, secret, algorithm=settings.jwt_algorithm)
    return token, exp


def decode_access_token(token: str) -> dict:
    secret = _load_jwt_secret()
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": True},
        )
        return payload
    except InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")