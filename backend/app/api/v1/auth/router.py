from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth.schemas import (
    LoginRequest,
    LogoutResponse,
    SuccessResponse,
    TokenResponse,
    UserCreateRequest,
    UserCreateResponse,
    UserListResponse,
    UserListMeta,
    UserResponse,
    UserStatusResponse,
    UserStatusUpdateRequest,
)
from app.api.v1.auth.service import AuthService
from app.db.models import Role, UserState
from app.db.session import get_db
from app.dependencies import CurrentUser, get_auth_service, get_current_user, require_superadmin

router = APIRouter()


@router.post("/users", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreateRequest,
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user, magic_link = await service.create_user(
            full_name=request.full_name,
            email=request.email,
            role=request.role,
            organization=request.organization,
        )
        return UserCreateResponse(
            user_id=str(user.user_id),
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            organization=user.organization,
            state=user.state,
            created_at=user.created_at,
            _mock_magic_link=magic_link,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/users", response_model=UserListResponse)
async def list_users(
    state: UserState | None = Query(None),
    role: Role | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    service: Annotated[AuthService, Depends(get_auth_service)] = Depends(get_auth_service),
    _: Annotated[CurrentUser, Depends(require_superadmin)] = Depends(require_superadmin),
):
    users, total = await service.list_users(state=state, role=role, page=page, limit=limit)
    pages = (total + limit - 1) // limit

    return UserListResponse(
        data=[
            UserResponse(
                user_id=str(u.user_id),
                full_name=u.full_name,
                email=u.email,
                role=u.role,
                organization=u.organization,
                state=u.state,
                created_at=u.created_at,
                broker_subject=u.broker_subject,
            )
            for u in users
        ],
        meta=UserListMeta(total=total, page=page, limit=limit, pages=pages),
    )


@router.patch("/users/{user_id}/status", response_model=UserStatusResponse)
async def update_user_status(
    user_id: uuid.UUID,
    request: UserStatusUpdateRequest,
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user = await service.update_user_state(user_id, request.state)
        return UserStatusResponse(
            user_id=str(user.user_id),
            email=user.email,
            state=user.state,
            updated_at=user.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@router.get("/auth/activate/{token}", status_code=status.HTTP_200_OK)
async def activate_with_magic_link(
    token: str,
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user = await service.consume_magic_link(token)
        return SuccessResponse(
            message="Account activated. Redirect to OIDC login.",
            data={"user_id": str(user.user_id), "email": user.email},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user, token = await service.login(request.email)
        return TokenResponse(
            access_token=token,
            token_type="Bearer",
            expires_in=21600,
            state=user.state.value,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )


@router.post("/auth/logout", response_model=LogoutResponse)
async def logout(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from datetime import timedelta
    
    if current_user.jti:
        from app.api.v1.auth.repository import RevokedTokenRepository
        revoked_repo = RevokedTokenRepository(db)
        # Usar la expiración del token (exp está en unix timestamp)
        exp_timestamp = datetime.utcnow().timestamp() + 21600
        expires_at = datetime.fromtimestamp(exp_timestamp)
        await revoked_repo.create(uuid.UUID(current_user.jti), expires_at)
    
    return LogoutResponse(message="Session closed")


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    user = await service.get_user(current_user.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserResponse(
        user_id=str(user.user_id),
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        organization=user.organization,
        state=user.state,
        created_at=user.created_at,
        broker_subject=user.broker_subject,
    )