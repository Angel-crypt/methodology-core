from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.exceptions import register_exception_handlers
from app.core.keycloak import KeycloakClient
from app.core.logging import configure_logging
from app.db.session import AsyncSessionLocal
from app.scheduler import SyncScheduler


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    scheduler = SyncScheduler(AsyncSessionLocal, KeycloakClient())
    await scheduler.start()
    yield
    await scheduler.stop()


app = FastAPI(title="methodology-backend", lifespan=lifespan)

configure_logging()
register_exception_handlers(app)
app.include_router(api_router, prefix="/api/v1")
