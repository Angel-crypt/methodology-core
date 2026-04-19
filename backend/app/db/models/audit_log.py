from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditEvent(enum.StrEnum):
    # Auth
    LOGIN = "LOGIN"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    RATE_LIMIT_TRIGGERED = "RATE_LIMIT_TRIGGERED"
    # Magic Link
    MAGIC_LINK_GENERATED = "MAGIC_LINK_GENERATED"
    MAGIC_LINK_USED = "MAGIC_LINK_USED"
    MAGIC_LINK_EXPIRED = "MAGIC_LINK_EXPIRED"
    # Usuarios
    USER_CREATED = "USER_CREATED"
    USER_STATE_CHANGED = "USER_STATE_CHANGED"
    USER_DELETED = "USER_DELETED"
    EMAIL_CHANGED = "EMAIL_CHANGED"
    EMAIL_CHANGE_REQUESTED = "EMAIL_CHANGE_REQUESTED"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    # OIDC / Keycloak
    OIDC_LOGIN = "OIDC_LOGIN"
    OIDC_CALLBACK_FAILED = "OIDC_CALLBACK_FAILED"
    KEYCLOAK_SYNC_OK = "KEYCLOAK_SYNC_OK"
    KEYCLOAK_SYNC_FAILED = "KEYCLOAK_SYNC_FAILED"
    # Permisos
    PERMISSION_CHANGED = "PERMISSION_CHANGED"
    ACCESS_DENIED = "ACCESS_DENIED"
    # Dataset
    DATASET_ACCESS = "DATASET_ACCESS"
    # Superadmin
    SUPERADMIN_ACTION = "SUPERADMIN_ACTION"
    USER_LIST_QUERIED = "USER_LIST_QUERIED"


class AuditLog(Base):
    """
    Registro de auditoría estructurada (BACKEND_SPEC §9, CA-AUDIT-01..03).
    - Nunca almacena secretos, passwords ni tokens completos.
    - user_id es nullable: permite registrar intentos de login fallidos sin usuario.
    - No usa BaseModelMixin: id es UUID v4 auto-generado, no necesita updated_at.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event: Mapped[AuditEvent] = mapped_column(
        Enum(AuditEvent, name="audit_event"), nullable=False
    )
    # NULL si el evento no corresponde a un usuario autenticado (ej: login fallido anónimo)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    # project_id y dataset_id para CA-AUDIT-03 (acceso a datasets)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    # Detalles internos: sin PII, sin tokens, sin passwords
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_event", "event"),
        Index("ix_audit_logs_timestamp", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} event={self.event} user_id={self.user_id}>"
