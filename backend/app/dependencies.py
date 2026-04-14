from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth.repository import (
    MagicLinkRepository,
    RevokedTokenRepository,
    UserRepository,
)
from app.api.v1.auth.service import AuthService
from app.core.security import decode_access_token
from app.db.models import Role, User, UserState
from app.db.session import get_db


class CurrentUser:
    def __init__(
        self,
        user_id: uuid.UUID,
        email: str,
        role: Role,
        jti: uuid.UUID,
    ):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.jti = jti


async def get_current_user(
    authorization: str = Depends(lambda: None),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = authorization.replace("Bearer ", "")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user_id = uuid.UUID(payload["sub"])
    email = payload["email"]
    role = Role(payload["role"])
    jti = uuid.UUID(payload["jti"])

    user_repo = UserRepository(db)
    user = await user_repo.get_by_user_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.state != UserState.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not active",
        )

    return CurrentUser(user_id=user_id, email=email, role=role, jti=jti)


async def require_superadmin(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if current_user.role != Role.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin required",
        )
    return current_user


async def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)