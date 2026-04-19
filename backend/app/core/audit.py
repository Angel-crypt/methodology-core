from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_log import AuditEvent, AuditLog

if TYPE_CHECKING:
    pass


async def log_event(
    db: AsyncSession,
    event: AuditEvent,
    user_id: uuid.UUID | None = None,
    ip: str | None = None,
    details: str | None = None,
):
    audit = AuditLog(event=event, user_id=user_id, ip=ip, details=details)
    db.add(audit)
    await db.commit()
