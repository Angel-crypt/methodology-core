# SRS – Módulo 5: Consulta Interna Básica
**Sistema de Registro Metodológico de Métricas Lingüísticas**
**Versión:** 1.0 · **Fecha:** 2026-03-12 · **Estado:** Borrador

> **Nota de planificación:** Este módulo se desarrolla una vez que los Módulos 1–4 estén completos y validados conforme a su DoD. Su desarrollo es **precondición** para el Módulo 6.

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

Este documento define los requisitos funcionales y no funcionales del **Módulo 5 – Consulta Interna Básica** del Sistema de Registro Metodológico de Métricas Lingüísticas.

El módulo permite a los roles con acceso de lectura revisar de forma estructurada el dataset acumulado por los Módulos 1–4, sin realizar análisis estadístico ni interpretación de resultados. Su propósito es dar visibilidad operativa sobre las aplicaciones registradas y servir como paso de validación previo a la exportación del dataset en M6.

El documento está dirigido a:
- **Desarrolladores:** como guía de implementación de los endpoints de consulta, paginación y filtros.
- **Testers / QA:** como base para casos de prueba funcionales, negativos y de integración con M4.
- **Stakeholders:** como contrato técnico que define el alcance y los límites del módulo.

### 1.2 Alcance del Documento

Este documento cubre:
- Consulta paginada del listado de aplicaciones registradas con sus valores de métricas.
- Filtrado de aplicaciones por instrumento metodológico.
- Filtrado de aplicaciones por rango de fechas.
- Combinación de filtros en una misma consulta.

Se relaciona con:
- **M1 – Autenticación:** provee JWT y validación de rol para todos los endpoints.
- **M4 – Registro Operativo:** fuente de los datos que este módulo consulta.
- **M6 – Exportación:** consume la misma capa de datos que M5 para generar archivos descargables.

Quedan **fuera del alcance**: análisis estadístico, interpretación de resultados, exportación de archivos (M6), modificación de registros existentes, consulta de sujetos individuales con detalle (cubierto por `GET /subjects/{id}` en M4).

### 1.3 Definiciones y Glosario

| Término | Definición |
|---|---|
| **Aplicación** | Evento de administración de un instrumento a un sujeto, con sus valores de métricas asociados. Entidad central de consulta en este módulo. |
| **Paginación** | Mecanismo que divide el listado de resultados en páginas de tamaño fijo para evitar respuestas de gran volumen. Parámetros: `page` y `page_size`. |
| **Filtro por instrumento** | Restricción de resultados a aplicaciones de un instrumento específico, identificado por `instrument_id`. |
| **Filtro por periodo** | Restricción de resultados a aplicaciones cuya `application_date` esté dentro de un rango `[start_date, end_date]`. |
| **Dataset** | Conjunto de todas las aplicaciones registradas con sus valores de métricas. Insumo para análisis externos. |
| **Solo lectura** | Este módulo no modifica ningún dato. Exclusivamente operaciones GET. |

### 1.4 Referencias

- `SRS_General_v1.0.md` — Especificación general del sistema.
- `SRS_M4_Registro_Operativo_v1.0.md` — SRS del módulo que genera los datos consultados.
- `SRS_M6_Exportacion_Estructurada_v1.0.md` — SRS del módulo que consume estos datos.
- `Módulos_del_Sistema_y_Tareas_Asociadas.docx` — Backlog con HU18–HU20.

### 1.5 Estructura del Documento

Las secciones 1–3 establecen el contexto, actores y alcance. La sección 5 detalla los tres requisitos funcionales con sus endpoints y flujos. La sección 6 define los atributos de calidad. Las secciones 7–10 cubren interfaces, restricciones, criterios de aceptación por HU y la matriz de trazabilidad.

---

## 2. Contexto del Módulo

### 2.1 Descripción del Módulo

