# PLAN SPRINT 4 — Perfiles, Instituciones y Onboarding
**Versión:** 1.0
**Fecha:** 2026-04-09
**Base:** PLAN_ACCION v4.3 · decisiones de diseño confirmadas en sesión 2026-04-09

---

## DECISIONES CONFIRMADAS (sesión 2026-04-09)

| Decisión | Detalle |
|---|---|
| `mustChangePassword` | Solo superadmin. Researchers/applicators usan OIDC — campo no existe en su modelo (ya resuelto en Sprint 3). |
| Instituciones | **Solo informativo en esta etapa.** Permiten ver de qué institución viene cada usuario y calcular stats. No afectan control de acceso a proyectos. |
| JWT mínimo | JWT embebe solo `sub` (user_id), `role`, `jti`, `iat`, `exp`. Sacar `full_name` y `email` del token. Pasan a `GET /users/me` → UserContext. |
| Superadmin | **No pasa por terms ni onboarding.** Guard se aplica solo a `researcher` y `applicator`. |
| Institución en onboarding | Campo de texto libre. El sistema normaliza para agrupar perfiles de la misma institución. **No hay selector** (no se expone la lista del sistema al usuario). Si el dominio del correo ya está registrado → campo pre-llenado y deshabilitado. |
| Crear usuario (admin) | Al crear researcher/applicator: verificar estructura del correo y ofrecer preasignación de institución (select de la lista del sistema O automático por dominio). Esta preasignación es opcional para el admin. |
| DetalleUsuarioPage | Componente compartido que reemplaza `DetalleAplicadorPage` y unifica la vista de detalle para cualquier rol. |
| Documentos legales | Dos páginas: `/terminos` (Términos y Condiciones) + `/aviso-privacidad` (Aviso de Privacidad). El `accept-terms` cubre ambos documentos en un solo acto. Links en la página de T&C a aviso de privacidad. |

---

## SITUACIÓN DE PARTIDA

| Área | Estado |
|---|---|
| Campos de perfil en store (`institution_id`, `phone`, `department`, `position`, `accepted_terms`, `profile_complete`) | ❌ No existen |
| Endpoints de perfil (`/users/me`, `/users/me/profile`, `/users/me/accept-terms`) | ❌ No existen |
| Endpoint de config de perfil (`/superadmin/profile-config`) | ❌ No existe |
| Rutas y store de instituciones | ❌ No existen |
| JWT embebe `full_name` y `email` | ⚠️ Debe limpiarse |
| UserContext (perfil cargado desde API) | ❌ No existe — AppLayout decodifica JWT directamente |
| Guards de terms/onboarding en App.jsx | ❌ No existen |
| `OnboardingPage`, `TermsPage`, `PrivacyPage` | ❌ No existen |
| `InstitutionsPage`, `SuperadminProfileConfigPage` | ❌ No existen |
| `DetalleInvestigadorPage` | ❌ No existe — usa `DetalleAplicadorPage` reutilizado |
| Preasignación de institución al crear usuario | ❌ No existe en modal de creación |

---

## DIAGRAMA DE DEPENDENCIAS

```
CF-S4-001 (JWT mínimo + UserContext)
  └─ CF-S4-002 (Mock /users/me + perfil extendido)
       └─ CF-S4-003 (Mock instituciones + normalización)
            ├─ CF-S4-004 (Mock T&C + accept-terms)
            │    └─ CF-S4-006 (Frontend T&C + Aviso privacidad)
            │         └─ CF-S4-007 (Frontend OnboardingPage)
            ├─ CF-S4-005 (Mock profileConfig)
            │    └─ CF-S4-008 (Frontend SuperadminProfileConfigPage)
            └─ CF-S4-009 (Frontend InstitutionsPage)

CF-S4-010 (Frontend DetalleUsuarioPage — componente compartido)  ← independiente
CF-S4-011 (Preasignación institución al crear usuario)           ← depende de CF-S4-003
```

---

## CF-S4-001 — JWT mínimo + UserContext

**Módulo:** M1 | **Depende:** — | **Prioridad:** bloqueante para todo el sprint

### Problema actual

