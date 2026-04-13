from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.v1.auth.schemas import (
    CreateUserRequest,
    EmailChangeRequest,
    LoginRequest,
    MagicLinkResponse,
    SuccessResponse,
    UpdateStatusRequest,
    UserListResponse,
    UserResponse,
)
from app.api.v1.auth.service import AuthService
from app.core.audit import log_event
from app.core.rate_limit import login_rate_limiter
from app.db.models.audit_log import AuditEvent
from app.db.models.user import UserState
from app.db.session import get_db
from app.dependencies import CurrentUser, get_auth_service, get_current_user, require_superadmin
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# ---------------------------------------------------------------------------
# Endpoints de usuarios (SUPERADMIN)
# ---------------------------------------------------------------------------

@router.post("/users", response_model=SuccessResponse)
async def create_user(
    body: CreateUserRequest,
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        user, magic_link = await service.create_user(
            full_name=body.full_name,
            email=body.email,
            role=body.role,
            organization=body.organization,
        )
        await log_event(db, AuditEvent.USER_CREATED, user_id=user.user_id)
        return SuccessResponse(
            message="User created",
            data={"user": UserResponse.model_validate(user), "_mock_magic_link": magic_link},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/users", response_model=SuccessResponse)
async def list_users(
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
    state: str | None = None,
    role: str | None = None,
    page: int = 1,
    limit: int = 20,
):
    users, total = await service.list_users(state=state, role=role, page=page, limit=limit)
    return SuccessResponse(
        message="Users retrieved",
        data=UserListResponse(users=[UserResponse.model_validate(u) for u in users], total=total),
    )


@router.patch("/users/{user_id}/status", response_model=SuccessResponse)
async def update_user_status(
    user_id: uuid.UUID,
    body: UpdateStatusRequest,
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        user = await service.update_user_state(user_id, body.state)
        event = (
            AuditEvent.USER_DISABLED
            if body.state == UserState.DISABLED
            else AuditEvent.USER_DELETED
        )
        await log_event(db, event, user_id=user_id)
        return SuccessResponse(message="User status updated", data=UserResponse.model_validate(user))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ---------------------------------------------------------------------------
# Endpoints de autenticación
# ---------------------------------------------------------------------------

@router.get("/auth/activate/{token}", response_model=SuccessResponse)
async def activate_user(
    token: str,
    service: Annotated[AuthService, Depends(get_auth_service)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        user = await service.consume_magic_link(token)
        await log_event(db, AuditEvent.USER_ACTIVATED, user_id=user.user_id)
        return SuccessResponse(message="User activated", data=UserResponse.model_validate(user))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/auth/login", response_model=SuccessResponse)
async def login(
    request: Request,
    body: LoginRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    ip = request.client.host

    # Tarea 2.2 — si la IP está bloqueada devolvemos 401 genérico (nunca 429)
    if await login_rate_limiter.is_blocked(ip):
        await log_event(db, AuditEvent.RATE_LIMIT_ACTIVATED, ip=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    try:
        user, token = await service.login(body.email)
        # Login exitoso: limpiar contador de fallos
        await login_rate_limiter.record_success(ip)
        await log_event(db, AuditEvent.LOGIN, user_id=user.user_id, ip=ip)
        return SuccessResponse(message="Login successful", data={"access_token": token})
    except ValueError as e:
        await log_event(db, AuditEvent.LOGIN_FAILED, ip=ip, details=str(e))
        # Registrar fallo; si se alcanza el límite, activar bloqueo
        block_triggered = await login_rate_limiter.record_failure(ip)
        if block_triggered:
            await log_event(db, AuditEvent.RATE_LIMIT_ACTIVATED, ip=ip)
        # Siempre 401 genérico para no revelar si el usuario existe
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


@router.post("/auth/logout", response_model=SuccessResponse)
async def logout(
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[AuthService, Depends(get_auth_service)],
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials=Depends(__import__("fastapi.security", fromlist=["HTTPBearer"]).HTTPBearer()),
):
    from app.core.security import decode_jwt
    from datetime import datetime

    payload = decode_jwt(credentials.credentials)
    jti = uuid.UUID(payload["jti"])
    expires_at = datetime.fromtimestamp(payload["exp"])

    await service.logout(jti, expires_at)
    await log_event(db, AuditEvent.LOGOUT, user_id=current_user.user_id, ip=request.client.host)
    return SuccessResponse(message="Logged out successfully")


@router.get("/users/me", response_model=SuccessResponse)
async def get_me(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    user = await service.get_user(current_user.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return SuccessResponse(message="User retrieved", data=UserResponse.model_validate(user))


# ---------------------------------------------------------------------------
# Tarea 1.2: Regenerar Magic Link  (implementado por Integrante 1 — referencia)
# ---------------------------------------------------------------------------

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
            data=MagicLinkResponse(_mock_magic_link=magic_link),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ---------------------------------------------------------------------------
# Tarea 1.3: Cambio de correo  (implementado por Integrante 1 — referencia)
# ---------------------------------------------------------------------------

@router.patch("/users/{user_id}/email", response_model=SuccessResponse)
async def change_email(
    user_id: uuid.UUID,
    body: EmailChangeRequest,
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        user = await service.change_email(user_id, body.new_email)
        await log_event(db, AuditEvent.EMAIL_CHANGED, user_id=user_id)
        return SuccessResponse(message="Email updated", data=UserResponse.model_validate(user))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
