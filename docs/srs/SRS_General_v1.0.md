# SRS – Sistema de Registro Metodológico de Métricas Lingüísticas

## Software Requirements Specification — Documento General del Sistema

**Versión:** 1.0 · **Fecha:** 2026-03-12 · **Estado:** Borrador

---

## Tabla de Contenido

1. [Introducción](#1-introducción)
2. [Contexto del Sistema](#2-contexto-del-sistema)
3. [Stakeholders y Usuarios](#3-stakeholders-y-usuarios)
4. [Alcance del Sistema](#4-alcance-del-sistema)
5. [Requisitos No Funcionales Transversales](#5-requisitos-no-funcionales-transversales)
6. [Modelo de Datos Global](#6-modelo-de-datos-global)
7. [Interfaces Externas](#7-interfaces-externas)
8. [Restricciones y Supuestos](#8-restricciones-y-supuestos)
9. [Criterios de Aceptación del Sistema](#9-criterios-de-aceptación-del-sistema)
10. [Estrategia de Despliegue](#10-estrategia-de-despliegue)
11. [Trazabilidad de Requisitos](#11-trazabilidad-de-requisitos)

---

## 1. Introducción

### 1.1 Propósito

Este documento es la especificación de requisitos de alto nivel del **Sistema de Registro Metodológico de Métricas Lingüísticas**. Define el contexto del proyecto, la visión de largo plazo, la arquitectura modular, los requisitos no funcionales que aplican a todos los módulos y los criterios de aceptación globales del sistema.

Este documento **no entra en detalle por módulo**. Cada módulo tiene su propio SRS específico que lo desarrolla en su totalidad. El presente documento sirve como:

- Marco de referencia para entender el sistema como un todo.
- Fuente de contratos e interfaces entre módulos.
- Definición de los requisitos no funcionales transversales que ningún módulo puede relajar.
- Guía de arquitectura y estrategia de despliegue.

El documento está dirigido a desarrolladores, testers, investigadores y stakeholders del proyecto.

### 1.2 Alcance del Documento

Este SRS cubre el sistema completo en sus dos fases de desarrollo:

**Fase 1 — Módulos 1–4 (construcción del dataset):**
Autenticación, gestión de instrumentos, definición de métricas y registro operativo anonimizado.

**Fase 2 — Módulos 5–6 (acceso y extracción del dataset):**
Consulta interna paginada con filtros y exportación estructurada en CSV y JSON.

Queda fuera del alcance de este documento todo lo relativo a fases posteriores: análisis estadístico, perfiles lingüísticos, modelos LLM y cualquier componente de inteligencia artificial.

### 1.3 Definiciones y Glosario

| Término | Definición |
|---|---|
| **Instrumento metodológico** | Prueba estandarizada utilizada para evaluar métricas lingüísticas en un sujeto, conforme a un marco metodológico definido. |
| **Métrica lingüística** | Variable cuantitativa o cualitativa que representa un aspecto del desarrollo lingüístico de un sujeto. |
| **Sujeto** | Persona evaluada, registrada exclusivamente mediante UUID. Sin datos personales identificables. |
| **Aplicación** | Evento de administración de un instrumento a un sujeto con captura de valores de métricas. |
| **Dataset** | Base de datos estructurada generada por este sistema; insumo para fases científicas posteriores. |
| **Anonimización** | La identidad de los sujetos no puede derivarse de los datos almacenados. |
| **Minimización** | Solo se registran los datos estrictamente necesarios para el fin metodológico. |
| **Separación de identidad** | Los datos identificativos de un sujeto se mantienen desvinculados de sus datos lingüísticos. |
| **UUID** | Identificador único universal utilizado para registrar sujetos anónimamente. |
| **user_id (UUID)** | Identificador único e inmutable que representa la identidad real del usuario en el sistema. Se genera al crear el usuario y nunca cambia. Es la fuente de verdad para todas las referencias al usuario en tablas internas (audit_log, etc.). |
| **UID interno** | Identificador local del usuario, vinculado al subject de Keycloak. Se usa para referenciar usuarios en tablas locales sin exponer el identificador externo del broker. |
| **Keycloak** | Proveedor de identidad externo (broker) que implementa el modelo de autenticación. Gestiona usuarios, sesiones y políticas de contraseña. El sistema delega autenticación a Keycloak. |
| **Broker de identidad** | Componente externo (Keycloak) que gestiona la autenticación de usuarios. El backend es la fuente de verdad; el broker solo autentica. |
| **Magic Link** | Enlace de un solo uso enviado al correo del usuario para verificar su identidad y completar el registro. Se almacena como hash con expiración. |
| **Separación identidad/autenticación** | El user_id es inmutable y representa la identidad real del usuario. El correo es un atributo de autenticación que puede cambiar. Cambio de correo ≠ cambio de usuario. |
| **MetricType** | Enumeración de tipos válidos para una métrica: `numeric`, `categorical`, `boolean`, `short_text`. |
| **JWT** | JSON Web Token. Mecanismo para generar y validar tokens de sesión. |
| **Access Token** | JWT de sesión única (6 h / 21 600 s) usado para autenticar todas las peticiones al API. La sesión termina por vencimiento natural, logout explícito o desactivación del usuario por el SUPERADMIN. |
| **PEP** | Policy Enforcement Point. Middleware que intercepta toda solicitud antes de ejecutar lógica de negocio. |
| **PA** | Policy Administrator. Evalúa token, rol y estado activo en cada petición. |
| **PE** | Policy Engine. Lógica centralizada de validación JWT y verificación de permisos. |
| **DoD** | Definition of Done. Criterios que determinan cuándo una historia de usuario está terminada. |
| **PII** | Personally Identifiable Information. Dato que permite identificar a una persona. |
| **audit_log** | Registro de eventos de sesión y seguridad del sistema. |
| **RF / RNF** | Requisito Funcional / Requisito No Funcional. |

### 1.4 Referencias

| Documento | Descripción |
| --- | --- |
| [SRS_M1_Autenticacion_v2.0](SRS_M1_Autenticacion_v2.0.md) | SRS específico del Módulo 1 |
| [SRS_M2_Gestion_Instrumentos_v2.0](SRS_M2_Gestion_Instrumentos_v2.0.md) | SRS específico del Módulo 2 |
| [SRS_M3_Definicion_Metricas_v1.0](SRS_M3_Definicion_Metricas_v1.0.md) | SRS específico del Módulo 3 |
| [SRS_M4_Registro_Operativo_v1.0](SRS_M4_Registro_Operativo_v1.0.md) | SRS específico del Módulo 4 |
| [ARQUITECTURA_DESPLIEGUE_v1.0](../architecture/ARQUITECTURA_DESPLIEGUE.md) | Arquitectura de despliegue con Zero Trust |
| [MockContract_M1_Autenticacion_v2](../../mock/responses/MockContract_M1_Autenticacion_v2.xml) | Contrato de mock server M1 (v1.1) |
| [MockContract_M2_Gestion_Instrumentos_v2](../../mock/responses/MockContract_M2_Gestion_Instrumentos_v2.xml) | Contrato de mock server M2 |
| [MockContract_M3_Metricas_v1](../../mock/responses/MockContract_M3_Metricas_v1.xml) | Contrato de mock server M3 |
| [MockContract_M4_RegistroOperativo_v1](../../mock/responses/MockContract_M4_RegistroOperativo_v1.xml) | Contrato de mock server M4 |

### 1.5 Estructura del Documento

Las secciones 1–3 establecen el contexto, la visión y los actores del sistema. La sección 4 define el alcance global. La sección 5 establece los requisitos no funcionales transversales que aplican a todos los módulos. Las secciones 6–8 cubren el modelo de datos global, las interfaces externas y las restricciones. Las secciones 9–11 definen los criterios de aceptación del sistema, la estrategia de despliegue y la trazabilidad modular.

---

## 2. Contexto del Sistema

### 2.1 Descripción General

El sistema es una plataforma académico-tecnológica que permite el **registro estructurado, estandarizado y trazable de métricas lingüísticas** obtenidas mediante instrumentos aplicados por profesionales. Opera bajo tres principios fundamentales: anonimización, minimización y separación de identidad. Su propósito en esta etapa es exclusivamente construir el dataset; no realiza análisis, clasificación ni interpretación de resultados.

### 2.2 Problema que Resuelve

El proyecto de investigación enfrenta dos problemas estructurales que dificultan el desarrollo de análisis lingüístico basado en datos.

**Problema 1 — Ausencia de dataset estructurado en el contexto del estudio:** Actualmente no se dispone de una base de datos estructurada y metodológicamente consistente de métricas lingüísticas en el contexto específico de esta investigación. Aunque pueden existir estudios o datasets en otros países o contextos académicos, estos no reflejan necesariamente las características de la población objetivo del proyecto. El objetivo de largo plazo es desarrollar una plataforma basada en modelos de lenguaje (LLM) para generar perfiles lingüísticos estandarizados y analizar el impacto de la pandemia por COVID-19 en el desarrollo lingüístico de la población. Ese desarrollo requiere un dataset consistente y de calidad que actualmente no existe dentro del marco del proyecto.

**Problema 2 — Ausencia de captura metodológica estandarizada:** En el contexto operativo del proyecto no existe un mecanismo que permita a los profesionales registrar la aplicación de instrumentos metodológicos de forma estructurada, controlada y reproducible. Cuando la captura se realiza mediante registros informales o herramientas no estandarizadas, los datos suelen presentar inconsistencias, pérdida de estructura o falta de trazabilidad, lo que limita su utilidad para análisis científicos posteriores. Sin un sistema que estandarice el proceso de captura, resulta difícil garantizar la calidad y confiabilidad del dataset que sustenta la investigación.

Este sistema aborda ambos problemas al estandarizar la captura de instrumentos metodológicos y generar un dataset estructurado que habilita las fases posteriores de análisis científico y desarrollo de modelos, constituyendo la infraestructura inicial del programa de investigación.

### 2.3 Visión de Largo Plazo

```bash
FASE 1 — Módulos 1–4 (este sistema)
  Autenticación · Instrumentos · Métricas · Registro operativo
  → Construcción del dataset lingüístico base

FASE 2 — Módulos 5–6 (este sistema)
  Consulta interna · Exportación estructurada
  → Acceso y extracción controlada del dataset

FASES POSTERIORES (fuera del alcance)
  Análisis estadístico · Modelos LLM · Perfiles lingüísticos
  → Comprensión del impacto lingüístico post-pandemia
```

### 2.4 Relación entre Módulos

| Módulo | HUs | Dependencias | Descripción |
| --- | --- | --- | --- |
| **M1 – Autenticación** | HU1–HU5 | Ninguna | Base del sistema. JWT token, cambio de contraseña, RBAC y audit_log. |
| **M2 – Gestión de Instrumentos** | HU6–HU9 | M1 | Registro y ciclo de vida de instrumentos con descripción y periodo de vigencia. |
| **M3 – Definición de Métricas** | HU10–HU13 | M1, M2 | Configuración de métricas por instrumento con tipo, rango y obligatoriedad. |
| **M4 – Registro Operativo** | HU14–HU17 | M1, M2, M3 | Captura anonimizada de sujetos, contextos, aplicaciones y valores de métricas. |
| **M5 – Consulta Interna** | HU18–HU20 | M1–M4 | Revisión paginada del dataset con filtros por instrumento y periodo. |
| **M6 – Exportación Estructurada** | HU21–HU22 | M1–M5 | Extracción del dataset en CSV y JSON para análisis externo. |

### 2.5 Flujo General de Interacción

```bash
SUPERADMIN
  → Crea usuarios con rol (superadmin / investigador / aplicador)
  → Registra instrumentos metodológicos con descripción y periodo de vigencia
  → Define métricas por instrumento (tipo, rango, obligatoriedad)

Profesional Aplicador
  → Se autentica; obtiene access token
  → Registra sujeto MOCK con UUID automático + datos contextuales no identificables
  → Registra aplicación de instrumento activo y vigente al sujeto
  → Captura valores de métricas (validados por tipo, rango y obligatoriedad)

Investigador
  → Consulta aplicaciones registradas con filtros por instrumento y periodo
  → Exporta dataset en CSV o JSON para análisis externo
```

---

## 3. Stakeholders y Usuarios

### 3.1 Stakeholders del Sistema

| Rol | Interés principal | Responsabilidades |
| --- | --- | --- |
| **Equipo de desarrollo** | Requisitos claros para implementar correctamente. | Implementar, probar e integrar conforme al SRS y estándares definidos. |
| **Investigadores / responsables metodológicos** | Integridad y trazabilidad científica del dataset. | Validar instrumentos, métricas y flujo metodológico. |
| **Profesionales aplicadores** | Sistema usable en campo para registrar aplicaciones. | Aplicar instrumentos y capturar datos conforme al protocolo. |
| **SUPERADMIN del sistema** | Gestión operativa del sistema. | Crear usuarios, configurar instrumentos y métricas. |
| **Proyecto de IA (fases posteriores)** | Recibir un dataset de calidad científica. | Consumir el dataset producido por este sistema. |
| **Testers / QA** | Criterios verificables para validar el sistema. | Diseñar y ejecutar pruebas funcionales, negativas y de integración. |

### 3.2 Roles del Sistema

El sistema tiene tres roles globales que son mutuamente excluyentes:

| Rol Global | Descripción | Capacidad base |
| --- | --- | --- |
| **SUPERADMIN** | Control total del sistema (operativo). | Crear/gestionar instrumentos y métricas globalmente, asignar instrumentos a proyectos, gestionar usuarios, acceder a audit_log. Solo ve estadisticas agregadas; no accede a datos detallados. |
| **Investigador** | Usuario académico de lectura. | Asignado a proyectos para consultar y exportar datos. No puede crear instrumentos ni capturar datos. |
| **Aplicador** | Profesional habilitado para aplicar instrumentos. | Asignado a proyectos para capturar datos. No puede crear instrumentos ni consultar datos. |

### 3.3 Control de Acceso por Proyecto

El **proyecto** es la unidad principal de aislamiento de datos. Cada proyecto tiene sus **instrumentos asignados** y sus **miembros**.

```
SUPERADMIN
    │
    ├── Crea proyectos
    ├── Gestiona instrumentos/métricas (global)
    └── Asigna instrumentos a proyectos y miembros

Proyecto
    │
    ├── tiene → Instrumentos asignados
    ├── tiene → Miembros (Investigador/Aplicador)
    └── tiene → Dataset (datos capturados)
```

#### 3.3.1 Asignación de Instrumentos a Proyecto

Los instrumentos se crean de manera **global** por el SUPERADMIN. Luego se asignan a los proyectos específicos.

| Campo | Tipo | Descripción |
|---|---|---|
| `instrument_ids` | Lista de UUIDs | Instrumentos disponibles en este proyecto. |

#### 3.3.2 Miembros del Proyecto

Un miembro es un usuario asignado a un proyecto con un rol global:

| Usuario | Rol Global | Acceso al Proyecto |
| --- | --- | --- |
| Investigador | `viewer` | Consultar y exportar datos del proyecto. |
| Aplicador | `editor` | Capturar datos (sujetos, aplicaciones, métricas). |

> **Nota:** Un usuario puede pertenecer a varios proyectos con el mismo rol global.

#### 3.3.3 Reglas de Acceso

1. **Sin asignación a proyecto**: El usuario no puede acceder a datos de ningún proyecto.
2. **Con asignación**: El usuario opera según su rol global dentro de ese proyecto.
3. **ADMINISTRADOR**: Gestiona instrumentos globales, los asigna a proyectos, y gestiona miembros.
4. **APLICADOR**: Inicia sesión → selecciona proyecto → registra datos usando instrumentos asignados al proyecto.
5. **INVESTIGADOR**: Inicia sesión → selecciona proyecto → consulta/exporta datos del proyecto.

#### 3.3.4 Flujo de Usuario por Rol

**Aplicador:**
```
1. Login
2. Lista de proyectos donde es miembro → selecciona uno
3. Lista de instrumentos del proyecto (solo activos) → selecciona uno
4. Registra sujeto → registra contexto → registra aplicación → captura métricas
```

**Investigador:**
```
1. Login
2. Lista de proyectos donde es miembro → selecciona uno
3. Consulta datos del proyecto o exporta (selecciona qué exportar)
```

#### 3.3.5 Soft Delete

El sistema implementa **soft delete** (eliminación lógica) para mantener trazabilidad e integridad referencial:

| Entidad | Campo de soft delete | Efecto al desactivar |
|---|---|---|
| `User` | `state = DELETED` | Usuario no puede acceder. Trazabilidad en audit_log. Irreversible. |
| `Instrument` | `is_active = false` | Instrumento no puede recibir nuevas aplicaciones. Historial M4 intacto. Reversible. |

> **Instrumentos**: Al desactivar (`is_active=false`), el instrumento deja de aparecer en la lista de instrumentos disponibles del proyecto, pero todas las aplicaciones históricas permanecen intactas. El SUPERADMIN puede reactivarlo.

> **Usuarios**: Al eliminar (`state=DELETED`), el usuario pierde acceso al sistema. La operación es irreversible (debe crearse un nuevo usuario). Se registra en audit_log.

### 3.5 Estados de Usuario

El sistema implementa separación entre identidad y autenticación. Cada usuario tiene un `user_id` (UUID) inmutable que es su identidad real. El correo es un atributo de autenticación que puede cambiar sin alterar el `user_id`.

| Estado | Descripción | Acceso al sistema |
| --- | --- | --- |
| **PENDING** | Usuario creado, esperando activacion por Magic Link. | Solo `GET /auth/activate/:token` con Magic Link valido. |
| **ACTIVE** | Usuario con identidad verificada y autenticación vinculada. | Acceso completo según rol. |
| **DISABLED** | Usuario deshabilitado por el SUPERADMIN. Sin acceso, reversible por el SUPERADMIN. | Ninguno. Puede reactivarse. |
| **DELETED** | Usuario eliminado (soft delete). Sin acceso, con trazabilidad en audit_log. | Ninguno. Irreversible. |

> **Nota:** Cambio de correo ≠ cambio de usuario. Cuando un usuario cambia su correo:
> 1. Se invalidan todas las sesiones activas.
> 2. Se rompe el vínculo con el broker de identidad.
> 3. Se reinicia el flujo (estado PENDING).
> 4. El `user_id` se conserva inmutable.

### 3.6 Matriz de Permisos Global

Esta tabla define los permisos a **nivel de sistema**:

| Acción (Global)                   | SUPERADMIN | Investigador | Aplicador |
|-----------------------------------|:-------------:|:------------:|:---------:|
| Crear instrumentos (global)        | ✓ | — | — |
| Gestionar métricas (global)        | ✓ | — | — |
| Asignar instrumentos a proyectos  | ✓ | — | — |
| Gestionar usuarios globales       | ✓ | — | — |
| Agregar miembros a proyectos       | ✓ | — | — |
| Ver audit_log                     | ✓ | — | — |
| Consultar datos detallados (M5)   | — | ✓ | — |
| Ver estadisticas agregadas (M5)   | ✓ | — | — |
| Exportar datos (M6)               | — | ✓ | — |

---

## 4. Alcance del Sistema

### 4.1 Objetivo General

Proveer una plataforma de registro estructurado, estandarizado y trazable de métricas lingüísticas, operando bajo principios de anonimización, minimización y separación de identidad, con el propósito de construir el dataset fundacional que sustentará el análisis científico y el desarrollo de IA en fases posteriores del proyecto.

### 4.2 Funcionalidades por Fase

**Fase 1 — Módulos 1–4:**

- Autenticación con JWT de sesión única (6 h) y control de sesión. Sin mecanismo de refresh token.
- Gestión de usuarios con tres roles diferenciados.
- Activación/desactivación de usuarios e instrumentos sin pérdida de historial.
- Registro de instrumentos metodológicos con descripción y periodo de vigencia.
- Definición de métricas por instrumento con tipo de dato, rango y obligatoriedad.
- Registro de sujetos con UUID automático, sin datos personales identificables.
- Registro de datos contextuales no identificables por sujeto.
- Registro de aplicaciones con validación de instrumento activo y vigente.
- Captura y validación atómica de valores de métricas.
- Registro de eventos de sesión en audit_log.

**Fase 2 — Módulos 5–6:**

- Consulta paginada de aplicaciones con filtros por instrumento y periodo temporal.
- Exportación del dataset en CSV con encabezados de métricas.
- Exportación del dataset en JSON con jerarquía metodológica completa.

### 4.3 Fuera del Alcance

- Análisis estadístico, clasificación automática o interpretación asistida de resultados.
- Construcción de perfiles lingüísticos o análisis de impacto post-pandemia.
- Dashboards o visualización analítica de datos.
- Autenticación multifactor (MFA) o recuperación de contraseña por correo.
- Gestión granular de permisos más allá de los tres roles definidos.
- Integración con modelos LLM, APIs externas o sistemas de terceros.
- Registro de datos personales identificables bajo ninguna circunstancia.
- Eliminación permanente de usuarios, instrumentos o cualquier registro histórico.

---

## 5. Requisitos No Funcionales Transversales

Estos requisitos aplican a **todos los módulos**. Los SRS específicos de módulo pueden añadir RNF propios, pero no pueden relajar los aquí definidos.

### 5.1 Seguridad

| ID | Descripción | Métrica verificable |
|---|---|---|
| RNF-SEC-01 | Todo endpoint protegido requiere JWT válido en cada solicitud. | 100% de endpoints retornan HTTP 401 ante token ausente o inválido. |
| RNF-SEC-02 | El control de acceso por rol se aplica en cada solicitud mediante middleware. | 100% de acciones no autorizadas para el rol retornan HTTP 403. |
| RNF-SEC-03 | El PEP intercepta y valida toda solicitud antes de ejecutar lógica de negocio. | Ningún endpoint ejecuta operaciones sin pasar por validación completa. |
| RNF-SEC-04 | El PA evalúa token, rol y estado activo antes de conceder acceso. | Usuarios desactivados son rechazados aunque su token sea válido. |
| RNF-SEC-05 | Access token: 6 h (21 600 s). Se invalida en logout explícito, cambio de estado del usuario, o cambio de correo. Sin mecanismo de refresh. | Tokens expirados retornan HTTP 401. |
| RNF-SEC-06 | Comunicación cifrada en tránsito en todas las capas. | HTTPS/TLS habilitado; ningún canal sin cifrar. |
| RNF-SEC-07 | Credenciales y secretos nunca en código fuente ni variables sin cifrar. | Auditoría de código confirma ausencia de secretos expuestos. |
| RNF-SEC-08 | El frontend no accede directamente a la base de datos. | Solo el backend tiene conexión con PostgreSQL. |
| RNF-SEC-09 | Ningún registro de sujeto contiene PII. | Revisión de esquema confirma ausencia de PII en `Subject` y `ContextData`. |
| RNF-SEC-10 | Eventos de seguridad en audit_log con timestamp y usuario. El audit_log almacena el `jti` del token como referencia de sesión; nunca el token JWT completo. | audit_log cubre 100% de eventos: login, logout, intentos fallidos, accesos denegados, cambios de estado, cambio de correo. Ningún registro contiene el JWT completo. |
| RNF-SEC-11 | Rate limiting transversal: máximo 100 solicitudes por minuto por IP. | Endpoints retornan HTTP 429 al exceder límite. |
| RNF-SEC-12 | Cifrado de datos sensibles por contexto. Datos cuasi-identificables (ContextData) cifrados con AES-256-GCM usando clave derivada del proyecto (HKDF). Datos críticos (auditoría) almacenados con hash irreversible (blake2b). | Verificación de cifrado en reposo. Clave maestra en Docker Secrets. |
| RNF-SEC-13 | Logging estructurado en formato JSON con contexto de auditoría. | Todos los logs incluyen timestamp, user_id, action, project_id, contexto. |
| RNF-SEC-14 | Proteccion ultimo SUPERADMIN: el sistema impide desactivacion del ultimo usuario con rol superadmin. | Endpoint retorna HTTP 409 si se intenta desactivar el ultimo SUPERADMIN. |
| RNF-SEC-15 | Aislamiento de datos por proyecto. Cada proyecto tiene clave derivada independiente. | Un proyecto comprometido no afecta datos de otros proyectos. |
| RNF-SEC-16 | La clave maestra nunca se almacena en código fuente ni variables de entorno. | Solo Docker Secrets. Auditoría de código confirma ausencia. |

### 5.2 Rendimiento

| ID | Descripción | Métrica verificable |
|---|---|---|
| RNF-PERF-01 | Los endpoints CRUD básicos responden en tiempo razonable. | Tiempo de respuesta < 2 segundos. |
| RNF-PERF-02 | El sistema soporta el volumen esperado sin degradación. | Hasta 1,000 aplicaciones sin degradación. |
| RNF-PERF-03 | Los endpoints de exportación generan archivos completos sin timeout. | Exportación de 1,000 registros en < 10 segundos. |

### 5.3 Confiabilidad

| ID | Descripción | Métrica verificable |
|---|---|---|
| RNF-REL-01 | El sistema maneja entradas inválidas sin fallar inesperadamente. | 0 errores HTTP 500 causados por entradas de usuario inválidas. |
| RNF-REL-02 | Los datos válidos persisten correctamente en todos los módulos. | 100% de registros creados en pruebas se recuperan sin pérdida. |
| RNF-REL-03 | Integridad referencial entre entidades mantenida en todo momento. | Ningún registro huérfano en ninguna entidad. |
| RNF-REL-04 | La captura de valores de métricas es atómica. | Si cualquier validación falla, ningún valor del lote se persiste. |

### 5.4 Mantenibilidad

| ID | Descripción | Métrica verificable |
|---|---|---|
| RNF-MAINT-01 | Python: `snake_case` variables/funciones, `PascalCase` clases, `UPPER_CASE` constantes. | Cumplimiento confirmado en revisión de PRs. |
| RNF-MAINT-02 | Arquitectura modular: modelos, controladores, servicios, validaciones y utilidades separados. | Estructura verificable en el repositorio. |
| RNF-MAINT-03 | Todo el código escrito en inglés. | 100% del código en inglés. |
| RNF-MAINT-04 | La matriz de permisos implementada como constante centralizada única. | No existen permisos duplicados o hardcodeados por endpoint. |

### 5.5 Consistencia del API

| ID | Descripción | Métrica verificable |
|---|---|---|
| RNF-API-01 | Todos los endpoints retornan `{ "status", "message", "data" }` sin excepción. | 100% de endpoints retornan estructura estándar. |
| RNF-API-02 | Todos los errores incluyen `message` descriptivo. | Ningún error retorna sin campo `message`. |
| RNF-API-03 | Todos los endpoints bajo `/api/v1`. | Verificable en la configuración del router. |

---

## 6. Modelo de Datos Global

### 6.1 Entidades del Sistema

| Entidad | Módulo | Descripción |
|---|---|---|
| `User` | M1 | Usuario con rol global, organización y estado. user_id inmutable. |
| `Project` | M1 | Proyecto que agrupa datos. Cada proyecto tiene instrumentos asignados y miembros. |
| `ProjectMember` | M1 | Relación usuario-proyecto. Define qué proyectos puede acceder el usuario. |
| `Dataset` | M1 | Conjunto de datos (aplicaciones, valores) de un proyecto. |
| `Role` | M1 | Rol global: `superadmin`, `researcher`, `applicator`. |
| `Session` | M1 | Sesiones activas de usuarios con timestamp. |
| `AuditLog` | M1 | Eventos de seguridad: login, logout, accesos denegados, cambios de estado. |
| `Instrument` | M2 | Instrumento metodológico global con nombre único, descripción, periodo de vigencia y estado. Se asigna a proyectos. |
| `Metric` | M3 | Métrica asociada a un instrumento. Definida globalmente, disponible en los proyectos donde el instrumento está asignado. |
| `Subject` | M4 | Sujeto identificado exclusivamente por UUID. Sin PII. |
| `ContextData` | M4 | Datos contextuales no identificables asociados a un sujeto. |
| `TestApplication` | M4 | Aplicación de un instrumento a un sujeto en una fecha dada. |
| `MetricValue` | M4 | Valor capturado para una métrica en una aplicación específica. |

### 6.2 Enum MetricType

| Valor | Descripción | Validaciones al capturar |
|---|---|---|
| `numeric` | Valor numérico entero o decimal. | Dentro de `[min_value, max_value]` si están definidos. |
| `categorical` | Valor de lista cerrada. | Debe pertenecer a `options[]`. Requiere `options` al crear la métrica. |
| `boolean` | Verdadero / falso. | Valores: `true` o `false`. Sin restricciones adicionales. |
| `short_text` | Texto corto libre. | Sin restricciones adicionales. |

### 6.3 Atributos de Contexto del Sujeto (ContextData)

| Atributo | Tipo | Valores permitidos |
|---|---|---|
| `school_type` | categórico | `public` · `private` · `unknown` |
| `education_level` | categórico | `preschool` · `primary_lower` (1°–3°) · `primary_upper` (4°–6°) · `secondary` · `unknown` |
| `age_cohort` | string de rango (regex `^\d+-\d+$`) | ej. `"6-8"` · `"9-11"` · `"12-14"` · `"15-17"` |
| `gender` | categórico | `male` · `female` · `non_binary` · `prefer_not_to_say` |
| `socioeconomic_level` | categórico | `low` · `medium` · `high` · `unknown` |
| `additional_attributes` | objeto JSON abierto | Atributos metodológicos futuros no definidos aún (clave-valor libre). |

### 6.4 Principios de Datos

- **Anonimización:** la identidad de los sujetos no puede derivarse de los datos almacenados.
- **Minimización:** solo se registran los datos estrictamente necesarios para el fin metodológico.
- **Separación de identidad:** los datos identificativos se mantienen desvinculados de los datos lingüísticos.
- **No eliminación:** los instrumentos no pueden eliminarse permanentemente. Solo cambio de estado (`is_active` booleano).

### 6.5 Clasificación de Datos

El sistema implementa **Security & Privacy by Design**. Cada dato se clasifica según su nivel de sensibilidad:

| Clasificación | Descripción | Tratamiento |
|---|---|---|
| **Público** | Datos sin restricción. | Sin cifrado. |
| **Sensible** | Datos que identifican indirectamente o pueden afectar la privacidad. | Cifrado simétrico (AES-256). |
| **Crítico** | Datos de seguridad que no deben ser revelados jamás. | Hash irreversible. |

#### 6.5.1 Clasificación por Entidad

| Entidad | Campo(s) | Clasificación | Tratamiento |
|---|---|---|---|
| `Instrument` | `name`, `methodological_description`, `start_date`, `end_date` | Público | Sin cifrado |
| `Metric` | `name`, `metric_type`, `options`, `min_value`, `max_value`, `required` | Público | Sin cifrado |
| `Subject` | `subject_id` (UUID) | Público | Sin cifrado (identificador anónimo) |
| `ContextData` | `age_cohort`, `gender`, `education_level`, `school_type`, `socioeconomic_level`, `additional_attributes` | Sensible | AES-256 por clave de proyecto |
| `MetricValue` | `value` | Sensible | AES-256 por clave de proyecto |
| `TestApplication` | `application_date`, `notes` | Sensible | AES-256 por clave de proyecto |
| `AuditLog` | `jti`, `action`, `details` | Crítico | Hash irreversible (blake2b) |
| `revoked_tokens` | `jti` | Crítico | Hash irreversible (blake2b) |

### 6.6 Cifrado por Contexto

El sistema implementa cifrado basado en **claves por proyecto**:

```
Clave Maestra (Docker Secret)
        │
        ▼
   HKDF (derive)
        │
        ▼
  Clave por Proyecto (project_id)
        │
        ▼
  AES-256-GCM
        │
        ▼
  Datos cifrados en reposo
```

#### 6.6.1 Estrategia de Claves

| Componente | Descripción |
|---|---|
| **Clave Maestra** | Almacenada en Docker Secrets. Nunca en código fuente ni variables de entorno. |
| **Derivación** | HKDF (HMAC-based Key Derivation Function) para derivar clave por proyecto. |
| **Almacenamiento** | Las claves derivadas **no** se almacenan en BD. Se calculan en tiempo de ejecución. |
| **Aislamiento** | Cada proyecto tiene su propia clave. Los datos de un proyecto no son descifrables con la clave de otro. |

#### 6.6.2 Datos Cifrados

- **ContextData**: Totalmente cifrado con clave del proyecto.
- **MetricValue**: El valor se cifra antes de almacenarse.
- **TestApplication.notes**: Cifrado opcional.

#### 6.6.3 Datos con Hash Irreversible

- **AuditLog**: El `jti` del token se almacena como hash blake2b.
- **revoked_tokens**: El `jti` se almacena como hash blake2b.

> **Ventajas del modelo:**
> - Aislamiento total entre proyectos
> - Si una clave de proyecto se ve comprometida, solo esos datos se afectan
> - La clave maestra nunca sale del sistema
> - Colaboración natural: usuarios de un proyecto comparten la misma clave derivada

### 6.7 Sistema de Logging de Auditoría

El sistema implementa **logging estructurado en JSON** para auditoría y compliance. Cada evento se registra con contexto completo para permitir trazabilidad por usuario y por proyecto.

#### 6.7.1 Eventos Registrados

| Evento | Categoría | user_id | project_id | Registro |
|---|---|---|---|---|
| Login exitoso | Autenticación | ✓ | — | ✓ |
| Login fallido | Autenticación | ✓ | — | ✓ |
| Magic Link usado | Autenticación | ✓ | — | ✓ |
| Magic Link regenerado | Autenticación | ✓ | — | ✓ |
| Cambio de estado de usuario | Usuario | ✓ | — | ✓ |
| Cambio de correo | Usuario | ✓ | — | ✓ |
| Sincronización con broker | Sistema | ✓ | — | ✓ |
| Acceso a dataset | Datos | ✓ | ✓ | ✓ |
| Creacion de proyecto | SUPERADMIN | ✓ | ✓ | ✓ |
| Asignacion de instrumento a proyecto | SUPERADMIN | ✓ | ✓ | ✓ |
| Agregar miembro a proyecto | SUPERADMIN | ✓ | ✓ | ✓ |
| Registro de sujeto | Datos | ✓ | ✓ | ✓ |
| Registro de aplicación | Datos | ✓ | ✓ | ✓ |
| Captura de métricas | Datos | ✓ | ✓ | ✓ |
| Exportación de datos | Datos | ✓ | ✓ | ✓ |
| Rate limit activado | Sistema | ✓ | — | ✓ |
| Acceso denegado (403) | Seguridad | ✓ | ✓ | ✓ |

#### 6.7.2 Formato del Log

```json
{
  "timestamp": "2026-03-31T10:30:00Z",
  "level": "INFO",
  "action": "LOGIN_SUCCESS",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "resource": "auth",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "metadata": {
    "role": "superadmin",
    "method": "keycloak"
  }
}
```

#### 6.7.3 Campos Obligatorios

| Campo | Descripción |
|---|---|
| `timestamp` | ISO 8601 UTC |
| `level` | INFO, WARNING, ERROR, SECURITY |
| `action` | Identificador de la acción |
| `user_id` | UUID del usuario (cuando aplica) |
| `project_id` | UUID del proyecto (cuando aplica) |

#### 6.7.4 Datos Excluidos (Nunca registrar)

- Tokens JWT completos
- Contraseñas o hashes de contraseñas
- Secretos o claves (Docker Secrets)
- Datos sensibles en claro (ContextData, MetricValue)
- Tokens de Magic Link

> **Principio**: La auditoría registra **qué** ocurrió, **quién** lo hizo y **desde dónde**, pero nunca expone credenciales o datos de los sujetos.

#### 6.7.5 Auditoría por Contexto

El sistema permite consultas de auditoría por:

- **Usuario**: Todos los eventos de un usuario específico
- **Proyecto**: Todos los eventos de un proyecto específico
- **Tiempo**: Eventos en un rango de fechas
- **Acción**: Eventos de un tipo específico

Esto permite responder a auditorías de compliance preguntando: "¿qué happened in this project?" o "¿qué hizo este usuario en todos los proyectos?"

---

## 7. Interfaces Externas

### 7.1 Interfaces entre Módulos

| Origen | Destino | Tipo de dependencia |
|---|---|---|
| M1 | Todos los módulos | Provee JWT y validación de rol a todos los endpoints del sistema. |
| M2 | M3 | M3 asocia métricas a instrumentos existentes en M2. |
| M2 | M4 | M4 valida que el instrumento esté activo y dentro de vigencia al registrar una aplicación. |
| M3 | M4 | M4 valida tipo de dato, rango y obligatoriedad de cada valor contra las métricas de M3. |
| M4 | M5 | M5 consulta los datos registrados por M4. |
| M4, M5 | M6 | M6 exporta la misma capa de datos que M5 consulta. |

### 7.2 Interfaces de Usuario

La interfaz web expone al menos:

- Formulario de inicio de sesión.
- Panel de administracion: gestion de usuarios, instrumentos y metricas.
- Formulario dinámico de captura de métricas (adapta campos según `MetricType`).
- Formulario de registro de sujetos y aplicaciones.
- Tabla paginada de aplicaciones con filtros por instrumento y periodo.
- Acciones de descarga para exportación CSV y JSON.

### 7.3 Interfaces de Software

| Componente | Descripción |
|---|---|
| **API REST (FastAPI)** | Expone todos los endpoints bajo `/api/v1` en formato HTTP/JSON. |
| **PostgreSQL** | Almacena todas las entidades con integridad referencial. Único punto de persistencia. |
| **Frontend** | Consume la API REST. No accede directamente a la base de datos. |

### 7.4 Interfaces de Comunicación

- Protocolo: HTTP/HTTPS
- Formato: JSON
- Autenticación en endpoints protegidos: `Authorization: Bearer {access_token}`
- Estructura de respuesta estándar:

```json
{
  "status": "success | error",
  "message": "Descripción del resultado",
  "data": {}
}
```

---

## 8. Restricciones y Supuestos

### 8.1 Restricciones

| Restricción | Descripción |
|---|---|
| **Anonimización obligatoria** | Los sujetos se registran exclusivamente mediante UUID. Sin PII bajo ninguna circunstancia. |
| **Roles fijos** | Los tres roles son fijos en esta versión. Sin gestión granular de permisos. |
| **Solo el SUPERADMIN crea usuarios** | No existe registro publico. Solo el SUPERADMIN crea cuentas. |
| **Sin eliminación permanente** | Usuarios, instrumentos y todos los registros históricos son inactivables, no eliminables. |
| **Backend en Python** | Python 3.11+, FastAPI, SQLAlchemy, Alembic. |
| **Base de datos** | PostgreSQL exclusivamente. Sin otro motor en esta versión. |
| **Migraciones con Alembic** | Toda modificación de esquema pasa por Alembic. Ninguna tabla se crea manualmente. |
| **Orden de desarrollo** | M5 y M6 no se inician hasta que M1–M4 estén completos y validados. |
| **Control de versiones** | Git con flujo basado en ramas. Integración a `main` solo mediante Pull Request revisado. |

### 8.2 Supuestos

| Supuesto | Descripción |
|---|---|
| **Usuario autenticado** | Todos los endpoints de negocio asumen solicitante con JWT válido y activo. |
| **Base de datos operativa** | El sistema asume disponibilidad de PostgreSQL durante la ejecución. |
| **Instrumentos definidos externamente** | Los instrumentos a registrar están previamente definidos por el equipo de investigación. |
| **Atributos de contexto aprobados** | Los atributos de `ContextData` están aprobados metodológicamente antes de implementar M4. |
| **Un aplicador por aplicación** | Cada aplicación es registrada por un único profesional autenticado. |

---

## 9. Criterios de Aceptación del Sistema

El sistema se considera funcionalmente aceptado cuando el siguiente escenario de punta a punta puede ejecutarse completamente sin errores críticos:

1. El SUPERADMIN crea un usuario Investigador y un usuario Aplicador.
2. Ambos usuarios se autentican correctamente y reciben un access token (6 h).
3. Un token expirado es rechazado con 401; el usuario debe autenticarse nuevamente con sus credenciales.
4. El aplicador cambia su contraseña tras validar correctamente la contraseña actual.
5. El SUPERADMIN registra un instrumento con descripcion y periodo de vigencia.
6. El SUPERADMIN define metricas para el instrumento (tipo, rango, obligatoriedad).
7. El aplicador registra un sujeto MOCK con UUID automático, sin datos PII.
8. El aplicador registra datos contextuales no identificables para el sujeto.
9. El aplicador registra la aplicación del instrumento al sujeto.
10. El aplicador captura todos los valores de métricas obligatorias.
11. El sistema rechaza valores fuera de tipo o rango con mensaje descriptivo.
12. El sistema rechaza la aplicación si el instrumento está inactivo o fuera de vigencia.
13. Si cualquier valor de métrica falla la validación, ningún valor del lote se persiste.
14. El investigador consulta las aplicaciones con filtros y paginación.
15. El investigador exporta el dataset en CSV y JSON con estructura correcta.
16. Todos los registros mantienen integridad referencial.
17. El audit_log registra los eventos de sesión pertinentes.

---

## 10. Estrategia de Despliegue

El despliegue se realiza en un **clúster Docker Swarm** operado sobre los equipos físicos del equipo de desarrollo, siguiendo los principios de **Security & Privacy by Design** y **Zero Trust**.

> **Documento de referencia:** El detalle completo de la arquitectura de despliegue, incluyendo diagramas de red, segmentación, gestión de secretos y procedimientos, está disponible en: [`docs/architecture/ARQUITECTURA_DESPLIEGUE.md`](docs/architecture/ARQUITECTURA_DESPLIEGUE.md)

### 10.1 Principios de Seguridad del Despliegue

| Principio | Descripción |
|-----------|-------------|
| **Zero Trust** | Todo servicio autentica y autoriza cada petición, interno o externo |
| **Defensa en profundidad** | Múltiples capas de seguridad independientes |
| **Menor privilegio** | Cada servicio tiene permisos mínimos necesarios |
| **Segmentación de red** | Redes separadas por tier (frontend, backend, data) |
| **Secretos gestionados** | Docker Secrets exclusivamente, nunca en variables de entorno |

### 10.2 Topología del Clúster

- **1 nodo Manager**: Control plane + Frontend + Backend + Keycloak
- **≥2 nodos Worker**: PostgreSQL, Redis, Backend adicional

### 10.3 Servicios y Réplicas

| Servicio | Réplicas | Propósito |
|----------|:--------:|-----------|
| Frontend | 2 | Interfaz de usuario |
| Backend | 2 | API (stateless) |
| Keycloak | 2 | Identity Provider + DB propia |
| PostgreSQL | 1 primary + 1 replica | Datos del sistema |
| Redis | 1 master + 1 replica | Cache + Rate limiting |
| Traefik | 1 | Ingress controller |

### 10.4 Segmentación de Redes

| Red | Propósito | Servicios conectados |
|-----|-----------|----------------------|
| `ingress` | Punto de entrada externo | Traefik, Frontend, Backend |
| `frontend_net` | Comunicación frontend→backend | Frontend, Backend |
| `backend_net` | Lógica de negocio | Backend, Redis, Keycloak |
| `data_net` | Datos (aislada) | PostgreSQL, Redis |
| `keycloak_net` | Keycloak DB (aislada) | Keycloak |

### 10.5 Gestión de Secretos

Todos los secretos se gestionan via **Docker Secrets**:

- Credenciales PostgreSQL (principal, réplica, Keycloak)
- Clave maestra de cifrado (AES-256)
- Clave JWT
- Credenciales SUPERADMIN Keycloak

### 10.6 Modos de Ejecución

| Modo | Componentes | Uso |
|------|-------------|-----|
| **Mock** | Frontend → Mock Server | Desarrollo sin backend real |
| **Real** | Frontend → Backend → PostgreSQL + Redis + Keycloak | Producción |

### 10.7 Etapa 1 — Fase 1 (Módulos 1–4)

Módulos interdependientes desplegados simultáneamente (**Big Bang controlado**). No existe tráfico de producción previo. El stack completo se valida en el clúster antes de habilitar acceso al equipo.

Servicios activos: Frontend · Backend (M1–M4) · PostgreSQL.

### 10.8 Etapa 2 — Fase 2 (Módulos 5–6)

Los endpoints de consulta y exportación se habilitan primero para Investigadores (**Canary**), se valida la integridad del dataset exportado y se realiza rollout completo una vez confirmado el comportamiento correcto.

**Precondición:** M1–M4 completos y validados conforme a su DoD.

### 10.9 Fases Posteriores — IA

Estrategia **Blue/Green**: el entorno activo continúa operando mientras el entorno con IA se valida en paralelo. Switch solo cuando Green está completamente validado.

**Precondición:** Dataset exportado y validado por el equipo de investigación.

---

## 11. Trazabilidad de Requisitos

| Requisito | Historia de Usuario | Módulo | Entidades | Endpoint principal |
|---|---|---|---|---|
| RF-M1-01 | HU1 – Crear usuario | M1 | `User`, `MagicLink` | `POST /users` |
| RF-M1-02 | HU2 – Gestionar estado de usuario | M1 | `User` | `PATCH /users/{user_id}/status` |
| RF-M1-03 | HU3 – Login / Activar con Magic Link | M1 | `User`, `MagicLink` | `POST /auth/login` · `GET /auth/activate/:token` |
| RF-M1-04 | HU4 – Cerrar sesión | M1 | `AuditLog`, Token blacklist | `POST /auth/logout` |
| RF-M1-05 | HU5 – Restringir por rol | M1 | `Role` | Middleware `/api/v1/*` |
| RF-M1-06 | Cambiar correo electrónico | M1 | `User`, `MagicLink`, `revoked_tokens` | `PATCH /users/{user_id}/email` |
| RF-M2-01 | HU6 – Crear instrumento | M2 | `Instrument` | `POST /instruments` |
| RF-M2-02 | HU7 – Descripción metodológica | M2 | `Instrument` | `PATCH /instruments/{id}` |
| RF-M2-03 | HU8 – Periodo de aplicación | M2 | `Instrument` | `PATCH /instruments/{id}` |
| RF-M2-04 | HU9 – Activar/desactivar instrumento | M2 | `Instrument` | `PATCH /instruments/{id}/status` |
| RF-M3-01 | HU10 – Crear métrica | M3 | `Metric`, `Instrument` | `POST /instruments/{instrument_id}/metrics` |
| RF-M3-02 | HU11 – Tipo de dato | M3 | `Metric` (`MetricType`) | `POST /instruments/{instrument_id}/metrics` · `PATCH /instruments/{instrument_id}/metrics/{metric_id}` |
| RF-M3-03 | HU12 – Rango válido | M3 | `Metric` | `PATCH /instruments/{instrument_id}/metrics/{metric_id}` |
| RF-M3-04 | HU13 – Obligatoriedad | M3 | `Metric` | `POST /instruments/{instrument_id}/metrics` · `PATCH /instruments/{instrument_id}/metrics/{metric_id}` |
| RF-M4-01 | HU14 – Registrar sujeto | M4 | `Subject` | `POST /projects/{project_id}/subjects` |
| RF-M4-02 | HU15 – Registrar contexto | M4 | `ContextData`, `Subject` | `POST /projects/{project_id}/subjects/{subject_id}/context` |
| RF-M4-03 | HU16 – Registrar aplicación | M4 | `TestApplication` | `POST /projects/{project_id}/applications` |
| RF-M4-04 | HU17 – Capturar valores | M4 | `MetricValue` | `POST /projects/{project_id}/applications/{application_id}/metric-values` |
| RF-M5-01 | HU18 – Consultar aplicaciones | M5 | `TestApplication` | `GET /applications` |
| RF-M5-02 | HU19 – Filtrar por instrumento | M5 | `Instrument` | `GET /applications?instrument_id=` |
| RF-M5-03 | HU20 – Filtrar por periodo | M5 | `TestApplication` | `GET /applications?start_date=&end_date=` |
| RF-M6-01 | HU21 – Exportar CSV | M6 | Todas | `GET /export/csv` |
| RF-M6-02 | HU22 – Exportar JSON | M6 | Todas | `GET /export/json` |

---

---

## 12. Privacidad, Protección de Datos y Cumplimiento (GAP-SEG-01)

> **Adicionado en revisión 2026-03-22** · Referencia: `mock/SECURITY_REPORT.md §SEG-01`, GAP-SEG-01

### 12.1 Contexto de Riesgo

El sistema captura datos de **sujetos menores de edad** (potencialmente) en contextos educativos. Aunque los sujetos se registran sin PII directa (sin nombre, CURP, dirección), la combinación de atributos contextuales (`age_cohort`, `gender`, `education_level`, `school_type`, `socioeconomic_level`) puede constituir **datos cuasi-identificables** según el considerando 26 del RGPD y el artículo 3° de la LFPDPPP (México).

**Estado actual del Mock:** El sistema de desarrollo (Mock) no implementa cumplimiento GDPR/LOPD completo. Implementa las bases indispensables (ver §12.3). El cumplimiento pleno es requisito antes de la puesta en producción con datos reales.

### 12.2 Clasificación de Datos

| Capa | Tipo de dato | PII | Riesgo de reidentificación |
|---|---|---|---|
| `Subject.id` | UUID autogenerado | No | Nulo (sin contexto) |
| `ContextData` (5 campos estándar) | Cuasi-identificables | Indirecto | Bajo-Medio (combinación de 4+ campos) |
| `ContextData.additional_attributes` | Variable | Potencial | Variable según contenido |
| `MetricValue.value` | Datos lingüísticos | No | Bajo |
| `users.*` | Datos internos del equipo | Sí (correo, nombre) | N/A (personal del equipo, no sujetos) |

### 12.3 Medidas de Privacidad Implementadas (DPIA Básico)

| Medida | Descripción | Implementación |
|---|---|---|
| **Anonimización por diseño** | Sujetos identificados solo por UUID | `POST /subjects` rechaza body con datos |
| **Minimización de datos** | Solo campos metodológicamente necesarios en ContextData | validateStrictInput en endpoints M4 |
| **Restricción de additional_attributes** | Máx 5 claves, sin campos de PII conocidos, límites de tamaño | `mock/src/routes/m4.js` + lista negra |
| **Validación de age_cohort** | Solo rangos (`N-N`), no edades exactas | Regex `^\d+-\d+$`, max 20 chars |
| **Separación de identidad** | Ninguna tabla vincula UUID de sujeto con PII real | Diseño de BD |
| **Control de acceso** | Solo Aplicador/SUPERADMIN acceden a datos de sujetos | RBAC en todos los endpoints M4 |
| **Audit log** | Registro de accesos a datos de usuarios para compliance | `store.auditLog` + `GET /audit-log` |

### 12.4 Restricciones de Producción (Pendientes)

Antes de procesar datos reales, el equipo debe:

1. **Realizar DPIA formal** (Evaluación de Impacto en Protección de Datos) completa.
2. **Obtener consentimiento informado** de participantes o sus tutores (menores).
3. **Documentar base legal** para el tratamiento (interés legítimo de investigación, art. 9 RGPD).
4. **Implementar derecho al olvido**: mecanismo para eliminar todos los datos de un sujeto por UUID.
5. **Cifrado en reposo**: cifrar `ContextData` y `MetricValue` en la base de datos.
6. **Política de retención**: definir TTL para datos y eliminación automática.
7. **Registro de tratamiento**: documentar como responsable del tratamiento.

### 12.5 Riesgo Combinatorio (K-Anonimato)

El sistema **no implementa k-anonimato** en esta versión. Para datasets con pocos sujetos por combinación de atributos, existe riesgo de reidentificación por combinación de `age_cohort + gender + education_level + school_type`. El equipo de investigación debe considerar:
- Agregar `unknown` en todos los enums cuando la precisión no sea metodológicamente necesaria.
- Revisar si `additional_attributes` puede crear combinaciones únicas.
- Aplicar generalización de atributos en la exportación (M6, Fase 2).

*Fin del documento — SRS General del Sistema v1.0 · 2026-03-22 (actualizado)*
