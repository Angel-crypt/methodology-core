/**
 * M3 – Métricas
 * Contratos: RF-M3-01_RF-M3-02_RF-M3-04, RF-M3-02b_RF-M3-03_RF-M3-04b, RF-M3-LIST
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const VALID_METRIC_TYPES = ['numeric', 'categorical', 'boolean', 'short_text'];

/**
 * Valida la coherencia entre metric_type y sus campos dependientes.
 * @returns {string|null} Mensaje de error, o null si todo es válido.
 */
function validateMetricTypeFields(metric_type, min_value, max_value, options) {
  if (!VALID_METRIC_TYPES.includes(metric_type)) {
    return `metric_type must be one of: ${VALID_METRIC_TYPES.join(' | ')}`;
  }
  if (metric_type !== 'numeric' && (min_value !== undefined && min_value !== null)) {
    return 'min_value is only allowed for metric_type: numeric';
  }
  if (metric_type !== 'numeric' && (max_value !== undefined && max_value !== null)) {
    return 'max_value is only allowed for metric_type: numeric';
  }
  if (metric_type === 'numeric' && min_value !== undefined && max_value !== undefined
      && min_value !== null && max_value !== null && min_value >= max_value) {
    return 'min_value must be less than max_value';
  }
  if (metric_type !== 'categorical' && (options !== undefined && options !== null)) {
    return 'options is only allowed for metric_type: categorical';
  }
  if (metric_type === 'categorical' && (!options || !Array.isArray(options) || options.length === 0)) {
    return 'options is required for metric_type: categorical (must be a non-empty array)';
  }
  return null;
}

// ─── RF-M3-01/02/04 · POST /metrics ─────────────────────────────────────────
router.post('/metrics', authMiddleware(['administrator']), (req, res) => {
  const { instrument_id, name, metric_type, required, min_value, max_value, options, description } = req.body || {};

  if (!instrument_id || !name || !metric_type || required === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: instrument_id, name, metric_type, required',
      data: null,
    });
  }

  const instrument = store.instruments.find((i) => i.id === instrument_id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrument not found', data: null });
  }

  const typeError = validateMetricTypeFields(metric_type, min_value, max_value, options);
  if (typeError) {
    return res.status(400).json({ status: 'error', message: typeError, data: null });
  }

  if (store.metrics.find((m) => m.instrument_id === instrument_id && m.name === name)) {
    return res.status(409).json({
      status: 'error',
      message: 'Metric name already exists for this instrument',
      data: null,
    });
  }

  const now = new Date();
  const metric = {
    id: uuidv4(),
    instrument_id,
    name,
    metric_type,
    required: Boolean(required),
    min_value: metric_type === 'numeric' ? (min_value ?? null) : null,
    max_value: metric_type === 'numeric' ? (max_value ?? null) : null,
    options: metric_type === 'categorical' ? options : null,
    description: description || null,
    created_at: now,
    updated_at: now,
  };
  store.metrics.push(metric);

  return res.status(201).json({
    status: 'success',
    message: 'Metric created successfully',
    data: metric,
  });
});

// ─── RF-M3-LIST · GET /metrics?instrument_id=... ─────────────────────────────
router.get('/metrics', authMiddleware(), (req, res) => {
  const { instrument_id } = req.query;

  if (!instrument_id) {
    return res.status(400).json({ status: 'error', message: 'instrument_id is required', data: null });
  }

  const metrics = store.metrics.filter((m) => m.instrument_id === instrument_id);

  return res.status(200).json({
    status: 'success',
    message: 'Metrics retrieved',
    data: metrics.map((m) => ({
      id: m.id,
      instrument_id: m.instrument_id,
      name: m.name,
      metric_type: m.metric_type,
      required: m.required,
      min_value: m.min_value,
      max_value: m.max_value,
      options: m.options,
      description: m.description,
    })),
  });
});

// ─── RF-M3-02b/03/04b · PATCH /metrics/:id ───────────────────────────────────
router.patch('/metrics/:id', authMiddleware(['administrator']), (req, res) => {
  const { metric_type, required, min_value, max_value, options, description } = req.body || {};

  const metric = store.metrics.find((m) => m.id === req.params.id);
  if (!metric) {
    return res.status(404).json({ status: 'error', message: 'Metric not found', data: null });
  }

  const effectiveType = metric_type !== undefined ? metric_type : metric.metric_type;
  const typeIsChanging = metric_type !== undefined && metric_type !== metric.metric_type;

  // Cuando el tipo cambia, los campos dependientes del tipo anterior no se heredan
  const effectiveMin = min_value !== undefined ? min_value : (typeIsChanging ? undefined : metric.min_value);
  const effectiveMax = max_value !== undefined ? max_value : (typeIsChanging ? undefined : metric.max_value);
  const effectiveOptions = options !== undefined ? options : (typeIsChanging ? undefined : metric.options);

  const typeError = validateMetricTypeFields(effectiveType, effectiveMin, effectiveMax, effectiveOptions);
  if (typeError) {
    return res.status(400).json({ status: 'error', message: typeError, data: null });
  }

  if (metric_type !== undefined) metric.metric_type = metric_type;
  if (required !== undefined) metric.required = Boolean(required);
  metric.min_value = effectiveType === 'numeric' ? (effectiveMin ?? null) : null;
  metric.max_value = effectiveType === 'numeric' ? (effectiveMax ?? null) : null;
  metric.options = effectiveType === 'categorical' ? (effectiveOptions || null) : null;
  if (description !== undefined) metric.description = description;
  metric.updated_at = new Date();

  return res.status(200).json({
    status: 'success',
    message: 'Metric updated successfully',
    data: metric,
  });
});

module.exports = router;
