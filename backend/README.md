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

## Nota de despliegue

El despliegue de backend se realiza desde `deploy/k3s/` en el repositorio raiz.
Las credenciales y llaves se inyectan mediante Kubernetes Secrets.

Desde raiz tambien puedes usar:

```bash
make backend-install
make backend-dev
make backend-test
```
