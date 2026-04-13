# SRS – Módulo 4: Registro Operativo Anonimizado
**Sistema de Registro Metodológico de Métricas Lingüísticas**
**Versión:** 1.0 · **Fecha:** 2026-03-12 · **Estado:** Borrador

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

Este documento define los requisitos funcionales y no funcionales del **Módulo 4 – Registro Operativo Anonimizado** del Sistema de Registro Metodológico de Métricas Lingüísticas.

El módulo es el punto de entrada de datos del sistema. Permite a los profesionales registrar la aplicación de instrumentos metodológicos a sujetos de estudio, capturando los valores de cada métrica con validación estructural. Toda la información se registra bajo principios estrictos de anonimización: los sujetos son identificados exclusivamente por UUID generado automáticamente, sin ningún dato personal identificable.

El documento está dirigido a:
- **Desarrolladores:** como guía de implementación de los cuatro flujos de registro y sus validaciones.
- **Testers / QA:** como base para casos de prueba funcionales, negativos y de integración con M2 y M3.
- **Stakeholders:** como contrato técnico que define el alcance y los límites del módulo.

### 1.2 Alcance del Documento

Este documento cubre:
- Registro de sujetos MOCK con UUID automático, sin datos personales identificables.
- Registro de datos contextuales no identificables asociados a un sujeto.
- Registro de la aplicación de un instrumento metodológico a un sujeto.
- Captura y validación atómica de valores de métricas para una aplicación.
- Consulta básica de un sujeto y su contexto.

Se relaciona con:
- **M1 – Autenticación:** provee JWT y validación de rol para todos los endpoints.
- **M2 – Gestión de Instrumentos:** M4 valida que el instrumento esté activo y dentro de su periodo de vigencia.
- **M3 – Definición de Métricas:** M4 valida tipo, rango y obligatoriedad de cada valor capturado.
- **M5 – Consulta Interna:** M5 consulta los datos registrados por este módulo.
- **M6 – Exportación:** M6 exporta los datos registrados por este módulo.

Quedan **fuera del alcance**: análisis o interpretación de los datos capturados, exportación (M6), consulta avanzada (M5), gestión de instrumentos (M2), gestión de métricas (M3).

### 1.3 Definiciones y Glosario

| Término | Definición |
|---|---|
| **Sujeto MOCK** | Persona evaluada registrada exclusivamente mediante UUID. Sin nombre, CURP, dirección ni ningún dato que permita identificarla. |
| **UUID** | Identificador único universal generado automáticamente por el sistema al registrar un sujeto. |
| **ContextData** | Datos contextuales no identificables asociados a un sujeto: tipo de escuela, nivel educativo, cohorte de edad, género y nivel socioeconómico. |
| **TestApplication** | Evento que registra la aplicación de un instrumento a un sujeto en una fecha dada. |
| **MetricValue** | Valor capturado para una métrica específica en el contexto de una aplicación. |
| **Vigencia** | Periodo definido por `start_date` y `end_date` del instrumento durante el cual puede recibir aplicaciones. |
| **Operación atómica** | Si alguna validación falla en `POST /metric-values`, ningún valor del lote se persiste. |
| **Formulario dinámico** | El frontend construye el formulario de captura consultando las métricas de M3 para el instrumento seleccionado. |

### 1.4 Referencias

- `SRS_General_v1.0.md` — Especificación general del sistema.
- `SRS_M2_Gestion_Instrumentos_V2.md` — SRS del Módulo 2.
- `SRS_M3_Definicion_Metricas_v1.0.md` — SRS del Módulo 3.
- `MockContract_M4_RegistroOperativo_v1.xml` — Contrato de mock server del módulo.
- `Módulos_del_Sistema_y_Tareas_Asociadas.docx` — Backlog con HU14–HU17.
- `Modulo4_Registro_Operativo_Anonimizado.docx` — Scope y DoD del módulo.

### 1.5 Estructura del Documento

