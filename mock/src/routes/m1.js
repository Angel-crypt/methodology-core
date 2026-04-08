/**
 * M1 – Autenticación y Control de Acceso
 * Rutas: POST /auth/login|logout|password-recovery|password-reset|setup,
 *        GET /auth/setup/:token, POST/GET /users, PATCH /users/:id/status,
 *        PATCH /users/me/password, POST /users/:id/reset-password,
 *        GET /audit-log, GET/DELETE /sessions
 */
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { store, addAuditEvent } = require('../store');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { validateStrictInput } = require('../middleware/validateStrictInput');

const router = express.Router();

const VALID_ROLES = ['superadmin', 'researcher', 'applicator'];
const JWT_EXPIRES_IN = 21600; // 6 horas (segundos)

// Parámetros de rate limiting (CA-HU3-06, AD-08)
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;      // 60 segundos
const RATE_LIMIT_BLOCK_MS = 5 * 60 * 1000;   // 5 minutos

// Validación básica de formato email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tiempo de expiración de tokens de recuperación: 15 minutos
const RECOVERY_TOKEN_TTL = 15 * 60; // segundos

// ─── Setup tokens — acceso inicial de cuenta ────────────────────────────────
// El admin entrega un URL de único uso con TTL 24h.
// El usuario establece su propia contraseña al hacer clic.
// El admin nunca conoce la contraseña del usuario.

const SETUP_TOKEN_TTL = 24 * 60 * 60; // 24 horas (segundos)

/**
 * Genera un token de setup CSPRNG: 32 bytes → 64 hex chars → 256 bits de entropía.
 * Fuente: crypto.randomBytes() (OS entropy). Prohibido Math.random().
 * @returns {string}
 */
function generateSetupToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /auth/login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(401).json({ status: 'error', message: 'Credenciales inválidas', data: null });
  }

  const clientKey = `${req.ip}::${email}`;
  const now = Date.now();
  const attempts = store.loginAttempts.get(clientKey) || { count: 0, firstAttemptAt: now, blockedUntil: 0 };

  // Bloqueo activo → 401 genérico (anti-fingerprinting – AD-08)
  if (attempts.blockedUntil > now) {
    addAuditEvent('RATE_LIMIT_ACTIVADO', null, req.ip, `Email: ${email} | bloqueado hasta: ${new Date(attempts.blockedUntil).toISOString()}`);
    return res.status(401).json({ status: 'error', message: 'Credenciales inválidas', data: null });
  }

  // Reset de ventana si expiró
  if (now - attempts.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    attempts.count = 0;
    attempts.firstAttemptAt = now;
    attempts.blockedUntil = 0;
  }

  const user = store.users.find((u) => u.email === email);
  const validPassword = user && bcrypt.compareSync(password, user.password_hash);

  // Anti-fingerprinting (AD-07): mismo 401 para cualquier fallo
  if (!user || !validPassword || !user.active) {
    attempts.count += 1;
    if (attempts.count >= RATE_LIMIT_MAX) {
      attempts.blockedUntil = now + RATE_LIMIT_BLOCK_MS;
      addAuditEvent('RATE_LIMIT_ACTIVADO', null, req.ip, `Email: ${email} | intentos: ${attempts.count}`);
    } else {
      addAuditEvent('LOGIN_FALLIDO', null, req.ip, `Email: ${email} | intento: ${attempts.count}`);
    }
    store.loginAttempts.set(clientKey, attempts);
    return res.status(401).json({ status: 'error', message: 'Credenciales inválidas', data: null });
  }

  // Login exitoso → resetear intentos
  store.loginAttempts.delete(clientKey);

  const jti = uuidv4();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + JWT_EXPIRES_IN;

  // pwd_changed_at en payload: el middleware lo compara con iat para invalidar tokens anteriores al cambio de contraseña
  const pwdChangedAt = user.password_changed_at
    ? Math.floor(user.password_changed_at.getTime() / 1000)
    : null;

  const token = jwt.sign(
    { user_id: user.id, role: user.role, full_name: user.full_name, email: user.email, jti, iat, exp, pwd_changed_at: pwdChangedAt },
    JWT_SECRET,
    { algorithm: 'HS256', noTimestamp: true }
  );

  // Registrar sesión activa para permitir gestión de sesiones por el usuario
  store.sessions.push({
    jti,
    user_id: user.id,
    ip: req.ip,
    user_agent: req.headers['user-agent'] || null,
    created_at: new Date(),
    expires_at: exp,
  });

  addAuditEvent('LOGIN', user.id, req.ip, `Email: ${email}`);

  return res.status(200).json({
    status: 'success',
    message: 'Inicio de sesión exitoso',
    data: {
      access_token: token,
      token_type: 'Bearer',
      expires_in: JWT_EXPIRES_IN,
      must_change_password: user.must_change_password === true,
    },
  });
});

