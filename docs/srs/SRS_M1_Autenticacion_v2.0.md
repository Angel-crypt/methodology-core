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
- Creación de usuarios con rol asignado por el Administrador.
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
| **password_changed_at** | Timestamp registrado en la tabla `users` al cambiar la contraseña. El middleware rechaza con HTTP 401 todo token cuyo `iat` sea anterior a este valor, invalidando automáticamente todas las sesiones previas sin necesidad de revocar cada `jti` individualmente. |
| **must_change_password** | Campo booleano en `users`, `TRUE` por defecto al crear un usuario. Indica que el usuario tiene una contraseña temporal y debe cambiarla antes de poder usar el sistema. El middleware rechaza con HTTP 403 toda petición de un usuario con `must_change_password=TRUE`, excepto `PATCH /users/me/password`. Se establece en `FALSE` tras el primer cambio exitoso de contraseña, o en `TRUE` cuando el Administrador restablece la contraseña del usuario. |
| **Estado pending** | Estado derivado de un usuario cuando `active=TRUE` y `must_change_password=TRUE`. El usuario puede autenticarse pero no acceder a ningún endpoint hasta cambiar su contraseña. |
| **jti** | JWT ID. Identificador único del token incluido en el payload. Permite revocación individual en `revoked_tokens`. |
| **HS256** | Algoritmo de firma simétrica HMAC-SHA256. La clave se gestiona exclusivamente como Docker Secret. |
| **Docker Secret** | Mecanismo de gestión de secretos de Docker Swarm. Nunca en texto plano en archivos de configuración. |
| **revoked_tokens** | Tabla PostgreSQL que registra `jti` de tokens invalidados por logout. Tiene TTL igual a `exp` del token. |
| **Cron de limpieza** | Proceso dentro del contenedor que elimina entradas expiradas de `revoked_tokens`. |
| **Stateless** | La validación del token no requiere consulta a BD: el rol se extrae del JWT firmado. Solo se consulta BD para verificar `active` y `revoked_tokens`. |
| **RBAC** | Role-Based Access Control. Control de acceso basado en roles fijos. |
| **Rate limiting** | Mecanismo que bloquea temporalmente un IP/cuenta tras 5 intentos fallidos en 60 s. |
| **Whitelist de rutas públicas** | Lista explícita de endpoints que no requieren token (ej. `/health`). El middleware los excluye de la verificación. |
| **bcrypt** | Algoritmo de hash para contraseñas. Factor de trabajo mínimo 12. |

### 1.4 Referencias

- `SRS_General_v1.0.md` — Especificación general del sistema.
- `MockContract_M1_Autenticacion_v2.xml` — Contrato de mock server del módulo (v2.2).
- `Módulos_del_Sistema_y_Tareas_Asociadas.docx` — Backlog con HU1–HU5.
- `M1_Autenticacion.docx` — Documento original de scope del módulo.

### 1.5 Estructura del Documento

Las secciones 1–3 establecen el contexto, actores y alcance. La sección 5 detalla cada requisito funcional con su entidad, endpoint y flujo. La sección 6 define los atributos de calidad. Las secciones 7–10 cubren interfaces, restricciones, criterios de aceptación por HU y la matriz de trazabilidad.

---

## 2. Contexto del Módulo

### 2.1 Descripción del Módulo

El Módulo 1 es la base de seguridad de todo el sistema. Centraliza la autenticación y el control de acceso para garantizar que solo usuarios registrados y activos accedan al sistema, cada rol opere exclusivamente dentro de sus capacidades declaradas y exista trazabilidad de sesiones para auditoría operativa.

El módulo opera como un **servicio replicado en Docker Swarm multinodo**, lo que impone el requisito fundamental de ser completamente stateless: la validación JWT no depende de sesiones en memoria; todo el estado se almacena en PostgreSQL.

### 2.2 Problema que Resuelve

Sin este módulo, cualquier usuario podría invocar endpoints sensibles sin identificarse. El módulo garantiza que:
- Solo usuarios registrados y activos accedan al sistema.
- Cada rol opere exclusivamente dentro de sus capacidades declaradas.
- Exista trazabilidad de sesiones para auditoría operativa.
- La revocación de tokens funcione de forma consistente entre réplicas del servicio.

### 2.3 Rol en la Arquitectura Docker Swarm

```
Balanceador de carga Swarm
  └─ Réplica 1  ─┐
  └─ Réplica 2  ──┼─ Módulo 1 (stateless)
  └─ Réplica N  ─┘       │
                          ▼
                    PostgreSQL (fuente de verdad compartida)
                    ┌─────────────────────────────────┐
                    │ users  ·  revoked_tokens         │
                    └─────────────────────────────────┘
                          │
                    Docker Secret (clave HS256)
```

La validación de tokens es stateless: el rol se extrae del JWT firmado sin consulta a BD. Solo se consulta PostgreSQL para verificar `active` del usuario y presencia del `jti` en `revoked_tokens`.

