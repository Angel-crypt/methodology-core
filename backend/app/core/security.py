from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from pathlib import Path

import jwt
from jwt.exceptions import InvalidTokenError

from app.config import settings


def _load_jwt_secret() -> str:
    return settings.JWT_SECRET_KEY


def create_access_token(subject: str, email: str, role) -> str:
    jti = uuid.uuid4()
    exp = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)

    payload = {
        "sub": subject,
        "email": email,
        "role": role.value if hasattr(role, "value") else str(role),
        "jti": str(jti),
        "exp": exp.isoformat(),
        "iat": datetime.utcnow().isoformat(),
    }

    return jwt.encode(payload, _load_jwt_secret(), algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            _load_jwt_secret(),
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")