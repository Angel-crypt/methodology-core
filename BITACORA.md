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
| `SRS_M1_Autenticacion_v2.0.md` | 2.2 | En revisión | HU1–HU5 + IT-1 + Fix-Sec-01+02 (crear usuario sin password body, CSPRNG generateTempPassword, activar/desactivar, login, logout, RBAC, cambio password, estado pending, reset-password) |
| `SRS_M2_Gestion_Instrumentos_v2.0.md` | 2.0 | Borrador | HU6–HU9 (crear, editar, activar/desactivar instrumento, listar) |
| `SRS_M3_Definicion_Metricas_v1.0.md` | 1.0 | Borrador | HU10–HU13 (crear métrica, tipo de dato, rango, obligatoriedad) |
| `SRS_M4_Registro_Operativo_v1.0.md` | 1.0 | Borrador | HU14–HU17 (registrar sujeto, contexto, aplicación, capturar valores) |

### 1.2 Contratos XML (`mock/responses/`)

| Archivo | Versión | Estado | Endpoints cubiertos |
|---|---|---|---|
| `MockContract_M1_Autenticacion_v2.xml` | 2.2 | En revisión | POST /users (sin password, CSPRNG), PATCH /users/:id/status, POST /auth/login (must_change_password), POST /auth/logout, PATCH /users/me/password (allowPending), GET /users (must_change_password), POST /users/:id/reset-password (CSPRNG) |
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

---

## 8. Revisión de módulo M1 — Login — 2026-03-23

**Rama:** `feature/m1-auth` · **Arquitecto / Team Lead:** Claude Sonnet 4.6

### Diagnóstico principal

La rama fue cortada del commit `16ff3c9` (solo documentación), antes de que
existiera el frontend. Nunca fue rebased sobre main. Estado encontrado:

- Solo `LoginPage.jsx` y `GalleryPage.jsx` presentes en `src/`
- Toda la infraestructura ausente: `App.jsx`, `main.jsx`, `package.json`, componentes DS
- `node_modules/` committeado accidentalmente (sin `.gitignore` en ese momento)
- `LoginPage.jsx` importaba de `@/api/auth` y `@/lib/authStorage` — archivos inexistentes

### Correcciones aplicadas

| ID | Corrección | Commit |
|----|-----------|--------|
| INFRA-01 | `git rm --cached frontend/node_modules` | `4d0dabc` |
| INFRA-04 | Rebase de `feature/m1-auth` sobre `main` | `53a15a6` (rebased) |
| FUNC-01 | Ruta post-login: `navigate('/gallery')` eliminado — patrón `onLogin` de App.jsx usado | resuelto en rebase |
| FUNC-02 | `result.accessToken` → `data.data.access_token` (snake_case correcto) | resuelto en rebase |
| FUNC-03 | LoginPage ahora usa prop `onLogin` — compatible con App.jsx | resuelto en rebase |
| DS-01 | `color` en SVG → color controlado desde el contenedor vía `style` | resuelto en rebase |
| DS-02 | `disabled={loading}` → `loading={cargando}` + `size` via prop | resuelto en rebase |
| COD-01 | Credenciales pre-rellenadas en estado → `useState('')` | resuelto en rebase |
| COD-02 | Dead code `result.source === 'mock'` eliminado | resuelto en rebase |
| COD-03 | Bloque de credenciales de referencia gateado con `import.meta.env.DEV` | resuelto en rebase |

### Decisión arquitectónica — Patrón de sesión (FUNC-03)

**Decisión:** LoginPage usa la prop `onLogin(token)` que App.jsx le pasa.
App.jsx maneja el storage en localStorage y el estado React de sesión.
LoginPage no importa `useNavigate` ni gestiona storage directamente.

**Motivo:** mantener separación de responsabilidades — la página de login
no debe saber cómo se almacena la sesión ni a qué ruta navegar post-login.
App.jsx es el único punto de verdad para el estado de autenticación.

### Estado final

- **Build:** ✅ exitoso (`vite build` — 2.33s, 0 errores)
- **Lint:** 86 errores `react/prop-types` — pre-existentes en componentes DS,
  no introducidos por este módulo. `LoginPage` tiene 1 (patrón consistente).
- **Rebase sobre main:** ✅ completo, conflictos resueltos
- **Archivos producidos:** `MODULE_REVIEW_M1_Login.md`