Las secciones 1–3 establecen el contexto, actores y alcance. La sección 5 detalla los cuatro flujos de registro con sus validaciones. La sección 6 define los atributos de calidad. Las secciones 7–10 cubren interfaces, restricciones, criterios de aceptación por HU y la matriz de trazabilidad.

---

## 2. Contexto del Módulo

### 2.1 Descripción del Módulo

El Módulo 4 es el componente operativo del sistema: donde los datos del estudio efectivamente se capturan y persisten. Es el módulo más complejo desde el punto de vista de validaciones, ya que debe verificar la consistencia con M2 (instrumento activo y vigente) y con M3 (tipo de dato, rango y obligatoriedad de cada métrica) antes de persistir cualquier registro.

### 2.2 Problema que Resuelve

Sin este módulo no existen datos en el sistema. Los módulos M2 y M3 definen la estructura; M4 la popula con datos reales. Adicionalmente, garantiza que los datos capturados sean consistentes, estructurados y anonimizados, condiciones indispensables para que el dataset resultante sea utilizable científicamente.

### 2.3 Cuasi-Identificabilidad y Privacidad de ContextData (GAP-SEG-01, 2026-03-22)

> **Adicionado en revisión 2026-03-22** · Referencia: `mock/SECURITY_REPORT.md §SEG-01`, `SRS_General §12`

#### 2.3.1 Naturaleza de los Datos de Contexto

Aunque el sistema no almacena PII directa, los atributos de `ContextData` son **cuasi-identificables**: ninguno identifica individualmente a un sujeto, pero la combinación de 4 o más atributos puede permitir reidentificación en datasets pequeños. El considerando 26 del RGPD (y equivalente LFPDPPP Art. 3°) reconoce este riesgo.

**Nivel de riesgo por campo:**

| Campo | Tipo | Riesgo individual | Riesgo combinado |
|---|---|---|---|
| `age_cohort` | Cuasi-identificable | Bajo (rango de edad, no edad exacta) | Medio |
| `gender` | Cuasi-identificable | Bajo (4 valores) | Medio |
| `education_level` | Cuasi-identificable | Bajo (5 valores) | Medio |
| `school_type` | Cuasi-identificable | Muy bajo (3 valores) | Bajo |
| `socioeconomic_level` | Cuasi-identificable | Bajo (4 valores) | Bajo |
| `additional_attributes` | Variable | Variable | Alto si contiene datos únicos |

#### 2.3.2 Restricciones sobre `additional_attributes`

Para mitigar el riesgo de introducción accidental de PII a través del campo libre `additional_attributes`, el sistema **impone las siguientes restricciones** (GAP-SEG-04):

| Restricción | Valor | Razón |
|---|---|---|
| Máximo de claves | 5 | Limitar superficie de datos |
| Longitud de clave | ≤ 50 caracteres | Evitar encodings de datos largos |
| Longitud de valor (string) | ≤ 200 caracteres | Evitar textos identificables |
| Lista negra de nombres de campo | nombre, apellido, dni, rut, email, telefono, direccion, birthdate, foto, curp, ssn, etc. | Prevenir carga de PII directa |

El servidor retorna HTTP 400 ante cualquier violación de estas restricciones.

#### 2.3.3 Restricción sobre `age_cohort`

El campo `age_cohort` debe expresarse **exclusivamente como rango** (formato `N-N`, ej: `"6-8"`), nunca como edad exacta. El sistema valida este formato mediante regex `^\d+-\d+$` con longitud máxima de 20 caracteres.

**Razón:** Una edad exacta combinada con los demás atributos aumenta significativamente el riesgo de reidentificación. Un rango de 2-3 años reduce este riesgo de forma efectiva.

#### 2.3.4 Implicaciones para el Equipo de Investigación

- Al diseñar los atributos de `additional_attributes`, el equipo debe verificar que no permitan identificar al sujeto individualmente.
- El equipo debe documentar la justificación metodológica de cada atributo adicional antes de incluirlo.
- En la exportación (M6, Fase 2), considerar generalización adicional de atributos para el dataset público.