El JWT embebe `full_name` y `email`:
```js
// m1.js actual (dos lugares: login y OIDC callback)
jwt.sign({ user_id, role, full_name, email, jti, iat, exp }, ...)
```

`AppLayout.jsx` los decodifica del token:
```js
function decodeTokenFields(token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  return { fullName: payload.full_name, email: payload.email }
}
```

Esto significa que cualquier cambio de nombre o correo no se refleja hasta que el usuario hace logout+login (el token tiene la versión vieja).

### JWT objetivo

```js
// Solo claims de autenticación
{ sub: user_id, role, jti, iat, exp }
```

### UserContext — nuevo contexto

Crear `frontend/src/contexts/UserContext.jsx`:

```js
// Estado que expone
{
  user: {
    id, full_name, email, role,
    // perfil extendido (null hasta onboarding completo)
    institution_id, institution_name,
    phone, department, position,
    // flags de flujo
    accepted_terms, profile_complete,
  } | null,
  loadingUser: bool,
  reloadUser: () => Promise<void>,   // forzar recarga tras editar perfil
}
```

**Flujo:**
1. Al hacer `login(token)` en AuthContext → UserContext hace `GET /users/me` automáticamente
2. Mientras carga → `loadingUser: true` (App.jsx muestra spinner, no redirige)
3. Resultado → `user` poblado → guards de onboarding pueden evaluarse
4. Al hacer logout → `user = null`

### Cambios en mock

`GET /users/me` — nuevo endpoint:
```
Responde con el usuario del JWT (por `sub`)
Devuelve: id, full_name, email, role, active, institution_id, institution_name,
          phone, department, position, accepted_terms, profile_complete, created_at
```

### Cambios en mock (JWT)

En `m1.js`, ambos `jwt.sign` pasan de:
```js
{ user_id, role, full_name, email, jti, iat, exp }
```
a:
```js
{ sub: user_id, role, jti, iat, exp }
```

Nota: el campo cambia de `user_id` a `sub` (convención OIDC estándar). Actualizar el authMiddleware para leer `decoded.sub` en lugar de `decoded.user_id`.

### Cambios en frontend

- `AuthContext.jsx`: `decodeRole` pasa a leer `decoded.role` (sin cambio). Eliminar lectura de `full_name`/`email` del token.
- `AppLayout.jsx`: eliminar `decodeTokenFields`. `fullName` y `email` vienen de `useUser()` (UserContext).
- `ProfileDropdown`: recibe `fullName` y `email` desde UserContext.
- El `user_id` que algunos componentes usan para construir URLs lo obtienen de `useUser().user.id`.

### Tests

```
mock: GET /users/me sin token → 401
mock: GET /users/me con token válido → 200 { id, full_name, email, role, ... }
mock: JWT emitido en login no contiene full_name ni email (verificar payload)
frontend: AppLayout obtiene fullName desde UserContext, no desde decodeTokenFields
```

---

## CF-S4-002 — Mock: Perfil extendido en modelo de usuario

**Módulo:** M1 | **Depende:** CF-S4-001

### Cambios en store

Cada usuario en `store.users[]` agrega:

```js
{
  // campos actuales...
  institution_id:       null,   // FK a store.institutions (puede ser null)
  institution_name:     null,   // nombre normalizado almacenado (desnormalizado para performance)
  phone:                null,
  department:           null,
  position:             null,
  accepted_terms:       false,
  accepted_terms_at:    null,
  accepted_terms_version: null,
  profile_complete:     false,
}
```

**Superadmin seed**: nace con `accepted_terms: true, profile_complete: true` (exento del flujo).

### Nuevos endpoints en m1.js

**`PATCH /users/me/profile`**
```
Body: { phone?, department?, position?, institution_name? }
- Normaliza institution_name antes de guardar (ver función normalizeInstitution)
- Si institution_name normalizado matchea una institución existente → institution_id asignado
- Si no matchea → institution_id queda null, institution_name guardado tal cual normalizado
- Valida campos requeridos según store.profileConfig para el rol del usuario
- Si todos los campos requeridos tienen valor → profile_complete = true
- Responde: usuario actualizado
```

**`POST /users/me/accept-terms`**
```
Body: { version: "1.0" }
- Idempotente: si ya aceptó, responde 200 sin error
- Actualiza: accepted_terms=true, accepted_terms_at, accepted_terms_version
- Responde: { accepted_terms: true, accepted_at, version }
```

