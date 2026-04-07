/**
 * M3 – Métricas de Instrumentos
 * Rutas canónicas: POST/GET/PATCH/DELETE /instruments/:id/metrics
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const VALID_METRIC_TYPES = ['numeric', 'categorical', 'boolean', 'short_text'];

/**
 * Valida la coherencia entre metric_type y sus campos dependientes.
 * @returns {string|null} Mensaje de error en español, o null si todo es válido.
 */
function validateMetricTypeFields(metric_type, min_value, max_value, options) {
  if (!VALID_METRIC_TYPES.includes(metric_type)) {
    return `metric_type debe ser uno de: ${VALID_METRIC_TYPES.join(' | ')}`;
  }
  if (metric_type !== 'numeric' && (min_value !== undefined && min_value !== null)) {
    return 'min_value solo está permitido para metric_type: numeric';
  }
  if (metric_type !== 'numeric' && (max_value !== undefined && max_value !== null)) {
    return 'max_value solo está permitido para metric_type: numeric';
  }
  if (metric_type === 'numeric' && min_value !== undefined && max_value !== undefined
      && min_value !== null && max_value !== null && min_value >= max_value) {
    return 'min_value debe ser menor que max_value';
  }
  if (metric_type !== 'categorical' && (options !== undefined && options !== null)) {
    return 'options solo está permitido para metric_type: categorical';
  }
  if (metric_type === 'categorical' && (!options || !Array.isArray(options) || options.length === 0)) {
    return 'options es obligatorio para metric_type: categorical (debe ser un array no vacío)';
  }
  return null;
}

// POST /instruments/:instrumentId/metrics
router.post('/instruments/:instrumentId/metrics', authMiddleware(['administrator']), (req, res) => {
  const { instrumentId } = req.params;
  const { name, metric_type, required, min_value, max_value, options, description } = req.body || {};

  if (!name || !metric_type || required === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Campos obligatorios: name, metric_type, required',
      data: null,
    });
  }

  const instrument = store.instruments.find((i) => i.id === instrumentId && !i.deleted);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  const typeError = validateMetricTypeFields(metric_type, min_value, max_value, options);
  if (typeError) {
    return res.status(400).json({ status: 'error', message: typeError, data: null });
  }

  if (store.metrics.find((m) => m.instrument_id === instrumentId && m.name === name)) {
    return res.status(409).json({
      status: 'error',
      message: 'Ya existe una métrica con ese nombre para este instrumento',
      data: null,
    });
  }

  const now = new Date();
  const metric = {
    id: uuidv4(),
    instrument_id: instrumentId,
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

  return res.status(201).json({ status: 'success', message: 'Métrica creada correctamente', data: metric });
});

// GET /instruments/:instrumentId/metrics
// Tres casos: 404 instrumento no existe, 200+[] sin métricas, 200+[...] con métricas
router.get('/instruments/:instrumentId/metrics', authMiddleware(), (req, res) => {
  const { instrumentId } = req.params;

  const instrument = store.instruments.find((i) => i.id === instrumentId && !i.deleted);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  const metrics = store.metrics.filter((m) => m.instrument_id === instrumentId);

  return res.status(200).json({
    status: 'success',
    message: 'Métricas recuperadas',
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

// PATCH /instruments/:instrumentId/metrics/:metricId
router.patch('/instruments/:instrumentId/metrics/:metricId', authMiddleware(['administrator']), (req, res) => {
  const { instrumentId, metricId } = req.params;
  const { name, metric_type, required, min_value, max_value, options, description } = req.body || {};

  const metric = store.metrics.find((m) => m.id === metricId && m.instrument_id === instrumentId);
  if (!metric) {
    return res.status(404).json({ status: 'error', message: 'Métrica no encontrada', data: null });
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

  if (name !== undefined) metric.name = name;
  if (metric_type !== undefined) metric.metric_type = metric_type;
  if (required !== undefined) metric.required = Boolean(required);
  metric.min_value = effectiveType === 'numeric' ? (effectiveMin ?? null) : null;
  metric.max_value = effectiveType === 'numeric' ? (effectiveMax ?? null) : null;
  metric.options = effectiveType === 'categorical' ? (effectiveOptions || null) : null;
  if (description !== undefined) metric.description = description;
  metric.updated_at = new Date();

  return res.status(200).json({ status: 'success', message: 'Métrica actualizada correctamente', data: metric });
});

// DELETE /instruments/:instrumentId/metrics/:metricId
router.delete('/instruments/:instrumentId/metrics/:metricId', authMiddleware(['administrator']), (req, res) => {
  const { instrumentId, metricId } = req.params;
  const idx = store.metrics.findIndex((m) => m.id === metricId && m.instrument_id === instrumentId);
  if (idx === -1) {
    return res.status(404).json({ status: 'error', message: 'Métrica no encontrada', data: null });
  }
  const [removed] = store.metrics.splice(idx, 1);
  return res.status(200).json({
    status: 'success',
    message: 'Métrica eliminada correctamente',
    data: { id: removed.id, name: removed.name },
  });
});

module.exports = router;