El Módulo 5 es la primera capa de acceso al dataset construido por los Módulos 1–4. Permite revisar las aplicaciones registradas con sus valores de métricas de forma paginada y filtrable, sin modificar ningún dato. Es el paso de validación interna previo a la exportación formal del dataset.

### 2.2 Problema que Resuelve

Una vez que el dataset empieza a poblarse mediante M4, los investigadores necesitan una forma de revisar lo que se ha registrado: verificar que los instrumentos se están aplicando correctamente, que los rangos de fechas son los esperados y que el volumen de datos es consistente con el plan metodológico. Sin este módulo, el dataset es opaco hasta que se exporta.

### 2.3 Relación con Otros Módulos

```
M1 – Autenticación
  └─ provee JWT + RBAC ─────────────────────────▶ M5 – Consulta Interna
                                                           ▲
M4 – Registro Operativo                                    │
  └─ genera aplicaciones y MetricValues ──────────────────▶│
                                                           │
                                                           ▼
                                                  M6 – Exportación
                                                  (consume misma capa de datos)
```

### 2.4 Dependencias con Otros Componentes

| Dependencia | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | El middleware JWT de M1 debe estar operativo. Solo Investigador y Administrador pueden consultar. |
| **M4 – Registro Operativo** | Consumidor | Los datos consultados son los generados por M4: `TestApplication`, `MetricValue`, `Subject`, `ContextData`, `Instrument`, `Metric`. |
| **PostgreSQL** | Infraestructura | Las consultas se ejecutan contra la base de datos compartida del sistema. |

### 2.5 Flujo General de Interacción

```
Investigador o Administrador
  → Se autentica en M1 → obtiene token JWT
  → GET /applications (paginado, sin filtros) → revisa listado general
  → GET /applications?instrument_id={id} → revisa aplicaciones de un instrumento
  → GET /applications?start_date={}&end_date={} → revisa aplicaciones de un periodo
  → Combina filtros: ?instrument_id={}&start_date={}&end_date={}
  → Valida integridad del dataset antes de proceder a exportación en M6
```

---

## 3. Stakeholders y Usuarios del Módulo

### 3.1 Stakeholders del Módulo

| Rol | Interés en el módulo | Responsabilidades relacionadas |
|---|---|---|
| **Investigadores / responsables metodológicos** | Verificar que el dataset refleja el protocolo de investigación antes de exportar. | Validar volumen, fechas y consistencia de aplicaciones registradas. |
| **Equipo de desarrollo** | Implementar correctamente paginación, filtros y estructura de respuesta. | Codificar, documentar y probar conforme al SRS y al DoD. |
| **Testers / QA** | Verificar todos los criterios incluyendo casos de filtros combinados y vacíos. | Diseñar y ejecutar pruebas funcionales, negativas y de integración. |

### 3.2 Tipos de Usuarios

| Tipo | Descripción | Nivel de acceso | Funcionalidades que utiliza |
|---|---|---|---|
| **Administrador** | Control total del sistema. | Solo lectura en M5. | Consulta paginada, filtros por instrumento y por periodo. |
| **Investigador** | Usuario académico de consulta. | Solo lectura. | Consulta paginada, filtros por instrumento y por periodo. |
| **Aplicador** | Profesional de campo. | Sin acceso a M5. | No puede consultar el dataset. |

---

## 4. Alcance del Módulo

### 4.1 Objetivo del Módulo

Permitir la revisión estructurada y filtrable del dataset de aplicaciones registradas, sin realizar análisis estadístico ni modificar ningún dato, como paso de validación previo a la exportación formal en M6.

### 4.2 Funcionalidades Principales

- Listado paginado de aplicaciones con sus valores de métricas asociados.
- Filtrado por instrumento metodológico (`instrument_id`).
- Filtrado por rango de fechas de aplicación (`start_date`, `end_date`).
- Combinación de ambos filtros en una misma consulta.

### 4.3 Fuera del Alcance

