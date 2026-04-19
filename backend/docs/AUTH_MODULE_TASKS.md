# Módulo de Autenticación Backend — Guía de Desarrollo por Integrante

**Rama de trabajo:** `feature/backend/auth-module`  
**Fuente de verdad:** rama `dev` (ya mergeada en esta rama)  
**Fecha:** 2026-04-18  
**Stack:** Python 3.12 · FastAPI · SQLAlchemy 2.x async · PostgreSQL · Redis · Keycloak · PyJWT

---

## Contexto del sistema

El sistema **SPL** (Registro Metodológico de Métricas Lingüísticas) tiene cuatro módulos (M1–M4). Este documento cubre únicamente **M1: Autenticación y Control de Acceso**, que es el módulo base que desbloquea todo lo demás.

### Infraestructura (Docker / K3s)

El sistema corre en **tres contenedores de aplicación** más tres servicios de soporte:

| Contenedor | Imagen | Puerto |
|---|---|---|
| `methodology-backend` | FastAPI/Python | 8000 |
| `methodology-frontend` | React/Vite | (nginx) |
| `methodology-mock` | Express/Node.js | 3000 |
| PostgreSQL | postgres | 5432 |
| Redis | redis | 6379 |
| Keycloak | keycloak | 8080 |

Despliegue local de desarrollo: `make backend-dev` (uvicorn --reload).  
Despliegue K3s real: `make k3s-deploy-real` (requiere `kubectl` y secrets configurados).

### Mock server como referencia

El mock server (`mock/src/routes/m1.js`) ya implementa M1 en JavaScript/Express y es la **referencia exacta de comportamiento**. Antes de implementar cualquier endpoint, leer el handler correspondiente en el mock.

Diferencias clave mock → backend real:

| Aspecto | Mock (JS) | Backend real (Python) |
|---|---|---|
| researcher/applicator auth | password + bcrypt | Keycloak OIDC (Magic Link activa, luego OIDC) |
| superadmin auth | password + bcrypt | password propio (`POST /auth/login`) |
| Token storage | Map en memoria | `revoked_tokens` en PostgreSQL |
| Magic Link storage | Map con token raw | Solo hash SHA-256 en `magic_links` |
| Permisos cache | ninguno | Redis TTL 10 min |
| Sync Keycloak | ninguno | APScheduler in-process |

### Arquitectura del módulo

```
backend/app/
├── api/v1/auth/
│   ├── router.py         ← Endpoints HTTP (alphonse)
│   ├── service.py        ← Lógica de negocio (alphonse)
│   ├── repository.py     ← Acceso a datos (alphonse)
│   ├── dependencies.py   ← Dependencias FastAPI del módulo (alphonse)
│   └── schemas.py        ← [COMPLETADO] Pydantic v2
├── core/
│   ├── security.py       ← [DIEGO] JWT HS256 + cadena Zero Trust
│   ├── keycloak.py       ← [DIEGO] Admin client async
│   ├── encryption.py     ← [ALPHONSE] AES + HKDF
│   ├── audit.py          ← [COMPLETADO] log_event()
│   └── logging.py        ← [COMPLETADO] structlog JSON
├── cache/
│   └── permissions.py    ← [DIEGO] Redis cache
├── db/models/
│   ├── user.py           ← [COMPLETADO] User + Role + UserState
│   ├── magic_link.py     ← [COMPLETADO] MagicLink
│   ├── revoked_token.py  ← [COMPLETADO] RevokedToken
│   ├── audit_log.py      ← [COMPLETADO] AuditLog + AuditEvent
│   └── user_permission.py← [COMPLETADO] UserPermission
├── dependencies.py       ← [ALPHONSE] get_current_user, require_active_user
├── scheduler.py          ← [DIEGO] APScheduler sync Keycloak
└── migrations/versions/
    └── 0001_initial_auth_schema.py ← [COMPLETADO]
```

### Metodología obligatoria (ADR-019 — SDD + TDD)

Para cada endpoint:
1. Leer contrato XML → `mock/responses/MockContract_M1_Autenticacion_v2.xml`
2. Schema Pydantic derivado → ya en `auth/schemas.py`
3. Test en rojo primero → luego implementación mínima → luego refactor
4. `uv run ruff check .` y `uv run mypy .` sin errores antes de cada commit
5. Pre-commit instalado: `uv run pre-commit install`

### Principios de seguridad inamovibles

- **Zero Trust**: todo endpoint valida JWT → jti no revocado → `state=active` → rol → permisos
- **Anti-fingerprinting**: cualquier fallo de login retorna `401` con mensaje genérico idéntico
- **Magic Link**: solo hash SHA-256 en BD; token raw NUNCA se persiste ni aparece en logs
- **No PII en logs**: `structlog` JSON sin passwords, tokens completos ni datos sensibles
- **PyJWT**: no usar `python-jose` (CVE activos — ADR-008)
- **Soft delete**: estado `deleted`, nunca `DELETE` físico (ADR-013)
- **Envelope estándar**: toda respuesta `{ "status": "success|error", "message": "...", "data": {} }`

---

## Lo que ya está hecho (líder de backend)

### Tarea 1 — Modelos SQLAlchemy (`db/models/`)

Archivos completados y listos para usar:

