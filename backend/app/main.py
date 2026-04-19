from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # TODO: añadir APScheduler en esta fase de implementación
    yield


app = FastAPI(title="methodology-backend", lifespan=lifespan)

configure_logging()
register_exception_handlers(app)
app.include_router(api_router, prefix="/api/v1")
