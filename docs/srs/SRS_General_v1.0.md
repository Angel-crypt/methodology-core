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
| **MetricType** | Enumeración de tipos válidos para una métrica: `numeric`, `categorical`, `boolean`, `short_text`. |
| **JWT** | JSON Web Token. Mecanismo para generar y validar tokens de sesión. |
| **Access Token** | JWT de sesión única (6 h / 21 600 s) usado para autenticar todas las peticiones al API. La sesión termina por vencimiento natural, logout explícito o desactivación del usuario por el Administrador. |
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
| [SRS_M2_Gestion_Instrumentos_v2.0](SRS_M2_Gestion_Instrumentos_v2.0.MD) | SRS específico del Módulo 2 |
| [SRS_M3_Definicion_Metricas_v1.0](SRS_M3_Definicion_Metricas_v1.0.md) | SRS específico del Módulo 3 |
| [SRS_M4_Registro_Operativo_v1.0](SRS_M4_Registro_Operativo_v1.0.md) | SRS específico del Módulo 4 |
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
Administrador
  → Crea usuarios con rol (administrador / investigador / aplicador)
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
| **Administrador del sistema** | Gestión operativa del sistema. | Crear usuarios, configurar instrumentos y métricas. |
| **Proyecto de IA (fases posteriores)** | Recibir un dataset de calidad científica. | Consumir el dataset producido por este sistema. |
| **Testers / QA** | Criterios verificables para validar el sistema. | Diseñar y ejecutar pruebas funcionales, negativas y de integración. |

### 3.2 Roles del Sistema

El sistema tiene exactamente tres roles fijos. No existe gestión granular de permisos en esta versión.

| Rol | Descripción | Permisos principales |
| --- | --- | --- |
| **Administrador** | Control total del sistema. | Gestión de usuarios, instrumentos y métricas. Consulta, exportación y audit_log. |
| **Investigador** | Usuario académico de lectura. | Consulta filtrada de aplicaciones. Exportación del dataset en CSV y JSON. |
| **Profesional Aplicador** | Profesional habilitado para aplicar instrumentos. | Registro de sujetos, aplicaciones y captura de valores de métricas. |

### 3.3 Matriz de Permisos Global

Esta tabla es la **fuente de verdad para el middleware de autorización**.  
Debe implementarse como una **constante de configuración centralizada** y nunca duplicarse dentro de endpoints individuales.

| Acción                               | Administrador | Investigador | Aplicador |
|--------------------------------------|:-------------:|:------------:|:---------:|
| Gestionar usuarios                  | ✓ | — | — |
| Gestionar instrumentos              | ✓ | — | — |
| Gestionar métricas                  | ✓ | — | — |
| Registrar sujetos y aplicaciones    | ✓ | — | ✓ |
| Capturar valores de métricas        | ✓ | — | ✓ |
| Consultar aplicaciones y resultados | ✓ | ✓ | — |
| Exportar datos (CSV / JSON)         | ✓ | ✓ | — |
| Ver audit_log                       | ✓ | — | — |

---

## 4. Alcance del Sistema

### 4.1 Objetivo General

Proveer una plataforma de registro estructurado, estandarizado y trazable de métricas lingüísticas, operando bajo principios de anonimización, minimización y separación de identidad, con el propósito de construir el dataset fundacional que sustentará el análisis científico y el desarrollo de IA en fases posteriores del proyecto.

### 4.2 Funcionalidades por Fase

**Fase 1 — Módulos 1–4:**

- Autenticación con JWT de sesión única (6 h) y control de sesión. Sin mecanismo de refresh token.
- Cambio de contraseña autenticado con validación de contraseña actual.
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
| RNF-SEC-05 | Access token: 6 h (21 600 s). Se invalida en logout explícito, desactivación del usuario, o cambio de contraseña (`password_changed_at`). Sin mecanismo de refresh. | Tokens expirados retornan HTTP 401. |
| RNF-SEC-07 | Comunicación cifrada en tránsito en todas las capas. | HTTPS/TLS habilitado; ningún canal sin cifrar. |
| RNF-SEC-08 | Contraseñas almacenadas exclusivamente como hash bcrypt. | Ninguna contraseña en texto plano en ninguna capa. |
| RNF-SEC-09 | Credenciales y secretos nunca en código fuente ni variables sin cifrar. | Auditoría de código confirma ausencia de secretos expuestos. |
| RNF-SEC-10 | El frontend no accede directamente a la base de datos. | Solo el backend tiene conexión con PostgreSQL. |
| RNF-SEC-11 | Ningún registro de sujeto contiene PII. | Revisión de esquema confirma ausencia de PII en `Subject` y `ContextData`. |
| RNF-SEC-12 | Eventos de seguridad en audit_log con timestamp y usuario. El audit_log almacena el `jti` del token como referencia de sesión; nunca el token JWT completo. | audit_log cubre 100% de eventos: login, logout, intentos fallidos, accesos denegados, cambios de contraseña. Ningún registro contiene el JWT completo. |

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
| `User` | M1 | Usuario con rol y estado activo. Sin datos más allá de nombre y correo. |
| `Role` | M1 | Rol del sistema: `administrator`, `researcher`, `applicator`. |
| `AuditLog` | M1 | Eventos de sesión: login, logout, accesos denegados, cambios de contraseña. Almacena el `jti` del token como referencia; nunca el token completo. |
| `Instrument` | M2 | Instrumento metodológico con nombre único, descripción, periodo de vigencia y estado. |
| `Metric` | M3 | Métrica asociada a un instrumento. Declara `MetricType`, rango opcional y obligatoriedad. |
| `Subject` | M4 | Sujeto MOCK identificado exclusivamente por UUID. Sin PII. |
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
| `age_cohort` | string de rango | ej. `"6-8"` · `"9-11"` · `"12-14"` · `"15-17"` |
| `gender` | categórico | `male` · `female` · `non_binary` · `prefer_not_to_say` |
| `socioeconomic_level` | categórico | `low` · `medium` · `high` · `unknown` |
| `additional_attributes` | objeto JSON abierto | Atributos metodológicos futuros no definidos aún (clave-valor libre). |

