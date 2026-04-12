from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import MagicLink, RevokedToken, User, UserState


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        user_id: uuid.UUID,
        full_name: str,
        email: str,
        role: str,
        organization: str,
    ) -> User:
        user = User(
            user_id=user_id,
            full_name=full_name,
            email=email,
            role=role,
            organization=organization,
            state=UserState.PENDING,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.session.execute(
            select(User).where(User.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_state(self, user_id: uuid.UUID, state: UserState) -> User | None:
        user = await self.get_by_user_id(user_id)
        if user:
            user.state = state
            if state == UserState.DELETED:
                user.deleted_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(user)
        return user

    async def set_broker_subject(self, user_id: uuid.UUID, broker_subject: str) -> None:
        user = await self.get_by_user_id(user_id)
        if user:
            user.broker_subject = broker_subject
            await self.session.commit()

    async def list_users(
        self,
        state: UserState | None = None,
        role: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[User], int]:
        query = select(User).where(User.state != UserState.DELETED)
        
        if state:
            query = query.where(User.state == state)
        if role:
            query = query.where(User.role == role)

        count_result = await self.session.execute(query)
        total = len(count_result.all())

        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        users = list(result.scalars().all())

        return users, total


class MagicLinkRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: uuid.UUID, token_hash: str, ttl_seconds: int) -> MagicLink:
        expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        magic_link = MagicLink(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.session.add(magic_link)
        await self.session.commit()
        await self.session.refresh(magic_link)
        return magic_link

    async def get_by_token_hash(self, token_hash: str) -> MagicLink | None:
        result = await self.session.execute(
            select(MagicLink).where(MagicLink.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def mark_used(self, magic_link: MagicLink) -> None:
        magic_link.used_at = datetime.utcnow()
        await self.session.commit()


class RevokedTokenRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, jti: uuid.UUID, expires_at: datetime) -> RevokedToken:
        revoked = RevokedToken(jti=jti, expires_at=expires_at)
        self.session.add(revoked)
        await self.session.commit()
        return revoked

    async def exists(self, jti: uuid.UUID) -> bool:
        result = await self.session.execute(
            select(RevokedToken).where(RevokedToken.jti == jti)
        )
        return result.scalar_one_or_none() is not None

    async def cleanup_expired(self) -> int:
        now = datetime.utcnow()
        result = await self.session.execute(
            select(RevokedToken).where(RevokedToken.expires_at < now)
        )
        expired = result.scalars().all()
        for token in expired:
            await self.session.delete(token)
        await self.session.commit()
        return len(expired)