### 2.4 Relación con Otros Módulos

| Módulo dependiente | Dependencia con M1 |
|---|---|
| M2 – Gestión de Instrumentos | Requiere token válido con rol Administrador |
| M3 – Definición de Métricas | Requiere token válido con rol Administrador |
| M4 – Registro Operativo | Requiere token válido con rol Profesional Aplicador |
| M5 – Consulta Interna | Requiere token válido con rol Investigador o Administrador |
| M6 – Exportación Estructurada | Requiere token válido con rol Investigador o Administrador |

### 2.5 Flujo General de Autenticación

```
POST /auth/login (email + password)
  └─ Valida credenciales + active=TRUE
       └─ Éxito → JWT(user_id, role, iat, exp=6h, jti)
            └─ Respuesta incluye must_change_password (boolean)

Cada petición protegida
  └─ Authorization: Bearer {token}
       └─ Middleware: valida firma HS256
            └─ Verifica jti no está en revoked_tokens
                 └─ Verifica active=TRUE en users
                      └─ Verifica must_change_password=FALSE (excepción: PATCH /users/me/password)
                           └─ Verifica rol vs. endpoint → concede o deniega

POST /auth/logout
  └─ Registra jti en revoked_tokens (expires_at = exp del token)
  └─ Cron elimina entradas cuyo expires_at < ahora
```

### 2.6 Máquina de Estados de Usuario

Los usuarios tienen tres estados derivados de los campos `active` y `must_change_password`:

```
  [CREACIÓN]
      │ POST /users → active=TRUE, must_change_password=TRUE
      ▼
  ┌─────────────────────────────────────────────────┐
  │  PENDING  (active=TRUE, must_change_password=TRUE) │
  │  - Puede autenticarse (login exitoso)            │
  │  - Solo puede usar PATCH /users/me/password      │
  │  - Administrador puede: regenerar contraseña     │
  │                          desactivar              │
  └─────────────┬───────────────────────────────────┘
                │ PATCH /users/me/password exitoso
                │ → must_change_password=FALSE
                ▼
  ┌─────────────────────────────────────────────────┐
  │  ACTIVE   (active=TRUE, must_change_password=FALSE)│
  │  - Acceso completo según su rol                  │
  │  - Administrador puede: desactivar               │
  │                          restablecer contraseña  │
  └─────────────┬──────────────┬────────────────────┘
                │ PATCH        │ PATCH /users/:id/status
                │ /users/:id/  │ { active: false }
                │ reset-pass.  ▼
                │   ┌──────────────────────────────────────────┐
                │   │  INACTIVE  (active=FALSE)                 │
                │   │  - No puede autenticarse                  │
                │   │  - Administrador puede: activar           │
                │   └──────────────┬───────────────────────────┘
                │                  │ PATCH /users/:id/status
                │                  │ { active: true }
                │                  └─► vuelve al estado anterior
                │                      (PENDING o ACTIVE)
                │
                └─► vuelve a PENDING (must_change_password=TRUE)
```

**Regla de reactivación:** al activar un usuario inactivo, `active` vuelve a `TRUE` pero `must_change_password` conserva su valor previo. Un usuario que fue desactivado en estado PENDING volverá a PENDING al reactivarse.

---

## 3. Stakeholders y Usuarios del Módulo

### 3.1 Stakeholders del Módulo

| Rol | Interés en el módulo | Responsabilidades relacionadas |
|---|---|---|
| **Equipo de desarrollo** | Implementar correctamente la seguridad base del sistema. | Codificar, probar e integrar conforme al SRS y al DoD. |
| **Responsable técnico** | Garantizar seguridad y disponibilidad del módulo en el clúster. | Configurar Docker Secrets, revisar PRs, firmar cierre de historias. |
| **Testers / QA** | Verificar todos los criterios incluyendo casos negativos. | Diseñar y ejecutar pruebas funcionales, negativas y de integración. |
| **Módulos M2–M6** | Que el middleware funcione correctamente en cada petición. | Consumir el JWT de M1 en todos sus endpoints. |

### 3.2 Tipos de Usuarios

| Tipo | Descripción | Acceso a este módulo |
|---|---|---|
| **Administrador** | Control total del sistema. | Login, logout. Gestión de usuarios (crear, activar/desactivar). |
| **Investigador** | Usuario académico de consulta. | Login, logout. |
| **Profesional Aplicador** | Profesional de campo. | Login, logout. |

---

## 4. Alcance del Módulo

### 4.1 Objetivo del Módulo

Garantizar que solo usuarios autenticados con el rol correcto accedan a cada funcionalidad del sistema, mediante un modelo de seguridad Zero Trust con verificación stateless por petición, compatible con despliegue replicado en Docker Swarm.

### 4.2 Funcionalidades Principales

