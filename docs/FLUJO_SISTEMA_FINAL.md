# FLUJO DEL SISTEMA — methodology-core
**Versión:** 1.0
**Fecha:** 2026-04-07
**Propósito:** Referencia definitiva del comportamiento del sistema una vez implementado el plan v4.0.
Un agente o equipo que lea este documento debe poder entender quién puede hacer qué, cómo ingresa, y por qué flujo pasa.

---

## 1. ROLES Y PERMISOS

| Rol | Cómo accede | Creado por | Acceso |
|-----|-------------|------------|--------|
| `superadmin` | Email + password en ruta de sistema (no listada, no enlazada desde la app) | Precargado en sistema | Total: usuarios, proyectos, instituciones, config de perfil, datos completos, logs, audit |
| `researcher` | OIDC (magic link de activación) | SUPERADMIN | Datos anónimos completos de sus proyectos (ver + exportar), instrumentos en lectura |
| `applicator` | OIDC (magic link de activación) | SUPERADMIN | Wizard de registro operativo, sus propios registros |

> **Nota:** El rol `administrator` NO existe en esta etapa. El rol actual en el código se renombra a `superadmin` (tarea CF-031). Un rol `admin` con permisos acotados (sin acceso a datos explícitos, solo estadísticas agregadas) se diseñará en una etapa futura.

### Matriz de acceso a páginas

| Página | SUPERADMIN | Researcher | Applicator |
|--------|-----------|------------|------------|
| `/login` | ❌ (no usa esta ruta) | ✅ (OIDC) | ✅ (OIDC) |
| `/<ruta-sistema>` | ✅ (password) | ❌ | ❌ |
| `/terminos` | — | ✅ | ✅ |
| `/onboarding` | — | ✅ | ✅ |
| `/usuarios/aplicadores` | ✅ | ❌ | ❌ |
| `/usuarios/investigadores` | ✅ | ❌ | ❌ |
| `/usuarios/aplicadores/:id` | ✅ | ❌ | ❌ |
| `/usuarios/investigadores/:id` | ✅ | ❌ | ❌ |
| `/proyectos` | ✅ | ❌ | ❌ |
| `/proyectos/:id` | ✅ | ❌ | ❌ |
| `/instrumentos` | ✅ (lectura+escritura) | ✅ (lectura) | ❌ |
| `/instrumentos/:id` | ✅ (lectura+escritura) | ✅ (lectura) | ❌ |
| `/instituciones` | ✅ | ❌ | ❌ |
| `/superadmin/configuracion/perfil` | ✅ | ❌ | ❌ |
| `/admin/logs` | ✅ | ❌ | ❌ |
| `/registro-operativo` | ❌ | ❌ | ✅ |
| `/mis-registros` | ❌ | ❌ | ✅ |
| `/registros` | ✅ (datos completos) | ✅ (datos anónimos del proyecto) | ❌ |
| `/exportar` | ✅ | ✅ | ❌ |
| `/forbidden` | — | — | — |

**Regla:** Cualquier intento de acceder a una ruta sin el rol correspondiente redirige a `/forbidden` con mensaje explícito. Nunca es silencioso.

---

## 2. FLUJO DE ACCESO AL SISTEMA

### 2.1 SUPERADMIN — acceso con password (ruta de sistema)

```
La ruta de acceso del SUPERADMIN NO es /login ni ninguna variante obvia.
Es una ruta no listada, no enlazada, y no referenciada en el código visible del bundle.
La ruta exacta se configura en una variable de entorno del servidor.

1. SUPERADMIN navega directamente a /<ruta-sistema> (conocida solo por el equipo)
2. Página muestra SOLO formulario email + password (sin mención de OIDC)
3. POST /auth/login → respuesta genérica tanto si las credenciales son incorrectas
   como si el usuario no existe → mismo 401 INVALID_CREDENTIALS (anti-enumeración)
4. Si las credenciales son correctas Y el rol es superadmin → JWT
5. Redirige a /superadmin/home
   No pasa por términos ni onboarding

Zero Trust aplicado:
- El backend verifica role === 'superadmin'. Un admin normal que encuentre la URL y
  use sus credenciales recibe el mismo 401 que si no existiera.
- Rate limiting: 5 intentos fallidos → bloqueo 15 min por IP.
- Sesión de SUPERADMIN: access token 15 min; refresh token no se emite
  (SUPERADMIN debe re-autenticar para cada sesión).
```

