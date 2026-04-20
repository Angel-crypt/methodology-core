from __future__ import annotations

import json
import uuid

import redis.asyncio as aioredis

from app.config import settings

_PREFIX = "perms:"


def _key(user_id: uuid.UUID) -> str:
    return f"{_PREFIX}{user_id}"


async def get_cached_permissions(
    redis: aioredis.Redis,
    user_id: uuid.UUID,
) -> dict[str, object] | None:
    raw = await redis.get(_key(user_id))
    if raw is None:
        return None
    return json.loads(raw)  # type: ignore[no-any-return]


async def set_cached_permissions(
    redis: aioredis.Redis,
    user_id: uuid.UUID,
    permissions: dict[str, object],
) -> None:
    await redis.setex(
        _key(user_id),
        settings.permissions_cache_ttl_seconds,
        json.dumps(permissions),
    )


async def invalidate_cached_permissions(
    redis: aioredis.Redis,
    user_id: uuid.UUID,
) -> None:
    await redis.delete(_key(user_id))