| # | Capacidad | HU |
|---|---|---|
| 1 | Registro de usuarios con rol asignado por el Administrador | HU1 |
| 2 | Activación y desactivación de cuentas sin eliminación de historial | HU2 |
| 3 | Inicio de sesión con emisión de token JWT (6 h, HS256, jti) | HU3 |
| 4 | Cierre de sesión con invalidación del token en `revoked_tokens` | HU4 |
| 5 | Restricción de acciones por rol mediante middleware stateless | HU5 |
| 6 | Cambio de contraseña autenticado con invalidación automática de sesiones previas | HU6b |
| 7 | Contraseña temporal en creación con cambio forzado en primer acceso (estado pending) | IT-1 |
| 8 | Restablecimiento de contraseña temporal por el Administrador | IT-1 |

### 4.3 Fuera del Alcance

| Funcionalidad excluida | Módulo o decisión responsable |
|---|---|
| Registro autónomo de usuarios | No contemplado. Solo el Administrador crea cuentas. |
| Recuperación de contraseña vía email | Fuera del MVP; se delega a canal externo o decisión futura. |
| Autenticación multifactor (MFA) | Puede incorporarse en iteraciones futuras. |
| Federación de identidad (OAuth2, SAML, LDAP) | No requerido; credenciales propias en PostgreSQL. |
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
| **Actor** | Administrador |
| **Entidades** | `User`, `Role` |
| **Endpoint** | `POST /users` |
| **Entrada** | `full_name` (string, obligatorio), `email` (string, obligatorio, único), `role` (enum: `administrator` · `researcher` · `applicator`) |
| **Descripción** | El sistema debe permitir al Administrador registrar un nuevo usuario con rol asignado. El correo debe ser único. **Fix 2 (Security by Design, 2026-03-23):** el Administrador no provee la contraseña — el servidor la genera internamente con `generateTempPassword()` (CSPRNG basado en `crypto.randomBytes()`). Esto garantiza que ni el admin ni el canal de transmisión conocen la contraseña antes de que el usuario la reciba. La contraseña se hashea con bcrypt (factor mínimo 12); nunca en texto plano. El usuario se crea en estado **pending** (`active=TRUE`, `must_change_password=TRUE`): puede autenticarse pero el middleware bloquea todos los endpoints hasta que cambie su contraseña. La respuesta incluye `_mock_temp_password` (solo en mock) para que el frontend muestre el modal de credenciales al Administrador una sola vez. |
| **Resultado** | Usuario creado en PostgreSQL con UUID, `password_hash`, `role`, `active=TRUE`, `must_change_password=TRUE`, `created_at`. HTTP 201 con datos del usuario sin contraseña, incluyendo `must_change_password` y `_mock_temp_password` (solo mock). |

**Esquema de tabla `users`:**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK, generado automáticamente |
| `full_name` | VARCHAR | Nombre completo |
| `email` | VARCHAR | Único, índice |
| `password_hash` | VARCHAR | bcrypt factor ≥ 12 |
| `role` | ENUM | `administrator` · `researcher` · `applicator` |
| `active` | BOOLEAN | `TRUE` por defecto |
| `must_change_password` | BOOLEAN | `TRUE` por defecto. Indica estado **pending**. Se establece `FALSE` al cambiar contraseña; `TRUE` al restablecer por admin. |
| `created_at` | TIMESTAMP | UTC |
| `updated_at` | TIMESTAMP | `NULL` por defecto. Se actualiza en `PATCH /users/:id/status` y `POST /users/:id/reset-password`. |
| `password_changed_at` | TIMESTAMP | `NULL` por defecto. Se actualiza al cambiar la contraseña. El middleware rechaza tokens con `iat` anterior a este valor. |

---

### RF-M1-02 – Activar / desactivar usuario *(HU2)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador |
| **Entidades** | `User` (campo `active`) |
| **Endpoint** | `PATCH /users/{id}/status` |
| **Entrada** | `id` (UUID, path param), `active` (boolean) |
| **Descripción** | El sistema debe permitir al Administrador cambiar el estado operativo de un usuario. Un usuario con `active = FALSE` es rechazado en login con HTTP 401 y el mismo mensaje genérico que cualquier otro fallo de autenticación (sin revelar que la cuenta está desactivada). El middleware también rechaza peticiones de usuarios desactivados aunque su token no haya expirado. Los registros históricos del usuario no se modifican. El sistema debe proteger al único Administrador activo: si se intenta desactivar al único `administrator` con `active=TRUE`, la operación es rechazada con HTTP 409. |
| **Resultado** | Campo `active` actualizado. HTTP 200. |

---

### RF-M1-03 – Iniciar sesión *(HU3)*