### 2.2 Administrator / Researcher / Applicator — primer acceso

```
1. SUPERADMIN o Administrator crea el usuario (desde la página pertinente)
   → Sistema genera magic link automáticamente
   → (En producción) se envía al email del usuario
   → (En mock) el link aparece en CredencialesModal para testing

2. Usuario hace click en el magic link → /setup?token=...
   → GET /auth/activate/:token
   → Si token válido: cuenta activada, se vincula broker_subject en Keycloak
   → JWT de sesión devuelto → usuario queda autenticado
   → Si token expirado (48h) o ya usado → mensaje de error + instrucción de contactar admin

3. Primera vez: flujo de primer ingreso (ver sección 3)
```

### 2.3 Accesos posteriores (usuarios ya activados)

```
1. /login → botón "Iniciar sesión con cuenta institucional"
2. Redirect a Keycloak/OIDC
3. Keycloak autentica → callback /auth/callback con token
4. AuthContext guarda el token y el usuario decodificado
5. Evaluación de guards:
   ¿accepted_terms === false? → /terminos
   ¿profile_complete === false? → /onboarding
   ¿must_change_email === true? → modal CambiarCorreoModal (forzado)
   → home del rol
```

---

## 3. FLUJO DE PRIMER INGRESO (todos los roles excepto SUPERADMIN)

```
Activación → Login OIDC → Guards en orden:

┌─────────────────────────────────────────────┐
│  ¿Aceptó términos?                          │
│  NO → /terminos                             │
│       Muestra texto genérico de T&C         │
│       Botón "Acepto los términos"           │
│       POST /users/me/accept-terms           │
│       Confirmación registrada con:          │
│         user_id, version, accepted_at       │
│       → sigue al siguiente guard            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  ¿Perfil completo?                          │
│  NO → /onboarding                           │
│       Formulario dinámico según rol:        │
│       - Campos configurados por SUPERADMIN  │
│       - Cada campo: requerido u opcional    │
│                                             │
│       Institución:                          │
│       - Email resuelve dominio → institución│
│         pre-asignada, campo deshabilitado   │
│       - Sin coincidencia → selector de      │
│         instituciones PÚBLICAS únicamente   │
│                                             │
│       Submit → PATCH /users/me/profile      │
│       profile_complete: true                │
│       → sigue                               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  ¿must_change_email?                        │
│  SÍ → CambiarCorreoModal forzado            │
│       No puede cerrarse                     │
│       PATCH /users/:id/email                │
│       → sigue                               │
└─────────────────────────────────────────────┘
                    ↓
         Home del rol + Guide Tour automático
         (solo primera vez; localStorage por userId+role)
```

---

## 4. FLUJO SUPERADMIN

### 4.1 Configuración de campos de perfil por rol

```
/superadmin/configuracion/perfil
├── Sección "Aplicadores": lista de campos configurables
│   Campo: phone | Tipo: phone | Requerido: sí/no
│   Campo: department | Tipo: text | Requerido: sí/no
│   Campo: position | Tipo: text | Requerido: sí/no
│   Campo: institution_id | Tipo: select | Requerido: sí/no
│   (otros campos custom que SUPERADMIN agregue)
│
├── Sección "Investigadores": igual
│
└── Guardar → PUT /superadmin/profile-config
    Todos los onboardings futuros usan esta config
    Los ya completados no se ven afectados
```

### 4.2 Gestión de instituciones

```
/instituciones
├── Lista de todas las instituciones (públicas y privadas)
├── Crear institución:
│   nombre, descripción, público: sí/no
│
├── Detalle de institución:
│   ├── Agregar dominio: @universidad.edu
│   │   → usuarios con ese email se auto-asignan en onboarding
│   │   → no pueden cambiar su institución (locked)
│   └── Toggle público/privado
│       privado: usuarios no lo ven en onboarding
│       público: aparece en el selector de onboarding
```

