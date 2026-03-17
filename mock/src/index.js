/**
 * Mock Server – Sistema de Registro Metodológico de Métricas Lingüísticas
 * Implementa los contratos MockContract M1–M4 con almacenamiento en memoria.
 */
const express = require('express');
const { store } = require('./store');

const app = express();

// ── Middleware global ────────────────────────────────────────────────────────
app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(API, require('./routes/m1'));
app.use(API, require('./routes/m2'));
app.use(API, require('./routes/m3'));
app.use(API, require('./routes/m4'));

// Health check público (whitelist, sin autenticación – CA-HU5-06)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mock-server', timestamp: new Date().toISOString() });
});

// 404 para rutas no definidas
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`,
    data: null,
  });
});

// ── Limpieza periódica de tokens revocados expirados (CA-HU4-03) ─────────────
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // cada 10 minutos
setInterval(() => {
  const nowSec = Math.floor(Date.now() / 1000);
  for (const [jti, expiresAt] of store.revokedTokens.entries()) {
    if (expiresAt < nowSec) {
      store.revokedTokens.delete(jti);
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
  console.log(`  Admin:  admin@mock.local  /  Admin123!`);
  console.log('  Todos los datos son en memoria (se pierden al reiniciar).');
});