**`GET /users/me`** (ya cubierto en CF-S4-001)

### Función normalizeInstitution (mock util)

```js
function normalizeInstitution(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quitar acentos
    .replace(/[^a-z0-9\s]/g, '')                        // solo alfanumérico
    .replace(/\s+/g, ' ')
    .trim()
}
```

El mock busca en `store.institutions` por `normalized_name === normalizeInstitution(input)`. Si hay match → asigna `institution_id`. Si no → guarda solo el nombre normalizado.

### Tests

```
PATCH /users/me/profile sin token → 401
PATCH /users/me/profile con campo requerido vacío (según profileConfig) → 400
PATCH /users/me/profile válido → 200 { profile_complete: true/false }
PATCH /users/me/profile con institution_name que matchea institución existente → institution_id asignado
PATCH /users/me/profile con institution_name sin match → institution_id null, institution_name guardado normalizado
POST /users/me/accept-terms → 200 { accepted_terms: true }
POST /users/me/accept-terms segunda vez → 200 idempotente
```

---

## CF-S4-003 — Mock: Instituciones

**Módulo:** M1 | **Depende:** CF-S4-001

### Store

```js
institutions: [
  {
    id: 'inst-1',
    name: 'Universidad Nacional de Colombia',
    normalized_name: 'universidad nacional de colombia',
    description: 'Universidad pública nacional',
    public: true,
    domains: ['unal.edu.co'],
    created_at: new Date(),
  },
  {
    id: 'inst-2',
    name: 'Instituto Privado XYZ',
    normalized_name: 'instituto privado xyz',
    description: null,
    public: false,
    domains: [],
    created_at: new Date(),
  },
],
```

### Rutas — `mock/src/routes/institutions.js`

| Endpoint | Roles | Notas |
|---|---|---|
| `GET /institutions` | Todos | Superadmin ve todas; researcher/applicator solo `public:true`. Filtro automático por rol en backend — sin query param. |
| `POST /institutions` | Superadmin | `{ name, description?, public }`. Normaliza nombre al guardar. |
| `PATCH /institutions/:id` | Superadmin | `{ name?, description?, public? }`. Re-normaliza si cambia nombre. |
| `DELETE /institutions/:id` | Superadmin | Verifica que ningún usuario tenga `institution_id` apuntando a ella antes de borrar → 409 si hay dependencias. |
| `POST /institutions/:id/domains` | Superadmin | `{ domain: "univ.edu" }`. Un dominio solo puede pertenecer a una institución → 409 si ya existe. |
| `DELETE /institutions/:id/domains/:domain` | Superadmin | |
| `GET /institutions/resolve?email=X` | Superadmin (al crear usuario) | Busca por dominio del email. Devuelve 404 tanto si no existe como si la institución es privada (no revela existencia). |

### Tests

```
GET /institutions sin token → 401
GET /institutions researcher → solo public:true
GET /institutions superadmin → todas
POST /institutions researcher → 403
POST /institutions superadmin, name válido → 201
POST /institutions/:id/domains, dominio duplicado → 409 DOMAIN_ALREADY_REGISTERED
DELETE /institutions/:id con usuarios dependientes → 409
GET /institutions/resolve?email=nombre@unal.edu.co → 200 { institution_id, institution_name, locked:true }
GET /institutions/resolve?email=nombre@desconocido.com → 404
GET /institutions/resolve sin dominio registrado de institución privada → 404 (no revela)
```

---

## CF-S4-004 — Mock: T&C y accept-terms

**Módulo:** M1 | **Depende:** CF-S4-002

Cubierto parcialmente en CF-S4-002 (`POST /users/me/accept-terms`). Lo adicional:

- Endpoint `GET /legal/terms` → `{ version: "1.0", effective_date: "2026-04-01", content_url: "/terminos" }`
- Endpoint `GET /legal/privacy` → `{ version: "1.0", effective_date: "2026-04-01", content_url: "/aviso-privacidad" }`
- Estos endpoints son públicos (sin token) — los documentos deben ser accesibles antes del login.
- `POST /users/me/accept-terms { version }` — el campo `version` debe coincidir con la versión activa devuelta por `GET /legal/terms`. Si no coincide → 409 VERSION_MISMATCH.