**`db/models/user.py`** — Modelo `User` con:
- `id` (UUID v4, PK — de `BaseModelMixin`)
- `full_name`, `email` (único, indexado), `password_hash` (nullable — solo superadmin)
- `role: Role` (enum: `superadmin | researcher | applicator`)
- `state: UserState` (enum: `pending | active | disabled | deleted`)
- `broker_subject` — sub de Keycloak, vinculado en primer OIDC login
- `token_version` — incrementado en cambio de email para invalidar todas las sesiones
- `sync_pending` + `sync_retries` — para consistencia eventual con Keycloak
- `password_changed_at` — el middleware rechaza tokens con `iat` anterior a este timestamp
- `phone`, `institution`, `terms_accepted_at`, `onboarding_completed` — perfil extendido
- `deleted_at` — timestamp de soft-delete

**`db/models/magic_link.py`** — Modelo `MagicLink` con:
- `token_hash` (SHA-256 hex, 64 chars, único) — NUNCA el token raw
- `user_id` (FK → users.id, CASCADE)
- `expires_at`, `used_at` (NULL = no usado)
- Método helper `is_valid(now)` para validar en el service

**`db/models/revoked_token.py`** — Modelo `RevokedToken` con:
- `jti` (UUID, PK) — extraído del payload JWT
- `expires_at` — igual al `exp` del token (para limpieza por cron)
- `user_id` (FK nullable) — permite revocar todas las sesiones de un usuario

**`db/models/audit_log.py`** — Modelo `AuditLog` con:
- `AuditEvent` enum con 22 eventos cubiertos
- `user_id`, `project_id`, `dataset_id` (nullable)
- `ip`, `details` (sin PII)
- Índices en `user_id`, `event`, `timestamp`

**`db/models/user_permission.py`** — Modelo `UserPermission` con:
- `user_id` (FK → users.id)
- `mode` (`libre | restricted`)
- `education_levels` (ARRAY de strings)
- `subject_limit` (nullable entero positivo)

### Tarea 2 — Schemas Pydantic (`api/v1/auth/schemas.py`)

Todos los contratos de M1 traducidos a Pydantic v2. Clases disponibles:

| Schema | Propósito |
|---|---|
| `ApiResponse` | Envelope estándar `{status, message, data}` |
| `UserCreateRequest` | `POST /users` — valida email, prohíbe rol superadmin |
| `UserCreateResponse` | Respuesta 201 con `magic_link_token` (solo dev) |
| `UserListItem` / `UserListResponse` | `GET /users` paginado con meta |
| `UserDetailResponse` | `GET /users/:id` |
| `UserStatusUpdateRequest/Response` | `PATCH /users/:id/status` |
| `LoginRequest` / `TokenResponse` / `TokenUserInfo` | `POST /auth/login` |
| `MagicLinkGenerateResponse` | `POST /users/:id/magic-link` |
| `PasswordChangeRequest` | `PATCH /users/me/password` — valida que difieran |
| `PasswordRecoveryRequest` | `POST /auth/password-recovery` |
| `PasswordResetRequest` | `POST /auth/password-reset` |
| `UserProfileResponse` | `GET /users/me` |
| `UserProfileUpdateRequest` | `PATCH /users/me/profile` |
| `UserPermissionsRequest/Response` | `GET/PUT /users/:id/permissions` |
| `AuditLogEntry` / `AuditLogResponse` | `GET /audit-log` paginado |
| `SessionInfo` / `SessionListResponse` | `GET /users/me/sessions` |
| `EmailChangeRequest` | `POST /users/me/email-change-request` |
| `EmailChangeApproveRequest` | `PATCH /users/:id/email` |
| `OidcCallbackRequest` | `POST /auth/oidc/callback` |
| `ProfileConfigResponse/UpdateRequest` | `GET/PUT /superadmin/profile-config` |

### Tarea 3 — Migración Alembic (`migrations/versions/0001_initial_auth_schema.py`)

Migración inicial que crea las 5 tablas con todos sus índices y constraints:
- `users` con enums `user_role` y `user_state`
- `magic_links` con FK cascade
- `revoked_tokens` con índice en `expires_at` (limpieza por cron)
- `audit_logs` con enum `audit_event` e índices de consulta
- `user_permissions` con FK cascade

Para aplicar: `cd backend && uv run alembic upgrade head`  
Para revertir: `cd backend && uv run alembic downgrade -1`

---

## Tareas de Diego

> **Criterio de asignación:** menor cantidad de tareas, máxima complejidad técnica.

Diego implementa la infraestructura de seguridad y sincronización que todo lo demás consume. Sus archivos son dependencias directas del service y el router.

---

### D-1 · `core/security.py` — JWT + cadena de validación Zero Trust

**Archivo:** `backend/app/core/security.py`  
**Criterios relacionados:** CA-STATE-01, CA-STATE-02, CA-MAGIC-01  
**Referencia mock:** `mock/src/middleware/auth.js` (función `authMiddleware`)

#### Qué debe implementar

El archivo actual tiene dos funciones stub vacías. Reemplazarlas con implementación completa:

