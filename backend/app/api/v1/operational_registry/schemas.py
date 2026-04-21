from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator

VALID_SCHOOL_TYPES = {"public", "private", "unknown"}
VALID_EDUCATION_LEVELS = {"preschool", "primary_lower", "primary_upper", "secondary", "unknown"}
VALID_GENDERS = {"male", "female", "non_binary", "prefer_not_to_say"}
VALID_SOCIO_LEVELS = {"low", "medium", "high", "unknown"}
PII_BLACKLIST = {
    "nombre", "apellido", "name", "surname", "lastname", "dni", "rut", "cedula",
    "pasaporte", "passport", "curp", "ssn", "direccion", "address", "domicilio",
    "telefono", "phone", "celular", "email", "correo", "nacimiento", "birthdate",
    "foto", "photo", "imagen",
}


class ApiResponse(BaseModel):
    status: str
    message: str
    data: Any = None


class SubjectContextCreateRequest(BaseModel):
    school_type: str | None = None
    education_level: str | None = None
    age_cohort: str | None = None
    gender: str | None = None
    socioeconomic_level: str | None = None
    additional_attributes: dict | None = None

    @field_validator("school_type")
    @classmethod
    def v_school(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_SCHOOL_TYPES:
            raise ValueError(f"school_type inválido. Opciones: {', '.join(VALID_SCHOOL_TYPES)}")
        return v

    @field_validator("education_level")
    @classmethod
    def v_education(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_EDUCATION_LEVELS:
            opts = ", ".join(VALID_EDUCATION_LEVELS)
            raise ValueError(f"education_level inválido. Opciones: {opts}")
        return v

    @field_validator("gender")
    @classmethod
    def v_gender(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_GENDERS:
            raise ValueError(f"gender inválido. Opciones: {', '.join(VALID_GENDERS)}")
        return v

    @field_validator("socioeconomic_level")
    @classmethod
    def v_socio(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_SOCIO_LEVELS:
            opts = ", ".join(VALID_SOCIO_LEVELS)
            raise ValueError(f"socioeconomic_level inválido. Opciones: {opts}")
        return v

    @field_validator("additional_attributes")
    @classmethod
    def v_additional(cls, v: dict | None) -> dict | None:
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError("additional_attributes no puede tener más de 5 campos")
        for key, val in v.items():
            if len(key) > 50:
                raise ValueError(f"Clave '{key}' excede 50 caracteres")
            if key.lower() in PII_BLACKLIST:
                raise ValueError(f"Campo '{key}' no permitido (dato identificable)")
            if isinstance(val, str) and len(val) > 200:
                raise ValueError(f"Valor del campo '{key}' excede 200 caracteres")
        return v


class ApplicationCreateRequest(BaseModel):
    subject_id: uuid.UUID
    instrument_id: uuid.UUID
    application_date: date | None = None
    notes: str | None = None


class MetricValueItem(BaseModel):
    metric_id: uuid.UUID
    value: Any


class MetricValuesSubmitRequest(BaseModel):
    application_id: uuid.UUID
    values: list[MetricValueItem] = Field(..., min_length=1)