---

## CF-S4-005 — Mock: Configuración de campos de perfil por rol

**Módulo:** M1 | **Depende:** CF-S4-002

### Store

```js
profileConfig: {
  applicator: [
    { field: 'phone',        label: 'Teléfono',      required: false, type: 'text' },
    { field: 'institution_name', label: 'Institución', required: true,  type: 'text' },
    { field: 'department',   label: 'Departamento',  required: false, type: 'text' },
    { field: 'position',     label: 'Cargo',         required: false, type: 'text' },
  ],
  researcher: [
    { field: 'phone',        label: 'Teléfono',      required: false, type: 'text' },
    { field: 'institution_name', label: 'Institución', required: true,  type: 'text' },
    { field: 'department',   label: 'Departamento',  required: true,  type: 'text' },
    { field: 'position',     label: 'Cargo',         required: false, type: 'text' },
  ],
},
```

### Endpoints

```
GET  /superadmin/profile-config → 200 { applicator: [...], researcher: [...] }
PUT  /superadmin/profile-config { applicator: [...], researcher: [...] } → 200
     Validación: cada item debe tener { field, label, required: bool, type: 'text' }
     Solo superadmin.
```

### Tests

```
GET /superadmin/profile-config sin token → 401
GET /superadmin/profile-config researcher → 403
GET /superadmin/profile-config superadmin → 200 config válida
PUT /superadmin/profile-config superadmin → 200 config actualizada
PATCH /users/me/profile con campo requerido vacío (según config activa) → 400
```

---

## CF-S4-006 — Frontend: Términos y Condiciones + Aviso de Privacidad

**Módulo:** M1 | **Depende:** CF-S4-001 (UserContext para saber si ya aceptó)

### Páginas

**`/terminos`** — `TermsPage.jsx`
- Contenido: placeholder estructurado con secciones reales (uso de datos, responsabilidades, etc.)
- Enlace visible a `/aviso-privacidad`
- Botón "Acepto los Términos y el Aviso de Privacidad" → `POST /users/me/accept-terms { version: "1.0" }`
- Tras aceptar → `reloadUser()` → el guard redirige a `/onboarding` (si `profile_complete: false`)

**`/aviso-privacidad`** — `PrivacyPage.jsx`
- Contenido: placeholder sobre tratamiento de datos personales
- Sin botón de aceptación (se acepta desde `/terminos`)
- Accesible también desde el footer del layout (link siempre visible)

### Guard en App.jsx

Orden estricto (solo para `researcher` y `applicator`):

```
1. Sin token                       → /login
2. mustChangePassword (superadmin) → modal (ya existe)
3. loadingUser === true            → <FullPageSpinner /> (no redirigir aún)
4. user.accepted_terms === false   → /terminos
5. user.profile_complete === false → /onboarding
6. Ok                              → contenido normal
```

El guard NO aplica si `role === 'superadmin'`.

### Tests

```
Usuario researcher con accepted_terms:false → redirige a /terminos
/terminos renderiza contenido y botón de aceptación
Click "Acepto" → POST /users/me/accept-terms → reloadUser → redirige a /onboarding
/aviso-privacidad es accesible sin aceptar términos
Superadmin → no redirige a /terminos aunque accepted_terms sea false en el store
```

---

## CF-S4-007 — Frontend: OnboardingPage

**Módulo:** M1 | **Depende:** CF-S4-005 (profileConfig), CF-S4-003 (resolución de dominio), CF-S4-006 (guard)

### Flujo de institución

Al montar la página:

1. `GET /superadmin/profile-config` → construir formulario dinámico según rol
2. Si `user.email` tiene dominio conocido: `GET /institutions/resolve?email=<user.email>`
   - Si 200 → campo institución pre-llenado con `institution_name`, **deshabilitado** (locked)
   - Si 404 → campo institución habilitado como texto libre

### Campo institución (texto libre)

- `<input type="text" placeholder="Ej: Universidad de los Andes">` — sin select ni autocomplete que revele el listado del sistema
- Mensaje de ayuda: *"Escribe el nombre completo de tu institución. El sistema la normalizará para agrupar perfiles similares."*
- Si el email resolvió institución: mostrar nombre pre-cargado con candado y texto *"Tu institución fue detectada automáticamente por tu correo."*

