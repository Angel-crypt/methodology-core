from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from pytest import fixture, pytest

from app.api.v1.auth.service import AuthService
from app.db.models import Role, User, UserState


class MockSession:
    def __init__(self):
        self.commited = False
    
    async def commit(self):
        self.commited = True
    
    async def execute(self, stmt):
        return MockResult()


class MockResult:
    def __init__(self):
        self.scalars_result = []
    
    def scalars(self):
        return MockScalars(self.scalars_result)
    
    def scalar_one_or_none(self):
        return self.scalars_result[0] if self.scalars_result else None


class MockScalars:
    def __init__(self, items):
        self.items = items
    
    def all(self):
        return self.items


@fixture
def mock_session():
    return MockSession()


@fixture
def mock_user_repo():
    repo = AsyncMock()
    repo.create = AsyncMock(return_value=MockUser())
    repo.get_by_email = AsyncMock(return_value=None)
    repo.get_by_user_id = AsyncMock(return_value=None)
    repo.update_state = AsyncMock()
    repo.list_users = AsyncMock(return_value=([], 0))
    return repo


@fixture
def mock_magic_link_repo():
    repo = AsyncMock()
    repo.create = AsyncMock()
    repo.get_by_token_hash = AsyncMock(return_value=None)
    repo.mark_used = AsyncMock()
    return repo


@fixture
def mock_revoked_token_repo():
    repo = AsyncMock()
    repo.create = AsyncMock()
    repo.exists = AsyncMock(return_value=False)
    return repo


@fixture
def auth_service(mock_session, mock_user_repo, mock_magic_link_repo, mock_revoked_token_repo):
    service = AuthService(mock_session)
    service.user_repo = mock_user_repo
    service.magic_link_repo = mock_magic_link_repo
    service.revoked_token_repo = mock_revoked_token_repo
    return service


class MockUser:
    def __init__(
        self,
        user_id=None,
        full_name="Test User",
        email="test@example.com",
        role=Role.RESEARCHER,
        organization="Test Org",
        state=UserState.PENDING,
    ):
        self.user_id = user_id or uuid.uuid4()
        self.full_name = full_name
        self.email = email
        self.role = role
        self.organization = organization
        self.state = state
        self.broker_subject = None
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()


class TestAuthModule:
    @pytest.mark.asyncio
    async def test_create_user_generates_magic_link(self, auth_service, mock_user_repo):
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = MockUser()
        
        user, magic_link = await auth_service.create_user(
            full_name="Test User",
            email="test@example.com",
            role=Role.RESEARCHER,
            organization="Test Org",
        )
        
        assert magic_link is not None
        assert len(magic_link) > 0

    @pytest.mark.asyncio
    async def test_consume_valid_magic_link_activates_user(self, auth_service, mock_magic_link_repo):
        user_id = uuid.uuid4()
        mock_magic_link = MagicMock()
        mock_magic_link.user_id = user_id
        mock_magic_link.expires_at = datetime.utcnow() + timedelta(hours=1)
        mock_magic_link.used_at = None
        
        mock_magic_link_repo.get_by_token_hash.return_value = mock_magic_link
        
        user = MockUser(user_id=user_id, state=UserState.PENDING)
        mock_user_repo.get_by_user_id.return_value = user
        mock_user_repo.update_state.return_value = MockUser(user_id=user_id, state=UserState.ACTIVE)
        
        result = await auth_service.consume_magic_link("valid_token_123")
        
        assert result.state == UserState.ACTIVE

    @pytest.mark.asyncio
    async def test_consume_expired_magic_link_raises_error(self, auth_service, mock_magic_link_repo):
        mock_magic_link = MagicMock()
        mock_magic_link.user_id = uuid.uuid4()
        mock_magic_link.expires_at = datetime.utcnow() - timedelta(hours=1)
        mock_magic_link.used_at = None
        
        mock_magic_link_repo.get_by_token_hash.return_value = mock_magic_link
        
        with pytest.raises(ValueError, match="expired"):
            await auth_service.consume_magic_link("expired_token")

    @pytest.mark.asyncio
    async def test_consume_used_magic_link_raises_error(self, auth_service, mock_magic_link_repo):
        mock_magic_link = MagicMock()
        mock_magic_link.user_id = uuid.uuid4()
        mock_magic_link.expires_at = datetime.utcnow() + timedelta(hours=1)
        mock_magic_link.used_at = datetime.utcnow()
        
        mock_magic_link_repo.get_by_token_hash.return_value = mock_magic_link
        
        with pytest.raises(ValueError, match="already used"):
            await auth_service.consume_magic_link("used_token")

    @pytest.mark.asyncio
    async def test_login_with_active_user_returns_token(self, auth_service, mock_user_repo):
        mock_user = MockUser(state=UserState.ACTIVE)
        mock_user_repo.get_by_email.return_value = mock_user
        
        user, token = await auth_service.login("test@example.com")
        
        assert token is not None
        assert len(token) > 0

    @pytest.mark.asyncio
    async def test_login_with_pending_user_fails(self, auth_service, mock_user_repo):
        mock_user = MockUser(state=UserState.PENDING)
        mock_user_repo.get_by_email.return_value = mock_user
        
        with pytest.raises(ValueError, match="not active"):
            await auth_service.login("test@example.com")

    @pytest.mark.asyncio
    async def test_login_with_disabled_user_fails(self, auth_service, mock_user_repo):
        mock_user = MockUser(state=UserState.DISABLED)
        mock_user_repo.get_by_email.return_value = mock_user
        
        with pytest.raises(ValueError, match="not active"):
            await auth_service.login("test@example.com")

    @pytest.mark.asyncio
    async def test_logout_revokes_token(self, auth_service, mock_revoked_token_repo):
        jti = uuid.uuid4()
        expires_at = datetime.utcnow() + timedelta(hours=6)
        
        await auth_service.logout(jti, expires_at)
        
        mock_revoked_token_repo.create.assert_called_once_with(jti=jti, expires_at=expires_at)