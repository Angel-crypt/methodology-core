# PLAN DE ACCIÓN — methodology-core
**Versión:** 4.3
**Fecha:** 2026-04-09
**Base:** SRS actualizados · `docs/ESTADO_CONSOLIDADO.md` · `docs/AUDITORIA_PENDIENTES.md` · `docs/AUDITORIA_ACTION_PLAN.md` · `docs/PENDIENTES.md`
**Metodologia:** TDD como objetivo; cuando no aplique o no sea verificable, se documenta en la tarea.

## CRITERIOS MINIMOS DE ACEPTACION (TRANSVERSALES)

- Zero Trust: todo endpoint valida JWT + rol + estado; no confiar en el frontend.
- Privacy by Design: no PII en Subjects/Applications/Exports; solo `anonymous_code`.
- Auditoria: operaciones sensibles dejan registro en audit_log.
- RBAC: SUPERADMIN solo stats; researcher detalle; applicator solo propios.
- Sesion expirada: redirect a `/login` con mensaje visible.

---

## ESTADO DE PARTIDA (Sprint 0 — base original)

| Área | Estado |
|------|--------|
| Infraestructura de testing | ✅ Completa (Vitest + RTL + MSW / Jest + Supertest) |
| Contrato `is_active: boolean` | ✅ Normalizado en mock, frontend y tests |
| Rutas canónicas M3 | ✅ Rutas legacy eliminadas |
| INVENTARIO.md | ✅ Actualizado |
| CI (GitHub Actions) | ✅ Verde — 41 tests |
| Credenciales en código | ❌ Pendiente |
| Autenticacion OIDC + SUPERADMIN | ✅ Completa |
| Gestión de proyectos | ❌ Sin UI |
| Perfiles de usuario | ❌ Sin modelo ni UI |
| M5 vista investigador + SUPERADMIN stats | ❌ Sin UI |
| M6 exportacion (solo investigador) | ❌ Sin UI |

---

## ESTADO ACTUAL DE IMPLEMENTACIÓN (post Sprint 1 — 2026-04-08)

Sprint 1 cerrado. Resumen de lo entregado y lo que sigue pendiente.

### Sprint 1 — entregado

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| **CF-031** | Renombrado atómico de rol legacy → `superadmin` en frontend, mock y middleware | ✅ Cerrado | Barrera atómica. No quedan referencias al nombre antiguo en código vivo. |
| **CF-001** | Eliminadas credenciales hardcoded del flujo de login | ✅ Cerrado | Cubierto por red de regresión (`LoginPage.test.jsx`). |
| **CF-002** | Wizard M4 solicita instrumentos con `?is_active=true` | ✅ Cerrado | Filtro server-side; el cliente mantiene defensa en profundidad. |
| **CF-003** | Validación estricta `start_date < end_date` en wizard de creación | ✅ Cerrado | Red de regresión (3 tests). |
| **CF-004** | Propagación de `must_change_password` end-to-end | ✅ Cerrado | Tests mock (3) + tests frontend (3). Aplica solo al flujo SUPERADMIN. |
| **CF-029** | Tags y `min_days_between_applications` en instrumentos | ✅ Cerrado | API + servicios + UI (chip-input, datalist, filtro por catálogo). 16 tests mock + 6 service + 2 page. |

### Tabla agregada de áreas

