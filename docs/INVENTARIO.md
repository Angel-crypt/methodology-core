# INVENTARIO — methodology-core

> Última actualización: 2026-04-08
>
> Este archivo es la fuente de verdad del estado del proyecto.
> Un agente o equipo que solo lea este documento debe poder entender qué existe,
> cómo está conectado, y qué falta sin necesidad de leer el código fuente.

---

## 1. QUÉ ES ESTE PROYECTO

Sistema web para el registro operativo anonimizado de métricas lingüísticas en contextos de investigación educativa. Permite a aplicadores capturar datos de sujetos sin PII, asociarlos a instrumentos metodológicos, y exponerlos a investigadores para análisis.

**Stack:**
- Frontend: React 18 + Vite + React Router v6, desplegado como SPA estática
- Mock server: Express (Node.js, CommonJS), datos 100% en memoria (se pierde al reiniciar)
- Backend real: existe en `/backend` (FastAPI + PostgreSQL), **no cubierto en este inventario**
- Infraestructura: k3s + Ansible (despliegue en `/deploy` y `/ansible`)

**Repositorio:** `Angel-crypt/methodology-core` — rama principal `main`, desarrollo en `dev`

---

## 2. ARQUITECTURA DE MÓDULOS

El sistema está dividido en 6 módulos funcionales. Solo M1–M4 tienen implementación completa en el mock.

| Módulo | Nombre | Estado Frontend | Estado Mock |
|--------|--------|----------------|-------------|
| M1 | Autenticación y Control de Acceso | ✅ Completo | ✅ Completo |
| M2 | Gestión de Instrumentos | ✅ Completo | ✅ Completo |
| M3 | Definición de Métricas | ✅ Completo | ✅ Completo |
| M4 | Registro Operativo Anonimizado | ✅ Completo | ✅ Completo |
| M5 | Consulta Interna | ⚠️ Parcial (solo vista aplicador) | ⚠️ Endpoint existe |
| M6 | Exportación Estructurada | ❌ No implementado | ⚠️ Endpoint existe |

---

## 3. ROLES DE USUARIO

| Rol | Acceso |
|-----|--------|
| `superadmin` | Acceso total. Gestiona usuarios, instrumentos, métricas y configuración operativa. |
| `applicator` | Solo puede acceder al wizard de registro operativo y ver sus propios registros. |
| `researcher` | Accede a instrumentos en modo lectura. Vista de consulta pendiente. |

El rol está codificado en el JWT (`role` claim). Las rutas del frontend redirigen si el rol no coincide.

> **Nota CF-031:** El rol `administrator` fue renombrado a `superadmin` en todo el stack (frontend, mock y SRS). No queda ninguna referencia al nombre antiguo en el código.

---

## 4. FRONTEND — PÁGINAS

Base: `frontend/src/pages/`