**Pendiente (no implementado aún en ninguna rama):** RF-M1-06 (cambio de contraseña).

---

## 9. Iteración 1 — Credenciales seguras y estados de usuario (IT-1)

**Fecha:** 2026-03-23
**Decisión aprobada por:** Usuario (decisión explícita 2026-03-23)
**Rama:** main

### Contexto

Tras el análisis de viabilidad de las opciones A–E para compartir credenciales de forma segura,
se aprobó implementar la **Opción C completa**: modal de credenciales una sola vez +
contraseña temporal con cambio forzado en primer acceso.

### Decisiones tomadas

**AD-11 — Modelo de tres estados de usuario**

El campo booleano `active` es insuficiente para representar el ciclo de vida de una cuenta.
Se añade `must_change_password BOOLEAN DEFAULT TRUE` para modelar el estado **pending**:
- `pending` = `active=TRUE AND must_change_password=TRUE` (recién creado o restablecido)
- `active` = `active=TRUE AND must_change_password=FALSE` (ha cambiado su contraseña)
- `inactive` = `active=FALSE` (desactivado por el administrador)

**Motivo:** Un usuario recién creado con contraseña temporal no debe tener acceso completo al
sistema hasta cambiar su contraseña. Esto alinea con NIST SP 800-63B §5.1.1.2 y elimina la
necesidad de artefactos persistentes (archivos PDF, cifrados) para la entrega de credenciales.

**AD-12 — Modal de credenciales una sola vez**

El administrador ve email + contraseña temporal en un modal no cancelable inmediatamente después
de crear el usuario o restablecer su contraseña. El modal tiene botones de copiar al portapapeles.
No se genera ningún archivo descargable. Las credenciales no se persisten en ningún estado
del frontend después de que el admin cierra el modal.

**Motivo:** Minimización de datos (SRS General §4.3). Sin artefactos persistentes fuera del
sistema controlado.

**AD-13 — Cambio forzado de contraseña interceptado en App.jsx**

Tras el login, si la respuesta incluye `must_change_password=true`, App.jsx muestra
`CambiarPasswordModal` en modo `forced=true` encima de cualquier otra pantalla. El modal
no puede cerrarse. Tras el cambio exitoso, el servidor invalida el token (via `password_changed_at`)
y App.jsx ejecuta logout — el usuario debe hacer login nuevamente con su nueva contraseña.

**Motivo:** Separación de responsabilidades. App.jsx es el único punto de verdad para el estado
de autenticación. Ninguna página individual necesita manejar este caso de borde.

**AD-14 — allowPending flag en authMiddleware**

El middleware acepta un parámetro `{ allowPending: true }` que omite el check de
`must_change_password`. Solo se usa en `PATCH /users/me/password` para que el usuario
en estado pending pueda ejecutar el cambio forzado.

**Motivo:** Evitar crear un endpoint público separado para el cambio forzado. El endpoint
existente ya tiene toda la lógica necesaria.

**AD-15 — POST /users/:id/reset-password devuelve contraseña en mock**

Solo en el mock server de desarrollo, el endpoint devuelve `_mock_temp_password` en la respuesta.
En producción, la contraseña nunca se expone en la API — se entrega por canal separado.

**Motivo:** Facilitar el desarrollo y las pruebas del frontend sin necesidad de un canal de email.
El prefijo `_mock_` es una señal explícita de que debe eliminarse en producción.

### Archivos modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `docs/srs/SRS_M1_Autenticacion_v2.0.md` → v2.1 (v2.2 en Fix-Sec) | Esquema users, sección 2.6 máquina de estados, RF-M1-RESET, RF-M1-01, RF-M1-03, RF-M1-05, RF-M1-06, RF-M1-LIST |
| `mock/src/store/index.js` | Campo `must_change_password: false` en admin seed |
| `mock/src/routes/m1.js` | POST /users (pending), GET /users (must_change_password en resp), login (must_change_password en resp), PATCH /users/me/password (limpiar flag), nuevo POST /users/:id/reset-password |
| `mock/src/middleware/auth.js` | Check must_change_password (4b), parámetro allowPending |
| `frontend/src/services/users.js` | Nueva función resetearPassword() |
| `frontend/src/hooks/useGestionUsuarios.js` | getUserStatus, FILTROS_ESTADO con pending, cargarUsuarios con filtro client-side, credencialesNuevas, handleResetearPassword |
| `frontend/src/App.jsx` | mustChangePassword state, handleForcedPasswordChanged, CambiarPasswordModal forced |
| `frontend/src/pages/LoginPage.jsx` | Pasar must_change_password a onLogin |
| `frontend/src/pages/CambiarPasswordModal.jsx` | Prop forced (no cancelable, texto diferente) |
| `frontend/src/pages/GestionInvestigadores.jsx` | getUserStatus, acciones contextuales por estado, CredencialesModal |
| `frontend/src/pages/GestionAplicadores.jsx` | Ídem |

### Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/pages/CredencialesModal.jsx` | Modal one-time para mostrar email + contraseña temporal |
| `BACKLOG.md` | Backlog de iteraciones del módulo de gestión de usuarios |

---

## 10. Fix de Seguridad — CSPRNG y Server-Side Password Generation (Fix-Sec-01 + Fix-Sec-02)

**Fecha:** 2026-03-23
**Decisión aprobada por:** Usuario (decisión explícita 2026-03-23)
**Rama:** main

### Contexto

Tras análisis de Zero Trust y Security/Privacy by Design, se identificaron 4 vulnerabilidades
en la generación de contraseñas temporales basada en `uuidv4()`:
1. Charset hex-only (16 chars/pos): solo ~64 bits de entropía efectiva.
2. Formato predecible (`XXXXXXXX-XXXXXXXX!`): reduce espacio de búsqueda.
3. Terminador fijo `!`: información al atacante sobre la estructura.
4. `Math.random()` implícito (en entornos no seguros): algoritmo Xorshift128+, predecible.

El usuario aprobó dos fixes simultáneos.

### Decisiones tomadas

**AD-16 — Fix-Sec-01: CSPRNG con crypto.randomBytes()**

Reemplazar la generación UUID-based por `generateTempPassword()`:
- **Fuente de entropía:** `crypto.randomBytes()` — delega al SO (Linux: `getrandom()`, macOS: `SecRandomCopyBytes()`). Prohibido `Math.random()` en cualquier iteración futura.
- **Charset:** 61 caracteres sin ambiguos: mayúsculas sin I/L/O, minúsculas sin i/l/o, dígitos sin 0/1, especiales `!@#$%&*`.
- **Longitud:** 16 → entropía `log₂(61^16) ≈ 95.8 bits`.
- **Rejection sampling (`cryptoRandIndex`):** `maxUnbiased = floor(2^32/N)*N` elimina sesgo de módulo. Distribución uniforme sobre el charset.
- **Fisher-Yates shuffle con CSPRNG:** evita que los caracteres requeridos (uppercase/lowercase/digit/special) siempre aparezcan en posiciones 0–3.
- **Sin formato fijo, sin terminador, sin timestamp.** Cada invocación produce una cadena opaca e impredecible.

**Motivo:** Las contraseñas temporales son material criptográfico. `uuidv4()` no está diseñado como CSPRNG para contraseñas. Un atacante con conocimiento del formato puede reducir el espacio de búsqueda en órdenes de magnitud.

**AD-17 — Fix-Sec-02: POST /users no acepta password del administrador**

El Administrador ya no provee la contraseña al crear un usuario. El servidor la genera internamente con `generateTempPassword()`. El campo `password` es rechazado en el body (validación estricta).

**Motivo:** Si el admin provee la contraseña, existe una ventana temporal donde alguien con acceso al body de la petición (logs de red, proxies internos) puede ver la contraseña antes de que el usuario la cambie. La generación server-side elimina esta superficie. Principio: el admin nunca debe conocer la contraseña permanente ni la temporal del usuario.

