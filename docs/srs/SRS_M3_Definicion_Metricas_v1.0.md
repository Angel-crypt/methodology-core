# SRS – Módulo 3: Definición Estructurada de Métricas
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

Este documento define los requisitos funcionales y no funcionales del **Módulo 3 – Definición Estructurada de Métricas** del Sistema de Registro Metodológico de Métricas Lingüísticas.

El módulo tiene como propósito permitir la configuración formal de las métricas que componen cada instrumento metodológico. Una métrica define qué se va a medir, cómo se va a validar y si es obligatoria. Sin métricas correctamente definidas, el Módulo 4 no puede construir el formulario dinámico de captura ni validar los valores registrados.

El documento está dirigido a:
- **Desarrolladores:** como guía de implementación de endpoints, validaciones de tipo de dato y lógica de obligatoriedad.
- **Testers / QA:** como base para casos de prueba funcionales, negativos y de integración con M4.
- **Stakeholders:** como contrato técnico que define el alcance y los límites del módulo.

### 1.2 Alcance del Documento

Este documento cubre:
- Creación de métricas asociadas a un instrumento, con validación de unicidad por instrumento.
- Declaración del tipo de dato (`MetricType`) de cada métrica.
- Definición de rango válido (`min_value`, `max_value`) para métricas numéricas.
- Definición de opciones válidas (`options`) para métricas categóricas.
- Declaración de obligatoriedad (`required`) de cada métrica.
- Edición de atributos de una métrica existente.
- Consulta de métricas por instrumento.

Se relaciona con:
- **M1 – Autenticación:** provee JWT, validación de roles y membresía de proyectos.
- **M2 – Gestión de Instrumentos:** las métricas se asocian a instrumentos existentes en M2, los cuales pertenecen a un proyecto.
- **M4 – Registro Operativo:** consume las métricas para construir el formulario dinámico y validar los valores capturados.

Quedan **fuera del alcance**: registro de valores de métricas (M4), análisis o interpretación de métricas, gestión de instrumentos (M2).

### 1.3 Definiciones y Glosario

| Término | Definición |
|---|---|
| **Métrica** | Variable que define qué se mide en un instrumento: nombre, tipo de dato, rango, opciones y obligatoriedad. |
| **MetricType** | Enumeración de tipos válidos: `numeric`, `categorical`, `boolean`, `short_text`. |
| **min_value / max_value** | Rango válido para métricas de tipo `numeric`. Nulo para otros tipos. |
| **options** | Lista de valores válidos para métricas de tipo `categorical`. Requerida al crear. |
| **required** | Booleano que indica si la métrica debe ser capturada en toda aplicación del instrumento. |
| **Unicidad por instrumento** | No se pueden registrar dos métricas con el mismo nombre dentro del mismo instrumento. Se permite repetir nombres entre instrumentos distintos. |
| **Formulario dinámico** | El formulario de captura de M4 se construye leyendo las métricas de M3; varía según tipo y opciones. |

### 1.4 Referencias

- `SRS_General_v1.0.md` — Especificación general del sistema.
- `SRS_M2_Gestion_Instrumentos_V2.md` — SRS del módulo del que depende.
- `MockContract_M3_Metricas_v1.xml` — Contrato de mock server del módulo.
- `Módulos_del_Sistema_y_Tareas_Asociadas.docx` — Backlog con HU10–HU13.
- `Modulo_3_PO.docx` — Documento de dominio con métricas de referencia del proyecto.

### 1.5 Estructura del Documento

Las secciones 1–3 establecen el contexto, actores y alcance. La sección 5 detalla cada requisito funcional con entidad, endpoint y flujo. La sección 6 define los atributos de calidad. Las secciones 7–10 cubren interfaces, restricciones, criterios de aceptación por HU y la matriz de trazabilidad.

---

## 2. Contexto del Módulo

### 2.1 Descripción del Módulo

El Módulo 3 permite la configuración formal de las métricas que componen cada instrumento metodológico. Actúa como la capa de configuración entre la definición del instrumento (M2) y la captura de datos operativos (M4): establece las reglas de validación que M4 debe aplicar al registrar valores.

### 2.2 Problema que Resuelve

Sin métricas definidas, M4 no tiene forma de saber qué campos capturar, qué tipo de dato esperar, qué rango es válido ni qué campos son obligatorios. El módulo resuelve este problema proporcionando un catálogo estructurado de métricas por instrumento con las reglas de validación ya definidas.

### 2.3 Relación con Otros Módulos