```python
# Funciones requeridas mínimas:

def create_access_token(
    user_id: uuid.UUID,
    role: str,
    token_version: int,
    expires_seconds: int = settings.jwt_expire_seconds,
) -> tuple[str, uuid.UUID]:
    """
    Emite JWT HS256 firmado con el secret de /run/secrets/jwt_secret.
    Payload: { sub, role, token_version, jti (UUID único), iat, exp }.
    Retorna (token_str, jti) para que el caller pueda registrar la sesión.
    NUNCA incluir datos personales en el payload.
    """

def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodifica y valida firma JWT.
    Raises jwt.PyJWTError si firma inválida o expirado.
    """

def read_jwt_secret() -> str:
    """
    Lee el secret desde /run/secrets/jwt_secret (Kubernetes Secret).
    Fallback a settings.jwt_secret si el archivo no existe (desarrollo local).
    En producción: si se detecta el default 'mock-jwt-secret-*', exit(1).
    """
```

#### Lógica de validación Zero Trust (para `app/dependencies.py`)

La cadena de validación que Diego debe exponer como utilidades para que Alfonso implemente las dependencias FastAPI:

```
1. Firma JWT válida (PyJWT) → 401 si falla
2. jti no está en revoked_tokens (query a DB) → 401 si revocado
3. user.state == 'active' → 403 USER_DISABLED o 403 USER_DELETED si no
4. token_version del JWT == user.token_version en DB → 401 si difieren
   (invalida todas las sesiones tras cambio de email)
5. Si password_changed_at del user > iat del token → 401 SESSION_INVALIDATED
   (invalida sesiones anteriores al cambio de contraseña)
6. Rol del token tiene permiso para el endpoint → 403 si no
```

> **Importante:** El paso 5 solo aplica a superadmin (único rol con password). Researcher/applicator no tienen password_changed_at relevante porque usan OIDC.

#### Detalles técnicos

- **Algoritmo:** HS256 (ADR-008, PyJWT — prohibido `python-jose`)
- **TTL:** `settings.jwt_expire_seconds` (default 21600 = 6h)
- **`jti`:** `uuid.uuid4()` generado en `create_access_token`
- **Secret:** leer desde `/run/secrets/jwt_secret`; si no existe, usar `settings.jwt_secret` (variable de entorno). En producción, si el secret tiene el valor default de desarrollo → `sys.exit(1)` (GAP-SEG-02 del contrato)
- **`pwd_changed_at` en payload:** incluir como Unix timestamp si `user.password_changed_at` no es None

#### Tests requeridos

Archivo: `tests/integration/auth/test_token.py`

```
- test_create_token_has_required_fields (sub, role, jti, iat, exp, token_version)
- test_decode_valid_token_returns_payload
- test_decode_expired_token_raises_error
- test_decode_tampered_token_raises_error
- test_revoked_token_rejected_in_middleware
- test_stale_token_version_rejected (after email change)
- test_stale_iat_rejected_after_password_change
```

---

### D-2 · `core/keycloak.py` — Cliente admin Keycloak async

**Archivo:** `backend/app/core/keycloak.py`  
**Criterios relacionados:** CA-SYNC-01, CA-SYNC-02, CA-SYNC-03  
**Referencia:** `backend/app/config.py` (settings: `keycloak_url`, `keycloak_realm`, `keycloak_client_id`, `keycloak_client_secret`)

#### Qué debe implementar

El archivo actual tiene `KeycloakClient` con dos métodos stub. Expandirlo:

```python
class KeycloakClient:
    """
    Cliente async para la Admin REST API de Keycloak.
    Patrón: backend primero (DB), Keycloak después (consistencia eventual).
    Si Keycloak falla: marcar sync_pending=True en el User, no hacer rollback.
    """

    async def get_admin_token(self) -> str:
        """Obtiene access_token del realm master para operaciones admin."""

    async def create_user(
        self,
        user_id: uuid.UUID,
        email: str,
        full_name: str,
    ) -> str:
        """
        Crea usuario en Keycloak (deshabilitado).
        Retorna el keycloak_id interno.
        No vincula broker_subject aquí — se vincula en primer OIDC login.
        """

    async def enable_user(self, keycloak_id: str) -> None:
        """Activa usuario en Keycloak (state → active)."""

    async def disable_user(self, keycloak_id: str) -> None:
        """Desactiva usuario en Keycloak (state → disabled)."""

    async def delete_user(self, keycloak_id: str) -> None:
        """Soft-delete en Keycloak (disable, no borrar para trazabilidad)."""

    async def update_email(self, keycloak_id: str, new_email: str) -> None:
        """
        Cambia email en Keycloak.
        Invalidar sesiones activas del usuario en Keycloak también.
        """

    async def link_broker_subject(
        self,
        user_id: uuid.UUID,
        broker_subject: str,
        db: AsyncSession,
    ) -> None:
        """
        Vincula keycloak_sub al user_id en la primera autenticación OIDC.
        Actualiza User.broker_subject en DB.
        """
```

#### Política de reintentos

```python
async def _call_with_retry(self, coro, max_retries: int = 3) -> Any:
    """
    Backoff exponencial: 1s → 2s → 4s → tope configurable.
    Si todos los reintentos fallan: raise KeycloakSyncError.
    El caller debe marcar sync_pending=True y sync_retries += 1 en DB.
    """
```

#### Detalles técnicos