// POST /auth/logout
router.post('/auth/logout', authMiddleware(), (req, res) => {
  store.revokedTokens.set(req.user.jti, req.user.exp);

  // Eliminar sesión del store para que no aparezca en GET /sessions
  store.sessions = store.sessions.filter((s) => s.jti !== req.user.jti);

  addAuditEvent('LOGOUT', req.user.id, req.ip, null);

  return res.status(200).json({ status: 'success', message: 'Sesión cerrada correctamente', data: null });
});

// POST /auth/password-recovery
// NOTA DE SEGURIDAD: En producción, enviar token por email y NO exponerlo en la respuesta.
router.post(
  '/auth/password-recovery',
  validateStrictInput(['email']),
  (req, res) => {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ status: 'error', message: 'El campo email es obligatorio', data: null });
    }

    // Respuesta genérica (anti-enumeración de usuarios)
    const user = store.users.find((u) => u.email === email && u.active);
    if (user) {
      const token = uuidv4();
      const expiresAt = Math.floor(Date.now() / 1000) + RECOVERY_TOKEN_TTL;
      store.passwordRecoveryTokens.set(token, { userId: user.id, expiresAt });

      // SOLO EN MOCK: el token se devuelve en la respuesta para facilitar pruebas
      console.log(`[RECOVERY] Token para ${email}: ${token} (expira en 15 min)`);
      return res.status(200).json({
        status: 'success',
        message: 'Si el correo está registrado, recibirá instrucciones de recuperación',
        data: {
          _mock_recovery_token: token, // ELIMINAR en producción
        },
      });
    }

    // Misma respuesta si el email no existe (anti-enumeración)
    return res.status(200).json({
      status: 'success',
      message: 'Si el correo está registrado, recibirá instrucciones de recuperación',
      data: null,
    });
  }
);

// POST /auth/password-reset
router.post(
  '/auth/password-reset',
  validateStrictInput(['recovery_token', 'new_password']),
  (req, res) => {
    const { recovery_token, new_password } = req.body || {};

    if (!recovery_token || !new_password) {
      return res.status(400).json({ status: 'error', message: 'Campos obligatorios: recovery_token, new_password', data: null });
    }

    const tokenData = store.passwordRecoveryTokens.get(recovery_token);
    if (!tokenData || tokenData.expiresAt < Math.floor(Date.now() / 1000)) {
      store.passwordRecoveryTokens.delete(recovery_token);
      return res.status(400).json({ status: 'error', message: 'Token de recuperación inválido o expirado', data: null });
    }

    const user = store.users.find((u) => u.id === tokenData.userId && u.active);
    if (!user) {
      return res.status(400).json({ status: 'error', message: 'Token de recuperación inválido o expirado', data: null });
    }

    user.password_hash = bcrypt.hashSync(new_password, 12);
    user.password_changed_at = new Date();
    store.passwordRecoveryTokens.delete(recovery_token);

    addAuditEvent('CAMBIO_CONTRASENA', user.id, req.ip, 'Vía recuperación de contraseña');

    return res.status(200).json({
      status: 'success',
      message: 'Contraseña restablecida correctamente. Todas las sesiones anteriores han sido invalidadas.',
      data: null,
    });
  }
);

