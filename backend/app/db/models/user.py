from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SQLEnum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, BaseModelMixin

if TYPE_CHECKING:
    from app.db.models.magic_link import MagicLink


class Role(str, Enum):
    SUPERADMIN = "superadmin"
    RESEARCHER = "researcher"
    APPLICATOR = "applicator"


class UserState(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DISABLED = "disabled"
    DELETED = "deleted"


class User(Base, BaseModelMixin):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    role: Mapped[Role] = mapped_column(SQLEnum(Role), nullable=False, default=Role.APPLICATOR)
    organization: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[UserState] = mapped_column(
        SQLEnum(UserState), nullable=False, default=UserState.PENDING
    )
    broker_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    magic_links: Mapped[list["MagicLink"]] = relationship("MagicLink", back_populates="user")