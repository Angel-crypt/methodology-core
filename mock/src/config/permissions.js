/**
 * Centralización RBAC: roles y grupos de acceso por recurso.
 * Referencia: RF-M1-05, SRS_General §5.3 Control de Acceso
 *
 * Uso:
 *   const { ADMIN_ONLY, APPLICATOR_ROLES } = require('../config/permissions');
 *   router.post('/endpoint', authMiddleware(ADMIN_ONLY), handler);
 */

const ROLES = {
  ADMINISTRATOR: 'administrator',
  RESEARCHER: 'researcher',
  APPLICATOR: 'applicator',
};

/** Solo administradores */
const ADMIN_ONLY = [ROLES.ADMINISTRATOR];

/** Aplicadores y administradores (operaciones de campo: M4) */
const APPLICATOR_ROLES = [ROLES.APPLICATOR, ROLES.ADMINISTRATOR];

/** Cualquier usuario autenticado (sin restricción de rol) */
const ALL_AUTHENTICATED = [];

module.exports = { ROLES, ADMIN_ONLY, APPLICATOR_ROLES, ALL_AUTHENTICATED };
