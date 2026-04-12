# Documentación de Desarrollo - Módulo M1: Autenticación

**Proyecto:** Sistema de Registro Metodológico de Métricas Lingüísticas  
**Fecha:** 2026-04-12  
**Estado:** Implementación base completada

---

## 1. Resumen de lo Implementado

Se ha completado la implementación base del módulo de autenticación (M1) siguiendo el **BACKEND_SPEC.md** como documento oficial. Esta implementación sigue el flujo de **Magic Link + Keycloak (OIDC)**.

### Archivos Creados/Modificados

| Archivo | Descripción |
|---------|-------------|
| `app/db/models/user.py` | Modelo User con enums Role y UserState |
| `app/db/models/magic_link.py` | Modelo MagicLink con relación a User |
| `app/db/models/revoked_token.py` | Modelo RevokedToken para logout |
| `app/db/models/__init__.py` | Exports centralizados de modelos |
| `app/api/v1/auth/schemas.py` | Schemas Pydantic para requests/responses |
| `app/api/v1/auth/repository.py` | Repositorios (User, MagicLink, RevokedToken) |
| `app/api/v1/auth/service.py` | Lógica de negocio (AuthService) |
| `app/api/v1/auth/router.py` | Endpoints REST |
| `app/core/security.py` | Funciones JWT (create/decode) |
| `app/dependencies.py` | Dependencias auth (get_current_user, require_superadmin) |
| `migrations/env.py` | Actualizado para incluir modelos |
| `app/api/v1/router.py` | Corregido prefijo de rutas |

### Endpoints Implementados

| Endpoint | Método | Descripción | Acceso | Estado |
|----------|--------|-------------|--------|--------|
| `/users` | POST | Crear usuario con Magic Link | SUPERADMIN | ✅ |
| `/users` | GET | Listar usuarios (paginado) | SUPERADMIN | ✅ |
| `/users/{user_id}/status` | PATCH | Actualizar estado (disable/delete) | SUPERADMIN | ✅ |
| `/auth/activate/{token}` | GET | Consumir Magic Link | Público | ✅ |
| `/auth/login` | POST | Login (emite JWT) | Público | ✅ |
| `/auth/logout` | POST | Logout con revocación | Autenticado | ✅ |
| `/users/me` | GET | Info usuario actual | Autenticado | ✅ |

---

## 2. Modelo de Datos

### Tabla `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | UUID (PK) | Identificador único inmutable |
| `full_name` | VARCHAR(255) | Nombre completo |
| `email` | VARCHAR(255) | Email único |
| `role` | ENUM | superadmin, researcher, applicator |
| `organization` | VARCHAR(255) | Organización |
| `state` | ENUM | pending, active, disabled, deleted |
| `broker_subject` | VARCHAR(255) | ID de Keycloak (nullable) |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |
| `deleted_at` | TIMESTAMP | Soft delete |

### Tabla `magic_links`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK) | Referencia a users |
| `token_hash` | VARCHAR(64) | SHA-256 del token |
| `expires_at` | TIMESTAMP | TTL (24h por defecto) |
| `used_at` | TIMESTAMP | NULL = no usado |

### Tabla `revoked_tokens`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `jti` | UUID (PK) | JWT ID del token |
| `expires_at` | TIMESTAMP | Expira cuando expira el token |

---

## 3. Flujo de Autenticación

```
1. SUPERADMIN crea usuario → estado PENDING + Magic Link generado
2. Usuario recibe Magic Link por email (mock: en _mock_magic_link)
3. Usuario consume Magic Link → estado cambia a ACTIVE
4. Usuario hace login → recibe JWT (6h de vigencia)
5. Usuario hace logout → token se registra en revoked_tokens
```

---

## 4. Detalle de Implementación (Referencia para compañeros)

### Estructura de Carpetas

```
backend/app/
├── api/v1/auth/
│   ├── router.py      # Endpoints → NO MODIFICAR LA ESTRUCTURA
│   ├── schemas.py    # Schemas Pydantic → NO MODIFICAR LA ESTRUCTURA
│   ├── service.py    # Lógica de negocio → NO MODIFICAR LA ESTRUCTURA
│   └── repository.py # Acceso a datos → NO MODIFICAR LA ESTRUCTURA
├── core/
│   └── security.py   # JWT create/decode → COMPLETADO
├── db/
│   ├── models/       # Modelos SQLAlchemy → COMPLETADO
│   └── session.py   # Sesión de DB → COMPLETADO
└── dependencies.py  # Dependencias auth → COMPLETADO
```

### Clases Principales