### 2.4 Relación con Otros Módulos

```
M1 – Autenticación
  └─ provee JWT + RBAC ──────────────────────────────────▶ M4 – Registro Operativo
                                                                    ▲
M2 – Gestión de Instrumentos                                        │
  └─ instrumento activo y vigente ─────────────────────────────────▶│
                                                                    │
M3 – Definición de Métricas                                         │
  └─ tipo, rango, options, required ──────────────────────────────▶│
                                                                    │
                                                        M5 – Consulta ──▶ M6 – Exportación
                                                        (consulta datos de M4)
```

### 2.4 Dependencias con Otros Componentes

| Dependencia | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | Solo Aplicador y Administrador pueden registrar. Todos los autenticados pueden consultar. |
| **M2 – Gestión de Instrumentos** | Consumidor | Al registrar una aplicación, el instrumento debe existir, estar `active` y dentro de su periodo de vigencia. |
| **M3 – Definición de Métricas** | Consumidor | Al capturar valores, cada valor se valida contra el tipo, rango y opciones definidos en M3. Las métricas con `required: true` deben estar presentes. |
| **PostgreSQL** | Infraestructura | Almacena `Subject`, `ContextData`, `TestApplication`, `MetricValue`. |
| **Alembic** | Infraestructura | Migraciones de las tablas del módulo antes del primer uso. |

### 2.5 Flujo General de Registro

```
1. POST /subjects
   → Sistema genera UUID automáticamente
   → Retorna UUID (sin ningún dato personal)

2. POST /subjects/{id}/context
   → Registra datos contextuales no identificables para el sujeto
   → Valida que el sujeto exista

3. POST /applications
   → Registra la aplicación del instrumento al sujeto
   → Valida: sujeto existe · instrumento activo · instrumento vigente

4. POST /metric-values
   → Captura todos los valores de métricas de la aplicación
   → Valida para cada valor: tipo correcto · rango válido · opciones válidas
   → Valida que todas las métricas required estén presentes
   → Operación atómica: falla completa o éxito completo
```

---

## 3. Stakeholders y Usuarios del Módulo

### 3.1 Stakeholders del Módulo

| Rol | Interés en el módulo | Responsabilidades relacionadas |
|---|---|---|
| **Equipo de desarrollo** | Implementar correctamente todas las validaciones y la operación atómica. | Codificar, documentar y probar el módulo conforme al SRS y al DoD. |
| **Investigadores / responsables metodológicos** | Que los datos capturados sean íntegros, consistentes y anonimizados. | Validar que el flujo de registro respete el protocolo metodológico. |
| **Profesionales Aplicadores** | Sistema usable en campo para registrar aplicaciones de forma ágil. | Aplicar instrumentos y capturar datos conforme al protocolo. |
| **Responsable técnico** | Disponibilidad e integridad de los datos para M5 y M6. | Revisar migraciones, aprobar PRs, firmar cierre de historias. |
| **Testers / QA** | Verificar todas las validaciones incluyendo los casos de fallo atómico. | Diseñar y ejecutar casos de prueba funcionales, negativos y de integración. |

### 3.2 Tipos de Usuarios

| Tipo | Descripción | Nivel de acceso | Funcionalidades que utiliza |
|---|---|---|---|
| **Administrador** | Control total del sistema. | Lectura y escritura. | Puede ejecutar todos los flujos del módulo. |
| **Profesional Aplicador** | Profesional habilitado para aplicar instrumentos. | Escritura operativa. | Registro de sujetos, contextos, aplicaciones y captura de valores. |
| **Investigador** | Usuario académico. | Solo lectura. | Consultar sujetos y sus datos contextuales (sin PII). |

---

## 4. Alcance del Módulo

### 4.1 Objetivo del Módulo

