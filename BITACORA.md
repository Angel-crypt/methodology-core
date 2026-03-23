# BITÁCORA DE ANÁLISIS — Gap Analysis methodology-core
**Fecha de apertura:** 2026-03-16
**Arquitecto / Team Lead:** Claude Sonnet 4.6
**Rama:** feature/mock-server

---

## 1. Inventario de Artefactos

### 1.1 Archivos SRS (`docs/srs/`)

| Archivo | Versión | Estado | Módulos cubiertos |
|---|---|---|---|
| `SRS_General_v1.0.md` | 1.0 | Borrador | Sistema completo — RNF transversales, modelo de datos global |
| `SRS_M1_Autenticacion_v2.0.md` | 2.0 | En revisión | HU1–HU5 (crear usuario, activar/desactivar, login, logout, RBAC, cambio password) |
| `SRS_M2_Gestion_Instrumentos_v2.0.md` | 2.0 | Borrador | HU6–HU9 (crear, editar, activar/desactivar instrumento, listar) |
| `SRS_M3_Definicion_Metricas_v1.0.md` | 1.0 | Borrador | HU10–HU13 (crear métrica, tipo de dato, rango, obligatoriedad) |
| `SRS_M4_Registro_Operativo_v1.0.md` | 1.0 | Borrador | HU14–HU17 (registrar sujeto, contexto, aplicación, capturar valores) |

### 1.2 Contratos XML (`mock/responses/`)

| Archivo | Versión | Estado | Endpoints cubiertos |
|---|---|---|---|
| `MockContract_M1_Autenticacion_v2.xml` | 2.0 | En revisión | POST /users, PATCH /users/:id/status, POST /auth/login, POST /auth/logout, PATCH /users/me/password, GET /users |
| `MockContract_M2_Gestion_Instrumentos_v2.xml` | 2.0 (raíz dice v1.0) | En revisión | POST /instruments, PATCH /instruments/:id, PATCH /instruments/:id/status, GET /instruments |
| `MockContract_M3_Metricas_v1.xml` | 1.0 | En revisión | POST /metrics, PATCH /metrics/:id, GET /metrics |
| `MockContract_M4_RegistroOperativo_v1.xml` | 1.0 | En revisión | POST /subjects, POST /subjects/:id/context, POST /applications, POST /metric-values, GET /subjects/:id |

### 1.3 Archivos del Mock Server (`mock/src/`)

| Archivo | Descripción |
|---|---|
| `index.js` | Punto de entrada. Configura Express, prefijo `/api/v1`, cron de limpieza de tokens, health check. |
| `middleware/auth.js` | Middleware JWT: valida firma HS256, revocación jti, active del usuario, password_changed_at, RBAC. |
| `store/index.js` | Store en memoria: users (con admin seed), revokedTokens (Map), loginAttempts (Map), instruments, metrics, subjects, applications, metricValues. |
| `routes/m1.js` | Endpoints de autenticación: POST /auth/login, POST /auth/logout, POST /users, GET /users, PATCH /users/me/password, PATCH /users/:id/status. |
| `routes/m2.js` | Endpoints de instrumentos: POST /instruments, GET /instruments, PATCH /instruments/:id/status, PATCH /instruments/:id. |
| `routes/m3.js` | Endpoints de métricas: POST /metrics, GET /metrics, PATCH /metrics/:id. |
| `routes/m4.js` | Endpoints de registro operativo: POST /subjects, POST /subjects/:id/context, GET /subjects/:id, POST /applications, POST /metric-values. |

---

## 2. Plan General de Análisis

El análisis se ejecutó en cuatro dimensiones paralelas:

1. **Analyst-MOCK:** Extracción del contrato implícito del servidor mock (rutas, roles, códigos HTTP, campos).
2. **Analyst-XML:** Comparación campo a campo entre contratos XML y el mock implementado.
3. **Analyst-SRS:** Mapeo de cada RF/RNF contra el mock y los XML.
4. **Functional-Tester:** Verificación estática de criterios de aceptación (CA) contra el código.

Seguido de consolidación, deduplicación, asignación de IDs y prioridades.

---

