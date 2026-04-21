from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SubjectContext(Base):
    """unique=True en subject_id: solo un contexto por sujeto."""
    __tablename__ = "subject_contexts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False, unique=True,
    )
    school_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    education_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    age_cohort: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    socioeconomic_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    additional_attributes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