| Archivo | Ruta URL | Rol requerido | Qué hace |
|---------|----------|---------------|---------|
| `LoginPage.jsx` | `/login` | público | Solo boton OIDC para researcher/applicator. Redirige a `/auth/oidc/authorize`. |
| `SystemLoginPage.jsx` | `/__sys-auth` (configurable) | público | Login email+password solo SUPERADMIN. Llama `POST /auth/login`. |
| `AuthCallbackPage.jsx` | `/auth/callback` | público | Procesa callback OIDC, valida `state` y guarda JWT. |
| `SetupPage.jsx` | `/setup?token=...` | público | Activacion por magic link. Llama `GET /auth/activate/:token` y redirige a `/login`. |
| `GestionAplicadores.jsx` | `/usuarios/aplicadores` | superadmin | Lista, crea, activa/desactiva y restablece contraseña de aplicadores. |
| `GestionInvestigadores.jsx` | `/usuarios/investigadores` | superadmin | Idéntico a `GestionAplicadores.jsx` pero para investigadores. |
| `DetalleUsuarioPage.jsx` | `/usuarios/aplicadores/:id` | superadmin | Detalle de usuario compartido con proyectos asignados. |
| `CambiarPasswordModal.jsx` | — (modal) | autenticado | Modal para cambio de contraseña. Si `forced=true` no puede cerrarse (flujo primer acceso). |
| `CredencialesModal.jsx` | — (modal) | superadmin | Muestra el setup token generado al crear un usuario. Solo UI, no llama API. |
| `GestionInstrumentos.jsx` | `/instruments` | autenticado | Lista instrumentos con filtro activo/inactivo y filtro por tags (CF-029). Crea, edita, activa/desactiva y elimina instrumentos. El wizard de creación incluye chip-input de tags y `min_days_between_applications`. Incluye creación de métricas (formulario 2 pasos). |
| `InstrumentoDetallePage.jsx` | `/instruments/:id` | autenticado | Detalle de un instrumento: descripción, período, lista de métricas. Permite crear, editar y eliminar métricas. |
| `RegistroOperativoWizardPage.jsx` | `/registro-operativo` | applicator | Wizard con seleccion de proyecto. Solicita instrumentos activos y config por proyecto. |
| `MisRegistrosPage.jsx` | `/mis-registros` | applicator | Historial de registros del aplicador autenticado. Llama `GET /applications/my`. |
| `ConfiguracionOperativaPage.jsx` | `/configuracion-operativa` | superadmin | Deprecada; redirige a `/proyectos`. |

---

## 5. MOCK SERVER — TODOS LOS ENDPOINTS

Base URL: `http://localhost:3000/api/v1`

El servidor expone también `GET /health` (sin prefijo `/api/v1`).

Superadmin pre-sembrado: leído de `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` (defaults de desarrollo: `super@methodology.local` / `cambiar-pronto`).

### M1 — Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | no | Login email+password. Responde `{ access_token, token_type, expires_in, must_change_password }`. Rate limiting: 5 intentos fallidos → bloqueo 5 min. |
| POST | `/auth/logout` | Bearer | Revoca el JTI del token en memoria. |
| GET | `/auth/activate/:token` | no | Activa cuenta via magic link (single-use). No emite JWT. |
| POST | `/auth/password-recovery` | no | Recuperacion solo SUPERADMIN. |
| POST | `/auth/password-reset` | no | Reset solo SUPERADMIN. |
| POST | `/users` | superadmin | Crea usuario. Devuelve `_mock_magic_link` (mock). |
| GET | `/users` | admin | Lista usuarios paginada (máx 50/página). Filtros: `?role=`, `?active=`, `?page=`, `?limit=`. |
| GET | `/users/:id` | admin | Datos completos de un usuario (sin `password_hash`). |
| PATCH | `/users/me/password` | Bearer | Cambia contraseña propia. Body: `{ current_password, new_password }`. |
| PATCH | `/users/:id/status` | admin | Activa o desactiva un usuario. Body: `{ active: boolean }`. |
| POST | `/users/:id/magic-link` | superadmin | Regenera magic link. |
| GET | `/users/sessions` | admin | Todas las sesiones activas del sistema. |
| GET | `/users/me/sessions` | Bearer | Sesiones activas del usuario autenticado. |
| GET | `/users/:id/sessions` | admin | Sesiones activas de un usuario específico. |
| DELETE | `/sessions/:jti` | Bearer | Cierra una sesión específica (revoca el token). |
| GET | `/users/:id/permissions` | admin | Permisos de registro operativo de un aplicador. |
| PUT | `/users/:id/permissions` | admin | Actualiza permisos. Body: `{ mode, education_levels, subject_limit }`. |
| GET | `/audit-log` | admin | Log de auditoría. Filtros: `?event=`, `?user_id=`, `?from=`, `?to=`. |

### M2 — Instrumentos

Todos los endpoints de M2 usan `is_active: boolean` — tanto en el store interno como en la API externa. No hay conversión de strings.

