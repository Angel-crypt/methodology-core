from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BaseModelMixin


class MagicLink(Base, BaseModelMixin):
    """
    Token de activación de cuenta de un solo uso (ADR-014).
    - Solo se almacena el hash SHA-256 del token real (nunca el token en claro).
    - TTL controlado por expires_at (default 24h, configurable en settings).
    - used_at se establece al consumir: segundo uso retorna 410.
    - user_id referencia a users.id (PK UUID de BaseModelMixin).
    """

    __tablename__ = "magic_links"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # SHA-256 hex del token raw (64 caracteres). El token raw NUNCA se persiste.
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # NULL = no usado. Establecido en el momento del consumo (single-use).
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def is_valid(self, now: datetime) -> bool:
        return self.used_at is None and self.expires_at > now

    def __repr__(self) -> str:
        return f"<MagicLink id={self.id} user_id={self.user_id} used={self.used_at is not None}>"