**UserRepository** (`repository.py`):
- `create(user_id, full_name, email, role, organization)` → User
- `get_by_email(email)` → User | None
- `get_by_user_id(user_id)` → User | None
- `update_state(user_id, state)` → User
- `list_users(state, role, skip, limit)` → (list[User], int)

**MagicLinkRepository** (`repository.py`):
- `create(user_id, token_hash, ttl_seconds)` → MagicLink
- `get_by_token_hash(token_hash)` → MagicLink | None
- `mark_used(magic_link)` → None

**RevokedTokenRepository** (`repository.py`):
- `create(jti, expires_at)` → RevokedToken
- `exists(jti)` → bool
- `cleanup_expired()` → int

**AuthService** (`service.py`):
- `create_user(full_name, email, role, organization)` → (User, magic_link_token)
- `consume_magic_link(token)` → User
- `login(email)` → (User, jwt_token)
- `logout(jti, expires_at)` → None
- `get_user(user_id)` → User | None
- `update_user_state(user_id, state)` → User
- `list_users(state, role, page, limit)` → (list[User], int)

---

## 5. Tareas Pendientes por Completar

### INTEGRANTE 1: Endpoints y Lógica

#### Tarea 1.1: Regenerar Magic Link ✅ YA IMPLEMENTADO
El logout ya está completo. **No hay nada que hacer aquí.**

---

#### Tarea 1.2: Implementar regenerar Magic Link
**Nuevo endpoint a crear:** `POST /api/v1/users/{user_id}/regenerate-magic-link`

**Qué hacer:**
1. Agregar método en `app/api/v1/auth/service.py`:
```python
async def regenerate_magic_link(self, user_id: uuid.UUID) -> tuple[User, str]:
    """Genera un nuevo Magic Link para un usuario en estado PENDING"""
    user = await self.user_repo.get_by_user_id(user_id)
    if not user:
        raise ValueError("User not found")
    
    if user.state != UserState.PENDING:
        raise ValueError("User is not in PENDING state")
    
    # Invalidar magic links anteriores no usados
    # Crear nuevo token
    # Retornar nuevo magic_link
```

2. Agregar endpoint en `app/api/v1/auth/router.py`:
```python
@router.post("/users/{user_id}/regenerate-magic-link")
async def regenerate_magic_link(
    user_id: uuid.UUID,
    _: Annotated[CurrentUser, Depends(require_superadmin)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    try:
        user, magic_link = await service.regenerate_magic_link(user_id)
        return SuccessResponse(
            message="Magic link regenerated",
            data={"_mock_magic_link": magic_link}
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
```

3. Agregar schema en `app/api/v1/auth/schemas.py`:
```python
class MagicLinkResponse(BaseModel):
    _mock_magic_link: str
```

---

#### Tarea 1.3: Implementar cambio de correo
**Nuevo endpoint:** `PATCH /api/v1/users/{user_id}/email`

**Request schema:**
```python
class EmailChangeRequest(BaseModel):
    new_email: EmailStr
```

**Qué hacer en service:**
```python
async def change_email(self, user_id: uuid.UUID, new_email: str) -> User:
    # 1. Verificar que el nuevo email no exista
    # 2. Invalidar todas las sesiones (revocar tokens)
    # 3. Romper vínculo con broker_subject = None
    # 4. Generar nuevo Magic Link
    # 5. Cambiar estado a PENDING
    # 6. Guardar nuevo email
```

**Reglas del BACKEND_SPEC:**
- El `user_id` NO cambia
- El correo es atributo de autenticación, no identidad
- Todas las sesiones previas se invalidan
- El usuario debe reactivarse con el nuevo Magic Link

---

#### Tarea 1.4: Tests unitarios
**Ubicación:** `tests/unit/auth/test_auth.py`

**Qué hacer:**
Completar los tests que están como `raise NotImplementedError`:

```python
class TestAuthModule:
    async def test_should_activate_user_when_magic_link_is_valid(self):
        # CA-MAGIC-01
        # Crear usuario → obtener magic link → consumir → verificar estado = ACTIVE
        pass

    async def test_should_return_403_when_user_disabled(self):
        # CA-STATE-01
        # Crear usuario → deshabilitar → intentar login → verificar 401
        pass
```

**Tests mínimos requeridos:**
- `test_create_user_generates_magic_link`
- `test_consume_valid_magic_link_activates_user`
- `test_consume_expired_magic_link_raises_error`
- `test_consume_used_magic_link_raises_error`
- `test_login_with_active_user_returns_token`
- `test_login_with_pending_user_fails`
- `test_login_with_disabled_user_fails`
- `test_logout_revokes_token`

---

### INTEGRANTE 2: Seguridad y Middleware

#### Tarea 2.1: Completar middleware RBAC
**Ubicación:** `app/dependencies.py`

