from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth.repository import (
    MagicLinkRepository,
    RevokedTokenRepository,
    UserRepository,
)
from app.config import settings
from app.core.security import create_access_token
from app.db.models import MagicLink, Role, User, UserState


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.magic_link_repo = MagicLinkRepository(session)
        self.revoked_token_repo = RevokedTokenRepository(session)

    async def create_user(
        self, full_name: str, email: str, role: Role, organization: str | None
    ) -> tuple[User, str]:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValueError("Email already exists")

        user = await self.user_repo.create(
            user_id=uuid.uuid4(),
            full_name=full_name,
            email=email,
            role=role,
            organization=organization,
        )

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        await self.magic_link_repo.create(
            user_id=user.user_id,
            token_hash=token_hash,
            ttl_seconds=settings.MAGIC_LINK_TTL_SECONDS,
        )

        return user, token

    async def consume_magic_link(self, token: str) -> User:
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        magic_link = await self.magic_link_repo.get_by_token_hash(token_hash)
        if not magic_link:
            raise ValueError("Invalid magic link")

        if magic_link.expires_at < datetime.utcnow():
            raise ValueError("Magic link expired")

        if magic_link.used_at:
            raise ValueError("Magic link already used")

        await self.magic_link_repo.mark_used(magic_link)

        user = await self.user_repo.get_by_user_id(magic_link.user_id)
        if not user:
            raise ValueError("User not found")

        updated_user = await self.user_repo.update_state(user.user_id, UserState.ACTIVE)
        return updated_user

    async def login(self, email: str) -> tuple[User, str]:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise ValueError("Invalid credentials")

        if user.state != UserState.ACTIVE:
            raise ValueError("User is not active")

        jwt_token = create_access_token(
            subject=str(user.user_id),
            email=user.email,
            role=user.role,
        )
        return user, jwt_token

    async def logout(self, jti: uuid.UUID, expires_at: datetime) -> None:
        await self.revoked_token_repo.create(jti=jti, expires_at=expires_at)

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        return await self.user_repo.get_by_user_id(user_id)

    async def update_user_state(self, user_id: uuid.UUID, state: UserState) -> User:
        user = await self.user_repo.get_by_user_id(user_id)
        if not user:
            raise ValueError("User not found")
        return await self.user_repo.update_state(user_id, state)

    async def list_users(
        self, state: UserState | None, role: Role | None, page: int, limit: int
    ) -> tuple[list[User], int]:
        return await self.user_repo.list_users(state=state, role=role, skip=(page - 1) * limit, limit=limit)

    async def regenerate_magic_link(self, user_id: uuid.UUID) -> tuple[User, str]:
        user = await self.user_repo.get_by_user_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.state != UserState.PENDING:
            raise ValueError("User is not in PENDING state")

        from sqlalchemy import select, and_
        from app.db.models import MagicLink

        stmt = select(MagicLink).where(
            and_(
                MagicLink.user_id == user_id,
                MagicLink.used_at == None,
                MagicLink.expires_at > datetime.utcnow()
            )
        )
        result = await self.session.execute(stmt)
        old_links = result.scalars().all()
        
        for link in old_links:
            link.used_at = datetime.utcnow()
        
        if old_links:
            await self.session.commit()

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        await self.magic_link_repo.create(
            user_id=user_id,
            token_hash=token_hash,
            ttl_seconds=settings.MAGIC_LINK_TTL_SECONDS,
        )

        return user, token

    async def change_email(self, user_id: uuid.UUID, new_email: str) -> tuple[User, str]:
        existing = await self.user_repo.get_by_email(new_email)
        if existing:
            raise ValueError("Email already exists")

        user = await self.user_repo.get_by_user_id(user_id)
        if not user:
            raise ValueError("User not found")

        from sqlalchemy import select
        from app.db.models import User as UserModel
        
        stmt = select(UserModel).where(UserModel.user_id == user_id)
        result = await self.session.execute(stmt)
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            raise ValueError("User not found")

        db_user.email = new_email
        db_user.broker_subject = None
        db_user.state = UserState.PENDING
        await self.session.commit()

        from sqlalchemy import select, and_
        from app.db.models import MagicLink

        stmt = select(MagicLink).where(
            and_(
                MagicLink.user_id == user_id,
                MagicLink.used_at == None,
            )
        )
        result = await self.session.execute(stmt)
        old_links = result.scalars().all()
        
        for link in old_links:
            link.used_at = datetime.utcnow()
        
        await self.session.commit()

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        await self.magic_link_repo.create(
            user_id=user_id,
            token_hash=token_hash,
            ttl_seconds=settings.MAGIC_LINK_TTL_SECONDS,
        )

        updated_user = await self.user_repo.get_by_user_id(user_id)
        return updated_user, token