// POST /users
// El admin NO provee contraseña en el cuerpo — el servidor genera el setup token.
// En producción: _mock_setup_token no se expone; se entrega por canal seguro.
router.post(
  '/users',
  authMiddleware(['superadmin']),
  validateStrictInput(['full_name', 'email', 'role']),
  (req, res) => {
    const { full_name, email, role } = req.body || {};

    if (!full_name || !email || !role) {
      return res.status(400).json({ status: 'error', message: 'Campos obligatorios: full_name, email, role', data: null });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ status: 'error', message: 'Formato de email inválido', data: null });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ status: 'error', message: `Rol inválido. Valores aceptados: ${VALID_ROLES.join(' | ')}`, data: null });
    }
    if (store.users.find((u) => u.email === email)) {
      return res.status(409).json({ status: 'error', message: 'El email ya está registrado', data: null });
    }

    // password_hash contiene un placeholder aleatorio que nunca se expone; el usuario
    // no puede autenticarse con él y lo sobreescribe al completar el setup.
    const placeholderPwd = crypto.randomBytes(32).toString('hex');
    const user = {
      id: uuidv4(),
      full_name,
      email,
      password_hash: bcrypt.hashSync(placeholderPwd, 12),
      role,
      active: true,
      must_change_password: true,
      created_at: new Date(),
      updated_at: null,
      password_changed_at: null,
    };
    store.users.push(user);

    // Generar setup token (single-use, TTL 24h)
    const setupToken = generateSetupToken();
    store.setupTokens.set(setupToken, {
      userId: user.id,
      expiresAt: Math.floor(Date.now() / 1000) + SETUP_TOKEN_TTL,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Usuario creado correctamente',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        active: user.active,
        must_change_password: user.must_change_password,
        created_at: user.created_at,
        _mock_setup_token: setupToken, // ELIMINAR en producción — en prod enviar por email
      },
    });
  }
);

// GET /users — respuesta paginada (máx 50), con audit log por acceso
router.get('/users', authMiddleware(['superadmin']), (req, res) => {
  // Validación de filtros
  if (req.query.role && !VALID_ROLES.includes(req.query.role)) {
    return res.status(400).json({ status: 'error', message: `Rol de filtro inválido. Valores aceptados: ${VALID_ROLES.join(' | ')}`, data: null });
  }

  let users = store.users;

  if (req.query.active !== undefined) {
    const activeFilter = req.query.active === 'true';
    users = users.filter((u) => u.active === activeFilter);
  }
  if (req.query.role) {
    users = users.filter((u) => u.role === req.query.role);
  }

  // Paginación: máximo 50 usuarios por página para proteger el sistema de consultas masivas
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  const total = users.length;
  const paginatedUsers = users.slice(offset, offset + limit);

  addAuditEvent('CONSULTA_USUARIOS', req.user.id, req.ip, `page=${page}&limit=${limit}&total=${total}`);

  return res.status(200).json({
    status: 'success',
    message: 'Usuarios recuperados',
    data: paginatedUsers.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      active: u.active,
      must_change_password: u.must_change_password === true,
      created_at: u.created_at,
    })),
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// PATCH /users/me/password
// Debe ir ANTES de /users/:id/status para que "me" no sea capturado por :id
// allowPending=true: el usuario en estado "pending" PUEDE cambiar su contraseña (es el flujo forzado)
router.patch('/users/me/password', authMiddleware([], { allowPending: true }), (req, res) => {
  const { current_password, new_password } = req.body || {};

  if (!current_password || !new_password) {
    return res.status(400).json({ status: 'error', message: 'Campos obligatorios: current_password, new_password', data: null });
  }

  const user = store.users.find((u) => u.id === req.user.id);
  if (!user) {
    // No debería ocurrir con JWT válido, pero defensivo
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor', data: null });
  }

  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ status: 'error', message: 'La contraseña actual es incorrecta', data: null });
  }
  if (bcrypt.compareSync(new_password, user.password_hash)) {
    return res.status(400).json({ status: 'error', message: 'La nueva contraseña debe ser diferente a la actual', data: null });
  }

  const eraPendiente = user.must_change_password === true;

  user.password_hash = bcrypt.hashSync(new_password, 12);
  user.password_changed_at = new Date();
  user.must_change_password = false;

  addAuditEvent(
    'CAMBIO_CONTRASENA',
    user.id,
    req.ip,
    eraPendiente ? 'Cambio forzado en primer acceso' : null
  );

  return res.status(200).json({
    status: 'success',
    message: 'Contraseña actualizada. Todas las sesiones anteriores han sido invalidadas.',
    data: null,
  });
});