```
M1 – Autenticación
  └─ provee JWT + RBAC ─────────────────────▶ M3 – Definición de Métricas
                                                        │
M2 – Gestión de Instrumentos                           │
  └─ provee instrumentos existentes ──────────────────▶│
                                                        │
                                                        ▼
                                             M4 – Registro Operativo
                                             (consume métricas para
                                              formulario dinámico y
                                              validación de valores)
```

### 2.4 Dependencias con Otros Componentes

| Dependencia | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | El middleware JWT de M1 debe estar operativo. Solo el SUPERADMIN puede crear y editar métricas. |
| **M2 – Gestión de Instrumentos** | Consumidor | El instrumento referenciado por `instrument_id` debe existir en M2. |
| **PostgreSQL** | Infraestructura | Almacena la entidad `Metric`. |
| **Alembic** | Infraestructura | Migraciones de la tabla `metrics` antes del primer uso. |

### 2.5 Flujo General de Interacción

1. El SUPERADMIN se autentica en M1 y obtiene un JWT.
2. Consulta los instrumentos disponibles en M2 (`GET /instruments`).
3. Crea una o más métricas para un instrumento mediante `POST /instruments/{instrument_id}/metrics`, declarando tipo, rango, opciones y obligatoriedad.
4. Si necesita ajustar una métrica, la edita mediante `PATCH /instruments/{instrument_id}/metrics/{metric_id}`.
5. M4 consulta `GET /instruments/{instrument_id}/metrics` para construir el formulario dinámico de captura y conocer las reglas de validación.

---

## 3. Stakeholders y Usuarios del Módulo

### 3.1 Stakeholders del Módulo

| Rol | Interés en el módulo | Responsabilidades relacionadas |
|---|---|---|
| **Equipo de desarrollo** | Implementar correctamente las validaciones de MetricType y las reglas dependientes. | Codificar, documentar y probar el módulo conforme al SRS y al DoD. |
| **Investigadores / responsables metodológicos** | Que las métricas reflejen fielmente las variables del protocolo de investigación. | Validar que las métricas creadas correspondan al diseño metodológico del estudio. |
| **Responsable técnico** | Asegurar disponibilidad de las métricas para M4. | Revisar migraciones, aprobar PRs y firmar cierre de historias. |
| **Testers / QA** | Verificar todas las validaciones de tipo, rango y opciones. | Diseñar y ejecutar casos de prueba funcionales, negativos y de integración con M4. |

### 3.2 Tipos de Usuarios

| Tipo | Descripción | Nivel de acceso | Funcionalidades que utiliza |
|---|---|---|---|
| **SUPERADMIN** | Control total sobre la definición de métricas. | Lectura y escritura. | Crear, editar y consultar métricas. |
| **Investigador** | Usuario académico de consulta. | Solo lectura. | Consultar métricas disponibles por instrumento. |
| **Aplicador** | Profesional que aplica los instrumentos en campo. | Solo lectura. | Consultar métricas del instrumento al preparar la captura en M4. |

---

## 4. Alcance del Módulo

### 4.1 Objetivo del Módulo

Proveer al sistema una capa de configuración formal de las variables medibles por instrumento, con reglas de tipo, rango y obligatoriedad, garantizando que M4 pueda validar los valores capturados de forma consistente y reproducible.

### 4.2 Funcionalidades Principales

- Creación de métricas asociadas a un instrumento con validación de unicidad de nombre por instrumento.
- Declaración del tipo de dato (`MetricType`): `numeric`, `categorical`, `boolean`, `short_text`.
- Definición de rango válido (`min_value`, `max_value`) exclusivamente para métricas de tipo `numeric`.
- Definición de opciones válidas (`options`) requerida para métricas de tipo `categorical`.
- Declaración de obligatoriedad (`required`): si es `true`, M4 rechaza el registro si el valor no está presente.
- Edición de atributos de métricas existentes con re-validación de campos dependientes al cambiar el tipo.
- Consulta de métricas por instrumento (accesible para todos los roles autenticados).

### 4.3 Fuera del Alcance

| Funcionalidad excluida | Módulo responsable |
|---|---|
| Registro de valores de métricas durante una aplicación. | M4 – Registro Operativo |
| Creación o modificación de instrumentos. | M2 – Gestión de Instrumentos |
| Análisis estadístico o interpretación de métricas. | M5 / M6 / Fases posteriores |
| Eliminación permanente de métricas. | No permitida en ningún módulo |
| Creación o modificación de métricas por roles distintos al SUPERADMIN. | Restringido por RBAC |

