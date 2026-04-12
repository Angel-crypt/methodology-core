from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth.repository import RevokedTokenRepository
from app.api.v1.auth.service import AuthService
from app.core.security import decode_access_token
from app.db.models import Role, UserState
from app.db.session import get_db

security = HTTPBearer()


class CurrentUser:
    def __init__(self, user_id: uuid.UUID, role: Role, email: str, jti: str | None = None):
        self.user_id = user_id
        self.role = role
        self.email = email
        self.jti = jti


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user_id = payload.get("user_id")
    role = payload.get("role")
    jti = payload.get("jti")

    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Verificar si el token está revocado
    if jti:
        revoked_repo = RevokedTokenRepository(db)
        if await revoked_repo.exists(uuid.UUID(jti)):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
            )

    service = AuthService(db)
    user = await service.get_user(uuid.UUID(user_id))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.state != UserState.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not active",
        )

    return CurrentUser(user_id=user.user_id, role=user.role, email=user.email, jti=jti)


async def require_superadmin(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if current_user.role != Role.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin privileges required",
        )
    return current_user


async def get_auth_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthService:
    return AuthService(db)