- **Biblioteca HTTP:** `httpx.AsyncClient` (ya disponible como dependencia transitiva de fastapi/httpx)
- **Admin API base:** `{settings.keycloak_url}/admin/realms/{settings.keycloak_realm}/users`
- **Token endpoint:** `{settings.keycloak_url}/realms/master/protocol/openid-connect/token`
- **Client credentials:** `keycloak_client_id` + `keycloak_client_secret` (leído de archivo o settings)
- **Timeout:** 5s por request
- **Error handling:** capturar `httpx.HTTPStatusError` y `httpx.TimeoutException`; no dejar que Keycloak falle la operación de negocio principal

#### OIDC Callback — verificación de token de Keycloak

El endpoint `POST /auth/oidc/callback` recibe un `code` del frontend. El cliente Keycloak debe:

```python
async def exchange_code(self, code: str, redirect_uri: str) -> OidcTokenData:
    """
    Intercambia authorization_code por tokens OIDC.
    Extrae: sub (broker_subject), email, email_verified.
    Endpoint: {keycloak_url}/realms/{realm}/protocol/openid-connect/token
    """
```

#### Tests requeridos

Archivo: `tests/integration/auth/test_keycloak_sync.py`  
Usar `unittest.mock.AsyncMock` para mockear llamadas HTTP:

```
- test_create_user_in_keycloak_success
- test_keycloak_failure_marks_sync_pending_true (CA-SYNC-01)
- test_retry_on_sync_pending_users (CA-SYNC-02)
- test_max_retries_exceeded_logs_audit_error (CA-SYNC-03)
```

---

### D-3 · `cache/permissions.py` + `scheduler.py` — Redis cache y APScheduler

**Archivos:** `backend/app/cache/permissions.py` + `backend/app/scheduler.py`  
**Criterios relacionados:** CA-ACCESS-02, CA-ACCESS-03, CA-ACCESS-04, CA-SYNC-02  
**ADR:** ADR-010 (APScheduler in-process), ADR-011 (Redis TTL 10 min)

#### `cache/permissions.py` — Cache de permisos con Redis

El archivo tiene 3 funciones stub. Implementarlas completas:

```python
import redis.asyncio as aioredis

async def get_cached_permissions(
    redis_client: aioredis.Redis,
    user_id: uuid.UUID,
) -> dict[str, Any] | None:
    """
    Lee permisos de Redis. Clave: 'perms:{user_id}'.
    Retorna dict parseado o None si cache miss.
    """

async def set_cached_permissions(
    redis_client: aioredis.Redis,
    user_id: uuid.UUID,
    permissions: dict[str, Any],
    ttl: int = settings.permissions_cache_ttl_seconds,
) -> None:
    """
    Guarda permisos en Redis con TTL (default 600s).
    Serializar con json.dumps.
    """

async def invalidate_cached_permissions(
    redis_client: aioredis.Redis,
    user_id: uuid.UUID,
) -> None:
    """
    Borra la clave 'perms:{user_id}'.
    Llamar en: cambio de rol, cambio de permisos por SUPERADMIN (CA-ACCESS-04).
    """

async def get_redis_client() -> AsyncGenerator[aioredis.Redis, None]:
    """
    FastAPI dependency: yield cliente Redis desde settings.redis_url.
    Cerrar la conexión al salir.
    """
```

#### Flujo de autorización completo (integra con `app/dependencies.py` de Alfonso)

```
request entrante
  → validar JWT (security.py)
  → validar jti no revocado (DB)
  → validar user.state == active (DB)
  → buscar permisos en Redis [get_cached_permissions]
      → cache HIT: usar permisos cacheados (CA-ACCESS-02)
      → cache MISS: leer de DB, cachear resultado (CA-ACCESS-03)
  → validar rol/proyecto → continuar o 403
```

#### `scheduler.py` — APScheduler sync con Keycloak

El `SyncScheduler` stub debe convertirse en un scheduler funcional:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

class SyncScheduler:
    def __init__(self, db_session_factory, keycloak_client: KeycloakClient):
        self._scheduler = AsyncIOScheduler()

    async def start(self) -> None:
        """
        Registrar jobs:
        1. sync_pending_users — cada settings.sync_interval_seconds (default 120s)
        2. cleanup_revoked_tokens — cada 10 min (elimina entradas con expires_at < NOW())
        Iniciar el scheduler.
        """

    async def stop(self) -> None:
        """Detener el scheduler al apagar la app (lifespan)."""

    async def _sync_pending_users(self) -> None:
        """
        Query: SELECT * FROM users WHERE sync_pending=True ORDER BY sync_retries ASC.
        Para cada uno: intentar sync con Keycloak.
          - Éxito: sync_pending=False, sync_retries=0, audit KEYCLOAK_SYNC_OK.
          - Fallo: sync_retries += 1.
          - Si sync_retries >= settings.sync_max_retries (default 5):
              audit KEYCLOAK_SYNC_FAILED nivel error (CA-SYNC-03).
        Backoff exponencial entre reintentos: min(2^retries, 3600) segundos.
        """

    async def _cleanup_revoked_tokens(self) -> None:
        """
        DELETE FROM revoked_tokens WHERE expires_at < NOW().
        Evita crecimiento ilimitado de la tabla.
        """
```

Integrar en `app/main.py` lifespan:

```python
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    scheduler = SyncScheduler(AsyncSessionLocal, KeycloakClient())
    await scheduler.start()
    yield
    await scheduler.stop()
