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

/**
 * Extrae el dominio base de un email: psicologia.unam.mx → unam.mx
 * Si hay subdominio, lo去除 y devuelve solo el dominio base.
 */
function extractBaseDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase() || null;
  if (!domain) return null;

  const parts = domain.split('.');
  // Si hay más de 2 partes,假设 tercer nivel (www.psicologia.unam.mx) o segundo (unam.mx)
  if (parts.length > 2) {
    // Devolver últimas 2 partes: unam.mx, uach.edu.mx
    return parts.slice(-2).join('.');
  }
  return domain;
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
router.get('/resolve', authMiddleware(), (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ status: 'error', message: 'El parámetro email es obligatorio', data: null });
  }

  const baseDomain = extractBaseDomain(email);
  if (!baseDomain) {
    return res.status(400).json({ status: 'error', message: 'Email inválido', data: null });
  }

  // Buscar por dominio exacto o por dominio base (soporta subdominios: psicologia.unam.mx → unam.mx)
  const matched = store.institutions.find(
    (i) => i.domain === baseDomain || (baseDomain.includes(i.domain) && baseDomain.endsWith(i.domain))
  );

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