---

## 5. Requisitos Funcionales

> Todos los endpoints bajo `/api/v1`. Todas las respuestas siguen `{ "status", "message", "data" }`.

---

### RF-M3-01 – Crear métrica *(HU10)*

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `Metric`, `Instrument` |
| **Endpoint** | `POST /instruments/{instrument_id}/metrics` |
| **Entrada** | `name` (string, obligatorio), `metric_type` (enum `MetricType`, obligatorio), `required` (boolean, obligatorio), `description` (string, opcional), `min_value` (number, condicional), `max_value` (number, condicional), `options` (array de strings, condicional) |
| **Descripción** | El SUPERADMIN puede registrar una métrica asociada a un instrumento. El nombre debe ser único dentro del instrumento. Los campos condicionales se aplican según `MetricType`. |
| **Resultado** | Métrica registrada con UUID. HTTP 201. |

**Reglas de validación por MetricType:**

| Tipo | min_value / max_value | options |
|---|---|---|
| `numeric` | Opcionales. Si se envían, deben cumplir `min < max`. | **HTTP 400** si se envía. |
| `categorical` | **HTTP 400** si se envían. | **Requerido**. Debe ser array no vacío. |
| `boolean` | Se ignoran. | Se ignoran. |
| `short_text` | Se ignoran. | Se ignoran. |

---

### RF-M3-02 – Declarar tipo de dato *(HU11)*

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `Metric` (campo `metric_type`) |
| **Endpoint** | `PATCH /instruments/{instrument_id}/metrics/{metric_id}` |
| **Entrada** | `metric_type` (enum `MetricType`) |
| **Descripción** | El SUPERADMIN puede declarar o cambiar el tipo de dato de una métrica. Al editar, el sistema re-valida los campos dependientes. |

**Tipos de dato válidos (`MetricType`):**

| Valor | Descripción |
|---|---|
| `numeric` | Valor numérico entero o decimal. Admite `min_value` y `max_value` opcionales. |
| `categorical` | Valor de lista cerrada de opciones definidas en `options[]`. Requiere `options` al crear. |
| `boolean` | Valor `true` o `false`. Sin campos adicionales. |
| `short_text` | Texto corto descriptivo sin estructura fija. Sin campos adicionales. |

---

### RF-M3-03 – Definir rango válido *(HU12)*

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `Metric` (campos `min_value`, `max_value`) |
| **Endpoint** | `PATCH /instruments/{instrument_id}/metrics/{metric_id}` |
| **Entrada** | `min_value` (number), `max_value` (number) |
| **Descripción** | El SUPERADMIN puede establecer o actualizar el rango válido para métricas de tipo `numeric`. Para otros tipos retorna HTTP 400. |
| **Resultado** | Rango actualizado. HTTP 200. |

---

### RF-M3-04 – Definir obligatoriedad *(HU13)*

| Campo | Detalle |
|---|---|
| **Actor** | SUPERADMIN |
| **Entidades** | `Metric` (campo `required`) |
| **Endpoint** | `PATCH /instruments/{instrument_id}/metrics/{metric_id}` |
| **Entrada** | `required` (boolean) |
| **Descripción** | El SUPERADMIN puede marcar cada métrica como obligatoria u opcional. Si `required = true`, M4 rechaza el registro si falta esa métrica. |
| **Resultado** | Obligatoriedad actualizada. HTTP 200. |

---

### RF-M3-LIST – Consultar métricas del instrumento

| Campo | Detalle |
|---|---|
| **Actor** | Cualquier usuario autenticado |
| **Entidades** | `Metric` |
| **Endpoint** | `GET /instruments/{instrument_id}/metrics` |
| **Descripción** | Cualquier usuario puede consultar las métricas del instrumento. Consumido por M4 para construir el formulario dinámico. |
| **Resultado** | Lista de métricas. HTTP 200. |

---

## 6. Requisitos No Funcionales