```

#### Tests requeridos

Archivo: `tests/integration/auth/test_permissions_cache.py`

```
- test_permissions_served_from_cache_without_db_query (CA-ACCESS-02)
  → usar fakeredis para simular cache hit; verificar que DB no se consulta
- test_permissions_cached_after_db_fallback (CA-ACCESS-03)
  → cache miss → DB query → resultado cacheado en Redis
- test_permission_change_invalidates_cache (CA-ACCESS-04)
  → cambio de permisos por SUPERADMIN → cache borrado
- test_scheduler_retries_sync_pending_users (CA-SYNC-02)
- test_sync_failure_logged_after_max_retries (CA-SYNC-03)
```

---

## Tareas de Alfonso

> **Criterio de asignación:** mayor cantidad de tareas, todos los niveles de dificultad.

Alfonso implementa las capas de negocio completas: repository, service, router, dependencias y todos los tests de integración. Sus tareas tienen dependencias directas de los modelos (ya listos) y de los archivos de Diego.

**Orden de implementación recomendado:**
1. `auth/repository.py` (no depende de Diego)
2. `auth/service.py` (depende de repository)
3. `core/encryption.py` (independiente)
4. `app/dependencies.py` + `auth/dependencies.py` (depende de security.py de Diego)
5. `auth/router.py` (depende de todo lo anterior)
6. Tests en paralelo con cada capa

---

### A-1 · `api/v1/auth/repository.py` — Acceso a datos

**Archivo:** `backend/app/api/v1/auth/repository.py`  
**Depende de:** modelos en `db/models/` (ya completados)

El `AuthRepository` es la única capa que toca la base de datos directamente. Ninguna otra capa (service, router) debe importar `AsyncSession` para queries.

```python
class AuthRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Usuarios ──────────────────────────────────────────────────────────
    async def get_user_by_id(self, user_id: uuid.UUID) -> User | None: ...
    async def get_user_by_email(self, email: str) -> User | None: ...
    async def create_user(self, **kwargs) -> User: ...
    async def update_user_state(self, user_id: uuid.UUID, state: UserState) -> User: ...
    async def update_user_email(self, user_id: uuid.UUID, email: str) -> User: ...
    async def increment_token_version(self, user_id: uuid.UUID) -> None: ...
    async def set_sync_pending(self, user_id: uuid.UUID, pending: bool) -> None: ...
    async def list_users(
        self,
        state: UserState | None,
        role: Role | None,
        page: int,
        limit: int,
    ) -> tuple[list[User], int]: ...
    async def count_active_superadmins(self) -> int: ...
    async def list_users_with_sync_pending(self) -> list[User]: ...
    async def soft_delete_user(self, user_id: uuid.UUID) -> None: ...

    # ── Magic Links ───────────────────────────────────────────────────────
    async def save_magic_link(
        self, user_id: uuid.UUID, token_hash: str, expires_at: datetime
    ) -> MagicLink: ...
    async def get_magic_link_by_hash(self, token_hash: str) -> MagicLink | None: ...
    async def mark_magic_link_used(self, magic_link_id: uuid.UUID) -> None: ...
    async def invalidate_user_magic_links(self, user_id: uuid.UUID) -> None: ...

    # ── Tokens revocados ──────────────────────────────────────────────────
    async def revoke_token(
        self, jti: uuid.UUID, expires_at: datetime, user_id: uuid.UUID | None
    ) -> None: ...
    async def is_token_revoked(self, jti: uuid.UUID) -> bool: ...
    async def revoke_all_user_tokens(self, user_id: uuid.UUID) -> None: ...
    async def cleanup_expired_revoked_tokens(self) -> int: ...

    # ── Permisos ──────────────────────────────────────────────────────────
    async def get_user_permissions(self, user_id: uuid.UUID) -> UserPermission | None: ...
    async def upsert_user_permissions(
        self, user_id: uuid.UUID, **kwargs
    ) -> UserPermission: ...

    # ── Audit log ─────────────────────────────────────────────────────────
    async def list_audit_log(
        self,
        event: str | None,
        user_id: uuid.UUID | None,
        from_dt: datetime | None,
        to_dt: datetime | None,
        page: int,
        limit: int,
    ) -> tuple[list[AuditLog], int]: ...
```

**Notas importantes:**
- Todas las queries con `select()` de SQLAlchemy 2.x (no legacy `Query`)
- `await session.execute(select(...))` → `scalars().all()` o `scalar_one_or_none()`
- No usar `session.commit()` en el repository — el commit lo hace el service al final de la operación de negocio completa
- Usar `select().where().limit().offset()` para paginación

---

### A-2 · `api/v1/auth/service.py` — Lógica de negocio

**Archivo:** `backend/app/api/v1/auth/service.py`  
**Depende de:** `repository.py` (A-1), `core/security.py` (D-1 de Diego)

El service orquesta reglas de negocio. Es la capa más importante y la que implementa los criterios de aceptación del SRS.

```python
class AuthService:
    def __init__(
        self,
        repo: AuthRepository,
        keycloak: KeycloakClient,
        redis: aioredis.Redis,
    ):
        ...