---

## 5. FLUJO ADMINISTRATOR

### 5.1 Crear usuario

```
/usuarios/aplicadores o /usuarios/investigadores
→ "Nuevo usuario" → modal con: nombre completo, email, rol
→ POST /users
→ Sistema genera magic link (en mock: aparece en CredencialesModal)
→ (Producción) link enviado automáticamente al email del usuario
→ Usuario aparece en lista con estado PENDING hasta que active la cuenta
```

### 5.2 Gestión de proyectos

```
/proyectos
└── Lista de proyectos: nombre, número de miembros, número de instrumentos, estado

/proyectos/:id  (4 tabs)
├── Tab "General":
│   Nombre, descripción, fecha de inicio/fin
│   Editar → PATCH /projects/:id
│
├── Tab "Miembros":
│   Lista actual de miembros con rol e institución
│   "Agregar miembro":
│     └── Buscador de usuarios existentes
│         Filtros: rol (investigador/aplicador), institución, nombre
│         → seleccionar usuario → elegir rol en proyecto
│         → POST /projects/:id/members { user_id, role }
│   Un usuario puede estar en múltiples proyectos
│   Eliminar miembro → DELETE /projects/:id/members/:user_id
│
├── Tab "Instrumentos":
│   Instrumentos asignados al proyecto
│   "Asignar instrumento":
│     └── Selector de instrumentos globales (activos)
│         → POST /projects/:id/instruments { instrument_id }
│   Quitar instrumento → DELETE /projects/:id/instruments/:id
│
└── Tab "Configuración Operativa":
    education_levels disponibles para este proyecto
    age_cohort_ranges disponibles
    subject_limit (límite de sujetos por aplicador)
    mode (normal / extended)
    → PUT /projects/:id/config/operativo
```

### 5.3 Gestión de instrumentos

```
/instrumentos
├── Lista con filtro activo/inactivo, búsqueda por nombre, filtro por tag
├── Crear instrumento:
│   nombre, descripción metodológica, fecha inicio, fecha fin
│   tags: chips de texto libre
│   días mínimos entre aplicaciones: número (default 15, 0 = sin restricción)
│   → POST /instruments
├── Activar/Desactivar → PATCH /instruments/:id/status { is_active: boolean }
├── Editar → PATCH /instruments/:id
└── Eliminar → DELETE /instruments/:id

/instrumentos/:id
├── Datos del instrumento (incluye tags y min_days)
└── Métricas: crear, editar, eliminar
    POST /instruments/:id/metrics
    Tipos: numeric | categorical | boolean | short_text
    Propiedades: name, required, min_value, max_value (para numeric), options (para categorical)
```

### 5.4 Audit logs

```
/admin/logs
├── Tabla con: timestamp, usuario, evento, detalle
├── Filtro por: usuario, tipo de evento, rango de fechas
└── Tipos de evento registrados:
    login, logout, create_user, update_user_status,
    create_project, update_project, create_instrument,
    update_instrument_status, accept_terms, complete_profile,
    export_data, reset_account
```

---

## 6. FLUJO APPLICATOR

### 6.1 Wizard de Registro Operativo (flujo completo)

```
/registro-operativo

╔═══════════════════════════════════════════╗
║  PASO 0: Seleccionar Proyecto             ║
║                                           ║
║  Lista de proyectos del aplicador         ║
║  (GET /projects — solo sus proyectos)     ║
║                                           ║
║  Sin selección → "Siguiente" deshabilitado║
║  Selección → carga config operativa del  ║
║  proyecto (GET /projects/:id/config/      ║
║  operativo) para usar en pasos siguientes ║
╚═══════════════════════════════════════════╝
                    ↓
╔═══════════════════════════════════════════╗
║  PASO 1: Sujeto                           ║
║                                           ║
║  ¿Tiene sujetos previos en este proyecto? ║
║  (GET /projects/:id/subjects/mine)        ║
║                                           ║
║  SÍ: muestra dos opciones                ║
║  ┌──────────────────────────────────────┐ ║
║  │ ◉ Nuevo sujeto                       │ ║
║  │ ○ Sujeto existente                   │ ║
║  └──────────────────────────────────────┘ ║
║                                           ║
║  NO: solo "Nuevo sujeto" (sin toggle)    ║
╚═══════════════════════════════════════════╝
```