// PATCH /users/:id/status
router.patch('/users/:id/status', authMiddleware(['superadmin']), (req, res) => {
  const { active } = req.body || {};

  if (typeof active !== 'boolean') {
    return res.status(400).json({ status: 'error', message: 'El campo active debe ser un booleano', data: null });
  }

  // Un admin no puede desactivar su propia cuenta (evitar quedar sin acceso al sistema)
  if (!active && req.user.id === req.params.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Un administrador no puede desactivar su propia cuenta',
      data: null,
    });
  }

  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado', data: null });
  }

  // Protección: último superadmin activo no puede ser desactivado (CA-HU2-05)
  if (!active && user.role === 'superadmin') {
    const activeAdmins = store.users.filter((u) => u.role === 'superadmin' && u.active);
    if (activeAdmins.length === 1 && activeAdmins[0].id === user.id) {
      return res.status(409).json({
        status: 'error',
        message: 'No es posible desactivar al único superadmin activo',
        data: null,
      });
    }
  }

  user.active = active;
  user.updated_at = new Date();

  return res.status(200).json({
    status: 'success',
    message: 'Estado del usuario actualizado',
    data: { id: user.id, email: user.email, active: user.active, updated_at: user.updated_at },
  });
});

// POST /users/:id/reset-password
// Funciona en estado "pending" (regenerar) y "active" (restablecer → vuelve a pending).
// NOTA DE SEGURIDAD: Solo en mock se devuelve la contraseña en texto plano.
// En producción: nunca exponer en API; entregar por canal seguro fuera de banda.
router.post('/users/:id/reset-password', authMiddleware(['superadmin']), (req, res) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado', data: null });
  }
  if (!user.active) {
    return res.status(409).json({
      status: 'error',
      message: 'No se puede restablecer la contraseña de un usuario inactivo. Actívalo primero.',
      data: null,
    });
  }

  // Se genera un setup link de un solo uso (TTL 24h).
  // password_hash no se modifica: el usuario puede seguir autenticándose con su contraseña anterior,
  // pero el middleware lo bloquea (must_change_password=true) hasta que complete el setup.
  user.must_change_password = true;
  user.password_changed_at = new Date(); // invalida tokens activos del usuario
  user.updated_at = new Date();

  const setupToken = generateSetupToken();
  store.setupTokens.set(setupToken, {
    userId: user.id,
    expiresAt: Math.floor(Date.now() / 1000) + SETUP_TOKEN_TTL,
  });

  addAuditEvent(
    'RESET_CONTRASENA',
    req.user.id,
    req.ip,
    `Admin ${req.user.id} restableció contraseña de usuario ${user.id}`
  );

  return res.status(200).json({
    status: 'success',
    message: 'Enlace de configuración generado. El usuario deberá crear su nueva contraseña antes de 24 horas.',
    data: {
      id: user.id,
      email: user.email,
      must_change_password: true,
      _mock_setup_token: setupToken, // ELIMINAR en producción — en prod enviar por email
    },
  });
});