### Archivos modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `mock/src/routes/m1.js` | +`crypto.randomBytes`, +`cryptoRandIndex()`, +`generateTempPassword()`, POST /users sin password del body + retorna `_mock_temp_password`, POST /users/:id/reset-password usa CSPRNG |
| `frontend/src/hooks/useGestionUsuarios.js` | Eliminar `password` de `FORM_INICIAL` y `validarFormCrear`; leer `_mock_temp_password` desde respuesta del servidor |
| `frontend/src/pages/GestionInvestigadores.jsx` | Eliminar FormField de contraseña inicial |
| `frontend/src/pages/GestionAplicadores.jsx` | Ídem |
| `frontend/src/services/users.js` | Actualizar JSDoc de `crearUsuario` (sin password) |
| `docs/srs/SRS_M1_Autenticacion_v2.0.md` → v2.2 | RF-M1-01 sin password, RF-M1-RESET con detalle CSPRNG, nuevos RNF-M1-15 y RNF-M1-16, CA-HU1-01 actualizado, §7.2 actualizado |
| `mock/responses/MockContract_M1_Autenticacion_v2.xml` → v2.2 | RF-M1-01 sin password, RF-M1-03 + must_change_password, RF-M1-05 paso 4b, RF-M1-LIST + must_change_password, RF-M1-06 allowPending, +RF-M1-RESET, authorizationRules CSPRNG, databaseSchema +must_change_password +updated_at |

---

## IT-4 — Refactorización UI/UX: Navbar y Sidebar
**Fecha:** 2026-03-24
**Rama:** main
**Arquitecto:** Claude Sonnet 4.6

### Contexto
Refactorización visual del layout principal para alinear con mockups de referencia
(`reference/`). Tres imágenes de referencia del diseño GateFlow usadas como fuente
de verdad del patrón de diseño (no del contenido).

### Decisiones arquitectónicas

**D1 — Datos del usuario en el JWT**
Se añadieron `full_name` y `email` al payload del JWT en `mock/src/routes/m1.js`.
No existía endpoint `GET /users/me`. Esta es la práctica estándar (OIDC, Auth0)
para datos de identidad estáticos. Impacto mínimo: 2 campos más en el token.

**D2 — Estado del sidebar en AppLayout (no en Sidebar)**
El estado `sidebarCollapsed` vive en `AppLayout` para que pueda afectar el layout
general (ancho del contenido) sin prop drilling adicional. Persiste en localStorage
con clave `sidebar-collapsed`.

**D3 — TooltipPrimitive.Provider en Sidebar**
El `Provider` de `@radix-ui/react-tooltip` vive en el componente `Sidebar`, no en
la raíz de la app. Los tooltips del sidebar son la única área que los usa hoy. Si
se necesitan tooltips en otro lugar, se puede mover el Provider a `main.jsx`.

**D4 — API del Sidebar cambiada de `items` a `sections`**
Cambio breaking intencional. El Sidebar es un componente interno usado solo en
`AppLayout`. La nueva API soporta grupos con `label` opcional — si `label` es null,
no se renderiza el encabezado de sección. Esto permite experiencias por rol:
- `administrator`: secciones con label (GESTIÓN, USUARIOS)
- otros roles: ítems sin encabezado de sección

**D5 — Lógica de secciones por rol en AppLayout (no en Sidebar)**
`getNavSections(role)` vive en `AppLayout` para mantener el Sidebar agnóstico del
dominio. Si las rutas cambian en el futuro, solo se toca `AppLayout`.

**D6 — jwtRoleToDisplay en lib/utils.js**
El JWT usa `administrator`/`applicator` pero `RoleBadge` espera `admin`/`aplicador`.
Se creó `jwtRoleToDisplay()` en `lib/utils.js` como punto único de conversión.
`UserAvatar` y `ProfileDropdown` aceptan roles JWT; convierten internamente para
`RoleBadge`.

**D7 — Logout movido al footer del sidebar**
El botón "Cerrar sesión" se removió del topbar y vive solo en el footer del sidebar,
coincidiendo con el mockup. El `ProfileDropdown` no incluye logout para no duplicar
la acción en dos lugares distintos.

**D8 — GlobalSearch se mantiene en el topbar**
No aparece en los mockups (son de otro producto), pero es una feature valiosa.
Decisión: mantener visible solo para rol `administrator`, sin cambios.

### Tokens nuevos creados

| Token | Valor | Archivo |
|---|---|---|
| `--sidebar-width-collapsed` | `64px` | `tokens/spacing.css` |
| `--color-sidebar-bg` | `#0A3558` | `tokens/colors.css` |
| `--color-sidebar-text` | `#E2E0DA` | `tokens/colors.css` |
| `--color-sidebar-text-muted` | `rgba(226, 224, 218, 0.45)` | `tokens/colors.css` |
| `--color-sidebar-item-hover` | `rgba(255, 255, 255, 0.06)` | `tokens/colors.css` |
| `--color-sidebar-item-active-bg` | `var(--color-primary)` | `tokens/colors.css` |
| `--color-sidebar-item-active-text` | `var(--color-primary-text)` | `tokens/colors.css` |
| `--color-sidebar-border` | `rgba(255, 255, 255, 0.08)` | `tokens/colors.css` |

