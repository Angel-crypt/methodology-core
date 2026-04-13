# SRS – Módulo 2: Gestión de Instrumentos
**Sistema de Registro Metodológico de Métricas Lingüísticas**
**Versión:** 2.0 · **Fecha:** 2026-03-12 · **Estado:** Borrador

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

Este documento define los requisitos funcionales y no funcionales del **Módulo 2 – Gestión de Instrumentos** del Sistema de Registro Metodológico de Métricas Lingüísticas.

El módulo tiene como propósito permitir el registro, configuración y control del ciclo de vida de los instrumentos metodológicos lingüísticos que serán utilizados para capturar métricas en el sistema. Es el segundo eslabón de la cadena de construcción del dataset: sin instrumentos correctamente registrados, no es posible definir métricas ni registrar aplicaciones.

El documento está dirigido a:
- **Desarrolladores:** como guía de implementación de endpoints, validaciones y lógica de negocio.
- **Testers / QA:** como base para el diseño de casos de prueba funcionales, negativos y de integración.
- **Stakeholders:** como contrato técnico que define el alcance y los límites del módulo.

### 1.2 Alcance del Documento

Este documento cubre:
- Registro manual de instrumentos metodológicos con validación de unicidad del nombre.
- Edición de la descripción metodológica (`methodological_description`) y del periodo de vigencia (`start_date` / `end_date`).
- Activación y desactivación de instrumentos sin eliminar registros históricos.
- Consulta de instrumentos disponible para todos los roles autenticados.
- Control de acceso por rol sobre todas las operaciones.

Se relaciona con los siguientes componentes:
- **M1 – Autenticación:** provee JWT y validación de roles para todos los endpoints.
- **M3 – Definición de Métricas:** consume los instrumentos registrados aquí para asociarles métricas.
- **M4 – Registro Operativo:** valida que el instrumento de una aplicación esté activo y dentro de su periodo de vigencia.

Quedan **fuera del alcance**: gestión de métricas (M3), registro de sujetos y aplicaciones (M4), importación masiva de instrumentos, eliminación permanente de instrumentos, análisis o exportación de datos.

### 1.3 Definiciones y Glosario

| Término | Definición |
|---|---|
| **Instrumento metodológico** | Prueba o herramienta estandarizada utilizada para evaluar métricas lingüísticas en un sujeto, conforme a un marco metodológico definido. |
| **methodological_description** | Campo de texto que documenta el marco metodológico y propósito científico del instrumento. Garantiza trazabilidad científica. |
| **Vigencia** | Intervalo temporal definido por `start_date` y `end_date` durante el cual el instrumento puede recibir nuevas aplicaciones. |
| **Instrumento vigente** | Instrumento cuyo `start_date ≤ fecha actual ≤ end_date` y cuyo estado es `active`. |
| **UUID** | Identificador único universal utilizado como clave primaria de los instrumentos. |
| **JWT** | JSON Web Token. Token firmado para autenticación y control de acceso en cada petición. |
| **RBAC** | Role-Based Access Control. Control de acceso por roles implementado por M1 como middleware. |
| **Administrador** | Usuario con permisos completos de gestión del sistema. |
| **Investigador** | Usuario con permisos de consulta y exportación de datos. |
| **Aplicador** | Profesional habilitado para aplicar instrumentos y registrar métricas. |

### 1.4 Referencias

- `SRS_General_v1.0.md` – Especificación general del sistema.
- `SRS_M1_Autenticacion_v1.0.md` – SRS del Módulo 1, dependencia directa.
- `SRS_M3_Definicion_Metricas_v1.0.md` – SRS del módulo dependiente.
- `MockContract_M2_Gestion_Instrumentos_V2.xml` – Contrato de mock server del módulo.
- `Módulos_del_Sistema_y_Tareas_Asociadas.docx` – Backlog con HU6–HU9.
- `M2_Gestion_Instrumentos.docx` – Documento original de scope del módulo.

### 1.5 Estructura del Documento

Las secciones 1–3 establecen el contexto, actores y alcance del módulo. La sección 5 detalla cada requisito funcional con su entidad, endpoint y flujo. La sección 6 define los atributos de calidad. Las secciones 7–10 cubren interfaces externas, restricciones, criterios de aceptación por HU y la matriz de trazabilidad.

---

## 2. Contexto del Módulo

### 2.1 Descripción del Módulo

