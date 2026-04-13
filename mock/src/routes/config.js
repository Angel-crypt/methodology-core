/**
 * Config global del Registro Operativo — DEPRECADO (CF-014)
 *
 * GET /config/operativo → 410 GONE
 * PUT /config/operativo → 410 GONE
 *
 * Usa GET /projects/:id/config/operativo y PUT /projects/:id/config/operativo.
 */
const express = require('express');

const router = express.Router();

const GONE = {
  status:  'error',
  message: 'Este endpoint fue eliminado. Usa /projects/:id/config/operativo',
  data:    { code: 'GONE' },
};

router.get('/config/operativo', (_req, res) => res.status(410).json(GONE));
router.put('/config/operativo', (_req, res) => res.status(410).json(GONE));

module.exports = router;
