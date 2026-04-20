"""
Integration tests for RBAC and user state enforcement.
Covers: CA-STATE-01, CA-STATE-02, CA-ACCESS-01
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.db.models.user import Role, User, UserState
from app.dependencies import get_current_user, require_active_user
from app.main import app


def _make_user(role: Role, state: UserState) -> User:
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = f"{role}@test.com"
    user.role = role
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


@pytest.fixture(autouse=True)
def cleanup():  # type: ignore[misc]
    yield
    app.dependency_overrides.clear()


@pytest.mark.integration
class TestUserStateEnforcement:
    async def test_disabled_user_returns_403(self, async_client: AsyncClient) -> None:
        """CA-STATE-01: disabled users cannot access any protected endpoint."""
        app.dependency_overrides[get_current_user] = lambda: (_ for _ in ()).throw(
            ForbiddenError("Cuenta desactivada")
        )

        resp = await async_client.get(
            "/api/v1/users/me", headers={"Authorization": "Bearer sometoken"}
        )
        assert resp.status_code == 403
        assert "desactivada" in resp.json()["message"].lower()

    async def test_deleted_user_returns_403(self, async_client: AsyncClient) -> None:
        """CA-STATE-02: deleted users cannot access any protected endpoint."""
        app.dependency_overrides[get_current_user] = lambda: (_ for _ in ()).throw(
            ForbiddenError("Cuenta eliminada")
        )

        resp = await async_client.get(
            "/api/v1/users/me", headers={"Authorization": "Bearer sometoken"}
        )
        assert resp.status_code == 403
        assert "eliminada" in resp.json()["message"].lower()

    async def test_pending_user_blocked_except_change_password(
        self, async_client: AsyncClient
    ) -> None:
        """Pending user is blocked by require_active_user on most endpoints."""
        pending_user = _make_user(Role.applicator, UserState.pending)
        app.dependency_overrides[get_current_user] = lambda: pending_user
        app.dependency_overrides[require_active_user] = lambda: (_ for _ in ()).throw(
            ForbiddenError("Cuenta no activa")
        )

        resp = await async_client.get(
            "/api/v1/users/me", headers={"Authorization": "Bearer sometoken"}
        )
        assert resp.status_code == 403


@pytest.mark.integration
class TestRoleBasedAccess:
    async def test_researcher_cannot_access_superadmin_endpoint(
        self, async_client: AsyncClient
    ) -> None:
        """Researcher role must be rejected from superadmin-only endpoints."""
        app.dependency_overrides[get_current_user] = lambda: (_ for _ in ()).throw(
            ForbiddenError("Rol insuficiente para esta operación")
        )
        app.dependency_overrides[require_active_user] = lambda: (_ for _ in ()).throw(
            ForbiddenError("Rol insuficiente para esta operación")
        )

        resp = await async_client.get(
            "/api/v1/users", headers={"Authorization": "Bearer sometoken"}
        )
        assert resp.status_code == 403

    async def test_unauthenticated_request_returns_401(
        self, async_client: AsyncClient
    ) -> None:
        """Request without Authorization header returns 401, not 403."""
        resp = await async_client.get("/api/v1/users/me")
        assert resp.status_code == 401

    async def test_superadmin_can_access_user_list(
        self, async_client: AsyncClient
    ) -> None:
        """Superadmin role grants access to /users endpoint."""
        from app.api.v1.auth.dependencies import get_auth_service
        from app.api.v1.auth.service import AuthService
        from unittest.mock import AsyncMock

        admin = _make_user(Role.superadmin, UserState.active)
        mock_svc = AsyncMock(spec=AuthService)
        mock_svc.list_users = AsyncMock(return_value=([], 0))
        mock_svc.repo = AsyncMock()
        mock_svc.repo.db = AsyncMock()

        app.dependency_overrides[get_auth_service] = lambda: mock_svc
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[require_active_user] = lambda: admin

        resp = await async_client.get(
            "/api/v1/users", headers={"Authorization": "Bearer admintoken"}
        )
        assert resp.status_code == 200
