from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.instruments.repository import InstrumentsRepository
from app.api.v1.instruments.service import InstrumentsService
from app.db.session import get_db


def get_instruments_service(db: AsyncSession = Depends(get_db)) -> InstrumentsService:
    return InstrumentsService(InstrumentsRepository(db))
