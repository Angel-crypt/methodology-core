/**
 * Rutas de instituciones (Sprint 4 — CF-S4-003)
 *
 * GET  /institutions               — listar (solo superadmin)
 * POST /institutions               — crear (solo superadmin)
 * GET  /institutions/resolve?email — resolver institución por dominio de correo (autenticado)
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Normaliza un nombre de institución: lowercase, sin acentos, solo alfanumérico y espacios.
 */
function normalizeName(raw) {
  return raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// GET /institutions — lista para administración
router.get('/', authMiddleware(['superadmin']), (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: store.institutions,
  });
});

// POST /institutions — crear institución
router.post('/', authMiddleware(['superadmin']), (req, res) => {
  const { name, domain } = req.body || {};

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'El campo name es obligatorio', data: null });
  }

  const normalized = normalizeName(name);

  if (store.institutions.find((i) => i.name === normalized)) {
    return res.status(409).json({ status: 'error', message: 'La institución ya existe', data: null });
  }

  const institution = {
    id: uuidv4(),
    name: normalized,
    domain: domain ? domain.trim().toLowerCase() : null,
    created_at: new Date(),
  };

  store.institutions.push(institution);

  return res.status(201).json({
    status: 'success',
    data: institution,
  });
});

// GET /institutions/resolve?email=X — resolver institución por dominio del correo
router.get('/resolve', authMiddleware(), (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ status: 'error', message: 'El parámetro email es obligatorio', data: null });
  }

  const domain = email.split('@')[1]?.toLowerCase() || null;
  const matched = domain ? store.institutions.find((i) => i.domain === domain) : null;

  return res.status(200).json({
    status: 'success',
    data: matched ? { institution: matched.name, domain: matched.domain } : null,
  });
});

module.exports = router;
