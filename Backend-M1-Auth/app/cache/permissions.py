from __future__ import annotations

import json

import redis.asyncio as redis

from app.config import settings


class PermissionsCache:
    """
    Cache de permisos en Redis.  (Tarea 2.3)

    Clave:  permissions:{user_id}:{project_id}
    Valor:  JSON con el dict de permisos
    TTL:    settings.permissions_cache_ttl_seconds  (por defecto)
    """

    def __init__(self):
        self._redis: redis.Redis = redis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )

    # ------------------------------------------------------------------
    # Lectura
    # ------------------------------------------------------------------

    async def get_permissions(
        self, user_id: str, project_id: str
    ) -> dict | None:
        key = f"permissions:{user_id}:{project_id}"
        data = await self._redis.get(key)
        return json.loads(data) if data else None

    # ------------------------------------------------------------------
    # Escritura
    # ------------------------------------------------------------------

    async def set_permissions(
        self,
        user_id: str,
        project_id: str,
        permissions: dict,
        ttl: int | None = None,
    ) -> None:
        key = f"permissions:{user_id}:{project_id}"
        ttl = ttl or settings.permissions_cache_ttl_seconds
        await self._redis.setex(key, ttl, json.dumps(permissions))

    # ------------------------------------------------------------------
    # Invalidación
    # ------------------------------------------------------------------

    async def invalidate_permissions(
        self, user_id: str, project_id: str | None = None
    ) -> None:
        if project_id:
            key = f"permissions:{user_id}:{project_id}"
            await self._redis.delete(key)
        else:
            # Invalida TODOS los proyectos del usuario de una sola vez
            keys = await self._redis.keys(f"permissions:{user_id}:*")
            if keys:
                await self._redis.delete(*keys)

    # ------------------------------------------------------------------
    # Cierre de conexión
    # ------------------------------------------------------------------

    async def close(self) -> None:
        await self._redis.aclose()


# ---------------------------------------------------------------------------
# Instancia singleton para reutilizar la conexión
# ---------------------------------------------------------------------------

permissions_cache = PermissionsCache()