| Campo | Detalle |
|---|---|
| **Actor** | Cualquier usuario registrado y activo |
| **Endpoint** | `POST /auth/login` |
| **Entrada** | `email` (string), `password` (string) |
| **Descripción** | El sistema valida credenciales verificando el hash bcrypt y el estado `active = TRUE`. Si la autenticación es exitosa emite un token JWT firmado con HS256 usando el Docker Secret. El token incluye `user_id`, `role`, `iat`, `exp` (iat + 21600 s) y `jti` (UUID único para soporte de revocación). Todos los fallos de autenticación —credenciales incorrectas, usuario inexistente, cuenta desactivada— retornan **HTTP 401 con mensaje genérico idéntico**, sin revelar causa. El sistema implementa rate limiting: 5 intentos fallidos en 60 s bloquean temporalmente el IP/cuenta durante 5 minutos; durante el bloqueo el sistema retorna HTTP 401 con el mismo mensaje genérico (no HTTP 429). El token es stateless y válido entre reinicios del servicio, ya que la clave reside en el Docker Secret compartido entre nodos. La respuesta incluye el campo `must_change_password` para que el cliente pueda mostrar el modal de cambio forzado si el usuario está en estado **pending**. Un usuario en estado **pending** sí puede autenticarse, pero el middleware bloqueará sus peticiones hasta que cambie la contraseña. |
| **Resultado** | `{ access_token, token_type: "Bearer", expires_in: 21600, must_change_password: boolean }`. HTTP 200. |

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
| **Descripción** | El middleware se implementa como función compartida importada por todos los servicios del stack. Para cada petición evalúa en orden: (1) Validación de firma HS256 del token. Si falla → 401 (antes de evaluar rol). (2) Verificación de `jti` en `revoked_tokens`. Si está → 401. (3) Verificación de `active=TRUE` en `users`. Si está inactivo → 401. (4) Verificación de `password_changed_at`: si el token fue emitido antes del último cambio de contraseña → 401. **(4b) Verificación de `must_change_password`**: si `TRUE`, todas las peticiones retornan HTTP 403 con `{ must_change_password: true }`, excepto `PATCH /users/me/password` que siempre está permitida para usuarios autenticados (flag `allowPending`). (5) Verificación de rol del token contra la matriz de permisos centralizada → si no tiene permiso → 403. La verificación es stateless respecto al rol: se extrae del JWT sin consultar BD. Las rutas públicas (ej. `/health`) se declaran en una whitelist explícita y son excluidas de la verificación. |
| **Resultado** | HTTP 401 ante firma inválida, token revocado o usuario inactivo. HTTP 403 con `must_change_password: true` si el usuario está en estado pending. HTTP 403 ante rol sin permiso. |

**Matriz de permisos (constante centralizada, nunca hardcodeada por endpoint):**

| Acción / Recurso | administrator | researcher | applicator |
|---|:---:|:---:|:---:|
| Crear usuario con rol | ✓ | ✗ | ✗ |
| Activar / desactivar usuario | ✓ | ✗ | ✗ |
| Iniciar sesión | ✓ | ✓ | ✓ |
| Cerrar sesión | ✓ | ✓ | ✓ |
| Gestionar instrumentos metodológicos | ✓ | ✗ | ✗ |
| Definir métricas | ✓ | ✗ | ✗ |
| Registrar sujetos y aplicar pruebas | ✓ | ✗ | ✓ |
| Consultar registros internos | ✓ | ✓ | ✗ |
| Exportar datos (CSV / JSON) | ✓ | ✓ | ✗ |

---

### RF-M1-LIST – Listar usuarios *(soporte administrativo)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador |
| **Endpoint** | `GET /users` |
| **Entrada** | Query params opcionales: `active` (boolean), `role` (enum) |
| **Descripción** | El sistema debe devolver el listado de usuarios registrados. La respuesta nunca incluye `password_hash`. Solo accesible por el Administrador. Incluye el campo `must_change_password` para que el frontend pueda derivar el estado (pending / active / inactive) de cada usuario. |
| **Resultado** | Lista de usuarios con id, full_name, email, role, active, `must_change_password`, created_at. HTTP 200. |

---

### RF-M1-06 – Cambiar contraseña *(HU6b)*

| Campo | Detalle |
|---|---|
| **Actor** | Cualquier usuario autenticado |
| **Entidades** | `User` (campos `password_hash`, `password_changed_at`), `AuditLog` |
| **Endpoint** | `PATCH /users/me/password` |
| **Entrada** | `current_password` (string, obligatorio), `new_password` (string, obligatorio) |
| **Descripción** | El sistema permite al usuario autenticado cambiar su propia contraseña. Este endpoint **siempre está permitido** independientemente del estado `must_change_password` (flag `allowPending` en el middleware). Valida en orden: (1) `bcrypt.verify(current_password, password_hash)` — si falla, HTTP 401. (2) `bcrypt.verify(new_password, password_hash)` — si la nueva contraseña es idéntica a la actual, HTTP 400. Superadas las validaciones, hashea la nueva contraseña con bcrypt (factor ≥ 12), actualiza `password_hash`, registra `password_changed_at = NOW()` y establece `must_change_password = FALSE` (transición PENDING → ACTIVE o mantenimiento en ACTIVE). El evento se registra en `AuditLog` con detalle diferenciado si el cambio fue forzado. |
| **Resultado** | `password_hash`, `password_changed_at` y `must_change_password=FALSE` actualizados. Todas las sesiones anteriores invalidadas. HTTP 200. |

