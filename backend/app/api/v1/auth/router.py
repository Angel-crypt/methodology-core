from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth.schemas import (
    EmailChangeRequest,
    LoginRequest,
    LogoutResponse,
    MagicLinkResponse,
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

router = APIRouter(prefix="/auth", tags=["auth"])


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
            user=UserResponse.model_validate(user),
            _mock_magic_link=magic_link,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/users", response_model=UserListResponse)
async def list_users(
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
    state: Optional[UserState] = Query(None),
    role: Optional[Role] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    users, total = await service.list_users(state=state, role=role, page=page, limit=limit)
    total_pages = (total + limit - 1) // limit
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        meta=UserListMeta(total=total, page=page, limit=limit, total_pages=total_pages),
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
        return UserStatusResponse(user_id=str(user.user_id), state=user.state)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/activate/{token}")
async def activate_with_magic_link(
    token: str,
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user = await service.consume_magic_link(token)
        return SuccessResponse(
            message="Account activated successfully",
            data={"user_id": str(user.user_id), "email": user.email},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user, token = await service.login(request.email)
        return TokenResponse(access_token=token, expires_in=6 * 3600)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    _: Annotated[AuthService, Depends(get_auth_service)],
):
    return LogoutResponse(message="Logged out successfully")


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    return UserResponse.model_validate(current_user)


@router.post("/users/{user_id}/regenerate-magic-link", response_model=SuccessResponse)
async def regenerate_magic_link(
    user_id: uuid.UUID,
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user, magic_link = await service.regenerate_magic_link(user_id)
        return SuccessResponse(
            message="Magic link regenerated",
            data={"_mock_magic_link": magic_link}
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/users/{user_id}/email", response_model=SuccessResponse)
async def change_user_email(
    user_id: uuid.UUID,
    request: EmailChangeRequest,
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user, magic_link = await service.change_email(user_id, request.new_email)
        return SuccessResponse(
            message="Email changed successfully",
            data={"_mock_magic_link": magic_link}
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))