// GET /auth/setup/:token
// Valida un setup token y devuelve los datos públicos del usuario (sin secretos).
// Endpoint público — no requiere JWT. El frontend lo usa para mostrar nombre y email
// en la pantalla de configuración de contraseña.
router.get('/auth/setup/:token', (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const tokenData = store.setupTokens.get(req.params.token);

  if (!tokenData || tokenData.expiresAt < now) {
    store.setupTokens.delete(req.params.token);
    return res.status(404).json({
      status: 'error',
      message: 'El enlace de configuración es inválido o ha expirado.',
      data: null,
    });
  }

  const user = store.users.find((u) => u.id === tokenData.userId);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'El enlace de configuración es inválido o ha expirado.',
      data: null,
    });
  }

  return res.status(200).json({
    status: 'success',
    message: 'Enlace válido',
    data: { email: user.email, full_name: user.full_name },
  });
});

// POST /auth/setup
// El usuario establece su contraseña usando el setup token.
// Endpoint público — no requiere JWT (el token actúa como credencial temporal).
// Token single-use: se invalida inmediatamente tras su uso.
router.post(
  '/auth/setup',
  validateStrictInput(['token', 'password']),
  (req, res) => {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Campos obligatorios: token, password',
        data: null,
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const tokenData = store.setupTokens.get(token);

    if (!tokenData || tokenData.expiresAt < now) {
      store.setupTokens.delete(token);
      return res.status(400).json({
        status: 'error',
        message: 'El enlace de configuración es inválido o ha expirado.',
        data: null,
      });
    }

    const user = store.users.find((u) => u.id === tokenData.userId);
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'El enlace de configuración es inválido o ha expirado.',
        data: null,
      });
    }

    user.password_hash = bcrypt.hashSync(password, 12);
    user.must_change_password = false;
    user.password_changed_at = new Date();
    store.setupTokens.delete(token); // single-use: invalidar inmediatamente

    addAuditEvent('CAMBIO_CONTRASENA', user.id, req.ip, 'Configuración de contraseña vía setup link');

    return res.status(200).json({
      status: 'success',
      message: 'Contraseña configurada correctamente. Ya puedes iniciar sesión.',
      data: null,
    });
  }
);

// GET /audit-log — solo administrador; soporta filtros por event, user_id, from, to
router.get('/audit-log', authMiddleware(['superadmin']), (req, res) => {
  let entries = store.auditLog;

  // Filtros opcionales
  if (req.query.event) {
    entries = entries.filter((e) => e.event === req.query.event);
  }
  if (req.query.user_id) {
    entries = entries.filter((e) => e.user_id === req.query.user_id);
  }
  if (req.query.from) {
    const from = new Date(req.query.from);
    if (!isNaN(from)) entries = entries.filter((e) => e.timestamp >= from);
  }
  if (req.query.to) {
    const to = new Date(req.query.to);
    if (!isNaN(to)) entries = entries.filter((e) => e.timestamp <= to);
  }

  // Paginación
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  const total = entries.length;

  return res.status(200).json({
    status: 'success',
    message: 'Audit log recuperado',
    data: entries.slice(offset, offset + limit),
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// ─── GET /users/sessions ─── todas las sesiones activas ─────────────────────
// IMPORTANTE: debe ir ANTES de /users/:id para que "sessions" no sea capturado por :id
router.get('/users/sessions', authMiddleware(['superadmin']), (req, res) => {
  const nowSec = Math.floor(Date.now() / 1000);
  const sessions = store.sessions
    .filter((s) => s.expires_at > nowSec)
    .map((s) => ({
      jti: s.jti,
      user_id: s.user_id,
      ip: s.ip,
      user_agent: s.user_agent,
      created_at: s.created_at,
      expires_at: new Date(s.expires_at * 1000),
    }));
  return res.json({ status: 'success', data: sessions });
});

// ─── GET /users/:id ──────────────────────────────────────────────────────────
router.get('/users/:id', authMiddleware(['superadmin']), (req, res) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.', data: null });
  }
  const { password_hash, ...safeUser } = user;
  return res.json({ status: 'success', data: safeUser });
});

// GET /users/me/sessions
// Debe ir ANTES de /users/:id/sessions para que "me" no sea capturado por :id
router.get('/users/me/sessions', authMiddleware(), (req, res) => {
  const nowSec = Math.floor(Date.now() / 1000);
  const sessions = store.sessions
    .filter((s) => s.user_id === req.user.id && s.expires_at > nowSec)
    .map((s) => ({
      jti: s.jti,
      ip: s.ip,
      user_agent: s.user_agent,
      created_at: s.created_at,
      expires_at: new Date(s.expires_at * 1000),
      current: s.jti === req.user.jti,
    }));

  return res.status(200).json({
    status: 'success',
    message: 'Sesiones activas recuperadas',
    data: sessions,
  });
});

// ─── GET /users/:id/sessions ─────────────────────────────────────────────────
router.get('/users/:id/sessions', authMiddleware(['superadmin']), (req, res) => {
  const nowSec = Math.floor(Date.now() / 1000);
  const sessions = store.sessions
    .filter((s) => s.user_id === req.params.id && s.expires_at > nowSec)
    .map((s) => ({
      jti: s.jti,
      ip: s.ip,
      user_agent: s.user_agent,
      created_at: s.created_at,
      expires_at: new Date(s.expires_at * 1000),
    }));
  return res.json({ status: 'success', data: sessions });
});

// ─── GET /users/:id/permissions ──────────────────────────────────────────────
router.get('/users/:id/permissions', authMiddleware(['superadmin']), (req, res) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado', data: null });
  }

  const perms = store.userPermissions.get(req.params.id) || {
    mode: 'libre',
    education_levels: [],
    subject_limit: null,
  };

  return res.json({ status: 'success', data: perms });
});

