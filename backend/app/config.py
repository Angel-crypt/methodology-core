from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "methodology-backend"
    app_env: str = "development"
    app_port: int = 8000
    log_level: str = "INFO"

    database_url: str = Field(
        default="postgresql+asyncpg://methodology:change_me@postgres:5432/methodology"
    )

    jwt_algorithm: str = "HS256"
    jwt_expire_seconds: int = 21600
    jwt_secret_file: str = "/run/secrets/jwt_secret"

    keycloak_url: str = "http://keycloak:8080"
    keycloak_realm: str = "methodology"
    keycloak_client_id: str = "backend"
    keycloak_client_secret: str = "change_me"

    magic_link_ttl_seconds: int = 86400
    redis_url: str = "redis://redis:6379/0"
    permissions_cache_ttl_seconds: int = 600

    sync_interval_seconds: int = 120
    sync_max_retries: int = 5

    cors_allow_origins: str = "http://localhost:5173"
    rate_limit_login: str = "5/minute"

    master_key_secret_file: str = "/run/secrets/master_key"


settings = Settings()