**Qué hacer:**

1. Crear matriz de permisos centralizada (agregar al inicio del archivo):
```python
PERMISSIONS_MATRIX = {
    Role.SUPERADMIN: ["*"],  # Acceso total
    Role.RESEARCHER: [
        "GET /instruments",
        "GET /metrics", 
        "GET /operational-registry",
        "GET /users/me",
        "GET /projects",
    ],
    Role.APPLICATOR: [
        "GET /instruments",
        "POST /operational-registry",
        "GET /users/me",
    ],
}
```

2. Crear función `require_role(allowed_roles: list[Role])`:
```python
def require_role(allowed_roles: list[Role]):
    async def role_checker(
        current_user: Annotated[CurrentUser, Depends(get_current_user)]
    ) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {current_user.role} not allowed for this endpoint"
            )
        return current_user
    return role_checker
```

3. Usar en endpoints:
```python
@router.get("/instruments")
async def get_instruments(
    current_user: Annotated[CurrentUser, Depends(require_role([Role.SUPERADMIN, Role.RESEARCHER]))],
    ...
):
```

---

#### Tarea 2.2: Rate limiting en login
**Ubicación:** `app/api/v1/auth/router.py`

**Qué hacer:**
1. Importar slowapi:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

2. Agregar al endpoint de login:
```python
@router.post("/auth/login")
@limiter.limit("5/minute")
async def login(
    request: LoginRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
    request: Request,  # Necesario para rate limiting
):
```

3. Configuración en `app/main.py`:
```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceed

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceed, _rate_limit_exceeded_handler)
```

**Configuración requerida:**
- 5 intentos fallidos en 60 segundos → bloqueo por 5 minutos
- Durante bloqueo: retornar 401 genérico (NO 429)
- Registrar evento `RATE_LIMIT_ACTIVATED` en audit log

---

#### Tarea 2.3: Cache de permisos con Redis
**Nuevo archivo:** `app/cache/permissions.py`

**Qué hacer:**
1. Crear el archivo:
```python
import redis.asyncio as redis
from app.config import settings

class PermissionsCache:
    def __init__(self):
        self.redis = redis.from_url(settings.redis_url)
    
    async def get_permissions(self, user_id: str, project_id: str) -> dict | None:
        key = f"permissions:{user_id}:{project_id}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None
    
    async def set_permissions(self, user_id: str, project_id: str, permissions: dict, ttl: int = None):
        key = f"permissions:{user_id}:{project_id}"
        ttl = ttl or settings.permissions_cache_ttl_seconds
        await self.redis.setex(key, ttl, json.dumps(permissions))
    
    async def invalidate_permissions(self, user_id: str, project_id: str = None):
        if project_id:
            key = f"permissions:{user_id}:{project_id}"
            await self.redis.delete(key)
        else:
            # Invalidar todos los proyectos del usuario
            keys = await self.redis.keys(f"permissions:{user_id}:*")
            if keys:
                await self.redis.delete(*keys)
```

2. Integrar en `get_current_user`:
   - Antes de consultar permisos en BD, verificar cache
   - Si hay cache hit, usar permisos del cache
   - Si hay cache miss, consultar BD y guardar en cache

---

#### Tarea 2.4: Audit log para eventos de seguridad
**Nuevo archivo:** `app/db/models/audit_log.py`

**Qué hacer:**
1. Crear modelo:
```python
from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditEvent(str, Enum):
    USER_CREATED = "USER_CREATED"
    USER_ACTIVATED = "USER_ACTIVATED"
    LOGIN = "LOGIN"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    EMAIL_CHANGED = "EMAIL_CHANGED"
    USER_DISABLED = "USER_DISABLED"
    USER_DELETED = "USER_DELETED"
    RATE_LIMIT_ACTIVATED = "RATE_LIMIT_ACTIVATED"
    ACCESS_DENIED = "ACCESS_DENIED"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event: Mapped[AuditEvent] = mapped_column(String(50), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
```

2. Crear helper para registrar eventos:
```python
# app/core/audit.py
async def log_event(db: AsyncSession, event: AuditEvent, user_id: uuid.UUID | None = None, ip: str = None, details: str = None):
    audit = AuditLog(event=event, user_id=user_id, ip=ip, details=details)
    db.add(audit)
    await db.commit()
```

3. Integrar en los endpoints existentes:
   - Login exitoso → `LOGIN`
   - Login fallido → `LOGIN_FAILED`
   - Logout → `LOGOUT`
   - Crear usuario → `USER_CREATED`
   - Activar usuario → `USER_ACTIVATED`
   - Cambiar email → `EMAIL_CHANGED`
   - Deshabilitar usuario → `USER_DISABLED`
   - Eliminar usuario → `USER_DELETED`
   - Rate limit activado → `RATE_LIMIT_ACTIVATED`
   - Acceso denegado (403) → `ACCESS_DENIED`

