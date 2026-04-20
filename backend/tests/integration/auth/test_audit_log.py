"""
Integration tests for audit logging.
Covers: CA-AUDIT-01, CA-AUDIT-02, CA-AUDIT-03
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, call

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import add_audit_event
from app.db.models.audit_log import AuditEvent, AuditLog


@pytest.mark.integration
class TestAuditLogging:
    async def test_add_audit_event_adds_to_session_without_commit(self) -> None:
        """CA-AUDIT-01: audit helper adds to session; commit is the caller's responsibility."""
        db = MagicMock(spec=AsyncSession)
        db.add = MagicMock()
        db.commit = AsyncMock()

        add_audit_event(db, AuditEvent.USER_CREATED, user_id=uuid.uuid4(), ip="127.0.0.1")

        db.add.assert_called_once()
        added = db.add.call_args[0][0]
        assert isinstance(added, AuditLog)
        assert added.event == AuditEvent.USER_CREATED
        # Commit was NOT called — the service is responsible
        db.commit.assert_not_called()

    async def test_failed_login_audit_contains_no_sensitive_data(self) -> None:
        """CA-AUDIT-02: failed login audit must not include passwords or full tokens."""
        db = MagicMock(spec=AsyncSession)
        db.add = MagicMock()

        add_audit_event(
            db,
            AuditEvent.LOGIN_FAILED,
            ip="192.168.1.1",
            details="email_not_found",
        )

        added: AuditLog = db.add.call_args[0][0]
        assert added.event == AuditEvent.LOGIN_FAILED
        # No password in details
        details = added.details or ""
        assert "password" not in details.lower()
        assert "secret" not in details.lower()
        # No user_id leaked for unknown email
        assert added.user_id is None

    async def test_audit_event_fields_populated_correctly(self) -> None:
        """CA-AUDIT-03: audit entries carry user_id, ip, and structured details."""
        db = MagicMock(spec=AsyncSession)
        db.add = MagicMock()

        actor = uuid.uuid4()
        target = uuid.uuid4()

        add_audit_event(
            db,
            AuditEvent.DATASET_ACCESS,
            user_id=actor,
            ip="10.0.0.1",
            details=f"dataset_id={target}",
        )

        added: AuditLog = db.add.call_args[0][0]
        assert added.event == AuditEvent.DATASET_ACCESS
        assert added.user_id == actor
        assert added.ip == "10.0.0.1"
        assert str(target) in (added.details or "")

    async def test_all_defined_audit_events_are_string_enum(self) -> None:
        """All AuditEvent members are StrEnum (serializable as plain strings)."""
        for member in AuditEvent:
            assert isinstance(member.value, str)
            assert member == member.value  # StrEnum equality

    async def test_audit_log_model_has_no_sensitive_columns(self) -> None:
        """AuditLog model must not have columns for passwords, tokens, or secrets."""
        columns = {c.key for c in AuditLog.__table__.columns}
        forbidden = {"password", "token", "secret", "hash", "credential"}
        overlap = columns & forbidden
        assert not overlap, f"AuditLog has sensitive columns: {overlap}"