```

#### Métodos requeridos

**`create_user(data: UserCreateRequest, actor_id: uuid.UUID) -> tuple[User, str]`**
- Validar email único → 409 si duplicado
- Crear `User` con `state=pending`, sin password_hash (usará OIDC)
- Generar Magic Link: `secrets.token_hex(32)` (32 bytes = 64 hex chars = 256 bits, CSPRNG OS)
- Calcular hash: `hashlib.sha256(token.encode()).hexdigest()`
- Persistir `MagicLink` con solo el hash (NUNCA el token en claro)
- Intentar crear usuario en Keycloak; si falla → `sync_pending=True`
- Audit: `USER_CREATED` + `MAGIC_LINK_GENERATED`
- Retornar `(user, token_raw)` — el token raw solo lo ve el caller; lo entrega por email

**`activate_magic_link(token_raw: str, ip: str) -> User`**
- Hash del token: `hashlib.sha256(token_raw.encode()).hexdigest()`
- Buscar en DB por hash → 410 si no existe o ya usado o expirado (CA-MAGIC-02, CA-MAGIC-03)
- Marcar `used_at = now()`
- Cambiar `user.state = active`
- Audit: `MAGIC_LINK_USED`

**`login(email: str, password: str, ip: str) -> TokenResponse`** (solo superadmin)
- Rate limiting: verificar intentos por `ip::email`
- Buscar usuario por email → si no existe: audit LOGIN_FAILED + 401 genérico (anti-fingerprinting)
- Verificar `bcrypt.checkpw(password, user.password_hash)` → 401 genérico si falla
- Verificar `user.state == active` → 401 genérico (no revelar que la cuenta existe)
- Crear JWT con `security.create_access_token()`
- Audit: `LOGIN`
- Retornar `TokenResponse`

**`oidc_callback(code: str, ip: str) -> TokenResponse`** (researcher/applicator)
- Intercambiar code por token OIDC via `keycloak_client.exchange_code()`
- Extraer `sub` (broker_subject) y `email`
- Buscar user por email; si no existe → 401 genérico
- Si `user.broker_subject` es None → primer login: vincular sub
- Si `user.broker_subject != sub` → 401 (sub mismatch, posible suplantación)
- Verificar `user.state == active` → 401
- Crear JWT propio y retornar

**`logout(jti: uuid.UUID, exp: datetime, user_id: uuid.UUID) -> None`**
- `repo.revoke_token(jti, exp, user_id)`
- Audit: `LOGOUT`

**`change_password(user_id: uuid.UUID, current_password: str, new_password: str) -> None`**
- Solo aplica a superadmin (los demás no tienen password)
- `bcrypt.checkpw(current, user.password_hash)` → 401 si falla
- `bcrypt.checkpw(new, user.password_hash)` → 400 si son iguales
- `new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=12))`
- Actualizar `password_hash`, `password_changed_at = now()`
- Audit: `PASSWORD_CHANGED`

**`update_user_status(user_id, new_state, actor_id) -> User`**
- No puede desactivarse a sí mismo (actor_id == user_id + desactivar → 403)
- Si desactivar y `count_active_superadmins() == 1` → 409 (protege el último admin)
- Si desactivar: `repo.revoke_all_user_tokens(user_id)` + invalidar cache Redis
- Audit: `USER_STATE_CHANGED`

**`regenerate_magic_link(user_id, actor_id) -> tuple[User, str]`**
- Invalidar magic links anteriores del usuario
- Generar nuevo token y hash
- Audit: `MAGIC_LINK_GENERATED`

**`approve_email_change(user_id, new_email, actor_id) -> User`**
- Validar email único → 409 si duplicado
- Actualizar email, `broker_subject = None`, `token_version += 1`
- `repo.revoke_all_user_tokens(user_id)` (invalida sesiones activas)
- Invalidar cache Redis de permisos
- Generar nuevo Magic Link (flujo de reactivación OIDC)
- Audit: `EMAIL_CHANGED`

---

### A-3 · `core/encryption.py` — Cifrado AES + HKDF

**Archivo:** `backend/app/core/encryption.py`  
**ADR:** ADR-012 — AES simétrico con claves HKDF derivadas por contexto  
**Criterios:** CA-ENC-01, CA-ENC-02, CA-ENC-03

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def _read_master_key() -> bytes:
    """
    Lee la clave maestra desde /run/secrets/master_key (Kubernetes Secret).
    Fallback a settings.master_key_secret_file.
    32 bytes mínimo (256 bits).
    """

def derive_dataset_key(context_id: str) -> bytes:
    """
    HKDF-SHA256 derivada desde master_key + info=context_id.
    La clave derivada NUNCA se persiste en DB ni Redis (CA-ENC-03).
    Retorna 32 bytes (AES-256).
    """

def encrypt_sensitive_value(plaintext: str, context_id: str) -> bytes:
    """
    AES-GCM: genera nonce de 12 bytes aleatorios.
    Retorna nonce + ciphertext concatenados.
    """

def decrypt_sensitive_value(ciphertext: bytes, context_id: str) -> str:
    """
    Separa nonce (12 bytes) + ciphertext.
    Si falla descifrado: loggear sin exponer detalle; raise EncryptionError.
    """
```

**Nota:** El cifrado aplica principalmente para datos en M4 (registros operativos), pero la infraestructura se construye en M1 para que M4 la reutilice.

---

### A-4 · `app/dependencies.py` + `api/v1/auth/dependencies.py` — Zero Trust FastAPI

**Archivos:**
- `backend/app/dependencies.py` — dependencias globales transversales
- `backend/app/api/v1/auth/dependencies.py` — dependencias específicas del módulo auth