Permitir la captura estructurada, validada y anonimizada de datos lingüísticos derivados de la aplicación de instrumentos metodológicos a sujetos de estudio, generando el dataset que alimentará los módulos de consulta y exportación.

### 4.2 Funcionalidades Principales

- Registro de sujetos MOCK con UUID generado automáticamente. Sin datos PII.
- Registro de datos contextuales no identificables: tipo de escuela, nivel educativo, cohorte de edad, género, nivel socioeconómico y atributos adicionales (objeto abierto).
- Registro de aplicaciones con validación de instrumento activo y vigente.
- Captura atómica de valores de métricas con validación de tipo, rango, opciones y obligatoriedad.
- Consulta de sujeto por UUID, incluyendo su contexto si existe.

### 4.3 Fuera del Alcance

| Funcionalidad excluida | Módulo responsable |
|---|---|
| Registro de datos personales identificables de los sujetos. | No permitido en ningún módulo. |
| Creación o modificación de instrumentos. | M2 – Gestión de Instrumentos |
| Creación o modificación de métricas. | M3 – Definición de Métricas |
| Consulta paginada del dataset con filtros. | M5 – Consulta Interna |
| Exportación de datos en CSV o JSON. | M6 – Exportación Estructurada |
| Análisis estadístico o interpretación de resultados. | Fases posteriores |
| Gestión de usuarios o autenticación. | M1 – Autenticación |

---

## 5. Requisitos Funcionales

> Todos los endpoints bajo `/api/v1`. Todas las respuestas siguen `{ "status", "message", "data" }`.

---

### RF-M4-01 – Registrar sujeto anonimizado *(HU14)*

| Campo | Detalle |
|---|---|
| **Actor** | Profesional Aplicador / Administrador |
| **Entidades** | `Subject` |
| **Endpoint** | `POST /subjects` |
| **Entrada** | Sin body. El body debe estar vacío o ausente. JWT en Authorization header. |
| **Descripción** | El sistema debe registrar un sujeto MOCK generando automáticamente un UUID como único identificador. No se almacena ningún dato que permita identificar a la persona: sin nombre, CURP, dirección, fecha de nacimiento exacta ni cualquier otro PII. El UUID es el único vínculo entre el sujeto y sus aplicaciones posteriores. El backend rechaza con HTTP 400 cualquier solicitud cuyo body contenga campos, independientemente de su nombre o valor. Este rechazo activo implementa Privacy by Design (AD-09): el sistema no acepta silenciosamente datos no declarados. |
| **Resultado** | Sujeto registrado. Respuesta incluye exclusivamente `id` (UUID) y `created_at`. HTTP 201. Si el body contiene campos: HTTP 400. |

---

### RF-M4-02 – Registrar contexto no identificable *(HU15)*

| Campo | Detalle |
|---|---|
| **Actor** | Profesional Aplicador / Administrador |
| **Entidades** | `ContextData` (relacionada con `Subject`) |
| **Endpoint** | `POST /subjects/{id}/context` |
| **Entrada** | `school_type`, `education_level`, `age_cohort`, `gender`, `socioeconomic_level` (todos opcionales individualmente), `additional_attributes` (objeto JSON abierto, opcional) |
| **Descripción** | El sistema debe permitir registrar datos contextuales mínimos no identificables para un sujeto existente. Ningún atributo permite identificar directa ni indirectamente al sujeto. El sistema valida que el sujeto exista antes de persistir el contexto. Los valores deben pertenecer a los enums definidos metodológicamente para cada atributo. |
| **Resultado** | Contexto registrado y vinculado al UUID del sujeto. HTTP 201. |

**Atributos de contexto y valores permitidos:**