| Funcionalidad excluida | Módulo responsable |
|---|---|
| Exportación del dataset en CSV o JSON. | M6 – Exportación Estructurada |
| Análisis estadístico o interpretación de resultados. | Fases posteriores |
| Modificación de registros existentes. | No permitida en este módulo |
| Consulta de sujeto individual con detalle. | M4 – `GET /subjects/{id}` |
| Consulta de métricas o instrumentos. | M2 / M3 |
| Acceso por rol Aplicador. | Restringido por RBAC de M1 |

---

## 5. Requisitos Funcionales

> Todos los endpoints bajo `/api/v1`. Todas las respuestas siguen `{ "status", "message", "data" }`.
> Este módulo es de **solo lectura**. No expone endpoints de escritura.

---

### RF-M5-01 – Consultar aplicaciones registradas *(HU18)*

| Campo | Detalle |
|---|---|
| **Actor** | Investigador / Administrador |
| **Entidades** | `TestApplication`, `MetricValue`, `Subject`, `Instrument`, `Metric` |
| **Endpoint** | `GET /applications` |
| **Entrada** | `page` (integer, opcional, default: 1), `page_size` (integer, opcional, default: 20, máx: 100) |
| **Descripción** | El sistema debe devolver el listado paginado de aplicaciones registradas. Cada elemento del listado incluye: identificador de la aplicación, UUID del sujeto, nombre del instrumento, fecha de aplicación y el conjunto de valores de métricas capturados (métrica + valor). La respuesta incluye metadatos de paginación: página actual, tamaño de página, total de registros y total de páginas. |
| **Resultado** | Listado paginado de aplicaciones con métricas asociadas. HTTP 200. |

**Estructura de respuesta (elemento del listado):**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador de la aplicación |
| `subject_id` | UUID | UUID del sujeto (sin PII) |
| `instrument_name` | string | Nombre del instrumento aplicado |
| `application_date` | date | Fecha de la aplicación |
| `metric_values` | array | Lista de `{ metric_name, metric_type, value }` |

**Metadatos de paginación:**

| Campo | Tipo | Descripción |
|---|---|---|
| `page` | integer | Página actual |
| `page_size` | integer | Registros por página |
| `total_records` | integer | Total de aplicaciones en el sistema (con filtros aplicados) |
| `total_pages` | integer | Total de páginas |

---

### RF-M5-02 – Filtrar por instrumento *(HU19)*

| Campo | Detalle |
|---|---|
| **Actor** | Investigador / Administrador |
| **Entidades** | `TestApplication`, `Instrument` |
| **Endpoint** | `GET /applications?instrument_id={id}` |
| **Entrada** | `instrument_id` (UUID, query param), más los parámetros de paginación de RF-M5-01 |
| **Descripción** | El sistema debe filtrar el listado de aplicaciones retornando únicamente las correspondientes al instrumento indicado. Si el instrumento no existe, retorna HTTP 404. Si el instrumento existe pero no tiene aplicaciones registradas, retorna listado vacío con metadatos de paginación correctos (total_records = 0). El filtro es combinable con el filtro por periodo (RF-M5-03). |
| **Resultado** | Listado paginado con únicamente aplicaciones del instrumento indicado. HTTP 200. |

---

### RF-M5-03 – Filtrar por periodo *(HU20)*

| Campo | Detalle |
|---|---|
| **Actor** | Investigador / Administrador |
| **Entidades** | `TestApplication` |
| **Endpoint** | `GET /applications?start_date={date}&end_date={date}` |
| **Entrada** | `start_date` (date ISO 8601, query param), `end_date` (date ISO 8601, query param), más parámetros de paginación |
| **Descripción** | El sistema debe filtrar el listado de aplicaciones retornando únicamente las cuya `application_date` esté dentro del rango `[start_date, end_date]` (ambos extremos inclusivos). El sistema valida el formato de las fechas antes de ejecutar la consulta. Si `start_date > end_date`, retorna HTTP 400. Si se proporciona solo uno de los dos parámetros, el sistema lo interpreta como límite abierto: solo `start_date` → desde esa fecha hasta hoy; solo `end_date` → desde el inicio hasta esa fecha. El filtro es combinable con el filtro por instrumento (RF-M5-02). |
| **Resultado** | Listado paginado con aplicaciones dentro del periodo indicado. HTTP 200. |

