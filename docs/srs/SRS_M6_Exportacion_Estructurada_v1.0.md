# SRS – Módulo 6: Exportación Estructurada
**Sistema de Registro Metodológico de Métricas Lingüísticas**
**Versión:** 1.0 · **Fecha:** 2026-03-12 · **Estado:** Borrador

> **Nota de planificación:** Este módulo se desarrolla una vez que los Módulos 1–5 estén completos y validados conforme a su DoD. Es el último módulo de la Fase 2 y precondición para las fases de IA.

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

Este documento define los requisitos funcionales y no funcionales del **Módulo 6 – Exportación Estructurada** del Sistema de Registro Metodológico de Métricas Lingüísticas.

El módulo es el punto de salida formal del dataset construido por los Módulos 1–4. Permite a los roles autorizados descargar el dataset completo en dos formatos estándar: CSV para análisis tabular y JSON para análisis jerárquico. Los archivos generados son el insumo directo para las fases posteriores de análisis estadístico y desarrollo de modelos LLM.

El documento está dirigido a:
- **Desarrolladores:** como guía de implementación de los endpoints de generación y descarga de archivos.
- **Testers / QA:** como base para casos de prueba funcionales, negativos y de validación de estructura de archivos.
- **Stakeholders:** como contrato técnico que define la estructura exacta de los archivos exportados.

### 1.2 Alcance del Documento

Este documento cubre:
- Generación y descarga del dataset en formato CSV con encabezados de métricas.
- Generación y descarga del dataset en formato JSON con jerarquía metodológica completa.
- Aplicación de filtros opcionales (por instrumento y por periodo) en la exportación.

Se relaciona con:
- **M1 – Autenticación:** provee JWT y validación de rol para todos los endpoints.
- **M4 – Registro Operativo:** fuente de los datos que este módulo exporta.
- **M5 – Consulta Interna:** valida la integridad del dataset antes de la exportación formal.

Quedan **fuera del alcance**: análisis estadístico de los datos exportados, construcción de perfiles lingüísticos, integración con modelos LLM, visualización analítica, exportación en otros formatos (Excel, Parquet, etc.), programación automática de exportaciones.

### 1.3 Definiciones y Glosario

| Término | Definición |
|---|---|
| **CSV** | Comma-Separated Values. Formato tabular de texto plano donde cada fila es una aplicación y cada columna es una métrica o campo de contexto. |
| **JSON** | JavaScript Object Notation. Formato jerárquico que preserva la estructura `Instrument → Application → MetricValues`. |
| **Jerarquía metodológica** | Estructura del JSON exportado: cada instrumento agrupa sus aplicaciones, y cada aplicación agrupa sus valores de métricas. |
| **Encabezados dinámicos** | Las columnas del CSV se generan a partir de los nombres de las métricas definidas en M3. Varían según los instrumentos incluidos en la exportación. |
| **Aplanamiento** | Proceso de convertir la estructura jerárquica de datos en una tabla plana para el CSV. Cada métrica se convierte en una columna. |
| **Exportación completa** | Sin filtros: incluye todas las aplicaciones de todos los instrumentos activos e inactivos. |
| **Exportación filtrada** | Con `instrument_id` y/o rango de fechas: incluye solo las aplicaciones que cumplen los criterios. |
| **Content-Disposition** | Header HTTP que fuerza la descarga del archivo en lugar de mostrarlo en el navegador. |

### 1.4 Referencias

- `SRS_General_v1.0.md` — Especificación general del sistema.
- `SRS_M4_Registro_Operativo_v1.0.md` — SRS del módulo que genera los datos exportados.
- `SRS_M5_Consulta_Interna_v1.0.md` — SRS del módulo de validación previa.
- `Módulos_del_Sistema_y_Tareas_Asociadas.docx` — Backlog con HU21–HU22.

### 1.5 Estructura del Documento