### Componentes creados

| Componente | Archivo | Descripción |
|---|---|---|
| `UserAvatar` | `components/app/UserAvatar.jsx` | Avatar con color e ícono por rol + inicial |
| `Tooltip` | `components/app/Tooltip.jsx` | Wrapper `@radix-ui/react-tooltip`, side=right |
| `ProfileDropdown` | `components/app/ProfileDropdown.jsx` | Dropdown de perfil en topbar |

### Componentes modificados

| Componente | Cambio principal |
|---|---|
| `Sidebar` | Refactorizado completo — nueva API con sections, collapse, footer de perfil |
| `AppLayout` | `decodeToken` reemplaza `getRoleFromToken`; sidebar con estado; topbar limpio |

### Paquetes añadidos
- `@radix-ui/react-dropdown-menu` ^2.1.16
- `@radix-ui/react-tooltip` ^1.2.8

---

## IT-4b — Fix UI: Navbar y Sidebar — correcciones visuales
**Fecha:** 2026-03-24
**Rama:** main

### FIX-01 — Color de fondo del Sidebar
- **Causa**: el token `--color-sidebar-bg` tenía el valor `#0A3558` (navy demasiado oscuro).
- **Hallazgo**: el mockup muestra un navy más luminoso y saturado (~`#0F3F6E`).
- **Fix**: actualizar el valor del token en `tokens/colors.css`. No se creó ningún token nuevo.
- **Token `--blue-800: #0C447C`** descartado — demasiado saturado/brillante para fondo de sidebar.

### FIX-02 — Separador del footer en posición incorrecta
- **Causa**: `border-top` estaba en `.sidebar__footer`, separando toda la sección footer (perfil + logout) del nav.
- **Mockup**: la línea debe estar entre el perfil y el botón de cerrar sesión.
- **Fix**: se quitó `border-top` de `.sidebar__footer` y se añadió `<div className="sidebar__logout-separator">` en `Sidebar.jsx` entre el bloque de perfil y el botón logout. El separador se estiló con `height: 1px; background-color: var(--color-sidebar-border)` y márgenes negativos para sangrar hasta los bordes del footer.

### FIX-03 — Íconos sin altura estable en sidebar colapsado
- **Causa**: `.sidebar-item` y `.sidebar__logout` no tenían `min-height`. Al colapsar, el label desaparece (`display: none`) y la altura del ítem podía variar si el texto tenía mayor line-height que el ícono.
- **Fix**: añadido `min-height: 40px` a `.sidebar-item` y `.sidebar__logout` en `index.css`. Garantiza altura uniforme en ambos estados (expandido y colapsado).

### FIX-04 — Token `--space-1-5` inexistente en búsqueda
- **Causa**: `.search-trigger` usaba `padding: var(--space-1-5) var(--space-3)`. El token `--space-1-5` no existe en la escala de espaciado (escala va de `--space-1` a `--space-2`, no hay intermedio de 6px).
- **Comportamiento roto**: CSS resuelve variable indefinida como cadena vacía → padding vertical = 0px → ícono pegado a los bordes.
- **Fix**: reemplazado por `--space-2` (8px) en `index.css`. También corregida la misma referencia rota en `DetalleUsuarioDrawer.jsx:97` (gap en label de sesiones activas).
- **Decisión**: no se creó `--space-1-5` — 6px no tiene justificación semántica en la escala base-4 del DS.

### Archivos modificados
| Archivo | Cambio |
|---|---|
| `frontend/src/styles/tokens/colors.css` | `--color-sidebar-bg: #0A3558` → `#0F3F6E` |
| `frontend/src/components/app/Sidebar.jsx` | +`<div className="sidebar__logout-separator">` entre perfil y logout |
| `frontend/src/index.css` | -`border-top` de `.sidebar__footer`; +`.sidebar__logout-separator`; +`min-height: 40px` en `.sidebar-item` y `.sidebar__logout`; `--space-1-5` → `--space-2` en `.search-trigger` |
| `frontend/src/pages/DetalleUsuarioDrawer.jsx` | `--space-1-5` → `--space-2` en gap de label |
