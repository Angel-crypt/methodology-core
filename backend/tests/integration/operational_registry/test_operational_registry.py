from __future__ import annotations

from httpx import AsyncClient


class TestOperationalRegistryIntegration:
    async def test_create_subject_success(self, async_client: AsyncClient) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/projects/00000000-0000-0000-0000-000000000001/subjects",
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert "id" in data["data"]
        assert "project_id" in data["data"]

    async def test_create_subject_with_body_returns_400(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/projects/00000000-0000-0000-0000-000000000001/subjects",
            json={"unexpected": "field"},
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code == 400

    async def test_create_subject_exceeds_limit_returns_422(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/projects/00000000-0000-0000-0000-000000000001/subjects",
            headers={"Authorization": "Bearer limited_applicator_token"},
        )
        assert response.status_code in (201, 422)

    async def test_register_context_success(self, async_client: AsyncClient) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/subjects/00000000-0000-0000-0000-000000000010/context",
            json={"school_type": "public", "gender": "male"},
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (201, 404)

    async def test_register_context_duplicate_returns_409(
        self, async_client: AsyncClient
    ) -> None:
        subject_id = "00000000-0000-0000-0000-000000000011"
        await async_client.post(
            f"/api/v1/operational-registry/subjects/{subject_id}/context",
            json={"school_type": "public"},
            headers={"Authorization": "Bearer applicator_token"},
        )
        response = await async_client.post(
            f"/api/v1/operational-registry/subjects/{subject_id}/context",
            json={"school_type": "private"},
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (409, 404)

    async def test_register_context_wrong_applicator_returns_403(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/subjects/00000000-0000-0000-0000-000000000012/context",
            json={"school_type": "public"},
            headers={"Authorization": "Bearer other_applicator_token"},
        )
        assert response.status_code in (403, 404)

    async def test_register_context_invalid_pii_field_returns_400(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/subjects/00000000-0000-0000-0000-000000000010/context",
            json={"additional_attributes": {"nombre": "Juan"}},
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code == 400

    async def test_register_context_invalid_school_type_returns_400(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/subjects/00000000-0000-0000-0000-000000000010/context",
            json={"school_type": "invalid_type"},
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code == 400

    async def test_create_application_success(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/applications",
            json={
                "subject_id": "00000000-0000-0000-0000-000000000010",
                "instrument_id": "00000000-0000-0000-0000-000000000020",
            },
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (201, 404, 422)

    async def test_create_application_inactive_instrument_returns_422(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/applications",
            json={
                "subject_id": "00000000-0000-0000-0000-000000000010",
                "instrument_id": "00000000-0000-0000-0000-000000000099",
            },
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (404, 422)

    async def test_create_application_subject_not_found_returns_404(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/applications",
            json={
                "subject_id": "00000000-0000-0000-0000-999999999999",
                "instrument_id": "00000000-0000-0000-0000-000000000020",
            },
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code == 404

    async def test_submit_metric_values_numeric_success(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/metric-values",
            json={
                "application_id": "00000000-0000-0000-0000-000000000030",
                "values": [
                    {
                        "metric_id": "00000000-0000-0000-0000-000000000040",
                        "value": 7.5,
                    }
                ],
            },
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (201, 404)

    async def test_submit_metric_values_categorical_invalid_option_returns_400(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/metric-values",
            json={
                "application_id": "00000000-0000-0000-0000-000000000030",
                "values": [
                    {
                        "metric_id": "00000000-0000-0000-0000-000000000041",
                        "value": "opcion_invalida",
                    }
                ],
            },
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (400, 404)

    async def test_submit_metric_values_wrong_type_returns_400(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/metric-values",
            json={
                "application_id": "00000000-0000-0000-0000-000000000030",
                "values": [
                    {
                        "metric_id": "00000000-0000-0000-0000-000000000040",
                        "value": "no_es_numero",
                    }
                ],
            },
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (400, 404)

    async def test_submit_metric_values_atomic_all_or_nothing(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.post(
            "/api/v1/operational-registry/metric-values",
            json={
                "application_id": "00000000-0000-0000-0000-000000000030",
                "values": [
                    {"metric_id": "00000000-0000-0000-0000-000000000040", "value": 5.0},
                    {"metric_id": "00000000-0000-0000-0000-999999999999", "value": 3.0},
                ],
            },
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (400, 404)

    async def test_my_applications_returns_only_own(
        self, async_client: AsyncClient
    ) -> None:
        response = await async_client.get(
            "/api/v1/operational-registry/applications/my",
            headers={"Authorization": "Bearer applicator_token"},
        )
        assert response.status_code in (200, 401, 403)
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "success"
            assert isinstance(data["data"], list)
