/**
 * M4 – Registro Operativo
 * Contratos: RF-M4-01..04, RF-M4-GET-SUBJECT
 *
 * Cambios aplicados (GAP-M4-01..M4-07, GAP-SEG-04..05):
 *   - POST /subjects: corrección del guard de body vacío (GAP-M4-07)
 *   - POST /subjects/:id/context: 409 si contexto ya existe (GAP-M4-04)
 *   - POST /subjects/:id/context: validateStrictInput (GAP-SEG-04)
 *   - POST /subjects/:id/context: validación age_cohort patrón N-N ≤20 chars (GAP-M4-05)
 *   - POST /subjects/:id/context: restricciones additional_attributes PII (GAP-SEG-04)
 *   - POST /subjects/:id/context: respuesta filtrada (sin id, subject_id, created_at) (GAP-M4-03)
 *   - GET /subjects/:id: context filtrado a 6 campos lógicos (GAP-M4-03)
 *   - POST /applications: comparación de fechas timezone-safe (GAP-M4-06)
 *   - POST /metric-values: values_recorded → values_count (GAP-M4-01)
 *   - POST /metric-values: reason → error + metric_name en errores (GAP-M4-01)
 *   - Mensajes genéricos en español (GAP-SEG-05)
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');
const { validateStrictInput } = require('../middleware/validateStrictInput');

const router = express.Router();

const APPLICATOR_ROLES = ['applicator', 'administrator'];

// Enums definidos en los contratos XML (M4 contextAttributes)
const VALID_SCHOOL_TYPES = ['public', 'private', 'unknown'];
const VALID_EDUCATION_LEVELS = ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'];
const VALID_GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'];
const VALID_SOCIO_LEVELS = ['low', 'medium', 'high', 'unknown'];

// Validación age_cohort: patrón "N-N", máximo 20 caracteres (GAP-M4-05)
const AGE_COHORT_REGEX = /^\d+-\d+$/;

// Restricciones additional_attributes (GAP-SEG-04, Privacy by Design)
const ADDITIONAL_ATTR_MAX_KEYS = 5;
const ADDITIONAL_ATTR_KEY_MAX_LEN = 50;
const ADDITIONAL_ATTR_VALUE_MAX_LEN = 200;
// Nombres de campo que sugieren datos directamente identificables
const ADDITIONAL_ATTR_PII_BLACKLIST = [
  'nombre', 'apellido', 'name', 'surname', 'lastname',
  'dni', 'rut', 'cedula', 'pasaporte', 'passport', 'curp', 'ssn',
  'direccion', 'address', 'domicilio',
  'telefono', 'phone', 'celular', 'movil',
  'email', 'correo', 'mail',
  'nacimiento', 'birthdate', 'fecha_nacimiento', 'birthday',
  'foto', 'photo', 'imagen', 'image',
];

// Campos permitidos en POST /subjects/:id/context
const CONTEXT_ALLOWED_KEYS = [
  'school_type', 'education_level', 'age_cohort',
  'gender', 'socioeconomic_level', 'additional_attributes',
];

/**
 * Valida las restricciones de additional_attributes.
 * @returns {string|null} Mensaje de error o null si válido.
 */
function validateAdditionalAttributes(additional_attributes) {
  if (additional_attributes === null || additional_attributes === undefined) return null;

  if (typeof additional_attributes !== 'object' || Array.isArray(additional_attributes)) {
    return 'additional_attributes debe ser un objeto (clave-valor)';
  }
  const keys = Object.keys(additional_attributes);
  if (keys.length > ADDITIONAL_ATTR_MAX_KEYS) {
    return `additional_attributes no puede tener más de ${ADDITIONAL_ATTR_MAX_KEYS} campos`;
  }
  for (const key of keys) {
    if (key.length > ADDITIONAL_ATTR_KEY_MAX_LEN) {
      return `El nombre de campo "${key}" en additional_attributes excede ${ADDITIONAL_ATTR_KEY_MAX_LEN} caracteres`;
    }
    if (ADDITIONAL_ATTR_PII_BLACKLIST.includes(key.toLowerCase())) {
      return `El campo "${key}" no está permitido en additional_attributes (datos directamente identificables)`;
    }
    const val = additional_attributes[key];
    if (typeof val === 'string' && val.length > ADDITIONAL_ATTR_VALUE_MAX_LEN) {
      return `El valor del campo "${key}" excede ${ADDITIONAL_ATTR_VALUE_MAX_LEN} caracteres`;
    }
  }
  return null;
}