### 6.4 Principios de Datos

- **Anonimización:** la identidad de los sujetos no puede derivarse de los datos almacenados.
- **Minimización:** solo se registran los datos estrictamente necesarios para el fin metodológico.
- **Separación de identidad:** los datos identificativos se mantienen desvinculados de los datos lingüísticos.
- **No eliminación:** ninguna entidad puede eliminarse permanentemente. Solo cambios de estado (`active` / `inactive`).

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

- Formulario de inicio de sesión y cambio de contraseña.
- Panel de administración: gestión de usuarios, instrumentos y métricas.
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
| **Solo el admin crea usuarios** | No existe registro público. Solo el Administrador crea cuentas. |
| **Sin eliminación permanente** | Usuarios, instrumentos y todos los registros históricos son inactivables, no eliminables. |
| **Backend en Python** | Python 3.11+, FastAPI, SQLAlchemy, Alembic, bcrypt. |
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

1. El administrador crea un usuario Investigador y un usuario Aplicador.
2. Ambos usuarios se autentican correctamente y reciben un access token (6 h).
3. Un token expirado es rechazado con 401; el usuario debe autenticarse nuevamente con sus credenciales.
4. El aplicador cambia su contraseña tras validar correctamente la contraseña actual.
5. El administrador registra un instrumento con descripción y periodo de vigencia.
6. El administrador define métricas para el instrumento (tipo, rango, obligatoriedad).
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

El despliegue se realiza en un **clúster Docker Swarm** operado sobre los equipos físicos del equipo de desarrollo.

### 10.1 Etapa 1 — Fase 1 (Módulos 1–4)

Módulos interdependientes desplegados simultáneamente (**Big Bang controlado**). No existe tráfico de producción previo. El stack completo se valida en el clúster antes de habilitar acceso al equipo.

Servicios activos: Frontend · Backend (M1–M4) · PostgreSQL.

### 10.2 Etapa 2 — Fase 2 (Módulos 5–6)

Los endpoints de consulta y exportación se habilitan primero para Investigadores (**Canary**), se valida la integridad del dataset exportado y se realiza rollout completo una vez confirmado el comportamiento correcto.

**Precondición:** M1–M4 completos y validados conforme a su DoD.

### 10.3 Fases Posteriores — IA

Estrategia **Blue/Green**: el entorno activo continúa operando mientras el entorno con IA se valida en paralelo. Switch solo cuando Green está completamente validado.

**Precondición:** Dataset exportado y validado por el equipo de investigación.

---

## 11. Trazabilidad de Requisitos

| Requisito | Historia de Usuario | Módulo | Entidades | Endpoint principal |
|---|---|---|---|---|
| RF-M1-01 | HU1 – Crear usuario | M1 | `User`, `Role` | `POST /users` |
| RF-M1-02 | HU2 – Activar/desactivar usuario | M1 | `User` | `PATCH /users/{id}/status` |
| RF-M1-03 | HU3 – Iniciar sesión | M1 | `User`, `AuditLog` | `POST /auth/login` |
| RF-M1-06 | HU6b – Cambiar contraseña | M1 | `User`, `AuditLog` | `PATCH /users/me/password` |
| RF-M1-04 | HU4 – Cerrar sesión | M1 | `AuditLog`, Token blacklist | `POST /auth/logout` |
| RF-M1-05 | HU5 – Restringir por rol | M1 | `Role` | Middleware `/api/v1/*` |
| RF-M2-01 | HU6 – Crear instrumento | M2 | `Instrument` | `POST /instruments` |
| RF-M2-02 | HU7 – Descripción metodológica | M2 | `Instrument` | `PATCH /instruments/{id}` |
| RF-M2-03 | HU8 – Periodo de aplicación | M2 | `Instrument` | `PATCH /instruments/{id}` |
| RF-M2-04 | HU9 – Activar/desactivar instrumento | M2 | `Instrument` | `PATCH /instruments/{id}/status` |
| RF-M3-01 | HU10 – Crear métrica | M3 | `Metric`, `Instrument` | `POST /metrics` |
| RF-M3-02 | HU11 – Tipo de dato | M3 | `Metric` (`MetricType`) | `POST /metrics` |
| RF-M3-03 | HU12 – Rango válido | M3 | `Metric` | `PATCH /metrics/{id}` |
| RF-M3-04 | HU13 – Obligatoriedad | M3 | `Metric` | `POST /metrics` · `PATCH /metrics/{id}` |
| RF-M4-01 | HU14 – Registrar sujeto | M4 | `Subject` | `POST /subjects` |
| RF-M4-02 | HU15 – Registrar contexto | M4 | `ContextData`, `Subject` | `POST /subjects/{id}/context` |
| RF-M4-03 | HU16 – Registrar aplicación | M4 | `TestApplication` | `POST /applications` |
| RF-M4-04 | HU17 – Capturar valores | M4 | `MetricValue` | `POST /metric-values` |
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
| **Control de acceso** | Solo Aplicador/Administrador acceden a datos de sujetos | RBAC en todos los endpoints M4 |
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
