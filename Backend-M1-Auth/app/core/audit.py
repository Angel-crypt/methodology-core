from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_log import AuditEvent, AuditLog


async def log_event(
    db: AsyncSession,
    event: AuditEvent,
    *,
    user_id: uuid.UUID | None = None,
    ip: str | None = None,
    details: str | None = None,
) -> None:
    """
    Registra un evento de auditoría en la tabla audit_logs.  (Tarea 2.4)

    Uso:
        await log_event(db, AuditEvent.LOGIN, user_id=user.user_id, ip=request.client.host)
        await log_event(db, AuditEvent.LOGIN_FAILED, ip=request.client.host, details="bad password")

    Eventos disponibles:
        USER_CREATED, USER_ACTIVATED, LOGIN, LOGIN_FAILED, LOGOUT,
        EMAIL_CHANGED, USER_DISABLED, USER_DELETED,
        RATE_LIMIT_ACTIVATED, ACCESS_DENIED
    """
    audit = AuditLog(
        event=event,
        user_id=user_id,
        ip=ip,
        details=details,
    )
    db.add(audit)
    await db.commit()