// ─── RF-M4-01 · POST /subjects ───────────────────────────────────────────────
router.post('/subjects', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  // Privacy by Design (AD-09): el body debe estar vacío
  // GAP-M4-07: corrección del guard — req.body puede ser undefined con ciertos parsers
  if (req.body !== undefined && Object.keys(req.body || {}).length > 0) {
    return res.status(400).json({ status: 'error', message: 'El cuerpo de la solicitud debe estar vacío', data: null });
  }

  // Verificar subject_limit del aplicador (SRS General §3.4)
  const perms = store.userPermissions.get(req.user.id);
  if (perms?.subject_limit != null) {
    const count = store.subjects.filter((s) => s.created_by === req.user.id).length;
    if (count >= perms.subject_limit) {
      return res.status(422).json({
        status: 'error',
        message: 'Límite de sujetos registrables alcanzado.',
        data: null,
      });
    }
  }

  const subject = {
    id: uuidv4(),
    created_at: new Date(),
    created_by: req.user.id,
    context: null,
  };
  store.subjects.push(subject);

  return res.status(201).json({
    status: 'success',
    message: 'Sujeto registrado correctamente',
    data: { id: subject.id },
  });
});

// ─── RF-M4-02 · POST /subjects/:id/context ───────────────────────────────────
router.post(
  '/subjects/:id/context',
  authMiddleware(APPLICATOR_ROLES),
  validateStrictInput(CONTEXT_ALLOWED_KEYS),
  (req, res) => {
    const subject = store.subjects.find((s) => s.id === req.params.id);
    if (!subject) {
      return res.status(404).json({ status: 'error', message: 'Sujeto no encontrado', data: null });
    }

    // GAP-M4-04: 409 si el contexto ya existe
    if (subject.context !== null) {
      return res.status(409).json({
        status: 'error',
        message: 'El sujeto ya tiene un contexto registrado',
        data: null,
      });
    }

    const { school_type, education_level, age_cohort, gender, socioeconomic_level, additional_attributes } = req.body || {};

    // Validaciones de enum (mensajes en español)
    if (school_type && !VALID_SCHOOL_TYPES.includes(school_type)) {
      return res.status(400).json({ status: 'error', message: `school_type inválido. Valores aceptados: ${VALID_SCHOOL_TYPES.join(' | ')}`, data: null });
    }
    if (education_level && !VALID_EDUCATION_LEVELS.includes(education_level)) {
      return res.status(400).json({ status: 'error', message: `education_level inválido. Valores aceptados: ${VALID_EDUCATION_LEVELS.join(' | ')}`, data: null });
    }
    if (gender && !VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ status: 'error', message: `gender inválido. Valores aceptados: ${VALID_GENDERS.join(' | ')}`, data: null });
    }
    if (socioeconomic_level && !VALID_SOCIO_LEVELS.includes(socioeconomic_level)) {
      return res.status(400).json({ status: 'error', message: `socioeconomic_level inválido. Valores aceptados: ${VALID_SOCIO_LEVELS.join(' | ')}`, data: null });
    }

    // GAP-M4-05: validar age_cohort — patrón "N-N", máximo 20 caracteres
    if (age_cohort !== undefined && age_cohort !== null) {
      if (typeof age_cohort !== 'string' || age_cohort.length > 20 || !AGE_COHORT_REGEX.test(age_cohort)) {
        return res.status(400).json({
          status: 'error',
          message: 'age_cohort debe tener formato "N-N" (ej: "6-8") y un máximo de 20 caracteres',
          data: null,
        });
      }
    }

    // GAP-SEG-04: validar restricciones Privacy by Design en additional_attributes
    const attrError = validateAdditionalAttributes(additional_attributes);
    if (attrError) {
      return res.status(400).json({ status: 'error', message: attrError, data: null });
    }

    const context = {
      id: uuidv4(),
      subject_id: subject.id,
      school_type: school_type || null,
      education_level: education_level || null,
      age_cohort: age_cohort || null,
      gender: gender || null,
      socioeconomic_level: socioeconomic_level || null,
      additional_attributes: additional_attributes || null,
      created_at: new Date(),
    };
    subject.context = context;

    // GAP-M4-03: respuesta filtrada — solo los 6 campos lógicos (sin id, subject_id, created_at)
    return res.status(201).json({
      status: 'success',
      message: 'Contexto registrado correctamente',
      data: {
        school_type: context.school_type,
        education_level: context.education_level,
        age_cohort: context.age_cohort,
        gender: context.gender,
        socioeconomic_level: context.socioeconomic_level,
        additional_attributes: context.additional_attributes,
      },
    });
  }
);