El Módulo 2 permite la administración estructurada de los instrumentos metodológicos lingüísticos del sistema. Provee los mecanismos para crear, documentar, configurar y controlar el ciclo de vida de los instrumentos que serán utilizados en los módulos de métricas y registro operativo.

### 2.2 Problema que Resuelve

Sin este módulo no existe una fuente de verdad centralizada sobre qué instrumentos están disponibles, vigentes y autorizados para su uso. El módulo M3 necesita instrumentos existentes para asociarles métricas. El módulo M4 necesita validar que el instrumento de una aplicación esté activo y dentro de su periodo de vigencia antes de persistir cualquier registro. Sin M2 operativo, ambas dependencias fallan.

### 2.3 Relación con Otros Módulos

```
M1 – Autenticación
  └─ provee JWT + RBAC ──────────────────────────────▶ M2 – Gestión de Instrumentos
                                                                  │
                                              ┌───────────────────┴──────────────────┐
                                              ▼                                       ▼
                                   M3 – Definición de Métricas          M4 – Registro Operativo
                                   (asocia métricas a instrumentos)     (valida instrumento activo
                                                                          y vigente)
```

### 2.4 Dependencias con Otros Componentes

| Dependencia | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | El middleware JWT de M1 debe estar operativo. Sin él, ningún endpoint es accesible. |
| **PostgreSQL** | Infraestructura | Almacena la entidad `Instrument`. Todas las operaciones requieren conexión activa. |
| **Alembic** | Infraestructura | Las migraciones de la tabla `instruments` deben ejecutarse antes del primer uso. |

### 2.5 Flujo General de Interacción

1. El Administrador se autentica en M1 y obtiene un JWT.
2. Registra un instrumento mediante `POST /instruments` con nombre, descripción y fechas.
3. Opcionalmente actualiza descripción o periodo de vigencia mediante `PATCH /instruments/{id}`.
4. Activa o desactiva el instrumento mediante `PATCH /instruments/{id}/status`.
5. Cualquier rol autenticado consulta instrumentos mediante `GET /instruments`.
6. M3 consulta `GET /instruments` para seleccionar el instrumento al definir métricas.
7. M4 verifica estado `active` y vigencia del instrumento al registrar una aplicación.

---

## 3. Stakeholders y Usuarios del Módulo

### 3.1 Stakeholders del Módulo

| Rol | Interés en el módulo | Responsabilidades relacionadas |
|---|---|---|
| **Equipo de desarrollo** | Implementar correctamente los endpoints, validaciones y lógica de negocio. | Codificar, documentar y probar el módulo conforme al SRS y al DoD. |
| **Investigadores / responsables metodológicos** | Que los instrumentos representen fielmente los recursos del protocolo de investigación. | Validar que los instrumentos registrados coincidan con el diseño metodológico del estudio. |
| **Responsable técnico** | Asegurar integridad y disponibilidad de los instrumentos para M3 y M4. | Revisar migraciones, aprobar PRs y firmar cierre de historias. |
| **Testers / QA** | Verificar todos los criterios de aceptación incluyendo casos negativos. | Diseñar y ejecutar casos de prueba funcionales, negativos y de integración. |

### 3.2 Tipos de Usuarios

| Tipo | Descripción | Nivel de acceso | Funcionalidades que utiliza |
|---|---|---|---|
| **Administrador** | Control total sobre la gestión de instrumentos. | Lectura y escritura. | Crear, editar, activar, desactivar y consultar instrumentos. |
| **Investigador** | Usuario académico de consulta. | Solo lectura. | Consultar instrumentos disponibles e información metodológica. |
| **Aplicador** | Profesional que aplica las pruebas en campo. | Solo lectura. | Consultar instrumentos activos para seleccionarlos al registrar aplicaciones en M4. |

---

## 4. Alcance del Módulo

### 4.1 Objetivo del Módulo

Proveer al sistema una capa de administración controlada y trazable de los instrumentos metodológicos lingüísticos, garantizando que solo los instrumentos correctamente registrados, activos y vigentes estén disponibles para su uso en los módulos M3 y M4.

### 4.2 Funcionalidades Principales

- Registro manual de instrumentos con validación de unicidad del nombre.
- Documentación y edición del campo `methodological_description` de cada instrumento.
- Definición y actualización del periodo de vigencia (`start_date` / `end_date`) con validación de coherencia temporal.
- Control de estado del instrumento (`active` / `inactive`) sin eliminar historial de aplicaciones.
- Consulta de instrumentos registrados disponible para todos los roles autenticados.
- Exposición de instrumentos mediante API REST para consumo de M3 y M4.

