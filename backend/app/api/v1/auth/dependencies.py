from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth.repository import AuthRepository
from app.api.v1.auth.service import AuthService
from app.core.keycloak import KeycloakClient
from app.db.session import get_db
from app.dependencies import get_redis_client

_keycloak_client = KeycloakClient()


def get_auth_repository(
    db: AsyncSession = Depends(get_db),
) -> AuthRepository:
    return AuthRepository(db)


def get_auth_service(
    repo: AuthRepository = Depends(get_auth_repository),
    redis: aioredis.Redis = Depends(get_redis_client),
) -> AuthService:
    return AuthService(repo=repo, keycloak=_keycloak_client, redis=redis)