// ─── RF-M4-GET-SUBJECT · GET /subjects/:id ───────────────────────────────────
router.get('/subjects/:id', authMiddleware(), (req, res) => {
  const subject = store.subjects.find((s) => s.id === req.params.id);
  if (!subject) {
    return res.status(404).json({ status: 'error', message: 'Sujeto no encontrado', data: null });
  }

  // GAP-M4-03: filtrar contexto — exponer solo los 6 campos lógicos (no id, subject_id, created_at)
  const contextData = subject.context
    ? {
        school_type: subject.context.school_type,
        education_level: subject.context.education_level,
        age_cohort: subject.context.age_cohort,
        gender: subject.context.gender,
        socioeconomic_level: subject.context.socioeconomic_level,
        additional_attributes: subject.context.additional_attributes,
      }
    : null;

  return res.status(200).json({
    status: 'success',
    message: 'Sujeto recuperado',
    data: {
      id: subject.id,
      context: contextData,
    },
  });
});

// ─── RF-M4-03 · POST /applications ───────────────────────────────────────────
router.post('/applications', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  const { subject_id, instrument_id, application_date, notes } = req.body || {};

  if (!subject_id || !instrument_id) {
    return res.status(400).json({ status: 'error', message: 'Campos obligatorios: subject_id, instrument_id', data: null });
  }

  const subject = store.subjects.find((s) => s.id === subject_id);
  if (!subject) {
    return res.status(404).json({ status: 'error', message: 'Sujeto no encontrado', data: null });
  }

  const instrument = store.instruments.find((i) => i.id === instrument_id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  if (instrument.status !== 'active') {
    return res.status(422).json({
      status: 'error',
      message: 'El instrumento está inactivo y no puede recibir nuevas aplicaciones',
      data: null,
    });
  }

  // Normalizar fecha de aplicación a YYYY-MM-DD (timezone-safe – GAP-M4-06)
  let appDateStr;
  if (application_date) {
    // Validar que sea una fecha ISO 8601 válida
    const parsed = new Date(application_date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Formato de application_date inválido. Use ISO 8601: YYYY-MM-DD', data: null });
    }
    // Extraer solo la parte de fecha (evita problemas de zona horaria)
    appDateStr = application_date.split('T')[0];
  } else {
    // Fecha actual en UTC (timezone-safe)
    appDateStr = new Date().toISOString().split('T')[0];
  }

  // Validar periodo de vigencia usando comparación de strings YYYY-MM-DD (timezone-safe)
  if (instrument.start_date && appDateStr < instrument.start_date) {
    return res.status(400).json({ status: 'error', message: 'La fecha de aplicación está fuera del periodo de vigencia del instrumento', data: null });
  }
  if (instrument.end_date && appDateStr > instrument.end_date) {
    return res.status(400).json({ status: 'error', message: 'La fecha de aplicación está fuera del periodo de vigencia del instrumento', data: null });
  }

  const application = {
    id: uuidv4(),
    subject_id,
    instrument_id,
    application_date: appDateStr,
    notes: notes || null,
    created_at: new Date(),
  };
  store.applications.push(application);

  return res.status(201).json({
    status: 'success',
    message: 'Aplicación registrada correctamente',
    data: application,
  });
});

