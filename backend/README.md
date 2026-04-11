# Backend

Backend FastAPI del sistema.

## Requisitos

- Python 3.12
- `uv`

## Instalar uv

Linux/macOS:

```bash
curl -Ls https://astral.sh/uv/install.sh | sh
```

Windows (PowerShell):

```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Desarrollo rapido

```bash
cd backend
uv sync --all-groups
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Preparacion recomendada

```bash
cd backend
uv sync --all-groups
uv run pre-commit install
```

Si tienes la base de datos disponible, aplica migraciones:

```bash
cd backend
uv run alembic upgrade head
```

## Tests

```bash
cd backend
uv run pytest
```

## Calidad de codigo

```bash
cd backend
uv run ruff check .
uv run mypy .
```

## Plan inicial de desarrollo

Ver `backend/docs/PLAN_INICIAL_DESARROLLO.md`.

## Inicio rapido (10 minutos)

1. `uv sync --all-groups`
2. Levantar PostgreSQL + Redis + Keycloak (ver `deploy/k3s/`).
3. `uv run alembic upgrade head`
4. `uv run pytest -q`

## Referencias de contratos y despliegue

- Contratos mock: `mock/responses/MockContract_M1_Autenticacion_v2.xml`, `mock/responses/MockContract_M2_Gestion_Instrumentos_v2.xml`, `mock/responses/MockContract_M3_Metricas_v1.xml`, `mock/responses/MockContract_M4_RegistroOperativo_v1.xml`.
- Guia mock server: `mock/README.md`, `mock/GUIA_IMPLEMENTACION_MOCK_SERVER.md`, `mock/GUIA_DESPLIEGUE_MOCK_SERVER.md`.
- Despliegue K3s: `deploy/k3s/base/`, `deploy/k3s/overlays/mock/`, `deploy/k3s/overlays/real/`.
- Arquitectura: `docs/architecture/ARQUITECTURA_DESPLIEGUE.md`.

## Nota de despliegue

El despliegue de backend se realiza desde `deploy/k3s/` en el repositorio raiz.
Las credenciales y llaves se inyectan mediante Kubernetes Secrets.

Desde raiz tambien puedes usar:

```bash
make backend-install
make backend-dev
make backend-test
```
