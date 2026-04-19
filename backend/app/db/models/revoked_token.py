from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RevokedToken(Base):
    """
    Almacena JTIs de tokens JWT revocados antes de su expiración natural.
    - jti es el PK (UUID extraído del payload JWT).
    - expires_at = exp del token: permite limpiar entradas vencidas con un cron.
    - user_id es opcional: facilita revocar todas las sesiones de un usuario
      sin necesidad de buscar por jti.
    - No usa BaseModelMixin porque jti ES la clave primaria (no necesitamos un id extra).
    """

    __tablename__ = "revoked_tokens"

    # jti extraído directamente del payload JWT — es el PK de esta tabla
    jti: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Permite revocar todas las sesiones activas de un usuario (ej: cambio de email)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        # Índice para limpiar entradas expiradas eficientemente (cron/scheduler)
        Index("ix_revoked_tokens_expires_at", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<RevokedToken jti={self.jti} expires_at={self.expires_at}>"