Las secciones 1–3 establecen el contexto, actores y alcance. La sección 5 detalla los dos requisitos funcionales con la estructura exacta de los archivos generados. La sección 6 define los atributos de calidad. Las secciones 7–10 cubren interfaces, restricciones, criterios de aceptación por HU y la matriz de trazabilidad.

---

## 2. Contexto del Módulo

### 2.1 Descripción del Módulo

El Módulo 6 es la puerta de salida del dataset del sistema. Genera archivos descargables que encapsulan el dataset completo (o filtrado) en formatos consumibles por herramientas de análisis externas. Es el último eslabón de la Fase 2 y la entrega formal del dataset a las fases de IA del proyecto.

### 2.2 Problema que Resuelve

Los datos registrados en M4 y validados en M5 necesitan salir del sistema en un formato estructurado y documentado para que los equipos de análisis estadístico y desarrollo de IA puedan trabajar con ellos. Sin este módulo, el dataset queda atrapado dentro del sistema y el objetivo del proyecto — construir modelos sobre datos reales — no puede avanzar.

### 2.3 Relación con Otros Módulos

```
M1 – Autenticación
  └─ provee JWT + RBAC ────────────────────────▶ M6 – Exportación Estructurada
                                                          ▲
M4 – Registro Operativo                                   │
  └─ genera el dataset ───────────────────────────────────┤
                                                          │
M5 – Consulta Interna                                     │
  └─ valida integridad previa ──────────────────────────▶│
                                                          │
                                              Archivo CSV / JSON descargable
                                                          │
                                              Equipos de análisis y fases de IA
```

### 2.4 Dependencias con Otros Componentes

| Dependencia | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticacion** | Consumidor | El middleware JWT de M1 debe estar operativo. Solo Investigador puede exportar. |
| **M4 – Registro Operativo** | Consumidor | M6 lee `TestApplication`, `MetricValue`, `Subject`, `ContextData`, `Instrument`, `Metric` para construir los archivos. |
| **M5 – Consulta Interna** | Relacionado | M5 valida la integridad del dataset antes de proceder a la exportación formal. |
| **PostgreSQL** | Infraestructura | Las consultas de exportación se ejecutan contra la base de datos compartida. |

### 2.5 Flujo General de Interacción

```
Investigador
  → Valida el dataset en M5 (revisión previa)
  → GET /export/csv [?instrument_id={}&start_date={}&end_date={}]
       → Sistema genera archivo CSV en memoria
       → Retorna archivo con Content-Disposition: attachment; filename="dataset_YYYYMMDD.csv"
  → GET /export/json [?instrument_id={}&start_date={}&end_date={}]
       → Sistema genera archivo JSON en memoria
       → Retorna archivo con Content-Disposition: attachment; filename="dataset_YYYYMMDD.json"
  → Archivo descargado → análisis externo / fases de IA
```

---

## 3. Stakeholders y Usuarios del Módulo

### 3.1 Stakeholders del Módulo

| Rol | Interés en el módulo | Responsabilidades relacionadas |
|---|---|---|
| **Investigadores / responsables metodológicos** | Obtener el dataset en el formato correcto para análisis externo. | Validar estructura y contenido del archivo antes de entregarlo a los equipos de IA. |
| **Equipo de desarrollo** | Implementar correctamente la generación de archivos y la estructura de datos. | Codificar, documentar y probar conforme al SRS y al DoD. |
| **Proyecto de IA (fases posteriores)** | Recibir el dataset en un formato estructurado y documentado. | Consumir los archivos exportados como insumo para modelos de análisis. |
| **Testers / QA** | Verificar estructura, contenido y rendimiento de los archivos generados. | Diseñar y ejecutar pruebas funcionales, de estructura y de rendimiento. |

### 3.2 Tipos de Usuarios

| Tipo | Descripción | Nivel de acceso | Funcionalidades que utiliza |
|---|---|---|---|
| **SUPERADMIN** | Control operativo del sistema. | Sin acceso a exportacion. | — |
| **Investigador** | Usuario académico. | Exportación completa y filtrada. | `GET /export/csv`, `GET /export/json`. |
| **Aplicador** | Profesional de campo. | Sin acceso a M6. | No puede exportar datos. |