| Área | Estado | Detalle |
|------|--------|---------|
| Infraestructura de testing | ✅ | 76 tests verdes (43 mock + 33 frontend) |
| Contrato `is_active: boolean` | ✅ | Sin cambios |
| Rutas canónicas M3 | ✅ | Sin cambios |
| INVENTARIO.md | ✅ | Actualizado a 2026-04-08 |
| CI (GitHub Actions) | ✅ | Verde |
| Rol `superadmin` (CF-031) | ✅ | Renombrado en código vivo. Docs historicos (`BITACORA.md`, `MockContract_M1`, `COMPONENTS.md`, `GUIA_IMPLEMENTACION_MOCK_SERVER.md`) aun mencionan el nombre legacy — limpieza diferida. |
| Filtro Privacy by Design en M4 (CF-002) | ✅ | `RegistroOperativoWizardPage.jsx` solicita `?is_active=true` |
| Validación de fechas en M2 (CF-003) | ✅ | `validarCrear` rechaza igualdad e inversión |
| `must_change_password` propagado (CF-004) | ✅ | Aplica al flujo legacy email+password (vigente solo para SUPERADMIN per decisión #3) |
| Tags + `min_days_between_applications` (CF-029) | ✅ | API mock + servicio + UI completos. Endpoint `GET /instruments/tags` añadido. |
| Credenciales en código | ✅ | Eliminadas en CF-001 |
| **Autenticación OIDC + SUPERADMIN (CF-2)** | ✅ | Cerrado en Sprint 2. |
| Magic link de activación (researcher/applicator) | ❌ | Sin implementar — depende de CF-2 |
| Gestión de proyectos | ❌ | Sin UI ni endpoints |
| Perfiles de usuario | ❌ | Sin modelo ni UI |
| M5 vista investigador + SUPERADMIN stats | ❌ | Sin UI |
| M6 exportación (solo investigador) | ❌ | Sin UI ni endpoints reales |
| `AuthContext` (eliminar prop drilling de token) | ❌ | Pendiente — bloqueante leve para Sprint 2 |
| Limpieza de docs históricos (`BITACORA.md`, contratos XML) | ⚠️ | Diferida — no es código vivo |

### Implicaciones clave para Sprint 3

1. **Auth completa.** Sprint 2 cerro los flujos OIDC, magic link, cambio de correo y produccion readiness. Sprint 3 arranca sobre una base de autenticacion estable.
2. **Proyectos son la siguiente barrera.** CF-010..CF-017 (CRUD proyectos, membresia, config operativa por proyecto, wizard actualizado) son el bloque critico de Sprint 3.
3. **Mensajes al usuario en español.** Toda alerta, error o helper visible al usuario debe estar en castellano.
4. **Comentarios de código y tests.** Solo describen *qué hace* el código, no *por qué* se decidió así. La motivación vive en este `PLAN_ACCION.md` y en `INVENTARIO.md`.

---

## ESTADO ACTUAL DE IMPLEMENTACIÓN (Sprint 3 — en progreso — 2026-04-09)

Sprint 3 sin commit final. Trabajo en progreso activo.

### Sprint 3 — entregado (sin commit)

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| **CF-010** | Mock: CRUD proyectos (`projects.js`, store) | ✅ Cerrado | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`. Store: `projects[]`, `projectMembers[]`, `projectInstruments[]`, `projectConfigs Map`. |
| **CF-011** | Mock: Membresía e instrumentos de proyecto | ✅ Cerrado | `POST/GET/DELETE /projects/:id/members`, `POST/GET/DELETE /projects/:id/instruments`. Validación rol (`researcher\|applicator`), duplicados (409). |
| **CF-012** | Mock: Config operativa por proyecto + defaults del sistema | ✅ Cerrado | `GET/PUT /projects/:id/config/operativo`. Schema: `education_levels`, `age_cohort_map` (objeto nivel→rango), `cohort_mode` (`libre\|restringido`), `subject_limit`. `GET /config/system-defaults`. |
| **CF-013** | Frontend: ProjectsPage + ProjectDetailPage | ✅ Cerrado | `ProjectsPage`: lista, crear (modal con defaults/config), eliminar. `ProjectDetailPage`: tabs Miembros / Instrumentos / Config. Config operativa con tabla de niveles educativos (activar/desactivar), rango de edades, cohorte, límite de sujetos. Dirty-check antes de guardar. |
| **CF-014** | Deprecar ConfiguracionOperativaPage global | ✅ Cerrado | Ruta `/configuracion-operativa` → `<Navigate to="/proyectos">`. Página existente conservada pero sin acceso. |
| **CF-015** | Wizard: Paso 0 — selección de proyecto | ✅ Cerrado | Paso previo al registro: el aplicador elige su proyecto. `GET /projects/:id/config/operativo` carga config por proyecto. |
| **CF-016** | Wizard: "Mis sujetos" condicional | ✅ Cerrado | Tab solo aparece si el aplicador ya tiene sujetos registrados en el proyecto. Carga al seleccionar proyecto, no lazy. |
| **CF-017** | Wizard: paths canónicos con `project_id` | ✅ Cerrado | `POST /projects/:id/subjects`, `PATCH /subjects/:id/context`, `POST /projects/:id/applications`, `POST /projects/:id/applications/:id/metric-values`. |
| **CF-018** | Wizard: `contextDirty` + manejo de retry | ✅ Cerrado | `PATCH` si ya guardado y modificado; `POST` si primera vez. Botón "Actualizar contexto y continuar" en paso 2. |

### Bugs adicionales resueltos en Sprint 3

| Bug | Fix |
|-----|-----|
| `cargandoPermisos`/`permisosResumen` undefined en `DetalleAplicadorPage` | Bloque "Permisos actuales" eliminado (permisos son ahora por proyecto, no por usuario) |
| `cohortMode` siempre `'libre'` pese a config `restringido` | Leía `operativoConfig?.mode` — corregido a `operativoConfig?.cohort_mode === 'restringido'` |
| Cohortes de edad no cargaban | Leía `age_cohort_ranges` (inexistente) — corregido a valores únicos de `age_cohort_map` |
| `education_level` rechazado por API (envía `'Primaria menor'` en lugar de `'primary_lower'`) | `EDUCATION_LEVEL_NAME_TO_KEY` mapea nombres del config a claves de enum API. Auto-assign restringido usa reverse-map |
| "Sujeto existente" eliminado del wizard | Solo aplicadores; flujo simplificado a Nuevo / Mis sujetos |
| `must_change_password` en investigators/applicators | Campo solo enviado desde API para `superadmin`. `getUserStatus`, `useGestionUsuarios`, `AuthCallbackPage` limpados |
| Agregar miembro mostraba email y pedía rol | Selector muestra "Nombre — Rol". Rol tomado del usuario, no elegido manualmente |
| Proyecto sin instrumentos → wizard se colgaba en "Cargando..." | Al seleccionar proyecto se cargan sus instrumentos. Si vacío: bloqueo con mensaje claro antes de paso 1 |
| Errores técnicos de enum API visibles al usuario | `handleSubmitContext` transforma mensajes de validación a texto en español |

### Tabla agregada de áreas (Sprint 3)

| Área | Estado | Detalle |
|------|--------|---------|
| Infraestructura de testing | ✅ | Tests actualizados para proyectos, config por proyecto, wizard |
| Gestión de proyectos (CF-010..CF-014) | ✅ | CRUD, membresía, instrumentos, config operativa por proyecto |
| Wizard M4 actualizado (CF-015..CF-018) | ✅ | Paso 0 proyecto, "Mis sujetos", paths canónicos, contexto dirty |
| Config operativa global (legado) | ✅ | Deprecada — redirect a /proyectos |
| `must_change_password` limpiado | ✅ | Solo superadmin en toda la pila |
| **Perfiles, instituciones, onboarding** | ✅ | Sprint 4 — ver sección siguiente |
| **M5 — Consulta investigador + SUPERADMIN stats** | ❌ | **Próximo bloque — Sprint 5** |
| **M6 — Exportación (solo investigador)** | ❌ | Sprint 5 |
| Limpieza de docs históricos | ⚠️ | Diferida |

### Decisión arquitectónica actualizada en Sprint 3

> **#20 (actualizada):** `age_cohort_map` es el contrato canonico para la config operativa. Es un objeto `{ nombre_nivel: rango_edad }` donde las claves son los nombres legibles definidos por el SUPERADMIN (ej. `'Primaria menor'`). El frontend mapea esos nombres a claves de enum de la API (`primary_lower`) via `EDUCATION_LEVEL_NAME_TO_KEY` antes de enviar el contexto. El reverse-map `EDUCATION_LEVEL_KEY_TO_NAME` se usa para auto-asignar cohorte en modo restringido.

---

## ESTADO ACTUAL DE IMPLEMENTACIÓN (Sprint 4 — 2026-04-10)

Sprint 4 sin commit final. Trabajo completado.

### Sprint 4 — entregado

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| **CF-S4-001** | JWT mínimo + UserContext | ✅ Cerrado | JWT: `{ sub, role, jti, iat, exp }` (sin `full_name`/`email`). Middleware lee `payload.sub`. `UserContext.jsx`: fetch `GET /users/me` al cambiar token; expone `{ user, loadingUser, reloadUser }`. `AppLayout` lee `fullName`/`email` desde UserContext. |
| **CF-S4-002** | Mock: Perfil extendido | ✅ Cerrado | Store: `phone`, `institution`, `terms_accepted_at`, `onboarding_completed` por usuario. `GET /users/me` retorna perfil completo. `PATCH /users/me/profile`. `POST /users/me/accept-terms`. |
| **CF-S4-003** | Mock: Instituciones | ✅ Cerrado | `mock/src/routes/institutions.js`. `store.institutions`. `GET /institutions` (solo superadmin), `POST /institutions` (normaliza nombre), `GET /institutions/resolve?email=X` (detecta por dominio). |
| **CF-S4-004** | Mock: T&C + Privacidad | ✅ Cerrado | `GET /legal/terms` y `GET /legal/privacy` (públicos, sin auth). |
| **CF-S4-005** | Mock: profileConfig | ✅ Cerrado | `store.profileConfig: { require_phone, require_institution, require_terms }`. `GET /superadmin/profile-config` (cualquier auth). `PUT /superadmin/profile-config` (solo superadmin). |
| **CF-S4-006** | Frontend: TermsPage + PrivacyPage + guards | ✅ Cerrado | Guards en `App.jsx`: `needsTerms` → `/terminos`, `needsOnboarding` → `/onboarding`. Superadmin exento. `TermsPage` y `PrivacyPage` usan `login-layout`/`login-card`. |
| **CF-S4-007** | Frontend: OnboardingPage | ✅ Cerrado | Campos dinámicos según `profileConfig`. Auto-detección de institución por dominio (`GET /institutions/resolve`): si coincide, campo deshabilitado con bloque informativo; si no, texto libre. |
| **CF-S4-008** | Frontend: SuperadminProfileConfigPage | ✅ Cerrado | Checkboxes `require_phone`, `require_institution`, `require_terms`. `PUT /superadmin/profile-config`. Ruta: `/configuracion-perfil`. |
| **CF-S4-009** | Frontend: InstitutionsPage | ✅ Cerrado | DataTable (nombre, dominio, fecha). Botón → Modal para crear. EmptyState con acción. Ruta: `/instituciones`. |
| **CF-S4-010** | Frontend: DetalleUsuarioPage (compartido) | ✅ Cerrado | Reemplaza `DetalleAplicadorPage`. Ambos roles (researcher y applicator) muestran sección "Proyectos asignados": lista con rol en proyecto + botón "Ver" (navega a `/proyectos/:id`) + botón "Quitar" (`DELETE /projects/:id/members/:userId`). |
| **CF-S4-011** | Frontend: Preasignación institución al crear usuario | ✅ Cerrado | `handleEmailBlur` en `useGestionUsuarios`: llama `GET /institutions/resolve?email=X`; pre-llena campo institución en modal. Incluye `institution` en `POST /users`. Campo `institution` en tabla de usuarios. |

### Cambios arquitectónicos Sprint 4

| Decisión | Detalle |
|---|---|
| JWT mínimo | Solo `sub`, `role`, `jti`, `iat`, `exp` — sin datos personales en el token. `sub` es el `user_id`. |
| UserContext | Patrón separado de AuthContext: AuthContext maneja sesión (token, role, logout); UserContext maneja perfil (full_name, email, phone, institution, flags). |
| Guard chain | Solo para researcher/applicator: `loadingUser` → `needsTerms` → `needsOnboarding` → app. SUPERADMIN siempre pasa al app. |
| GET /projects con member_id | `GET /projects?member_id=X` soportado para superadmin — retorna proyectos del usuario X con `user_role` per project. |
| Instituciones informativas | No afectan control de acceso. Agrupan perfiles y permiten stats. Normalización por nombre y por dominio de correo. |

### Tabla agregada de áreas (Sprint 4)

| Área | Estado | Detalle |
|------|--------|---------|
| JWT mínimo (CF-S4-001) | ✅ | Sin `full_name`/`email` en token. `sub` como identificador. |
| UserContext (CF-S4-001) | ✅ | Perfil cargado desde API en contexto separado. |
| Perfil extendido en mock (CF-S4-002) | ✅ | phone, institution, terms, onboarding_completed. |
| Instituciones (CF-S4-003, CF-S4-009) | ✅ | Mock + UI de gestión. Resolución por dominio. |
| T&C y Onboarding (CF-S4-006, CF-S4-007) | ✅ | Guards funcionales. Flujo completo para researcher/applicator. |
| Config de perfil SUPERADMIN (CF-S4-005, CF-S4-008) | ✅ | Configurable por SUPERADMIN. |
| DetalleUsuarioPage (CF-S4-010) | ✅ | Proyectos asignados para ambos roles con acciones básicas. |
| Preasignación institución (CF-S4-011) | ✅ | Auto-detección en crear usuario. |
| **M5 — Consulta investigador + SUPERADMIN stats** | ❌ | **Próximo — Sprint 5** |
| **M6 — Exportación (solo investigador)** | ❌ | Sprint 5 |
| Tests de integración Sprint 4 | ✅ | Tests unitarios creados: TermsPage, OnboardingPage, InstitutionsPage, SuperadminProfileConfigPage, DetalleUsuarioPage. |

---

## CIERRE PRE-SPRINT 5 — 2026-04-20

Bugs y deuda técnica cerrados antes de iniciar M5/M6.

| ID | Fix | Estado |
|----|-----|--------|
| Privacy (PbD) | `GET /applications/my` exponía `subject_id` (UUID interno). Reemplazado por `anonymous_code` (8 chars, derivado del UUID) tanto en mock como en frontend `MisRegistrosPage`. | ✅ |
| GlobalSearch | `StatusBadge` usaba `instr.status` (campo inexistente). Ahora usa `instr.is_active ? 'active' : 'inactive'`. | ✅ |
| DataTable | `row-inactive` solo chequeaba `row.active`. Ahora también cubre `row.is_active` (instrumentos). | ✅ |
| [C-05] | Sesión expirada no redirigía. `lib/api.js` despacha `auth:session-expired` en cualquier 401. `AuthContext` escucha y llama `logout('session_expired')` con mensaje visible en `LoginPage`. `projects.js` y `emailChangeRequests.js` actualizados para distinguir SESSION_REVOKED vs expiración genérica. | ✅ |
| [C-03] | Sin validación de password fuerte para SUPERADMIN. Mock: `validatePasswordStrength()` aplicado en `POST /auth/password-reset` y `PATCH /users/me/password`. Respuesta de contraseña incorrecta cambiada de 401→422 (semántica correcta). Frontend: `CambiarPasswordModal` valida en cliente y muestra requisitos. | ✅ |
| Docs | INVENTARIO §10: eliminados P-01/P-02 (resueltos Sprint 2). FLUJO_SISTEMA_FINAL §5: título corregido "ADMINISTRATOR"→"SUPERADMIN". FLUJO_SISTEMA_FINAL §6.1: `age_cohort_ranges`→`age_cohort_map`. | ✅ |

---

## ESTADO ACTUAL DE IMPLEMENTACIÓN (post Sprint 2 — 2026-04-08)

Sprint 2 cerrado. Resumen de lo entregado y lo que sigue pendiente.

### Sprint 2 — entregado

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| **CF-005** | LoginPage OIDC + SystemLoginPage SUPERADMIN | ✅ Cerrado | `LoginPage` solo muestra botón Google. `SystemLoginPage` en `/__sys-auth` (configurable vía `VITE_SYSTEM_LOGIN_PATH`). `AuthCallbackPage` procesa callback OIDC con `useRef` para evitar doble consumo del code en StrictMode. |
| **CF-006** | AuthContext — eliminar prop drilling | ✅ Cerrado | `AuthContext` con `sessionStorage` persistence. Provee `token`, `role`, `mustChangePassword`, `login`, `logout`. SESSION_REVOKED handler via DOM event. |
| **CF-007** | Mock: endpoints OIDC simulados | ✅ Cerrado | `GET /auth/oidc/authorize` → mock-sso HTML selector (bajo `/api/v1/` para que Vite proxy lo intercepte). `GET /auth/oidc/mock-sso/select` vincula code→email. `POST /auth/oidc/callback` valida code, vincula `broker_subject`, emite JWT. |
| **CF-008** | Magic link de activación de cuenta | ✅ Cerrado | `POST /users` genera `_mock_magic_link` en `/api/v1/auth/activate/:token`. `GET /auth/activate/:token` activa cuenta, single-use (segundo uso → 410). `POST /users/:id/magic-link` regenera link. `POST /auth/setup` eliminado (404). |
| **CF-009** | Solicitud de cambio de correo (no autoservicio) | ✅ Cerrado | `SolicitarCambioCorreoModal` (trigger en menu de usuario). `SolicitudesCambioCorreoPanel` (panel SUPERADMIN). `emailChangeRequests.js` service. Approve via `PATCH /users/:id/email` invalida `broker_subject` + revoca sesiones. SESSION_REVOKED detectado globalmente → logout automatico. |

### Bugs extra resueltos en Sprint 2

| Bug | Fix |
|-----|-----|
| `PropTypes is not defined` en MisRegistrosPage y InstrumentoDetallePage | Importaciones agregadas |
| `useMemo is not defined` en useGestionUsuarios | Añadido al import de React |
| POST a `/instruments/[object Object]/metrics` | `crearMetrica(token, nuevoId, body)` — args corregidos |
| `StatusBadge status=undefined` en tabla de instrumentos | Columna usa `key: 'is_active'` con render derivado |
| Dos error toasts al primer login con `mustChangePassword=true` | Guard en layouts: `if (mustChangePassword) return <AppLayout>{null}</AppLayout>` |
| OIDC callback 401 (double-fetch en StrictMode) | `useRef(false)` como `calledRef` — ejecuta el fetch exactamente una vez |
| Magic link redirigía a `/login` (sin proxy) | URLs generadas incluyen `/api/v1/` prefix |

### Producción readiness (Sprint 2 extra)

| Item | Estado |
|------|--------|
| `VITE_OIDC_AUTHORIZE_URL` — URL del provider real (vacío = mock) | ✅ Env var + fallback |
| `VITE_SYSTEM_LOGIN_PATH` — path de SystemLoginPage | ✅ Env var + default `/__sys-auth` |
| `VITE_API_PROXY_TARGET` — target del proxy Vite | ✅ Env var + default `http://localhost:3000` |
| `.env.example` y `.env.development` documentados | ✅ Creados |
| JWT claims esperados por frontend documentados: `role`, `email`, `full_name`, `user_id` | ✅ En `.env.example` |

### Tabla agregada de áreas (post Sprint 2)

| Área | Estado | Detalle |
|------|--------|---------|
| Infraestructura de testing | ✅ | ~57+ tests verdes |
| Contrato `is_active: boolean` | ✅ | Sin cambios |
| Rutas canónicas M3 | ✅ | Sin cambios |
| INVENTARIO.md | ✅ | Actualizado a Sprint 2 |
| CI (GitHub Actions) | ✅ | Verde |
| Rol `superadmin` (CF-031) | ✅ | Completo desde Sprint 1 |
| Filtro Privacy by Design en M4 (CF-002) | ✅ | Completo desde Sprint 1 |
| Validación de fechas en M2 (CF-003) | ✅ | Completo desde Sprint 1 |
| `must_change_password` propagado (CF-004) | ✅ | Completo desde Sprint 1 |
| Tags + `min_days_between_applications` (CF-029) | ✅ | Completo desde Sprint 1 |
| Credenciales en código (CF-001) | ✅ | Completo desde Sprint 1 |
| **LoginPage OIDC + SystemLoginPage (CF-005)** | ✅ | Sprint 2 |
| **AuthContext sin prop drilling (CF-006)** | ✅ | Sprint 2 |
| **Mock OIDC completo (CF-007)** | ✅ | Sprint 2 |
| **Magic link activación (CF-008)** | ✅ | Sprint 2 |
| **Solicitud cambio de correo (CF-009)** | ✅ | Sprint 2 |
| **Producción readiness (env vars, JWT claims)** | ✅ | Sprint 2 extra |
| Gestión de proyectos (CF-3) | ❌ | **Próximo bloque — Sprint 3** |
| Perfiles, instituciones, onboarding (CF-4) | ❌ | Sprint 4 |
| M5, M6, exportación (CF-5) | ❌ | Sprint 5 |
| Limpieza de docs históricos | ⚠️ | Diferida |

---

## DECISIONES ARQUITECTÓNICAS VIGENTES

1. **Roles (esta etapa):** `superadmin` | `researcher` | `applicator`. El rol legacy NO existe en esta etapa — el rol actual se renombra a `superadmin`. Un rol de menor permiso se disena en una etapa futura.
2. **Jerarquía:** SUPERADMIN crea y gestiona todo. Researcher y applicator son creados por SUPERADMIN. No hay nivel intermedio en esta etapa.
3. **Auth:** SUPERADMIN usa email+password en ruta de sistema no listada. Researcher y applicator activan su cuenta vía magic link generado al crearlos, y autentican por OIDC/Keycloak en sesiones subsiguientes. El backend nunca toca passwords de usuarios normales.
4. **RF-M1-06:** Cambiar correo (`PATCH /users/:id/email`), no cambiar password.
5. **Instrumentos:** Globales, asignables a proyectos. Datos operativos siempre bajo `project_id`.
6. **Métricas:** Propietario M3. Path canónico: `/instruments/{id}/metrics`.
7. **Configuración Operativa:** Por proyecto (`GET/PUT /projects/:id/config/operativo`). Al crear un proyecto, el sistema ofrece "usar defaults del sistema" o "configurar ahora". Nunca se crea un proyecto con config vacía.
8. **Defaults del sistema (Config Operativa):** El mock tiene valores hardcodeados razonables como defaults: education_levels, age_cohort_ranges comunes, subject_limit = 50, mode = "normal". Estos se aplican cuando se elige "usar defaults".
9. **M5:** Researcher puede ver el listado completo de aplicaciones de sus proyectos (datos anonimos completos: anonymous_code, metricas, fechas). SUPERADMIN solo ve estadisticas agregadas. El backend filtra por membresia.
10. **M6 Exportacion:** Siempre requiere `project_id`. Solo Researcher exporta. Cada exportacion se registra en el audit log.
11. **Visibilidad de datos por rol:**
    - SUPERADMIN: estadisticas agregadas; sin acceso a datos detallados
    - Researcher: ve y exporta datos anonimos completos de sus proyectos (anonymous_code + metricas)
    - Applicator: solo ve sus propios registros (`/applications/my`)
    - Futuro rol de menor permiso (no en esta etapa): solo estadisticas agregadas por proyecto y aplicador, no datos explicitos
12. **Perfiles:** SUPERADMIN define por rol qué campos se piden en onboarding y si son obligatorios u opcionales. El usuario los rellena en su primer ingreso.
13. **Instituciones:** Tienen flag `public: boolean`. En onboarding el usuario solo ve instituciones públicas (salvo auto-asignación por dominio). Solo SUPERADMIN ve todas en la UI de gestión.
14. **Sujetos repetidos en wizard:** El aplicador puede seleccionar un sujeto registrado previamente. Cada instrumento tiene `min_days_between_applications` (default 15, configurable al crear). Si el gap no se cumple, el instrumento aparece bloqueado con fecha de próxima disponibilidad.
15. **Acceso no autorizado:** Cualquier rol sin permiso es redirigido a `/forbidden` con mensaje explicito. Nunca silencioso.
16. **Bootstrap del SUPERADMIN:** se siembra al arranque del mock leyendo `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD` del `.env`. Si las variables no están, se usan defaults locales (`super@methodology.local` / `cambiar-pronto`) y el mock emite WARNING en consola. El seed bootstrappeado por defaults nace con `must_change_password=true`; el seed configurado por env nace con `false` (el operador eligió). Crear más SUPERADMIN o rotar password en runtime queda fuera de Sprint 2 y se documenta como CLI futuro (`scripts/create-superadmin.js`, `scripts/rotate-superadmin.js`).
17. **Cambio de correo (no autoservicio):** Los usuarios NO pueden cambiar su propio correo. Pueden enviar una **solicitud** (`POST /users/me/email-change-request { new_email }`) que queda pendiente para el SUPERADMIN. El SUPERADMIN ve las solicitudes en la página de gestión de usuarios y aplica el cambio manualmente vía `PATCH /users/:id/email`. Aplicar un cambio de correo invalida el `broker_subject`, revoca todas las sesiones del usuario y dispara logout forzoso global de ese usuario.
18. **Path `/__sys-auth`:** El path del SystemLoginPage es configurable vía `VITE_SYSTEM_LOGIN_PATH` (default `/__sys-auth`). Garantía: **no enumeración** — no aparece en menús, sitemap, robots.txt, mensajes para usuarios ni redirects. NO garantiza secrecy criptográfica: el path estará como string literal en el bundle JS, igual que cualquier ruta de React Router. Para true secret URL haría falta SSR o un proxy reverso por header — fuera de scope de la fase mock. El bundle agrega `<meta name="robots" content="noindex">`.
19. **Vinculación `broker_subject` (Google `sub`):** El magic link de activación NO emite JWT; solo marca la cuenta como `active=true, broker_subject=null`. El primer login OIDC posterior captura el `sub` de Google y lo vincula al usuario. Logins siguientes deben presentar el mismo `sub`; cualquier mismatch retorna `401 INVALID_CREDENTIALS` (genérico, sin distinguir entre "email no encontrado", "cuenta inactiva" o "broker mismatch"). El audit log SÍ registra la causa real.
20. **Endpoints legacy de password (post CF-2):**
    - `POST /auth/setup` → **eliminado** (lo reemplaza `GET /auth/activate/:token`).
    - `POST /users/:id/reset-password` → **renombrado** a `POST /users/:id/magic-link` (regenera magic link, invalida el anterior).
    - `POST /auth/password-recovery`, `POST /auth/password-reset`, `PATCH /users/me/password` → **restringidos** a `role === 'superadmin'`. Cualquier otro role recibe `403 FORBIDDEN`.

---

## POLÍTICAS TRANSVERSALES — Zero Trust + Privacy by Design

Estas reglas aplican a **todas** las tareas. No son opcionales.

### Zero Trust

| Regla | Aplicación |
|-------|-----------|
| **Verificar siempre, confiar nunca** | Cada endpoint del mock valida JWT + rol. El frontend es solo la interfaz — no es la línea de defensa. Si el frontend dejó pasar algo, el backend lo rechaza igual. |
| **Mínimo privilegio** | Cada rol accede solo a los recursos que necesita. `GET /projects` para un applicator solo devuelve proyectos donde es miembro. `GET /institutions` para un user solo devuelve las públicas. |
| **Scope explicito** | Las rutas de SUPERADMIN (`/superadmin/*`) verifican `role === 'superadmin'` en el JWT antes de procesar. No basta con ser superadmin. |
| **Tokens de corta vida** | Access token: 15 min. Refresh token: 24h. El mock puede usar valores más largos para testing pero los tests deben cubrir el caso de token expirado → 401. |
| **Protección CSRF** | El flujo OIDC incluye parámetro `state` único por request. El callback verifica que el `state` recibido coincide con el enviado. |
| **Rate limiting en auth** | El endpoint de login (SUPERADMIN) aplica rate limiting: 5 intentos fallidos → bloqueo 15 min por IP. Tests deben cubrir este caso. |
| **Revocación de sesión** | `POST /auth/logout` invalida el JTI del token activo. Tokens revocados reciben 401 en cualquier endpoint subsiguiente. |
| **Auditoría de operaciones sensibles** | Login, logout, creación/desactivación de usuarios, cambio de correo, aceptación de términos, exportación de datos y cambios de config → entrada obligatoria en audit log. Los tests de esas operaciones verifican que el log se escribió. |

### Privacy by Design

| Regla | Aplicación |
|-------|-----------|
| **Anonimato de sujetos** | `anonymous_code` es generado por el backend, es único dentro del proyecto, y no es correlacionable con sujetos de otros proyectos. El aplicador nunca introduce un identificador propio. |
| **Minimización de datos** | Los exports contienen solo `anonymous_code` + métricas + fechas. Nunca nombre, email ni datos del aplicador. |
| **Campos realmente opcionales** | Si SUPERADMIN marcó un campo como opcional, el backend acepta `null` o ausencia sin error. El frontend muestra el indicador "opcional" pero no bloquea. |
| **Mensajes de error no enumerables** | Los endpoints de autenticación devuelven siempre la misma respuesta genérica para "usuario no existe" y "contraseña incorrecta": `401 { code: "INVALID_CREDENTIALS" }`. Nunca distinguir entre los dos casos. |
| **Visibilidad de datos por membresía** | Investigador: solo ve aplicaciones de proyectos donde es miembro (enforcement en API, no solo frontend). Aplicador: solo ve sus propias aplicaciones. El backend verifica la membresía en cada request. |
| **Exportación auditada** | Cada llamada a `GET /export/*` genera entrada en audit log con: user_id, project_id, filtros aplicados, timestamp. |

### Aplicación en el mock

Todos los nuevos routes deben:
1. Aplicar el middleware de auth (`requireAuth`) antes del handler
2. Verificar el rol requerido dentro del handler (no delegar solo al middleware genérico)
3. Retornar 401 para token ausente/inválido; 403 para rol insuficiente
4. No exponer información del sistema en errores 4xx/5xx (solo `code` y `message` genérico)

---

## ESTRUCTURA DEL PLAN

```
PARTE I  — CRÍTICO FUNCIONAL
  CF-1   Bugs bloqueantes y seguridad
  CF-2   Autenticación e identidad (SUPERADMIN + OIDC + onboarding)
  CF-3   Gestión de proyectos y configuración operativa
  CF-4   Perfiles, instituciones y onboarding dinámico
  CF-5   Módulos M5, M6 y extensiones de M2

PARTE II — UI / VISTA
  UI-1   Componentes y estructura
  UI-2   Accesibilidad y design system
  UI-3   UX enhancements

PARTE III — DEUDA TÉCNICA
  DT-1   Calidad de código
```

---

# PARTE I — CRÍTICO FUNCIONAL

---

## CF-1 — Bugs bloqueantes y seguridad

### CF-001 — Eliminar credenciales hardcodeadas de LoginPage
**Módulo:** M1 | **Depende:** —

**Tests:**
```
frontend/src/__tests__/pages/LoginPage.test.jsx
- No expone DEMO_EMAIL ni DEMO_PASSWORD en el DOM
- En modo producción, el panel de ayuda visual no renderiza
```

**Implementación:**
- Eliminar constantes `DEMO_EMAIL`, `DEMO_PASSWORD` (L6-7) y el bloque `{import.meta.env.DEV && ...}` (L159-179)
- Si se requiere ayuda en dev: solo vía variables de entorno no commiteadas (`VITE_DEMO_*`)

**Criterio:** `git grep "DEMO_EMAIL\|DEMO_PASSWORD"` vacío.

---

### CF-002 — Filtrar instrumentos activos en wizard M4 paso 3
**Módulo:** M4 | **Depende:** —

**Tests:**
```
frontend/src/__tests__/pages/RegistroOperativoWizard.test.jsx
- MSW verifica que GET /instruments incluye ?is_active=true
- Solo instrumentos activos aparecen en el selector del wizard
```

**Implementación:** `RegistroOperativoWizardPage.jsx`: agregar `?is_active=true` al fetch del paso 3.

**Criterio:** Wizard nunca muestra instrumentos con `is_active: false`.

---

### CF-003 — Validar start_date < end_date en creación de instrumento
**Módulo:** M2 | **Depende:** —

**Tests:**
```
frontend/src/__tests__/pages/GestionInstrumentos.test.jsx
- start_date >= end_date → error visible, POST no se llama
- start_date < end_date → POST se llama
```

**Implementación:** `GestionInstrumentos.jsx` → `validarFormCrear()`: regla `start_date < end_date`.

**Criterio:** No se puede crear instrumento con rango inválido.

---

### CF-004 — Verificar y asegurar flujo must_change_password
**Módulo:** M1 | **Depende:** —

**Tests:**
```
frontend/src/__tests__/App.test.jsx
- Token con must_change_password=true → modal aparece y no puede cerrarse
- Token con must_change_password=false → modal no aparece
```

**Implementación:** Leer `App.jsx` y confirmar estado real. Corregir si hay bug. Agregar tests como garantía de regresión.

---

## CF-2 — Autenticación e identidad

### CF-005 — LoginPage pública (OIDC) + Ruta de sistema SUPERADMIN (no enumerable)
**Módulo:** M1 | **Depende:** —

Son dos páginas completamente separadas. La segunda no aparece en menús, enlaces ni mensajes; un usuario normal no debe encontrarla por navegación normal. Ver decisión arquitectónica #18 para los límites reales de la "ocultación" en una SPA.

**Tests:**
```
frontend/src/__tests__/pages/LoginPage.test.jsx
- Render: SOLO el botón "Iniciar sesión con Google" visible
- Helper text: "Solo para cuentas invitadas previamente por un administrador"
- No existe ningún input de email/password en el DOM
- No existe ningún enlace, texto o hint a /__sys-auth
- Click en botón → window.location.href = /api/v1/auth/oidc/authorize?state=…
- El path del SystemLoginPage no aparece en el HTML renderizado

frontend/src/__tests__/pages/SystemLoginPage.test.jsx
- Renderiza solo en la ruta configurada por VITE_SYSTEM_LOGIN_PATH
- Formulario email + password únicamente (sin botón OIDC ni mención de Google)
- Submit con credenciales válidas de superadmin → POST /auth/login → JWT con role:superadmin → navega a /
- Submit con credenciales de usuario NO superadmin → 401 INVALID_CREDENTIALS (mensaje genérico, no revela si el usuario existe)
- 5 intentos fallidos → 429 RATE_LIMITED con tiempo de espera
- La página agrega <meta name="robots" content="noindex"> al head
- No existe ningún <Link to={SYSTEM_LOGIN_PATH}> en toda la app
```

**Implementación:**
- `LoginPage.jsx`: rewrite. Solo botón "Iniciar sesión con Google" + helper text. Click → `window.location.href = '/api/v1/auth/oidc/authorize?state=' + crypto.randomUUID()` (state guardado en sessionStorage para verificarse en el callback).
- Crear `frontend/src/pages/SystemLoginPage.jsx`: formulario email + password, llama `POST /auth/login`. Si la respuesta es 200 pero `role !== 'superadmin'` → forzar logout local + mostrar mismo error genérico que credenciales malas.
- Ruta registrada en `App.jsx` usando `import.meta.env.VITE_SYSTEM_LOGIN_PATH` (default `/__sys-auth`). El env var se documenta en `.env.example`.
- Crear `frontend/src/pages/AuthCallbackPage.jsx` (ruta fija `/auth/callback`): recibe `?code=…&state=…`, verifica el state, llama `POST /auth/oidc/exchange { code, state }`, recibe JWT, llama `login(token)` del AuthContext, redirige según role.
- **Zero Trust en mock `POST /auth/login`:** verificar que `user.role === 'superadmin'`. Si no, devolver el mismo `401 INVALID_CREDENTIALS` que para credenciales malas. Audit log registra la causa real.

**Criterio:** `git grep -n "to=\"/__sys-auth\"\|to={.*SYSTEM_LOGIN" frontend/src` vacío. Tests en verde.

---

### CF-006 — Implementar AuthContext — eliminar prop drilling de token
**Módulo:** M1 | **Depende:** CF-005

**Tests:**
```
frontend/src/__tests__/context/AuthContext.test.jsx
- Sin token: useAuth() → { user: null, token: null, isAuthenticated: false }
- Con token: useAuth() → usuario decodificado + isAuthenticated: true
- login(token) → context actualiza; logout() → context limpia

frontend/src/__tests__/App.test.jsx
- Ninguna ruta hija recibe token como prop
```

**Implementación:**
- Crear `frontend/src/context/AuthContext.jsx`: `AuthProvider` + `useAuth()`
- Contexto: `{ token, user, isAuthenticated, login, logout }`
- `user` = JWT decodificado (sin llamada extra al backend)
- `App.jsx`: reemplazar estado local de token y todas las props `token={token}` por contexto

**Criterio:** `git grep 'token={token}'` en App.jsx vacío.

---

### CF-007 — Mock: Simular flujo OIDC
**Módulo:** M1 | **Depende:** CF-005

**Tests:**
```
mock/src/__tests__/routes/oidc.test.js
- GET /auth/oidc/authorize?state=X&redirect_uri=Y → 302 o { redirect_url } que incluye state=X de vuelta
- POST /auth/oidc/callback { email, state } con state que no coincide → 400 INVALID_STATE (anti-CSRF)
- POST /auth/oidc/callback { email, state } válido → 200 { access_token, refresh_token, expires_in }
  JWT incluye: id, email, role, accepted_terms, profile_complete, exp (15 min)
- Email no registrado → 401 { code: "INVALID_CREDENTIALS" }   ← genérico, no "USER_NOT_FOUND"
- Usuario desactivado → 401 { code: "INVALID_CREDENTIALS" }   ← mismo código, no revela que el usuario existe
- POST /auth/refresh { refresh_token } → 200 { access_token, expires_in } (nuevo access token)
- POST /auth/refresh con refresh_token inválido → 401
```

**Implementación:**
- Crear `mock/src/routes/oidc.js`
- El `state` es generado por el frontend al iniciar el flujo OIDC; se almacena en `sessionStorage` y se verifica en el callback
- El mock simula este flujo: `GET /authorize` genera un `state`; `POST /callback` lo verifica
- **Zero Trust:** Ambos `email no encontrado` y `usuario desactivado` retornan el mismo 401 con el mismo código. No distinguir.
- Registrar en `mock/src/index.js`

**Criterio:** Tests en verde. CSRF prevenido. Enumeración de usuarios prevenida.

---

### CF-008 — Magic link de activación de cuenta (flujo en dos pasos)
**Módulo:** M1 | **Depende:** CF-007

Al crear un usuario, el mock genera automáticamente un magic link (token único, TTL 48h) y lo expone en la respuesta. El SUPERADMIN ve el link en `CredencialesModal` con un botón "Copiar" y lo envía manualmente al usuario por el medio que prefiera. El sistema nunca dispara correos por sí solo.

**Flujo en dos pasos** (ver decisión arquitectónica #19):

```
[1] POST /users { full_name, email, role }
    → genera magic_link (token + URL), guarda el token con expiry
    → respuesta: { user, _mock_magic_link: "https://app/setup?token=…" }

[2a] GET /auth/activate/:token  (usuario abre el link)
     → si válido: marca user.active=true, broker_subject=null, awaiting_oidc_link=true
     → marca el token como usado
     → devuelve 200 { ok: true, message: "Cuenta activada. Inicia sesión con Google." }
     → NO emite JWT
     → frontend redirige a /login

[2b] GET /auth/activate/:token expirado/ya usado
     → 410 { code: "LINK_EXPIRED_OR_USED" }

[3] Usuario hace clic en "Iniciar sesión con Google" en /login
    → flujo OIDC (CF-007) → mock devuelve { email, sub }
    → backend busca user por email
    → si user.awaiting_oidc_link === true && user.broker_subject === null:
        bind: user.broker_subject = sub; awaiting_oidc_link = false
        → emite JWT
    → si user.broker_subject !== null && sub coincide:
        → emite JWT
    → cualquier otro caso (sub no coincide, user inexistente, inactivo, no activado):
        → 401 INVALID_CREDENTIALS (genérico, no distingue causas)
        → audit log registra la causa real
```

**Tests:**
```
mock/src/__tests__/routes/users.test.js (ampliar)
- POST /users → respuesta incluye _mock_magic_link con URL completa
- POST /users con email duplicado → 409
- POST /users/:id/magic-link → regenera el link, invalida el anterior

mock/src/__tests__/routes/oidc.test.js (parte de CF-007 ampliada)
- GET /auth/activate/:token válido → 200 { ok: true } (NO incluye JWT)
- GET /auth/activate/:token marca user.active=true, awaiting_oidc_link=true
- GET /auth/activate/:token expirado → 410 LINK_EXPIRED_OR_USED
- GET /auth/activate/:token usado dos veces → 410 en la segunda
- POST /auth/oidc/callback con email de user awaiting_oidc_link → vincula broker_subject, emite JWT
- POST /auth/oidc/callback con email de user ya vinculado pero sub diferente → 401 INVALID_CREDENTIALS
- POST /auth/oidc/callback con email no encontrado → 401 INVALID_CREDENTIALS
- POST /auth/oidc/callback con user inactivo → 401 INVALID_CREDENTIALS

frontend/src/__tests__/pages/SetupPage.test.jsx (reescribir)
- Render /setup?token=válido → llama GET /auth/activate/:token, muestra "Cuenta activada"
- Click "Continuar" → navega a /login con mensaje "Ahora puedes iniciar sesión con Google"
- Token expirado → muestra error "Este enlace ya no es válido. Contacta a tu administrador."
- Token inválido → mismo mensaje genérico
```

**Implementación:**
- Mock: nuevo `mock/src/routes/oidc.js` (parte de CF-007) que aloja `GET /auth/activate/:token` y los endpoints OIDC.
- Mock: el store gana `magicLinks: Map<token, { user_id, expires_at, used_at }>`.
- Mock: `POST /users` ahora genera magic link automáticamente (no setup token de password).
- Mock: nuevo `POST /users/:id/magic-link` reemplaza el viejo `POST /users/:id/reset-password`.
- Frontend: reescribir `SetupPage.jsx` para consumir activación; rename del campo de servicio `setup.js` → `validarMagicLink` / `activarCuenta`.
- Frontend: `CredencialesModal.jsx` ahora muestra el `_mock_magic_link` con un botón "Copiar enlace". Texto: "Envíaselo al usuario por el medio que prefieras."

**Criterio:** Usuario activa cuenta sin establecer password. Magic link es single-use. broker_subject se vincula en el primer OIDC login y se enforza desde ahí.

---

### CF-009 — Solicitud de cambio de correo (no autoservicio) (RF-M1-06)
**Módulo:** M1 | **Depende:** CF-005, CF-008

Decisión 17: el usuario **no puede cambiar su propio correo**. Puede *solicitar* el cambio; el SUPERADMIN lo aprueba aplicando `PATCH /users/:id/email`, lo cual invalida el binding `broker_subject` y revoca todas las sesiones del usuario.

`CambiarPasswordModal.jsx` **se conserva** (lo usa únicamente el SUPERADMIN cuando rota su propia contraseña forzada). No se renombra ni se elimina.

**Tests — frontend:**
```
frontend/src/__tests__/components/SolicitarCambioCorreoModal.test.jsx
- Render: campo "Nuevo correo electrónico" + textarea opcional "Motivo"
- Mensaje aclaratorio: "Tu solicitud será revisada por un administrador"
- Submit correo inválido → error de validación, POST no llamado
- Submit correo válido → POST /users/me/email-change-request { new_email, reason }
- 201 → modal cierra y muestra "Solicitud enviada. El administrador la revisará."
- 409 PENDING_REQUEST_EXISTS → "Ya tienes una solicitud pendiente"
- 409 EMAIL_ALREADY_EXISTS → "Ese correo ya está registrado"

frontend/src/__tests__/pages/SolicitudesCambioCorreo.test.jsx (superadmin)
- Render lista vacía → "No hay solicitudes pendientes"
- Render lista con solicitudes → muestra correo actual, correo nuevo, motivo, fecha
- Click "Aprobar" → confirma → PATCH /users/:id/email { email: nuevo } + DELETE /users/email-change-requests/:reqId
- Tras aprobar → toast "Correo actualizado. El usuario fue desconectado."
- Click "Rechazar" → DELETE /users/email-change-requests/:reqId
- 409 EMAIL_ALREADY_EXISTS al aprobar → mensaje específico
```

**Tests — mock:**
```
mock/src/__tests__/routes/users.test.js (ampliar)
- POST /users/me/email-change-request { new_email } → 201 { id, user_id, new_email, created_at }
- POST sin new_email → 400 VALIDATION_ERROR
- POST con correo de formato inválido → 400 VALIDATION_ERROR
- POST con segunda solicitud del mismo usuario → 409 PENDING_REQUEST_EXISTS
- POST con new_email ya en uso → 409 EMAIL_ALREADY_EXISTS
- GET /users/email-change-requests sin token superadmin → 403
- GET /users/email-change-requests (superadmin) → 200 [{ id, user_id, current_email, new_email, reason, created_at }]
- DELETE /users/email-change-requests/:id (superadmin) → 204
- PATCH /users/:id/email aplicado por superadmin → 200; reseta broker_subject=null; revoca tokens del usuario; elimina solicitudes pendientes asociadas
- Tras PATCH /users/:id/email, el token previo del usuario → 401 SESSION_REVOKED
```

**Implementación — mock:**
- Store: agregar `emailChangeRequests: []` y array de `revokedTokens` (o `tokenVersion` por usuario).
- `mock/src/routes/m1.js`:
  - `POST /users/me/email-change-request` → valida formato, no permite duplicado pendiente, no permite correo ya existente
  - `GET /users/email-change-requests` → restringido a `role === 'superadmin'`
  - `DELETE /users/email-change-requests/:id` → restringido a superadmin
  - `PATCH /users/:id/email` → restringido a superadmin; setea `email`, `broker_subject = null`, incrementa `tokenVersion`, borra solicitudes pendientes del usuario
- Middleware `verifyToken`: comparar `tokenVersion` del JWT contra el del usuario; si no coincide → 401 `SESSION_REVOKED`.

**Implementación — frontend:**
- Nuevo `frontend/src/components/SolicitarCambioCorreoModal.jsx`. Trigger: ítem "Solicitar cambio de correo" en el menú de usuario del `AppLayout` (visible para todos los roles).
- Nuevo `frontend/src/services/emailChangeRequests.js` con `solicitarCambioCorreo`, `listarSolicitudesCambioCorreo`, `aprobarSolicitudCambioCorreo`, `rechazarSolicitudCambioCorreo`.
- Nueva tarjeta/sección "Solicitudes de cambio de correo pendientes" en `GestionAplicadores.jsx` y `GestionInvestigadores.jsx` (o componente compartido `SolicitudesCambioCorreoPanel.jsx`).
- En cliente HTTP: detectar `401 SESSION_REVOKED` → ejecutar logout local y redirigir a `/login` con mensaje "Tu sesión fue cerrada. Vuelve a iniciar sesión."

**Criterio:**
- Usuario no-superadmin no tiene UI para editar su correo directamente; solo el modal de solicitud.
- Aprobar una solicitud invalida la sesión activa del usuario (logout forzoso).
- `CambiarPasswordModal` permanece intacto y solo se renderiza cuando `getRoleFromToken(token) === 'superadmin' && mustChangePassword`.

---

### CF-009b — Bootstrap del SUPERADMIN (notas operativas, no implementación)
**Módulo:** M1 | **Depende:** —

Sección de **documentación**, no de tareas ejecutables. Cubre cómo nace la primera credencial del sistema y qué se difiere a futuros sprints.

**Seed del mock (Sprint 2):**
- Variables `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD` leídas desde `process.env` al arrancar `mock/src/index.js`.
- Defaults si no están definidas:
  - `SUPERADMIN_EMAIL = "super@methodology.local"`
  - `SUPERADMIN_PASSWORD = "cambiar-pronto"`
- Si se usaron defaults → `must_change_password = true` y el banner del mock imprime una advertencia clara: `"⚠️  SUPERADMIN bootstrap usando defaults. Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD en .env para producción."`
- Si las variables están definidas en `.env` → `must_change_password = false`, sin banner.
- Se elimina todo rastro de `superadmin@mock.local` (migracion completada en Bloque 0 de Sprint 2).

**Producción (futuro, fuera de Sprint 2):**
- Las credenciales viven en un secreto externo (Kubernetes Secret, AWS Secrets Manager, etc.), nunca en el repo.
- `mock/.env.example` se actualiza con ambas variables y un comentario explicando que en backend real será gestor de secretos.

**CLI `create-superadmin` (documentado pero NO implementado):**
- Roadmap: `scripts/create-superadmin.js` que genere un usuario superadmin con `--email` y opcional `--temp-pass`. Si no se pasa contraseña, genera una de 24 caracteres con CSPRNG y la imprime una sola vez en stdout.
- Marca `must_change_password = true` siempre que el usuario sea creado por este CLI.
- Se considera para Sprint 4 o posterior; por ahora basta con las env vars.

**Criterio:** este bloque queda como referencia. No produce tests ni código en Sprint 2 más allá del seed del mock cubierto por CF-001/CF-005.

---

## CF-3 — Gestión de proyectos y configuración operativa

### CF-010 — Mock: CRUD proyectos
**Módulo:** M2-PROJECT | **Depende:** —

**Tests:**
```
mock/src/__tests__/routes/projects.test.js
- POST /projects { name, description } → 201 { id, name, description, created_at }
- POST /projects sin name → 400 VALIDATION_ERROR
- GET /projects → 200 [lista con member_count, instrument_count]
- GET /projects/:id → 200 { id, name, description, members:[], instruments:[], config_operativo:{} }
- GET /projects/:id inexistente → 404
- PATCH /projects/:id → 200 actualizado
- DELETE /projects/:id → 204; GET → 404
```

**Implementación:**
- Crear `mock/src/routes/projects.js`
- Store: `projects: []`, `projectMembers: []`, `projectInstruments: []`
- Sembrar 2 proyectos de ejemplo
- Registrar en `mock/src/index.js`

---

### CF-011 — Mock: Membresía de proyectos y asignación de instrumentos
**Módulo:** M2-PROJECT | **Depende:** CF-010

**Tests:**
```
mock/src/__tests__/routes/projects.test.js (ampliar)
- POST /projects/:id/members { user_id, role: "researcher"|"applicator" } → 201
- POST /projects/:id/members con user_id ya miembro → 409 ALREADY_MEMBER
- GET /projects/:id/members → 200 [{ user_id, email, full_name, role, institution }]
- GET /projects/:id/members?role=researcher → filtra por rol
- GET /projects/:id/members?institution_id=X → filtra por institución
- DELETE /projects/:id/members/:user_id → 204

- POST /projects/:id/instruments { instrument_id } → 201
- POST con instrumento ya asignado → 409
- GET /projects/:id/instruments → 200 [instrumento completo]
- DELETE /projects/:id/instruments/:instrument_id → 204
```

**Implementación:** Agregar sub-rutas a `mock/src/routes/projects.js`.

---

### CF-012 — Mock: Configuración operativa por proyecto con defaults del sistema
**Módulo:** M2-PROJECT | **Depende:** CF-010

La config operativa es por proyecto. El sistema tiene defaults hardcodeados que se aplican cuando el SUPERADMIN elige "usar configuración predeterminada" al crear el proyecto.

**Defaults del sistema (hardcodeados en el mock):**
```js
SYSTEM_DEFAULTS_CONFIG_OPERATIVO = {
  education_levels: ["prebásica","básica","media","superior"],
  age_cohort_ranges: ["4-6","7-9","10-12","13-15","16-18","19-25","26-35","36-50","51+"],
  subject_limit: 50,
  mode: "normal"
}
```

**Tests:**
```
mock/src/__tests__/routes/projects.test.js (ampliar)
- GET /config/system-defaults → 200 { education_levels:[...], age_cohort_ranges:[...], subject_limit:50, mode:"normal" }
  (endpoint público para SUPERADMIN — retorna los defaults del sistema)
- POST /projects con use_defaults:true → crea proyecto con config = SYSTEM_DEFAULTS (nunca vacía)
- POST /projects con use_defaults:false + config:{...} → crea proyecto con la config provista
- POST /projects sin campo use_defaults ni config → 400 CONFIG_REQUIRED (no se permite config vacía)
- GET /projects/:id/config/operativo → 200 { education_levels, age_cohort_ranges, subject_limit, mode }
  (siempre tiene valores, nunca vacío)
- PUT /projects/:id/config/operativo { education_levels, age_cohort_ranges, subject_limit, mode } → 200
```

**Implementación:**
- Agregar constante `SYSTEM_DEFAULTS_CONFIG_OPERATIVO` en el store del mock
- `GET /config/system-defaults` para que el frontend la muestre en el diálogo de creación
- `POST /projects`: campo opcional `use_defaults: boolean` y `config: {}`. Si `use_defaults:true` → copia los defaults. Si ambos ausentes → 400.
- Eliminar el endpoint global `GET /config/operativo` (o hacerlo retornar 410 GONE)

---

### CF-013 — Frontend: ProjectsPage (CRUD proyectos)
**Módulo:** M2-PROJECT | **Depende:** CF-010, CF-011

**Tests:**
```
frontend/src/__tests__/pages/ProjectsPage.test.jsx
- Lista de proyectos desde GET /projects
- "Nuevo proyecto" → POST /projects
- Click en proyecto → navega a /proyectos/:id

frontend/src/__tests__/pages/ProjectsPage.test.jsx (creación con diálogo de config)
- Click "Nuevo proyecto" → modal con: nombre, descripción
- Modal incluye sección de configuración operativa con dos opciones:
  ◉ Usar configuración predeterminada del sistema (muestra preview de los defaults)
  ○ Configurar ahora (muestra formulario inline con education_levels, age_cohort_ranges, etc.)
- Seleccionar "defaults" → POST /projects { name, description, use_defaults:true }
- Seleccionar "configurar ahora" + rellenar → POST /projects { name, description, config:{...} }
- No se puede crear proyecto sin elegir una de las dos opciones → botón Crear deshabilitado

frontend/src/__tests__/pages/ProjectDetailPage.test.jsx
- Render: tabs General | Miembros | Instrumentos | Configuración Operativa
- Tab Miembros: input de búsqueda de usuarios con filtros (rol, institución)
  → resultados son usuarios existentes en el sistema (no formulario de creación)
  → agregar usuario → POST /projects/:id/members
- Tab Instrumentos: lista instrumentos asignados; botón asignar instrumento global
- Tab Configuración Operativa: formulario pre-cargado con config actual → PUT /projects/:id/config/operativo
  Nunca está vacío (siempre tiene al menos los defaults)
```

**Implementación:**
- Crear `frontend/src/pages/ProjectsPage.jsx` (ruta: `/proyectos`, rol: superadmin)
- Crear `frontend/src/pages/ProjectDetailPage.jsx` (ruta: `/proyectos/:id`)
- En el tab Miembros: búsqueda de usuarios existentes con filtros de rol e institución — **no se crean usuarios desde aquí**
- En el tab Config Operativa: reemplazar la página global `ConfiguracionOperativaPage.jsx` con este tab
- Crear `frontend/src/services/projects.js`
- Agregar rutas en `App.jsx` y enlace en nav

**Criterio:** SUPERADMIN gestiona proyectos completamente desde una sola pantalla. ConfiguracionOperativaPage global queda obsoleta.

---

### CF-014 — Deprecar ConfiguracionOperativaPage global
**Módulo:** M2 | **Depende:** CF-013

**Tests:**
```
- Navegar a /configuracion-operativa → redirige a /proyectos con banner "La configuración operativa ahora es por proyecto"
- No hay enlace a /configuracion-operativa en la navegación
```

**Implementación:**
- Eliminar el enlace del sidebar
- La ruta `/configuracion-operativa` devuelve un redirect a `/proyectos`
- Los tests existentes de ConfiguracionOperativaPage → actualizar para usar el nuevo endpoint por proyecto

---

### CF-015 — Wizard M4: Paso 0 — selección de proyecto
**Módulo:** M4 | **Depende:** CF-010 | **Origen:** BUG-003 prerequisito

**Tests:**
```
frontend/src/__tests__/pages/RegistroOperativoWizard.test.jsx
- Wizard renderiza Paso 0: "Seleccionar proyecto"
- GET /projects se llama al montar; lista solo proyectos donde el aplicador es miembro
- Sin proyecto seleccionado → "Siguiente" deshabilitado
- Proyecto seleccionado → project_id disponible en estado del wizard; config operativa del proyecto se carga
```

**Implementación:**
- `RegistroOperativoWizardPage.jsx`: Paso 0 al inicio
- Al seleccionar proyecto: `GET /projects/:id/config/operativo` → reemplaza la carga global de config
- `project_id` se propaga a todos los pasos siguientes

---

### CF-016 — Wizard M4: Paso 1 — selector de sujeto existente
**Módulo:** M4 | **Depende:** CF-015

El aplicador puede reutilizar un sujeto que ya registró anteriormente en este proyecto.

**Tests:**
```
frontend/src/__tests__/pages/RegistroOperativoWizard.test.jsx
- Con proyecto seleccionado y sin sujetos previos: solo opción "Nuevo sujeto" visible (no hay toggle)
- Con proyecto seleccionado y con sujetos previos: aparecen ambas opciones
- Seleccionar sujeto existente → GET /projects/:id/subjects/mine (sujetos del aplicador en este proyecto)
- Al elegir sujeto → se muestra historial de instrumentos aplicados con fechas
- Instrumento dentro de gap (min_days no cumplidos) → aparece bloqueado con "Disponible a partir de: DD/MM"
- Instrumento fuera de gap → seleccionable para nueva aplicación
- Sujeto nuevo → flujo normal sin cambios

mock/src/__tests__/routes/projects.test.js (ampliar)
- GET /projects/:id/subjects/mine → 200 [sujetos creados por el aplicador autenticado en ese proyecto]
- Cada sujeto incluye applications: [{ instrument_id, instrument_name, application_date, next_available_date }]
```

**Implementación:**
- Mock: `GET /projects/:id/subjects/mine` — filtra subjects por `created_by = userId` + `project_id`
- Cada application en la respuesta incluye `next_available_date = application_date + instrument.min_days_between_applications`
- Frontend: mostrar sección "Sujeto existente" condicionalmente; el selector carga la lista del mock
- Al seleccionar sujeto existente con instrumento ya elegido: pasar al Paso 2 con datos pre-cargados

---

### CF-017 — Corregir rutas M4: project_id en todas las llamadas del wizard
**Módulo:** M4 | **Depende:** CF-016 | **Origen:** BUG-003

**Tests:**
```
frontend/src/__tests__/pages/RegistroOperativoWizard.test.jsx
- Con project_id="proj-1" seleccionado, todos los pasos usan el path correcto:
  POST /projects/proj-1/subjects
  POST /projects/proj-1/subjects/:id/context
  POST /projects/proj-1/applications
  POST /projects/proj-1/applications/:id/metric-values

mock/src/__tests__/routes/projects.test.js (ampliar)
- POST /projects/:id/subjects → 201 { id, project_id, anonymous_code }
- POST /projects/:id/subjects/:sid/context → 200
- POST /projects/:id/applications → 201
- POST /projects/:id/applications/:aid/metric-values → 201
```

**Implementación:**
- Actualizar los 4 endpoints en `RegistroOperativoWizardPage.jsx`
- Agregar sub-rutas M4 en `mock/src/routes/projects.js`
- BUG-003 queda completamente resuelto

---

### CF-018 — Wizard M4: retroceso en Paso 2 y fallo en Paso 4
**Módulo:** M4 | **Depende:** — | **Origen:** BUG-005, BUG-008

**Tests:**
```
- Editar contexto tras retroceso → PATCH con dato actualizado
- Sin editar tras retroceso → no hace segundo PATCH
- POST /metric-values falla → error claro + botón "Reintentar"; aplicación no se pierde
- Reintentar con éxito → wizard completa normalmente
```

**Implementación:**
- Flag `contextDirty` en el estado del wizard
- Captura de error en Paso 4 con estado de reintento

---

## CF-4 — Perfiles, instituciones y onboarding dinámico

### CF-019 — Mock: Modelo de instituciones con visibilidad pública/privada
**Módulo:** M1 | **Depende:** —

**Tests:**
```
mock/src/__tests__/routes/institutions.test.js
- POST /institutions sin token → 401
- POST /institutions con token de applicator → 403
- POST /institutions (superadmin) { name, description, public: boolean } → 201
- GET /institutions sin token → 401
- GET /institutions con token de researcher → 200 [solo instituciones con public:true]
- GET /institutions con token de applicator → 200 [solo instituciones con public:true]
- GET /institutions con token de superadmin → 200 [todas]
  ← El filtro es en el BACKEND según el rol del JWT, no en el frontend
- POST /institutions/:id/domains { domain: "univ.edu" } → 201
- GET /institutions/resolve?email=user@univ.edu → 200 { institution_id, institution_name, locked: true }
- GET /institutions/resolve sin token → 401
- GET /institutions/resolve con dominio sin institución → 404 (no revela si la institución es privada)
```

**Implementación:**
- Crear `mock/src/routes/institutions.js` con campo `public: boolean` en el store
- **Zero Trust:** `GET /institutions` evalúa el rol en el JWT en cada request. No hay query param `?public=true`; el filtro es automático e implícito según el rol. Un researcher que intente un request manipulado sigue viendo solo las públicas.
- Sembrar 2 instituciones de ejemplo (una pública, una privada)
- `GET /institutions/resolve` devuelve 404 tanto para dominio no registrado como para dominio de institución privada (no revela existencia de instituciones privadas)

---

### CF-020 — Mock: Campos de perfil en usuarios + configuración de campos por rol
**Módulo:** M1 | **Depende:** CF-019

**Tests:**
```
mock/src/__tests__/routes/users.test.js (ampliar)
- POST /users → usuario creado con institution_id:null, phone:null, department:null, position:null, profile_complete:false

- GET /superadmin/profile-config → 200 { applicator: [{field, label, required}], researcher: [...] }
- PUT /superadmin/profile-config { applicator: [...], researcher: [...] } → 200
  Campos configurables: phone, department, position, institution_id, [campos custom]
  Para cada campo: { field, label, required: boolean, type: "text"|"select"|"phone" }

- PATCH /users/me/profile { phone, department, position, institution_id } → 200
- institution_id con dominio bloqueado (email del usuario coincide) → 409 INSTITUTION_LOCKED_BY_DOMAIN
- GET /users/me → incluye todos los campos de perfil + profile_complete
- GET /users/:id (superadmin) → incluye todos los campos de perfil
```

**Implementación:**
- Store de usuarios: agregar campos de perfil extendidos
- Store de config: `profileConfig: { applicator: [], researcher: [] }` con defaults razonables
- `PATCH /users/me/profile`: valida campos según config activa del rol del usuario
- `profile_complete` se actualiza a `true` cuando todos los campos `required` tienen valor

---

### CF-021 — Frontend: Términos y Condiciones en primer ingreso
**Módulo:** M1 | **Depende:** CF-006

**Tests:**
```
frontend/src/__tests__/pages/TermsPage.test.jsx
- Usuario con accepted_terms:false → redirigido a /terminos antes de cualquier ruta protegida
- /terminos renderiza contenido de T&C y botón "Acepto los términos"
- Click "Acepto" → POST /users/me/accept-terms { version: "1.0" } → redirige a /onboarding

mock/src/__tests__/routes/users.test.js (ampliar)
- POST /users/me/accept-terms → 200 { accepted_terms: true, accepted_at: ISO8601, version: "1.0" }
- Idempotente: segunda llamada → 200 sin error
```

**Implementación:**
- Crear `frontend/src/pages/TermsPage.jsx` (ruta: `/terminos`)
- Texto genérico con placeholder para reemplazar con texto real
- Guard en `App.jsx`: `user.accepted_terms === false` → redirect a `/terminos`
- Mock: `POST /users/me/accept-terms` actualiza el store del usuario

---

### CF-022 — Frontend: Onboarding dinámico de perfil
**Módulo:** M1 | **Depende:** CF-020, CF-021

El formulario de onboarding se construye dinámicamente según la configuración del SUPERADMIN para el rol del usuario.

**Tests:**
```
frontend/src/__tests__/pages/OnboardingPage.test.jsx
- GET /superadmin/profile-config cargado al montar → formulario refleja campos configurados para el rol
- Campos requeridos marcados visualmente; campos opcionales con indicador "opcional"
- Si email del usuario resuelve a institución → institución pre-cargada y deshabilitada
- Si no resuelve → GET /institutions?public=true → selector libre de instituciones públicas
- Submit con todos los requeridos → PATCH /users/me/profile → profile_complete: true → redirect a home del rol
- Submit con campo requerido vacío → error de validación, no hace PATCH
```

**Implementación:**
- Crear `frontend/src/pages/OnboardingPage.jsx` (ruta: `/onboarding`)
- Al montar: `GET /superadmin/profile-config` + `GET /institutions/resolve?email=<user.email>`
- Guard en `App.jsx`: orden de guards: terms → onboarding → home. Solo aplica si `accepted_terms:true` y `profile_complete:false`

---

### CF-023 — Frontend: SUPERADMIN — configuración de campos de perfil por rol
**Módulo:** M1 | **Depende:** CF-020

**Tests:**
```
frontend/src/__tests__/pages/SuperadminProfileConfigPage.test.jsx
- Render: dos secciones: "Aplicadores" e "Investigadores"
- Cada sección lista los campos configurables con toggle requerido/opcional
- Drag & drop o reordenamiento de campos
- "Guardar" → PUT /superadmin/profile-config → confirmación visible
```

**Implementación:**
- Crear `frontend/src/pages/SuperadminProfileConfigPage.jsx` (ruta: `/superadmin/configuracion/perfil`, rol: superadmin)
- Solo accesible para SUPERADMIN
- Enlace en la navegación del SUPERADMIN

---

### CF-024 — Frontend: SUPERADMIN gestion de instituciones
**Módulo:** M1 | **Depende:** CF-019

**Tests:**
```
frontend/src/__tests__/pages/InstitutionsPage.test.jsx
- Lista de instituciones (SUPERADMIN ve todas; toggle publico/privado visible)
- "Nueva institución" → POST /institutions
- Agregar dominio → POST /institutions/:id/domains
- Eliminar dominio → DELETE /institutions/:id/domains/:domainId
- Toggle público/privado → PATCH /institutions/:id
```

**Implementación:**
- Crear `frontend/src/pages/InstitutionsPage.jsx` (ruta: `/instituciones`, rol: superadmin)
- Crear `frontend/src/services/institutions.js`

---

### CF-025 — Frontend: DetalleInvestigadorPage
**Módulo:** M1 | **Depende:** CF-006

**Tests:**
```
frontend/src/__tests__/pages/DetalleInvestigadorPage.test.jsx
- Render: datos del investigador (nombre, email, institución, departamento, posición)
- Lista de proyectos en los que es miembro
- Sección de estado (activo/inactivo) con botón de cambio
- Botón de reset de cuenta (genera nuevo magic link)
```

**Implementación:**
- Crear `frontend/src/pages/DetalleInvestigadorPage.jsx` (ruta: `/usuarios/investigadores/:id`, rol: superadmin)
- Similar a `DetalleAplicadorPage.jsx` pero sin la sección de permisos de registro operativo

---

## CF-5 — Módulos M5, M6 y extensiones de M2

### CF-026 — Frontend: ApplicationsPage para investigador (M5)
**Módulo:** M5 | **Depende:** CF-006

**Tests:**
```
frontend/src/__tests__/pages/ApplicationsPage.test.jsx
- GET /applications?page=1&page_size=20 al montar
- Filtro opcional por proyecto → GET /applications?project_id=X
- Filtro por instrumento y fecha
- Paginación server-side
- Rol applicator → redirect a /forbidden
- Cada fila: fecha, instrumento, proyecto, código anónimo, número de métricas
```

**Mock:**
- `GET /applications` soporta: `page`, `page_size`, `project_id` (opcional), `instrument_id`, `from`, `to`
- Retorna `{ data, total, page, page_size }`

### CF-026b — Backend: Applications stats (SUPERADMIN)
**Módulo:** M5 | **Depende:** CF-026

**Tests:**
```
mock/src/__tests__/routes/m5_stats.test.js
- GET /applications/stats (superadmin) → 200 con agregados
- Respuesta no incluye subject_id ni metric_values
- Rol researcher/applicator → 403
```

**Mock:**
- `GET /applications/stats` retorna agregados por proyecto e instrumento

**Implementación:**
- Endpoint solo para SUPERADMIN

**Implementación:**
- Crear `frontend/src/pages/ApplicationsPage.jsx` (ruta: `/registros`, roles: researcher)
- Crear `frontend/src/services/applications.js`

---

### CF-027 — Frontend: ExportPage (M6) — solo por proyecto
**Módulo:** M6 | **Depende:** CF-026

**Tests:**
```
frontend/src/__tests__/pages/ExportPage.test.jsx
- Render: selector de proyecto requerido (no puede exportar sin seleccionar)
- Sin proyecto: botones deshabilitados con mensaje "Selecciona un proyecto para exportar"
- Con proyecto: GET /projects → selector cargado con proyectos del usuario
- Filtros adicionales: instrumento, rango de fechas
- "Exportar CSV" → GET /export/csv?project_id=X&... → descarga
- "Exportar JSON" → GET /export/json?project_id=X&... → descarga
- Rol applicator → redirect a /forbidden
- Rol superadmin → redirect a /forbidden

mock/src/__tests__/routes/m6.test.js
- GET /export/csv?project_id=X → 200 con Content-Type: text/csv
- GET /export/csv sin project_id → 400 PROJECT_ID_REQUIRED
- GET /export/json?project_id=X → 200 JSON
```

**Implementación:**
- Crear `frontend/src/pages/ExportPage.jsx` (ruta: `/exportar`, roles: researcher)
- Mock `m6.js`: `project_id` es obligatorio; sin él → 400

---

### CF-028 — MisRegistrosPage: paginacion server-side
**Módulo:** M5 | **Depende:** —

**Tests:**
```
- GET /applications/my?page=1&page_size=20 al montar (no sin params)
- Cambio de página → nueva request con page actualizado
- Filtro por instrumento incluido en query params
```

**Implementación:**
- Eliminar carga completa + filtrado client-side
- Estado: `page`, `page_size`, `filters`; cada cambio dispara nuevo fetch
- Mock: actualizar `/applications/my` para soportar paginación

---

### CF-029 — Tags/etiquetas en instrumentos con min_days_between_applications
**Módulo:** M2 | **Depende:** —

Un instrumento puede tener cero, uno o múltiples tags. Los tags son texto libre pero el input ofrece autocomplete con tags ya usados en otros instrumentos. Tags se normalizan a minúsculas al guardar.

**Tests:**
```
mock/src/__tests__/routes/instruments.test.js (ampliar)
- POST /instruments con tags:["lingüística","edad escolar"] → 201 con ambos tags guardados
- POST /instruments sin campo tags → 201 con tags:[] (default)
- GET /instruments → cada instrumento incluye tags:[]
- GET /instruments?tag=lingüística → solo instrumentos que contienen esa tag
- GET /instruments?tag=X&tag=Y → instrumentos que contienen X OR Y (no AND)
- PATCH /instruments/:id { tags:["nuevo"] } → 200 (reemplaza el array completo, no merge)
- GET /instruments/tags → 200 [lista de todos los tags únicos usados, ordenados alfab.]
  (endpoint de autocomplete; requiere JWT autenticado; no requiere rol superadmin)
- POST /instruments sin min_days_between_applications → 201 con default 15
- POST /instruments con min_days_between_applications:0 → 201 (0 = sin restricción de gap)
- PATCH /instruments/:id { min_days_between_applications:30 } → 200 actualizado

frontend/src/__tests__/pages/GestionInstrumentos.test.jsx (ampliar)
- Formulario de creación: input de tags con chips removibles
- Al escribir: GET /instruments/tags → sugerencias de tags existentes visibles
- Se puede seleccionar sugerencia O escribir un tag completamente nuevo (texto libre)
- Un instrumento puede acumular múltiples tags simultáneamente antes de guardar
- Campo "Días mínimos entre aplicaciones" (number, default 15, mínimo 0)
- Filtro por tag en la lista de instrumentos
```

**Implementación:**
- Mock: agregar `tags: string[]` y `min_days_between_applications: number` al modelo en `m2.js`
- Tags normalizados a minúsculas en el handler
- Nuevo endpoint `GET /instruments/tags` en `m2.js`
- Filtro `?tag=` repetible en `GET /instruments`
- Frontend: componente chip-input con autocomplete (carga `GET /instruments/tags` al montar el form)
- `InstrumentoDetallePage`: mostrar tags como chips y campo de días mínimos

---

### CF-030 — Frontend: Audit logs para superadmin
**Módulo:** M1 | **Depende:** CF-006

El endpoint `GET /audit-log` ya existe en el mock. Solo falta la UI.

**Tests:**
```
frontend/src/__tests__/pages/AuditLogsPage.test.jsx
- GET /audit-log?page=1&page_size=50 al montar
- Filtro por user_id → GET /audit-log?user_id=X
- Filtro por evento (login, create_user, update_status, etc.)
- Filtro por rango de fechas
- Cada fila: timestamp, usuario, evento, detalle, IP (si disponible)
- Roles sin permiso → /forbidden
```

**Implementación:**
- Crear `frontend/src/pages/AuditLogsPage.jsx` (ruta: `/superadmin/logs`, rol: superadmin)
- Crear `frontend/src/services/auditLog.js`
- Mock: verificar que `GET /audit-log` ya registra eventos del sistema; si no, agregar middleware de logging

---

### CF-031 — Renombrar rol legacy → `superadmin` en mock y frontend
**Módulo:** M1 | **Depende:** — | **Prioridad:** Alta — prerequisito para cualquier guard de rol

El rol legacy existe en el codigo actual (mock store, frontend guards, tests). Debe renombrarse a `superadmin` en todos los lugares.

**Tests:**
```
mock/src/__tests__/routes/m1.test.js (verificar)
- POST /auth/login con super@methodology.local → JWT contiene role: "superadmin"
- GET /instruments sin token → 401
- GET /instruments con token role:superadmin → 200
- POST /instruments con token role:superadmin → 201
- POST /instruments con token role:researcher → 403

frontend/src/__tests__/App.test.jsx (verificar)
- Guard de rutas: role === 'superadmin' da acceso a /proyectos, /usuarios/*, /instrumentos (write)
- role legacy → /forbidden (rol ya no existe)
```

**Implementación:**
- Mock `mock/src/routes/m1.js`: cambiar el usuario pre-sembrado de rol legacy a `role: 'superadmin'`
- Mock `mock/src/middleware/auth.js`: checks de rol legacy → `role === 'superadmin'`
- Mock `mock/src/routes/*.js`: verificaciones de rol legacy → superadmin
- Frontend `App.jsx`: guards de rutas de rol legacy → `role === 'superadmin'`
- Frontend todas las páginas: condicionales de rol legacy → `user.role === 'superadmin'`
- Tests mock y frontend: fixtures con rol legacy → `role: 'superadmin'`
- `git grep` del rol legacy despues del cambio debe retornar solo comentarios historicos o documentacion

**Criterio:** `git grep` del rol legacy vacio en `.js` y `.jsx`. Tests en verde.

---

# PARTE II — UI / VISTA

---

## UI-1 — Componentes y estructura

### UI-001 — Mover CredencialesModal a /components/app
**Origen:** COUPLING-001

**Implementación:** Mover + actualizar imports. `git grep "pages/CredencialesModal"` vacío.

---

### UI-002 — Consolidar GestionAplicadores y GestionInvestigadores en componente dinámico
**Origen:** STATE-001

**Tests:**
```
- <GestionUsuarios role="applicator"> → título "Aplicadores"
- <GestionUsuarios role="researcher"> → título "Investigadores"
- Ambas: carga, create, cambio estado funcionan
```

**Implementación:**
- Crear `GestionUsuarios.jsx` + `useGestionUsuarios.js`
- Mantener rutas separadas en `App.jsx` (`/usuarios/aplicadores` y `/usuarios/investigadores`)
- Eliminar `GestionAplicadores.jsx` y `GestionInvestigadores.jsx`

---

### UI-003 — Refactorizar estado de modales en InstrumentoDetallePage
**Origen:** STATE-002

15 variables → `modalState: { tipo, open, payload }` + `openModal(tipo, payload)` / `closeModal()`.

---

### UI-004 — Estandarizar botón de acciones en tablas
**Origen:** DS-017..019 + nuevo

**Implementación:**
- Crear `frontend/src/components/ui/TableActionButton.jsx` (wrapper de Button.jsx: `size="sm"`, `variant="ghost"`, `aria-label` obligatorio cuando es solo icono)
- Reemplazar todos los `<button>` raw en tablas de: MisRegistrosPage, InstrumentoDetallePage, DetalleAplicadorPage

---

## UI-2 — Accesibilidad y design system

### UI-005 — Reemplazar espaciados px hardcoded por var(--space-N)
Archivos: MisRegistrosPage, RegistroOperativoWizardPage, GestionInstrumentos, InstrumentoDetallePage, ConfiguracionOperativaPage.

### UI-006 — Normalizar layout widths hardcoded
Archivos: GestionAplicadores (L154), GestionInvestigadores (L154), GestionInstrumentos (L591), MisRegistrosPage, ConfiguracionOperativaPage, DetalleAplicadorPage.

### UI-007 — Agregar aria-expanded en botón expandible (MisRegistrosPage:37)

### UI-008 — Redireccionamiento explícito a /forbidden
**Origen:** RF-M1-05

Cada ruta protegida tiene un guard que, si el rol no corresponde, redirige a `/forbidden` — nunca silenciosamente a `/login`. La página `/forbidden` muestra: rol requerido, opción de volver atrás, y mensaje de contacto.

### UI-009 — lineHeight en bloque monospace de LoginPage (DS-021)

---

## UI-3 — UX enhancements

### UI-010 — GuideTour para Aplicador e Investigador
**Depende:** CF-006

**Implementación:**
- Librería: `react-joyride`
- Pasos definidos por rol (aplicador: wizard + mis registros; investigador: registros + exportar)
- Primer ingreso: tour se activa automáticamente después del onboarding
- Estado en `localStorage` por `userId + role`
- Botón de relanzamiento: texto explícito "Guía de uso" en la barra de navegación (no un icono "?")
- `GuideTour.jsx` recibe `role` como prop y selecciona el conjunto de pasos correcto

---

# PARTE III — DEUDA TÉCNICA

### DT-001 — Corregir dependencias de useEffect (HOOKS-001, HOOKS-002)
GestionAplicadores.jsx:74-80, GestionInstrumentos.jsx:184-185. Remover `eslint-disable`, corregir deps con `useCallback`.

### DT-002 — AbortController en fetch de MisRegistrosPage (HOOKS-003)
Cleanup de fetch en useEffect para evitar state updates tras desmontaje.

### DT-003 — Cleanup de setTimeout en SetupPage y CredencialesModal (HOOKS-004, HOOKS-005)
`clearTimeout` en el return del `useEffect` para cada timer.

### DT-004 — Reemplazar comparaciones con JSON.stringify (STATE-003, STATE-004)
ConfiguracionOperativaPage:363, DetalleAplicadorPage:240 → comparación estructural específica.

### DT-005 — Eliminar useMemo innecesario en GestionInstrumentos (PERF-001)
GestionInstrumentos.jsx:84-90 → JWT parsing es O(1), no necesita memoización.

---

# RESUMEN GENERAL

## Tabla completa de tareas

| ID | Título | Fase | Depende |
|----|--------|------|---------|
| CF-001 | Eliminar credenciales hardcodeadas | CF-1 | — | ✅ Sprint 1 |
| CF-002 | Filtro is_active=true en wizard | CF-1 | — | ✅ Sprint 1 |
| CF-003 | Validar start_date < end_date | CF-1 | — | ✅ Sprint 1 |
| CF-004 | Verificar must_change_password | CF-1 | — | ✅ Sprint 1 |
| CF-005 | LoginPage: rutas diferenciadas SUPERADMIN/OIDC | CF-2 | — | ✅ Sprint 2 |
| CF-006 | AuthContext — eliminar prop drilling | CF-2 | CF-005 | ✅ Sprint 2 |
| CF-007 | Mock: endpoints OIDC simulados | CF-2 | CF-005 | ✅ Sprint 2 |
| CF-008 | Magic link de activación de cuenta | CF-2 | CF-007 | ✅ Sprint 2 |
| CF-009 | Solicitud de cambio de correo (no autoservicio) | CF-2 | CF-005, CF-008 | ✅ Sprint 2 |
| CF-010 | Mock: CRUD proyectos | CF-3 | — |
| CF-011 | Mock: membresía y asignación de instrumentos | CF-3 | CF-010 |
| CF-012 | Mock: configuración operativa por proyecto | CF-3 | CF-010 |
| CF-013 | Frontend: ProjectsPage + ProjectDetailPage | CF-3 | CF-010, CF-011 |
| CF-014 | Deprecar ConfiguracionOperativaPage global | CF-3 | CF-013 |
| CF-015 | Wizard M4: Paso 0 — selección de proyecto | CF-3 | CF-010 |
| CF-016 | Wizard M4: Paso 1 — selector de sujeto existente | CF-3 | CF-015, CF-029 |
| CF-017 | Wizard M4: corregir paths con project_id | CF-3 | CF-016 |
| CF-018 | Wizard M4: retroceso Paso 2 + fallo Paso 4 | CF-3 | — |
| CF-019 | Mock: instituciones con visibilidad pública/privada | CF-4 | — |
| CF-020 | Mock: campos de perfil + config por rol | CF-4 | CF-019 |
| CF-021 | Frontend: Términos y Condiciones | CF-4 | CF-006 |
| CF-022 | Frontend: Onboarding dinámico de perfil | CF-4 | CF-020, CF-021 |
| CF-023 | Frontend: SUPERADMIN — config de campos de perfil | CF-4 | CF-020 |
| CF-024 | Frontend: SUPERADMIN gestion de instituciones | CF-4 | CF-019 |
| CF-025 | Frontend: DetalleInvestigadorPage | CF-4 | CF-006 |
| CF-026 | Frontend: ApplicationsPage (M5) | CF-5 | CF-006 |
| CF-027 | Frontend: ExportPage (M6) por proyecto | CF-5 | CF-026 |
| CF-028 | MisRegistrosPage: paginación server-side | CF-5 | — |
| CF-029 | Tags + min_days_between_applications en instrumentos | CF-5 | — |
| CF-030 | Frontend: Audit logs para superadmin | CF-5 | CF-006 |
| CF-031 | Renombrar rol legacy → `superadmin` | CF-1 | — | ✅ Sprint 1 |
| UI-001 | Mover CredencialesModal a /components/app | UI-1 | — |
| UI-002 | Consolidar GestionAplicadores/Investigadores | UI-1 | — |
| UI-003 | Refactorizar modales InstrumentoDetallePage | UI-1 | — |
| UI-004 | Estandarizar TableActionButton | UI-1 | — |
| UI-005 | Espaciados px → var(--space-N) | UI-2 | — |
| UI-006 | Normalizar layout widths | UI-2 | — |
| UI-007 | aria-expanded en MisRegistrosPage | UI-2 | — |
| UI-008 | /forbidden explícito y bloqueante | UI-2 | — |
| UI-009 | lineHeight en LoginPage | UI-2 | — |
| UI-010 | GuideTour con botón de texto "Guía de uso" | UI-3 | CF-006 |
| DT-001 | Corregir deps useEffect | DT-1 | — |
| DT-002 | AbortController en MisRegistrosPage | DT-1 | — |
| DT-003 | Cleanup setTimeout | DT-1 | — |
| DT-004 | Reemplazar JSON.stringify comparisons | DT-1 | — |
| DT-005 | Eliminar useMemo innecesario | DT-1 | — |

**Total: 46 tareas** — 31 crítico funcional · 10 UI/vista · 5 deuda técnica
**Completadas: 11** (CF-001..004, CF-031 en Sprint 1; CF-005..009, CF-029 en Sprint 1/2)

## Árbol de dependencias críticas

```
CF-005 (Login diferenciado)
  └── CF-006 (AuthContext)
        ├── CF-007 (Mock OIDC) → CF-008 (Magic link) → CF-009 (Solicitud cambio correo)
        ├── CF-021 (Términos) → CF-022 (Onboarding) ← CF-020 (Mock perfil) ← CF-019 (Instituciones)
        ├── CF-023 (SUPERADMIN config perfil)
        ├── CF-024 (Gestión instituciones)
        ├── CF-025 (DetalleInvestigador)
        ├── CF-026 (ApplicationsPage) → CF-027 (ExportPage)
        └── CF-030 (Audit logs)

CF-010 (Mock proyectos)
  ├── CF-011 (Mock membresía) → CF-013 (ProjectsPage) → CF-014 (Deprecar config global)
  ├── CF-012 (Mock config por proyecto) → CF-013
  └── CF-015 (Wizard paso 0) → CF-016 (Sujeto existente) → CF-017 (Fix BUG-003)

CF-029 (Tags + min_days)
  └── CF-016 (Sujeto existente, necesita min_days para calcular disponibilidad)

Independientes (cualquier momento):
  CF-001..004, CF-018, CF-019, CF-028, CF-029
  UI-001..009, DT-001..005
```

## Orden de implementación sugerido

```
Sprint 1: CF-001 CF-002 CF-003 CF-004 CF-029 CF-031                        ✅ CERRADO
Sprint 2: CF-005 CF-006 CF-007 CF-008 CF-009                               ✅ CERRADO
Sprint 3: CF-010 CF-011 CF-012 CF-013 CF-014 CF-015 CF-016 CF-017 CF-018  ✅ CERRADO (sin commit)
Sprint 4: CF-S4-001..011  JWT mínimo + UserContext + perfiles + instituciones + onboarding
          → Ver docs/SPRINT_4_PLAN.md                                       ← SIGUIENTE
Sprint 5: CF-026 CF-027 CF-028 CF-030             (M5, M6, logs)
Sprint 6: UI-001..004 + UI-008                    (componentes + forbidden)
Sprint 7: UI-005..007 UI-009 UI-010 + DT-001..005 (polish + deuda técnica)
```

---

*Versión 4.2 — 2026-04-08*
