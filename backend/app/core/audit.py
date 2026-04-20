from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_log import AuditEvent, AuditLog


def add_audit_event(
    db: AsyncSession,
    event: AuditEvent,
    user_id: uuid.UUID | None = None,
    ip: str | None = None,
    details: str | None = None,
) -> None:
    """
    Adds an audit log entry to the current session WITHOUT committing.
    The caller is responsible for db.commit() at the end of the operation.
    This keeps audit records inside the same transaction as the business operation.
    """
    db.add(AuditLog(event=event, user_id=user_id, ip=ip, details=details))


async def log_event(
    db: AsyncSession,
    event: AuditEvent,
    user_id: uuid.UUID | None = None,
    ip: str | None = None,
    details: str | None = None,
) -> None:
    """
    Adds and immediately commits an audit log entry.
    Use only for out-of-band events (e.g. scheduler jobs) where no outer
    transaction exists. Prefer add_audit_event() inside service methods.
    """
    db.add(AuditLog(event=event, user_id=user_id, ip=ip, details=details))
    await db.commit()
