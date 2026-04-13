from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


# ---------------------------------------------------------------------------
# Eventos auditables  (Tarea 2.4)
# ---------------------------------------------------------------------------

class AuditEvent(str, Enum):
    USER_CREATED         = "USER_CREATED"
    USER_ACTIVATED       = "USER_ACTIVATED"
    LOGIN                = "LOGIN"
    LOGIN_FAILED         = "LOGIN_FAILED"
    LOGOUT               = "LOGOUT"
    EMAIL_CHANGED        = "EMAIL_CHANGED"
    USER_DISABLED        = "USER_DISABLED"
    USER_DELETED         = "USER_DELETED"
    RATE_LIMIT_ACTIVATED = "RATE_LIMIT_ACTIVATED"
    ACCESS_DENIED        = "ACCESS_DENIED"


# ---------------------------------------------------------------------------
# Modelo SQLAlchemy
# ---------------------------------------------------------------------------

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event: Mapped[AuditEvent] = mapped_column(
        String(50), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    ip: Mapped[str | None] = mapped_column(
        String(45), nullable=True           # soporta IPv4 e IPv6
    )
    details: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
