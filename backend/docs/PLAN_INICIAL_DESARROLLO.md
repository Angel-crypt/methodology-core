# Plan inicial de desarrollo backend (M1 + base)

Documento operativo para iniciar el backend: pasos, criterios de aceptacion y pruebas.
Referencias clave: contratos mock y despliegue K3s.
Alcance: M1 auth + modelos base + migraciones + contratos + tests.

## Inicio rapido (10 minutos)

1. `uv sync --all-groups`
2. Levantar PostgreSQL + Redis + Keycloak (ver `deploy/k3s/`).
3. `uv run alembic upgrade head`
4. `uv run pytest -q`

## 0) Principios obligatorios (transversales)

- Zero Trust: todo endpoint valida JWT + rol + estado.
- Privacy by Design: no PII en Subject/Application/Export.
- K3s + Kubernetes Secrets como despliegue objetivo.
- Response envelope: `{status,message,data}`.
- TDD obligatorio: cada requisito empieza con test en rojo, luego implementacion minima, luego refactor.

## Referencias de contratos y despliegue

- Contratos mock: `mock/responses/MockContract_M1_Autenticacion_v2.xml`, `mock/responses/MockContract_M2_Gestion_Instrumentos_v2.xml`, `mock/responses/MockContract_M3_Metricas_v1.xml`, `mock/responses/MockContract_M4_RegistroOperativo_v1.xml`.
- Guia mock server: `mock/README.md`, `mock/GUIA_IMPLEMENTACION_MOCK_SERVER.md`, `mock/GUIA_DESPLIEGUE_MOCK_SERVER.md`.
- Despliegue K3s: `deploy/k3s/base/`, `deploy/k3s/overlays/mock/`, `deploy/k3s/overlays/real/`.
- Arquitectura: `docs/architecture/ARQUITECTURA_DESPLIEGUE.md`.

## 1) Preparacion del entorno

**Objetivo**: entorno listo para ejecutar tests y migraciones.

Pasos
1. Instalar dependencias: `uv sync --all-groups`.
2. Levantar servicios locales (PostgreSQL, Redis, Keycloak) segun `deploy/k3s/` o stack local equivalente.
3. Verificar variables/Secrets: JWT, master key, keycloak client secret.

Criterios de aceptacion
- `uv run pytest` ejecuta sin errores de entorno.
- `uv run alembic upgrade head` aplica migraciones sin fallar.

Pruebas
- `uv run pytest -q` (debe iniciar).
- `uv run alembic upgrade head`.

## 2) Modelos base (M1 + entidades minimas)

**Objetivo**: definir modelos y enums base para M1 y relaciones necesarias por M2-M4.

Entidades minimas
- `User` (user_id, email, role, organization, state, broker_subject, created_at).
- `MagicLink` (token_hash, expires_at, used_at).
- `RevokedToken` (jti, expires_at).
- `Project`, `ProjectMember`, `Dataset` (para permisos por proyecto).

Pasos
1. Definir enums: `Role` (superadmin/researcher/applicator), `UserState` (PENDING/ACTIVE/DISABLED/DELETED).
2. Implementar modelos SQLAlchemy async.
3. Actualizar `app/db/base.py` para metadata.

Criterios de aceptacion
- Modelos reflejan SRS M1 (roles y estados correctos).
- Indices y constraints basicos (email unico, FK coherentes).

Pruebas
- Tests unitarios de modelos (creacion, constraints) en `tests/unit/test_models.py`.

## 3) Migraciones

**Objetivo**: esquema de BD reproducible.

Pasos
1. Crear migracion inicial con Alembic.
2. Verificar que todas las tablas se crean con constraints y enums.

Criterios de aceptacion
- `alembic upgrade head` crea todas las tablas necesarias.
- `alembic downgrade -1` revierte sin errores.

Pruebas
- `uv run alembic upgrade head`.
- `uv run alembic downgrade -1`.

## 4) Contratos y schemas

**Objetivo**: contratos de entrada/salida y validacion Pydantic.

Pasos
1. Convertir contratos del SRS a schemas Pydantic en `app/api/v1/auth/schemas.py`.
2. Alinear con response envelope estandar.
3. Crear contract tests en `tests/contract/test_contracts.py`.

Criterios de aceptacion
- Schema valida roles/estados correctos.
- Contract tests fallan si cambia el contrato sin actualizar schema.

Pruebas
- `uv run pytest tests/contract -q`.

## 5) Seguridad base (JWT + RBAC)

**Objetivo**: middleware y utilidades de seguridad.

Pasos
1. Implementar `core/security.py` (create/decode JWT).
2. Implementar `dependencies.py` (get_current_user, require_active_user).
3. RBAC centralizado (matriz de permisos).

Criterios de aceptacion
- Token HS256 con `jti`, exp 6h.
- Usuario DISABLED/DELETED -> 403.
- Rol sin permiso -> 403.

Pruebas
- `tests/integration/auth/test_rbac.py`.
- `tests/integration/auth/test_token.py`.

## 6) M1 Auth endpoints (minimo viable)

**Objetivo**: endpoints funcionales de auth segun SRS.

Endpoints minimos
- `POST /api/v1/users` (SUPERADMIN crea usuario, Magic Link).
- `GET /api/v1/auth/activate/:token` (activa sin JWT, redirige a /login).
- `POST /api/v1/auth/login` (emite JWT para researcher/applicator via OIDC).
- `POST /api/v1/auth/logout` (revoca jti).

Criterios de aceptacion
- Magic Link solo hash en DB.
- Activacion sin JWT, redirige a `/login`.
- Logout inserta jti en revoked_tokens.
- Rate limiting en login.

Pruebas
- `tests/integration/auth/test_magic_link.py`.
- `tests/integration/auth/test_login_logout.py`.
- `tests/integration/auth/test_rate_limit.py`.

## 7) Cache permisos + audit log (M1 base)

**Objetivo**: cache y auditoria basica para seguridad.

Pasos
1. Implementar cache de permisos con Redis.
2. Implementar audit log para eventos de auth.

Criterios de aceptacion
- Cache hit evita query a DB.
- Audit log registra login/logout y eventos de Magic Link.

Pruebas
- `tests/integration/auth/test_permissions_cache.py`.
- `tests/integration/auth/test_audit_log.py`.

## 8) Gate de calidad

**Objetivo**: asegurar que el minimo viable cumple calidad.

Criterios de aceptacion
- `uv run ruff check .` sin errores.
- `uv run mypy .` sin errores.
- Coverage >= 80%.

Pruebas
- `uv run pytest`.
- `uv run coverage run -m pytest`.
- `uv run coverage report`.