### 4.3 Fuera del Alcance

| Funcionalidad excluida | Módulo responsable |
|---|---|
| Definición de métricas asociadas a instrumentos. | M3 – Definición de Métricas |
| Registro de sujetos, aplicaciones o captura de valores. | M4 – Registro Operativo |
| Importación de instrumentos desde CSV, JSON u otros archivos. | No aplica en el MVP |
| Eliminación permanente de instrumentos. | No permitida en ningún módulo |
| Análisis estadístico o interpretación de resultados. | M5 / M6 / Fases posteriores |
| Creación o modificación de instrumentos por roles distintos al Administrador. | Restringido por RBAC |

---

## 5. Requisitos Funcionales

> Todos los endpoints bajo `/api/v1`. Todas las respuestas siguen `{ "status", "message", "data" }`.

---

### RF-M2-01 – Crear instrumento *(HU6)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador |
| **Entidades** | `Instrument` |
| **Endpoint** | `POST /instruments` |
| **Entrada** | `name` (string, obligatorio), `methodological_description` (string, opcional), `start_date` (date ISO 8601, opcional), `end_date` (date ISO 8601, opcional) |
| **Descripción** | El sistema debe permitir al Administrador registrar un nuevo instrumento metodológico lingüístico. El nombre debe ser único en el sistema. Si se proporcionan fechas, el sistema valida que `start_date` sea estrictamente anterior a `end_date`. El instrumento se crea en estado `active` por defecto. |
| **Resultado** | Instrumento registrado con UUID generado automáticamente y estado `active`. HTTP 201 con datos completos del instrumento. |

---

### RF-M2-02 – Definir descripción metodológica *(HU7)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador |
| **Entidades** | `Instrument` (campo `methodological_description`) |
| **Endpoint** | `PATCH /instruments/{id}` |
| **Entrada** | UUID del instrumento (path param), `methodological_description` (string) |
| **Descripción** | El sistema debe permitir al Administrador documentar o actualizar la descripción metodológica de un instrumento existente. La descripción es editable en cualquier momento y garantiza trazabilidad científica sobre el propósito del instrumento. |
| **Resultado** | Campo `methodological_description` actualizado. HTTP 200 con datos actualizados del instrumento. |

---

### RF-M2-03 – Asociar periodo de aplicación *(HU8)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador |
| **Entidades** | `Instrument` (campos `start_date`, `end_date`) |
| **Endpoint** | `PATCH /instruments/{id}` |
| **Entrada** | UUID del instrumento (path param), `start_date` (date ISO 8601), `end_date` (date ISO 8601) |
| **Descripción** | El sistema debe permitir al Administrador definir o actualizar el periodo de vigencia de un instrumento. La validación de coherencia es obligatoria: `start_date` debe ser estrictamente anterior a `end_date`. M4 usa este periodo para rechazar aplicaciones cuya fecha esté fuera del rango `[start_date, end_date]`. |
| **Resultado** | Periodo de vigencia actualizado. HTTP 200 con datos del instrumento. |

> **Nota de implementación:** RF-M2-02 y RF-M2-03 comparten el endpoint `PATCH /instruments/{id}`. El body acepta cualquier combinación de `methodological_description`, `start_date` y `end_date`. Ambos campos se pueden actualizar en la misma petición.

---

### RF-M2-04 – Activar / desactivar instrumento *(HU9)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador |
| **Entidades** | `Instrument` (campo `status`) |
| **Endpoint** | `PATCH /instruments/{id}/status` |
| **Entrada** | UUID del instrumento (path param), `status` (string: `active` · `inactive`) |
| **Descripción** | El sistema debe permitir al Administrador cambiar el estado operativo de un instrumento. El cambio no afecta los registros históricos de aplicaciones ya realizadas con ese instrumento. Solo los instrumentos en estado `active` pueden recibir nuevas aplicaciones en M4. M4 retorna HTTP 422 al intentar registrar una aplicación con instrumento `inactive`. |
| **Resultado** | Estado del instrumento actualizado. Registros históricos intactos. HTTP 200. |

---

### RF-M2-LIST – Consultar lista de instrumentos *(soporte a M3 y M4)*

