/**
 * M2 — Gestión de Instrumentos.
 *
 * Rutas:
 *   POST   /instruments
 *   GET    /instruments              (filtros: ?is_active, ?tag repetible)
 *   GET    /instruments/tags         (catálogo único de tags)
 *   GET    /instruments/:id
 *   PATCH  /instruments/:id          (descripción, fechas, tags, min_days)
 *   PATCH  /instruments/:id/status   (activar/desactivar)
 *   DELETE /instruments/:id          (soft delete)
 *
 * El store guarda `is_active: boolean` directamente.
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Devuelve true si las fechas son coherentes: ambas parseables y
 * end_date estrictamente posterior a start_date.
 */
function datesAreValid(start_date, end_date) {
  if (start_date || end_date) {
    const start = start_date ? new Date(start_date) : null;
    const end = end_date ? new Date(end_date) : null;

    if (start && isNaN(start.getTime())) return false;
    if (end && isNaN(end.getTime())) return false;
    if (start && end && start >= end) return false;
  }
  return true;
}

/**
 * Normaliza una lista de tags: acepta solo arrays de strings no vacíos,
 * aplica trim + lowercase y elimina duplicados preservando el primer orden.
 * Devuelve { ok: true, value } o { ok: false, message }. Si la entrada es
 * undefined/null devuelve un array vacío como default.
 */
function normalizeTags(input) {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) {
    return { ok: false, message: 'tags debe ser un array de strings' };
  }
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    if (typeof raw !== 'string') {
      return { ok: false, message: 'tags debe contener únicamente strings' };
    }
    const norm = raw.trim().toLowerCase();
    if (!norm) {
      return { ok: false, message: 'tags no puede contener strings vacíos' };
    }
    if (!seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return { ok: true, value: out };
}

/**
 * Valida min_days_between_applications: entero ≥ 0.
 * undefined/null se traduce al default 0.
 */
function normalizeMinDays(input) {
  if (input === undefined || input === null) return { ok: true, value: 0 };
  if (typeof input !== 'number' || !Number.isInteger(input) || input < 0) {
    return {
      ok: false,
      message: 'min_days_between_applications debe ser un entero mayor o igual a 0',
    };
  }
  return { ok: true, value: input };
}

/**
 * Convierte un instrumento del store en su representación pública.
 */
function serializeInstrument(i) {
  return {
    id: i.id,
    name: i.name,
    methodological_description: i.methodological_description,
    start_date: i.start_date,
    end_date: i.end_date,
    is_active: i.is_active,
    tags: i.tags || [],
    min_days_between_applications: i.min_days_between_applications ?? 0,
  };
}

// POST /instruments
router.post('/instruments', authMiddleware(['superadmin']), (req, res) => {
  const { name, methodological_description, start_date, end_date, tags, min_days_between_applications } = req.body || {};

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'El campo name es obligatorio', data: null });
  }
  // Rechazar descripción vacía (string vacío no aporta valor)
  if (methodological_description !== undefined && methodological_description !== null
      && typeof methodological_description === 'string' && methodological_description.trim() === '') {
    return res.status(400).json({ status: 'error', message: 'methodological_description no puede ser una cadena vacía', data: null });
  }
  if (store.instruments.find((i) => i.name === name)) {
    return res.status(409).json({ status: 'error', message: 'Ya existe un instrumento con ese nombre', data: null });
  }
  if (!datesAreValid(start_date, end_date)) {
    return res.status(400).json({ status: 'error', message: 'Fechas inválidas: end_date debe ser posterior a start_date', data: null });
  }

  const tagsResult = normalizeTags(tags);
  if (!tagsResult.ok) {
    return res.status(400).json({ status: 'error', message: tagsResult.message, data: null });
  }
  const minDaysResult = normalizeMinDays(min_days_between_applications);
  if (!minDaysResult.ok) {
    return res.status(400).json({ status: 'error', message: minDaysResult.message, data: null });
  }

  const now = new Date();
  const instrument = {
    id: uuidv4(),
    name,
    methodological_description: methodological_description || null,
    start_date: start_date || null,
    end_date: end_date || null,
    is_active: true,
    tags: tagsResult.value,
    min_days_between_applications: minDaysResult.value,
    created_at: now,
    updated_at: now,
  };
  store.instruments.push(instrument);

  return res.status(201).json({
    status: 'success',
    message: 'Instrumento creado correctamente',
    data: {
      ...serializeInstrument(instrument),
      created_at: instrument.created_at,
    },
  });
});

// GET /instruments/tags — catálogo único de tags.
// Debe ir antes de /instruments/:id para que Express no capture "tags" como :id.
router.get('/instruments/tags', authMiddleware(), (_req, res) => {
  const set = new Set();
  for (const inst of store.instruments) {
    if (inst.deleted) continue;
    for (const t of inst.tags || []) set.add(t);
  }
  const tags = Array.from(set).sort((a, b) => a.localeCompare(b));
  return res.status(200).json({
    status: 'success',
    message: 'Tags recuperados',
    data: tags,
  });
});

