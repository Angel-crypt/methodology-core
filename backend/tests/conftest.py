from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def async_client() -> AsyncClient:  # type: ignore[misc]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def admin_user() -> dict[str, str]:
    return {"role": "admin", "user_id": "00000000-0000-0000-0000-000000000001"}


@pytest.fixture
def investigador_user() -> dict[str, str]:
    return {"role": "investigador", "user_id": "00000000-0000-0000-0000-000000000002"}


@pytest.fixture
def aplicador_user() -> dict[str, str]:
    return {"role": "aplicador", "user_id": "00000000-0000-0000-0000-000000000003"}