---

### RF-M1-RESET – Restablecer contraseña temporal *(IT-1)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador |
| **Entidades** | `User` (campos `password_hash`, `must_change_password`, `password_changed_at`) |
| **Endpoint** | `POST /users/{id}/reset-password` |
| **Entrada** | `id` (UUID, path param) |
| **Descripción** | El sistema permite al Administrador generar una nueva contraseña temporal para un usuario activo (en estado **pending** o **active**). **Fix 1 (CSPRNG, 2026-03-23):** la contraseña se genera con `generateTempPassword()` usando `crypto.randomBytes()` (entropía del SO; prohibido `Math.random()`). Algoritmo: charset 61 caracteres sin ambiguos (sin I/L/O/i/l/o/0/1), longitud 16, ~95.8 bits de entropía (`log₂(61^16)`), rejection sampling para eliminar sesgo de módulo, Fisher-Yates shuffle con CSPRNG. Sin formato fijo, sin timestamp, sin patrones predecibles. El sistema la hashea con bcrypt (factor ≥ 12), y establece `must_change_password=TRUE` y `password_changed_at=NOW()` (esto invalida los tokens activos del usuario). El usuario vuelve al estado **pending** y deberá cambiar la contraseña en su próximo acceso. **Solo en el mock de desarrollo:** la contraseña temporal se devuelve en el campo `_mock_temp_password`; en producción nunca se expone en la respuesta — se entrega por canal seguro fuera de banda. Si el usuario está en estado **inactive** (`active=FALSE`), la operación es rechazada con HTTP 409 (debe activarse primero). |
| **Resultado** | `password_hash`, `must_change_password=TRUE` y `password_changed_at` actualizados. Todas las sesiones activas del usuario quedan invalidadas. HTTP 200. |

---

## 6. Requisitos No Funcionales

| ID | Categoría | Descripción | Métrica verificable |
|---|---|---|---|
| RNF-M1-01 | Rendimiento | Los endpoints responden en tiempo razonable. | `POST /auth/login` < 1 s. Demás endpoints < 500 ms. |
| RNF-M1-02 | Seguridad | Contraseñas almacenadas como hash bcrypt factor ≥ 12. | Ninguna contraseña en texto plano en ninguna capa. |
| RNF-M1-03 | Seguridad | Token JWT firmado HS256 con clave almacenada como Docker Secret. | Clave nunca en texto plano en archivos de configuración ni variables de entorno. |
| RNF-M1-04 | Seguridad | Token expira en 6 horas (exp = iat + 21600). | Token expirado retorna 401. Sin mecanismo de refresh. |
| RNF-M1-05 | Seguridad | El campo `jti` está presente en todos los tokens emitidos. | 100% de tokens incluyen `jti` UUID único. |
| RNF-M1-06 | Seguridad | El middleware verifica firma, revocación, estado activo y rol en cada petición. | Sin firma válida → 401. Token en `revoked_tokens` → 401. Usuario inactivo → 401. Rol incorrecto → 403. |
| RNF-M1-07 | Seguridad | Rate limiting: 5 intentos fallidos en 60 s → bloqueo 5 min. Durante el bloqueo el sistema retorna HTTP 401 con mensaje genérico idéntico al de autenticación fallida. No se retorna HTTP 429. | El audit_log registra `AUTH_RATE_LIMIT_TRIGGERED` con IP y timestamp. La respuesta es indistinguible de un fallo de autenticación normal. |
| RNF-M1-13 | Seguridad | Al cambiar la contraseña, todas las sesiones previas quedan invalidadas automáticamente vía `password_changed_at`. | El middleware rechaza con HTTP 401 tokens con `iat < password_changed_at`. |
| RNF-M1-14 | Seguridad | La nueva contraseña no puede ser idéntica a la actual. | `bcrypt.verify(new_password, current_hash) == true` → HTTP 400. |
| RNF-M1-08 | Disponibilidad | Servicio stateless compatible con múltiples réplicas en Swarm. | Sin sesiones en memoria. Comportamiento idéntico independientemente de qué réplica procesa cada petición. |
| RNF-M1-09 | Integridad | `revoked_tokens` no crece indefinidamente. | Cron elimina entradas con `expires_at < NOW()`. Tabla no supera el volumen de tokens activos simultáneos. |
| RNF-M1-10 | Integridad | El único Administrador activo no puede desactivarse. | Intento de desactivar el último admin activo → 409. |
| RNF-M1-11 | Mantenibilidad | Matriz de permisos como constante centralizada. | No existen permisos hardcodeados en endpoints individuales. |
| RNF-M1-12 | Consistencia API | Todas las respuestas siguen `{ "status", "message", "data" }`. | 100% de endpoints retornan estructura estándar. |
| RNF-M1-15 | Seguridad (Fix 1) | Las contraseñas temporales se generan exclusivamente con CSPRNG (`crypto.randomBytes()`). Prohibido `Math.random()` (Xorshift128+, predecible), UUIDs (charset hex limitado, ~64 bits), timestamps (patrón temporal). | `generateTempPassword()` usa `crypto.randomBytes(4)` por índice. Entropía mínima: ~95.8 bits (`log₂(61^16)`). Sin formato fijo o terminador predecible. Rejection sampling elimina sesgo de módulo. Fisher-Yates shuffle con CSPRNG. |
| RNF-M1-16 | Seguridad (Fix 2) | El Administrador no provee contraseña al crear un usuario. El servidor la genera internamente. | `POST /users` rechaza el campo `password` en el body. La contraseña se genera con `generateTempPassword()` en el servidor. |

