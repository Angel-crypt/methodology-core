from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from app.api.v1.instruments.dependencies import get_instruments_service
from app.api.v1.instruments.schemas import ApiResponse, InstrumentCreateRequest, InstrumentResponse
from app.api.v1.instruments.service import InstrumentsService
from app.db.models.user import Role
from app.dependencies import require_role

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