---

## 4. Alcance del Módulo

### 4.1 Objetivo del Módulo

Permitir la extracción del dataset de aplicaciones lingüísticas en formatos estándar (CSV y JSON), con filtros opcionales, generando archivos estructurados y documentados que sirvan de insumo directo para análisis externos y fases de IA.

### 4.2 Funcionalidades Principales

- Generación y descarga del dataset completo en formato CSV, con encabezados dinámicos por nombre de métrica.
- Generación y descarga del dataset completo en formato JSON, con jerarquía `Instrument → Application → MetricValues`.
- Filtrado opcional por instrumento (`instrument_id`) en ambos formatos.
- Filtrado opcional por rango de fechas (`start_date`, `end_date`) en ambos formatos.
- Nombre de archivo con fecha de generación en el header `Content-Disposition`.

### 4.3 Fuera del Alcance

| Funcionalidad excluida | Razón |
|---|---|
| Análisis estadístico de los datos exportados. | Responsabilidad de las fases posteriores. |
| Construcción de perfiles lingüísticos. | Responsabilidad de las fases de IA. |
| Exportación en Excel (.xlsx), Parquet u otros formatos. | Puede considerarse en versiones futuras. |
| Programación automática de exportaciones (jobs periódicos). | Fuera del MVP. |
| Visualización analítica del dataset. | Fuera del alcance del sistema en esta fase. |
| Acceso por rol Aplicador. | Restringido por RBAC de M1. |

---

## 5. Requisitos Funcionales

> Todos los endpoints bajo `/api/v1`. Todas las respuestas de error siguen `{ "status", "message", "data" }`.
> Las respuestas exitosas son archivos binarios (CSV o JSON) con header `Content-Disposition: attachment`.

---

### RF-M6-01 – Exportar dataset en CSV *(HU21)*

| Campo | Detalle |
|---|---|
| **Actor** | Investigador |
| **Entidades** | `TestApplication`, `MetricValue`, `Subject`, `ContextData`, `Instrument`, `Metric` |
| **Endpoint** | `GET /export/csv` |
| **Entrada** | `instrument_id` (UUID, query param, opcional), `start_date` (date ISO 8601, opcional), `end_date` (date ISO 8601, opcional) |
| **Descripción** | El sistema debe generar un archivo CSV descargable con el dataset de aplicaciones. Cada fila representa una aplicación. Las columnas incluyen campos fijos de contexto seguidos de una columna por cada métrica definida en los instrumentos incluidos. Los encabezados de las columnas de métricas son los nombres de las métricas tal como están definidos en M3. Si una aplicación no tiene valor para una métrica, la celda queda vacía. La respuesta incluye el header `Content-Type: text/csv` y `Content-Disposition: attachment; filename="dataset_{YYYYMMDD}.csv"`. El archivo se genera en memoria sin escritura en disco. |
| **Resultado** | Archivo CSV descargable. HTTP 200 con headers de descarga. |

**Estructura del CSV:**

| Columna | Tipo | Descripción |
|---|---|---|
| `application_id` | UUID | Identificador de la aplicación |
| `subject_id` | UUID | UUID del sujeto (sin PII) |
| `instrument_name` | string | Nombre del instrumento |
| `application_date` | date | Fecha de la aplicación (ISO 8601) |
| `school_type` | string | Tipo de escuela del sujeto (si existe contexto) |
| `education_level` | string | Nivel educativo del sujeto |
| `age_cohort` | string | Cohorte de edad del sujeto |
| `gender` | string | Género del sujeto |
| `socioeconomic_level` | string | Nivel socioeconómico del sujeto |
| `{nombre_metrica_1}` | variable | Valor de la métrica 1 para esta aplicación |
| `{nombre_metrica_2}` | variable | Valor de la métrica 2 para esta aplicación |
| `...` | variable | Una columna por cada métrica en los instrumentos incluidos |

