from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.auth.router import router as auth_router
from app.api.v1.instruments.router import router as instruments_router
from app.api.v1.metrics.router import router as metrics_router
from app.api.v1.operational_registry.router import router as operational_registry_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="", tags=["auth"])
api_router.include_router(instruments_router, prefix="/instruments", tags=["instruments"])
api_router.include_router(metrics_router, prefix="/metrics", tags=["metrics"])
api_router.include_router(
    operational_registry_router,
    prefix="/operational-registry",
    tags=["operational-registry"],
)
