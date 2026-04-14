from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Protocol

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.db.models import MagicLink, RevokedToken, User, UserState


class UserRepositoryProtocol(Protocol):
    async def create(self, user_id, full_name, email, role, organization):
        ...

    async def get_by_email(self, email):
        ...

    async def get_by_user_id(self, user_id):
        ...

    async def update_state(self, user_id, state):
        ...

    async def list_users(self, state, role, skip, limit):
        ...


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        user_id: uuid.UUID,
        full_name: str,
        email: str,
        role,
        organization: str | None,
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
        return user

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email, User.deleted_at == None)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: uuid.UUID) -> User | None:
        stmt = select(User).where(User.user_id == user_id, User.deleted_at == None)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_state(self, user_id: uuid.UUID, state: UserState) -> User:
        user = await self.get_by_user_id(user_id)
        if not user:
            raise ValueError("User not found")
        user.state = state
        user.updated_at = datetime.utcnow()
        await self.session.commit()
        return user

    async def list_users(
        self,
        state: UserState | None = None,
        role = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[User], int]:
        query = select(User).where(User.deleted_at == None)
        if state:
            query = query.where(User.state == state)
        if role:
            query = query.where(User.role == role)

        count_stmt = select(sa.func.count()).select_from(query.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar()

        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        users = list(result.scalars().all())
        return users, total


class MagicLinkRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self, user_id: uuid.UUID, token_hash: str, ttl_seconds: int = 86400
    ) -> MagicLink:
        magic_link = MagicLink(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(seconds=ttl_seconds),
        )
        self.session.add(magic_link)
        await self.session.commit()
        return magic_link

    async def get_by_token_hash(self, token_hash: str) -> MagicLink | None:
        stmt = select(MagicLink).where(
            MagicLink.token_hash == token_hash,
            MagicLink.used_at == None,
            MagicLink.expires_at > datetime.utcnow(),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_used(self, magic_link: MagicLink) -> None:
        magic_link.used_at = datetime.utcnow()
        await self.session.commit()


class RevokedTokenRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, jti: uuid.UUID, expires_at: datetime) -> RevokedToken:
        token = RevokedToken(jti=jti, expires_at=expires_at)
        self.session.add(token)
        await self.session.commit()
        return token

    async def exists(self, jti: uuid.UUID) -> bool:
        stmt = select(RevokedToken).where(RevokedToken.jti == jti)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def cleanup_expired(self) -> int:
        stmt = select(RevokedToken).where(
            RevokedToken.expires_at < datetime.utcnow()
        )
        result = await self.session.execute(stmt)
        tokens = result.scalars().all()
        for token in tokens:
            await self.session.delete(token)
        await self.session.commit()
        return len(tokens)