Cada instrumento incluye además los campos CF-029: `tags` (array de strings normalizados a lowercase, sin duplicados) y `min_days_between_applications` (entero ≥ 0, default 0).

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/instruments` | superadmin | Crea instrumento. Body: `{ name, methodological_description?, start_date?, end_date?, tags?, min_days_between_applications? }`. Responde con `is_active: true`. Valida `end_date > start_date`. |
| GET | `/instruments` | Bearer | Lista instrumentos. Filtros: `?is_active=true\|false` y `?tag=foo` (repetible, OR semántico, case-insensitive). |
| GET | `/instruments/tags` | Bearer | Catálogo de tags únicos (CF-029). Devuelve array ordenado alfabéticamente, excluye instrumentos eliminados. |
| GET | `/instruments/:id` | Bearer | Detalle de instrumento. Incluye `is_active: boolean`, `tags`, `min_days_between_applications` y `metrics_count`. |
| PATCH | `/instruments/:id` | superadmin | Edita descripción, período, tags y/o `min_days_between_applications` (patch parcial). |
| PATCH | `/instruments/:id/status` | superadmin | Cambia estado. Body: `{ is_active: boolean }`. |
| DELETE | `/instruments/:id` | superadmin | Soft delete. El instrumento queda con `deleted: true`. |

### M3 — Métricas

Los endpoints están montados en `/instruments/:id/metrics`. No hay rutas legacy.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/instruments/:id/metrics` | admin | Crea métrica. Body: `{ name, metric_type, required, min_value?, max_value?, options?, description? }`. Tipos: `numeric \| categorical \| boolean \| short_text`. |
| GET | `/instruments/:id/metrics` | Bearer | Lista métricas del instrumento. 404 si el instrumento no existe. 200 con array vacío si existe pero sin métricas. |
| PATCH | `/instruments/:id/metrics/:metricId` | admin | Edita métrica. 404 si la métrica no pertenece al instrumento. |
| DELETE | `/instruments/:id/metrics/:metricId` | admin | Elimina métrica. 404 si la métrica no pertenece al instrumento. |

### M4 — Registro Operativo

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/projects/:projectId/subjects` | applicator | Crea sujeto anónimo bajo un proyecto. Body vacío obligatorio (Privacy by Design). Responde `{ id, project_id, created_at }`. |
| POST | `/subjects` | applicator | Ruta legacy (sin project_id). Mantener temporalmente. |
| POST | `/subjects/:id/context` | applicator | Registra contexto no identificable. Operación única por sujeto (409 si ya existe). Campos: `school_type, education_level, age_cohort, gender, socioeconomic_level, additional_attributes`. |
| GET | `/subjects/:id` | Bearer | Recupera sujeto con su contexto. |
| POST | `/applications` | applicator | Registra aplicación de instrumento a sujeto. Body: `{ subject_id, instrument_id, application_date?, notes? }`. |
| GET | `/applications/my` | applicator | Historial de aplicaciones del aplicador autenticado, con valores de metrica. |
| POST | `/metric-values` | applicator | Captura valores de métricas. Body: `{ application_id, values: [{ metric_id, value }] }`. Operación atómica. |

### Configuración Operativa

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/config/operativo` | Bearer | Lee configuración global del wizard. Devuelve `project_id`, `education_levels`, `cohort_mode`, etc. |
| PUT | `/config/operativo` | admin | Actualiza configuración operativa (patch parcial — solo los campos enviados se modifican). |

### Health Check

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | no | Retorna `{ status: "ok", service, timestamp }`. Sin prefijo `/api/v1`. |

---

## 6. FRONTEND — SERVICIOS (capa de acceso a API)

Base: `frontend/src/services/`