| ID | Categoría | Descripción | Métrica verificable |
|---|---|---|---|
| RNF-M3-01 | Rendimiento | Los endpoints responden en tiempo razonable. | `GET /instruments/{instrument_id}/metrics` < 500 ms. `POST` y `PATCH` < 1 segundo. |
| RNF-M3-02 | Seguridad | Todos los endpoints requieren JWT válido. Solo el SUPERADMIN puede crear y editar. | Sin token → 401. Rol incorrecto en escritura → 403. |
| RNF-M3-03 | Integridad | Unicidad de nombre de métrica dentro del mismo instrumento. | No existen dos métricas con el mismo nombre en el mismo instrumento. Duplicado → 409. |
| RNF-M3-04 | Integridad | Los campos condicionales se validan según `MetricType`. | `min_value`/`max_value` en no-numeric → 400. `options` vacío en categorical → 400. |
| RNF-M3-05 | Integridad | El instrumento referenciado en `instrument_id` debe existir. | Instrumento inexistente → 404. |
| RNF-M3-06 | Mantenibilidad | Código modular. Permisos en archivo centralizado. | Tabla de permisos en un único archivo de configuración. Cobertura de tests ≥ 80%. |
| RNF-M3-07 | Consistencia API | Todas las respuestas siguen `{ "status", "message", "data" }`. | 100% de endpoints retornan estructura estándar. |

---

## 7. Interfaces Externas

### 7.1 Interfaces con Otros Módulos

| Módulo | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | Valida JWT y rol en cada petición. Sin M1 operativo, ningún endpoint es accesible. |
| **M2 – Gestión de Instrumentos** | Consumidor | M3 referencia instrumentos existentes en M2. Si el instrumento no existe → 404. |
| **M4 – Registro Operativo** | Proveedor | M4 consulta `GET /instruments/{instrument_id}/metrics` para construir el formulario dinámico y aplicar validaciones. |

### 7.2 Interfaces de Usuario

- Formulario de creación de métrica: instrumento destino, nombre, tipo de dato, obligatoriedad, rango (si numeric), opciones (si categorical), descripción.
- Formulario de edición de métrica: mismos campos, con re-validación de dependencias al cambiar tipo.
- Listado de métricas por instrumento: accesible para todos los roles, muestra todos los atributos.

### 7.3 Interfaces de Software

| Componente | Descripción |
|---|---|
| **FastAPI** | Expone los endpoints REST bajo `/api/v1/instruments/{instrument_id}/metrics`. |
| **SQLAlchemy + PostgreSQL** | ORM y base de datos para la entidad `Metric`. |
| **Alembic** | Migraciones de la tabla `metrics`. |
| **Pydantic** | Validación de esquemas de entrada y salida, incluyendo validaciones condicionales por `MetricType`. |

### 7.4 Interfaces de Comunicación

- Base path: `/api/v1`
- Protocolo: HTTP/HTTPS · Formato: JSON
- Autenticación: `Authorization: Bearer {access_token}` en todos los endpoints.

---

## 8. Restricciones y Supuestos

### 8.1 Restricciones

| # | Restricción | Detalle |
|---|---|---|
| R1 | Lenguaje | Python 3.11+. `snake_case` variables/funciones, `PascalCase` clases. |
| R2 | Framework | FastAPI. |
| R3 | Base de datos | PostgreSQL exclusivamente. |
| R4 | Migraciones | Todas las tablas mediante Alembic. Sin creación manual. |
| R5 | Sin eliminación de métricas | Las métricas no pueden eliminarse permanentemente. |
| R6 | MetricType fijo | El enum `MetricType` tiene exactamente cuatro valores: `numeric`, `categorical`, `boolean`, `short_text`. |
| R7 | Respuesta estándar | Todos los endpoints retornan `{ "status", "message", "data" }` sin excepción. |

### 8.2 Supuestos

| # | Supuesto |
|---|---|
| S1 | El usuario posee un JWT válido y activo emitido por M1. |
| S2 | El middleware de M1 está operativo y accesible. |
| S3 | PostgreSQL está operativo y las migraciones del módulo ejecutadas. |
| S4 | Los instrumentos a los que se asociarán métricas ya existen en M2. |
| S5 | El frontend valida formatos antes de enviar, pero el backend realiza su propia validación independientemente. |

---

## 9. Criterios de Aceptación

### HU10 – Crear métrica *(RF-M3-01)*

Se considera aceptado si:
- El SUPERADMIN puede crear una métrica con nombre, tipo, obligatoriedad y descripción mediante `POST /instruments/{instrument_id}/metrics`.
- La métrica queda asociada al instrumento indicado en el path.
- HTTP 409 si ya existe una métrica con ese nombre en el mismo instrumento.
- HTTP 404 si el instrumento referenciado no existe.
- HTTP 403 si el solicitante no es SUPERADMIN.
- HTTP 400 si falta algún campo obligatorio.
- La métrica aparece en `GET /instruments/{instrument_id}/metrics`.