**Rama: Nuevo sujeto**
```
PASO 1a: Crear sujeto
  POST /projects/:id/subjects
  → anonymous_code generado por el backend

PASO 2: Registrar contexto
  school_type, education_level (de config del proyecto)
  age_cohort (regex ^\d+-\d+$, de config del proyecto)
  gender, socioeconomic_level, additional_attributes
  POST /projects/:id/subjects/:sid/context

  [Si retrocede desde Paso 3 y edita algo → re-envía PATCH]
  [Si retrocede sin editar → no hace request]

PASO 3: Seleccionar instrumento
  GET /instruments?is_active=true
  (Solo instrumentos activos asignados al proyecto)

PASO 4: Capturar métricas
  POST /projects/:id/applications { subject_id, instrument_id }
  POST /projects/:id/applications/:aid/metric-values { values: [{metric_id, value}] }

  [Si metric-values falla → error visible + "Reintentar"]
  [La aplicación no se pierde; se puede reintentar]

→ Confirmación + opción de registrar otro sujeto
```

**Rama: Sujeto existente**
```
PASO 1b: Seleccionar sujeto
  Selector con anonymous_codes previos del aplicador en este proyecto
  Al seleccionar: muestra historial de instrumentos aplicados

  Para cada instrumento:
  ┌──────────────────────────────────────────────┐
  │ 🔬 Instrumento X              ✅ Disponible  │
  │    Última aplicación: 20 mar 2026            │
  │    Días desde última: 18 días (mín. 15)      │
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │ 🔬 Instrumento Y           🔒 No disponible  │
  │    Última aplicación: 05 abr 2026            │
  │    Disponible a partir de: 20 abr 2026       │
  └──────────────────────────────────────────────┘

  Solo se puede seleccionar un instrumento disponible

PASO 2: Contexto pre-cargado del sujeto (editable)
  Si algo cambió (ej. nuevo nivel educativo) → actualiza contexto
  → PATCH /projects/:id/subjects/:sid/context

PASO 3: Instrumento ya seleccionado (pre-llenado desde Paso 1b)
  [El aplicador puede cambiarlo por otro disponible]

PASO 4: Capturar métricas (igual que rama nueva)
```

### 6.2 Mis Registros

```
/mis-registros
├── GET /applications/my?page=1&page_size=20
├── Filtros: instrumento, fecha desde, fecha hasta
│   Cada cambio → nueva request con params actualizados
├── Paginación server-side (nunca carga todo en memoria)
└── Cada fila: fecha, proyecto, instrumento, código anónimo del sujeto
```

---

## 7. FLUJO RESEARCHER

El researcher es el consumidor principal de datos. Puede ver y exportar los datos completos de los proyectos donde es miembro. Los datos son siempre anónimos (anonymous_code, nunca PII).

### 7.1 Consulta de registros (M5)

```
/registros
├── GET /applications?page=1&page_size=20
│   Backend filtra por proyectos donde el researcher es miembro
│   Un researcher no puede ver aplicaciones de proyectos ajenos
│
├── Filtros opcionales:
│   - Proyecto (GET /projects devuelve solo los suyos)
│   - Instrumento
│   - Rango de fechas
│
├── Paginación server-side
│
└── Vista de cada aplicación incluye:
    anonymous_code del sujeto, instrument_name, application_date,
    valores de cada métrica (nombre + valor), project_name
    — nunca nombre del aplicador, nunca datos del evaluado más allá del código anónimo
```

### 7.2 Exportación de datos (M6)

```
/exportar
├── Selector de proyecto — OBLIGATORIO
│   Sin proyecto: botones deshabilitados + "Selecciona un proyecto"
│   Lista: solo proyectos donde el researcher es miembro
│
├── Filtros opcionales: instrumento, rango de fechas
│
├── "Exportar CSV" → GET /export/csv?project_id=X&...
│   CSV incluye: anonymous_code, application_date, instrument_name, [métrica1], [métrica2], ...
│   Sin columnas de PII
│   → descarga automática + entrada en audit log
│
└── "Exportar JSON" → GET /export/json?project_id=X&...
    Misma información que CSV, formato JSON
    → descarga automática + entrada en audit log
```

