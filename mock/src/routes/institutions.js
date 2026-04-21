/**
 * Rutas de instituciones (Sprint 4 — CF-S4-003)
 *
 * GET    /institutions               — listar (solo superadmin)
 * POST   /institutions               — crear (solo superadmin)
 * PATCH  /institutions/:id            — editar (solo superadmin)
 * GET    /institutions/resolve?email  — resolver institución por dominio de correo (autenticado)
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

// GET /institutions/resolve?email=X — resolver institución por dominio del correo (soporta subdominios)
// Regla: unam.edu.mx y globaluniversity.edu.mx son distintas; el discriminador es el label antes del TLD compartido.
// Algoritmo: stripping progresivo del subdominio más a la izquierda hasta encontrar match o quedar con <2 partes.
router.get('/resolve', authMiddleware(), (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ status: 'error', message: 'El parámetro email es obligatorio', data: null });
  }

  const raw = email.split('@')[1]?.toLowerCase();
  if (!raw) {
    return res.status(400).json({ status: 'error', message: 'Email inválido', data: null });
  }

  const parts = raw.split('.');
  let matched = null;
  for (let i = 0; i <= parts.length - 2; i++) {
    const candidate = parts.slice(i).join('.');
    matched = store.institutions.find((inst) => inst.domain === candidate);
    if (matched) break;
  }

  return res.status(200).json({
    status: 'success',
    data: matched ? { institution: matched.name, domain: matched.domain } : null,
  });
});

// PATCH /institutions/:id — editar institución (solo superadmin)
router.patch('/:id', authMiddleware(['superadmin']), (req, res) => {
  const { id } = req.params;
  const { name, domain } = req.body || {};

  const institution = store.institutions.find((i) => i.id === id);
  if (!institution) {
    return res.status(404).json({ status: 'error', message: 'Institución no encontrada', data: null });
  }

  if (name !== undefined) {
    const normalized = normalizeName(name);
    // Verificar que no exista otra con el mismo nombre
    const existing = store.institutions.find((i) => i.id !== id && i.name === normalized);
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Ya existe otra institución con ese nombre', data: null });
    }
    institution.name = normalized;
  }

  if (domain !== undefined) {
    // Verificar dominio único
    const existing = store.institutions.find((i) => i.id !== id && i.domain === domain);
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Ya existe otra institución con ese dominio', data: null });
    }
    institution.domain = domain ? domain.trim().toLowerCase() : null;
  }

  return res.status(200).json({
    status: 'success',
    message: 'Institución actualizada',
    data: institution,
  });
});

module.exports = router;