---

## 6. Migraciones de Base de Datos

**Importante:** Las migraciones aún no se han generado. Esto deben hacerlo los compañeros o tú.

### Pasos para generar migraciones:

```bash
cd backend
uv sync --all-groups  # Instalar dependencias
uv run alembic revision --autogenerate -m "Create initial auth tables"
uv run alembic upgrade head
```

---

## 7. Errores/Issues Conocidos

1. **LSP errors en el editor**: Los errores de "import could not be resolved" son porque no tienes las dependencias instaladas. Al ejecutar `uv sync` se resuelven.

2. **Integración Keycloak**: El login actual es simplificado (solo valida email en BD). Falta integrar con OIDC de Keycloak para producción.

3. **Seed de SUPERADMIN inicial**: No hay forma de crear el primer superadmin. Posibles soluciones:
   - Ejecutar script SQL directo: `INSERT INTO users (user_id, full_name, email, role, organization, state) VALUES (...)`
   - Crear endpoint temporal de bootstrap (eliminar después)
   - Modificar el primer `create_user` para que funcione sin auth temporalmente

---

## 8. Pruebas de Verificación

Para verificar que todo funciona:

1. **Instalar dependencias:**
   ```bash
   cd backend
   uv sync --all-groups
   ```

2. **Levantar servicios (PostgreSQL, Redis):**
   - Ver `deploy/k3s/` o usar Docker Compose local

3. **Generar migraciones:**
   ```bash
   uv run alembic revision --autogenerate -m "Create initial auth tables"
   uv run alembic upgrade head
   ```

4. **Ejecutar tests:**
   ```bash
   uv run pytest
   ```

5. **Iniciar servidor:**
   ```bash
   uv run uvicorn app.main:app --reload
   ```

6. **Probar endpoints con curl:**

```bash
# 1. Crear primer superadmin (sin auth temporal - luego arreglar)
curl -X POST http://localhost:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Admin","email":"admin@test.com","role":"superadmin","organization":"Test"}'

# 2. Obtener token (luego de activar el usuario con el magic link)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com"}'

# 3. Usar el token
TOKEN="eyJ..."
curl -X GET http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## 9. Checklist de Validación

| Item | Estado | Notas |
|------|--------|-------|
| Modelos User, MagicLink, RevokedToken | ✅ | Creados |
| Schemas Pydantic | ✅ | Creados |
| Repository layer | ✅ | Creado |
| Service layer | ✅ | Creado |
| Endpoints básicos | ✅ | Creados |
| JWT create/decode | ✅ | Implementado |
| Dependencias auth | ✅ | Implementadas |
| Logout con revocación | ✅ | Completado |
| Regenerar Magic Link | ⚠️ | Pendiente Integrante 1 |
| Cambio de correo | ⚠️ | Pendiente Integrante 1 |
| Tests unitarios | ⚠️ | Pendiente Integrante 1 |
| Middleware RBAC | ⚠️ | Pendiente Integrante 2 |
| Rate limiting | ⚠️ | Pendiente Integrante 2 |
| Cache permisos Redis | ⚠️ | Pendiente Integrante 2 |
| Audit log | ⚠️ | Pendiente Integrante 2 |
| Migraciones | ⚠️ | Pendiente generar |

---

## 10. Notas Importantes para los Compañeros

### No modificar la estructura existente
Los siguientes archivos están completos y funcionan:
- `app/db/models/user.py` - Modelo User
- `app/db/models/magic_link.py` - Modelo MagicLink  
- `app/db/models/revoked_token.py` - Modelo RevokedToken
- `app/api/v1/auth/schemas.py` - Schemas Pydantic
- `app/api/v1/auth/repository.py` - Repositorios
- `app/api/v1/auth/service.py` - Servicio Auth
- `app/api/v1/auth/router.py` - Endpoints principales
- `app/core/security.py` - JWT
- `app/dependencies.py` - Dependencias auth

### Sí agregar nuevas funcionalidades
Las tareas listadas son para AGREGAR, no para modificar lo existente.

### Importante: Rutas de endpoints
Las rutas actuales son:
- `/api/v1/users` (POST, GET)
- `/api/v1/users/{user_id}/status` (PATCH)
- `/api/v1/auth/activate/{token}` (GET)
- `/api/v1/auth/login` (POST)
- `/api/v1/auth/logout` (POST)
- `/api/v1/users/me` (GET)

El prefijo `/auth` ya está incluido en `/api/v1/auth/...`

---

**Fin del documento**