// GET /instruments — filtros opcionales ?is_active=true|false y ?tag=foo (repetible, OR)
router.get('/instruments', authMiddleware(), (req, res) => {
  let instruments = store.instruments.filter((i) => !i.deleted);

  if (req.query.is_active !== undefined) {
    const activeFilter = req.query.is_active === 'true';
    instruments = instruments.filter((i) => i.is_active === activeFilter);
  }

  // Filtro por tag: case-insensitive, OR semántico, acepta el parámetro repetido.
  if (req.query.tag !== undefined) {
    const rawTags = Array.isArray(req.query.tag) ? req.query.tag : [req.query.tag];
    const wanted = rawTags
      .filter((t) => typeof t === 'string')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (wanted.length > 0) {
      instruments = instruments.filter((i) => {
        const have = i.tags || [];
        return wanted.some((w) => have.includes(w));
      });
    }
  }

  return res.status(200).json({
    status: 'success',
    message: 'Instrumentos recuperados',
    data: instruments.map(serializeInstrument),
  });
});

// PATCH /instruments/:id/status
// Debe ir ANTES de /instruments/:id para que Express no capture "status" como :id
router.patch('/instruments/:id/status', authMiddleware(['superadmin']), (req, res) => {
  const { is_active } = req.body || {};

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      status: 'error',
      message: 'El campo is_active es obligatorio y debe ser un booleano',
      data: null,
    });
  }

  const instrument = store.instruments.find((i) => i.id === req.params.id && !i.deleted);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  instrument.is_active = is_active;
  instrument.updated_at = new Date();

  return res.status(200).json({
    status: 'success',
    message: 'Estado del instrumento actualizado',
    data: { id: instrument.id, name: instrument.name, is_active: instrument.is_active },
  });
});

// PATCH /instruments/:id
router.patch('/instruments/:id', authMiddleware(['superadmin']), (req, res) => {
  // Rechazar body vacío — si no se envía nada no hay qué actualizar
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ status: 'error', message: 'El cuerpo de la solicitud no puede estar vacío', data: null });
  }

  const { methodological_description, start_date, end_date, tags, min_days_between_applications } = req.body;

  const instrument = store.instruments.find((i) => i.id === req.params.id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  // Rechazar descripción vacía en actualización (string vacío no aporta valor)
  if (methodological_description !== undefined && methodological_description !== null
      && typeof methodological_description === 'string' && methodological_description.trim() === '') {
    return res.status(400).json({ status: 'error', message: 'methodological_description no puede ser una cadena vacía', data: null });
  }

  const newStart = start_date !== undefined ? start_date : instrument.start_date;
  const newEnd = end_date !== undefined ? end_date : instrument.end_date;

  if (!datesAreValid(newStart, newEnd)) {
    return res.status(400).json({ status: 'error', message: 'Fechas inválidas: end_date debe ser posterior a start_date', data: null });
  }

  let tagsToApply;
  if (tags !== undefined) {
    const result = normalizeTags(tags);
    if (!result.ok) {
      return res.status(400).json({ status: 'error', message: result.message, data: null });
    }
    tagsToApply = result.value;
  }
  let minDaysToApply;
  if (min_days_between_applications !== undefined) {
    const result = normalizeMinDays(min_days_between_applications);
    if (!result.ok) {
      return res.status(400).json({ status: 'error', message: result.message, data: null });
    }
    minDaysToApply = result.value;
  }

  if (methodological_description !== undefined) instrument.methodological_description = methodological_description;
  if (start_date !== undefined) instrument.start_date = start_date;
  if (end_date !== undefined) instrument.end_date = end_date;
  if (tagsToApply !== undefined) instrument.tags = tagsToApply;
  if (minDaysToApply !== undefined) instrument.min_days_between_applications = minDaysToApply;
  instrument.updated_at = new Date();

  return res.status(200).json({
    status: 'success',
    message: 'Instrumento actualizado correctamente',
    data: {
      ...serializeInstrument(instrument),
      updated_at: instrument.updated_at,
    },
  });
});

// GET /instruments/:id
router.get('/instruments/:id', authMiddleware(), (req, res) => {
  const instrument = store.instruments.find((i) => i.id === req.params.id && !i.deleted);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }
  const metricsCount = store.metrics.filter((m) => m.instrument_id === instrument.id).length;
  return res.status(200).json({
    status: 'success',
    message: 'Instrumento recuperado',
    data: {
      ...serializeInstrument(instrument),
      created_at: instrument.created_at,
      metrics_count: metricsCount,
    },
  });
});

// DELETE /instruments/:id (soft delete)
router.delete('/instruments/:id', authMiddleware(['superadmin']), (req, res) => {
  const instrument = store.instruments.find((i) => i.id === req.params.id && !i.deleted);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }
  instrument.deleted = true;
  instrument.deleted_at = new Date();
  instrument.updated_at = new Date();
  return res.status(200).json({
    status: 'success',
    message: 'Instrumento eliminado correctamente',
    data: { id: instrument.id, name: instrument.name },
  });
});

module.exports = router;
