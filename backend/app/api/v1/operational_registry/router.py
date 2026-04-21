from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.api.v1.operational_registry.dependencies import get_operational_service
from app.api.v1.operational_registry.schemas import (
    ApiResponse,
    ApplicationCreateRequest,
    MetricValuesSubmitRequest,
    SubjectContextCreateRequest,
)
from app.api.v1.operational_registry.service import OperationalRegistryService
from app.core.exceptions import AppError, NotFoundError
from app.db.models.user import Role, User
from app.dependencies import require_active_user, require_role

router = APIRouter()

_APPLICATOR_ROLES = (Role.applicator, Role.superadmin)


@router.post("/projects/{project_id}/subjects", response_model=ApiResponse, status_code=201,
             dependencies=[Depends(require_role(*_APPLICATOR_ROLES))])
async def create_subject(
    project_id: uuid.UUID,
    request: Request,
    service: OperationalRegistryService = Depends(get_operational_service),
    current_user: User = Depends(require_role(*_APPLICATOR_ROLES)),
) -> ApiResponse:
    body = await request.body()
    if body and body.strip() not in (b"", b"{}"):
        raise AppError("El cuerpo de la solicitud debe estar vacío", status_code=400)
    subject = await service.create_subject(project_id, current_user.id)
    await service.repo.db.commit()
    return ApiResponse(
        status="success", message="Sujeto creado",
        data={"id": str(subject.id), "project_id": str(project_id),
              "created_at": subject.created_at.isoformat()},
    )


@router.post("/subjects/{subject_id}/context", response_model=ApiResponse, status_code=201,
             dependencies=[Depends(require_role(*_APPLICATOR_ROLES))])
async def register_context(
    subject_id: uuid.UUID,
    body: SubjectContextCreateRequest,
    service: OperationalRegistryService = Depends(get_operational_service),
    current_user: User = Depends(require_role(*_APPLICATOR_ROLES)),
) -> ApiResponse:
    ctx = await service.register_context(subject_id, body, current_user.id)
    await service.repo.db.commit()
    return ApiResponse(status="success", message="Contexto registrado",
                       data={"id": str(ctx.id), "subject_id": str(subject_id)})


@router.get("/subjects/{subject_id}", response_model=ApiResponse,
            dependencies=[Depends(require_active_user)])
async def get_subject(
    subject_id: uuid.UUID,
    service: OperationalRegistryService = Depends(get_operational_service),
) -> ApiResponse:
    subject = await service.repo.get_subject(subject_id)
    if subject is None:
        raise NotFoundError("Sujeto no encontrado")
    ctx = await service.repo.get_context(subject_id)
    data: dict[str, Any] = {
        "id": str(subject.id),
        "project_id": str(subject.project_id) if subject.project_id else None,
        "created_at": subject.created_at.isoformat(),
        "context": None,
    }
    if ctx:
        data["context"] = {
            "school_type": ctx.school_type,
            "education_level": ctx.education_level,
            "age_cohort": ctx.age_cohort,
            "gender": ctx.gender,
            "socioeconomic_level": ctx.socioeconomic_level,
            "additional_attributes": ctx.additional_attributes,
        }
    return ApiResponse(status="success", message="OK", data=data)


@router.post("/applications", response_model=ApiResponse, status_code=201,
             dependencies=[Depends(require_role(*_APPLICATOR_ROLES))])
async def create_application(
    body: ApplicationCreateRequest,
    service: OperationalRegistryService = Depends(get_operational_service),
    current_user: User = Depends(require_role(*_APPLICATOR_ROLES)),
) -> ApiResponse:
    application = await service.create_application(body, current_user.id)
    await service.repo.db.commit()
    return ApiResponse(
        status="success", message="Aplicación registrada",
        data={"id": str(application.id), "subject_id": str(application.subject_id),
              "instrument_id": str(application.instrument_id)},
    )


@router.get("/applications/my", response_model=ApiResponse,
            dependencies=[Depends(require_role(*_APPLICATOR_ROLES))])
async def my_applications(
    service: OperationalRegistryService = Depends(get_operational_service),
    current_user: User = Depends(require_role(*_APPLICATOR_ROLES)),
) -> ApiResponse:
    applications = await service.get_my_applications(current_user.id)
    return ApiResponse(
        status="success", message="OK",
        data=[{"id": str(a.id), "subject_id": str(a.subject_id),
               "instrument_id": str(a.instrument_id),
               "created_at": a.created_at.isoformat()} for a in applications],
    )


@router.post("/metric-values", response_model=ApiResponse, status_code=201,
             dependencies=[Depends(require_role(*_APPLICATOR_ROLES))])
async def submit_metric_values(
    body: MetricValuesSubmitRequest,
    service: OperationalRegistryService = Depends(get_operational_service),
    current_user: User = Depends(require_role(*_APPLICATOR_ROLES)),
) -> ApiResponse:
    values = await service.submit_metric_values(body, current_user.id)
    await service.repo.db.commit()
    return ApiResponse(
        status="success", message="Valores capturados",
        data={"count": len(values), "application_id": str(body.application_id)},
    )