**Notas de generación:**
- Las columnas de métricas son dinámicas: se generan a partir de todas las métricas de los instrumentos incluidos en la exportación, ordenadas por instrumento y luego alfabéticamente por nombre de métrica.
- Si la exportación incluye múltiples instrumentos con métricas distintas, cada instrumento aporta sus columnas. Las celdas de aplicaciones de otros instrumentos quedan vacías para esas columnas.
- Los valores de `ContextData` quedan vacíos si el sujeto no tiene contexto registrado.

---

### RF-M6-02 – Exportar dataset en JSON *(HU22)*

| Campo | Detalle |
|---|---|
| **Actor** | Investigador |
| **Entidades** | `TestApplication`, `MetricValue`, `Subject`, `ContextData`, `Instrument`, `Metric` |
| **Endpoint** | `GET /export/json` |
| **Entrada** | `instrument_id` (UUID, query param, opcional), `start_date` (date ISO 8601, opcional), `end_date` (date ISO 8601, opcional) |
| **Descripción** | El sistema debe generar un archivo JSON descargable que preserva la jerarquía metodológica completa del dataset. La estructura agrupa las aplicaciones por instrumento, y dentro de cada aplicación incluye los valores de métricas como un objeto clave-valor. La respuesta incluye el header `Content-Type: application/json` y `Content-Disposition: attachment; filename="dataset_{YYYYMMDD}.json"`. El archivo se genera en memoria sin escritura en disco. |
| **Resultado** | Archivo JSON descargable con jerarquía metodológica. HTTP 200 con headers de descarga. |

**Estructura del JSON:**

```json
{
  "exported_at": "2026-03-12T14:30:00Z",
  "total_applications": 350,
  "filters_applied": {
    "instrument_id": null,
    "start_date": null,
    "end_date": null
  },
  "instruments": [
    {
      "instrument_id": "uuid",
      "instrument_name": "Nombre del instrumento",
      "methodological_description": "Descripción metodológica",
      "applications": [
        {
          "application_id": "uuid",
          "subject_id": "uuid",
          "application_date": "2026-02-15",
          "context": {
            "school_type": "public",
            "education_level": "primary_lower",
            "age_cohort": "6-8",
            "gender": "female",
            "socioeconomic_level": "medium",
            "additional_attributes": {}
          },
          "metric_values": [
            {
              "metric_name": "nombre_metrica",
              "metric_type": "numeric",
              "value": 42
            }
          ]
        }
      ]
    }
  ]
}
```

**Notas de generación:**
- Si el sujeto no tiene `ContextData` registrado, el campo `context` es `null`.
- Si se aplican filtros, el campo `filters_applied` los refleja con los valores utilizados.
- `total_applications` corresponde al número total de aplicaciones incluidas en la exportación (con filtros aplicados).
- La estructura es consistente y documentada: el equipo de IA puede depender de ella como contrato de interfaz.

---

## 6. Requisitos No Funcionales

| ID | Categoría | Descripción | Métrica verificable |
|---|---|---|---|
| RNF-M6-01 | Rendimiento | Los endpoints de exportación generan archivos completos sin timeout. | Exportación de 1,000 aplicaciones en < 10 segundos. |
| RNF-M6-02 | Rendimiento | Los archivos se generan en memoria sin escritura en disco. | 0 archivos temporales en el sistema de archivos del contenedor. |
| RNF-M6-03 | Seguridad | Solo Investigador puede exportar. | Aplicador → 403. SUPERADMIN → 403. Sin token → 401. |
| RNF-M6-04 | Integridad | El módulo es de solo lectura. No modifica ningún dato. | 0 operaciones de escritura en la base de datos originadas por este módulo. |
| RNF-M6-05 | Integridad | Los archivos exportados no contienen PII de los sujetos. | Solo UUID en `subject_id`. Sin nombre, CURP ni ningún campo identificable en ningún formato. |
| RNF-M6-06 | Integridad | La estructura del JSON exportado es consistente y documentada. | El JSON cumple el schema definido en 5 RF-M6-02 en el 100% de las exportaciones. |
| RNF-M6-07 | Integridad | El CSV exportado incluye encabezados en la primera fila. | Ningún CSV sin encabezados. |
| RNF-M6-08 | Integridad | Los filtros aplicados producen el subconjunto correcto de datos. | Verificable cruzando con los resultados de M5 con los mismos filtros. |
| RNF-M6-09 | Consistencia API | Los errores retornan `{ "status", "message", "data" }`. | Las respuestas de éxito son archivos; los errores siguen estructura estándar. |