### Submit

`PATCH /users/me/profile` con todos los campos del formulario. Si campos requeridos vacíos → error inline. Tras éxito → `reloadUser()` → guard redirige al home del rol.

### Tests

```
Al montar: GET /superadmin/profile-config + GET /institutions/resolve?email=X
Si resolve 200 → campo institución deshabilitado con valor pre-llenado
Si resolve 404 → campo institución habilitado (texto libre)
Submit con campo requerido vacío → error, sin PATCH
Submit válido → PATCH /users/me/profile → reloadUser → redirect a home
```

---

## CF-S4-008 — Frontend: SuperadminProfileConfigPage

**Módulo:** M1 | **Depende:** CF-S4-005
**Ruta:** `/superadmin/configuracion/perfil` | **Rol:** superadmin

### UI

Dos secciones: "Aplicadores" e "Investigadores". Cada sección lista los 4 campos configurables:

| Campo | Label editable | Toggle Requerido/Opcional |
|---|---|---|
| `phone` | Teléfono | ○ Requerido / ● Opcional |
| `institution_name` | Institución | ● Requerido / ○ Opcional |
| `department` | Departamento | ○ Requerido / ● Opcional |
| `position` | Cargo | ○ Requerido / ● Opcional |

Botón "Guardar" → `PUT /superadmin/profile-config`. Dirty-check antes de habilitar guardar.

**Nota:** No se permiten campos custom en esta etapa. Los 4 campos son fijos; solo se configura su requerimiento y label.

### Tests

```
Render: dos secciones con los 4 campos cada una
Toggle requerido/opcional → botón Guardar habilitado (dirty)
Guardar → PUT /superadmin/profile-config → confirmación visible
Sin cambios → botón Guardar deshabilitado
```

---

## CF-S4-009 — Frontend: InstitutionsPage

**Módulo:** M1 | **Depende:** CF-S4-003
**Ruta:** `/instituciones` | **Rol:** superadmin

### UI

Tabla de instituciones con columnas: Nombre | Dominios | Visibilidad (público/privado) | Usuarios | Acciones.

- "Nueva institución" → modal: nombre, descripción, toggle público/privado
- Fila expandible → lista de dominios con botón "Agregar dominio" y eliminar por dominio
- Toggle público/privado inline → `PATCH /institutions/:id { public: bool }`
- Eliminar institución → confirmación si tiene usuarios dependientes (el mock devuelve 409)
- Columna "Usuarios" → cuenta de usuarios con esa institución (informativo, desde `GET /users?institution_id=X`)

### Servicio

Crear `frontend/src/services/institutions.js`:
```js
listarInstituciones(token)
crearInstitucion(token, body)
actualizarInstitucion(token, id, body)
eliminarInstitucion(token, id)
agregarDominio(token, id, domain)
eliminarDominio(token, id, domain)
resolverInstitucionPorEmail(token, email)
```

### Tests

```
GET /institutions al montar → tabla renderizada
"Nueva institución" → modal → POST /institutions → tabla actualizada
Toggle público → PATCH /institutions/:id → cambio reflejado
Eliminar con usuarios dependientes → 409 → mensaje de error amigable
Agregar dominio duplicado → 409 → mensaje inline
```

---

## CF-S4-010 — Frontend: DetalleUsuarioPage (componente compartido)

**Módulo:** M1 | **Depende:** CF-S4-002 (para mostrar campos de perfil)
**Independiente del resto del sprint.**

### Problema actual

`/usuarios/investigadores/:id` usa `DetalleAplicadorPage` con props `backTo`/`backLabel`. No hay separación real. `DetalleAplicadorPage` fue construido para aplicadores específicamente.

### Solución: componente compartido

Crear `frontend/src/pages/DetalleUsuarioPage.jsx` que reemplaza a ambos.

**Secciones siempre presentes:**
- Datos de cuenta (email, fecha creación, última modificación)
- Sesiones activas
- Acciones (cambiar estado, resetear cuenta/magic link)

