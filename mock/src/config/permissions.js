/**
 * Centralización RBAC: roles y grupos de acceso por recurso.
 *
 * Uso:
 *   const { ADMIN_ONLY, APPLICATOR_ROLES } = require('../config/permissions');
 *   router.post('/endpoint', authMiddleware(ADMIN_ONLY), handler);
 */

const ROLES = {
  SUPERADMIN: 'superadmin',
  RESEARCHER: 'researcher',
  APPLICATOR: 'applicator',
};

/** Solo superadmin */
const ADMIN_ONLY = [ROLES.SUPERADMIN];

/** Aplicadores y superadmin (operaciones de campo: M4) */
const APPLICATOR_ROLES = [ROLES.APPLICATOR, ROLES.SUPERADMIN];

/** Cualquier usuario autenticado (sin restricción de rol) */
const ALL_AUTHENTICATED = [];

module.exports = { ROLES, ADMIN_ONLY, APPLICATOR_ROLES, ALL_AUTHENTICATED };
