from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import jwt

from app.config import settings
from app.core.exceptions import UnauthorizedError


def _get_jwt_secret() -> str:
    path = settings.jwt_secret_file
    if os.path.exists(path):
        return Path(path).read_text(encoding="utf-8").strip()
    return "dev-insecure-secret-DO-NOT-USE-IN-PRODUCTION"  # noqa: S105


def create_access_token(
    user_id: uuid.UUID,
    role: str,
    token_version: int,
    jti: uuid.UUID | None = None,
    pwd_changed_at: datetime | None = None,
) -> tuple[str, uuid.UUID, datetime]:
    """
    Creates a signed JWT.
    Returns (token_str, jti, expires_at).
    """
    if jti is None:
        jti = uuid.uuid4()

    now = datetime.now(tz=timezone.utc)
    expires_at = datetime.fromtimestamp(
        now.timestamp() + settings.jwt_expire_seconds, tz=timezone.utc
    )

    payload: dict[str, object] = {
        "sub": str(user_id),
        "role": role,
        "token_version": token_version,
        "jti": str(jti),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if pwd_changed_at is not None:
        payload["pwd_changed_at"] = int(pwd_changed_at.timestamp())

    token = jwt.encode(payload, _get_jwt_secret(), algorithm=settings.jwt_algorithm)
    return token, jti, expires_at


def decode_access_token(token: str) -> dict[str, object]:
    """
    Validates and decodes a JWT.
    Raises UnauthorizedError on any failure (expired, tampered, etc.).
    """
    try:
        payload: dict[str, object] = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Token expirado")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Token inválido")