## 3. Criterios de Prioridad

- **Alta**: Bloquea integración, viola contrato formal o incumple requerimiento obligatorio del SRS.
- **Media**: Comportamiento inconsistente que puede causar errores en escenarios específicos.
- **Baja**: Mejora de calidad, claridad o cobertura de casos borde.

---

## 4. Hallazgos por Analista (Resumen)

### 4.1 Analyst-MOCK — Contrato implícito del mock server

**Endpoints mapeados:** 13 endpoints en 4 módulos + health check.

**Inconsistencias internas detectadas:**
- JWT Secret hardcodeado como variable de entorno (`mock-jwt-secret-development-only`), no como Docker Secret.
- Validación de `email` en POST /users no verifica formato RFC 5322.
- PATCH /users/me/password no valida formato/complejidad de `new_password`.
- PATCH /instruments/:id no valida que `methodological_description` no sea string vacío.
- GET /metrics con `instrument_id` inexistente retorna array vacío (no 404).
- POST /subjects/:id/context no valida formato de `age_cohort`.
- POST /metric-values: error en required metrics incluye `metric_id` de la métrica, no `metric_id` null — correcto, pero el mensaje de missing metrics no sigue el mismo formato de errors que los errores de validación de tipo.
- Falta validar si ya existe un contexto para el sujeto (POST /subjects/:id/context sobrescribe silenciosamente).
- No existe AuditLog en ningún endpoint.
- La matriz de permisos está hardcodeada por endpoint (roles pasados como arrays inline), no en constante centralizada.

### 4.2 Analyst-XML — Comparación XML vs Mock

**M1:** Contrato XML menciona `jwtSecret: Docker Secret (nunca variable de entorno)` — mock usa variable de entorno. XML indica `revokedTokensStorage: tabla PostgreSQL` — mock usa Map en memoria (comportamiento esperado en mock).

**M2:** Atributo `version` del elemento raíz dice "1.0" aunque el archivo se llama v2. No hay campo `researcher` en access control de endpoints de escritura (ambos correctos, solo admin).

**M3:** XML no documenta respuesta 400 para GET /metrics cuando instrument_id está ausente, pero el mock lo implementa correctamente. El XML de M3 documenta `created_at` en la respuesta 201 de POST /metrics pero no documenta `updated_at` — el mock retorna `updated_at` en la respuesta inicial (correcto pero no documentado).

**M4:** XML de GET /subjects/:id no incluye `id` ni `subject_id` en el objeto context anidado — el mock retorna ambos campos. XML de POST /metric-values respuesta 400 describe `data` como object con `errors[]` — mock implementa dos rutas distintas para required vs validation errors con estructuras ligeramente diferentes.

### 4.3 Analyst-SRS — Cobertura de RF/RNF

**Ausentes en mock:**
- AuditLog (RNF-SEC-12, RF-M1-03, RF-M1-04, RF-M1-06): ningún endpoint registra eventos en audit_log.
- Matriz de permisos centralizada (RNF-MAINT-04, RNF-M1-11): permisos hardcodeados por endpoint.
- Validación de complejidad de contraseña (SRS no lo especifica explícitamente, pero CA-HU1-01 menciona "contraseña válida").
- HTTPS/TLS (RNF-SEC-07): el mock opera en HTTP puro.
- Docker Secret para JWT (RNF-M1-03): mock usa env var.
- Validación de email único registrada en audit_log al intentar duplicado.

**Parcialmente implementados:**
- Rate limiting (RF-M1-03, CA-HU3-06): implementado en memory, se pierde al reiniciar; el evento `AUTH_RATE_LIMIT_TRIGGERED` NO se registra en audit_log.
- RBAC (RF-M1-05): funciona correctamente en el mock, pero la matriz no está centralizada.

### 4.4 Functional-Tester — Discrepancias estáticas

