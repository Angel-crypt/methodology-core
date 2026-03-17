/**
 * Middleware de autenticación JWT + RBAC
 * Implementa la lógica del RF-M1-05 (HU5):
 *   1. Validación de firma HS256
 *   2. Verificación de jti en revoked_tokens
 *   3. Verificación de active=true en users
 *   4. Verificación de password_changed_at (invalida tokens anteriores al cambio)
 *   5. RBAC: rol del token vs. roles permitidos
 */
const jwt = require('jsonwebtoken');
const { store } = require('../store');

const JWT_SECRET = process.env.JWT_SECRET || 'mock-jwt-secret-development-only';
const JWT_ALGORITHM = 'HS256';

/**
 * @param {string[]} roles  - Roles permitidos. Array vacío = cualquier rol autenticado.
 */
function authMiddleware(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', data: null });
    }

    const token = authHeader.slice(7);
    let payload;

    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    } catch {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', data: null });
    }

    // (2) Token revocado (logout)
    if (store.revokedTokens.has(payload.jti)) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', data: null });
    }

    // (3) Usuario existe y está activo
    const user = store.users.find((u) => u.id === payload.user_id);
    if (!user || !user.active) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', data: null });
    }

    // (4) Rechazar tokens emitidos antes del cambio de contraseña
    if (user.password_changed_at) {
      const changedAtSec = Math.floor(user.password_changed_at.getTime() / 1000);
      if (payload.iat < changedAtSec) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized', data: null });
      }
    }

    req.user = {
      id: payload.user_id,
      role: payload.role,
      jti: payload.jti,
      exp: payload.exp,
    };

    // (5) RBAC
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: insufficient role permissions',
        data: null,
      });
    }

    next();
  };
}

module.exports = { authMiddleware, JWT_SECRET };