// ─── RF-M4-04 · POST /metric-values ──────────────────────────────────────────
router.post('/metric-values', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  const { application_id, values } = req.body || {};

  if (!application_id || !values || !Array.isArray(values) || values.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Campos obligatorios: application_id, values (array no vacío)',
      data: null,
    });
  }

  const application = store.applications.find((a) => a.id === application_id);
  if (!application) {
    return res.status(404).json({ status: 'error', message: 'Aplicación no encontrada', data: null });
  }

  const instrumentMetrics = store.metrics.filter((m) => m.instrument_id === application.instrument_id);

  // Verificar métricas obligatorias
  const requiredMetrics = instrumentMetrics.filter((m) => m.required);
  const providedIds = values.map((v) => v.metric_id);
  const missing = requiredMetrics.filter((m) => !providedIds.includes(m.id));

  if (missing.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan valores para métricas obligatorias',
      data: {
        // GAP-M4-01: usar "error" + "metric_name" en lugar de "reason"
        errors: missing.map((m) => ({
          metric_id: m.id,
          metric_name: m.name,
          error: `La métrica "${m.name}" es obligatoria`,
        })),
      },
    });
  }

  // Validar tipo y rango de cada valor (operación atómica: colectar todos los errores primero)
  const errors = [];
  for (const v of values) {
    const metric = instrumentMetrics.find((m) => m.id === v.metric_id);
    if (!metric) {
      errors.push({ metric_id: v.metric_id, metric_name: null, error: 'La métrica no pertenece a este instrumento' });
      continue;
    }

    switch (metric.metric_type) {
      case 'numeric':
        if (typeof v.value !== 'number') {
          errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: 'El valor debe ser un número' });
        } else {
          if (metric.min_value !== null && v.value < metric.min_value) {
            errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: `El valor ${v.value} es menor que min_value (${metric.min_value})` });
          }
          if (metric.max_value !== null && v.value > metric.max_value) {
            errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: `El valor ${v.value} supera max_value (${metric.max_value})` });
          }
        }
        break;
      case 'boolean':
        if (typeof v.value !== 'boolean') {
          errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: 'El valor debe ser un booleano (true | false)' });
        }
        break;
      case 'categorical':
        if (!metric.options.includes(v.value)) {
          errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: `El valor "${v.value}" no está entre las opciones permitidas` });
        }
        break;
      case 'short_text':
        if (typeof v.value !== 'string') {
          errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: 'El valor debe ser una cadena de texto' });
        }
        break;
      default:
        errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: 'Tipo de métrica desconocido' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validación de valores de métrica fallida',
      data: { errors },
    });
  }

  // Persistir de forma atómica
  const recorded = values.map((v) => ({
    id: uuidv4(),
    application_id,
    metric_id: v.metric_id,
    value: v.value,
    created_at: new Date(),
  }));
  store.metricValues.push(...recorded);

  return res.status(201).json({
    status: 'success',
    message: 'Valores de métrica registrados correctamente',
    data: {
      application_id,
      values_count: recorded.length,  // GAP-M4-01: antes era values_recorded
      values: recorded.map((v) => ({ id: v.id, metric_id: v.metric_id, value: v.value })),
    },
  });
});

module.exports = router;
