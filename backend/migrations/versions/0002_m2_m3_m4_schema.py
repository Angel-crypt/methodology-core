"""M2/M3/M4 schema — instruments, metrics, subjects, applications, metric_values

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-20

Tablas creadas:
  - instruments       (M2 — catálogo de instrumentos de evaluación)
  - metrics           (M2 — métricas por instrumento)
  - subjects          (M3 — sujetos evaluados)
  - subject_contexts  (M3 — contexto sociodemográfico del sujeto)
  - applications      (M3 — aplicación de instrumento a sujeto)
  - metric_values     (M3 — valores capturados por aplicación)
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── instruments ───────────────────────────────────────────────────────────
    op.create_table(
        "instruments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("methodological_description", sa.Text, nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "min_days_between_applications",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("name", name="uq_instrument_name"),
    )
    op.create_index("ix_instruments_is_active", "instruments", ["is_active"])
    op.create_index("ix_instruments_deleted_at", "instruments", ["deleted_at"])

    # ── metrics ───────────────────────────────────────────────────────────────
    op.create_table(
        "metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "instrument_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instruments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("metric_type", sa.String(20), nullable=False),
        sa.Column("required", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("min_value", sa.Float, nullable=True),
        sa.Column("max_value", sa.Float, nullable=True),
        sa.Column("options", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("instrument_id", "name", name="uq_metric_name_per_instrument"),
    )
    op.create_index("ix_metrics_instrument_id", "metrics", ["instrument_id"])

    # ── subjects ──────────────────────────────────────────────────────────────
    op.create_table(
        "subjects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("anonymous_code", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── subject_contexts ──────────────────────────────────────────────────────
    op.create_table(
        "subject_contexts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "subject_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subjects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("school_type", sa.String(20), nullable=True),
        sa.Column("education_level", sa.String(30), nullable=True),
        sa.Column("age_cohort", sa.String(20), nullable=True),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column("socioeconomic_level", sa.String(20), nullable=True),
        sa.Column("additional_attributes", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("subject_id", name="uq_subject_context_per_subject"),
    )

    # ── applications ──────────────────────────────────────────────────────────
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "subject_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subjects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "instrument_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instruments.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "applicator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("application_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_applications_subject_id", "applications", ["subject_id"])
    op.create_index("ix_applications_applicator_id", "applications", ["applicator_id"])

    # ── metric_values ─────────────────────────────────────────────────────────
    op.create_table(
        "metric_values",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "application_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "metric_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("metrics.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("value_text", sa.Text, nullable=True),
        sa.Column("value_number", sa.Float, nullable=True),
        sa.Column("value_boolean", sa.Boolean, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "application_id", "metric_id", name="uq_metric_value_per_application"
        ),
    )
    op.create_index("ix_metric_values_application_id", "metric_values", ["application_id"])


def downgrade() -> None:
    op.drop_table("metric_values")
    op.drop_table("applications")
    op.drop_table("subject_contexts")
    op.drop_table("subjects")
    op.drop_table("metrics")
    op.drop_table("instruments")
