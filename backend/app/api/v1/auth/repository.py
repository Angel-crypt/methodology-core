from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_log import AuditLog
from app.db.models.magic_link import MagicLink
from app.db.models.revoked_token import RevokedToken
from app.db.models.user import Role, User, UserState
from app.db.models.user_permission import UserPermission


class AuthRepository:
    """
    Single data-access layer for the auth module.
    No commits here — the service commits after each complete business operation.
    flush() is used after db.add() to obtain DB-generated values (e.g. id)
    without ending the transaction.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Usuarios ──────────────────────────────────────────────────────────────

    async def get_user_by_id(self, user_id: uuid.UUID) -> User | None:
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def create_user(self, **kwargs: object) -> User:
        user = User(**kwargs)
        self.db.add(user)
        await self.db.flush()
        return user

    async def update_user_state(self, user_id: uuid.UUID, state: UserState) -> User:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(state=state)
            .returning(User)
        )
        result = (await self.db.execute(stmt)).scalar_one()
        await self.db.flush()
        return result

    async def update_user_email(self, user_id: uuid.UUID, email: str) -> User:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(email=email, broker_subject=None)
            .returning(User)
        )
        result = (await self.db.execute(stmt)).scalar_one()
        await self.db.flush()
        return result

    async def set_broker_subject(self, user_id: uuid.UUID, broker_subject: str) -> None:
        stmt = update(User).where(User.id == user_id).values(broker_subject=broker_subject)
        await self.db.execute(stmt)

    async def update_password(self, user_id: uuid.UUID, password_hash: str) -> None:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(password_hash=password_hash, password_changed_at=func.now())
        )
        await self.db.execute(stmt)

    async def increment_token_version(self, user_id: uuid.UUID) -> None:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(token_version=User.token_version + 1)
        )
        await self.db.execute(stmt)

    async def set_sync_pending(self, user_id: uuid.UUID, pending: bool) -> None:
        stmt = update(User).where(User.id == user_id).values(sync_pending=pending)
        await self.db.execute(stmt)

    async def list_users(
        self,
        state: UserState | None,
        role: Role | None,
        page: int,
        limit: int,
    ) -> tuple[list[User], int]:
        base = select(User).where(User.deleted_at.is_(None))
        if state is not None:
            base = base.where(User.state == state)
        if role is not None:
            base = base.where(User.role == role)

        count_stmt = select(func.count()).select_from(base.subquery())
        total = int((await self.db.execute(count_stmt)).scalar_one())

        stmt = base.order_by(User.created_at.desc()).limit(limit).offset((page - 1) * limit)
        users = list((await self.db.execute(stmt)).scalars().all())
        return users, total

    async def count_active_superadmins(self) -> int:
        stmt = select(func.count()).select_from(User).where(
            User.role == Role.superadmin,
            User.state == UserState.active,
            User.deleted_at.is_(None),
        )
        return int((await self.db.execute(stmt)).scalar_one())

    async def list_users_with_sync_pending(self) -> list[User]:
        stmt = select(User).where(User.sync_pending.is_(True), User.deleted_at.is_(None))
        return list((await self.db.execute(stmt)).scalars().all())

    async def soft_delete_user(self, user_id: uuid.UUID) -> None:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(state=UserState.deleted, deleted_at=func.now())
        )
        await self.db.execute(stmt)

    # ── Magic Links ───────────────────────────────────────────────────────────

    async def save_magic_link(
        self,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> MagicLink:
        ml = MagicLink(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self.db.add(ml)
        await self.db.flush()
        return ml

    async def get_magic_link_by_hash(self, token_hash: str) -> MagicLink | None:
        stmt = select(MagicLink).where(MagicLink.token_hash == token_hash)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def mark_magic_link_used(self, magic_link_id: uuid.UUID) -> None:
        stmt = (
            update(MagicLink)
            .where(MagicLink.id == magic_link_id)
            .values(used_at=func.now())
        )
        await self.db.execute(stmt)

    async def invalidate_user_magic_links(self, user_id: uuid.UUID) -> None:
        """Marks all unused magic links for a user as used (invalidated)."""
        stmt = (
            update(MagicLink)
            .where(MagicLink.user_id == user_id, MagicLink.used_at.is_(None))
            .values(used_at=func.now())
        )
        await self.db.execute(stmt)

    # ── Tokens revocados ──────────────────────────────────────────────────────

    async def revoke_token(
        self,
        jti: uuid.UUID,
        expires_at: datetime,
        user_id: uuid.UUID | None = None,
    ) -> None:
        rt = RevokedToken(jti=jti, expires_at=expires_at, user_id=user_id)
        self.db.add(rt)
        await self.db.flush()

    async def is_token_revoked(self, jti: uuid.UUID) -> bool:
        stmt = select(RevokedToken).where(RevokedToken.jti == jti)
        return (await self.db.execute(stmt)).scalar_one_or_none() is not None

    async def revoke_all_user_tokens(self, user_id: uuid.UUID) -> None:
        """
        Increments token_version to invalidate all existing JWTs for the user.
        Existing tokens carry the old version and will fail the token_version check.
        """
        await self.increment_token_version(user_id)

    async def cleanup_expired_revoked_tokens(self) -> int:
        stmt = delete(RevokedToken).where(RevokedToken.expires_at < func.now())
        result = await self.db.execute(stmt)
        return int(result.rowcount)

    # ── Permisos ──────────────────────────────────────────────────────────────

    async def get_user_permissions(self, user_id: uuid.UUID) -> UserPermission | None:
        stmt = select(UserPermission).where(UserPermission.user_id == user_id)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def upsert_user_permissions(
        self,
        user_id: uuid.UUID,
        **kwargs: object,
    ) -> UserPermission:
        existing = await self.get_user_permissions(user_id)
        if existing is None:
            perm = UserPermission(user_id=user_id, **kwargs)
            self.db.add(perm)
            await self.db.flush()
            return perm
        for k, v in kwargs.items():
            setattr(existing, k, v)
        await self.db.flush()
        return existing

    # ── Audit log ─────────────────────────────────────────────────────────────

    async def list_audit_log(
        self,
        event: str | None,
        user_id: uuid.UUID | None,
        from_dt: datetime | None,
        to_dt: datetime | None,
        page: int,
        limit: int,
    ) -> tuple[list[AuditLog], int]:
        base = select(AuditLog)
        if event is not None:
            base = base.where(AuditLog.event == event)
        if user_id is not None:
            base = base.where(AuditLog.user_id == user_id)
        if from_dt is not None:
            base = base.where(AuditLog.timestamp >= from_dt)
        if to_dt is not None:
            base = base.where(AuditLog.timestamp <= to_dt)

        count_stmt = select(func.count()).select_from(base.subquery())
        total = int((await self.db.execute(count_stmt)).scalar_one())

        stmt = (
            base.order_by(AuditLog.timestamp.desc())
            .limit(limit)
            .offset((page - 1) * limit)
        )
        logs = list((await self.db.execute(stmt)).scalars().all())
        return logs, total
