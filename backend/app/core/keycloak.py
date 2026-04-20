from __future__ import annotations

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


class KeycloakClient:
    """
    HTTP client for the Keycloak Admin REST API.
    All methods degrade gracefully — callers set sync_pending=True on failure
    instead of crashing (eventual consistency, BACKEND_SPEC §5).
    """

    async def _get_admin_token(self) -> str:
        import httpx

        url = (
            f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
            "/protocol/openid-connect/token"
        )
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.keycloak_client_id,
                    "client_secret": settings.keycloak_client_secret,
                },
            )
            resp.raise_for_status()
            return str(resp.json()["access_token"])

    async def create_user(self, email: str, full_name: str) -> str | None:
        """Creates a user in Keycloak. Returns the Keycloak user id, or None on failure."""
        try:
            import httpx

            token = await self._get_admin_token()
            url = f"{settings.keycloak_url}/admin/realms/{settings.keycloak_realm}/users"
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "email": email,
                        "username": email,
                        "firstName": full_name,
                        "enabled": True,
                        "emailVerified": False,
                    },
                )
                if resp.status_code == 201:
                    location = resp.headers.get("Location", "")
                    return location.split("/")[-1] if location else None
                logger.warning("keycloak.create_user.status", status=resp.status_code)
                return None
        except Exception as exc:
            logger.warning("keycloak.create_user.failed", error=str(exc))
            return None

    async def disable_user(self, broker_subject: str) -> bool:
        """Disables a user in Keycloak. Returns True on success."""
        return await self._set_enabled(broker_subject, enabled=False)

    async def enable_user(self, broker_subject: str) -> bool:
        """Enables a user in Keycloak. Returns True on success."""
        return await self._set_enabled(broker_subject, enabled=True)

    async def _set_enabled(self, broker_subject: str, *, enabled: bool) -> bool:
        try:
            import httpx

            token = await self._get_admin_token()
            url = (
                f"{settings.keycloak_url}/admin/realms/{settings.keycloak_realm}"
                f"/users/{broker_subject}"
            )
            async with httpx.AsyncClient() as client:
                resp = await client.put(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    json={"enabled": enabled},
                )
                return resp.status_code in (200, 204)
        except Exception as exc:
            logger.warning("keycloak.set_enabled.failed", error=str(exc), enabled=enabled)
            return False

    async def exchange_code(self, code: str) -> dict[str, str]:
        """
        Exchanges an OIDC authorization code for user claims.
        Returns {"sub": ..., "email": ...}. Raises on failure.
        """
        import httpx
        import jwt as pyjwt

        url = (
            f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
            "/protocol/openid-connect/token"
        )
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.keycloak_client_id,
                    "client_secret": settings.keycloak_client_secret,
                },
            )
            resp.raise_for_status()
            id_token: str = resp.json().get("id_token", "")

        claims: dict[str, object] = pyjwt.decode(
            id_token, options={"verify_signature": False}
        )
        return {
            "sub": str(claims.get("sub", "")),
            "email": str(claims.get("email", "")),
        }