### HU11 – Declarar tipo de dato *(RF-M3-02)*

Se considera aceptado si:
- El SUPERADMIN puede asignar un tipo del enum `MetricType` al crear o editar una métrica.
- HTTP 400 si el `metric_type` no es uno de los cuatro valores válidos.
- Al editar el tipo, los campos dependientes se re-validan correctamente.
- M4 rechaza valores cuyo tipo no coincide con el `metric_type` declarado.

### HU12 – Definir rango válido *(RF-M3-03)*

Se considera aceptado si:
- El SUPERADMIN puede definir `min_value` y `max_value` para métricas de tipo `numeric`.
- HTTP 400 si se envían `min_value` o `max_value` para una métrica no numérica.
- HTTP 400 si `min_value >= max_value`.
- M4 rechaza valores numéricos fuera del rango `[min_value, max_value]` con mensaje descriptivo.
- HTTP 404 si la métrica no existe.
- HTTP 403 si el solicitante no es SUPERADMIN.

### HU13 – Definir obligatoriedad *(RF-M3-04)*

Se considera aceptado si:
- El SUPERADMIN puede marcar cualquier métrica como obligatoria (`required: true`) u opcional (`required: false`).
- La obligatoriedad puede cambiar mediante `PATCH /instruments/{instrument_id}/metrics/{metric_id}`.
- M4 rechaza el registro completo de valores si alguna métrica con `required: true` no está presente en el envío.
- HTTP 404 si la métrica no existe.
- HTTP 403 si el solicitante no es SUPERADMIN.

### Criterios adicionales de integración con M4

- `GET /instruments/{instrument_id}/metrics` retorna todos los atributos necesarios para que M4 construya el formulario dinámico.
- Los cuatro tipos de `MetricType` se reflejan correctamente en la lógica de captura de M4.
- La operación atómica de M4 (`POST /metric-values`) falla completamente si alguna métrica obligatoria está ausente o algún valor viola las reglas definidas en M3.

---

## 10. Trazabilidad de Requisitos

| Requisito | Historia de Usuario | Entidades | Endpoint | Casos de prueba clave |
|---|---|---|---|---|
| RF-M3-01 | HU10 – Crear métrica | `Metric`, `Instrument` | `POST /instruments/{instrument_id}/metrics` | TC-01: creación exitosa · TC-02: nombre duplicado en mismo instrumento (409) · TC-03: instrumento inexistente (404) · TC-04: sin permiso (403) · TC-05: campo obligatorio ausente (400) |
| RF-M3-02 | HU11 – Tipo de dato | `Metric` (`MetricType`) | `POST /instruments/{instrument_id}/metrics` · `PATCH /instruments/{instrument_id}/metrics/{metric_id}` | TC-06: tipo válido asignado · TC-07: tipo inválido (400) · TC-08: categorical sin options (400) · TC-09: numeric con options ignorado · TC-10: cambio de tipo con re-validación |
| RF-M3-03 | HU12 – Rango válido | `Metric` (`min_value`, `max_value`) | `PATCH /instruments/{instrument_id}/metrics/{metric_id}` | TC-11: rango válido asignado · TC-12: rango en no-numeric (400) · TC-13: min >= max (400) · TC-14: M4 rechaza valor fuera de rango |
| RF-M3-04 | HU13 – Obligatoriedad | `Metric` (`required`) | `POST /instruments/{instrument_id}/metrics` · `PATCH /instruments/{instrument_id}/metrics/{metric_id}` | TC-15: required:true asignado · TC-16: required:false asignado · TC-17: M4 rechaza registro si falta métrica requerida |
| RF-M3-LIST | Soporte a M4 | `Metric` | `GET /instruments/{instrument_id}/metrics` | TC-18: retorna todas las métricas del instrumento · TC-19: sin token (401) · TC-20: campos completos en respuesta · TC-21: instrumento sin métricas retorna array vacío |
| RNF-M3-03 | HU10 | `Metric` | `POST /instruments/{instrument_id}/metrics` | TC-02: nombre duplicado en mismo instrumento (409) · TC-22: mismo nombre en distinto instrumento (permitido) |
| RNF-M3-04 | HU11, HU12 | `Metric` | `POST /instruments/{instrument_id}/metrics` · `PATCH /instruments/{instrument_id}/metrics/{metric_id}` | TC-08: categorical sin options · TC-12: min_value en boolean · TC-23: max_value en short_text |

---

*Módulo 3 – Definición Estructurada de Métricas · SRS v1.0 · 2026-03-12*
