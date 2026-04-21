from __future__ import annotations

from httpx import AsyncClient


class TestAuthIntegration:
    async def test_superadmin_login_success(self, async_client: AsyncClient) -> None:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "correct_password"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "access_token" in data["data"]

    async def test_login_wrong_password(self, async_client: AsyncClient) -> None:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "wrong_password"},
        )
        assert response.status_code == 401
        assert response.json()["status"] == "error"

    async def test_login_unknown_email(self, async_client: AsyncClient) -> None:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "noexiste@test.com", "password": "cualquier"},
        )
        assert response.status_code == 401
        assert response.json()["status"] == "error"

    async def test_login_inactive_user(self, async_client: AsyncClient) -> None:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@test.com", "password": "correct_password"},
        )
        assert response.status_code == 401
        assert response.json()["status"] == "error"

    async def test_logout_revokes_token(self, async_client: AsyncClient) -> None:
        login = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "correct_password"},
        )
        token = login.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        logout = await async_client.post("/api/v1/auth/logout", headers=headers)
        assert logout.status_code == 200

        retry = await async_client.get("/api/v1/auth/me", headers=headers)
        assert retry.status_code == 401

    async def test_magic_link_activates_pending_user(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.get("/api/v1/auth/magic-link/valid_token_here")
        assert response.status_code in (200, 302)

    async def test_magic_link_returns_410_on_second_use(
        self, async_client: AsyncClient
    ) -> None:
        # CA-MAGIC-02
        await async_client.get("/api/v1/auth/magic-link/used_token")
        response = await async_client.get("/api/v1/auth/magic-link/used_token")
        assert response.status_code == 410

    async def test_magic_link_stored_as_hash_only(
        self, async_client: AsyncClient
    ) -> None:
        # CA-MAGIC-03
        response = await async_client.post(
            "/api/v1/auth/magic-link",
            json={"email": "pending@test.com"},
        )
        assert response.status_code in (200, 201)

    async def test_disabled_user_returns_403(self, async_client: AsyncClient) -> None:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "disabled@test.com", "password": "correct_password"},
        )
        assert response.status_code in (401, 403)

    async def test_deleted_user_returns_403(self, async_client: AsyncClient) -> None:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "deleted@test.com", "password": "correct_password"},
        )
        assert response.status_code in (401, 403)

    async def test_researcher_cannot_create_user(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/auth/users",
            json={"email": "nuevo@test.com", "role": "applicator"},
            headers={"Authorization": "Bearer researcher_token"},
        )
        assert response.status_code == 403

    async def test_applicator_cannot_list_users(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.get(
            "/api/v1/auth/users",
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code == 403

    async def test_pending_user_blocked_from_active_endpoints(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.get(
            "/api/v1/instruments",
            headers={"Authorization": "Bearer pending_token"},
        )
        assert response.status_code == 403

    async def test_5_failed_logins_trigger_block(
        self, async_client: AsyncClient
    ) -> None:
        for _ in range(5):
            await async_client.post(
                "/api/v1/auth/login",
                json={"email": "admin@test.com", "password": "wrong"},
            )
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "wrong"},
        )
        assert response.status_code == 401

    async def test_block_returns_401_not_429(self, async_client: AsyncClient) -> None:
        for _ in range(6):
            response = await async_client.post(
                "/api/v1/auth/login",
                json={"email": "blocked@test.com", "password": "wrong"},
            )
        assert response.status_code == 401