---

## 7. Interfaces Externas

### 7.1 Interfaces con Otros Módulos

| Módulo | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | Valida JWT y rol en cada petición. Sin M1 operativo, ningún endpoint es accesible. |
| **M4 – Registro Operativo** | Consumidor | M6 lee todas las entidades generadas por M4 para construir los archivos exportados. No modifica ningún dato. |
| **M5 – Consulta Interna** | Relacionado | Los filtros de M6 son los mismos que en M5. El dataset que M5 muestra es el mismo que M6 exporta. |

### 7.2 Interfaces de Usuario

- Botón de descarga CSV con filtros opcionales (instrumento, rango de fechas).
- Botón de descarga JSON con los mismos filtros opcionales.
- Los selectores de filtro pueden ser los mismos que en M5 para consistencia de experiencia.

### 7.3 Interfaces de Software

| Componente | Descripción |
|---|---|
| **FastAPI** | Expone los endpoints REST. Retorna `StreamingResponse` o `FileResponse` para los archivos. |
| **Python csv** | Módulo estándar para generación del archivo CSV en memoria (`io.StringIO`). |
| **json (stdlib)** | Módulo estándar para serialización del JSON en memoria. |
| **SQLAlchemy + PostgreSQL** | Consultas de solo lectura para obtener el dataset completo o filtrado. |
| **Pydantic** | Validación de parámetros de filtro (fechas, instrument_id). |

### 7.4 Interfaces de Comunicación

