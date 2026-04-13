from __future__ import annotations

import redis.asyncio as redis

from app.config import settings


class LoginRateLimiter:
    """
    Contador de intentos FALLIDOS de login por IP.  (Tarea 2.2)

    Lógica:
      - Cada fallo incrementa un contador en Redis con TTL de 60 segundos.
      - Al llegar a MAX_ATTEMPTS se crea una clave de bloqueo con TTL de 5 min.
      - Si la IP está bloqueada se devuelve 401 genérico (no 429).
      - Un login exitoso resetea el contador.
    """

    MAX_ATTEMPTS: int = 5
    WINDOW_SECONDS: int = 60       # ventana de conteo
    BLOCK_SECONDS: int = 300       # duración del bloqueo (5 min)

    def __init__(self) -> None:
        self._redis: redis.Redis = redis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )

    # ------------------------------------------------------------------
    # Consulta
    # ------------------------------------------------------------------

    async def is_blocked(self, ip: str) -> bool:
        """True si la IP está actualmente bloqueada."""
        return bool(await self._redis.exists(f"login_blocked:{ip}"))

    # ------------------------------------------------------------------
    # Registro de resultado
    # ------------------------------------------------------------------

    async def record_failure(self, ip: str) -> bool:
        """
        Registra un intento fallido.
        Devuelve True si este intento activa el bloqueo.
        """
        attempts_key = f"login_attempts:{ip}"
        block_key = f"login_blocked:{ip}"

        count = await self._redis.incr(attempts_key)
        if count == 1:
            # Primera falla: iniciar ventana de 60 s
            await self._redis.expire(attempts_key, self.WINDOW_SECONDS)

        if count >= self.MAX_ATTEMPTS:
            await self._redis.setex(block_key, self.BLOCK_SECONDS, "1")
            await self._redis.delete(attempts_key)
            return True  # bloqueo activado

        return False

    async def record_success(self, ip: str) -> None:
        """Limpia el contador al hacer login exitoso."""
        await self._redis.delete(f"login_attempts:{ip}")

    # ------------------------------------------------------------------
    # Cierre
    # ------------------------------------------------------------------

    async def close(self) -> None:
        await self._redis.aclose()


login_rate_limiter = LoginRateLimiter()