---

## 7. Interfaces Externas

### 7.1 Interfaces con Otros Módulos

| Módulo | Tipo | Detalle |
|---|---|---|
| M2, M3, M4, M5, M6 | Consumidor | Todos importan el middleware de M1 para validar JWT y rol en cada petición. El middleware es una función compartida dentro del stack, no un endpoint separado. |

### 7.2 Interfaces de Usuario

- Formulario de inicio de sesión con email y contraseña.
- Panel de administración: listado de usuarios con filtros por rol y estado (`active`), acciones de activar/desactivar.
- Formulario de creación de usuario: nombre completo, email, rol. (La contraseña la genera el servidor.)

### 7.3 Interfaces de Software

| Componente | Descripción |
|---|---|
| **FastAPI** | Framework web. Expone los endpoints REST. |
| **passlib (bcrypt)** | Hash y verificación de contraseñas. Factor de trabajo ≥ 12. |
| **python-jose** | Generación y validación de tokens JWT HS256. |
| **SQLAlchemy + PostgreSQL** | ORM y base de datos para `users` y `revoked_tokens`. |
| **Alembic** | Migraciones del esquema de las tablas del módulo. |
| **Pydantic** | Validación de esquemas de entrada y salida. |
| **Docker Swarm** | Orquestación del servicio replicado. Gestión de Docker Secrets. |

### 7.4 Interfaces de Comunicación

- Base path: `/api/v1`
- Protocolo: HTTP/HTTPS · Formato: JSON
- Autenticación en endpoints protegidos: `Authorization: Bearer {token}`
- Clave JWT: Docker Secret montado en el contenedor (no variable de entorno)
- Sincronización de reloj: NTP requerido en todos los nodos del clúster

---

## 8. Restricciones y Supuestos

### 8.1 Restricciones

| # | Restricción | Detalle |
|---|---|---|
| R1 | Stateless obligatorio | Sin sesiones en memoria compartida entre réplicas. Todo el estado en PostgreSQL. |
| R2 | Docker Secret | La clave HS256 se gestiona exclusivamente como Docker Secret. Nunca en texto plano en `.env` o Compose. |
| R3 | PostgreSQL única fuente de verdad | Usuarios, roles y tokens revocados solo en PostgreSQL. |
| R4 | bcrypt factor ≥ 12 | Ningún otro algoritmo de hash para contraseñas. |
| R5 | Sin recuperación de contraseña | No implementado en MVP. |
| R6 | Sin federación de identidad | Credenciales propias en PostgreSQL. Sin OAuth2, SAML ni LDAP. |
| R7 | Roles fijos | Los tres roles son fijos. Sin gestión granular de permisos. |
| R8 | Sin auto-registro | Solo el Administrador crea cuentas. |
| R9 | Respuesta estándar | Todos los endpoints retornan `{ "status", "message", "data" }` sin excepción. |

### 8.2 Supuestos

| # | Supuesto |
|---|---|
| S1 | PostgreSQL está operativo dentro del stack antes del inicio del servicio de autenticación. |
| S2 | Los Docker Secrets están correctamente configurados en el manager node antes del despliegue. |
| S3 | El balanceador de carga interno de Swarm distribuye tráfico de forma equitativa entre réplicas. |
| S4 | El reloj está sincronizado (NTP) en todos los nodos del clúster para garantizar consistencia en la validación de `exp`. |
| S5 | El script de seed para el primer Administrador se ejecuta antes del primer uso del sistema. |

---

## 9. Criterios de Aceptación

### HU1 – Crear usuario con rol

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU1-01 | El Administrador envía nombre, correo y rol válido (sin contraseña). | Usuario creado en PostgreSQL con `password_hash` bcrypt (generado por servidor con CSPRNG) y `active=TRUE`. HTTP 201 con `_mock_temp_password`. |
| CA-HU1-02 | Se intenta crear un usuario con correo ya registrado. | HTTP 409 Conflict. No se crea duplicado. |
| CA-HU1-03 | Se intenta crear un usuario con rol no definido en el sistema. | HTTP 400 Bad Request con mensaje descriptivo. |
| CA-HU1-04 | Se intenta crear usuario sin estar autenticado como Administrador. | HTTP 403 Forbidden. |
| CA-HU1-05 | El usuario creado intenta iniciar sesión inmediatamente. | Login exitoso. Rol asignado reflejado en el token JWT. |

