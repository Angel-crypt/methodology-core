# SRS – Módulo 1: Autenticación y Control de Acceso
**Sistema de Registro Metodológico de Métricas Lingüísticas**
**Versión:** 2.2 · **Fecha:** 2026-03-23 · **Estado:** En revisión

---

## Tabla de Contenido

1. [Introducción](#1-introducción)
2. [Contexto del Módulo](#2-contexto-del-módulo)
3. [Stakeholders y Usuarios del Módulo](#3-stakeholders-y-usuarios-del-módulo)
4. [Alcance del Módulo](#4-alcance-del-módulo)
5. [Requisitos Funcionales](#5-requisitos-funcionales)
6. [Requisitos No Funcionales](#6-requisitos-no-funcionales)
7. [Interfaces Externas](#7-interfaces-externas)
8. [Restricciones y Supuestos](#8-restricciones-y-supuestos)
9. [Criterios de Aceptación](#9-criterios-de-aceptación)
10. [Trazabilidad de Requisitos](#10-trazabilidad-de-requisitos)

---

## 1. Introducción

### 1.1 Propósito

Este documento define los requisitos funcionales y no funcionales del **Módulo 1 – Autenticación y Control de Acceso** del Sistema de Registro Metodológico de Métricas Lingüísticas.

El módulo es el punto de entrada y guardián de todo el sistema. Su responsabilidad es verificar la identidad de cada usuario, emitir una sesión válida mediante token JWT y aplicar las restricciones de rol antes de que cualquier otro módulo procese una solicitud. Sin este módulo operativo, ningún endpoint del sistema es funcional.

El documento está dirigido a:
- **Desarrolladores:** como guía de implementación de endpoints, middleware de autorización y lógica de seguridad.
- **Testers / QA:** como base para el diseño de casos de prueba funcionales, negativos y de integración.
- **Stakeholders:** como contrato técnico que define el alcance y los límites del módulo.

### 1.2 Alcance del Documento

Este documento cubre:
- Creación de usuarios con rol asignado por el SUPERADMIN.
- Activación y desactivación de usuarios sin pérdida de historial.
- Inicio de sesión con emisión de token JWT (exp = 6 h, HS256, `jti` en payload).
- Cambio de contraseña autenticado con validación de contraseña actual e invalidación automática de sesiones previas.
- Cierre de sesión con invalidación del token activo en `revoked_tokens`.
- Middleware de autorización RBAC aplicado a todos los endpoints del sistema.

Se relaciona con los siguientes componentes:
- **M2, M3, M4, M5, M6:** todos consumen el middleware JWT de este módulo en cada petición.

Quedan **fuera del alcance**: recuperación de contraseña, registro público de usuarios, OAuth/SSO, 2FA, gestión granular de permisos, auditoría de acciones de negocio (responsabilidad de cada módulo funcional).

### 1.3 Definiciones y Glosario

| Término | Definición |
|---|---|
| **Token JWT** | Token único de sesión, firmado con HS256. Expira en 6 horas (`exp = iat + 21600`). Incluye `user_id`, `role`, `iat`, `exp`, `jti`. Sin datos personales. |
| **jti** | JWT ID. Identificador único del token incluido en el payload. Permite revocación individual en `revoked_tokens`. |
| **HS256** | Algoritmo de firma simetrica HMAC-SHA256. La clave se gestiona exclusivamente como Kubernetes Secret. |
| **Kubernetes Secret** | Mecanismo de gestion de secretos de Kubernetes. Nunca en texto plano en archivos de configuracion. |
| **Keycloak** | Proveedor de identidad externo (broker) que gestiona la autenticación de usuarios. El sistema delega autenticación a Keycloak. |
| **UID interno** | Identificador local del usuario en el sistema, vinculado al subject de Keycloak. Se usa para referenciar usuarios en tablas locales (audit_log, etc.) sin exponer el identificador externo del broker. |
| **Broker de identidad** | Componente externo (Keycloak) que gestiona la autenticación de usuarios. El backend es la fuente de verdad; el broker solo autentica. |
| **Magic Link** | Enlace de un solo uso enviado al correo del usuario para verificar su identidad. Se almacena como hash con expiración (24h). |
| **user_id (UUID)** | Identificador único e inmutable que representa la identidad real del usuario en el sistema. Se genera al crear el usuario y nunca cambia. |
| **Separación identidad/autenticación** | El user_id es inmutable y representa la identidad real. El correo es un atributo de autenticación que puede cambiar sin alterar el user_id. |
| **revoked_tokens** | Tabla PostgreSQL que registra `jti` de tokens invalidados por logout. Tiene TTL igual a `exp` del token. |
| **Cron de limpieza** | Proceso dentro del contenedor que elimina entradas expiradas de `revoked_tokens`. |
| **Stateless** | La validación del token no requiere consulta a BD: el rol se extrae del JWT firmado. Solo se consulta BD para verificar `state=ACTIVE` y `revoked_tokens`. |
| **RBAC** | Role-Based Access Control. Control de acceso basado en roles fijos. |
| **Rate limiting** | Mecanismo que bloquea temporalmente un IP/cuenta tras 5 intentos fallidos en 60 s. |
| **Whitelist de rutas públicas** | Lista explícita de endpoints que no requieren token (ej. `/health`). El middleware los excluye de la verificación. |

### 1.4 Referencias

- `SRS_General_v1.0.md` — Especificación general del sistema.
- `MockContract_M1_Autenticacion_v2.xml` — Contrato de mock server del módulo (v2.2).
- `Módulos_del_Sistema_y_Tareas_Asociadas.docx` — Backlog con HU1–HU5.
- `../../backend/docs/PLAN_INICIAL_DESARROLLO.md` — Plan inicial de desarrollo backend.
- `M1_Autenticacion.docx` — Documento original de scope del módulo.
- `../../mock/GUIA_IMPLEMENTACION_MOCK_SERVER.md` — Guia de implementacion del mock.
- `../../mock/GUIA_DESPLIEGUE_MOCK_SERVER.md` — Despliegue del mock.
- `../../deploy/k3s/` — Manifiestos K3s.

### 1.5 Estructura del Documento

Las secciones 1–3 establecen el contexto, actores y alcance. La sección 5 detalla cada requisito funcional con su entidad, endpoint y flujo. La sección 6 define los atributos de calidad. Las secciones 7–10 cubren interfaces, restricciones, criterios de aceptación por HU y la matriz de trazabilidad.

---

## 2. Contexto del Módulo

### 2.1 Descripción del Módulo

El Módulo 1 es la base de seguridad de todo el sistema. Centraliza la autenticación y el control de acceso para garantizar que solo usuarios registrados y activos accedan al sistema, cada rol opere exclusivamente dentro de sus capacidades declaradas y exista trazabilidad de sesiones para auditoría operativa.

El modulo opera como un **servicio replicado en K3s**, lo que impone el requisito fundamental de ser completamente stateless: la validacion JWT no depende de sesiones en memoria; todo el estado se almacena en PostgreSQL.

### 2.2 Problema que Resuelve

Sin este módulo, cualquier usuario podría invocar endpoints sensibles sin identificarse. El módulo garantiza que:
- Solo usuarios registrados y activos accedan al sistema.
- Cada rol opere exclusivamente dentro de sus capacidades declaradas.
- Exista trazabilidad de sesiones para auditoría operativa.
- La revocación de tokens funcione de forma consistente entre réplicas del servicio.

### 2.3 Rol en la Arquitectura K3s

```
Balanceador de carga K3s
  └─ Réplica 1  ─┐
  └─ Réplica 2  ──┼─ Módulo 1 (stateless)
  └─ Réplica N  ─┘       │
                          ▼
                    PostgreSQL (fuente de verdad compartida)
                    ┌─────────────────────────────────┐
                    │ users  ·  revoked_tokens         │
                    └─────────────────────────────────┘
                          │
                    Kubernetes Secret (clave HS256)
```

La validación de tokens es stateless: el rol se extrae del JWT firmado sin consulta a BD. Solo se consulta PostgreSQL para verificar `is_active` del usuario y presencia del `jti` en `revoked_tokens`.

### 2.4 Relación con Otros Módulos

| Módulo dependiente | Dependencia con M1 |
|---|---|
| M2 – Gestión de Instrumentos | Requiere token válido con rol SUPERADMIN |
| M3 – Definición de Métricas | Requiere token válido con rol SUPERADMIN |
| M4 – Registro Operativo | Requiere token válido con rol Profesional Aplicador |
| M5 – Consulta Interna | Requiere token válido con rol Investigador (detalle) o SUPERADMIN (solo estadisticas agregadas) |
| M6 – Exportacion Estructurada | Requiere token valido con rol Investigador. SUPERADMIN no exporta datos. |

### 2.5 Flujo General de Autenticación

```
FLUJO DE REGISTRO (SUPERADMIN crea usuario):
  POST /users (email, role, organization)
    → Sistema genera user_id (UUID) inmutable
    → Genera Magic Link (hash con expiración)
    → Estado: PENDING
    → Envía Magic Link por correo (en producción)

FLUJO DE ACTIVACION (Usuario usa Magic Link):
  GET /auth/activate/:token
    → Valida hash del Magic Link (no expirado, no usado)
    → Marca cuenta como activa y lista para login OIDC
    → No emite JWT
    → Redirige a /login para flujo OIDC

FLUJO DE LOGIN (Usuario autenticado por OIDC):
  POST /auth/login (email)
    → Broker (Keycloak) autentica usuario
    → Si email coincide con user_id vinculado:
      → Genera JWT con user_id, role, organization
      → Backend valida estado del usuario (is_active)
      → Acceso segun rol

FLUJO DE CAMBIO DE CORREO:
  PATCH /users/me/email (new_email)
    → user_id se conserva inmutable
    → Invalidar todas las sesiones (revoked_tokens)
    → Romper vínculo con broker
    → Estado: PENDING (reinicia flujo)
    → Generar nuevo Magic Link
```

### 2.6 Máquina de Estados de Usuario

```
[CREACIÓN POR ADMINISTRADOR]
    │ POST /users → state=PENDING, user_id=UUID_generado
    ▼
┌─────────────────────────────────────────────────┐
│  PENDING                                         │
│  - Esperando activación por Magic Link           │
│  - Solo puede usar GET /auth/activate/:token     │
│  - SUPERADMIN puede: regenerar Magic Link        │
│                       deshabilitar               │
│                       eliminar                   │
└─────────────┬───────────────────────────────────┘
               │ GET /auth/activate/:token exitoso
              │ (Magic Link válido
              │  + vinculación con broker)
              ▼
┌─────────────────────────────────────────────────┐
│  ACTIVE                                          │
│  - Acceso completo según rol                     │
│  - SUPERADMIN puede: deshabilitar               │
│                 eliminar                        │
│                 cambiar correo                   │
│                      (reinicia a PENDING)       │
└─────────────┬──────────────┬────────────────────┘
              │ PATCH        │ PATCH /users/:id/status
              │ /users/:id/  │ { state: 'disabled' }
              │ disable      ▼
              │   ┌──────────────────────────────────────────┐
              │   │  DISABLED                                │
              │   │  - Sin acceso al sistema                 │
              │   │  - Revocación de sesiones               │
               │   │  - SUPERADMIN puede: reactivar (→ ACTIVE) |
              │   │                   eliminar (→ DELETED)  │
              │   └──────────────┬───────────────────────────┘
              │                  │
              │                  │ PATCH /users/:id/status
              │                  │ { state: 'deleted' }
              │                  ▼
              │   ┌──────────────────────────────────────────┐
              │   │  DELETED (soft delete)                   │
              │   │  - Sin acceso al sistema                 │
              │   │  - Trazabilidad en audit_log            │
              │   │  - Irreversible                          │
              │   │  - user_id se mantiene para integridad  │
              │   └──────────────────────────────────────────┘
              │
              └─► Cambio de correo → PENDING (Magic Link nuevo)
```

**Notas:**
- El `user_id` (UUID) es **inmutable** durante todo el ciclo de vida del usuario.
- El correo es un atributo de autenticación, no la identidad.
- El backend es la **fuente de verdad**; el broker (Keycloak) solo autentica.
- El estado se gestiona en campo `state` (ENUM: PENDING, ACTIVE, DISABLED, DELETED).

---

## 3. Stakeholders y Usuarios del Módulo

### 3.1 Stakeholders del Módulo

| Rol | Interés en el módulo | Responsabilidades relacionadas |
|---|---|---|
| **Equipo de desarrollo** | Implementar correctamente la seguridad base del sistema. | Codificar, probar e integrar conforme al SRS y al DoD. |
| **Responsable tecnico** | Garantizar seguridad y disponibilidad del modulo en el cluster. | Configurar Kubernetes Secrets, revisar PRs, firmar cierre de historias. |
| **Testers / QA** | Verificar todos los criterios incluyendo casos negativos. | Diseñar y ejecutar pruebas funcionales, negativas y de integración. |
| **Módulos M2–M6** | Que el middleware funcione correctamente en cada petición. | Consumir el JWT de M1 en todos sus endpoints. |

### 3.2 Tipos de Usuarios

| Tipo | Descripción | Acceso a este módulo |
|---|---|---|
| **SUPERADMIN** | Control total del sistema. | Login, logout. Gestión de usuarios (crear, activar/desactivar). |
| **Investigador** | Usuario académico de consulta. | Login, logout. |
| **Profesional Aplicador** | Profesional de campo. | Login, logout. |

---

## 4. Alcance del Módulo

### 4.1 Objetivo del Módulo

Garantizar que solo usuarios autenticados con el rol correcto accedan a cada funcionalidad del sistema, mediante un modelo de seguridad Zero Trust con verificacion stateless por peticion, compatible con despliegue replicado en K3s.

### 4.2 Funcionalidades Principales

| # | Capacidad | HU |
|---|---|---|
| 1 | Registro de usuarios con rol asignado por el SUPERADMIN | HU1 |
| 2 | Activación y desactivación de cuentas sin eliminación de historial | HU2 |
| 3 | Inicio de sesión con emisión de token JWT (6 h, HS256, jti) | HU3 |
| 4 | Cierre de sesión con invalidación del token en `revoked_tokens` | HU4 |
| 5 | Restricción de acciones por rol mediante middleware stateless | HU5 |
| 6 | Cambio de contraseña autenticado con invalidación automática de sesiones previas | HU6b |
| 7 | Magic Link de activacion (sin password) | HU3 |
| 8 | Password solo para SUPERADMIN (ruta de sistema) | HU4 |

### 4.3 Fuera del Alcance

| Funcionalidad excluida | Módulo o decisión responsable |
|---|---|
| Registro autónomo de usuarios | No contemplado. Solo el SUPERADMIN crea cuentas. |
| Recuperación de contraseña vía email | Fuera del MVP; se delega a canal externo o decisión futura. |
| Autenticación multifactor (MFA) | Puede incorporarse en iteraciones futuras. |
| Federacion de identidad (OAuth2, SAML, LDAP) | No requerido; credenciales propias en PostgreSQL. |
| Auditoría de acciones de negocio | Responsabilidad de cada módulo funcional (M2–M6). |
| Gestión de permisos granulares por recurso | Roles fijos; sin ACL por objeto. |
| Historial de sesiones o análisis de actividad | Fuera del MVP. |

---

## 5. Requisitos Funcionales

> Todos los endpoints bajo `/api/v1`. Todas las respuestas siguen `{ "status", "message", "data" }`.

---

### RF-M1-01 – Crear usuario con rol *(HU1)*

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `User`, `Role`, `MagicLink` |
| **Endpoint** | `POST /users` |
| **Entrada** | `full_name` (string, obligatorio), `email` (string, obligatorio, unico), `role` (enum: `superadmin` · `researcher` · `applicator`), `organization` (string, obligatorio) |
| **Descripción** | El SUPERADMIN registra un nuevo usuario. El sistema genera un `user_id` (UUID) inmutable que representa la identidad del usuario. Se genera un Magic Link de un solo uso que se almacena como hash con TTL (24 h). El usuario se crea en estado **PENDING**. El Magic Link se envía por correo (en producción). La respuesta incluye `_mock_magic_link` (solo en mock). |
| **Resultado** | Usuario creado con `user_id`, `email`, `role`, `organization`, `state=PENDING`, `created_at`. HTTP 201. |

**Esquema de tabla `users`:**

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | UUID | PK, inmutable, generado automáticamente |
| `full_name` | VARCHAR | Nombre completo |
| `email` | VARCHAR | Único, índice. Atributo de autenticación, no identidad. |
| `role` | ENUM | `superadmin` · `researcher` · `applicator` |
| `organization` | VARCHAR | Organización a la que pertenece el usuario |
| `state` | ENUM | `PENDING` · `ACTIVE` · `DISABLED` · `DELETED`. Por defecto `PENDING`. |
| `broker_subject` | VARCHAR | Identificador externo del broker (Keycloak). Null hasta activación. |
| `created_at` | TIMESTAMP | UTC |
| `updated_at` | TIMESTAMP | Se actualiza en cambios de estado |
| `deleted_at` | TIMESTAMP | Soft delete para trazabilidad |

**Esquema de tabla `magic_links`:**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK a users.user_id |
| `token_hash` | VARCHAR | Hash del token (SHA-256) |
| `expires_at` | TIMESTAMP | TTL del token |
| `used_at` | TIMESTAMP | Null = no usado. Timestamp = usado. |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | `NULL` por defecto. Se actualiza en cambios de estado. |

---

### RF-M1-02 – Gestionar estado del usuario *(HU2)*

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `User` (campo `state`) |
| **Endpoint** | `PATCH /users/{user_id}/status` |
| **Entrada** | `user_id` (UUID, path param), `state` (enum: `DISABLED`, `DELETED`) |
| **Descripcion** | El SUPERADMIN puede deshabilitar o eliminar usuarios. Los estados `PENDING` y `ACTIVE` no se modifican directamente — se gestionan mediante Magic Link y login. Un usuario en `DISABLED` no puede acceder al sistema. Un usuario en `DELETED` es soft delete con trazabilidad. El sistema protege al unico SUPERADMIN activo: si se intenta deshabilitar al ultimo SUPERADMIN activo, la operacion es rechazada con HTTP 409. |
| **Resultado** | Campo `state` actualizado. `deleted_at` establecido si es `DELETED`. Sesiones activas revocadas. HTTP 200. |

---

### RF-M1-03 – Activar usuario con Magic Link *(HU3)*

| Campo | Detalle |
|---|---|
| **Actor** | Usuario nuevo (estado PENDING) |
| **Entidades** | `User`, `MagicLink`, `BrokerIdentity` |
| **Endpoint** | `GET /auth/activate/:token` |
| **Entrada** | `token` (path param) |
| **Descripcion** | El usuario presenta el Magic Link recibido por correo. El sistema valida: (1) token no expirado, (2) token no usado. Si es valido, marca la cuenta como activa y lista para login OIDC. No emite JWT en la activacion. |
| **Resultado** | `state=ACTIVE`. Redireccion a `/login` para iniciar OIDC. HTTP 200. |

---

### RF-M1-04 – Iniciar sesión *(HU4)*

| Campo | Detalle |
|---|---|
| **Actor** | Usuario activo |
| **Endpoint** | `POST /auth/login` |
| **Entrada** | `email` (string) |
| **Descripcion** | El sistema delega autenticacion al broker (Keycloak) para researcher/applicator. El SUPERADMIN usa login con password en ruta de sistema. Si el broker autentica exitosamente y el email coincide con un usuario activo (`state=ACTIVE`), el sistema emite un token JWT con `user_id`, `role`, `organization`. El backend siempre valida el estado del usuario ademas del JWT del broker. Fallos retornan HTTP 401 generico. Rate limiting: 5 intentos fallidos en 60 s → bloqueo 5 min. |
| **Resultado** | `{ access_token, token_type: "Bearer", expires_in: 21600, state: "ACTIVE" }`. HTTP 200. |

---

### RF-M1-04 – Cerrar sesión *(HU4)*

| Campo | Detalle |
|---|---|
| **Actor** | Cualquier usuario autenticado |
| **Endpoint** | `POST /auth/logout` |
| **Entrada** | Token JWT en `Authorization: Bearer` |
| **Descripción** | El sistema extrae el `jti` del token y lo registra en la tabla `revoked_tokens` con `expires_at` igual a `exp` del token. Peticiones posteriores con ese token son rechazadas por el middleware (HTTP 401) aunque el token no haya expirado naturalmente. Un proceso cron dentro del contenedor elimina periódicamente entradas cuyo `expires_at < NOW()` para evitar crecimiento ilimitado de la tabla. Como `revoked_tokens` reside en PostgreSQL compartido, la invalidación es consistente entre todas las réplicas del servicio. |
| **Resultado** | `jti` registrado en `revoked_tokens`. HTTP 200. |

**Esquema de tabla `revoked_tokens`:**

| Columna | Tipo | Notas |
|---|---|---|
| `jti` | UUID | PK, identificador del token |
| `expires_at` | TIMESTAMP | Igual a `exp` del token. Usado por el cron de limpieza. |

---

### RF-M1-05 – Middleware de autorización *(HU5)*

| Campo | Detalle |
|---|---|
| **Actor** | Sistema (middleware compartido) |
| **Aplica a** | Todos los endpoints protegidos bajo `/api/v1/*` |
| **Descripción** | El middleware se implementa como función compartida importada por todos los servicios del stack. Para cada petición evalúa en orden: (1) Validación de firma HS256 del token. Si falla → 401 (antes de evaluar rol). (2) Verificación de `jti` en `revoked_tokens`. Si está → 401. (3) Verificación de `state=ACTIVE` en `users`. Si está inactivo (DISABLED/DELETED) → 401. (4) Verificación de rol del token contra la matriz de permisos centralizada → si no tiene permiso → 403. La verificación es stateless respecto al rol: se extrae del JWT sin consultar BD. Las rutas públicas (ej. `/health`) se declaran en una whitelist explícita y son excluidas de la verificación. |
| **Resultado** | HTTP 401 ante firma inválida, token revocado o usuario no activo. HTTP 403 ante rol sin permiso. |

**Matriz de permisos (constante centralizada, nunca hardcodeada por endpoint):**

| Acción / Recurso | superadmin | researcher | applicator |
|---|:---:|:---:|:---:|
| Crear usuario con rol | ✓ | ✗ | ✗ |
| Gestionar estado de usuario (disable/delete) | ✓ | ✗ | ✗ |
| Iniciar sesión / Activar con Magic Link | ✓ | ✓ | ✓ |
| Cerrar sesión | ✓ | ✓ | ✓ |
| Gestionar instrumentos metodológicos | ✓ | ✗ | ✗ |
| Definir métricas | ✓ | ✗ | ✗ |
| Registrar sujetos y aplicar pruebas | ✓ | ✗ | ✓ |
| Consultar aplicaciones y resultados | ✗ | ✓ | ✗ |
| Exportar datos (CSV / JSON) | ✗ | ✓ | ✗ |
| Ver estadisticas agregadas | ✓ | ✗ | ✗ |
| Ver audit_log | ✓ | ✗ | ✗ |
| Gestionar sesiones activas | ✓ | ✓ (propias) | ✓ (propias) |
| Cambiar correo | ✓ | ✗ | ✗ |

---

### RF-M1-LIST – Listar usuarios *(soporte administrativo)*

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Endpoint** | `GET /users` |
| **Entrada** | Query params opcionales: `state` (enum), `role` (enum) |
| **Descripción** | El sistema debe devolver el listado de usuarios registrados. Solo accesible por el SUPERADMIN. Incluye el campo `state` (PENDING, ACTIVE, DISABLED, DELETED) para que el frontend pueda derivar el estado de cada usuario. El `user_id` es inmutable y es la clave de identificación. |
| **Resultado** | Lista de usuarios con user_id, full_name, email, role, organization, state, created_at. HTTP 200. |

---

### RF-M1-06 – Cambiar correo electrónico

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `User`, `MagicLink`, `revoked_tokens`, `AuditLog` |
| **Endpoint** | `PATCH /users/{user_id}/email` |
| **Entrada** | `user_id` (UUID, path param), `new_email` (string, obligatorio) |
| **Descripción** | El SUPERADMIN puede cambiar el correo de un usuario. **Cambio de correo ≠ cambio de usuario**: el `user_id` se conserva inmutable. La operación: (1) invalida todas las sesiones activas (registra todos los `jti` en `revoked_tokens`), (2) rompe el vínculo con el broker (borra `broker_subject`), (3) genera nuevo Magic Link, (4) establece `state=PENDING`. El usuario debe reactivarse usando el nuevo Magic Link. Todo se registra en `AuditLog`. |
| **Resultado** | `email` actualizado, `broker_subject` = null, `state=PENDING`, nuevo Magic Link generado. Todas las sesiones previas revocadas. HTTP 200. |

---

### RF-M1-REGEN – Regenerar Magic Link

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `User`, `MagicLink` |
| **Endpoint** | `POST /users/{user_id}/regenerate-magic-link` |
| **Entrada** | `user_id` (UUID, path param) |
| **Descripción** | El SUPERADMIN puede regenerar el Magic Link para un usuario en estado PENDING. El Magic Link anterior (si existe y no ha sido usado) se invalida. Se genera un nuevo token con nueva expiración (24h). |
| **Resultado** | Nuevo Magic Link generado. HTTP 200. |

---

### RF-M1-PROJECT-01 – Crear proyecto

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `Project`, `Dataset` |
| **Endpoint** | `POST /projects` |
| **Entrada** | `name` (string, obligatorio), `description` (string, opcional) |
| **Descripción** | El SUPERADMIN crea un nuevo proyecto. El sistema genera un `project_id` (UUID) y crea automáticamente un `Dataset` asociado. El creador se agrega automáticamente como miembro del proyecto. |
| **Resultado** | Proyecto creado con `project_id`, `dataset_id`, `created_at`. Creador agregado como miembro. HTTP 201. |

**Esquema de tabla `projects`:**

| Columna | Tipo | Notas |
|---|---|---|
| `project_id` | UUID | PK, generado automáticamente |
| `name` | VARCHAR | Nombre del proyecto |
| `description` | VARCHAR | Descripción opcional |
| `dataset_id` | UUID | FK a datasets.dataset_id |
| `created_at` | TIMESTAMP | UTC |
| `created_by` | UUID | FK a users.user_id |

**Esquema de tabla `datasets`:**

| Columna | Tipo | Notas |
|---|---|---|
| `dataset_id` | UUID | PK |
| `name` | VARCHAR | Nombre del dataset |
| `created_at` | TIMESTAMP | UTC |

**Esquema de tabla `project_members`:**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `project_id` | UUID | FK a projects.project_id |
| `user_id` | UUID | FK a users.user_id |
| `role_global` | ENUM | `investigador` · `aplicador`. |
| `permissions` | JSONB | Permisos finos opcionales: `{ instruments: [], metrics: [] }` |
| `created_at` | TIMESTAMP | UTC |
| `created_by` | UUID | FK a users.user_id (quien lo agregó) |

---

### RF-M1-PROJECT-02 – Listar proyectos del usuario

| Campo | Detalle |
|---|---|
| **Actor** | Cualquier usuario autenticado |
| **Entidades** | `Project`, `ProjectMember` |
| **Endpoint** | `GET /projects` |
| **Descripción** | Devuelve los proyectos a los que el usuario pertenece. Cada resultado incluye el rol global del usuario en ese proyecto. |
| **Resultado** | Lista de proyectos con project_id, name, role_global, created_at. HTTP 200. |

---

### RF-M1-PROJECT-03 – Ver detalle de proyecto

| Campo | Detalle |
|---|---|
| **Actor** | Miembro del proyecto |
| **Entidades** | `Project`, `Dataset`, `ProjectMember` |
| **Endpoint** | `GET /projects/{project_id}` |
| **Descripción** | Devuelve el detalle de un proyecto incluyendo el dataset asociado y la lista de miembros. Solo accesible para miembros del proyecto. |
| **Resultado** | Proyecto con dataset y miembros. HTTP 200. |

---

### RF-M1-PROJECT-04 – Agregar instrumento a proyecto

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `Project`, `Instrument` |
| **Endpoint** | `POST /projects/{project_id}/instruments` |
| **Entrada** | `instrument_id` (UUID) |
| **Descripción** | El SUPERADMIN asigna un instrumento existente al proyecto. El instrumento debe existir y estar activo. |
| **Resultado** | Instrumento agregado al proyecto. HTTP 201. |

---

### RF-M1-PROJECT-05 – Agregar miembro a proyecto

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `ProjectMember`, `User` |
| **Endpoint** | `POST /projects/{project_id}/members` |
| **Entrada** | `user_id` (UUID), `role_global` (enum: `investigador` · `aplicador`) |
| **Descripción** | El SUPERADMIN agrega un usuario al proyecto con su rol global. El usuario debe existir y tener estado ACTIVE. |
| **Resultado** | Miembro agregado con role_global. HTTP 201. |

---

### RF-M1-PROJECT-06 – Remover miembro de proyecto

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `ProjectMember` |
| **Endpoint** | `DELETE /projects/{project_id}/members/{user_id}` |
| **Descripción** | El SUPERADMIN remueve un miembro del proyecto. |
| **Resultado** | Miembro removido. HTTP 204. |

---

### RF-M1-PROJECT-07 – Asignar permisos finos a miembro

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `ProjectMember` |
| **Endpoint** | `PATCH /projects/{project_id}/members/{user_id}/permissions` |
| **Entrada** | `permissions` (JSONB: `{ instruments: [], metrics: [] }`) |
| **Descripción** | El SUPERADMIN puede agregar filtros finos al miembro. Campos vacíos = acceso a todos. |
| **Resultado** | Permisos actualizados. HTTP 200. |

---

## 6. Requisitos No Funcionales

| ID | Categoría | Descripción | Métrica verificable |
|---|---|---|---|
| RNF-M1-01 | Rendimiento | Los endpoints responden en tiempo razonable. | `POST /auth/login` < 1 s. Demás endpoints < 500 ms. |
| RNF-M1-02 | Seguridad | Token JWT firmado HS256 con clave almacenada como Kubernetes Secret. | Clave nunca en texto plano en archivos de configuracion ni variables de entorno. |
| RNF-M1-03 | Seguridad | Token expira en 6 horas (exp = iat + 21600). | Token expirado retorna 401. Sin mecanismo de refresh. |
| RNF-M1-04 | Seguridad | El campo `jti` está presente en todos los tokens emitidos. | 100% de tokens incluyen `jti` UUID único. |
| RNF-M1-05 | Seguridad | El middleware verifica firma, revocación, estado ACTIVE y rol en cada petición. | Sin firma válida → 401. Token en `revoked_tokens` → 401. Usuario no activo → 401. Rol incorrecto → 403. |
| RNF-M1-06 | Seguridad | Rate limiting: 5 intentos fallidos en 60 s → bloqueo 5 min. | El audit_log registra `RATE_LIMIT_ACTIVADO`. |
| RNF-M1-07 | Disponibilidad | Servicio stateless compatible con multiples replicas en K3s. | Sin sesiones en memoria. |
| RNF-M1-08 | Integridad | `revoked_tokens` no crece indefinidamente. | Cron elimina entradas expiradas. |
| RNF-M1-09 | Integridad | El único SUPERADMIN activo no puede deshabilitarse. | Intento → 409. |
| RNF-M1-10 | Mantenibilidad | Matriz de permisos como constante centralizada. | Sin permisos hardcodeados. |
| RNF-M1-11 | Consistencia API | Todas las respuestas siguen `{ "status", "message", "data" }`. | 100% de endpoints. |
| RNF-M1-12 | Seguridad | Separación identidad/autenticación: user_id inmutable, correo可变. | Cambio de correo invalida sesiones, reinicia flujo (PENDING), conserva user_id. |
| RNF-M1-13 | Seguridad | El broker (Keycloak) solo autentica; el backend es fuente de verdad. | Backend valida estado del usuario además del JWT del broker. |

---

## 7. Interfaces Externas

### 7.1 Interfaces con Otros Módulos

| Módulo | Tipo | Detalle |
|---|---|---|
| M2, M3, M4, M5, M6 | Consumidor | Todos importan el middleware de M1 para validar JWT y rol en cada petición. El middleware es una función compartida dentro del stack, no un endpoint separado. |
| **Keycloak** | Broker de identidad | Gestiona autenticación de usuarios. El sistema consume tokens JWT de Keycloak y valida estado local. |

### 7.2 Interfaces de Usuario

- Formulario de activación con Magic Link.
- Panel de administración: listado de usuarios con filtros por rol y estado (`state`), acciones de deshabilitar/eliminar.
- Formulario de creación de usuario: nombre completo, email, rol, organización.

### 7.3 Interfaces de Software

| Componente | Descripción |
|---|---|
| **FastAPI** | Framework web. Expone los endpoints REST. |
| **PyJWT** | Generacion y validacion de tokens JWT HS256. |
| **SQLAlchemy + PostgreSQL** | ORM y base de datos para `users`, `magic_links` y `revoked_tokens`. |
| **Alembic** | Migraciones del esquema de las tablas del módulo. |
| **Pydantic** | Validación de esquemas de entrada y salida. |
| **K3s** | Orquestacion del servicio replicado. Gestion de Kubernetes Secrets. |
| **Keycloak** | Broker de identidad externo. Gestiona usuarios, sesiones y credenciales. |

### 7.4 Interfaces de Comunicación

- Base path: `/api/v1`
- Protocolo: HTTP/HTTPS · Formato: JSON
- Autenticación en endpoints protegidos: `Authorization: Bearer {token}`
- Clave JWT: Kubernetes Secret montado en el contenedor (no variable de entorno)
- Sincronización de reloj: NTP requerido en todos los nodos del clúster

---

## 8. Restricciones y Supuestos

### 8.1 Restricciones

| # | Restricción | Detalle |
|---|---|---|
| R1 | Stateless obligatorio | Sin sesiones en memoria compartida entre réplicas. Todo el estado en PostgreSQL. |
| R2 | Kubernetes Secret | La clave HS256 se gestiona exclusivamente como Kubernetes Secret. Nunca en texto plano fuera del sistema de secretos de la plataforma. |
| R3 | PostgreSQL única fuente de verdad | Usuarios, tokens revocados y Magic Links solo en PostgreSQL. |
| R4 | Separación identidad/autenticación | user_id inmutable, correo como atributo de autenticación. |
| R5 | Broker externo (Keycloak) | La autenticación se delega a Keycloak. El backend valida estado. |
| R6 | Roles fijos | Los tres roles son fijos. Sin gestión granular de permisos. |
| R7 | Sin auto-registro | Solo el SUPERADMIN crea cuentas. |
| R8 | Respuesta estándar | Todos los endpoints retornan `{ "status", "message", "data" }` sin excepción. |

### 8.2 Supuestos

| # | Supuesto |
|---|---|
| S1 | PostgreSQL está operativo dentro del stack antes del inicio del servicio de autenticación. |
| S2 | Los Kubernetes Secrets estan correctamente configurados en el cluster antes del despliegue. |
| S3 | El balanceador de carga interno distribuye trafico de forma equitativa entre replicas. |
| S4 | El reloj está sincronizado (NTP) en todos los nodos del clúster para garantizar consistencia en la validación de `exp`. |
| S5 | El script de seed para el primer SUPERADMIN se ejecuta antes del primer uso del sistema. |

---

## 9. Criterios de Aceptación

### HU1 – Crear usuario con rol

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU1-01 | El SUPERADMIN envía nombre, correo, rol y organización. | Usuario creado con `user_id` inmutable, estado `PENDING`, Magic Link generado. HTTP 201 con `_mock_magic_link`. |
| CA-HU1-02 | Se intenta crear un usuario con correo ya registrado. | HTTP 409 Conflict. No se crea duplicado. |
| CA-HU1-03 | Se intenta crear un usuario con rol no definido en el sistema. | HTTP 400 Bad Request con mensaje descriptivo. |
| CA-HU1-04 | Se intenta crear usuario sin estar autenticado como SUPERADMIN. | HTTP 403 Forbidden. |
| CA-HU1-05 | El usuario en estado PENDING intenta activarse. | Magic Link válido → `state=ACTIVE`, redirección a login OIDC sin emitir JWT. |

**Stack técnico:** `POST /api/v1/users` · tabla `users` (user_id, state) · tabla `magic_links`.

### HU2 – Gestionar estado de usuario

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU2-01 | El SUPERADMIN deshabilita un usuario activo. | `state = DISABLED`. Usuario no puede autenticarse. Historial intacto en BD. |
| CA-HU2-02 | Un usuario deshabilitado intenta iniciar sesión. | HTTP 401 Unauthorized con mensaje genérico. |
| CA-HU2-03 | El SUPERADMIN reactiva un usuario deshabilitado. | `state = ACTIVE`. Usuario puede iniciar sesión normalmente. |
| CA-HU2-04 | El SUPERADMIN elimina (soft delete) un usuario. | `state = DELETED`, `deleted_at` establecido. Sin acceso. Trazabilidad en audit_log. |
| CA-HU2-05 | Se intenta deshabilitar al único SUPERADMIN activo del sistema. | HTTP 409 Conflict. Operación rechazada. |

**Stack técnico:** `PATCH /api/v1/users/{user_id}/status` · El middleware valida `state=ACTIVE` en cada request.

### HU3 – Iniciar sesión / Activar con Magic Link

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU3-01 | Usuario activo inicia sesión vía broker (Keycloak). | JWT con `exp=6h`, `role`, `user_id`, `jti`. HTTP 200 OK. |
| CA-HU3-02 | Usuario en estado PENDING intenta login. | HTTP 401. Debe usar Magic Link primero. |
| CA-HU3-03 | Usuario con estado DISABLED o DELETED intenta login. | HTTP 401 Unauthorized con mensaje genérico. |
| CA-HU3-04 | Correo no registrado en sistema. | HTTP 401. El usuario no existe en backend. |
| CA-HU3-05 | Usuario activa con Magic Link válido. | `state=ACTIVE`, redirección a login OIDC, sin JWT emitido. |
| CA-HU3-06 | Magic Link expirado o usado. | HTTP 400. Link inválido. |

**Stack tecnico:** `POST /api/v1/auth/login` · HS256 con Kubernetes Secret · Keycloak broker · Rate limiting.

### HU4 – Cerrar sesión

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU4-01 | Usuario autenticado envía logout con token válido. | `jti` registrado en `revoked_tokens` con `expires_at = exp` del token. HTTP 200 OK. |
| CA-HU4-02 | El mismo token se usa después del logout. | Middleware detecta `jti` en `revoked_tokens` → HTTP 401 Unauthorized. |
| CA-HU4-03 | Entrada en `revoked_tokens` alcanza su `expires_at`. | Cron elimina la entrada. La tabla no crece indefinidamente. |
| CA-HU4-04 | Logout sin token en el header Authorization. | HTTP 401 Unauthorized. |
| CA-HU4-05 | La réplica que procesa el logout es distinta a la que procesa la siguiente solicitud. | Comportamiento consistente: `revoked_tokens` está en PostgreSQL compartido, no en memoria de réplica. |

**Stack técnico:** `POST /api/v1/auth/logout` · tabla `revoked_tokens (jti UUID, expires_at TIMESTAMP)`.

### HU5 – Restricción de acciones por rol

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU5-01 | Investigador intenta acceder a endpoint exclusivo del SUPERADMIN (ej. crear usuario). | HTTP 403 Forbidden. La acción no se ejecuta. |
| CA-HU5-02 | Profesional Aplicador intenta exportar datos. | HTTP 403 Forbidden. |
| CA-HU5-03 | SUPERADMIN accede solo a endpoints permitidos por la matriz de permisos. | Acceso permitido segun la matriz de permisos de §5. |
| CA-HU5-04 | Token manipulado presenta rol no válido en su payload. | Validación de firma HS256 falla antes de evaluar el rol. HTTP 401 Unauthorized. |
| CA-HU5-05 | El mismo endpoint es invocado por dos roles distintos con permisos diferentes. | Middleware evalúa rol del token y aplica restricción sin consultar BD en cada request. |
| CA-HU5-06 | Endpoint no requiere autenticación (ej. `/health`). | La solicitud se procesa sin verificar token. Ruta declarada en whitelist explícita. |

**Stack técnico:** Middleware compartido importado por todos los servicios del stack · Verificación stateless del rol · Whitelist de rutas públicas.

---

## 10. Trazabilidad de Requisitos

| Historia | Criterios CA | Endpoint | Componente BD | Nivel de riesgo |
|---|---|---|---|---|
| HU1 – Crear usuario | CA-HU1-01 a 05 | `POST /api/v1/users` | tabla `users` (user_id, state) | Alto |
| HU2 – Gestionar estado | CA-HU2-01 a 05 | `PATCH /api/v1/users/{user_id}/status` | tabla `users` (campo `state`) | Alto |
| HU3 – Login/Activar | CA-HU3-01 a 06 | `POST /api/v1/auth/login` · `GET /auth/activate/:token` | tabla `users` + `magic_links` | Critico |
| HU4 – Logout | CA-HU4-01 a 05 | `POST /api/v1/auth/logout` | tabla `revoked_tokens` | Alto |
| HU5 – RBAC | CA-HU5-01 a 06 | Middleware transversal | JWT payload (stateless) | Crítico |
| RF-M1-LIST | — | `GET /api/v1/users` | tabla `users` | Bajo |
| RF-M1-07 | Audit log | — | `GET /api/v1/audit-log` | tabla `AuditLog` | Crítico |
| RF-M1-08 | Sesiones activas | — | `GET /api/v1/users/me/sessions` · `DELETE /api/v1/sessions/{jti}` | tabla `sessions` | Alto |
| RF-M1-06 | Cambiar correo | — | `PATCH /api/v1/users/{user_id}/email` | tabla `users` + `magic_links` | Alto |
| RF-M1-REGEN | Regenerar Magic Link | — | `POST /api/v1/users/{user_id}/regenerate-magic-link` | tabla `magic_links` | Medio |

---

## 11. Nuevos Requisitos Funcionales (Revisión 2026-03-22)

> **Adicionado en revisión 2026-03-22** · Referencia: GAP-M1-03, GAP-SEG-08, GAP-SEG-11

### RF-M1-07 – Consultar Audit Log

**Descripción:** El SUPERADMIN puede consultar el registro de auditoría de eventos de seguridad y acceso.

**Endpoint:** `GET /api/v1/audit-log`

**Acceso:** Solo `superadmin`.

**Parámetros opcionales:** `event`, `user_id`, `from`, `to`, `page`, `limit` (máx 50).

**Eventos registrados obligatoriamente (RNF-SEC-12):**

| Evento | Cuándo se registra |
|---|---|
| `USER_CREATED` | Usuario creado por SUPERADMIN |
| `USER_ACTIVATED` | Usuario activado con Magic Link |
| `LOGIN` | Login exitoso vía broker |
| `LOGIN_FAILED` | Autenticación fallida |
| `LOGOUT` | Cierre de sesión |
| `EMAIL_CHANGED` | Cambio de correo (invalida sesiones) |
| `USER_DISABLED` | Usuario deshabilitado |
| `USER_DELETED` | Usuario eliminado (soft delete) |
| `RATE_LIMIT_ACTIVADO` | IP/cuenta bloqueada por exceso de intentos |
| `ACCESS_DENIED` | Token válido pero rol insuficiente (RBAC) |
| `USER_LISTED` | Acceso al endpoint `GET /users` |

**Nota de implementación (Mock):** El audit log se almacena en memoria (`store.auditLog`). Los eventos se pierden al reiniciar. En producción debe persisterse en PostgreSQL.

### RF-M1-08 – Gestión de Sesiones Activas

**Descripción:** Un usuario autenticado puede ver sus sesiones activas y revocar sesiones individuales.

**Endpoints:**
- `GET /api/v1/users/me/sessions` — Lista sesiones activas del usuario autenticado.
- `DELETE /api/v1/sessions/{jti}` — Revoca una sesión específica por JTI.

**Reglas:** Solo se pueden revocar sesiones propias. Un SUPERADMIN no puede revocar sesiones de otros usuarios desde este endpoint.

---

*Módulo 1 – Autenticación y Control de Acceso · SRS v2.0 · 2026-03-12*
