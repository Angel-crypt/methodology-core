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
      user: { id: user.id, role: user.role },
    },
  });
});

// ─── OIDC simulado ────────────────────────────────────────────────────────────
// En producción estas rutas serían el IdP real (Google). Aquí el mock simula
// el flujo authorization_code emitiendo codes propios y vinculando broker_subject.

/**
 * oidcCodes: Map<code, { email, sub }>
 * Single-use; se elimina tras el callback.
 */
if (!store.oidcCodes) store.oidcCodes = new Map();

// GET /auth/oidc/authorize
// Emite un code de autorización y redirige al redirect_uri.
// El email del usuario se resuelve desde store.oidcCodes cuando el test lo registra,
// o desde el sub generado cuando no hay mapeo previo.
router.get('/auth/oidc/authorize', (req, res) => {
  const { redirect_uri, state } = req.query;
  if (!redirect_uri) {
    return res.status(400).json({ status: 'error', message: 'redirect_uri requerido', data: null });
  }

  const code = crypto.randomBytes(16).toString('hex');
  store.oidcCodes.set(code, null);

  // En tests automatizados el test sobreescribe store.oidcCodes antes de que
  // el callback sea invocado, por lo que nunca llegan aquí con null.
  // En el browser (desarrollo manual) redirigimos al simulador de Google SSO
  // para que el desarrollador seleccione con qué cuenta ingresar.
  // Redirigimos al selector de usuario bajo /api/v1/ para que Vite lo proxie
  // a este mismo servidor (evita que el SPA intercepte la URL).
  const ssoUrl = `/api/v1/auth/oidc/mock-sso?code=${code}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${encodeURIComponent(state ?? '')}`;
  return res.redirect(302, ssoUrl);
});

