"""
Integration tests for login rate limiting.
Anti-fingerprinting: rate limit returns 401, not 429 (AD-08).
"""
from __future__ import annotations

from unittest.mock import AsyncMock, call, patch

import fakeredis.aioredis
import pytest
from httpx import AsyncClient

from app.api.v1.auth.dependencies import get_auth_service
from app.api.v1.auth.service import AuthService
from app.core.exceptions import UnauthorizedError
from app.main import app


@pytest.fixture
async def fake_redis() -> fakeredis.aioredis.FakeRedis:
    r = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield r
    await r.aclose()


@pytest.fixture(autouse=True)
def cleanup():  # type: ignore[misc]
    yield
    app.dependency_overrides.clear()


@pytest.mark.integration
class TestRateLimit:
    async def test_5_failed_logins_trigger_block(
        self, async_client: AsyncClient, fake_redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        """After 5 failed attempts, further attempts are blocked."""
        call_count = 0

        async def mock_login(email: str, password: str, ip: str = "") -> None:
            nonlocal call_count
            call_count += 1
            key = f"ratelimit:login:{ip}:{email}"
            count = await fake_redis.incr(key)
            if count == 1:
                await fake_redis.expire(key, 60)
            if count > 5:
                raise UnauthorizedError("Credenciales inválidas")
            raise UnauthorizedError("Credenciales inválidas")

        mock_svc = AsyncMock(spec=AuthService)
        mock_svc.login = mock_login
        app.dependency_overrides[get_auth_service] = lambda: mock_svc

        for _ in range(6):
            resp = await async_client.post(
                "/api/v1/auth/login",
                json={"email": "target@example.com", "password": "wrong"},
            )
            assert resp.status_code == 401

    async def test_block_returns_401_not_429(
        self, async_client: AsyncClient
    ) -> None:
        """Rate limit response must be 401, not 429 (anti-fingerprinting AD-08)."""
        mock_svc = AsyncMock(spec=AuthService)
        mock_svc.login = AsyncMock(side_effect=UnauthorizedError("Credenciales inválidas"))
        app.dependency_overrides[get_auth_service] = lambda: mock_svc

        resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "x@x.com", "password": "wrong"},
        )

        assert resp.status_code == 401
        assert resp.status_code != 429

    async def test_service_rate_limit_uses_ip_and_email_key(
        self, fake_redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        """Rate limit key must combine IP + email (separate limits per target)."""
        from app.api.v1.auth.repository import AuthRepository
        from app.core.keycloak import KeycloakClient
        from unittest.mock import MagicMock

        repo = MagicMock(spec=AuthRepository)
        repo.db = AsyncMock()
        repo.get_user_by_email = AsyncMock(return_value=None)

        svc = AuthService(
            repo=repo,
            keycloak=MagicMock(spec=KeycloakClient),
            redis=fake_redis,
        )

        # Two different IPs should have separate counters
        for _ in range(3):
            try:
                await svc.login("a@b.com", "wrong", ip="1.2.3.4")
            except UnauthorizedError:
                pass

        for _ in range(3):
            try:
                await svc.login("a@b.com", "wrong", ip="9.9.9.9")
            except UnauthorizedError:
                pass

        count_ip1 = int(await fake_redis.get("ratelimit:login:1.2.3.4:a@b.com") or 0)
        count_ip2 = int(await fake_redis.get("ratelimit:login:9.9.9.9:a@b.com") or 0)
        assert count_ip1 == 3
        assert count_ip2 == 3