| Archivo | Funciones exportadas |
|---------|---------------------|
| `instruments.js` | `listarInstrumentos` (acepta `tagFilter`), `listarTags`, `crearInstrumento`, `editarInstrumento`, `cambiarEstadoInstrumento`, `obtenerInstrumento`, `eliminarInstrumento`, `listarMetricas`, `crearMetrica`, `editarMetrica`, `eliminarMetrica` |
| `users.js` | `listarUsuarios`, `crearUsuario`, `cambiarEstadoUsuario`, `listarTodosUsuarios`, `listarTodasLasSesiones`, `listarSesionesUsuario`, `obtenerUsuario`, `resetearPassword`, `obtenerPermisos`, `guardarPermisos` |
| `setup.js` | `validarSetupToken`, `completarSetup` |

---

## 7. DESIGN SYSTEM

### Tokens CSS (`frontend/src/styles/tokens/`)

| Archivo | Contenido |
|---------|-----------|
| `colors.css` | Paleta completa: primary, secondary, error, warning, info, success, neutral |
| `spacing.css` | `--space-1` (4px) → `--space-8` (32px) |
| `typography.css` | Font sizes, weights, line-heights |
| `motion.css` | Transiciones y animaciones |
| `index.css` | Punto de entrada (importa todos) |

**Reglas:** usar siempre `var(--token)` — nunca valores hex o px directos. Íconos: `lucide-react`.

### Componentes base (`frontend/src/components/app/`)

| Componente | Qué hace |
|------------|---------|
| `Alert.jsx` | Alertas tipadas: error, warning, success, info |
| `Button.jsx` | Botón con variantes (primary, ghost, danger) y estado loading |
| `DataTable.jsx` | Tabla con columnas configurables |
| `DatePicker.jsx` | Selector de fecha con restricciones de rango |
| `EmptyState.jsx` | Estado vacío con ícono y mensaje |
| `FormField.jsx` | Campo de formulario con label y mensaje de error |
| `GlobalSearch.jsx` | Búsqueda global entre módulos |
| `Modal.jsx` | Diálogo modal con footer de acciones |
| `PillToggle.jsx` | Selector de opción tipo pill |
| `ProfileDropdown.jsx` | Menú desplegable del perfil de usuario |
| `RoleBadge.jsx` | Badge de rol: administrator, applicator, researcher |
| `Sidebar.jsx` | Barra lateral de navegación con links por rol |
| `Spinner.jsx` | Indicador de carga |
| `StatusBadge.jsx` | Badge de estado: active, inactive, pending, deleted |
| `Toast.jsx` | Notificaciones temporales |
| `Tooltip.jsx` | Tooltip en hover |
| `Typography.jsx` | Wrapper semántico: h1–h6, body, small, etc. |
| `UserAvatar.jsx` | Avatar con iniciales del usuario |
| `ActionsMenu.jsx` | Menú de acciones con dropdown |
| `useToast.js` | Hook para disparar notificaciones Toast |

---

## 8. TESTING

### Frontend (Vitest)
- Config: `frontend/vite.config.js` (bloque `test`)
- Setup global: `frontend/src/test/setup.js` (RTL + MSW)
- Handlers MSW: `frontend/src/test/handlers.js`
- Tests: `frontend/src/__tests__/`
- Comando: `cd frontend && npm test`
- Cobertura: `cd frontend && npm run test:coverage`

### Mock (Jest)
- Config: `mock/jest.config.js`
- Tests: `mock/src/__tests__/`
- Comando: `cd mock && npm test`

### CI (GitHub Actions)
- Archivo: `.github/workflows/test.yml`
- Dos jobs paralelos: `frontend` (Vitest) y `mock` (Jest)
- Se activa en push/PR a `main` y `dev`

**Estado actual: 76 tests, todos en verde** (43 mock + 33 frontend, tras Sprint 1).

---

## 9. ESTADO DE IMPLEMENTACIÓN

### Qué funciona completamente

