/**
 * M2 – Gestión de Instrumentos
 * Contratos: RF-M2-01, RF-M2-02_RF-M2-03, RF-M2-04, RF-M2-LIST
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function datesAreValid(start_date, end_date) {
  if (start_date && end_date) {
    return new Date(start_date) < new Date(end_date);
  }
  return true;
}

// ─── RF-M2-01 · POST /instruments ───────────────────────────────────────────
router.post('/instruments', authMiddleware(['administrator']), (req, res) => {
  const { name, methodological_description, start_date, end_date } = req.body || {};

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'Field name is required', data: null });
  }
  if (store.instruments.find((i) => i.name === name)) {
    return res.status(409).json({ status: 'error', message: 'Instrument name already exists', data: null });
  }
  if (!datesAreValid(start_date, end_date)) {
    return res.status(400).json({ status: 'error', message: 'end_date must be after start_date', data: null });
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
    message: 'Instrument created successfully',
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
  let instruments = store.instruments;

  if (req.query.status) {
    instruments = instruments.filter((i) => i.status === req.query.status);
  }

  return res.status(200).json({
    status: 'success',
    message: 'Instruments retrieved',
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

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid status value. Accepted: active | inactive',
      data: null,
    });
  }

  const instrument = store.instruments.find((i) => i.id === req.params.id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrument not found', data: null });
  }

  instrument.status = status;
  instrument.updated_at = new Date();

  return res.status(200).json({
    status: 'success',
    message: 'Instrument status updated',
    data: { id: instrument.id, status: instrument.status, updated_at: instrument.updated_at },
  });
});

// ─── RF-M2-02 + RF-M2-03 · PATCH /instruments/:id ──────────────────────────
router.patch('/instruments/:id', authMiddleware(['administrator']), (req, res) => {
  const { methodological_description, start_date, end_date } = req.body || {};

  const instrument = store.instruments.find((i) => i.id === req.params.id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrument not found', data: null });
  }

  const newStart = start_date !== undefined ? start_date : instrument.start_date;
  const newEnd = end_date !== undefined ? end_date : instrument.end_date;

  if (!datesAreValid(newStart, newEnd)) {
    return res.status(400).json({ status: 'error', message: 'end_date must be after start_date', data: null });
  }

  if (methodological_description !== undefined) instrument.methodological_description = methodological_description;
  if (start_date !== undefined) instrument.start_date = start_date;
  if (end_date !== undefined) instrument.end_date = end_date;
  instrument.updated_at = new Date();

  return res.status(200).json({
    status: 'success',
    message: 'Instrument updated successfully',
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

module.exports = router;