| Atributo | Valores permitidos |
|---|---|
| `school_type` | `public` · `private` · `unknown` |
| `education_level` | `preschool` · `primary_lower` (1°–3°) · `primary_upper` (4°–6°) · `secondary` · `unknown` |
| `age_cohort` | String de rango libre. Ej: `"6-8"` · `"9-11"` · `"12-14"` · `"15-17"`. Se recomienda rangos de 2–3 años para anonimización efectiva. |
| `gender` | `male` · `female` · `non_binary` · `prefer_not_to_say` |
| `socioeconomic_level` | `low` · `medium` · `high` · `unknown` |
| `additional_attributes` | Objeto JSON abierto (clave-valor libre). Para atributos metodológicos futuros. |

---

### RF-M4-03 – Registrar aplicación de prueba *(HU16)*

| Campo | Detalle |
|---|---|
| **Actor** | Profesional Aplicador / Administrador |
| **Entidades** | `TestApplication` (relaciona `Subject` + `Instrument`) |
| **Endpoint** | `POST /applications` |
| **Entrada** | `subject_id` (UUID, obligatorio), `instrument_id` (UUID, obligatorio), `application_date` (date ISO 8601, opcional — usa fecha actual si no se proporciona), `notes` (string, opcional) |
| **Descripción** | El sistema debe registrar la aplicación de un instrumento metodológico a un sujeto. Antes de persistir valida: (1) que el sujeto exista, (2) que el instrumento exista y esté en estado `active`, (3) que la fecha de aplicación esté dentro del periodo de vigencia del instrumento (`start_date ≤ application_date ≤ end_date`). Si el instrumento existe pero está `inactive`, retorna HTTP 422 (no 404). |
| **Resultado** | Aplicación registrada con id, subject_id, instrument_id y application_date. HTTP 201. |

**Validaciones específicas:**

| Condición | Código HTTP | Descripción |
|---|---|---|
| Sujeto o instrumento no encontrado | 404 | El recurso no existe en el sistema. |
| Instrumento existe pero está `inactive` | 422 | El instrumento no puede recibir nuevas aplicaciones. |
| `application_date` fuera del periodo de vigencia | 400 | La fecha no está dentro de `[start_date, end_date]`. |
| Formato de `application_date` inválido | 400 | La fecha no cumple el formato ISO 8601. |

---

### RF-M4-04 – Capturar valores de métricas *(HU17)*

| Campo | Detalle |
|---|---|
| **Actor** | Profesional Aplicador / Administrador |
| **Entidades** | `MetricValue` (relaciona `TestApplication` + `Metric`) |
| **Endpoint** | `POST /metric-values` |
| **Entrada** | `application_id` (UUID, obligatorio), `values` (array de objetos `{ metric_id, value }`, obligatorio) |
| **Descripción** | El sistema debe registrar el conjunto de valores de métricas de una aplicación. Esta operación es **atómica**: si cualquier validación falla en cualquier valor del lote, ningún valor se persiste. Para cada valor en `values` el sistema valida: (1) que la aplicación exista, (2) que la métrica pertenezca al instrumento de esa aplicación, (3) que el tipo del valor coincida con `metric_type` de la métrica, (4) que el valor esté dentro de `[min_value, max_value]` si `metric_type = numeric`, (5) que el valor esté dentro de `options` si `metric_type = categorical`. Adicionalmente valida que todas las métricas marcadas como `required: true` en el instrumento estén presentes en el envío. Si alguna validación falla, retorna HTTP 400 con un array `errors[]` detallando cada problema. |
| **Resultado** | Todos los valores registrados exitosamente. HTTP 201. O HTTP 400 con `errors[]` si alguna validación falla (nada se persiste). |

**Reglas de validación por MetricType:**

| Tipo | Validación del valor |
|---|---|
| `numeric` | Debe ser número. Si `min_value` y/o `max_value` definidos, debe estar dentro del rango `[min, max]`. |
| `categorical` | Debe ser string perteneciente a `options[]` de la métrica. |
| `boolean` | Debe ser `true` o `false`. |
| `short_text` | Debe ser string. Sin restricciones adicionales de contenido. |

**Validación de obligatoriedad:**
- Todas las métricas del instrumento con `required: true` deben estar presentes en `values[]`.
- Si alguna falta, la operación completa falla con HTTP 400, indicando cuáles métricas requeridas están ausentes.

