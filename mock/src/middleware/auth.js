/**
 * Middleware de autenticación JWT + RBAC
 * Implementa la lógica del RF-M1-05 (HU5):
 *   1. Validación de firma HS256
 *   2. Verificación de jti en revoked_tokens
 *   3. Verificación de active=true en users
 *   4. Verificación de password_changed_at (invalida tokens anteriores al cambio)
 *   5. RBAC: rol del token vs. roles permitidos
 *
 * Seguridad (GAP-SEG-02):
 *   - JWT_SECRET: primero Docker Secret (/run/secrets/jwt_secret),
 *     luego variable de entorno JWT_SECRET, luego default de desarrollo.
 *   - Producción: sale con exit(1) si se detecta el secret por defecto.
 *   - Mensajes de error genéricos en español (GAP-SEG-05).
 *   - Eventos de audit log: ACCESO_DENEGADO (GAP-SEG-06).
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

// Bloqueo en producción si se usa el secret por defecto (GAP-SEG-02)
if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
  console.error('[SEGURIDAD CRÍTICA] JWT_SECRET por defecto detectado en entorno de producción.');
  console.error('Configure JWT_SECRET como variable de entorno o Docker Secret antes de iniciar.');
  console.error('Referencia: mock/SECURITY_REPORT.md §SEG-02');
  process.exit(1);
}

const JWT_ALGORITHM = 'HS256';

/**
 * @param {string[]} roles  - Roles permitidos. Array vacío = cualquier rol autenticado.
 */
function authMiddleware(roles = []) {
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
    const user = store.users.find((u) => u.id === payload.user_id);
    if (!user || !user.active) {
      return res.status(401).json({ status: 'error', message: 'No autorizado', data: null });
    }

    // (4) Rechazar tokens emitidos antes del cambio de contraseña (GAP-SEG-07)
    // Fuente autoritativa: store (no payload, para detectar cambios posteriores a emisión)
    if (user.password_changed_at) {
      const changedAtSec = Math.floor(user.password_changed_at.getTime() / 1000);
      if (payload.iat < changedAtSec) {
        return res.status(401).json({ status: 'error', message: 'No autorizado', data: null });
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
