from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.db.models.user import Role, UserState

# ─── Helpers ──────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _validate_email(v: str) -> str:
    v = v.lower().strip()
    if not _EMAIL_RE.match(v):
        raise ValueError("Formato de email inválido")
    return v


# ─── Envelope estándar (ADR-018) ─────────────────────────────────────────────


class ApiResponse(BaseModel):
    status: str
    message: str
    data: Any = None


# ─── RF-M1-01 · POST /users — Crear usuario ──────────────────────────────────


class UserCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., max_length=320)
    role: Role
    institution: str | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)

    @field_validator("role")
    @classmethod
    def no_direct_superadmin(cls, v: Role) -> Role:
        if v == Role.superadmin:
            raise ValueError("No se puede crear un usuario superadmin por esta vía")
        return v


class UserCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    role: Role
    state: UserState
    created_at: datetime
    # Solo en entornos de desarrollo (nunca en producción — mock-only concept)
    magic_link_token: str | None = None


# ─── RF-M1-LIST · GET /users — Listar usuarios ───────────────────────────────


class UserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    role: Role
    state: UserState
    institution: str | None
    created_at: datetime


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int


class UserListResponse(BaseModel):
    data: list[UserListItem]
    meta: PaginationMeta


# ─── GET /users/:id — Detalle de usuario ─────────────────────────────────────


class UserDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    role: Role
    state: UserState
    institution: str | None
    phone: str | None
    onboarding_completed: bool
    terms_accepted_at: datetime | None
    sync_pending: bool
    created_at: datetime
    updated_at: datetime


# ─── RF-M1-02 · PATCH /users/:id/status — Cambiar estado ────────────────────


class UserStatusUpdateRequest(BaseModel):
    state: UserState

    @field_validator("state")
    @classmethod
    def state_not_deleted(cls, v: UserState) -> UserState:
        if v == UserState.deleted:
            raise ValueError("Usa DELETE /users/:id para soft-delete")
        return v


class UserStatusUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    state: UserState
    updated_at: datetime


# ─── RF-M1-03 · POST /auth/login — Login (superadmin) ───────────────────────


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)


class TokenUserInfo(BaseModel):
    id: uuid.UUID
    role: Role


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    must_change_password: bool = False
    user: TokenUserInfo


# ─── RF-M1-05 · Magic Link ───────────────────────────────────────────────────


class MagicLinkGenerateResponse(BaseModel):
    id: uuid.UUID
    email: str
    magic_link_token: str | None = None


class MagicLinkRegenerateResponse(BaseModel):
    id: uuid.UUID
    email: str
    magic_link_token: str | None = None


# ─── RF-M1-06 · PATCH /users/me/password ────────────────────────────────────


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_must_differ(self) -> PasswordChangeRequest:
        if self.current_password == self.new_password:
            raise ValueError("La nueva contraseña debe ser diferente a la actual")
        return self


# ─── POST /auth/password-recovery ────────────────────────────────────────────


class PasswordRecoveryRequest(BaseModel):
    email: str = Field(..., max_length=320)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)


# ─── POST /auth/password-reset ────────────────────────────────────────────────


class PasswordResetRequest(BaseModel):
    recovery_token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


# ─── GET /users/me — Perfil propio ───────────────────────────────────────────


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    role: Role
    state: UserState
    phone: str | None
    institution: str | None
    terms_accepted_at: datetime | None
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime


# ─── PATCH /users/me/profile ─────────────────────────────────────────────────


class UserProfileUpdateRequest(BaseModel):
    phone: str | None = Field(default=None, max_length=30)
    institution: str | None = Field(default=None, max_length=255)
    onboarding_completed: bool | None = None


# ─── GET/PUT /users/:id/permissions ─────────────────────────────────────────


class UserPermissionsRequest(BaseModel):
    mode: str = Field(default="libre", pattern=r"^(libre|restricted)$")
    education_levels: list[str] = Field(default_factory=list)
    subject_limit: int | None = Field(default=None, ge=1)


class UserPermissionsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    mode: str
    education_levels: list[str]
    subject_limit: int | None


# ─── RF-M1-AUDIT · GET /audit-log ────────────────────────────────────────────


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event: str
    user_id: uuid.UUID | None
    ip: str | None
    details: str | None
    timestamp: datetime


class AuditLogResponse(BaseModel):
    data: list[AuditLogEntry]
    meta: PaginationMeta


# ─── Sesiones ─────────────────────────────────────────────────────────────────


class SessionInfo(BaseModel):
    jti: uuid.UUID
    ip: str | None
    user_agent: str | None
    created_at: datetime
    expires_at: datetime
    current: bool = False


class SessionListResponse(BaseModel):
    data: list[SessionInfo]


# ─── Solicitudes de cambio de email ──────────────────────────────────────────


class EmailChangeRequest(BaseModel):
    new_email: str = Field(..., max_length=320)
    reason: str = Field(default="", max_length=500)

    @field_validator("new_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)


class EmailChangeApproveRequest(BaseModel):
    email: str = Field(..., max_length=320)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)


# ─── POST /auth/oidc/callback ────────────────────────────────────────────────


class OidcCallbackRequest(BaseModel):
    code: str = Field(..., min_length=1)


# ─── GET/PUT /superadmin/profile-config ──────────────────────────────────────


class ProfileConfigResponse(BaseModel):
    require_phone: bool
    require_institution: bool
    require_terms: bool


class ProfileConfigUpdateRequest(BaseModel):
    require_phone: bool | None = None
    require_institution: bool | None = None
    require_terms: bool | None = None