| Campo | Detalle |
|---|---|
| **Actor** | Administrador, Investigador, Aplicador |
| **Entidades** | `Instrument` |
| **Endpoint** | `GET /instruments` |
| **Entrada** | Token JWT válido (header). Query param opcional: `status` (`active` · `inactive`) |
| **Descripción** | El sistema debe permitir a cualquier rol autenticado consultar la lista de instrumentos registrados. Soporta filtrado opcional por estado. Este endpoint es consumido por M3 para asociar métricas y por M4 para seleccionar el instrumento de una aplicación. |
| **Resultado** | Lista de instrumentos con id, name, `methodological_description`, `start_date`, `end_date` y `status`. HTTP 200. |

---

## 6. Requisitos No Funcionales

| ID | Categoría | Descripción | Métrica verificable |
|---|---|---|---|
| RNF-M2-01 | Rendimiento | Los endpoints responden en tiempo razonable bajo carga normal. | `GET /instruments` < 500 ms con hasta 500 registros. `POST` y `PATCH` < 1 segundo. |
| RNF-M2-02 | Seguridad | Todos los endpoints requieren JWT válido. Solo el Administrador puede crear y modificar. | Sin token → 401. Rol incorrecto en escritura → 403. 100% de endpoints protegidos. |
| RNF-M2-03 | Integridad | Unicidad del nombre y coherencia de fechas en toda operación de escritura. | No existen nombres duplicados. `start_date >= end_date` → 400. |
| RNF-M2-04 | Persistencia | Desactivar un instrumento no elimina ni modifica historial de M4. | Registros de `TestApplication` y `MetricValue` intactos tras cambio de estado. |
| RNF-M2-05 | Mantenibilidad | Código modular. Permisos en archivo de configuración centralizado. Type hints en 100% de funciones. | Cobertura de tests ≥ 80%. Tabla de permisos en un único archivo de configuración. |
| RNF-M2-06 | Consistencia API | Todas las respuestas siguen `{ "status", "message", "data" }`. Errores incluyen `message` descriptivo. | 100% de endpoints retornan estructura estándar. |

---

## 7. Interfaces Externas

### 7.1 Interfaces con Otros Módulos

| Módulo | Tipo | Detalle |
|---|---|---|
| **M1 – Autenticación** | Consumidor | Valida JWT y rol en cada petición. Sin M1 operativo, ningún endpoint de este módulo es accesible. |
| **M3 – Definición de Métricas** | Proveedor | M3 consulta `GET /instruments` para seleccionar el instrumento al crear métricas. |
| **M4 – Registro Operativo** | Proveedor | M4 verifica estado `active` y vigencia del instrumento antes de registrar una aplicación. |
| **M5 – Consulta Interna** | Proveedor | M5 puede incluir el nombre y descripción del instrumento al presentar aplicaciones. |

### 7.2 Interfaces de Usuario

- **Formulario de creación:** nombre, `methodological_description`, `start_date`, `end_date` y estado inicial.
- **Formulario de edición:** actualiza `methodological_description` y/o periodo de vigencia mediante `PATCH`.
- **Control de estado:** activa o desactiva un instrumento mediante `PATCH /instruments/{id}/status`.
- **Listado de instrumentos:** vista tabular para todos los roles con columnas id, nombre, descripción, vigencia, estado. Filtro por estado.

### 7.3 Interfaces de Software

| Componente | Descripción |
|---|---|
| **FastAPI** | Expone los endpoints REST bajo `/api/v1/instruments`. |
| **SQLAlchemy + PostgreSQL** | ORM y base de datos para la entidad `Instrument`. |
| **Alembic** | Migraciones del esquema de la tabla `instruments`. |
| **Pydantic** | Validación de esquemas de entrada y salida. |

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
| R5 | Sin importación masiva | No se permite carga de instrumentos desde archivos externos en esta versión. |
| R6 | Sin eliminación permanente | Los instrumentos no pueden eliminarse. Solo cambio de estado (`active` / `inactive`). |
| R7 | Respuesta estándar | Todos los endpoints retornan `{ "status", "message", "data" }` sin excepción. |

### 8.2 Supuestos

| # | Supuesto |
|---|---|
| S1 | El usuario posee un JWT válido y activo emitido por M1. |
| S2 | El middleware de M1 está operativo y accesible. |
| S3 | PostgreSQL está operativo y las migraciones del módulo ejecutadas. |
| S4 | Los roles (`administrator`, `researcher`, `applicator`) ya están definidos en M1. |
| S5 | El frontend valida formatos de fecha antes de enviar, pero el backend valida independientemente. |