---

## 8. PRIMER INGRESO CON GUIDE TOUR

Después de completar el onboarding, el sistema activa el guide tour automáticamente una sola vez.

**Tour del Aplicador:**
1. "Aquí seleccionas el proyecto en el que trabajarás hoy"
2. "Registras cada sujeto de forma anónima — el sistema genera un código único"
3. "Registras el contexto del sujeto (nivel educativo, cohorte de edad)"
4. "Seleccionas el instrumento y capturas las métricas"
5. "En Mis Registros puedes ver el historial completo de tus registros"

**Tour del Investigador:**
1. "En Registros puedes ver todas las aplicaciones de tus proyectos"
2. "Usa los filtros para buscar por instrumento o fecha"
3. "En Exportar puedes descargar los datos para análisis externo"
4. "La exportación siempre es por proyecto — selecciónalo antes de descargar"

**Relanzar tour:** botón "Guía de uso" visible en la barra de navegación principal (texto explícito, no icono).

**Persistencia:** `localStorage["guide_tour_completed_<userId>_<role>"] = true`
Una vez completado o descartado, no vuelve a aparecer automáticamente.

---

## 9. ACCESO NO AUTORIZADO

```
Cualquier intento de acceder a una ruta sin el rol correcto:
→ redirect a /forbidden

/forbidden muestra:
├── Mensaje: "No tienes permiso para acceder a esta sección"
├── Rol del usuario actual: "Tu rol: Aplicador"
├── Rol requerido (si aplica): "Esta sección requiere: Administrador"
├── Botón "Volver" → regresa a la última ruta válida
└── Contacto de soporte

Esto aplica también a:
- Intentos de acceder a rutas de admin desde rol researcher/applicator
- Intentos de acceder a rutas de applicator desde admin/researcher
- Acceso a rutas de superadmin desde cualquier otro rol
```

---

## 10. MAPA COMPLETO DE PÁGINAS Y RUTAS

```
PÚBLICAS
  /login                   LoginPage
  /setup?token=...         SetupPage (activación via magic link)
  /auth/callback           AuthCallbackPage (retorno de OIDC)
  /forbidden               ForbiddenPage

PRIMER INGRESO (autenticado)
  /terminos                TermsPage
  /onboarding              OnboardingPage

SUPERADMIN
  /superadmin/configuracion/perfil    SuperadminProfileConfigPage

SUPERADMIN únicamente
  /usuarios/aplicadores               GestionUsuarios (role=applicator)
  /usuarios/investigadores            GestionUsuarios (role=researcher)
  /usuarios/aplicadores/:id           DetalleAplicadorPage
  /usuarios/investigadores/:id        DetalleInvestigadorPage
  /proyectos                          ProjectsPage
  /proyectos/:id                      ProjectDetailPage (tabs: General | Miembros | Instrumentos | Config Operativa)
  /instrumentos                       GestionInstrumentos (CRUD completo)
  /instrumentos/:id                   InstrumentoDetallePage (CRUD completo)
  /instituciones                      InstitutionsPage
  /superadmin/configuracion/perfil    SuperadminProfileConfigPage
  /admin/logs                         AuditLogsPage
  /registros                          ApplicationsPage (datos completos)
  /exportar                           ExportPage

RESEARCHER + SUPERADMIN
  /instrumentos                       GestionInstrumentos (solo lectura para researcher)
  /instrumentos/:id                   InstrumentoDetallePage (solo lectura para researcher)
  /registros                          ApplicationsPage (researcher: solo sus proyectos, datos anónimos)
  /exportar                           ExportPage (researcher: por proyecto obligatorio)

APPLICATOR
  /registro-operativo                 RegistroOperativoWizardPage
  /mis-registros                      MisRegistrosPage
```

---

## 11. PRINCIPIOS DE SEGURIDAD Y PRIVACIDAD

### Zero Trust — reglas activas en el sistema