// GET /auth/oidc/mock-sso
// Simulador visual de Google SSO para desarrollo manual.
// Lista los usuarios activos no-superadmin para que el dev elija con cuál entrar.
router.get('/auth/oidc/mock-sso', (req, res) => {
  const { code, redirect_uri, state } = req.query;
  if (!code || !redirect_uri) {
    return res.status(400).send('Parámetros faltantes.');
  }

  const candidates = store.users.filter((u) => u.role !== 'superadmin' && u.active);

  const items = candidates.length
    ? candidates.map((u) => `
        <a href="/api/v1/auth/oidc/mock-sso/select?code=${encodeURIComponent(code)}&email=${encodeURIComponent(u.email)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${encodeURIComponent(state ?? '')}" class="user-btn">
          <div class="user-email">${u.email}</div>
          <div class="user-meta">${u.full_name ?? ''} · ${u.role}</div>
        </a>`).join('')
    : '<p class="empty">No hay usuarios activos. Activa al menos uno con el magic link primero.</p>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mock Google SSO — SPL Dev</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f1f3f4; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,.15); padding: 40px 36px; width: 100%; max-width: 400px; }
    .logo { font-size: 13px; color: #5f6368; margin-bottom: 24px; }
    h1 { font-size: 22px; color: #202124; margin-bottom: 4px; }
    .subtitle { font-size: 14px; color: #5f6368; margin-bottom: 28px; }
    .badge { display: inline-block; background: #fef08a; color: #713f12; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; margin-bottom: 20px; }
    .user-btn { display: block; padding: 14px 16px; border: 1px solid #dadce0; border-radius: 8px; margin-bottom: 10px; cursor: pointer; text-decoration: none; color: inherit; transition: background .15s; }
    .user-btn:hover { background: #f8f9fa; }
    .user-email { font-size: 15px; color: #202124; }
    .user-meta { font-size: 12px; color: #5f6368; margin-top: 2px; }
    .empty { color: #5f6368; font-size: 14px; text-align: center; padding: 20px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Google</div>
    <h1>Iniciar sesión</h1>
    <p class="subtitle">Selecciona una cuenta para continuar en SPL</p>
    <div class="badge">🔧 Mock SSO — Solo desarrollo</div>
    ${items}
  </div>
</body>
</html>`);
});

// GET /auth/oidc/mock-sso/select
// Vincula el code al email seleccionado y redirige al callback.
router.get('/auth/oidc/mock-sso/select', (req, res) => {
  const { code, email, redirect_uri, state } = req.query;
  if (!code || !email || !redirect_uri) {
    return res.status(400).send('Parámetros faltantes.');
  }
  if (!store.oidcCodes.has(code)) {
    return res.status(400).send('Código expirado o inválido.');
  }
  store.oidcCodes.set(code, email);
  const location = `${redirect_uri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state ?? '')}`;
  return res.redirect(302, location);
});

// POST /auth/oidc/callback
// Valida el code, vincula broker_subject si es primer login, emite JWT.
router.post('/auth/oidc/callback', (req, res) => {
  const { code } = req.body || {};
  const ERR = { status: 'error', message: 'Credenciales inválidas', data: null };

  if (!code || !store.oidcCodes.has(code)) {
    addAuditEvent('OIDC_CALLBACK_FALLIDO', null, req.ip, 'Código inválido o no existe');
    return res.status(401).json(ERR);
  }

  const mapping = store.oidcCodes.get(code);
  store.oidcCodes.delete(code); // single-use

  // mapping puede ser: null | string (email) | { email, sub }
  let email, incomingSub;
  if (mapping === null) {
    addAuditEvent('OIDC_CALLBACK_FALLIDO', null, req.ip, 'Code sin email asociado');
    return res.status(401).json(ERR);
  } else if (typeof mapping === 'string') {
    email = mapping;
    incomingSub = `google-sub-${crypto.randomBytes(8).toString('hex')}`;
  } else {
    email = mapping.email;
    incomingSub = mapping.sub ?? `google-sub-${crypto.randomBytes(8).toString('hex')}`;
  }

  const user = store.users.find((u) => u.email === email);
  if (!user || !user.active) {
    addAuditEvent('OIDC_CALLBACK_FALLIDO', null, req.ip, `Usuario no encontrado o inactivo: ${email}`);
    return res.status(401).json(ERR);
  }

  // Verificar broker_subject si ya está vinculado
  if (user.broker_subject && user.broker_subject !== incomingSub) {
    addAuditEvent('OIDC_SUB_MISMATCH', user.id, req.ip, `Sub esperado: ${user.broker_subject} | recibido: ${incomingSub}`);
    return res.status(401).json(ERR);
  }

  // Vincular sub en primer login OIDC
  if (!user.broker_subject) {
    user.broker_subject = incomingSub;
    user.updated_at = new Date();
  }

  const jti = uuidv4();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + JWT_EXPIRES_IN;

  const token = jwt.sign(
    { user_id: user.id, role: user.role, full_name: user.full_name, email: user.email, jti, iat, exp },
    JWT_SECRET,
    { algorithm: 'HS256', noTimestamp: true }
  );

  store.sessions.push({
    jti,
    user_id: user.id,
    ip: req.ip,
    user_agent: req.headers['user-agent'] || null,
    created_at: new Date(),
    expires_at: exp,
  });

  addAuditEvent('OIDC_LOGIN', user.id, req.ip, `Email: ${email}`);

  return res.status(200).json({
    status: 'success',
    data: {
      access_token: token,
      must_change_password: user.must_change_password === true,
      user: { id: user.id, role: user.role },
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

    // password_hash contiene un placeholder aleatorio; el usuario no puede autenticarse
    // con él. La identidad se establece en el primer login OIDC (binding de broker_subject).
    const placeholderPwd = crypto.randomBytes(32).toString('hex');
    const user = {
      id: uuidv4(),
      full_name,
      email,
      password_hash: bcrypt.hashSync(placeholderPwd, 12),
      role,
      active: false,          // inactivo hasta que el usuario active su cuenta con el magic link
      must_change_password: false,
      broker_subject: null,
      token_version: 0,
      created_at: new Date(),
      updated_at: null,
      password_changed_at: null,
    };
    store.users.push(user);

    // Generar activation token (single-use, TTL 24h)
    const activationToken = generateSetupToken();
    store.setupTokens.set(activationToken, {
      userId: user.id,
      expiresAt: Math.floor(Date.now() / 1000) + SETUP_TOKEN_TTL,
    });

    const mockMagicLink = `/api/v1/auth/activate/${activationToken}`;

    return res.status(201).json({
      status: 'success',
      message: 'Usuario creado correctamente',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        active: user.active,
        created_at: user.created_at,
        _mock_magic_link: mockMagicLink, // En producción: enviar por email; no exponer en API
      },
    });
  }
);

// ─── Solicitudes de cambio de correo ──────────────────────────────────────────
// No autoservicio: el usuario solicita, el superadmin aprueba.
// Aprobar: PATCH /users/:id/email → invalida broker_subject, incrementa token_version.

// POST /users/me/email-change-request — crear solicitud (usuario autenticado)
router.post('/users/me/email-change-request', authMiddleware(), (req, res) => {
  const { new_email, reason = '' } = req.body || {};

  if (!new_email) {
    return res.status(400).json({ status: 'error', message: 'El campo new_email es obligatorio', data: null });
  }
  if (!EMAIL_REGEX.test(new_email)) {
    return res.status(400).json({ status: 'error', message: 'Formato de correo inválido', data: null });
  }

  const userId = req.user.id;
  const existing = store.emailChangeRequests.find((r) => r.user_id === userId);
  if (existing) {
    return res.status(409).json({ status: 'error', message: 'Ya tienes una solicitud de cambio de correo pendiente', data: { code: 'PENDING_REQUEST_EXISTS' } });
  }
  if (store.users.find((u) => u.email === new_email)) {
    return res.status(409).json({ status: 'error', message: 'Ese correo ya está registrado', data: { code: 'EMAIL_ALREADY_EXISTS' } });
  }

  const currentUser = store.users.find((u) => u.id === userId);
  const req_id = uuidv4();
  store.emailChangeRequests.push({
    id: req_id,
    user_id: userId,
    current_email: currentUser?.email ?? '',
    new_email,
    reason,
    created_at: new Date(),
  });

  addAuditEvent('EMAIL_CHANGE_REQUEST', userId, req.ip, `new_email: ${new_email}`);

  return res.status(201).json({
    status: 'success',
    message: 'Solicitud enviada. El administrador la revisará.',
    data: { id: req_id, user_id: userId, new_email, created_at: new Date() },
  });
});

// GET /users/email-change-requests — listar solicitudes (solo superadmin)
router.get('/users/email-change-requests', authMiddleware(['superadmin']), (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: store.emailChangeRequests,
  });
});

// DELETE /users/email-change-requests/:id — rechazar/cancelar solicitud (solo superadmin)
router.delete('/users/email-change-requests/:id', authMiddleware(['superadmin']), (req, res) => {
  const idx = store.emailChangeRequests.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ status: 'error', message: 'Solicitud no encontrada', data: null });
  }
  store.emailChangeRequests.splice(idx, 1);
  return res.status(204).end();
});

// PATCH /users/:id/email — aprobar cambio de correo (solo superadmin)
// Invalida broker_subject y revoca sesiones activas del usuario incrementando token_version.
router.patch('/users/:id/email', authMiddleware(['superadmin']), (req, res) => {
  const { email } = req.body || {};
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Formato de correo inválido', data: null });
  }

  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado', data: null });
  }

  const collision = store.users.find((u) => u.email === email && u.id !== user.id);
  if (collision) {
    return res.status(409).json({ status: 'error', message: 'Ese correo ya está registrado', data: { code: 'EMAIL_ALREADY_EXISTS' } });
  }

  user.email          = email;
  user.broker_subject = null;
  user.token_version  = (user.token_version ?? 0) + 1;
  user.updated_at     = new Date();

  // Eliminar solicitudes pendientes del usuario
  store.emailChangeRequests = store.emailChangeRequests.filter((r) => r.user_id !== user.id);

  // Revocar sesiones activas del usuario
  store.sessions = store.sessions.filter((s) => {
    if (s.user_id === user.id) {
      store.revokedTokens.set(s.jti, s.expires_at);
      return false;
    }
    return true;
  });

  addAuditEvent('EMAIL_CAMBIADO', req.user.id, req.ip, `Usuario ${user.id} → ${email}`);

  return res.status(200).json({
    status: 'success',
    message: 'Correo actualizado. El usuario fue desconectado.',
    data: { id: user.id, email: user.email },
  });
});

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
// POST /users/:id/magic-link — reenvío de enlace de activación (solo superadmin)
// Regenera un magic link para un usuario existente (activo o inactivo).
// En producción: el enlace se entrega por email; no se expone en la API.
router.post('/users/:id/magic-link', authMiddleware(['superadmin']), (req, res) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado', data: null });
  }

  const activationToken = generateSetupToken();
  store.setupTokens.set(activationToken, {
    userId: user.id,
    expiresAt: Math.floor(Date.now() / 1000) + SETUP_TOKEN_TTL,
  });

  const mockMagicLink = `/api/v1/auth/activate/${activationToken}`;

  addAuditEvent('MAGIC_LINK_GENERADO', req.user.id, req.ip, `Para usuario ${user.id}`);

  return res.status(200).json({
    status: 'success',
    message: 'Enlace de activación generado.',
    data: {
      id: user.id,
      email: user.email,
      _mock_magic_link: mockMagicLink,
    },
  });
});

// GET /auth/activate/:token
// Activa la cuenta del usuario y lo redirige a /login.
// Endpoint público — no requiere JWT. Token single-use.
router.get('/auth/activate/:token', (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const tokenData = store.setupTokens.get(req.params.token);

  if (!tokenData || tokenData.expiresAt < now) {
    store.setupTokens.delete(req.params.token);
    return res.status(410).json({
      status: 'error',
      message: 'El enlace de activación es inválido o ha expirado.',
      data: { code: 'LINK_EXPIRED_OR_USED' },
    });
  }

  const user = store.users.find((u) => u.id === tokenData.userId);
  if (!user) {
    store.setupTokens.delete(req.params.token);
    return res.status(410).json({
      status: 'error',
      message: 'El enlace de activación es inválido o ha expirado.',
      data: { code: 'LINK_EXPIRED_OR_USED' },
    });
  }

  user.active = true;
  user.broker_subject = null;
  user.updated_at = new Date();
  store.setupTokens.delete(req.params.token); // single-use

  addAuditEvent('CUENTA_ACTIVADA', user.id, req.ip, `Token de activación usado`);

  return res.redirect(302, '/login?activated=1');
});

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
