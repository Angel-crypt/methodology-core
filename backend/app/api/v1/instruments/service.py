from __future__ import annotations

import uuid

from app.api.v1.instruments.repository import InstrumentsRepository
from app.api.v1.instruments.schemas import InstrumentCreateRequest, InstrumentUpdateRequest
from app.core.exceptions import ConflictError, NotFoundError
from app.db.models.instrument import Instrument


class InstrumentsService:
    def __init__(self, repo: InstrumentsRepository) -> None:
        self.repo = repo

    async def create_instrument(self, data: InstrumentCreateRequest) -> Instrument:
        if await self.repo.get_by_name(data.name) is not None:
            raise ConflictError("Ya existe un instrumento con ese nombre")
        return await self.repo.create(**data.model_dump())

    async def get_instrument(self, instrument_id: uuid.UUID) -> Instrument:
        instrument = await self.repo.get_by_id(instrument_id)
        if instrument is None:
            raise NotFoundError("Instrumento no encontrado")
        return instrument

    async def list_instruments(
        self, is_active: bool | None = None, tags: list[str] | None = None
    ) -> list[Instrument]:
        return await self.repo.list_instruments(is_active, tags)

    async def get_tags(self) -> list[str]:
        return await self.repo.get_all_tags()

    async def update_instrument(
        self, instrument_id: uuid.UUID, data: InstrumentUpdateRequest
    ) -> Instrument:
        await self.get_instrument(instrument_id)
        update_data = data.model_dump(exclude_none=True)
        if not update_data:
            return await self.get_instrument(instrument_id)
        if "name" in update_data:
            existing = await self.repo.get_by_name(update_data["name"])
            if existing is not None and existing.id != instrument_id:
                raise ConflictError("Ya existe un instrumento con ese nombre")
        result = await self.repo.update(instrument_id, **update_data)
        if result is None:
            raise NotFoundError("Instrumento no encontrado")
        return result

    async def update_status(self, instrument_id: uuid.UUID, is_active: bool) -> Instrument:
        await self.get_instrument(instrument_id)
        result = await self.repo.update(instrument_id, is_active=is_active)
        if result is None:
            raise NotFoundError("Instrumento no encontrado")
        return result

    async def delete_instrument(self, instrument_id: uuid.UUID) -> None:
        await self.get_instrument(instrument_id)
        await self.repo.soft_delete(instrument_id)