| Regla | Cómo se aplica |
|-------|----------------|
| Verificar siempre, confiar nunca | El backend valida JWT + rol en cada request. Si el frontend omite un guard, el API rechaza igual. |
| Ruta de SUPERADMIN no descubrible | No aparece en ningún enlace, sitemap, ni código del bundle público. Configurable por env var. |
| Tokens de corta vida | Access token: 15 min. Refresh token: 24h para usuarios OIDC. SUPERADMIN no tiene refresh token. |
| Anti-enumeración | Login devuelve siempre 401 INVALID_CREDENTIALS — sin distinguir "usuario no existe" de "contraseña incorrecta". |
| Anti-CSRF | El flujo OIDC usa parámetro `state` verificado en el callback. |
| Rate limiting | 5 intentos fallidos en login de sistema → bloqueo 15 min por IP. |
| Revocación de sesión | POST /auth/logout invalida el JTI. Tokens revocados reciben 401 en cualquier endpoint. |
| Membresía verificada en API | `GET /applications` filtra en el backend según proyectos del usuario. El frontend no puede bypassear esto. |
| Instituciones privadas opacas | Un usuario sin privilegios que consulta `/institutions` no sabe que existen instituciones privadas. |

### Privacy by Design — reglas activas en el sistema

| Regla | Cómo se aplica |
|-------|----------------|
| Sujetos 100% anónimos | `anonymous_code` generado por el backend. El aplicador nunca introduce un identificador propio. |
| Códigos no correlacionables | El mismo sujeto en dos proyectos tiene dos `anonymous_code` distintos. No son relacionables. |
| Minimización en exports | CSV/JSON contiene: anonymous_code, métricas, fecha. Nunca nombre, email ni datos del aplicador. |
| Campos opcionales realmente opcionales | Backend acepta `null` para campos configurados como opcionales. No se impone completitud. |
| Exportaciones auditadas | Cada `GET /export/*` genera entrada en audit log (quién, proyecto, filtros, timestamp). |
| Errores que no filtran información | Mensajes genéricos en auth. Instituciones privadas no reveladas. Sujetos de otros proyectos no consultables. |

---

## 12. FLUJOS DE ERROR Y CASOS BORDE

| Situación | Comportamiento |
|-----------|---------------|
| Magic link expirado (>48h) | SetupPage muestra error + "Contacta a tu administrador para obtener un nuevo enlace" |
| Magic link ya usado | Mismo mensaje que expirado |
| Sesión expirada navegando | Redirect a /login; al volver a autenticarse, intenta retomar la ruta anterior |
| Instrumento bloqueado por gap | Aparece deshabilitado en wizard con fecha de próxima disponibilidad. No da error en el back. |
| Export sin project_id | Mock retorna 400 PROJECT_ID_REQUIRED; frontend no permite llegar a este estado (botones deshabilitados) |
| POST /metric-values falla | Wizard muestra error + "Reintentar". La aplicación queda en estado parcial pero no se pierde. |
| Rol no tiene acceso a ruta | /forbidden con mensaje explícito. |
| Usuario intenta cambiar institución bloqueada por dominio | Error INSTITUTION_LOCKED_BY_DOMAIN con explicación "Tu institución fue asignada por el dominio de tu correo" |
| Onboarding con campo requerido vacío | Validación client-side antes del PATCH. No llega al backend. |
| Crear usuario con email duplicado | POST /users → 409 EMAIL_ALREADY_EXISTS |
| Token expirado durante sesión activa | Request → 401; AuthContext detecta → redirect a /login con mensaje "Sesión expirada" |
| Admin intenta acceder a ruta de SUPERADMIN | Mismo 403/404 que cualquier usuario no autorizado. No revela que la ruta existe para SUPERADMIN. |
| Request a endpoint protegido sin JWT | 401 — igual que token inválido. No distingue ausente de inválido. |
| Researcher intenta exportar sin seleccionar proyecto | Botones deshabilitados en UI; si llega al API → 400 PROJECT_ID_REQUIRED |
| Applicator intenta GET /applications (no es su ruta) | 403 en API + redirect a /forbidden en frontend |

---

*Documento generado: 2026-04-07 — Actualizar ante cualquier cambio arquitectónico*
