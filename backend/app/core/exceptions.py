from __future__ import annotations

from typing import cast

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "No autenticado", status_code: int = 401) -> None:
        super().__init__(message, status_code)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Acceso no permitido", status_code: int = 403) -> None:
        super().__init__(message, status_code)


class NotFoundError(AppError):
    def __init__(self, message: str = "Recurso no encontrado", status_code: int = 404) -> None:
        super().__init__(message, status_code)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflicto", status_code: int = 409) -> None:
        super().__init__(message, status_code)


async def app_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    app_error = cast(AppError, exc)
    return JSONResponse(
        status_code=app_error.status_code,
        content={"status": "error", "message": app_error.message, "data": None},
    )


async def http_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    http_error = cast(HTTPException, exc)
    return JSONResponse(
        status_code=http_error.status_code,
        content={"status": "error", "message": str(http_error.detail), "data": None},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
