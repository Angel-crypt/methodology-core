/**
 * In-memory data store
 * Todos los datos se pierden al reiniciar el servidor (comportamiento esperado en un mock).
 *
 * Credenciales del SUPERADMIN: definir SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD en .env.
 * Si no están definidas se usan los defaults de desarrollo; el servidor imprime una advertencia.
 *
 * NOTA DE SEGURIDAD: Este store es efímero e in-memory. En producción usar
 * PostgreSQL + Redis para persistencia y sesiones distribuidas.
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const SUPERADMIN_ID = uuidv4();

const SUPERADMIN_EMAIL_DEFAULT    = 'super@methodology.local';
const SUPERADMIN_PASSWORD_DEFAULT = 'metodologia-bootstrap-cambiar-pronto';

const superadminEmail    = process.env.SUPERADMIN_EMAIL    || SUPERADMIN_EMAIL_DEFAULT;
const superadminPassword = process.env.SUPERADMIN_PASSWORD || SUPERADMIN_PASSWORD_DEFAULT;

const usingBootstrapDefaults =
  !process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD;

const store = {
  // M1 – Autenticación
  users: [
    {
      id: SUPERADMIN_ID,
      full_name: 'Superadministrador',
      email: superadminEmail,
      password_hash: bcrypt.hashSync(superadminPassword, 12),
      role: 'superadmin',
      active: true,
      must_change_password: usingBootstrapDefaults,
      broker_subject: null,
      token_version: 0,
      created_at: new Date(),
      updated_at: null,
      password_changed_at: null,
      // Perfil extendido (Sprint 4)
      phone: null,
      institution: null,
      terms_accepted_at: null,
      onboarding_completed: true, // superadmin exento de onboarding
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
   * Generados por el admin al crear un usuario o al reenviar magic link.
   * TTL: 24 horas. Single-use: se invalidan tras la activación.
   */
  setupTokens: new Map(),

  /**
   * Solicitudes de cambio de correo: [{ id, user_id, new_email, reason, created_at }]
   * Solo el superadmin puede ver y aprobar/rechazar.
   */
  emailChangeRequests: [],

  // M1-EXT — Instituciones (Sprint 4)
  institutions: [], // { id, name, domain, created_at }

  // M1-EXT — Configuración de perfil requerido (Sprint 4)
  profileConfig: {
    require_phone: false,
    require_institution: true,
    require_terms: true,
  },

  // M2 – Instrumentos
  instruments: [],

  // M3 – Métricas
  metrics: [],

  // M4 – Registro Operativo
  subjects: [],       // { id, project_id, created_by, created_at, context: null | ContextObject }
  applications: [],
  metricValues: [],

  /**
   * Permisos por aplicador: Map<userId, { mode, education_levels, subject_limit }>
   * Gestionados por el Administrador desde DetalleAplicadorPage.
   */
  userPermissions: new Map(),

  // M2-PROJECT — Proyectos
  projects: [],       // { id, name, description, created_by, created_at, updated_at }
  projectMembers: [], // { id, project_id, user_id, role: 'researcher'|'applicator', added_at }
  projectInstruments: [], // { id, project_id, instrument_id, added_at }

  /**
   * Config operativa por proyecto: Map<project_id, { education_levels, age_cohort_ranges, subject_limit, mode }>
   */
  projectConfigs: new Map(),

  // Configuración global del wizard (legado — mantenida para retrocompatibilidad de tests previos)
  registroConfig: {
    education_levels:     ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'],
    cohort_mode:          'libre',
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
 * Indica si el servidor arrancó con credenciales de bootstrap por defecto.
 * Usado en mock/src/index.js para imprimir la advertencia.
 */
store._usingBootstrapDefaults = usingBootstrapDefaults;
store._superadminEmail        = superadminEmail;

// ── Defaults del sistema para configuración operativa por proyecto ────────────
const SYSTEM_DEFAULTS_CONFIG = {
  education_levels: ['Preescolar', 'Primaria menor', 'Primaria mayor', 'Secundaria'],
  age_cohort_map: {
    'Preescolar':     '3-6',
    'Primaria menor': '6-9',
    'Primaria mayor': '9-12',
    'Secundaria':     '12-15',
  },
  age_cohort_ranges: ['3-6', '6-9', '9-12', '12-15'],
  cohort_mode:   'libre',
  subject_limit: 50,
  mode:          'normal',
};

// Exponer los defaults para que projects.js pueda importarlos
store._systemDefaults = SYSTEM_DEFAULTS_CONFIG;

// Sin proyectos precargados — el administrador los crea desde la UI.

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