- Login OIDC para researcher/applicator y login de sistema para SUPERADMIN
- Magic link de activacion (mock) + onboarding con terminos
- AuthContext y UserContext (sin prop drilling de token)
- Gestión de usuarios (crear, activar/desactivar, resetear contraseña)
- Permisos por aplicador (mode, education_levels, subject_limit)
- Sesiones activas: ver y cerrar sesiones individuales
- Gestión de instrumentos: CRUD completo con soft delete, tags y `min_days_between_applications` (CF-029)
- Métricas: CRUD completo vía `/instruments/:id/metrics`, tipos `numeric`, `categorical`, `boolean`, `short_text`
- Wizard de registro operativo: 4 pasos completos (sujeto → contexto → aplicación → métricas)
- Historial de registros del aplicador (`GET /applications/my`)
- Configuracion operativa por proyecto (global deprecada)

### Qué está incompleto o ausente

| Funcionalidad | Estado | Ubicación |
|---------------|--------|-----------|
| Vista de consulta para investigador/superadmin (M5 real) | ❌ No implementado | Pendiente P2 |
| Exportacion CSV/JSON (M6) | ❌ No implementado | Pendiente P2 |
| `GestionAplicadores` y `GestionInvestigadores` son código duplicado | ⚠️ DRY pendiente | Pendiente T009 |

---

## 10. PROBLEMAS CONOCIDOS (PENDIENTES)

| ID | Descripción | Impacto | Módulo |
|----|-------------|---------|--------|
| P-03 | `GestionAplicadores.jsx` y `GestionInvestigadores.jsx` son copias idénticas | Bajo | M1 |
| P-04 | `CredencialesModal.jsx` está en `/pages` pero es un componente reutilizable | Bajo | M1 |
| P-05 | M5 solo tiene vista de aplicador; el SRS define consulta para investigador/admin | Alto | M5 |
| P-06 | M6 (exportación) no tiene ninguna página en el frontend | Alto | M6 |

> P-01 (OIDC) y P-02 (prop drilling de token) — resueltos en Sprint 2 (CF-005, CF-006). Eliminados de esta lista.

---

## 11. ESTRUCTURA DE ARCHIVOS CLAVE

```
methodology-core/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Una página por ruta
│   │   ├── components/
│   │   │   └── app/        # Design system (ver §7)
│   │   ├── services/        # Llamadas a la API (ver §6)
│   │   ├── layouts/
│   │   │   └── AppLayout.jsx  # Shell con Sidebar + outlet
│   │   ├── test/            # Setup MSW y handlers globales
│   │   └── __tests__/       # Tests unitarios
│   ├── vite.config.js
│   └── package.json
├── mock/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── m1.js        # Auth y usuarios
│   │   │   ├── m2.js        # Instrumentos
│   │   │   ├── m3.js        # Métricas (legacy paths)
│   │   │   ├── m4.js        # Registro operativo
│   │   │   └── config.js    # Configuración operativa
│   │   ├── middleware/
│   │   │   ├── auth.js      # JWT + RBAC
│   │   │   └── validateStrictInput.js
│   │   ├── store/
│   │   │   └── index.js     # Estado en memoria
│   │   └── index.js         # Entry point Express
│   └── package.json
├── docs/
│   ├── INVENTARIO.md        # Este archivo
│   ├── PLAN_ACCION.md       # Plan de trabajo (P0–P3)
│   ├── ANALYSIS_M1-M6.md    # Reporte de auditoría completo
│   └── CONTRADICCIONES_SRS.md  # Inconsistencias en los SRS
├── .github/workflows/
│   └── test.yml             # CI: Vitest + Jest
└── Makefile                 # Comandos de desarrollo y despliegue
```

---

## 12. CÓMO ARRANCAR EN LOCAL

```bash
# Mock server (puerto 3000)
cd mock && npm install && npm run dev

# Frontend (puerto 5173, proxy hacia mock en dev)
cd frontend && npm install && npm run dev

# Tests
cd frontend && npm test
cd mock && npm test
```

El frontend en desarrollo hace proxy de `/api/v1` al mock en `localhost:3000` (configurado en `vite.config.js`).
