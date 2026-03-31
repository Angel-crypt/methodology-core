# BACKEND_SPEC

## 1. Alcance y estado

Este documento consolida las especificaciones tecnicas del backend para el proyecto.

- Alcance implementable actual: **M1, M2, M3, M4**.
- Modulos **M5 y M6**: **pendientes** por decision de alcance.
- Identidad y autenticacion oficial: **Magic Link + Keycloak**.
- Fuente de verdad de estado/permisos: backend.

## 2. Stack base definitivo

- Framework: FastAPI
- Server: Uvicorn
- Package manager: UV
- ORM: SQLAlchemy 2.x async
- Migraciones: Alembic
- Validacion: Pydantic v2
- Settings: pydantic-settings
- JWT: PyJWT
- Identity broker: Keycloak (contenedor dedicado)
- Cache permisos: Redis
- Sync broker: APScheduler (in-process)
- Cifrado: cryptography (AES + HKDF)
- Logging: structlog JSON
- Rate limiting: slowapi
- Lint + format: Ruff + Ruff format
- Type checking: mypy strict adaptado
- Testing: pytest + pytest-asyncio + httpx
- Performance: Locust
- Pre-commit: obligatorio

## 3. Restricciones de deployment

Docker obligatorio, con separacion estricta por servicio:

1. contenedor/imagen backend
2. contenedor/imagen PostgreSQL
3. contenedor/imagen Keycloak

Infra adicional separada: Redis.

## 4. Modelo de identidad y acceso

### 4.1 Identidad

- `user_id` (UUID v4) inmutable.
- Keycloak autentica; backend decide estado y autorizacion.
- JWT valido no implica acceso si estado no es `active`.

### 4.2 Estados de usuario

- `pending`: sin acceso operativo, reversible.
- `active`: acceso por rol y contexto.
- `disabled`: sin acceso, reversible por admin.
- `deleted`: soft delete, sin acceso, no reversible.

### 4.3 Onboarding con Magic Link

1. Admin crea usuario (`pending`).
2. Backend genera Magic Link de un solo uso (persistiendo solo hash + TTL).
3. Usuario consume Magic Link.
4. Backend vincula `keycloak_sub` al `user_id` y activa usuario.

### 4.4 Cambio de correo

- Invalida sesiones.
- Rompe vinculacion con Keycloak.
- Regresa a flujo `pending` con nuevo Magic Link.
- `user_id` no cambia.

## 5. Sincronizacion con Keycloak

- Consistencia eventual controlada.
- Orden: backend primero, Keycloak despues.
- Si falla sync: `sync_pending = true`.
- Reintentos con APScheduler cada 2 minutos (configurable).
- Backoff exponencial con tope.
- Endpoint administrativo de sync manual.

## 6. Control de acceso por contexto

- Unidad real de permisos: **proyecto**.
- Organizacion: informativa, no controla acceso.
- Permisos efectivos: usuario+proyecto(+dataset/tipo de dato).
- Roles globales:
  - `admin`
  - `aplicador`
  - `investigador`

## 7. Cifrado y proteccion de datos

- Publico: sin cifrado.
- Sensible: AES simetrico (`cryptography`).
- Critico: hashing irreversible (bcrypt / sha256+salt segun campo).
- Clave maestra: Docker Secret.
- Claves por dataset: HKDF derivadas por contexto, no persistidas.

## 8. Cache de permisos

- Redis para permisos por usuario+proyecto.
- TTL por defecto: 10 min (configurable).
- Invalidacion explicita en cambios administrativos.
- Flujo:
  1. validar JWT
  2. validar estado usuario
  3. buscar permisos en Redis
  4. fallback a DB en miss

## 9. Auditoria y logging

`structlog` JSON con contexto minimo:

- `user_id`
- `project_id` (si aplica)
- `dataset_id` (si aplica)
- `action`
- `timestamp`
- `result`

Eventos obligatorios:

- login exito/fallo
- uso/regeneracion/expiracion de Magic Link
- cambios de estado usuario
- sincronizacion con Keycloak
- accesos a datasets
- acciones administrativas

No registrar:

- secretos
- passwords
- tokens completos
- datos sensibles en claro

## 10. Contratos y metodologia

Flujo obligatorio por endpoint:

1. contrato XML
2. schema Pydantic derivado
3. tests (aceptacion)
4. implementacion
5. validacion

Politica: SDD + TDD.

## 11. Decisiones abiertas cerradas en esta version

- Base de datos: PostgreSQL.
- Patron arquitectonico: feature-based con capas internas (router/service/repository/schemas).
- Estructura de response: envelope `{status,message,data}`.
- Paginacion estandar: offset/limit (con adaptadores page/limit donde aplique).
- Rate limiting: slowapi por endpoint sensible (login y operaciones admin).
- CORS: lista blanca por settings (`CORS_ALLOW_ORIGINS`).

## 12. Inventario funcional actual

### 12.1 M1 Identidad y acceso

- Alta administrativa de usuarios
- Estado de usuario
- Magic Link consume/regeneracion
- Login/logout
- Permisos granulares por aplicador
- Auditoria de seguridad

### 12.2 M2 Instrumentos

- CRUD parcial de instrumentos (sin hard delete)
- Estado activo/inactivo
- Vigencia temporal

### 12.3 M3 Metricas

- Definicion por instrumento
- Validacion por `MetricType`
- Rango/opciones/requerido

### 12.4 M4 Registro operativo

- Sujetos anonimizados
- Contexto no identificable
- Aplicaciones
- Captura atomica de valores

### 12.5 Pendiente

- M5 Consulta interna
- M6 Exportacion estructurada

## 13. Arquitectura de carpetas objetivo (documental)

```text
backend/
  app/
    api/v1/<modulo>/
    core/
    db/
    cache/
  migrations/
  tests/
  docs/
    decisions/
    ACCEPTANCE_CRITERIA.md
  BACKEND_SPEC.md
```

## 14. Criterios de salida de esta fase

- Especificacion backend consolidada
- ADR-001..ADR-019 redactados
- Criterios de aceptacion centralizados
- M5/M6 explicitamente fuera de alcance actual
