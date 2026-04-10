/**
 * Mock Server – Sistema de Registro Metodológico de Métricas Lingüísticas
 * Implementa los contratos MockContract M1–M4 con almacenamiento en memoria.
 */
const express = require('express');
const { store } = require('./store');
const { JWT_SECRET, DEFAULT_SECRET } = require('./middleware/auth');

const app = express();

// ── Middleware global ────────────────────────────────────────────────────────
app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(API, require('./routes/m1'));
app.use(API, require('./routes/m2'));
app.use(API, require('./routes/m3'));
app.use(API, require('./routes/m4'));
app.use(API, require('./routes/projects'));
app.use(API, require('./routes/config'));

// Health check público (whitelist, sin autenticación – CA-HU5-06)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mock-server', timestamp: new Date().toISOString() });
});

// 404 genérico para rutas no registradas
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada',
    data: null,
  });
});

// Error handler global: loguea el detalle en servidor, responde con mensaje genérico al cliente
// Captura errores no controlados; loguea detalle en servidor, responde genérico al cliente.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[ERROR INTERNO]', err.stack || err.message || err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    data: null,
  });
});

// ── Limpieza periódica ────────────────────────────────────────────────────────
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // cada 10 minutos
setInterval(() => {
  const nowSec = Math.floor(Date.now() / 1000);

  // Tokens revocados expirados (CA-HU4-03)
  for (const [jti, expiresAt] of store.revokedTokens.entries()) {
    if (expiresAt < nowSec) {
      store.revokedTokens.delete(jti);
    }
  }

  // Sesiones expiradas
  const prevLen = store.sessions.length;
  store.sessions = store.sessions.filter((s) => s.expires_at > nowSec);
  if (store.sessions.length !== prevLen) {
    console.log(`[CLEANUP] ${prevLen - store.sessions.length} sesiones expiradas eliminadas.`);
  }

  // Tokens de recuperación de contraseña expirados
  for (const [token, data] of store.passwordRecoveryTokens.entries()) {
    if (data.expiresAt < nowSec) {
      store.passwordRecoveryTokens.delete(token);
    }
  }
}, CLEANUP_INTERVAL_MS);

// ── Inicio ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║           Mock Server – Métricas Lingüísticas    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  API:    http://localhost:${PORT}${API}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Admin:  ${store._superadminEmail}`);
  console.log('  Todos los datos son en memoria (se pierden al reiniciar).');

  if (store._usingBootstrapDefaults) {
    console.warn('');
    console.warn('  ╔═══════════════════════════════════════════════╗');
    console.warn('  ║  ADVERTENCIA — CREDENCIALES POR DEFECTO       ║');
    console.warn('  ╠═══════════════════════════════════════════════╣');
    console.warn('  ║  SUPERADMIN_EMAIL y/o SUPERADMIN_PASSWORD     ║');
    console.warn('  ║  no están definidas. Usando valores de        ║');
    console.warn('  ║  desarrollo inseguros.                        ║');
    console.warn('  ║  El superadmin tendrá must_change_password.   ║');
    console.warn('  ║  En producción: definir ambas variables de    ║');
    console.warn('  ║  entorno o usar un gestor de secretos.        ║');
    console.warn('  ╚═══════════════════════════════════════════════╝');
    console.warn('');
  }

  // Advertencia de seguridad si se usa JWT_SECRET por defecto
  if (JWT_SECRET === DEFAULT_SECRET) {
    console.warn('');
    console.warn('  ╔═══════════════════════════════════════════════╗');
    console.warn('  ║  ADVERTENCIA DE SEGURIDAD – SOLO DESARROLLO   ║');
    console.warn('  ╠═══════════════════════════════════════════════╣');
    console.warn('  ║  JWT_SECRET no configurado.                   ║');
    console.warn('  ║  Usando valor por defecto inseguro.           ║');
    console.warn('  ║  En producción: configurar JWT_SECRET como    ║');
    console.warn('  ║  variable de entorno o Docker Secret.         ║');
    console.warn('  ║  Ref: mock/SECURITY_REPORT.md §SEG-02         ║');
    console.warn('  ╚═══════════════════════════════════════════════╝');
    console.warn('');
  }
});
