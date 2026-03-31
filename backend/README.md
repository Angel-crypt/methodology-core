# Backend

Guia rapida para levantar el backend localmente con **Docker o Podman**.

## 1) Requisitos previos

- Git
- Python 3.12
- `uv` instalado
- Docker o Podman instalado

## 2) Instalar uv

| Sistema operativo | Comando |
|---|---|
| Linux / macOS | `curl -Ls https://astral.sh/uv/install.sh | sh` |
| Windows (PowerShell) | `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"` |

### Linux / macOS

```bash
curl -Ls https://astral.sh/uv/install.sh | sh
```

### Windows (PowerShell)

```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## 3) Clonar el repositorio

```bash
git clone https://github.com/Angel-crypt/methodology-core.git
cd methodology-core
cd backend
```

## 4) Configurar entorno Python

```bash
uv sync --all-groups
uv run pre-commit install
cp .env.example .env
```

## 5) Levantar infraestructura (PostgreSQL + Keycloak)

Este proyecto define contenedores separados para:

1. `backend`
2. `postgres`
3. `keycloak`

### Opcion A: Docker

```bash
docker compose up -d
```

### Opcion B: Podman

Si tu sistema expone `docker compose` via provider de Podman, usa:

```bash
docker compose up -d
```

Si falla por credenciales, usa directamente podman-compose:

```bash
podman-compose up -d
```

## 6) Migraciones

```bash
uv run alembic upgrade head
```

## 7) Ejecutar API

Si ya levantaste `backend` con Docker/Podman, la API ya esta corriendo en `:8000`.

Si prefieres correr la API local (fuera de contenedor), levanta solo infraestructura y luego FastAPI:

```bash
# Solo infraestructura
podman-compose up -d postgres keycloak
# o
docker compose up -d postgres keycloak

# API local
uv run fastapi dev app/main.py
```

Tambien puedes correr todo en contenedores:

```bash
podman-compose up -d
# o
docker compose up -d
```

API disponible en:

- `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`

## 8) Ejecutar tests

```bash
uv run pytest
```

Nota: en este scaffold hay tests con `NotImplementedError` por diseno TDD, por lo que fallos iniciales son esperados.

## 9) Comandos utiles

```bash
# Formato y lint
uv run ruff format .
uv run ruff check .

# Type checking
uv run mypy .

# Apagar contenedores
docker compose down
# o
podman-compose down
```

## 10) Troubleshooting (Podman)

Si `docker compose up -d` falla con error similar a `docker-credential-secretservice`:

1. Ejecuta con `podman-compose up -d`.
2. O ajusta la configuracion de credenciales del cliente Docker/Podman en tu entorno local.

Si el contenedor backend arranca y sale por problemas del entorno virtual dentro de imagen:

- reconstruye limpio:

```bash
podman-compose down
podman-compose up -d --build --force-recreate
```

- este repositorio incluye `.dockerignore` para evitar sobreescribir `/app/.venv` de la imagen con el `.venv` local.

## 11) Verificacion rapida

```bash
# Estado de contenedores
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# o
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar docs de FastAPI
curl -I http://127.0.0.1:8000/docs

# Ver logs del backend
podman logs methodology-backend --tail 100
# o
docker logs methodology-backend --tail 100

# Apagar stack
podman-compose down
# o
docker compose down
```
