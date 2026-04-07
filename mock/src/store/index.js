/**
 * In-memory data store
 * Todos los datos se pierden al reiniciar el servidor (comportamiento esperado en un mock).
 * Usuario admin pre-sembrado: admin@mock.local / Admin123!
 *
 * NOTA DE SEGURIDAD: Este store es efímero e in-memory. En producción usar
 * PostgreSQL + Redis para persistencia y sesiones distribuidas.
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
      must_change_password: false,
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
   */
  sessions: [],

  /**
   * Audit log compliance: [{ id, event, user_id, ip, timestamp, details }]
   * Eventos: LOGIN, LOGIN_FALLIDO, LOGOUT, CAMBIO_CONTRASENA,
   *          RATE_LIMIT_ACTIVADO, ACCESO_DENEGADO, CONSULTA_USUARIOS
   */
  auditLog: [],

  /**
   * Tokens de recuperación de contraseña: Map<token, { userId, expiresAt (Unix sec) }>
   * NOTA: Solo para mock. En producción, enviar por email y no exponer en API.
   */
  passwordRecoveryTokens: new Map(),

  /**
   * Tokens de configuración inicial de cuenta: Map<token, { userId, expiresAt (Unix sec) }>
   * Generados por el admin al crear un usuario o restablecer su contraseña.
   * TTL: 24 horas. Single-use: se invalidan tras completar el setup.
   * En producción: el token se envía por email y no se expone en la API.
   */
  setupTokens: new Map(),

  // M2 – Instrumentos
  instruments: [],

  // M3 – Métricas
  metrics: [],

  // M4 – Registro Operativo
  subjects: [],       // { id, created_at, context: null | ContextObject }
  applications: [],
  metricValues: [],

  /**
   * Permisos por aplicador: Map<userId, { mode, education_levels, subject_limit }>
   * Gestionados por el Administrador desde DetalleAplicadorPage.
   */
  userPermissions: new Map(),

  // Proyectos: [{ id, name, created_at }]
  projects: [
    { id: 'project-default', name: 'Proyecto por defecto', created_at: new Date() },
  ],

  // Configuración global del wizard (admin la gestiona, aplicadores la leen)
  registroConfig: {
    project_id:           'project-default', // proyecto activo para el registro
    education_levels:     ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'],
    cohort_mode:          'libre',   // 'libre' | 'restricted'
    age_cohort_map: {
      preschool:     '3-6',
      primary_lower: '6-9',
      primary_upper: '9-12',
      secondary:     '12-18',
      unknown:       '',
    },
    school_types:         ['public', 'private', 'unknown'],
    genders:              ['male', 'female', 'non_binary', 'prefer_not_to_say'],
    socioeconomic_levels: ['low', 'medium', 'high', 'unknown'],
  },
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
