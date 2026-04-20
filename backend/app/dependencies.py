from __future__ import annotations

import uuid
from collections.abc import Callable, Coroutine
from typing import Any

import redis.asyncio as aioredis
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.models.user import Role, User, UserState
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

_redis_pool: aioredis.Redis | None = None


async def get_redis_client() -> aioredis.Redis:  # type: ignore[misc]
    global _redis_pool
    if _redis_pool is None:
        from app.config import settings

        _redis_pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_pool


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Zero Trust authentication chain (every request validated independently):
    1. Decode JWT — 401 on invalid signature or expiry
    2. Check jti not in revoked_tokens — 401 if revoked (explicit logout)
    3. Load user from DB — 401 if not found
    4. token_version matches DB value — 401 if mismatch (global invalidation)
    5. pwd_changed_at consistent — 401 if token pre-dates a password change
    6. user.state not disabled/deleted — 403 with specific code
    """
    if token is None:
        raise UnauthorizedError("No autenticado")

    payload = decode_access_token(token)

    try:
        jti = uuid.UUID(str(payload.get("jti", "")))
        user_id = uuid.UUID(str(payload.get("sub", "")))
    except ValueError:
        raise UnauthorizedError("Token inválido")

    token_version = int(payload.get("token_version", -1))

    from app.api.v1.auth.repository import AuthRepository

    repo = AuthRepository(db)

    if await repo.is_token_revoked(jti):
        raise UnauthorizedError("Sesión revocada")

    user = await repo.get_user_by_id(user_id)
    if user is None:
        raise UnauthorizedError("Usuario no encontrado")

    if user.token_version != token_version:
        raise UnauthorizedError("Sesión inválida")

    pwd_changed_at = payload.get("pwd_changed_at")
    if pwd_changed_at is not None and user.password_changed_at is not None:
        if int(pwd_changed_at) < int(user.password_changed_at.timestamp()):
            raise UnauthorizedError("Sesión inválida — contraseña cambiada")

    if user.state == UserState.deleted:
        raise ForbiddenError("Cuenta eliminada")
    if user.state == UserState.disabled:
        raise ForbiddenError("Cuenta desactivada")

    return user


async def require_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Extends get_current_user: additionally blocks pending users."""
    if current_user.state != UserState.active:
        raise ForbiddenError("Cuenta no activa")
    return current_user


def require_role(*roles: Role) -> Callable[..., Coroutine[Any, Any, User]]:
    """
    Dependency factory for role-based access control.
    Usage: dependencies=[Depends(require_role(Role.superadmin))]
    """

    async def _check(current_user: User = Depends(require_active_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenError("Rol insuficiente para esta operación")
        return current_user

    return _check