---

### RF-M4-GET-SUBJECT – Consultar sujeto *(soporte)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador, Investigador, Aplicador |
| **Entidades** | `Subject`, `ContextData` |
| **Endpoint** | `GET /subjects/{id}` |
| **Entrada** | `id` (UUID, path param) |
| **Descripción** | El sistema debe devolver los datos de un sujeto: su UUID y, si existe, su contexto asociado. No expone ningún dato personal identificable. Accesible por todos los roles autenticados. |
| **Resultado** | Datos del sujeto con contexto anidado si existe. HTTP 200. |

---

## 6. Requisitos No Funcionales

| ID | Categoría | Descripción | Métrica verificable |
|---|---|---|---|
| RNF-M4-01 | Rendimiento | Los endpoints responden en tiempo razonable. | Todos los endpoints < 2 segundos. |
| RNF-M4-02 | Seguridad | Ningún registro de sujeto contiene PII. | Revisión de esquema confirma ausencia de campos PII en `Subject` y `ContextData`. |
| RNF-M4-03 | Seguridad | Solo Aplicador y Administrador pueden registrar datos. | Investigador intentando escribir → 403. Sin token → 401. |
| RNF-M4-04 | Integridad | La captura de valores de métricas es atómica. | Si cualquier validación falla, ningún valor del lote se persiste. 0% de lotes parcialmente guardados. |
| RNF-M4-05 | Integridad | El instrumento debe estar activo y dentro de vigencia al registrar una aplicación. | Instrumento inactivo → 422. Fecha fuera de vigencia → 400. |
| RNF-M4-06 | Integridad | Los valores se validan contra las definiciones de M3 (tipo, rango, opciones, obligatoriedad). | Valores de tipo incorrecto, fuera de rango o fuera de opciones → 400. Métricas requeridas ausentes → 400. |
| RNF-M4-07 | Integridad | Integridad referencial: sin registros huérfanos. | `ContextData` siempre tiene `Subject` válido. `MetricValue` siempre tiene `TestApplication` válida. |
| RNF-M4-08 | Mantenibilidad | Código modular. Permisos en archivo centralizado. | Cobertura de tests ≥ 80%. Tabla de permisos en un único archivo de configuración. |
| RNF-M4-09 | Consistencia API | Todas las respuestas siguen `{ "status", "message", "data" }`. | 100% de endpoints retornan estructura estándar. Los errores incluyen `data.errors[]` cuando aplica. |

---

## 7. Interfaces Externas

### 7.1 Interfaces con Otros Módulos

| Módulo | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | Valida JWT y rol en cada petición. |
| **M2 – Gestión de Instrumentos** | Consumidor | Verifica estado `active` y vigencia (`start_date`, `end_date`) del instrumento al registrar una aplicación. |
| **M3 – Definición de Métricas** | Consumidor | Consulta las métricas del instrumento para validar cada `MetricValue`: tipo, rango, opciones y obligatoriedad. |
| **M5 – Consulta Interna** | Proveedor | M5 consulta `Subject`, `ContextData`, `TestApplication` y `MetricValue` registrados por M4. |
| **M6 – Exportación** | Proveedor | M6 exporta los datos registrados por M4. |

### 7.2 Interfaces de Usuario

- Formulario de registro de sujeto: botón único "Registrar nuevo sujeto" (sin campos de entrada PII). Muestra el UUID generado.
- Formulario de contexto: campos de selección para `school_type`, `education_level`, `age_cohort`, `gender`, `socioeconomic_level`.
- Formulario de aplicación: selector de instrumento activo, campo de fecha (opcional).
- Formulario dinámico de captura de métricas: generado a partir de `GET /metrics?instrument_id=`. Adapta el tipo de campo según `MetricType` de cada métrica. Indica visualmente las métricas obligatorias.

### 7.3 Interfaces de Software