**Secciones condicionales por rol:**
- `role === 'researcher'`: "Proyectos como miembro" — lista de proyectos del investigador (consulta `GET /projects` filtrado por miembro)
- `role === 'applicator'`: nada adicional en esta etapa
- Ambos: "Perfil" — muestra institución, teléfono, departamento, posición (campos del onboarding)

### Routing en App.jsx

```js
// Antes
<Route path="/usuarios/aplicadores/:id"    element={adminLayout(<DetalleAplicadorPage />)} />
<Route path="/usuarios/investigadores/:id" element={adminLayout(<DetalleAplicadorPage backTo="..." backLabel="..." />)} />

// Después
<Route path="/usuarios/aplicadores/:id"    element={adminLayout(<DetalleUsuarioPage />)} />
<Route path="/usuarios/investigadores/:id" element={adminLayout(<DetalleUsuarioPage />)} />
```

`DetalleUsuarioPage` detecta el rol del usuario visualizado (no del usuario autenticado) para mostrar las secciones correctas. El `backTo`/`backLabel` se deriva de la URL actual.

### Deprecar DetalleAplicadorPage

Reemplazarlo completamente. No mantener ambos en paralelo.

### Tests

```
/usuarios/aplicadores/:id → renderiza datos de cuenta + sesiones + acciones (sin sección proyectos)
/usuarios/investigadores/:id → renderiza datos de cuenta + sesiones + acciones + proyectos como miembro
Sección "Perfil" → muestra institución si profile_complete, "Perfil incompleto" si no
Desactivar cuenta → PATCH /users/:id/status → estado actualizado
```

---

## CF-S4-011 — Frontend: Preasignación de institución al crear usuario

**Módulo:** M1 | **Depende:** CF-S4-003

### Cambio en GestionAplicadores + GestionInvestigadores

El modal de creación de usuario ya tiene `full_name` + `email`. Se agrega un paso de institución:

**Nuevo campo en el formulario de creación:**

Al perder foco del campo email (o al cambiar), si el email tiene un dominio reconocido:
- Hacer `GET /institutions/resolve?email=X`
- Si 200 → mostrar chip/badge: *"Institución detectada: Universidad Nacional"* con botón "Cambiar"
- Si 404 → mostrar selector de institución con dos opciones:

```
○ Sin institución asignada (predeterminado)
○ Asignar manualmente:
     ○ Por correo (detectar automáticamente cuando el usuario active su cuenta)
     ● Seleccionar de la lista: [select con todas las instituciones]
```

**Al guardar (`POST /users`):**
- Si se eligió institución → el body incluye `institution_id`
- Si dominio detectado automáticamente → el body incluye `institution_id` del resolve
- Si sin institución → no se incluye `institution_id` (el usuario la completará en onboarding)

### Cambio en mock `POST /users`

Aceptar `institution_id` opcional. Si se incluye → guardar en el usuario creado y marcar `institution_name` con el nombre de la institución.

### Tests

```
POST /users con institution_id → usuario creado con institution_id asignado
POST /users sin institution_id → usuario creado con institution_id: null
Frontend: email con dominio registrado → chip de institución detectada
Frontend: email sin dominio → selector de asignación manual
Frontend: "Sin institución" seleccionado → POST sin institution_id
```

---

## CAMBIOS EN NAVEGACIÓN (AppLayout)

Agregar al sidebar de superadmin:

```js
{
  id: 'configuracion',
  label: 'CONFIGURACIÓN',
  items: [
    { label: 'Instituciones',       icon: Building2, to: '/instituciones' },
    { label: 'Config. de perfiles', icon: Settings,  to: '/superadmin/configuracion/perfil' },
  ],
}
```

Agregar al footer del layout (visible para todos los roles):
- Link "Aviso de privacidad" → `/aviso-privacidad`

---

## RESUMEN DE ARCHIVOS NUEVOS

### Mock

| Archivo | Descripción |
|---|---|
| `mock/src/routes/institutions.js` | CRUD instituciones + dominios + resolve |
| `mock/src/__tests__/routes/institutions.test.js` | Tests completos |

### Mock — modificaciones

