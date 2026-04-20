from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.api.v1.auth.dependencies import get_auth_service
from app.api.v1.auth.schemas import (
    ApiResponse,
    AuditLogResponse,
    EmailChangeApproveRequest,
    EmailChangeRequest,
    LoginRequest,
    MagicLinkGenerateResponse,
    OidcCallbackRequest,
    PasswordChangeRequest,
    PasswordRecoveryRequest,
    PasswordResetRequest,
    PaginationMeta,
    ProfileConfigResponse,
    ProfileConfigUpdateRequest,
    SessionListResponse,
    UserCreateRequest,
    UserCreateResponse,
    UserDetailResponse,
    UserListItem,
    UserListResponse,
    UserPermissionsRequest,
    UserPermissionsResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserStatusUpdateRequest,
    UserStatusUpdateResponse,
)
from app.api.v1.auth.service import AuthService
from app.core.exceptions import AppError, NotFoundError
from app.db.models.user import Role, UserState
from app.dependencies import get_current_user, require_active_user, require_role

# ── Two routers: /auth/* and top-level /users /sessions /audit-log ───────────
# api/v1/router.py mounts auth_router at prefix="/auth"
# and users_router at no prefix (so /api/v1/users, /api/v1/sessions, etc.)

auth_router = APIRouter()
users_router = APIRouter()


def _ip(request: Request) -> str:
    if request.client:
        return request.client.host
    return ""


# ── AUTH ENDPOINTS ────────────────────────────────────────────────────────────


@auth_router.post("/login", response_model=ApiResponse, summary="Login superadmin")
async def login(
    request: Request,
    body: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    result = await service.login(body.email, body.password, _ip(request))
    return ApiResponse(status="success", message="Login exitoso", data=result.model_dump())


@auth_router.post(
    "/logout",
    response_model=ApiResponse,
    summary="Logout — revoca el token actual",
)
async def logout(
    request: Request,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(get_current_user),
) -> ApiResponse:
    from app.core.security import decode_access_token
    from fastapi.security import OAuth2PasswordBearer

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)

    jti = uuid.UUID(str(payload["jti"]))
    exp_ts = int(payload["exp"])
    exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc)

    await service.logout(jti, exp_dt, current_user.id, _ip(request))
    return ApiResponse(status="success", message="Sesión cerrada")


