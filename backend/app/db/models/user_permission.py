from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BaseModelMixin


class UserPermission(Base, BaseModelMixin):
    """
    Permisos granulares de aplicador por proyecto (BACKEND_SPEC §6).
    - mode='libre': sin restricciones de nivel educativo o cupo de sujetos.
    - mode='restricted': restringido a education_levels y subject_limit.
    - education_levels: array de niveles educativos permitidos.
    - subject_limit: cupo máximo de sujetos que el aplicador puede registrar.
    - Invalidar cache de permisos en Redis al modificar (CA-ACCESS-04).
    """

    __tablename__ = "user_permissions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # 'libre' | 'restricted'
    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="libre", server_default="libre")
    # Array de strings con niveles educativos permitidos (vacío = sin restricción en mode=libre)
    education_levels: Mapped[list[Any]] = mapped_column(
        ARRAY(String), nullable=False, default=list, server_default="{}"
    )
    # NULL = sin límite; entero positivo = cupo máximo de sujetos
    subject_limit: Mapped[int | None] = mapped_column(nullable=True)

    def __repr__(self) -> str:
        return (
            f"<UserPermission id={self.id} user_id={self.user_id} "
            f"mode={self.mode} limit={self.subject_limit}>"
        )
