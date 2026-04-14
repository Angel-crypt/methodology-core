from __future__ import annotations

import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 6

    MAGIC_LINK_TTL_SECONDS: int = 86400

    KEYCLOAK_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "methodology"
    KEYCLOAK_CLIENT_ID: str = "methodology-api"

    @property
    def keycloak_client_secret(self) -> str:
        path = Path(self.keycloak_client_secret_file)
        if path.exists():
            return path.read_text().strip()
        return ""


settings = Settings()

KEYCLOAK_CLIENT_SECRET_FILE = os.environ.get(
    "KEYCLOAK_CLIENT_SECRET_FILE",
    "keycloak-client-secret.txt",
)