| Componente | Descripción |
|---|---|
| **FastAPI** | Expone los endpoints REST del módulo. |
| **SQLAlchemy + PostgreSQL** | ORM y base de datos para `Subject`, `ContextData`, `TestApplication`, `MetricValue`. |
| **Alembic** | Migraciones del esquema de las tablas del módulo. |
| **Pydantic** | Validación de esquemas de entrada, incluyendo la validación condicional por `MetricType`. |

### 7.4 Interfaces de Comunicación

- Base path: `/api/v1`
- Protocolo: HTTP/HTTPS · Formato: JSON
- Autenticación: `Authorization: Bearer {access_token}` en todos los endpoints.

---

## 8. Restricciones y Supuestos

### 8.1 Restricciones

| # | Restricción | Detalle |
|---|---|---|
| R1 | Sin PII | Los sujetos se identifican exclusivamente mediante UUID. Cualquier campo PII es rechazado. |
| R2 | Lenguaje | Python 3.11+. `snake_case` variables/funciones, `PascalCase` clases. |
| R3 | Framework | FastAPI. |
| R4 | Base de datos | PostgreSQL exclusivamente. |
| R5 | Migraciones | Todas las tablas mediante Alembic. Sin creación manual. |
| R6 | Sin eliminación permanente | Ningún registro puede eliminarse. Solo inactivación de instrumentos (en M2). |
| R7 | Operación atómica | `POST /metric-values` persiste todos los valores o ninguno. Sin persistencia parcial. |
| R8 | Respuesta estándar | Todos los endpoints retornan `{ "status", "message", "data" }` sin excepción. Los errores de validación incluyen `data.errors[]`. |

### 8.2 Supuestos

| # | Supuesto |
|---|---|
| S1 | El usuario posee un JWT válido y activo emitido por M1. |
| S2 | El middleware de M1 está operativo y accesible. |
| S3 | Los instrumentos a usar ya existen y están configurados en M2. |
| S4 | Las métricas del instrumento ya están definidas en M3 antes de registrar valores. |
| S5 | PostgreSQL está operativo y las migraciones del módulo ejecutadas. |
| S6 | Los atributos de `ContextData` están aprobados metodológicamente: los cinco campos y el objeto `additional_attributes` están validados por el equipo de investigación. |

---

## 9. Criterios de Aceptación

### HU14 – Registrar sujeto anonimizado *(RF-M4-01)*

Se considera aceptado si:
- El Aplicador puede registrar un sujeto mediante `POST /subjects` sin enviar ningún dato personal.
- El sistema genera automáticamente un UUID como identificador del sujeto.
- La respuesta HTTP 201 contiene exclusivamente el `id` (UUID) y `created_at`.
- La tabla `Subject` no tiene ni puede tener campos PII (verificable en esquema de base de datos).
- HTTP 400 si el body contiene cualquier campo, independientemente de su nombre o valor.
- HTTP 403 si el solicitante es Investigador.
- HTTP 401 sin token JWT.

### HU15 – Registrar contexto no identificable *(RF-M4-02)*

Se considera aceptado si:
- El Aplicador puede registrar datos contextuales para un sujeto existente mediante `POST /subjects/{id}/context`.
- Los cinco atributos de contexto aceptan los valores definidos metodológicamente.
- El campo `additional_attributes` acepta cualquier objeto JSON válido.
- El sistema valida que el sujeto exista antes de registrar el contexto.
- HTTP 404 si el sujeto no existe.
- HTTP 400 si algún valor de atributo está fuera de los enums permitidos.
- HTTP 403 si el solicitante es Investigador.

### HU16 – Registrar aplicación de prueba *(RF-M4-03)*

Se considera aceptado si:
- El Aplicador puede registrar una aplicación especificando sujeto e instrumento.
- La aplicación se persiste si el instrumento está `active` y la fecha de aplicación está dentro de `[start_date, end_date]`.
- HTTP 422 si el instrumento existe pero está `inactive`.
- HTTP 400 si la fecha de aplicación está fuera del periodo de vigencia del instrumento.
- HTTP 404 si el sujeto o el instrumento no existen.
- HTTP 400 si el formato de la fecha es inválido.
- Si no se proporciona `application_date`, se usa la fecha actual.

