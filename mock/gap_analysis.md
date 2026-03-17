# Gap Analysis: MOCKServer vs Contratos XML y SRS

**Fecha:** 2026-03-16
**Artefactos SRS analizados:**

- `docs/srs/SRS_General_v1.0.md`
- `docs/srs/SRS_M1_Autenticacion_v2.0.md`
- `docs/srs/SRS_M2_Gestion_Instrumentos_v2.0.md`
- `docs/srs/SRS_M3_Definicion_Metricas_v1.0.md`
- `docs/srs/SRS_M4_Registro_Operativo_v1.0.md`

**Artefactos XML analizados:**

- `mock/responses/MockContract_M1_Autenticacion_v2.xml`
- `mock/responses/MockContract_M2_Gestion_Instrumentos_v2.xml`
- `mock/responses/MockContract_M3_Metricas_v1.xml`
- `mock/responses/MockContract_M4_RegistroOperativo_v1.xml`

**MOCKServer analizado:**

- `mock/src/index.js`
- `mock/src/middleware/auth.js`
- `mock/src/store/index.js`
- `mock/src/routes/m1.js` · `m2.js` · `m3.js` · `m4.js`

---

## Hallazgos y mejoras

| ID | Fuente | Endpoint / Operación | Hallazgo | Mejora sugerida | Prioridad |
|----|--------|---------------------|----------|-----------------|-----------|
| G-001 | SRS | `PATCH /instruments/:id` | La función `datesAreValid` en `m2.js` no verifica si las fechas son parseables antes de compararlas. `new Date("not-a-date")` produce `Invalid Date`; la comparación `<` retorna `false` (NaN), haciendo que la validación pase y la fecha inválida se persista silenciosamente. Viola HU8 CA del SRS M2. | Agregar `!isNaN(new Date(date).getTime())` como primera comprobación en `datesAreValid`. Retornar HTTP 400 con mensaje descriptivo cuando alguna fecha tenga formato inválido. | Alta |
| G-002 | SRS | `PATCH /instruments/:id` | `methodological_description: ""` se persiste sin error. El criterio de aceptación HU7 del SRS M2 requiere HTTP 400 cuando la descripción esté vacía. | En `PATCH /instruments/:id`, si `methodological_description !== undefined && methodological_description.trim() === ''`, retornar HTTP 400 con mensaje descriptivo. | Media |
| G-003 | XML y SRS | `GET /metrics` | Con un `instrument_id` de formato inválido (no UUID) el mock retorna HTTP 200 con array vacío. Si el instrumento no existe también retorna 200 vacío. El XML M3 documenta HTTP 400 para formato inválido y el SRS RF-M3-LIST exige indicar cuando el instrumento no existe. | Validar formato UUID v4 para `instrument_id`: retornar HTTP 400 si el formato es inválido, HTTP 404 si el instrumento no existe en el store. Mantener HTTP 200 con array vacío solo cuando el instrumento existe pero no tiene métricas definidas. | Media |
| G-004 | XML y SRS | `PATCH /users/me/password` | Si `store.users.find()` retorna `undefined`, la línea 168 de `m1.js` ejecuta `bcrypt.compareSync(current_password, undefined.password_hash)` lanzando un `TypeError` → HTTP 500 con formato no estándar. Viola RNF-REL-01 y el contrato de estructura de respuesta. | Agregar guard tras el `find()`: si `user` es `undefined`, retornar HTTP 401 antes de llegar a bcrypt. | Media |
| G-005 | XML y SRS | `POST /subjects/:id/context` | Llamadas múltiples al mismo sujeto sobreescriben el contexto anterior silenciosamente sin error ni trazabilidad. Ni el XML M4 ni el SRS M4 definen este comportamiento, generando ambigüedad entre implementaciones. | Definir comportamiento explícito y alinearlo entre mock y contrato XML: retornar HTTP 409 si ya existe contexto (preserva integridad), o documentar la sobreescritura como comportamiento intencional. | Media |
| G-006 | XML | Todos los endpoints | No existe middleware global de manejo de errores en `index.js`. Excepciones no capturadas producen respuestas 500 con el formato por defecto de Express, violando el contrato de estructura estándar `{ status, message, data }`. | Agregar al final de `index.js`: `app.use((err, req, res, next) => { res.status(500).json({ status: 'error', message: 'Internal server error', data: null }); })`. | Media |
| G-007 | XML | `GET /subjects/:id` | El mock retorna `id` y `subject_id` dentro del objeto `context` anidado. El XML M4 no documenta estos campos en la respuesta 200. | Agregar `id` y `subject_id` a los campos documentados del objeto `context` en la respuesta 200 de `GET /subjects/{id}` del contrato XML M4. | Baja |
| G-008 | XML | `POST /metrics` · `PATCH /metrics/:id` | La respuesta 201 de `POST /metrics` incluye `updated_at` (no documentado en XML M3). La respuesta 200 de `PATCH /metrics/:id` incluye `created_at` (no documentado en XML M3). | Actualizar el contrato XML M3 para documentar `updated_at` en la respuesta 201 y `created_at` en la respuesta 200 del PATCH, reflejando lo que el mock retorna. | Baja |
| G-009 | XML | `MockContract_M2_Gestion_Instrumentos_v2.xml` | El atributo `version` del elemento raíz del contrato dice `"1.0"`, pero el nombre del archivo y las referencias en los SRS lo identifican como versión 2. | Actualizar el atributo `version` del elemento raíz a `"2.0"`. | Baja |
| G-010 | SRS | `POST /subjects/:id/context` | El campo `age_cohort` acepta cualquier string sin validación de formato. Valores como `"Juan Pérez"` o fechas exactas serían aceptados, introduciendo riesgo de PII indirecta. El SRS establece anonimización obligatoria. | Validar que `age_cohort`, si se proporciona, cumpla un patrón de rango numérico (`"N-N"`, ej. `"6-8"`). Retornar HTTP 400 para valores que no coincidan. | Baja |
| G-011 | SRS | `POST /users` | El mock no valida el formato del email. Es posible registrar usuarios con `email: "notanemail"`. | Agregar validación de formato de email con regex básico (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). Retornar HTTP 400 para emails malformados. | Baja |

---

## Resumen ejecutivo

| Prioridad | Total | Fuente XML | Fuente SRS | Fuente XML y SRS |
|-----------|-------|-----------|-----------|-----------------|
| Alta      | 1     | —          | 1          | —                |
| Media     | 5     | 1          | 1          | 3                |
| Baja      | 5     | 3          | 2          | —                |
| **Total** | **11**| **4**      | **4**      | **3**            |

### Bloqueante para cierre de Fase 1

- **G-001** — Bug en `datesAreValid`: fechas malformadas se persisten silenciosamente en `PATCH /instruments/:id`; afecta directamente la validación de vigencia en M4.

---

## Criterios de prioridad

- **Alta**: Bloquea integración, viola contrato formal o incumple requerimiento obligatorio del SRS
- **Media**: Comportamiento inconsistente que puede causar errores en escenarios específicos
- **Baja**: Mejora de calidad, claridad o cobertura de casos borde