- Base path: `/api/v1`
- Protocolo: HTTP/HTTPS
- Autenticación: `Authorization: Bearer {token}`
- Respuesta exitosa CSV: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="dataset_{YYYYMMDD}.csv"`
- Respuesta exitosa JSON: `Content-Type: application/json`, `Content-Disposition: attachment; filename="dataset_{YYYYMMDD}.json"`
- Respuestas de error: JSON estándar `{ "status", "message", "data" }`

---

## 8. Restricciones y Supuestos

### 8.1 Restricciones

| # | Restricción | Detalle |
|---|---|---|
| R1 | Solo lectura | Este módulo no modifica ningún dato del sistema. |
| R2 | Precondición M1–M5 | M6 solo puede desarrollarse una vez M1–M5 estén completos y validados. |
| R3 | Generación en memoria | Los archivos se generan en memoria (`io.StringIO` / `io.BytesIO`). Sin archivos temporales en disco. |
| R4 | Sin análisis | M6 no calcula estadísticas ni clasifica datos. Solo estructura y serializa lo registrado. |
| R5 | Anonimización | Los archivos exportados nunca contienen PII. Solo UUID de sujeto. |
| R6 | Formatos fijos | Solo CSV y JSON en esta versión. Sin otros formatos. |
| R7 | Estructura documentada | La estructura del JSON es un contrato de interfaz para los equipos de IA. No puede cambiar sin versionado. |

### 8.2 Supuestos

| # | Supuesto |
|---|---|
| S1 | Los Módulos 1–5 están completos, desplegados y el dataset ha sido validado en M5. |
| S2 | El middleware de M1 está operativo y accesible. |
| S3 | PostgreSQL está operativo y accesible desde el servicio backend. |
| S4 | El volumen de exportación no supera 1,000 aplicaciones para las pruebas de rendimiento definidas. Volúmenes mayores requieren revisión del mecanismo de generación. |
| S5 | Los equipos de IA que consumirán el JSON conocen el schema definido en 5 RF-M6-02 y pueden depender de él como contrato estable. |

---

## 9. Criterios de Aceptación

### HU21 – Exportar dataset en CSV *(RF-M6-01)*

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU21-01 | Investigador descarga `GET /export/csv` sin filtros. | Archivo CSV descargable con todas las aplicaciones. HTTP 200. |
| CA-HU21-02 | El archivo CSV tiene encabezados en la primera fila. | Primera fila: `application_id, subject_id, instrument_name, application_date, school_type, education_level, age_cohort, gender, socioeconomic_level, {métricas...}`. |
| CA-HU21-03 | Cada fila posterior representa una aplicación completa. | Datos correctos y consistentes con los registrados en M4. |
| CA-HU21-04 | El sujeto no tiene `ContextData` registrado. | Las celdas de contexto quedan vacías para esa fila. No genera error. |
| CA-HU21-05 | Se aplica filtro por `instrument_id` válido. | Solo aparecen aplicaciones de ese instrumento. |
| CA-HU21-06 | Se aplica filtro por rango de fechas válido. | Solo aparecen aplicaciones dentro del rango. |
| CA-HU21-07 | No hay aplicaciones que cumplan los filtros. | CSV con solo la fila de encabezados. HTTP 200. |
| CA-HU21-08 | El nombre del archivo incluye la fecha de generación. | `Content-Disposition: attachment; filename="dataset_20260312.csv"`. |
| CA-HU21-09 | Aplicador intenta exportar. | HTTP 403 Forbidden. |
| CA-HU21-10 | Sin token JWT. | HTTP 401 Unauthorized. |

### HU22 – Exportar dataset en JSON *(RF-M6-02)*

| ID | Criterio | Resultado esperado |
|---|---|---|
| CA-HU22-01 | Investigador descarga `GET /export/json` sin filtros. | Archivo JSON descargable con jerarquía completa. HTTP 200. |
| CA-HU22-02 | El JSON contiene el campo `exported_at` con timestamp UTC. | Campo presente en formato ISO 8601. |
| CA-HU22-03 | El JSON agrupa aplicaciones bajo su instrumento. | Jerarquía `instruments[].applications[]` correcta. |
| CA-HU22-04 | Los valores de métricas están en `metric_values[]` de cada aplicación. | Cada elemento tiene `metric_name`, `metric_type` y `value`. |
| CA-HU22-05 | El sujeto no tiene `ContextData`. | El campo `context` es `null`. No genera error. |
| CA-HU22-06 | Se aplican filtros. | El campo `filters_applied` refleja los filtros utilizados. Solo aparecen datos que cumplen los criterios. |
| CA-HU22-07 | No hay aplicaciones que cumplan los filtros. | JSON con `total_applications: 0` y `instruments: []`. HTTP 200. |
| CA-HU22-08 | El JSON cumple el schema definido en 5. | Verificable con validación de schema automática en pruebas. |
| CA-HU22-09 | El nombre del archivo incluye la fecha de generación. | `Content-Disposition: attachment; filename="dataset_20260312.json"`. |
| CA-HU22-10 | Aplicador intenta exportar. | HTTP 403 Forbidden. |

---

## 10. Trazabilidad de Requisitos

| Requisito | Historia de Usuario | Entidades | Endpoint | Casos de prueba clave |
|---|---|---|---|---|
| RF-M6-01 | HU21 – Exportar CSV | `TestApplication`, `MetricValue`, `Subject`, `ContextData`, `Instrument`, `Metric` | `GET /export/csv` | CA-HU21-01 a 10 |
| RF-M6-02 | HU22 – Exportar JSON | `TestApplication`, `MetricValue`, `Subject`, `ContextData`, `Instrument`, `Metric` | `GET /export/json` | CA-HU22-01 a 10 |

---

*Módulo 6 – Exportación Estructurada · SRS v1.0 · 2026-03-12*
