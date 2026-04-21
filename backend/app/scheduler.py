from __future__ import annotations

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.core.audit import log_event
from app.core.keycloak import KeycloakClient
from app.db.models.audit_log import AuditEvent
from app.db.models.revoked_token import RevokedToken
from app.db.models.user import User, UserState

logger = structlog.get_logger(__name__)


class SyncScheduler:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        keycloak: KeycloakClient,
    ) -> None:
        self._session_factory = session_factory
        self._keycloak = keycloak
        self._scheduler = AsyncIOScheduler()

    async def start(self) -> None:
        self._scheduler.add_job(
            self._sync_pending_users,
            trigger="interval",
            seconds=settings.sync_interval_seconds,
            id="sync_pending_users",
            replace_existing=True,
        )
        self._scheduler.add_job(
            self._cleanup_revoked_tokens,
            trigger="interval",
            minutes=10,
            id="cleanup_revoked_tokens",
            replace_existing=True,
        )
        self._scheduler.start()
        logger.info("scheduler.started")

    async def stop(self) -> None:
        self._scheduler.shutdown(wait=False)
        logger.info("scheduler.stopped")

    async def _sync_pending_users(self) -> None:
        async with self._session_factory() as db:
            result = await db.execute(select(User).where(User.sync_pending == True))  # noqa: E712
            users = result.scalars().all()

        for user in users:
            async with self._session_factory() as db:
                try:
                    if user.state == UserState.active:
                        ok = await self._keycloak.enable_user(user.broker_subject or "")
                    else:
                        ok = await self._keycloak.disable_user(user.broker_subject or "")

                    result = await db.execute(select(User).where(User.id == user.id))
                    db_user = result.scalar_one_or_none()
                    if db_user is None:
                        continue

                    if ok:
                        db_user.sync_pending = False
                        db_user.sync_retries = 0
                        await db.flush()
                        await log_event(
                            db,
                            AuditEvent.KEYCLOAK_SYNC_OK,
                            user_id=db_user.id,
                            details=f"state={db_user.state}",
                        )
                    else:
                        db_user.sync_retries += 1
                        await db.flush()
                        if db_user.sync_retries >= settings.sync_max_retries:
                            await log_event(
                                db,
                                AuditEvent.KEYCLOAK_SYNC_FAILED,
                                user_id=db_user.id,
                                details=f"retries={db_user.sync_retries}",
                            )
                        else:
                            await db.commit()

                except Exception as exc:
                    logger.warning("scheduler.sync_pending_users.error", error=str(exc), user_id=str(user.id))

    async def _cleanup_revoked_tokens(self) -> None:
        from datetime import datetime, timezone

        async with self._session_factory() as db:
            try:
                now = datetime.now(timezone.utc)
                await db.execute(
                    delete(RevokedToken).where(RevokedToken.expires_at < now)
                )
                await db.commit()
                logger.info("scheduler.cleanup_revoked_tokens.done")
            except Exception as exc:
                logger.warning("scheduler.cleanup_revoked_tokens.error", error=str(exc))