// ─── PUT /users/:id/permissions ───────────────────────────────────────────────
router.put('/users/:id/permissions', authMiddleware(['superadmin']), (req, res) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado', data: null });
  }

  const { mode, education_levels, subject_limit } = req.body;

  if (mode !== undefined && !['libre', 'restricted'].includes(mode)) {
    return res.status(400).json({ status: 'error', message: 'mode no válido.', data: null });
  }
  if (education_levels !== undefined && !Array.isArray(education_levels)) {
    return res.status(400).json({ status: 'error', message: 'education_levels debe ser un arreglo.', data: null });
  }
  if (subject_limit !== undefined && subject_limit !== null && (typeof subject_limit !== 'number' || subject_limit < 1)) {
    return res.status(400).json({ status: 'error', message: 'subject_limit debe ser un entero positivo o null.', data: null });
  }

  const current = store.userPermissions.get(req.params.id) || { mode: 'libre', education_levels: [], subject_limit: null };
  const updated = {
    mode:             mode             !== undefined ? mode             : current.mode,
    education_levels: education_levels !== undefined ? education_levels : current.education_levels,
    subject_limit:    subject_limit    !== undefined ? subject_limit    : current.subject_limit,
  };

  store.userPermissions.set(req.params.id, updated);

  return res.json({ status: 'success', message: 'Permisos actualizados.', data: updated });
});

// DELETE /sessions/:jti — cierra una sesión específica del usuario autenticado
router.delete('/sessions/:jti', authMiddleware(), (req, res) => {
  const { jti } = req.params;

  const session = store.sessions.find(
    (s) => s.jti === jti && s.user_id === req.user.id
  );

  if (!session) {
    return res.status(404).json({ status: 'error', message: 'Sesión no encontrada', data: null });
  }

  // Revocar token y eliminar sesión
  store.revokedTokens.set(jti, session.expires_at);
  store.sessions = store.sessions.filter((s) => s.jti !== jti);

  addAuditEvent('LOGOUT', req.user.id, req.ip, `Sesión revocada: ${jti}`);

  return res.status(200).json({
    status: 'success',
    message: 'Sesión cerrada correctamente',
    data: null,
  });
});

module.exports = router;