**Stack técnico:** `POST /api/v1/users` · tabla `users` · bcrypt factor ≥ 12.

### HU2 – Activar / desactivar usuario

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU2-01 | El Administrador desactiva un usuario activo. | `active = FALSE`. Usuario no puede autenticarse. Historial intacto en BD. |
| CA-HU2-02 | Un usuario desactivado intenta iniciar sesión. | HTTP 401 Unauthorized con mensaje genérico idéntico al de credenciales incorrectas. No se revela que la cuenta está desactivada. |
| CA-HU2-03 | El Administrador reactiva un usuario desactivado. | `active = TRUE`. Usuario puede iniciar sesión normalmente. |
| CA-HU2-04 | Un token JWT emitido antes de la desactivación se usa después. | Middleware detecta `active=FALSE` y retorna HTTP 401 inmediatamente. |
| CA-HU2-05 | Se intenta desactivar al único Administrador activo del sistema. | HTTP 409 Conflict. Operación rechazada para preservar acceso administrativo mínimo. |

**Stack técnico:** `PATCH /api/v1/users/{id}/status` · El middleware valida `active=TRUE` en cada request, no solo en login.

### HU3 – Iniciar sesión

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU3-01 | Credenciales correctas, cuenta activa. | JWT con `exp=6h`, `role`, `user_id`, `jti`. HTTP 200 OK. `{ access_token, token_type: "Bearer", expires_in: 21600 }`. |
| CA-HU3-02 | Contraseña incorrecta. | HTTP 401 Unauthorized. Mensaje genérico sin revelar si el correo existe. |
| CA-HU3-03 | Correo no registrado. | HTTP 401 Unauthorized con mensaje genérico (sin enumeración de usuarios). |
| CA-HU3-04 | Usuario desactivado con credenciales correctas. | HTTP 401 Unauthorized con mensaje genérico. No se emite token ni se revela causa. |
| CA-HU3-05 | Servicio de autenticación se reinicia en Swarm tras emitir un token. | Token sigue siendo válido (validación stateless por firma con Docker Secret compartido entre nodos). |
| CA-HU3-06 | 5 intentos fallidos consecutivos en menos de 60 s. | Bloqueo temporal del IP/cuenta durante 5 minutos. El sistema retorna HTTP 401 con mensaje genérico durante el bloqueo; no retorna HTTP 429. El evento queda registrado en audit_log como `AUTH_RATE_LIMIT_TRIGGERED`. |

**Stack técnico:** `POST /api/v1/auth/login` · HS256 con Docker Secret · Rate limiting a nivel de servicio o proxy Swarm.

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
| CA-HU5-01 | Investigador intenta acceder a endpoint exclusivo del Administrador (ej. crear usuario). | HTTP 403 Forbidden. La acción no se ejecuta. |
| CA-HU5-02 | Profesional Aplicador intenta exportar datos. | HTTP 403 Forbidden. |
| CA-HU5-03 | Administrador accede a cualquier endpoint del sistema. | Acceso permitido según la matriz de permisos de §5. |
| CA-HU5-04 | Token manipulado presenta rol no válido en su payload. | Validación de firma HS256 falla antes de evaluar el rol. HTTP 401 Unauthorized. |
| CA-HU5-05 | El mismo endpoint es invocado por dos roles distintos con permisos diferentes. | Middleware evalúa rol del token y aplica restricción sin consultar BD en cada request. |
| CA-HU5-06 | Endpoint no requiere autenticación (ej. `/health`). | La solicitud se procesa sin verificar token. Ruta declarada en whitelist explícita. |

**Stack técnico:** Middleware compartido importado por todos los servicios del stack · Verificación stateless del rol · Whitelist de rutas públicas.

### HU6b – Cambiar contraseña

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU6b-01 | Usuario autenticado envía contraseña actual correcta y nueva contraseña distinta. | `password_hash` actualizado. `password_changed_at = NOW()`. HTTP 200. |
| CA-HU6b-02 | La nueva contraseña es idéntica a la actual. | HTTP 400 Bad Request. No se actualiza nada. |
| CA-HU6b-03 | La contraseña actual proporcionada es incorrecta. | HTTP 401 Unauthorized. No se actualiza nada. |
| CA-HU6b-04 | Tras el cambio exitoso, se usa un token emitido antes del cambio. | HTTP 401 Unauthorized. El middleware detecta `iat < password_changed_at`. |
| CA-HU6b-05 | El usuario sin token intenta cambiar su contraseña. | HTTP 401 Unauthorized. |

**Stack técnico:** `PATCH /api/v1/users/me/password` · tabla `users` (campos `password_hash`, `password_changed_at`) · tabla `AuditLog` · bcrypt factor ≥ 12 · middleware check `iat < password_changed_at`.