---

## 9. Criterios de Aceptación

### HU6 – Crear instrumento *(RF-M2-01)*

Se considera aceptado si:
- El Administrador puede registrar un instrumento con nombre, descripción y fechas mediante `POST /instruments`.
- El instrumento se crea con estado `active` por defecto.
- HTTP 409 si ya existe un instrumento con el mismo nombre.
- HTTP 400 si se envían fechas y `start_date >= end_date`.
- HTTP 403 si el solicitante no es Administrador.
- HTTP 401 sin token JWT.
- El instrumento aparece en `GET /instruments` inmediatamente tras la creación.
- La respuesta sigue `{ status, message, data }`.

### HU7 – Definir descripción metodológica *(RF-M2-02)*

Se considera aceptado si:
- El Administrador puede agregar o modificar `methodological_description` mediante `PATCH /instruments/{id}`.
- HTTP 403 si el solicitante no es Administrador.
- HTTP 404 si el instrumento no existe.
- HTTP 400 si la descripción está vacía.
- El campo actualizado es visible en `GET /instruments` y en `GET /instruments/{id}`.

### HU8 – Asociar periodo de aplicación *(RF-M2-03)*

Se considera aceptado si:
- El Administrador puede definir y actualizar `start_date` y `end_date` mediante `PATCH /instruments/{id}`.
- HTTP 400 si `start_date >= end_date` o si el formato de fecha es inválido.
- M4 rechaza aplicaciones cuya `application_date` está fuera del periodo `[start_date, end_date]`.
- HTTP 403 si el solicitante no es Administrador.
- HTTP 404 si el instrumento no existe.

### HU9 – Activar / desactivar instrumento *(RF-M2-04)*

Se considera aceptado si:
- El Administrador puede cambiar el estado entre `active` e `inactive` mediante `PATCH /instruments/{id}/status`.
- Los registros históricos de `TestApplication` y `MetricValue` en M4 no se modifican.
- M4 retorna HTTP 422 al intentar registrar una aplicación con instrumento `inactive`.
- El estado actualizado se refleja en `GET /instruments`.
- HTTP 400 si el valor de `status` no es `active` ni `inactive`.
- HTTP 403 si el solicitante no es Administrador.
- HTTP 404 si el instrumento no existe.

---

## 10. Trazabilidad de Requisitos

| Requisito | Historia de Usuario | Entidades | Endpoint | Casos de prueba clave |
|---|---|---|---|---|
| RF-M2-01 | HU6 – Crear instrumento | `Instrument` | `POST /instruments` | TC-01: creación exitosa · TC-02: nombre duplicado (409) · TC-03: sin permiso (403) · TC-04: fechas incoherentes (400) · TC-05: sin token (401) |
| RF-M2-02 | HU7 – Descripción metodológica | `Instrument` (`methodological_description`) | `PATCH /instruments/{id}` | TC-06: edición exitosa · TC-07: instrumento inexistente (404) · TC-08: descripción vacía (400) · TC-09: sin permiso (403) |
| RF-M2-03 | HU8 – Periodo de aplicación | `Instrument` (`start_date`, `end_date`) | `PATCH /instruments/{id}` | TC-10: fechas válidas asignadas · TC-11: `start_date >= end_date` (400) · TC-12: formato de fecha inválido (400) · TC-13: M4 rechaza aplicación fuera de vigencia |
| RF-M2-04 | HU9 – Activar/desactivar | `Instrument` (`status`) | `PATCH /instruments/{id}/status` | TC-14: desactivación exitosa · TC-15: activación exitosa · TC-16: historial M4 intacto · TC-17: status inválido (400) · TC-18: M4 retorna 422 con instrumento inactive |
| RF-M2-LIST | Soporte a M3 y M4 | `Instrument` | `GET /instruments` | TC-19: acceso por todos los roles · TC-20: sin token (401) · TC-21: filtro por `status=active` · TC-22: filtro por `status=inactive` · TC-23: campos completos en respuesta |
| RNF-M2-03 | HU6, HU8 | `Instrument` | `POST`, `PATCH` | TC-02: nombre duplicado · TC-11: fechas incoherentes |
| RNF-M2-04 | HU9 | `Instrument`, M4 | `PATCH /instruments/{id}/status` | TC-16: registros M4 intactos tras desactivación |

---

*Módulo 2 – Gestión de Instrumentos · SRS v2.0 · 2026-03-12*