| Archivo | Cambio |
|---|---|
| `mock/src/store/index.js` | Agregar `institutions[]`, `profileConfig`, campos de perfil en usuarios |
| `mock/src/routes/m1.js` | JWT mínimo, `GET /users/me`, `PATCH /users/me/profile`, `POST /users/me/accept-terms`, `GET /superadmin/profile-config`, `PUT /superadmin/profile-config`, `POST /users` acepta `institution_id` |
| `mock/src/index.js` | Registrar router de instituciones |

### Frontend — nuevas páginas

| Archivo | Ruta | Roles |
|---|---|---|
| `frontend/src/pages/TermsPage.jsx` | `/terminos` | Todos (pre-auth o post-login sin aceptar) |
| `frontend/src/pages/PrivacyPage.jsx` | `/aviso-privacidad` | Público |
| `frontend/src/pages/OnboardingPage.jsx` | `/onboarding` | researcher, applicator |
| `frontend/src/pages/SuperadminProfileConfigPage.jsx` | `/superadmin/configuracion/perfil` | superadmin |
| `frontend/src/pages/InstitutionsPage.jsx` | `/instituciones` | superadmin |
| `frontend/src/pages/DetalleUsuarioPage.jsx` | `/usuarios/aplicadores/:id`, `/usuarios/investigadores/:id` | superadmin |

### Frontend — nuevos contextos y servicios

| Archivo | Descripción |
|---|---|
| `frontend/src/contexts/UserContext.jsx` | Perfil completo desde `GET /users/me`; guards de onboarding |
| `frontend/src/services/institutions.js` | CRUD instituciones |

### Frontend — modificaciones

| Archivo | Cambio |
|---|---|
| `mock/src/routes/m1.js` | JWT sin `full_name`/`email` |
| `frontend/src/contexts/AuthContext.jsx` | Integra UserContext o dispara carga de perfil al login |
| `frontend/src/layouts/AppLayout.jsx` | Lee `fullName`/`email` de UserContext; agrega nav items; link privacidad en footer |
| `frontend/src/App.jsx` | Guards de terms/onboarding; rutas nuevas; reemplaza DetalleAplicadorPage por DetalleUsuarioPage |
| `frontend/src/pages/GestionAplicadores.jsx` | Preasignación institución en modal creación |
| `frontend/src/pages/GestionInvestigadores.jsx` | Ídem |
| `frontend/src/test/handlers.js` | Handlers MSW para /users/me, /institutions, profileConfig, accept-terms |

---

## ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
Semana 1:
  CF-S4-001 (JWT mínimo + UserContext)          ← base de todo
  CF-S4-002 (Mock perfil extendido + /users/me)
  CF-S4-003 (Mock instituciones)

Semana 2:
  CF-S4-004 (Mock T&C + accept-terms)
  CF-S4-005 (Mock profileConfig)
  CF-S4-006 (Frontend T&C + privacidad + guards)

Semana 3:
  CF-S4-007 (Frontend OnboardingPage)
  CF-S4-008 (Frontend SuperadminProfileConfigPage)
  CF-S4-009 (Frontend InstitutionsPage)

Semana 4:
  CF-S4-010 (DetalleUsuarioPage compartido)
  CF-S4-011 (Preasignación institución en crear usuario)
  Tests de integración + MSW handlers
```

---

## CRITERIO DE CIERRE DEL SPRINT

- [ ] Un researcher recién creado: activa cuenta → ve T&C → acepta → completa onboarding → llega a su home
- [ ] El superadmin no ve T&C ni onboarding en ningún momento
- [ ] Un researcher cuyo email matchea `unal.edu.co` ve la institución pre-llenada en onboarding (deshabilitada)
- [ ] El superadmin puede configurar qué campos son requeridos en el onboarding por rol
- [ ] El superadmin puede crear instituciones, gestionar dominios, ver cuántos usuarios tienen cada institución
- [ ] Al crear un usuario, el admin puede preasignar institución (por select o por dominio del correo)
- [ ] `/usuarios/investigadores/:id` y `/usuarios/aplicadores/:id` usan `DetalleUsuarioPage`; el investigador muestra sus proyectos como miembro
- [ ] JWT emitido no contiene `full_name` ni `email`
- [ ] `GET /users/me` devuelve perfil completo incluyendo institución y flags de onboarding
- [ ] Tests verdes en mock e integración frontend
