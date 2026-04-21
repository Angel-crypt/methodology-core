from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ApiResponse(BaseModel):
    status: str
    message: str
    data: Any = None


class InstrumentCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    methodological_description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] = Field(default_factory=list)
    min_days_between_applications: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def dates_coherent(self) -> "InstrumentCreateRequest":
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValueError("end_date debe ser posterior a start_date")
        return self


class InstrumentUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    methodological_description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] | None = None
    min_days_between_applications: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def dates_coherent(self) -> "InstrumentUpdateRequest":
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValueError("end_date debe ser posterior a start_date")
        return self


class InstrumentStatusRequest(BaseModel):
    is_active: bool


class InstrumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    methodological_description: str | None
    start_date: date | None
    end_date: date | None
    is_active: bool
    tags: list[str]
    min_days_between_applications: int
    created_at: datetime
    updated_at: datetime
