"""initial auth schema — M1 tables

Revision ID: 0001
Revises:
Create Date: 2026-04-18

Tablas creadas:
  - users          (identidad, roles, estados, OIDC, sync Keycloak)
  - magic_links    (activación de cuenta — solo hash, nunca token en claro)
  - revoked_tokens (logout / invalidación de JWT por jti)
  - audit_logs     (trazabilidad de eventos de seguridad — CA-AUDIT-01..03)
  - user_permissions (permisos granulares de aplicador — CA-ACCESS-01..04)
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── Enums ────────────────────────────────────────────────────────────────
    user_role = postgresql.ENUM(
        "superadmin", "researcher", "applicator",
        name="user_role",
        create_type=True,
    )
    user_state = postgresql.ENUM(
        "pending", "active", "disabled", "deleted",
        name="user_state",
        create_type=True,
    )
    audit_event = postgresql.ENUM(
        "LOGIN", "LOGIN_FAILED", "LOGOUT", "RATE_LIMIT_TRIGGERED",
        "MAGIC_LINK_GENERATED", "MAGIC_LINK_USED", "MAGIC_LINK_EXPIRED",
        "USER_CREATED", "USER_STATE_CHANGED", "USER_DELETED",
        "EMAIL_CHANGED", "EMAIL_CHANGE_REQUESTED", "PASSWORD_CHANGED",
        "OIDC_LOGIN", "OIDC_CALLBACK_FAILED",
        "KEYCLOAK_SYNC_OK", "KEYCLOAK_SYNC_FAILED",
        "PERMISSION_CHANGED", "ACCESS_DENIED",
        "DATASET_ACCESS", "SUPERADMIN_ACTION", "USER_LIST_QUERIED",
        name="audit_event",
        create_type=True,
    )
    user_role.create(op.get_bind(), checkfirst=True)
    user_state.create(op.get_bind(), checkfirst=True)
    audit_event.create(op.get_bind(), checkfirst=True)

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("role", sa.Enum("superadmin", "researcher", "applicator", name="user_role"), nullable=False),
        sa.Column(
            "state",
            sa.Enum("pending", "active", "disabled", "deleted", name="user_state"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("broker_subject", sa.String(255), nullable=True),
        sa.Column("token_version", sa.Integer, nullable=False, server_default="0"),
        sa.Column("sync_pending", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("sync_retries", sa.Integer, nullable=False, server_default="0"),
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("institution", sa.String(255), nullable=True),
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("onboarding_completed", sa.Boolean, nullable=False, server_default="false"),
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
            onupdate=sa.func.now(),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── magic_links ───────────────────────────────────────────────────────────
    op.create_table(
        "magic_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # SHA-256 hex del token raw (64 chars). El token en claro NUNCA se persiste.
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
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
    )
    op.create_index("ix_magic_links_token_hash", "magic_links", ["token_hash"], unique=True)
    op.create_index("ix_magic_links_user_id", "magic_links", ["user_id"])

    # ── revoked_tokens ────────────────────────────────────────────────────────
    op.create_table(
        "revoked_tokens",
        sa.Column("jti", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_revoked_tokens_expires_at", "revoked_tokens", ["expires_at"])
    op.create_index("ix_revoked_tokens_user_id", "revoked_tokens", ["user_id"])

    # ── audit_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event",
            sa.Enum(
                "LOGIN", "LOGIN_FAILED", "LOGOUT", "RATE_LIMIT_TRIGGERED",
                "MAGIC_LINK_GENERATED", "MAGIC_LINK_USED", "MAGIC_LINK_EXPIRED",
                "USER_CREATED", "USER_STATE_CHANGED", "USER_DELETED",
                "EMAIL_CHANGED", "EMAIL_CHANGE_REQUESTED", "PASSWORD_CHANGED",
                "OIDC_LOGIN", "OIDC_CALLBACK_FAILED",
                "KEYCLOAK_SYNC_OK", "KEYCLOAK_SYNC_FAILED",
                "PERMISSION_CHANGED", "ACCESS_DENIED",
                "DATASET_ACCESS", "SUPERADMIN_ACTION", "USER_LIST_QUERIED",
                name="audit_event",
            ),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_event", "audit_logs", ["event"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])

    # ── user_permissions ──────────────────────────────────────────────────────
    op.create_table(
        "user_permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mode", sa.String(20), nullable=False, server_default="libre"),
        sa.Column(
            "education_levels",
            postgresql.ARRAY(sa.String),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("subject_limit", sa.Integer, nullable=True),
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
    )
    op.create_index("ix_user_permissions_user_id", "user_permissions", ["user_id"])


def downgrade() -> None:
    op.drop_table("user_permissions")
    op.drop_table("audit_logs")
    op.drop_table("revoked_tokens")
    op.drop_table("magic_links")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS audit_event")
    op.execute("DROP TYPE IF EXISTS user_state")
    op.execute("DROP TYPE IF EXISTS user_role")