---

## 6. Requisitos No Funcionales

| ID | Categoría | Descripción | Métrica verificable |
|---|---|---|---|
| RNF-M5-01 | Rendimiento | Las consultas responden en tiempo razonable con el volumen esperado. | `GET /applications` con hasta 1,000 registros: < 2 segundos. |
| RNF-M5-02 | Rendimiento | La paginación evita respuestas de gran volumen. | `page_size` máximo: 100. Solicitudes con `page_size > 100` retornan 400. |
| RNF-M5-03 | Seguridad | Solo Investigador y Administrador pueden acceder. | Aplicador → 403. Sin token → 401. |
| RNF-M5-04 | Integridad | El módulo es de solo lectura. No modifica ningún dato. | 0 operaciones de escritura en la base de datos originadas por este módulo. |
| RNF-M5-05 | Integridad | Los filtros no retornan datos de otros instrumentos o periodos. | Verificable en pruebas de aislamiento de filtros. |
| RNF-M5-06 | Integridad | Las respuestas no exponen PII de los sujetos. | Solo UUID en el campo `subject_id`. Sin nombre, CURP ni ningún campo identificable. |
| RNF-M5-07 | Consistencia API | Todas las respuestas siguen `{ "status", "message", "data" }`. | 100% de endpoints retornan estructura estándar. Listados vacíos retornan array vacío, no null. |

---

## 7. Interfaces Externas

### 7.1 Interfaces con Otros Módulos

| Módulo | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | Valida JWT y rol en cada petición. Sin M1 operativo, ningún endpoint es accesible. |
| **M4 – Registro Operativo** | Consumidor | M5 consulta los datos generados por M4: `TestApplication`, `MetricValue`, `Subject`, `Instrument`, `Metric`. No modifica ninguna de estas entidades. |
| **M6 – Exportación** | Relacionado | M6 opera sobre la misma capa de datos. M5 sirve como validación previa a la exportación formal. |

### 7.2 Interfaces de Usuario

- Tabla paginada de aplicaciones con columnas: sujeto (UUID), instrumento, fecha, valores de métricas.
- Selector de instrumento para filtrar el listado.
- Selector de rango de fechas (fecha inicio / fecha fin) para filtrar.
- Controles de paginación: número de página, registros por página, total de resultados.

### 7.3 Interfaces de Software

| Componente | Descripción |
|---|---|
| **FastAPI** | Expone los endpoints REST bajo `/api/v1/applications`. |
| **SQLAlchemy + PostgreSQL** | ORM y base de datos. Consultas de solo lectura sobre `TestApplication`, `MetricValue`, `Subject`, `Instrument`, `Metric`. |
| **Pydantic** | Validación de parámetros de entrada (fechas, paginación). |

### 7.4 Interfaces de Comunicación

- Base path: `/api/v1`
- Protocolo: HTTP/HTTPS · Formato: JSON
- Autenticación: `Authorization: Bearer {token}` en todos los endpoints.

---

## 8. Restricciones y Supuestos

### 8.1 Restricciones

| # | Restricción | Detalle |
|---|---|---|
| R1 | Solo lectura | Este módulo no expone ningún endpoint de escritura. |
| R2 | Precondición de M1–M4 | M5 solo puede desarrollarse y desplegarse una vez M1–M4 estén completos y validados. |
| R3 | Sin análisis | M5 no calcula estadísticas, promedios ni clasificaciones. Solo expone los datos tal como fueron registrados. |
| R4 | Anonimización | Las respuestas nunca exponen PII. Solo UUID de sujeto. |
| R5 | Paginación obligatoria | Toda consulta de listado retorna resultados paginados. Sin endpoint que retorne el dataset completo sin paginar. |
| R6 | Respuesta estándar | Todos los endpoints retornan `{ "status", "message", "data" }` sin excepción. |