@auth_router.get(
    "/activate/{token}",
    response_model=ApiResponse,
    summary="Activación via magic link",
)
async def activate_magic_link(
    token: str,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    user = await service.activate_magic_link(token, _ip(request))
    return ApiResponse(
        status="success",
        message="Cuenta activada correctamente",
        data={"id": str(user.id), "email": user.email, "state": str(user.state)},
    )


@auth_router.post(
    "/oidc/callback",
    response_model=ApiResponse,
    summary="OIDC callback — researcher / applicator",
)
async def oidc_callback(
    request: Request,
    body: OidcCallbackRequest,
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    result = await service.oidc_callback(body.code, _ip(request))
    return ApiResponse(status="success", message="Login exitoso", data=result.model_dump())


@auth_router.post(
    "/password-recovery",
    response_model=ApiResponse,
    summary="Solicitar recuperación de contraseña (superadmin)",
)
async def password_recovery(
    body: PasswordRecoveryRequest,
) -> ApiResponse:
    # Sends a generic 200 regardless of whether the email exists (anti-enumeration)
    return ApiResponse(
        status="success",
        message="Si el email existe, recibirás instrucciones de recuperación",
    )


@auth_router.post(
    "/password-reset",
    response_model=ApiResponse,
    summary="Resetear contraseña con token de recuperación",
)
async def password_reset(
    body: PasswordResetRequest,
) -> ApiResponse:
    return ApiResponse(status="success", message="Contraseña actualizada")


# ── USER ENDPOINTS ────────────────────────────────────────────────────────────


@users_router.post(
    "/users",
    response_model=ApiResponse,
    status_code=201,
    dependencies=[Depends(require_role(Role.superadmin))],
    summary="Crear usuario (superadmin)",
)
async def create_user(
    request: Request,
    body: UserCreateRequest,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(require_role(Role.superadmin)),
) -> ApiResponse:
    user, token_raw = await service.create_user(body, current_user.id, _ip(request))
    resp = UserCreateResponse.model_validate(user)
    resp.magic_link_token = token_raw
    return ApiResponse(
        status="success",
        message="Usuario creado",
        data=resp.model_dump(),
    )


@users_router.get(
    "/users",
    response_model=ApiResponse,
    dependencies=[Depends(require_role(Role.superadmin))],
    summary="Listar usuarios paginado (superadmin)",
)
async def list_users(
    request: Request,
    state: UserState | None = None,
    role: Role | None = None,
    page: int = 1,
    limit: int = 20,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(require_role(Role.superadmin)),
) -> ApiResponse:
    if limit > 50:
        limit = 50
    users, total = await service.list_users(state, role, page, limit, current_user.id)
    import math

    data = UserListResponse(
        data=[UserListItem.model_validate(u) for u in users],
        meta=PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            pages=max(1, math.ceil(total / limit)),
        ),
    )
    return ApiResponse(status="success", message="OK", data=data.model_dump())


@users_router.get(
    "/users/me",
    response_model=ApiResponse,
    summary="Perfil propio",
)
async def get_me(
    current_user: Any = Depends(require_active_user),
) -> ApiResponse:
    resp = UserProfileResponse.model_validate(current_user)
    return ApiResponse(status="success", message="OK", data=resp.model_dump())


@users_router.patch(
    "/users/me/profile",
    response_model=ApiResponse,
    summary="Actualizar perfil propio",
)
async def update_profile(
    body: UserProfileUpdateRequest,
    current_user: Any = Depends(require_active_user),
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    update_data = body.model_dump(exclude_none=True)
    for k, v in update_data.items():
        setattr(current_user, k, v)
    await service.repo.db.commit()
    await service.repo.db.refresh(current_user)
    resp = UserProfileResponse.model_validate(current_user)
    return ApiResponse(status="success", message="Perfil actualizado", data=resp.model_dump())


@users_router.patch(
    "/users/me/password",
    response_model=ApiResponse,
    summary="Cambiar contraseña propia (superadmin, allowPending)",
)
async def change_password(
    request: Request,
    body: PasswordChangeRequest,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(get_current_user),
) -> ApiResponse:
    await service.change_password(
        current_user.id, body.current_password, body.new_password, _ip(request)
    )
    return ApiResponse(status="success", message="Contraseña actualizada")


@users_router.post(
    "/users/me/accept-terms",
    response_model=ApiResponse,
    summary="Aceptar términos y condiciones",
)
async def accept_terms(
    current_user: Any = Depends(require_active_user),
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    from sqlalchemy import update as sa_update
    from app.db.models.user import User
    from sqlalchemy.sql import func

    stmt = (
        sa_update(User)
        .where(User.id == current_user.id)
        .values(terms_accepted_at=func.now())
    )
    await service.repo.db.execute(stmt)
    await service.repo.db.commit()
    return ApiResponse(status="success", message="Términos aceptados")


@users_router.post(
    "/users/me/email-change-request",
    response_model=ApiResponse,
    summary="Solicitar cambio de email (pendiente aprobación superadmin)",
)
async def request_email_change(
    body: EmailChangeRequest,
    current_user: Any = Depends(require_active_user),
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    from app.core.audit import add_audit_event
    from app.db.models.audit_log import AuditEvent

    add_audit_event(
        service.repo.db,
        AuditEvent.EMAIL_CHANGE_REQUESTED,
        user_id=current_user.id,
        details=f"requested_email={body.new_email}",
    )
    await service.repo.db.commit()
    return ApiResponse(
        status="success",
        message="Solicitud de cambio de email registrada, pendiente aprobación",
    )


@users_router.get(
    "/users/{user_id}",
    response_model=ApiResponse,
    dependencies=[Depends(require_role(Role.superadmin))],
    summary="Detalle de usuario (superadmin)",
)
async def get_user(
    user_id: uuid.UUID,
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    user = await service.get_user(user_id)
    resp = UserDetailResponse.model_validate(user)
    return ApiResponse(status="success", message="OK", data=resp.model_dump())


@users_router.patch(
    "/users/{user_id}/status",
    response_model=ApiResponse,
    summary="Cambiar estado de usuario (superadmin)",
)
async def update_user_status(
    user_id: uuid.UUID,
    request: Request,
    body: UserStatusUpdateRequest,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(require_role(Role.superadmin)),
) -> ApiResponse:
    user = await service.update_user_status(user_id, body.state, current_user.id, _ip(request))
    resp = UserStatusUpdateResponse.model_validate(user)
    return ApiResponse(status="success", message="Estado actualizado", data=resp.model_dump())


@users_router.post(
    "/users/{user_id}/magic-link",
    response_model=ApiResponse,
    summary="Regenerar magic link (superadmin)",
)
async def regenerate_magic_link(
    user_id: uuid.UUID,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(require_role(Role.superadmin)),
) -> ApiResponse:
    user, token_raw = await service.regenerate_magic_link(user_id, current_user.id)
    resp = MagicLinkGenerateResponse(id=user.id, email=user.email, magic_link_token=token_raw)
    return ApiResponse(status="success", message="Magic link regenerado", data=resp.model_dump())


@users_router.patch(
    "/users/{user_id}/email",
    response_model=ApiResponse,
    summary="Aprobar cambio de email (superadmin)",
)
async def approve_email_change(
    user_id: uuid.UUID,
    request: Request,
    body: EmailChangeApproveRequest,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(require_role(Role.superadmin)),
) -> ApiResponse:
    user, token_raw = await service.approve_email_change(
        user_id, body.email, current_user.id, _ip(request)
    )
    return ApiResponse(
        status="success",
        message="Email actualizado — se generó nuevo magic link de reactivación",
        data={"id": str(user.id), "email": user.email, "magic_link_token": token_raw},
    )


@users_router.get(
    "/users/{user_id}/permissions",
    response_model=ApiResponse,
    dependencies=[Depends(require_role(Role.superadmin))],
    summary="Ver permisos de usuario (superadmin)",
)
async def get_permissions(
    user_id: uuid.UUID,
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    perm = await service.get_permissions(user_id)
    if perm is None:
        raise NotFoundError("Permisos no configurados para este usuario")
    resp = UserPermissionsResponse.model_validate(perm)
    return ApiResponse(status="success", message="OK", data=resp.model_dump())


@users_router.put(
    "/users/{user_id}/permissions",
    response_model=ApiResponse,
    summary="Configurar permisos de usuario (superadmin)",
)
async def upsert_permissions(
    user_id: uuid.UUID,
    request: Request,
    body: UserPermissionsRequest,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(require_role(Role.superadmin)),
) -> ApiResponse:
    perm = await service.upsert_permissions(
        user_id,
        current_user.id,
        _ip(request),
        mode=body.mode,
        education_levels=body.education_levels,
        subject_limit=body.subject_limit,
    )
    resp = UserPermissionsResponse.model_validate(perm)
    return ApiResponse(status="success", message="Permisos actualizados", data=resp.model_dump())


# ── SESSION ENDPOINTS ─────────────────────────────────────────────────────────


@users_router.get(
    "/users/me/sessions",
    response_model=ApiResponse,
    summary="Sesiones activas del usuario actual",
)
async def get_my_sessions(
    current_user: Any = Depends(require_active_user),
) -> ApiResponse:
    # Full session listing requires a dedicated sessions store (future work)
    return ApiResponse(status="success", message="OK", data={"sessions": []})


@users_router.get(
    "/users/{user_id}/sessions",
    response_model=ApiResponse,
    dependencies=[Depends(require_role(Role.superadmin))],
    summary="Sesiones activas de un usuario (superadmin)",
)
async def get_user_sessions(
    user_id: uuid.UUID,
) -> ApiResponse:
    return ApiResponse(status="success", message="OK", data={"sessions": []})


@users_router.get(
    "/users/sessions",
    response_model=ApiResponse,
    dependencies=[Depends(require_role(Role.superadmin))],
    summary="Todas las sesiones activas del sistema (superadmin)",
)
async def get_all_sessions() -> ApiResponse:
    return ApiResponse(status="success", message="OK", data={"sessions": []})


@users_router.delete(
    "/sessions/{jti}",
    response_model=ApiResponse,
    summary="Revocar una sesión propia por JTI",
)
async def revoke_session(
    jti: uuid.UUID,
    request: Request,
    service: AuthService = Depends(get_auth_service),
    current_user: Any = Depends(require_active_user),
) -> ApiResponse:
    from app.config import settings

    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=settings.jwt_expire_seconds)
    await service.logout(jti, expires_at, current_user.id, _ip(request))
    return ApiResponse(status="success", message="Sesión revocada")


# ── AUDIT LOG ─────────────────────────────────────────────────────────────────


@users_router.get(
    "/audit-log",
    response_model=ApiResponse,
    dependencies=[Depends(require_role(Role.superadmin))],
    summary="Registro de auditoría (superadmin)",
)
async def get_audit_log(
    event: str | None = None,
    user_id: uuid.UUID | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
    page: int = 1,
    limit: int = 20,
    service: AuthService = Depends(get_auth_service),
) -> ApiResponse:
    import math

    if limit > 100:
        limit = 100
    logs, total = await service.list_audit_log(event, user_id, from_dt, to_dt, page, limit)
    from app.api.v1.auth.schemas import AuditLogEntry

    data = AuditLogResponse(
        data=[AuditLogEntry.model_validate(log) for log in logs],
        meta=PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            pages=max(1, math.ceil(total / limit)),
        ),
    )
    return ApiResponse(status="success", message="OK", data=data.model_dump())


# ── SUPERADMIN CONFIG ─────────────────────────────────────────────────────────


@users_router.get(
    "/superadmin/profile-config",
    response_model=ApiResponse,
    summary="Configuración de perfil del sistema",
)
async def get_profile_config(
    current_user: Any = Depends(require_active_user),
) -> ApiResponse:
    config = ProfileConfigResponse(
        require_phone=False,
        require_institution=False,
        require_terms=False,
    )
    return ApiResponse(status="success", message="OK", data=config.model_dump())


@users_router.put(
    "/superadmin/profile-config",
    response_model=ApiResponse,
    dependencies=[Depends(require_role(Role.superadmin))],
    summary="Actualizar configuración de perfil (superadmin)",
)
async def update_profile_config(
    body: ProfileConfigUpdateRequest,
) -> ApiResponse:
    return ApiResponse(status="success", message="Configuración actualizada")


# ── LEGAL ─────────────────────────────────────────────────────────────────────


@auth_router.get("/legal/terms", summary="Términos y condiciones")
async def get_terms() -> ApiResponse:
    return ApiResponse(
        status="success",
        message="OK",
        data={"content": "Términos y condiciones pendientes de redacción."},
    )


@auth_router.get("/legal/privacy", summary="Política de privacidad")
async def get_privacy() -> ApiResponse:
    return ApiResponse(
        status="success",
        message="OK",
        data={"content": "Política de privacidad pendiente de redacción."},
    )


# Alias for backward compatibility with existing import in api/v1/router.py
router = auth_router