**Depende de:** `core/security.py` (D-1 de Diego), `repository.py` (A-1)

```python
# app/dependencies.py

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis_client),
) -> User:
    """
    Implementa la cadena Zero Trust completa:
    1. decode_access_token(token) → 401 si firma inválida
    2. is_token_revoked(jti) → 401 si revocado
    3. get_user_by_id(sub) → 401 si no existe
    4. user.token_version == payload['token_version'] → 401 si difieren
    5. Si user.password_changed_at y payload.get('pwd_changed_at'):
           payload['pwd_changed_at'] < user.password_changed_at.timestamp() → 401
    6. user.state != deleted/disabled → 403 con código USER_DISABLED o USER_DELETED
    Raises:
      - UnauthorizedError → 401
      - ForbiddenError → 403
    """

async def require_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Alias semántico: garantiza state=active."""

def require_role(*roles: Role) -> Callable:
    """
    Factory de dependencia: verifica que el rol del usuario esté en roles.
    Ejemplo: Depends(require_role(Role.superadmin))
    """
```

**Whitelist de rutas públicas** (sin validación JWT):
- `GET /health`
- `POST /auth/login`
- `POST /auth/oidc/callback`
- `GET /auth/activate/{token}`
- `POST /auth/password-recovery`
- `POST /auth/password-reset`
- `GET /legal/terms`
- `GET /legal/privacy`

---

### A-5 · `api/v1/auth/router.py` — Endpoints HTTP completos

**Archivo:** `backend/app/api/v1/auth/router.py`  
**Referencia:** `mock/responses/MockContract_M1_Autenticacion_v2.xml`  
**Referencia de implementación:** `mock/src/routes/m1.js`

El router actual está vacío (solo `router = APIRouter()`). Implementar todos los endpoints del contrato:

#### Endpoints de autenticación

```python
# POST /auth/login — solo superadmin (password)
# Rate limiting: slowapi 5/minute por IP+email (settings.rate_limit_login)
@router.post("/auth/login", response_model=ApiResponse)

# POST /auth/logout — cualquier rol autenticado
@router.post("/auth/logout", dependencies=[Depends(require_active_user)])

# GET /auth/activate/{token} — público, redirige a /login
@router.get("/auth/activate/{token}")

# POST /auth/oidc/callback — researcher/applicator
@router.post("/auth/oidc/callback", response_model=ApiResponse)

# POST /auth/password-recovery — público
@router.post("/auth/password-recovery", response_model=ApiResponse)

# POST /auth/password-reset — público
@router.post("/auth/password-reset", response_model=ApiResponse)
```

#### Endpoints de usuarios

```python
# POST /users — solo superadmin
@router.post("/users", dependencies=[Depends(require_role(Role.superadmin))], status_code=201)

# GET /users — solo superadmin, paginado (max 50)
@router.get("/users", dependencies=[Depends(require_role(Role.superadmin))])

# GET /users/me — cualquier rol autenticado
@router.get("/users/me", dependencies=[Depends(require_active_user)])

# PATCH /users/me/profile
@router.patch("/users/me/profile", dependencies=[Depends(require_active_user)])

# PATCH /users/me/password — allowPending=True (único endpoint accesible en state=pending)
# Nota: NO usar require_active_user aquí — el usuario pending PUEDE cambiar su contraseña
@router.patch("/users/me/password", dependencies=[Depends(get_current_user)])

# POST /users/me/accept-terms
@router.post("/users/me/accept-terms", dependencies=[Depends(require_active_user)])

# POST /users/me/email-change-request
@router.post("/users/me/email-change-request", dependencies=[Depends(require_active_user)])

# GET /users/:id — solo superadmin
@router.get("/users/{user_id}", dependencies=[Depends(require_role(Role.superadmin))])

# PATCH /users/:id/status — solo superadmin
@router.patch("/users/{user_id}/status", dependencies=[Depends(require_role(Role.superadmin))])

# POST /users/:id/magic-link — solo superadmin
@router.post("/users/{user_id}/magic-link", dependencies=[Depends(require_role(Role.superadmin))])

# PATCH /users/:id/email — solo superadmin (aprobar cambio)
@router.patch("/users/{user_id}/email", dependencies=[Depends(require_role(Role.superadmin))])

# GET /users/email-change-requests — solo superadmin
@router.get("/users/email-change-requests", dependencies=[Depends(require_role(Role.superadmin))])

# DELETE /users/email-change-requests/:id — solo superadmin
@router.delete("/users/email-change-requests/{req_id}", dependencies=[Depends(require_role(Role.superadmin))])
```

#### Endpoints de sesiones y permisos

```python
# GET /users/me/sessions
@router.get("/users/me/sessions", dependencies=[Depends(require_active_user)])

# GET /users/:id/sessions — solo superadmin
@router.get("/users/{user_id}/sessions", dependencies=[Depends(require_role(Role.superadmin))])

# GET /users/sessions — todas las sesiones activas (superadmin)
@router.get("/users/sessions", dependencies=[Depends(require_role(Role.superadmin))])

# DELETE /sessions/:jti — revocar sesión propia
@router.delete("/sessions/{jti}", dependencies=[Depends(require_active_user)])

# GET /users/:id/permissions
@router.get("/users/{user_id}/permissions", dependencies=[Depends(require_role(Role.superadmin))])

# PUT /users/:id/permissions
@router.put("/users/{user_id}/permissions", dependencies=[Depends(require_role(Role.superadmin))])
```