### HU17 – Capturar valores de métricas *(RF-M4-04)*

Se considera aceptado si:
- El Aplicador puede enviar todos los valores de métricas de una aplicación en una sola llamada a `POST /metric-values`.
- El sistema valida cada valor contra el tipo, rango y opciones definidos en M3.
- El sistema verifica que todas las métricas `required: true` del instrumento estén presentes en el envío.
- Si todos los valores son válidos, todos se persisten con HTTP 201.
- Si cualquier valor falla la validación, ningún valor se persiste (operación atómica) y se retorna HTTP 400 con `data.errors[]` detallando cada fallo.
- HTTP 404 si la aplicación no existe.
- HTTP 403 si el solicitante es Investigador.

**Casos de validación específicos que deben pasar:**
- Valor numérico fuera de rango → rechazado con descripción del rango válido.
- Valor categórico fuera de `options` → rechazado con lista de opciones válidas.
- Valor de tipo incorrecto (ej. string en métrica numérica) → rechazado.
- Métrica `required: true` ausente → rechazado indicando qué métricas faltan.
- Envío con un valor inválido entre varios válidos → ningún valor se persiste.

---

## 10. Trazabilidad de Requisitos

| Requisito | Historia de Usuario | Entidades | Endpoint | Casos de prueba clave |
|---|---|---|---|---|
| RF-M4-01 | HU14 – Registrar sujeto | `Subject` | `POST /subjects` | TC-01: registro exitoso, UUID generado · TC-02: respuesta sin PII · TC-03: sin permiso Investigador (403) · TC-04: sin token (401) |
| RF-M4-02 | HU15 – Registrar contexto | `ContextData`, `Subject` | `POST /subjects/{id}/context` | TC-05: contexto registrado correctamente · TC-06: sujeto inexistente (404) · TC-07: school_type inválido (400) · TC-08: additional_attributes objeto libre aceptado |
| RF-M4-03 | HU16 – Registrar aplicación | `TestApplication` | `POST /applications` | TC-09: aplicación exitosa · TC-10: instrumento inactive (422) · TC-11: fecha fuera de vigencia (400) · TC-12: sujeto inexistente (404) · TC-13: instrumento inexistente (404) · TC-14: fecha automática si no se proporciona |
| RF-M4-04 | HU17 – Capturar valores | `MetricValue` | `POST /metric-values` | TC-15: captura exitosa, todos los valores persistidos · TC-16: valor numérico fuera de rango (400, atómico) · TC-17: valor categórico fuera de options (400, atómico) · TC-18: métrica required ausente (400, atómico) · TC-19: un valor inválido → ningún valor persiste · TC-20: tipo de dato incorrecto (400) · TC-21: aplicación inexistente (404) |
| RF-M4-GET-SUBJECT | Soporte | `Subject`, `ContextData` | `GET /subjects/{id}` | TC-22: sujeto con contexto · TC-23: sujeto sin contexto · TC-24: sujeto inexistente (404) · TC-25: sin PII en respuesta |
| RNF-M4-02 | HU14, HU15 | `Subject`, `ContextData` | `POST /subjects` · `POST /subjects/{id}/context` | TC-26: esquema de BD sin columnas PII · TC-27: intento de enviar PII rechazado |
| RNF-M4-04 | HU17 | `MetricValue` | `POST /metric-values` | TC-19: atomicidad verificada con fallo parcial |
| RNF-M4-05 | HU16 | `TestApplication`, `Instrument` | `POST /applications` | TC-10: instrumento inactive → 422 · TC-11: fecha fuera de vigencia → 400 |

---

*Módulo 4 – Registro Operativo Anonimizado · SRS v1.0 · 2026-03-12*
