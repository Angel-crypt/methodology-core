from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BaseModelMixin


class Role(enum.StrEnum):
    superadmin = "superadmin"
    researcher = "researcher"
    applicator = "applicator"


class UserState(enum.StrEnum):
    pending = "pending"
    active = "active"
    disabled = "disabled"
    deleted = "deleted"


class User(Base, BaseModelMixin):
    """
    Tabla principal de identidad.
    - id (UUID v4) es inmutable y fuente de verdad (de BaseModelMixin).
    - researcher/applicator autentican por Keycloak OIDC; broker_subject se vincula en primer login.
    - superadmin puede tener password_hash para ruta de sistema (/auth/login).
    - state controla acceso: solo 'active' tiene acceso operativo.
    - token_version se incrementa en cambio de email para invalidar todas las sesiones.
    - sync_pending marca que el estado local difiere del de Keycloak.
    """

    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    # Solo superadmin usa password; researcher/applicator usan OIDC
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[Role] = mapped_column(Enum(Role, name="user_role"), nullable=False)
    state: Mapped[UserState] = mapped_column(
        Enum(UserState, name="user_state"),
        nullable=False,
        default=UserState.pending,
        server_default=UserState.pending.value,
    )
    # Keycloak OIDC subject claim — vinculado en el primer login OIDC exitoso
    broker_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Incrementado en cambio de email para invalidar todas las sesiones activas
    token_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    # Marca sync pendiente con Keycloak (consistencia eventual controlada — BACKEND_SPEC §5)
    sync_pending: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    sync_retries: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    # Actualizado en cada cambio de contraseña; middleware rechaza tokens con iat anterior
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Perfil extendido (onboarding)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    institution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Timestamp de soft-delete (ADR-013: sin hard delete)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role} state={self.state}>"
