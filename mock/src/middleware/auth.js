/**
 * Middleware de autenticación JWT + RBAC
 * Pasos de validación en orden:
 *   1. Firma HS256 válida
 *   2. jti no en revoked_tokens (token no revocado)
 *   3. Usuario existe y está activo
 *   4. Token emitido antes del último cambio de contraseña → rechazar
 *   5. RBAC: rol del token vs. roles requeridos por la ruta
 *
 * JWT_SECRET: Docker Secret (/run/secrets/jwt_secret) > env JWT_SECRET > default de desarrollo.
 * En producción: termina el proceso si se detecta el secret por defecto.
 */
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { store, addAuditEvent } = require('../store');

// ── Carga del JWT_SECRET ────────────────────────────────────────────────────
// Prioridad: Docker Secret > variable de entorno > default (solo desarrollo)
const DOCKER_SECRET_PATH = '/run/secrets/jwt_secret';
const DEFAULT_SECRET = 'mock-jwt-secret-development-only';

let JWT_SECRET;
if (fs.existsSync(DOCKER_SECRET_PATH)) {
  // Producción con Docker Secrets
  JWT_SECRET = fs.readFileSync(DOCKER_SECRET_PATH, 'utf8').trim();
} else {
  JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;
}

// Bloqueo en producción si se usa el secret por defecto
if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
  console.error('[SEGURIDAD CRÍTICA] JWT_SECRET por defecto detectado en entorno de producción.');
  console.error('Configure JWT_SECRET como variable de entorno o Docker Secret antes de iniciar.');
  process.exit(1);
}

const JWT_ALGORITHM = 'HS256';

/**
 * @param {string[]} roles  - Roles permitidos. Array vacío = cualquier rol autenticado.
 * @param {{ allowPending?: boolean }} options
 *   allowPending: si true, permite el acceso aunque must_change_password=true.
 *   Usar en PATCH /users/me/password para que el usuario pendiente pueda cambiar su contraseña.
 */
function authMiddleware(roles = [], { allowPending = false } = {}) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'No autorizado', data: null });
    }

    const token = authHeader.slice(7);
    let payload;

    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    } catch {
      return res.status(401).json({ status: 'error', message: 'No autorizado', data: null });
    }

    // (2) Token revocado (logout)
    if (store.revokedTokens.has(payload.jti)) {
      return res.status(401).json({ status: 'error', message: 'No autorizado', data: null });
    }

    // (3) Usuario existe y está activo
    const user = store.users.find((u) => u.id === payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ status: 'error', message: 'No autorizado', data: null });
    }

    // (4) Rechazar tokens emitidos antes del cambio de contraseña.
    // Se consulta el store (no el payload) para detectar cambios que ocurrieron después de emitir el token.
    if (user.password_changed_at) {
      const changedAtSec = Math.floor(user.password_changed_at.getTime() / 1000);
      if (payload.iat < changedAtSec) {
        return res.status(401).json({ status: 'error', message: 'No autorizado', data: null });
      }
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
      jti: payload.jti,
      exp: payload.exp,
    };

    // (4b) Un usuario en estado "pending" solo puede acceder a PATCH /users/me/password.
    if (!allowPending && user.must_change_password) {
      return res.status(403).json({
        status: 'error',
        message: 'Debes cambiar tu contraseña antes de continuar.',
        data: { must_change_password: true },
      });
    }

    // (5) RBAC
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      addAuditEvent(
        'ACCESO_DENEGADO',
        req.user.id,
        req.ip,
        `${req.method} ${req.path} | requiere: ${roles.join('|')} | tiene: ${req.user.role}`
      );
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado: permisos insuficientes',
        data: null,
      });
    }

    next();
  };
}

module.exports = { authMiddleware, JWT_SECRET, DEFAULT_SECRET };
