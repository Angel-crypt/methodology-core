/**
 * In-memory data store
 * Todos los datos se pierden al reiniciar el servidor (comportamiento esperado en un mock).
 * Usuario admin pre-sembrado: admin@mock.local / Admin123!
 *
 * NOTA DE SEGURIDAD: Este store es efímero e in-memory. En producción usar
 * PostgreSQL + Redis para persistencia y sesiones distribuidas.
 * Referencia: mock/SECURITY_REPORT.md §SEG-01
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const ADMIN_ID = uuidv4();

const store = {
  // M1 – Autenticación
  users: [
    {
      id: ADMIN_ID,
      full_name: 'Administrador Mock',
      email: 'admin@mock.local',
      password_hash: bcrypt.hashSync('Admin123!', 12),
      role: 'administrator',
      active: true,
      created_at: new Date(),
      updated_at: null,
      password_changed_at: null,
    },
  ],

  /**
   * Tokens revocados: Map<jti (string), expiresAt (Unix timestamp seconds)>
   * Limpieza periódica en src/index.js
   * NOTA: La revocación de tokens se pierde al reiniciar (limitación de mock).
   */
  revokedTokens: new Map(),

  /**
   * Intentos de login: Map<"ip::email", { count, firstAttemptAt, blockedUntil }>
   * Rate limiting best-effort en memoria. Backend real debe usar Redis.
   */
  loginAttempts: new Map(),

  /**
   * Sesiones activas: [{ jti, user_id, ip, user_agent, created_at, expires_at }]
   * Permite gestión de sesiones (GET /users/me/sessions, DELETE /sessions/:jti).
   * Referencia: GAP-SEG-08
   */
  sessions: [],

  /**
   * Audit log compliance: [{ id, event, user_id, ip, timestamp, details }]
   * Eventos: LOGIN, LOGIN_FALLIDO, LOGOUT, CAMBIO_CONTRASENA,
   *          RATE_LIMIT_ACTIVADO, ACCESO_DENEGADO, CONSULTA_USUARIOS
   * Referencia: RF-M1-03, RNF-SEC-12, GAP-M1-03
   */
  auditLog: [],

  /**
   * Tokens de recuperación de contraseña: Map<token, { userId, expiresAt (Unix sec) }>
   * NOTA: Solo para mock. En producción, enviar por email y no exponer en API.
   */
  passwordRecoveryTokens: new Map(),

  // M2 – Instrumentos
  instruments: [],

  // M3 – Métricas
  metrics: [],

  // M4 – Registro Operativo
  subjects: [],       // { id, created_at, context: null | ContextObject }
  applications: [],
  metricValues: [],
};

/**
 * Registra un evento en el audit log.
 * @param {string} event - Tipo de evento
 * @param {string|null} userId - ID del usuario (null si no autenticado)
 * @param {string} ip - IP del cliente
 * @param {string|null} details - Detalle interno (no expuesto al cliente)
 */
function addAuditEvent(event, userId, ip, details) {
  store.auditLog.push({
    id: uuidv4(),
    event,
    user_id: userId || null,
    ip: ip || 'unknown',
    timestamp: new Date(),
    details: details || null,
  });
}

module.exports = { store, addAuditEvent };
