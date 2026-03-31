/**
 * M2 – Gestión de Instrumentos
 * Contratos: RF-M2-01, RF-M2-02_RF-M2-03, RF-M2-04, RF-M2-LIST
 *
 * Cambios aplicados (GAP-M2-01..M2-05):
 *   - datesAreValid: rechaza fechas inválidas (NaN) (GAP-M2-04)
 *   - POST /instruments: rechaza methodological_description vacío (GAP-M2-02)
 *   - PATCH /instruments/:id: rechaza body vacío (GAP-M2-03)
 *   - PATCH /instruments/:id/status: respuesta {id, name, status} (GAP-M2-01)
 *   - GET /instruments: valida enum de status (GAP-M2-05)
 *   - Mensajes genéricos en español (GAP-SEG-05)
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['active', 'inactive'];

/**
 * Valida la coherencia entre start_date y end_date.
 * Rechaza fechas inválidas (NaN) y end_date <= start_date.
 * GAP-M2-04: la versión anterior aceptaba fechas inválidas.
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

// ─── RF-M2-01 · POST /instruments ───────────────────────────────────────────
router.post('/instruments', authMiddleware(['administrator']), (req, res) => {
  const { name, methodological_description, start_date, end_date } = req.body || {};

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'El campo name es obligatorio', data: null });
  }
  // GAP-M2-02: rechazar descripción vacía (string vacío)
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

  const now = new Date();
  const instrument = {
    id: uuidv4(),
    name,
    methodological_description: methodological_description || null,
    start_date: start_date || null,
    end_date: end_date || null,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  store.instruments.push(instrument);

  return res.status(201).json({
    status: 'success',
    message: 'Instrumento creado correctamente',
    data: {
      id: instrument.id,
      name: instrument.name,
      methodological_description: instrument.methodological_description,
      start_date: instrument.start_date,
      end_date: instrument.end_date,
      status: instrument.status,
      created_at: instrument.created_at,
    },
  });
});

// ─── RF-M2-LIST · GET /instruments ──────────────────────────────────────────
router.get('/instruments', authMiddleware(), (req, res) => {
  // GAP-M2-05: validar enum de status
  if (req.query.status && !VALID_STATUSES.includes(req.query.status)) {
    return res.status(400).json({
      status: 'error',
      message: `Estado de filtro inválido. Valores aceptados: ${VALID_STATUSES.join(' | ')}`,
      data: null,
    });
  }

  let instruments = store.instruments.filter((i) => !i.deleted);
  if (req.query.status) {
    instruments = instruments.filter((i) => i.status === req.query.status);
  }

  return res.status(200).json({
    status: 'success',
    message: 'Instrumentos recuperados',
    data: instruments.map((i) => ({
      id: i.id,
      name: i.name,
      methodological_description: i.methodological_description,
      start_date: i.start_date,
      end_date: i.end_date,
      status: i.status,
    })),
  });
});

// ─── RF-M2-04 · PATCH /instruments/:id/status ───────────────────────────────
// NOTA: debe ir ANTES de /instruments/:id para evitar que ":id" capture "xxx/status"
router.patch('/instruments/:id/status', authMiddleware(['administrator']), (req, res) => {
  const { status } = req.body || {};

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: `Estado inválido. Valores aceptados: ${VALID_STATUSES.join(' | ')}`,
      data: null,
    });
  }

  const instrument = store.instruments.find((i) => i.id === req.params.id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  instrument.status = status;
  instrument.updated_at = new Date();

  // GAP-M2-01: respuesta incluye {id, name, status} (no updated_at)
  return res.status(200).json({
    status: 'success',
    message: 'Estado del instrumento actualizado',
    data: { id: instrument.id, name: instrument.name, status: instrument.status },
  });
});

// ─── RF-M2-02 + RF-M2-03 · PATCH /instruments/:id ──────────────────────────
router.patch('/instruments/:id', authMiddleware(['administrator']), (req, res) => {
  // GAP-M2-03: rechazar body vacío
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ status: 'error', message: 'El cuerpo de la solicitud no puede estar vacío', data: null });
  }

  const { methodological_description, start_date, end_date } = req.body;

  const instrument = store.instruments.find((i) => i.id === req.params.id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  // GAP-M2-02: rechazar descripción vacía en actualización
  if (methodological_description !== undefined && methodological_description !== null
      && typeof methodological_description === 'string' && methodological_description.trim() === '') {
    return res.status(400).json({ status: 'error', message: 'methodological_description no puede ser una cadena vacía', data: null });
  }

  const newStart = start_date !== undefined ? start_date : instrument.start_date;
  const newEnd = end_date !== undefined ? end_date : instrument.end_date;

  if (!datesAreValid(newStart, newEnd)) {
    return res.status(400).json({ status: 'error', message: 'Fechas inválidas: end_date debe ser posterior a start_date', data: null });
  }

  if (methodological_description !== undefined) instrument.methodological_description = methodological_description;
  if (start_date !== undefined) instrument.start_date = start_date;
  if (end_date !== undefined) instrument.end_date = end_date;
  instrument.updated_at = new Date();

  return res.status(200).json({
    status: 'success',
    message: 'Instrumento actualizado correctamente',
    data: {
      id: instrument.id,
      name: instrument.name,
      methodological_description: instrument.methodological_description,
      start_date: instrument.start_date,
      end_date: instrument.end_date,
      status: instrument.status,
      updated_at: instrument.updated_at,
    },
  });
});

// ─── GET /instruments/:id ────────────────────────────────────────────────────
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
      id: instrument.id,
      name: instrument.name,
      methodological_description: instrument.methodological_description,
      start_date: instrument.start_date,
      end_date: instrument.end_date,
      status: instrument.status,
      created_at: instrument.created_at,
      metrics_count: metricsCount,
    },
  });
});

// ─── DELETE /instruments/:id  (soft delete) ──────────────────────────────────
router.delete('/instruments/:id', authMiddleware(['administrator']), (req, res) => {
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
