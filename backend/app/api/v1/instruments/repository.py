from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.instrument import Instrument


class InstrumentsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, instrument_id: uuid.UUID) -> Instrument | None:
        stmt = select(Instrument).where(
            Instrument.id == instrument_id, Instrument.deleted_at.is_(None)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_by_name(self, name: str) -> Instrument | None:
        stmt = select(Instrument).where(
            Instrument.name == name, Instrument.deleted_at.is_(None)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_instruments(
        self,
        is_active: bool | None = None,
        tags: list[str] | None = None,
    ) -> list[Instrument]:
        stmt = select(Instrument).where(Instrument.deleted_at.is_(None))
        if is_active is not None:
            stmt = stmt.where(Instrument.is_active == is_active)
        if tags:
            stmt = stmt.where(or_(*[Instrument.tags.contains([t.lower()]) for t in tags]))
        return list((await self.db.execute(stmt.order_by(Instrument.created_at.desc()))).scalars().all())

    async def get_all_tags(self) -> list[str]:
        rows = (await self.db.execute(
            select(Instrument.tags).where(Instrument.deleted_at.is_(None))
        )).scalars().all()
        all_tags: set[str] = set()
        for tag_array in rows:
            if tag_array:
                all_tags.update(tag_array)
        return sorted(all_tags)

    def _normalize_tags(self, raw: list) -> list[str]:
        seen: set[str] = set()
        result = []
        for t in raw:
            norm = str(t).strip().lower()
            if norm and norm not in seen:
                seen.add(norm)
                result.append(norm)
        return result

    async def create(self, **kwargs: object) -> Instrument:
        if "tags" in kwargs:
            kwargs["tags"] = self._normalize_tags(kwargs["tags"])  # type: ignore[arg-type]
        instrument = Instrument(**kwargs)
        self.db.add(instrument)
        await self.db.flush()
        return instrument

    async def update(self, instrument_id: uuid.UUID, **kwargs: object) -> Instrument | None:
        if "tags" in kwargs and kwargs["tags"] is not None:
            kwargs["tags"] = self._normalize_tags(kwargs["tags"])  # type: ignore[arg-type]
        stmt = (
            update(Instrument)
            .where(Instrument.id == instrument_id, Instrument.deleted_at.is_(None))
            .values(**kwargs)
            .returning(Instrument)
        )
        result = (await self.db.execute(stmt)).scalar_one_or_none()
        await self.db.flush()
        return result

    async def soft_delete(self, instrument_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Instrument)
            .where(Instrument.id == instrument_id)
            .values(deleted_at=func.now(), is_active=False)
        )
        await self.db.flush()
