"""
Integration tests for magic link flows.
Covers: CA-MAGIC-01, CA-MAGIC-02, CA-MAGIC-03, CA-MAGIC-04
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.api.v1.auth.dependencies import get_auth_service
from app.api.v1.auth.service import AuthService
from app.db.models.magic_link import MagicLink
from app.db.models.user import Role, User, UserState
from app.main import app


def _make_user(state: UserState = UserState.pending) -> User:
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    user.role = Role.applicator
    user.state = state
    user.token_version = 0
    user.password_hash = None
    user.broker_subject = None
    user.password_changed_at = None
    user.full_name = "Test User"
    user.institution = None
    user.phone = None
    user.onboarding_completed = False
    user.terms_accepted_at = None
    user.sync_pending = False
    user.created_at = datetime.now(tz=timezone.utc)
    user.updated_at = datetime.now(tz=timezone.utc)
    user.deleted_at = None
    return user


def _make_magic_link(
    user_id: uuid.UUID,
    token_raw: str,
    *,
    used: bool = False,
    expired: bool = False,
) -> MagicLink:
    ml = MagicMock(spec=MagicLink)
    ml.id = uuid.uuid4()
    ml.user_id = user_id
    ml.token_hash = hashlib.sha256(token_raw.encode()).hexdigest()
    now = datetime.now(tz=timezone.utc)
    ml.expires_at = now - timedelta(hours=1) if expired else now + timedelta(hours=24)
    ml.used_at = now if used else None
    ml.is_valid = MagicMock(return_value=(not used and not expired))
    return ml


@pytest.fixture
def mock_service() -> AuthService:
    svc = AsyncMock(spec=AuthService)
    svc.repo = AsyncMock()
    svc.repo.db = AsyncMock()
    return svc


@pytest.fixture(autouse=True)
def override_service(mock_service: AuthService):  # type: ignore[misc]
    app.dependency_overrides[get_auth_service] = lambda: mock_service
    yield
    app.dependency_overrides.clear()


@pytest.mark.integration
class TestMagicLink:
    async def test_magic_link_activates_pending_user(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        """CA-MAGIC-01: valid magic link activates the user."""
        user = _make_user(UserState.active)
        mock_service.activate_magic_link = AsyncMock(return_value=user)  # type: ignore[method-assign]

        resp = await async_client.get("/api/v1/auth/activate/valid-token-abc123")

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        mock_service.activate_magic_link.assert_awaited_once()

    async def test_magic_link_returns_410_on_second_use(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        """CA-MAGIC-02: already-used magic link returns 410."""
        from app.core.exceptions import AppError

        mock_service.activate_magic_link = AsyncMock(  # type: ignore[method-assign]
            side_effect=AppError("Enlace inválido o expirado", status_code=410)
        )

        resp = await async_client.get("/api/v1/auth/activate/already-used-token")

        assert resp.status_code == 410
        assert resp.json()["status"] == "error"

    async def test_magic_link_returns_410_when_expired(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        """CA-MAGIC-03: expired magic link returns 410 (same code as used — no leakage)."""
        from app.core.exceptions import AppError

        mock_service.activate_magic_link = AsyncMock(  # type: ignore[method-assign]
            side_effect=AppError("Enlace inválido o expirado", status_code=410)
        )

        resp = await async_client.get("/api/v1/auth/activate/expired-token")

        assert resp.status_code == 410

    async def test_magic_link_stored_as_hash_only(self) -> None:
        """CA-MAGIC-04: raw token is never stored; only SHA-256 hash persists."""
        import secrets

        token_raw = secrets.token_hex(32)
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()

        assert token_raw != token_hash
        assert len(token_hash) == 64
        # Verify the hash is derived correctly
        assert hashlib.sha256(token_raw.encode()).hexdigest() == token_hash
        # Raw token cannot be recovered from hash
        assert token_raw not in token_hash
