/**
 * M1 – Autenticación y Control de Acceso
 * Contratos: RF-M1-01..06, RF-M1-LIST
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const VALID_ROLES = ['administrator', 'researcher', 'applicator'];
const JWT_EXPIRES_IN = 21600; // 6 horas (segundos)

// Parámetros de rate limiting (CA-HU3-06, AD-08)
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;      // 60 segundos
const RATE_LIMIT_BLOCK_MS = 5 * 60 * 1000;   // 5 minutos

// ─── RF-M1-03 · POST /auth/login ────────────────────────────────────────────
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials', data: null });
  }

  const clientKey = `${req.ip}::${email}`;
  const now = Date.now();
  const attempts = store.loginAttempts.get(clientKey) || { count: 0, firstAttemptAt: now, blockedUntil: 0 };

  // Bloqueo activo → 401 genérico (no se revela razón – AD-08)
  if (attempts.blockedUntil > now) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials', data: null });
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
    }
    store.loginAttempts.set(clientKey, attempts);
    return res.status(401).json({ status: 'error', message: 'Invalid credentials', data: null });
  }

  // Login exitoso → resetear intentos
  store.loginAttempts.delete(clientKey);

  const jti = uuidv4();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + JWT_EXPIRES_IN;

  const token = jwt.sign(
    { user_id: user.id, role: user.role, jti, iat, exp },
    JWT_SECRET,
    { algorithm: 'HS256', noTimestamp: true }
  );

  return res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      access_token: token,
      token_type: 'Bearer',
      expires_in: JWT_EXPIRES_IN,
    },
  });
});

// ─── RF-M1-04 · POST /auth/logout ───────────────────────────────────────────
router.post('/auth/logout', authMiddleware(), (req, res) => {
  store.revokedTokens.set(req.user.jti, req.user.exp);
  return res.status(200).json({ status: 'success', message: 'Session closed', data: null });
});

// ─── RF-M1-01 · POST /users ─────────────────────────────────────────────────
router.post('/users', authMiddleware(['administrator']), (req, res) => {
  const { full_name, email, password, role } = req.body || {};

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields: full_name, email, password, role', data: null });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ status: 'error', message: `Invalid role. Accepted: ${VALID_ROLES.join(' | ')}`, data: null });
  }
  if (store.users.find((u) => u.email === email)) {
    return res.status(409).json({ status: 'error', message: 'Email already registered', data: null });
  }

  const user = {
    id: uuidv4(),
    full_name,
    email,
    password_hash: bcrypt.hashSync(password, 12),
    role,
    active: true,
    created_at: new Date(),
    password_changed_at: null,
  };
  store.users.push(user);

  return res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      active: user.active,
      created_at: user.created_at,
    },
  });
});

// ─── RF-M1-LIST · GET /users ────────────────────────────────────────────────
router.get('/users', authMiddleware(['administrator']), (req, res) => {
  let users = store.users;

  if (req.query.active !== undefined) {
    const activeFilter = req.query.active === 'true';
    users = users.filter((u) => u.active === activeFilter);
  }
  if (req.query.role) {
    users = users.filter((u) => u.role === req.query.role);
  }

  return res.status(200).json({
    status: 'success',
    message: 'Users retrieved',
    data: {
      users: users.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        active: u.active,
        created_at: u.created_at,
      })),
    },
  });
});

// ─── RF-M1-06 · PATCH /users/me/password ────────────────────────────────────
// NOTA: debe ir ANTES de /users/:id/status para que "me" no sea capturado por :id
router.patch('/users/me/password', authMiddleware(), (req, res) => {
  const { current_password, new_password } = req.body || {};

  if (!current_password || !new_password) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields: current_password, new_password', data: null });
  }

  const user = store.users.find((u) => u.id === req.user.id);

  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ status: 'error', message: 'Current password is incorrect', data: null });
  }
  if (bcrypt.compareSync(new_password, user.password_hash)) {
    return res.status(400).json({ status: 'error', message: 'New password must differ from the current one', data: null });
  }

  user.password_hash = bcrypt.hashSync(new_password, 12);
  user.password_changed_at = new Date();

  return res.status(200).json({
    status: 'success',
    message: 'Password updated. All previous sessions have been invalidated.',
    data: null,
  });
});

// ─── RF-M1-02 · PATCH /users/:id/status ────────────────────────────────────
router.patch('/users/:id/status', authMiddleware(['administrator']), (req, res) => {
  const { active } = req.body || {};

  if (typeof active !== 'boolean') {
    return res.status(400).json({ status: 'error', message: 'Field active must be a boolean', data: null });
  }

  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'User not found', data: null });
  }

  // Protección: último administrador activo no puede ser desactivado (CA-HU2-05)
  if (!active && user.role === 'administrator') {
    const activeAdmins = store.users.filter((u) => u.role === 'administrator' && u.active);
    if (activeAdmins.length === 1 && activeAdmins[0].id === user.id) {
      return res.status(409).json({
        status: 'error',
        message: 'Cannot deactivate the only active administrator',
        data: null,
      });
    }
  }

  user.active = active;

  return res.status(200).json({
    status: 'success',
    message: 'User status updated',
    data: { id: user.id, active: user.active },
  });
});

module.exports = router;