### 8.2 Supuestos

| # | Supuesto |
|---|---|
| S1 | Los Módulos 1–4 están completos, desplegados y con datos registrados en la base de datos. |
| S2 | El middleware de M1 está operativo y accesible. |
| S3 | PostgreSQL está operativo y accesible desde el servicio backend. |
| S4 | El volumen de aplicaciones registradas al momento de desarrollar M5 no supera las 1,000 para las pruebas de rendimiento. |

---

## 9. Criterios de Aceptación

### HU18 – Consultar aplicaciones registradas *(RF-M5-01)*

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU18-01 | Investigador autenticado consulta `GET /applications`. | Listado paginado con metadatos. HTTP 200. |
| CA-HU18-02 | Cada elemento del listado incluye UUID del sujeto, instrumento, fecha y valores de métricas. | Sin PII expuesta. Solo UUID en `subject_id`. |
| CA-HU18-03 | Se solicita una página que excede el total de páginas. | Listado vacío con metadatos correctos (no error). |
| CA-HU18-04 | Se solicita `page_size > 100`. | HTTP 400 con mensaje descriptivo. |
| CA-HU18-05 | Aplicador intenta acceder. | HTTP 403 Forbidden. |
| CA-HU18-06 | Sin token JWT. | HTTP 401 Unauthorized. |
| CA-HU18-07 | No hay ninguna aplicación registrada en el sistema. | HTTP 200 con listado vacío y `total_records = 0`. |

### HU19 – Filtrar por instrumento *(RF-M5-02)*

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU19-01 | Se filtra por `instrument_id` válido con aplicaciones registradas. | Solo aparecen aplicaciones de ese instrumento. |
| CA-HU19-02 | Se filtra por `instrument_id` válido sin aplicaciones registradas. | HTTP 200 con listado vacío y `total_records = 0`. |
| CA-HU19-03 | Se filtra por `instrument_id` inexistente. | HTTP 404 con mensaje descriptivo. |
| CA-HU19-04 | Se combinan `instrument_id` y rango de fechas en la misma consulta. | Solo aparecen aplicaciones del instrumento indicado dentro del periodo indicado. |

### HU20 – Filtrar por periodo *(RF-M5-03)*

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU20-01 | Se filtra con `start_date` y `end_date` válidos. | Solo aplicaciones dentro del rango `[start_date, end_date]`. |
| CA-HU20-02 | Se filtra solo con `start_date`. | Aplicaciones desde `start_date` hasta hoy. |
| CA-HU20-03 | Se filtra solo con `end_date`. | Aplicaciones desde el inicio del dataset hasta `end_date`. |
| CA-HU20-04 | `start_date > end_date`. | HTTP 400 con mensaje descriptivo. |
| CA-HU20-05 | Formato de fecha inválido. | HTTP 400 con mensaje descriptivo. |
| CA-HU20-06 | Rango válido pero sin aplicaciones en ese periodo. | HTTP 200 con listado vacío y `total_records = 0`. |

---

## 10. Trazabilidad de Requisitos

| Requisito | Historia de Usuario | Entidades | Endpoint | Casos de prueba clave |
|---|---|---|---|---|
| RF-M5-01 | HU18 – Consultar aplicaciones | `TestApplication`, `MetricValue`, `Subject`, `Instrument`, `Metric` | `GET /applications` | CA-HU18-01 a 07 |
| RF-M5-02 | HU19 – Filtrar por instrumento | `TestApplication`, `Instrument` | `GET /applications?instrument_id=` | CA-HU19-01 a 04 |
| RF-M5-03 | HU20 – Filtrar por periodo | `TestApplication` | `GET /applications?start_date=&end_date=` | CA-HU20-01 a 06 |

---

*Módulo 5 – Consulta Interna Básica · SRS v1.0 · 2026-03-12*
