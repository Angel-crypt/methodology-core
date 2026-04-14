from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, BaseModelMixin


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

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    full_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    email: Mapped[str] = mapped_column(sa.String(255), nullable=False, unique=True)
    role: Mapped[Role] = mapped_column(sa.SQLEnum(Role), nullable=False)
    organization: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    state: Mapped[UserState] = mapped_column(sa.SQLEnum(UserState), nullable=False)
    broker_subject: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)

    if TYPE_CHECKING:
        magic_links: list["MagicLink"] = relationship(
            "MagicLink", back_populates="user", foreign_keys="[MagicLink.user_id]"
        )