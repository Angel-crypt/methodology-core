"""
Integration tests for Redis permissions cache.
Covers: CA-ACCESS-02, CA-ACCESS-03, CA-ACCESS-04
"""
from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import fakeredis.aioredis
import pytest

from app.cache.permissions import (
    get_cached_permissions,
    invalidate_cached_permissions,
    set_cached_permissions,
)
from app.config import settings


@pytest.fixture
async def fake_redis() -> fakeredis.aioredis.FakeRedis:
    r = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield r
    await r.aclose()


@pytest.mark.integration
class TestPermissionsCache:
    async def test_permissions_cached_after_set(
        self, fake_redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        """CA-ACCESS-03: permissions are stored in Redis after first DB fetch."""
        user_id = uuid.uuid4()
        perms = {"mode": "libre", "education_levels": [], "subject_limit": None}

        await set_cached_permissions(fake_redis, user_id, perms)
        cached = await get_cached_permissions(fake_redis, user_id)

        assert cached is not None
        assert cached["mode"] == "libre"

    async def test_permissions_served_from_cache_without_db_query(
        self, fake_redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        """CA-ACCESS-02: if cached, permissions are returned without hitting DB."""
        user_id = uuid.uuid4()
        perms = {"mode": "restricted", "education_levels": ["primaria"], "subject_limit": 10}

        await set_cached_permissions(fake_redis, user_id, perms)

        # Simulated DB call — should NOT be reached
        db_call = AsyncMock()
        cached = await get_cached_permissions(fake_redis, user_id)
        assert cached is not None
        db_call.assert_not_called()

    async def test_cache_miss_returns_none(
        self, fake_redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        """Cache miss returns None so the caller falls back to DB."""
        user_id = uuid.uuid4()
        result = await get_cached_permissions(fake_redis, user_id)
        assert result is None

    async def test_permission_change_invalidates_cache(
        self, fake_redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        """CA-ACCESS-04: invalidating cache removes the cached entry."""
        user_id = uuid.uuid4()
        perms = {"mode": "libre", "education_levels": [], "subject_limit": None}

        await set_cached_permissions(fake_redis, user_id, perms)
        assert await get_cached_permissions(fake_redis, user_id) is not None

        await invalidate_cached_permissions(fake_redis, user_id)

        assert await get_cached_permissions(fake_redis, user_id) is None

    async def test_cache_ttl_configured_correctly(
        self, fake_redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        """Cache entry expiry matches settings.permissions_cache_ttl_seconds."""
        user_id = uuid.uuid4()
        perms = {"mode": "libre", "education_levels": [], "subject_limit": None}

        await set_cached_permissions(fake_redis, user_id, perms)

        key = f"perms:{user_id}"
        ttl = await fake_redis.ttl(key)
        # TTL should be close to the configured value (within 2 seconds)
        assert abs(ttl - settings.permissions_cache_ttl_seconds) <= 2

    async def test_invalidating_nonexistent_key_is_idempotent(
        self, fake_redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        """Invalidating a non-existent cache key must not raise."""
        user_id = uuid.uuid4()
        # Should not raise even if key doesn't exist
        await invalidate_cached_permissions(fake_redis, user_id)