---

## 10. Trazabilidad de Requisitos

| Historia | Criterios CA | Endpoint | Componente BD | Nivel de riesgo |
|---|---|---|---|---|
| HU1 – Crear usuario | CA-HU1-01 a 05 | `POST /api/v1/users` | tabla `users` | Alto |
| HU2 – Activar/Desactivar | CA-HU2-01 a 05 | `PATCH /api/v1/users/{id}/status` | tabla `users` (campo `active`) | Alto |
| HU3 – Login | CA-HU3-01 a 06 | `POST /api/v1/auth/login` | tabla `users` + Docker Secret | Crítico |
| HU4 – Logout | CA-HU4-01 a 05 | `POST /api/v1/auth/logout` | tabla `revoked_tokens` | Alto |
| HU5 – RBAC | CA-HU5-01 a 06 | Middleware transversal | JWT payload (stateless) | Crítico |
| RF-M1-06 | Cambiar contraseña | CA-HU6b-01 a 05 | `PATCH /api/v1/users/me/password` | tabla `users` + `AuditLog` | Alto |
| RF-M1-LIST | — | `GET /api/v1/users` | tabla `users` | Bajo |
| RF-M1-07 | Audit log | — | `GET /api/v1/audit-log` | tabla `AuditLog` | Crítico |
| RF-M1-08 | Sesiones activas | — | `GET /api/v1/users/me/sessions` · `DELETE /api/v1/sessions/{jti}` | tabla `sessions` | Alto |
| RF-M1-09 | Recuperación de contraseña | — | `POST /api/v1/auth/password-recovery` · `POST /api/v1/auth/password-reset` | tabla `users` + `AuditLog` | Alto |
| RF-M1-RESET (IT-1) | Regenerar contraseña temporal | — | `POST /api/v1/users/{id}/reset-password` | tabla `users` | Alto |
| RNF-M1-15 (Fix-Sec-01) | CSPRNG contraseñas temporales | — | `POST /users` · `POST /users/:id/reset-password` | — | Crítico |
| RNF-M1-16 (Fix-Sec-02) | POST /users sin password del admin | — | `POST /users` | — | Alto |

---

## 11. Nuevos Requisitos Funcionales (Revisión 2026-03-22)

> **Adicionado en revisión 2026-03-22** · Referencia: GAP-M1-03, GAP-SEG-08, GAP-SEG-11

### RF-M1-07 – Consultar Audit Log

**Descripción:** El Administrador puede consultar el registro de auditoría de eventos de seguridad y acceso.

**Endpoint:** `GET /api/v1/audit-log`

**Acceso:** Solo `administrator`.

**Parámetros opcionales:** `event`, `user_id`, `from`, `to`, `page`, `limit` (máx 50).

**Eventos registrados obligatoriamente (RNF-SEC-12):**

| Evento | Cuándo se registra |
|---|---|
| `LOGIN` | Login exitoso |
| `LOGIN_FALLIDO` | Credenciales incorrectas (antes del bloqueo) |
| `LOGOUT` | Cierre de sesión o revocación de sesión |
| `CAMBIO_CONTRASENA` | Cambio o restablecimiento de contraseña |
| `RATE_LIMIT_ACTIVADO` | IP/cuenta bloqueada por exceso de intentos |
| `ACCESO_DENEGADO` | Token válido pero rol insuficiente (RBAC) |
| `CONSULTA_USUARIOS` | Acceso al endpoint `GET /users` |

**Nota de implementación (Mock):** El audit log se almacena en memoria (`store.auditLog`). Los eventos se pierden al reiniciar. En producción debe persistirse en PostgreSQL.

### RF-M1-08 – Gestión de Sesiones Activas

**Descripción:** Un usuario autenticado puede ver sus sesiones activas y revocar sesiones individuales.

**Endpoints:**
- `GET /api/v1/users/me/sessions` — Lista sesiones activas del usuario autenticado.
- `DELETE /api/v1/sessions/{jti}` — Revoca una sesión específica por JTI.

**Reglas:** Solo se pueden revocar sesiones propias. Un administrador no puede revocar sesiones de otros usuarios desde este endpoint.

### RF-M1-09 – Recuperación de Contraseña

**Descripción:** Permite restablecer la contraseña mediante token temporal.

**Endpoints:**
- `POST /api/v1/auth/password-recovery` — Solicita recuperación (acepta `email`). Respuesta siempre genérica (anti-enumeración).
- `POST /api/v1/auth/password-reset` — Restablece contraseña con `{recovery_token, new_password}`.

**TTL del token:** 15 minutos.

**Nota de implementación (Mock):** El token se devuelve directamente en la respuesta (`_mock_recovery_token`). **En producción se debe enviar por email y NUNCA exponer en la respuesta API.**

---

*Módulo 1 – Autenticación y Control de Acceso · SRS v2.0 · 2026-03-12*
