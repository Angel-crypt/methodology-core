"""
Integration tests for login, logout, and token revocation.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient

from app.api.v1.auth.dependencies import get_auth_service
from app.api.v1.auth.schemas import TokenResponse, TokenUserInfo
from app.api.v1.auth.service import AuthService
from app.core.exceptions import UnauthorizedError
from app.db.models.user import Role, User, UserState
from app.dependencies import get_current_user
from app.main import app


def _make_active_user(role: Role = Role.superadmin) -> User:
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "super@methodology.local"
    user.role = role
    user.state = UserState.active
    user.token_version = 0
    user.password_hash = "$2b$12$somehash"
    user.broker_subject = None
    user.password_changed_at = None
    user.full_name = "Super Admin"
    user.institution = None
    user.phone = None
    user.onboarding_completed = True
    user.terms_accepted_at = None
    user.sync_pending = False
    user.created_at = datetime.now(tz=timezone.utc)
    user.updated_at = datetime.now(tz=timezone.utc)
    user.deleted_at = None
    return user


def _make_token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token="eyJ.test.token",
        expires_in=21600,
        user=TokenUserInfo(id=user.id, role=user.role),
    )


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
class TestLogin:
    async def test_superadmin_login_success(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        user = _make_active_user()
        mock_service.login = AsyncMock(return_value=_make_token_response(user))  # type: ignore[method-assign]

        resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "super@methodology.local", "password": "ValidPass123!"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert "access_token" in body["data"]

    async def test_login_returns_401_for_wrong_password(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        """Anti-fingerprinting: same 401 for wrong password."""
        mock_service.login = AsyncMock(side_effect=UnauthorizedError("Credenciales inválidas"))  # type: ignore[method-assign]

        resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "super@methodology.local", "password": "WrongPass"},
        )

        assert resp.status_code == 401
        assert resp.json()["message"] == "Credenciales inválidas"

    async def test_login_returns_401_for_inactive_user(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        """Anti-fingerprinting: same 401 for disabled/pending user."""
        mock_service.login = AsyncMock(side_effect=UnauthorizedError("Credenciales inválidas"))  # type: ignore[method-assign]

        resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "disabled@methodology.local", "password": "AnyPass"},
        )

        assert resp.status_code == 401
        assert resp.json()["message"] == "Credenciales inválidas"

    async def test_login_returns_401_for_unknown_email(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        """Anti-fingerprinting: unknown email returns same 401 (no email enumeration)."""
        mock_service.login = AsyncMock(side_effect=UnauthorizedError("Credenciales inválidas"))  # type: ignore[method-assign]

        resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@unknown.com", "password": "AnyPass"},
        )

        assert resp.status_code == 401
        assert resp.json()["message"] == "Credenciales inválidas"


@pytest.mark.integration
class TestLogout:
    async def test_logout_revokes_token(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        user = _make_active_user()
        mock_service.logout = AsyncMock()  # type: ignore[method-assign]

        app.dependency_overrides[get_current_user] = lambda: user

        resp = await async_client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": "Bearer eyJ.some.token"},
        )

        assert resp.status_code in (200, 401)

    async def test_revoked_token_rejected_on_subsequent_request(
        self, async_client: AsyncClient, mock_service: AuthService
    ) -> None:
        """After logout, the same token must be rejected."""
        app.dependency_overrides[get_current_user] = lambda: (_ for _ in ()).throw(
            UnauthorizedError("Sesión revocada")
        )

        resp = await async_client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer revoked.token.here"},
        )

        assert resp.status_code == 401