#### Otros endpoints

```python
# GET /audit-log — solo superadmin
@router.get("/audit-log", dependencies=[Depends(require_role(Role.superadmin))])

# GET /superadmin/profile-config — cualquier autenticado
@router.get("/superadmin/profile-config", dependencies=[Depends(require_active_user)])

# PUT /superadmin/profile-config — solo superadmin
@router.put("/superadmin/profile-config", dependencies=[Depends(require_role(Role.superadmin))])

# Documentos legales (públicos)
@router.get("/legal/terms")
@router.get("/legal/privacy")
```

> **Nota crítica:** El `api_router` en `app/api/v1/router.py` monta `auth_router` con prefix `/auth`. Los endpoints de `/users`, `/sessions` y `/audit-log` **no tienen** prefix `/auth`. Habrá que ajustar el montaje o usar dos sub-routers dentro del módulo auth (uno para `/auth` y otro sin prefix). Revisar `app/api/v1/router.py` y coordinarse con el líder.

---

### A-6 · Tests de integración completos

**Archivos:** `tests/integration/auth/`  
**Dependencias:** `tests/conftest.py` (async_client fixture ya existe)

#### `test_magic_link.py` — CA-MAGIC-01..04

```python
- test_magic_link_activates_pending_user          # CA-MAGIC-01
- test_magic_link_returns_410_on_second_use       # CA-MAGIC-02 (ya stub)
- test_magic_link_returns_410_when_expired        # CA-MAGIC-03 (ya stub)
- test_magic_link_stored_as_hash_only             # CA-MAGIC-04
```

#### `test_login_logout.py` — login, logout, estados

```python
- test_superadmin_login_success
- test_login_returns_401_for_wrong_password       # anti-fingerprinting: mismo 401
- test_login_returns_401_for_inactive_user        # mismo 401 genérico
- test_login_returns_401_for_unknown_email        # mismo 401 genérico
- test_logout_revokes_token
- test_revoked_token_rejected_on_subsequent_request
```

#### `test_rbac.py` — CA-STATE-01..03, CA-ACCESS-01

```python
- test_disabled_user_returns_403_on_any_request   # CA-STATE-01
- test_deleted_user_returns_403_on_any_request    # CA-STATE-02
- test_researcher_cannot_access_superadmin_endpoint
- test_applicator_denied_access_to_unassigned_project   # CA-ACCESS-01
- test_pending_user_blocked_except_change_password
```

#### `test_rate_limit.py`

```python
- test_5_failed_logins_trigger_block
- test_block_returns_401_not_429               # anti-fingerprinting AD-08
- test_block_lifted_after_window
```

#### `test_audit_log.py` — CA-AUDIT-01..03

```python
- test_superadmin_action_produces_structured_log    # CA-AUDIT-01
- test_failed_login_logged_without_sensitive_data   # CA-AUDIT-02
- test_dataset_access_logged_with_context           # CA-AUDIT-03
```

#### `test_permissions_cache.py` — CA-ACCESS-02..04

```python
- test_permissions_served_from_cache_without_db_query   # CA-ACCESS-02
- test_permissions_cached_after_db_fallback             # CA-ACCESS-03
- test_permission_change_invalidates_cache              # CA-ACCESS-04
```

**Fixture recomendada para tests con BD:**

```python
# conftest.py — añadir:
@pytest.fixture
async def db_session():
    """AsyncSession contra PostgreSQL de test (aislada por transacción)."""
    async with AsyncSessionLocal() as session:
        async with session.begin():
            yield session
            await session.rollback()
```

Para tests sin BD real: usar `fakeredis.aioredis.FakeRedis()` para Redis y `unittest.mock.AsyncMock` para el repositorio.

---

## Checklist de salida (gate de calidad)

Antes de hacer merge a `dev`, verificar:

```bash
cd backend

# Lint y formato (ADR-003)
uv run ruff check .
uv run ruff format --check .

# Type checking (ADR-004)
uv run mypy .

# Tests (ADR-005)
uv run pytest -q

# Cobertura mínima 80% (pyproject.toml)
uv run coverage run -m pytest
uv run coverage report

# Migración aplicable (ADR-016)
uv run alembic upgrade head
uv run alembic downgrade -1
uv run alembic upgrade head
```

---

## Referencias rápidas

| Recurso | Ubicación |
|---|---|
| Contratos M1 | `mock/responses/MockContract_M1_Autenticacion_v2.xml` |
| Mock M1 completo | `mock/src/routes/m1.js` |
| BACKEND_SPEC | `backend/BACKEND_SPEC.md` |
| Criterios de aceptación | `backend/docs/ACCEPTANCE_CRITERIA.md` |
| Plan de desarrollo | `backend/docs/PLAN_INICIAL_DESARROLLO.md` |
| ADR-001..019 | `backend/docs/decisions/` |
| Gap analysis | `mock/gap_analysis.md` |
| Settings | `backend/app/config.py` |
| Modelos DB | `backend/app/db/models/` |
| Schemas Pydantic | `backend/app/api/v1/auth/schemas.py` |
| Migración inicial | `backend/migrations/versions/0001_initial_auth_schema.py` |
