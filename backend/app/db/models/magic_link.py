from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, BaseModelMixin


if TYPE_CHECKING:
    from app.db.models.user import User


class MagicLink(Base, BaseModelMixin):
    __tablename__ = "magic_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(sa.String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime, nullable=True)

    if TYPE_CHECKING:
        user: User = relationship("User", back_populates="magic_links")