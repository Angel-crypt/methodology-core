/**
 * In-memory data store
 * Todos los datos se pierden al reiniciar el servidor (comportamiento esperado en un mock).
 * Usuario admin pre-sembrado: admin@mock.local / Admin123!
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
      password_changed_at: null,
    },
  ],

  /**
   * Tokens revocados: Map<jti (string), expiresAt (Unix timestamp seconds)>
   * Limpieza periódica en src/index.js
   */
  revokedTokens: new Map(),

  /**
   * Intentos de login: Map<"ip::email", { count, firstAttemptAt, blockedUntil }>
   */
  loginAttempts: new Map(),

  // M2 – Instrumentos
  instruments: [],

  // M3 – Métricas
  metrics: [],

  // M4 – Registro Operativo
  subjects: [],       // { id, created_at, context: null | ContextObject }
  applications: [],
  metricValues: [],
};

module.exports = { store };
