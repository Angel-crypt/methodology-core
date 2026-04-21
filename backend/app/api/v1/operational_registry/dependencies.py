from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.instruments.repository import InstrumentsRepository
from app.api.v1.metrics.repository import MetricsRepository
from app.api.v1.operational_registry.repository import OperationalRegistryRepository
from app.api.v1.operational_registry.service import OperationalRegistryService
from app.db.session import get_db
from app.dependencies import get_redis_client


def get_operational_service(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis_client),
) -> OperationalRegistryService:
    return OperationalRegistryService(
        OperationalRegistryRepository(db),
        InstrumentsRepository(db),
        MetricsRepository(db),
        redis,
    )
