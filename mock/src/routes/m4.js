/**
 * M4 – Registro Operativo
 * Contratos: RF-M4-01..04, RF-M4-GET-SUBJECT
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const APPLICATOR_ROLES = ['applicator', 'administrator'];

// Enums definidos en los contratos XML (M4 contextAttributes)
const VALID_SCHOOL_TYPES = ['public', 'private', 'unknown'];
const VALID_EDUCATION_LEVELS = ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'];
const VALID_GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'];
const VALID_SOCIO_LEVELS = ['low', 'medium', 'high', 'unknown'];

// ─── RF-M4-01 · POST /subjects ───────────────────────────────────────────────
router.post('/subjects', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  // Privacy by Design (AD-09): el body debe estar vacío
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({ status: 'error', message: 'Request body must be empty', data: null });
  }

  const subject = {
    id: uuidv4(),
    created_at: new Date(),
    context: null,
  };
  store.subjects.push(subject);

  return res.status(201).json({
    status: 'success',
    message: 'Subject registered successfully',
    data: { id: subject.id, created_at: subject.created_at },
  });
});

// ─── RF-M4-02 · POST /subjects/:id/context ───────────────────────────────────
router.post('/subjects/:id/context', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  const subject = store.subjects.find((s) => s.id === req.params.id);
  if (!subject) {
    return res.status(404).json({ status: 'error', message: 'Subject not found', data: null });
  }

  const { school_type, education_level, age_cohort, gender, socioeconomic_level, additional_attributes } = req.body || {};

  if (school_type && !VALID_SCHOOL_TYPES.includes(school_type)) {
    return res.status(400).json({ status: 'error', message: `Invalid school_type. Accepted: ${VALID_SCHOOL_TYPES.join(' | ')}`, data: null });
  }
  if (education_level && !VALID_EDUCATION_LEVELS.includes(education_level)) {
    return res.status(400).json({ status: 'error', message: `Invalid education_level. Accepted: ${VALID_EDUCATION_LEVELS.join(' | ')}`, data: null });
  }
  if (gender && !VALID_GENDERS.includes(gender)) {
    return res.status(400).json({ status: 'error', message: `Invalid gender. Accepted: ${VALID_GENDERS.join(' | ')}`, data: null });
  }
  if (socioeconomic_level && !VALID_SOCIO_LEVELS.includes(socioeconomic_level)) {
    return res.status(400).json({ status: 'error', message: `Invalid socioeconomic_level. Accepted: ${VALID_SOCIO_LEVELS.join(' | ')}`, data: null });
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

  return res.status(201).json({
    status: 'success',
    message: 'Context registered successfully',
    data: context,
  });
});

// ─── RF-M4-GET-SUBJECT · GET /subjects/:id ───────────────────────────────────
router.get('/subjects/:id', authMiddleware(), (req, res) => {
  const subject = store.subjects.find((s) => s.id === req.params.id);
  if (!subject) {
    return res.status(404).json({ status: 'error', message: 'Subject not found', data: null });
  }

  return res.status(200).json({
    status: 'success',
    message: 'Subject retrieved',
    data: {
      id: subject.id,
      created_at: subject.created_at,
      context: subject.context,
    },
  });
});

// ─── RF-M4-03 · POST /applications ───────────────────────────────────────────
router.post('/applications', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  const { subject_id, instrument_id, application_date, notes } = req.body || {};

  if (!subject_id || !instrument_id) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields: subject_id, instrument_id', data: null });
  }

  const subject = store.subjects.find((s) => s.id === subject_id);
  if (!subject) {
    return res.status(404).json({ status: 'error', message: 'Subject not found', data: null });
  }

  const instrument = store.instruments.find((i) => i.id === instrument_id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrument not found', data: null });
  }

  if (instrument.status !== 'active') {
    return res.status(422).json({
      status: 'error',
      message: 'Instrument is inactive and cannot receive new applications',
      data: null,
    });
  }

  // Fecha de aplicación: usa la actual si no se proporciona
  let appDate;
  if (application_date) {
    appDate = new Date(application_date);
    if (isNaN(appDate.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid application_date format. Use ISO 8601: YYYY-MM-DD', data: null });
    }
  } else {
    appDate = new Date();
  }

  // Validar periodo de vigencia del instrumento
  if (instrument.start_date && appDate < new Date(instrument.start_date)) {
    return res.status(400).json({ status: 'error', message: 'application_date is outside the instrument validity period', data: null });
  }
  if (instrument.end_date && appDate > new Date(instrument.end_date)) {
    return res.status(400).json({ status: 'error', message: 'application_date is outside the instrument validity period', data: null });
  }

  const application = {
    id: uuidv4(),
    subject_id,
    instrument_id,
    application_date: appDate.toISOString().split('T')[0],
    notes: notes || null,
    created_at: new Date(),
  };
  store.applications.push(application);

  return res.status(201).json({
    status: 'success',
    message: 'Application registered successfully',
    data: application,
  });
});

// ─── RF-M4-04 · POST /metric-values ──────────────────────────────────────────
router.post('/metric-values', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  const { application_id, values } = req.body || {};

  if (!application_id || !values || !Array.isArray(values) || values.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: application_id, values (non-empty array)',
      data: null,
    });
  }

  const application = store.applications.find((a) => a.id === application_id);
  if (!application) {
    return res.status(404).json({ status: 'error', message: 'Application not found', data: null });
  }

  const instrumentMetrics = store.metrics.filter((m) => m.instrument_id === application.instrument_id);

  // Verificar métricas obligatorias
  const requiredMetrics = instrumentMetrics.filter((m) => m.required);
  const providedIds = values.map((v) => v.metric_id);
  const missing = requiredMetrics.filter((m) => !providedIds.includes(m.id));

  if (missing.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required metric values',
      data: {
        errors: missing.map((m) => ({ metric_id: m.id, reason: `Required metric "${m.name}" is missing` })),
      },
    });
  }

  // Validar tipo y rango de cada valor (operación atómica: colectar todos los errores primero)
  const errors = [];
  for (const v of values) {
    const metric = instrumentMetrics.find((m) => m.id === v.metric_id);
    if (!metric) {
      errors.push({ metric_id: v.metric_id, reason: 'Metric does not belong to this instrument' });
      continue;
    }

    switch (metric.metric_type) {
      case 'numeric':
        if (typeof v.value !== 'number') {
          errors.push({ metric_id: v.metric_id, reason: 'Value must be a number' });
        } else {
          if (metric.min_value !== null && v.value < metric.min_value) {
            errors.push({ metric_id: v.metric_id, reason: `Value ${v.value} is below min_value ${metric.min_value}` });
          }
          if (metric.max_value !== null && v.value > metric.max_value) {
            errors.push({ metric_id: v.metric_id, reason: `Value ${v.value} exceeds max_value ${metric.max_value}` });
          }
        }
        break;
      case 'boolean':
        if (typeof v.value !== 'boolean') {
          errors.push({ metric_id: v.metric_id, reason: 'Value must be a boolean (true | false)' });
        }
        break;
      case 'categorical':
        if (!metric.options.includes(v.value)) {
          errors.push({ metric_id: v.metric_id, reason: `Value "${v.value}" is not in allowed options: [${metric.options.join(', ')}]` });
        }
        break;
      case 'short_text':
        if (typeof v.value !== 'string') {
          errors.push({ metric_id: v.metric_id, reason: 'Value must be a string' });
        }
        break;
      default:
        errors.push({ metric_id: v.metric_id, reason: 'Unknown metric_type' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Metric value validation failed',
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
    message: 'Metric values submitted successfully',
    data: {
      application_id,
      values_recorded: recorded.length,
      values: recorded.map((v) => ({ id: v.id, metric_id: v.metric_id, value: v.value })),
    },
  });
});

module.exports = router;