**Críticas:**
- `auth.js` no verifica paso (4) del SRS en el orden correcto: verifica password_changed_at antes de RBAC, pero el SRS define el orden (1)firma, (2)jti, (3)active, (4)rol — el mock incluye password_changed_at como paso (4) antes de rol, y rol como paso (5). Esto es una desviación del orden documentado en XML M1 (que lista solo 4 pasos sin password_changed_at explícito en el middleware).
- `m1.js`: el contador de intentos fallidos incluye usuarios desactivados (`!user.active`), pero el bloqueo ocurre después de 5 intentos totales incluyendo cuentas válidas desactivadas — potencial vector de enumeración de cuentas activas vs inactivas mediante timing diferencial del bcrypt.

**Altas:**
- No existe ningún módulo `auditLog`. Eventos de login, logout, rate limit, cambio de contraseña no se registran.
- `PATCH /users/me/password`: falta validar que `new_password` cumpla requisitos mínimos de complejidad si los hay.
- `POST /instruments`: no valida que `methodological_description` vacío se rechace (HU7 CA indica "HTTP 400 si la descripción está vacía").
- `GET /metrics`: retorna 400 si no hay `instrument_id`, pero no valida si el `instrument_id` es un UUID válido ni si el instrumento existe — devuelve array vacío para instrumentos inexistentes, lo que puede enmascarar errores del cliente.
- `PATCH /metrics/:id`: al actualizar `metric_type`, la lógica de `typeIsChanging` tiene un edge case: si se envía el mismo tipo actual, `typeIsChanging` es false y los campos existentes se heredan. Correcto. Pero si se cambia tipo de `categorical` a `boolean`, `effectiveOptions` queda `undefined` en la llamada a `validateMetricTypeFields`, y `validateMetricTypeFields` en el caso `boolean` no valida `options`, así que acepta. Luego `metric.options` se setea a null (línea 147). Correcto.
- `POST /subjects/:id/context`: permite llamadas múltiples sobrescribiendo el contexto existente silenciosamente. El XML no restringe esto pero tampoco documenta la sobreescritura. El SRS no especifica si el contexto es inmutable.

---

## 5. Decisiones de Priorización

1. **AuditLog ausente** → Alta: RNF-SEC-12 es obligatorio, cubre 100% de eventos de sesión.
2. **JWT Secret en env var** → Alta: viola RNF-M1-03 y R2 de restricciones del módulo.
3. **Matriz de permisos no centralizada** → Media: funciona correctamente pero viola RNF-MAINT-04 y RNF-M1-11.
4. **Validación description vacía** → Media: CA de HU7 lo requiere explícitamente.
5. **GET /metrics sin validación de instrumento existente** → Media: puede enmascarar errores.
6. **Sobrescritura silenciosa de contexto** → Baja: SRS no especifica comportamiento.
7. **Versión incorrecta en XML M2** → Baja: error de metadatos.
8. **Context.id y context.subject_id en GET /subjects** → Baja: campos adicionales no documentados pero no dañinos.

---

## 6. Fecha de Cierre del Análisis

**Fecha de cierre:** 2026-03-16
**Archivos producidos:**
- `BITACORA.md` (este archivo)
- `mock/gap_analysis.md`

---

## 7. Generación del README General — 2026-03-22

**Proceso ejecutado:** Generación del README principal del repositorio a partir de los PDFs del proyecto.

**Documentos leídos:**
- `docs/BACKLOG.pdf`
- `docs/CONTEXTO.pdf`
- `frontend/README.md`
- `mock/README.md`
- `BITACORA.md`
- `docs/srs/SRS_General_v1.0.md`

**Nombre del proyecto:** Sistema de Registro de Métricas Lingüísticas

**Descripción en una línea:** Herramienta académica para registrar métricas lingüísticas de manera estructurada, trazable y anónima, facilitando la creación de conjuntos de datos científicos confiables.

**Módulos identificados:** M1 Autenticación, M2 Gestión de Instrumentos, M3 Definición de Métricas, M4 Registro Operativo Anonimizado, M5 Consulta Interna Básica, M6 Exportación Estructurada.

**Estado de `frontend/README.md`:** COMPLETO (616 líneas)

**Estado de `mock/README.md`:** COMPLETO (151 líneas)

**Archivos producidos:**
- `README.md` — README general del repositorio, orientado a cualquier lector
- `README_STATUS.md` — Estado de READMEs internos con auditoría de ítems
