from __future__ import annotations

import uuid

import redis.asyncio as aioredis

from app.api.v1.instruments.repository import InstrumentsRepository
from app.api.v1.metrics.repository import MetricsRepository
from app.api.v1.operational_registry.repository import OperationalRegistryRepository
from app.api.v1.operational_registry.schemas import (
    ApplicationCreateRequest,
    MetricValuesSubmitRequest,
    SubjectContextCreateRequest,
)
from app.cache.permissions import get_cached_permissions
from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.db.models.application import Application
from app.db.models.metric_value import MetricValue
from app.db.models.subject import Subject
from app.db.models.subject_context import SubjectContext


class OperationalRegistryService:
    def __init__(
        self,
        repo: OperationalRegistryRepository,
        instruments_repo: InstrumentsRepository,
        metrics_repo: MetricsRepository,
        redis: aioredis.Redis,
    ) -> None:
        self.repo = repo
        self.instruments_repo = instruments_repo
        self.metrics_repo = metrics_repo
        self.redis = redis

    async def create_subject(
        self, project_id: uuid.UUID | None, applicator_id: uuid.UUID
    ) -> Subject:
        perms = await get_cached_permissions(self.redis, applicator_id)
        if perms and perms.get("subject_limit") is not None:
            count = await self.repo.count_subjects_by_applicator(applicator_id)
            if count >= perms["subject_limit"]:
                raise AppError("Límite de sujetos registrables alcanzado", status_code=422)
        return await self.repo.create_subject(project_id, applicator_id)

    async def register_context(
        self,
        subject_id: uuid.UUID,
        data: SubjectContextCreateRequest,
        applicator_id: uuid.UUID,
    ) -> SubjectContext:
        subject = await self.repo.get_subject(subject_id)
        if subject is None:
            raise NotFoundError("Sujeto no encontrado")
        if subject.created_by != applicator_id:
            raise ForbiddenError("No puedes registrar contexto para este sujeto")
        if await self.repo.get_context(subject_id) is not None:
            raise ConflictError("El contexto para este sujeto ya fue registrado")
        return await self.repo.create_context(subject_id, **data.model_dump(exclude_none=True))

    async def create_application(
        self, data: ApplicationCreateRequest, applicator_id: uuid.UUID
    ) -> Application:
        if await self.repo.get_subject(data.subject_id) is None:
            raise NotFoundError("Sujeto no encontrado")
        instrument = await self.instruments_repo.get_by_id(data.instrument_id)
        if instrument is None:
            raise NotFoundError("Instrumento no encontrado")
        if not instrument.is_active:
            raise AppError("El instrumento está inactivo", status_code=422)
        return await self.repo.create_application(
            subject_id=data.subject_id,
            instrument_id=data.instrument_id,
            applicator_id=applicator_id,
            application_date=data.application_date,
            notes=data.notes,
        )

    async def submit_metric_values(
        self, data: MetricValuesSubmitRequest, applicator_id: uuid.UUID
    ) -> list[MetricValue]:
        """Captura atómica: valida todos los valores antes de persistir cualquiera."""
        values_to_save: list[dict] = []
        for item in data.values:
            metric = await self.metrics_repo.get_by_id(item.metric_id)
            if metric is None:
                raise NotFoundError(f"Métrica {item.metric_id} no encontrada")
            value_dict: dict = {"metric_id": item.metric_id}
            if metric.metric_type == "numeric":
                if not isinstance(item.value, (int, float)):
                    raise AppError(f"'{metric.name}' requiere un valor numérico", status_code=400)
                value_dict["value_number"] = float(item.value)
            elif metric.metric_type == "boolean":
                if not isinstance(item.value, bool):
                    raise AppError(f"'{metric.name}' requiere true/false", status_code=400)
                value_dict["value_boolean"] = item.value
            else:
                if not isinstance(item.value, str):
                    raise AppError(f"'{metric.name}' requiere un string", status_code=400)
                if metric.metric_type == "categorical" and metric.options:
                    if item.value not in metric.options:
                        raise AppError(
                            f"Valor '{item.value}' inválido para '{metric.name}'. "
                            f"Opciones: {metric.options}", status_code=400,
                        )
                value_dict["value_text"] = item.value
            values_to_save.append(value_dict)
        return await self.repo.save_metric_values(data.application_id, values_to_save)

    async def get_my_applications(self, applicator_id: uuid.UUID) -> list[Application]:
        return await self.repo.list_applications_by_applicator(applicator_id)
