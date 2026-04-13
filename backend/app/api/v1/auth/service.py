from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth.repository import MagicLinkRepository, RevokedTokenRepository, UserRepository
from app.config import settings
from app.core.security import create_access_token
from app.db.models import Role, User, UserState


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.magic_link_repo = MagicLinkRepository(session)
        self.revoked_token_repo = RevokedTokenRepository(session)

    async def create_user(
        self,
        full_name: str,
        email: str,
        role: Role,
        organization: str,
    ) -> tuple[User, str]:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        user_id = uuid.uuid4()
        user = await self.user_repo.create(
            user_id=user_id,
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
            ttl_seconds=settings.magic_link_ttl_seconds,
        )

        return user, token

    async def consume_magic_link(self, token: str) -> User:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        magic_link = await self.magic_link_repo.get_by_token_hash(token_hash)

        if not magic_link:
            raise ValueError("Invalid magic link")

        if magic_link.used_at:
            raise ValueError("Magic link already used")

        if magic_link.expires_at < datetime.utcnow():
            raise ValueError("Magic link expired")

        user = await self.user_repo.get_by_user_id(magic_link.user_id)
        if not user:
            raise ValueError("User not found")

        await self.magic_link_repo.mark_used(magic_link)
        user.state = UserState.ACTIVE
        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def login(self, email: str) -> tuple[User, str]:
        user = await self.user_repo.get_by_email(email)
        
        if not user:
            raise ValueError("Invalid credentials")

        if user.state != UserState.ACTIVE:
            raise ValueError("User not active")

        token, _ = create_access_token(str(user.user_id), user.role.value)
        return user, token

    async def logout(self, jti: uuid.UUID, expires_at: datetime) -> None:
        await self.revoked_token_repo.create(jti, expires_at)

    async def is_token_revoked(self, jti: uuid.UUID) -> bool:
        return await self.revoked_token_repo.exists(jti)

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        return await self.user_repo.get_by_user_id(user_id)

    async def update_user_state(self, user_id: uuid.UUID, state: UserState) -> User:
        user = await self.user_repo.get_by_user_id(user_id)
        if not user:
            raise ValueError("User not found")

        if state == UserState.DISABLED:
            all_superadmins = await self.user_repo.list_users(
                state=UserState.ACTIVE, role=Role.SUPERADMIN
            )
            active_superadmins = [u for u in all_superadmins[0] if u.user_id == user_id]
            if active_superadmins and len([u for u in all_superadmins[0] if u.role == Role.SUPERADMIN]) == 1:
                raise ValueError("Cannot disable the last active superadmin")

        await self.user_repo.update_state(user_id, state)
        return await self.user_repo.get_by_user_id(user_id)

    async def list_users(
        self,
        state: UserState | None = None,
        role: Role | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[User], int]:
        skip = (page - 1) * limit
        return await self.user_repo.list_users(state=state, role=role, skip=skip, limit=limit)