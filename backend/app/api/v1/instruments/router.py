from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query

from app.api.v1.instruments.dependencies import get_instruments_service
from app.api.v1.instruments.schemas import (
    ApiResponse, InstrumentCreateRequest, InstrumentResponse, InstrumentUpdateRequest,
)
from app.api.v1.instruments.service import InstrumentsService
from app.db.models.user import Role
from app.dependencies import require_active_user, require_role

router = APIRouter()


@router.post("", response_model=ApiResponse, status_code=201,
             dependencies=[Depends(require_role(Role.superadmin))])
async def create_instrument(
    body: InstrumentCreateRequest,
    service: InstrumentsService = Depends(get_instruments_service),
) -> ApiResponse:
    instrument = await service.create_instrument(body)
    await service.repo.db.commit()
    await service.repo.db.refresh(instrument)
    return ApiResponse(status="success", message="Instrumento creado",
                       data=InstrumentResponse.model_validate(instrument).model_dump())


@router.get("", response_model=ApiResponse, dependencies=[Depends(require_active_user)])
async def list_instruments(
    is_active: bool | None = None,
    tag: list[str] = Query(default=[]),
    service: InstrumentsService = Depends(get_instruments_service),
) -> ApiResponse:
    instruments = await service.list_instruments(is_active, tag or None)
    return ApiResponse(status="success", message="OK",
                       data=[InstrumentResponse.model_validate(i).model_dump() for i in instruments])


@router.get("/tags", response_model=ApiResponse, dependencies=[Depends(require_active_user)])
async def get_tags(service: InstrumentsService = Depends(get_instruments_service)) -> ApiResponse:
    return ApiResponse(status="success", message="OK", data=await service.get_tags())


@router.get("/{instrument_id}", response_model=ApiResponse,
            dependencies=[Depends(require_active_user)])
async def get_instrument(
    instrument_id: uuid.UUID,
    service: InstrumentsService = Depends(get_instruments_service),
) -> ApiResponse:
    instrument = await service.get_instrument(instrument_id)
    return ApiResponse(status="success", message="OK",
                       data=InstrumentResponse.model_validate(instrument).model_dump())


@router.patch("/{instrument_id}", response_model=ApiResponse,
              dependencies=[Depends(require_role(Role.superadmin))])
async def update_instrument(
    instrument_id: uuid.UUID,
    body: InstrumentUpdateRequest,
    service: InstrumentsService = Depends(get_instruments_service),
) -> ApiResponse:
    instrument = await service.update_instrument(instrument_id, body)
    await service.repo.db.commit()
    await service.repo.db.refresh(instrument)
    return ApiResponse(status="success", message="Instrumento actualizado",
                       data=InstrumentResponse.model_validate(instrument).model_dump())
