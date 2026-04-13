from __future__ import annotations

from fastapi import FastAPI

from app.api.v1.auth.router import router as auth_router

app = FastAPI(title="Sistema de Registro Metodológico de Métricas", version="1.0.0")

app.include_router(auth_router, prefix="/api/v1")
