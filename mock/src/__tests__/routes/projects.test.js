/**
 * Tests de gestión de proyectos (CF-010, CF-011, CF-012, CF-016 parcial).
 *
 * Cubre:
 *   POST/GET/PATCH/DELETE /projects
 *   POST/GET/DELETE /projects/:id/members
 *   POST/GET/DELETE /projects/:id/instruments
 *   GET/PUT /projects/:id/config/operativo
 *   GET /config/system-defaults
 *   GET /projects/:id/subjects/mine
 */
const request = require('supertest');
const express = require('express');
const bcrypt  = require('bcryptjs');
const { store } = require('../../store');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.set('trust proxy', false);
  app.use('/api/v1', require('../../routes/m1'));
  app.use('/api/v1', require('../../routes/m2'));
  app.use('/api/v1', require('../../routes/m4'));
  app.use('/api/v1', require('../../routes/projects'));
  return app;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSuperadminToken(app) {
  const sa = store.users.find((u) => u.role === 'superadmin');
  if (sa) sa.must_change_password = false;
  return request(app)
    .post('/api/v1/auth/login')
    .send({ email: sa.email, password: process.env.SUPERADMIN_PASSWORD || 'metodologia-bootstrap-cambiar-pronto' })
    .then((r) => r.body.data.access_token);
}

async function createUser(app, token, role = 'researcher') {
  const res = await request(app)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${token}`)
    .send({ full_name: 'Usuario Test', email: `test-${Date.now()}@example.com`, role });
  return store.users.find((u) => u.email === res.body.data?.email || u.id === res.body.data?.id);
}

async function createProject(app, token, opts = {}) {
  const { name = 'Proyecto Test', use_defaults = true } = opts;
  const res = await request(app)
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, use_defaults });
  return res;
}

// ── Reset del store entre tests ───────────────────────────────────────────────

function resetStore() {
  const sa = store.users.find((u) => u.role === 'superadmin');
  store.users            = [sa];
  store.revokedTokens    = new Map();
  store.loginAttempts    = new Map();
  store.sessions         = [];
  store.setupTokens      = new Map();
  store.oidcCodes        = new Map();
  store.projects         = [];
  store.projectMembers   = [];
  store.projectInstruments = [];
  store.projectConfigs   = new Map();
  store.instruments      = [];
  store.subjects         = [];
  store.applications     = [];
  store.metricValues     = [];
}

// ── CF-010: CRUD proyectos ────────────────────────────────────────────────────

describe('POST /projects', () => {
  let app, tk;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
  });

  it('sin token → 401', async () => {
    const res = await request(app).post('/api/v1/projects').send({ name: 'X', use_defaults: true });
    expect(res.status).toBe(401);
  });

  it('token researcher → 403', async () => {
    const user = await createUser(app, tk, 'researcher');
    // Activar usuario
    const sa = store.users.find((u) => u.role === 'superadmin');
    user.active = true;
    user.must_change_password = false;
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'placeholder' });
    // El researcher no puede hacer login con contraseña — usar token generado manualmente
    // Para el test simplemente verificamos que el rol researcher recibe 403
    // Insertamos directamente un token firmado con rol researcher
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../../middleware/auth');
    const { v4: uuidv4 } = require('uuid');
    user.active = true; user.must_change_password = false;
    const rTk = jwt.sign({ user_id: user.id, role: 'researcher', jti: uuidv4() }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${rTk}`)
      .send({ name: 'X', use_defaults: true });
    expect(res.status).toBe(403);
  });

  it('superadmin, use_defaults:true → 201 con datos del proyecto', async () => {
    const res = await createProject(app, tk, { name: 'Mi Proyecto' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Mi Proyecto');
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.member_count).toBe(0);
  });

  it('sin name → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${tk}`)
      .send({ use_defaults: true });
    expect(res.status).toBe(400);
    expect(res.body.data.code).toBe('VALIDATION_ERROR');
  });

  it('sin use_defaults ni config → 400 CONFIG_REQUIRED', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${tk}`)
      .send({ name: 'Sin config' });
    expect(res.status).toBe(400);
    expect(res.body.data.code).toBe('CONFIG_REQUIRED');
  });

  it('config explícita → 201 con la config provista', async () => {
    const config = { education_levels: ['básica', 'media'], age_cohort_ranges: ['6-12'], subject_limit: 20, mode: 'normal' };
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${tk}`)
      .send({ name: 'Proyecto Personalizado', config });
    expect(res.status).toBe(201);
    const saved = store.projectConfigs.get(res.body.data.id);
    expect(saved.subject_limit).toBe(20);
    expect(saved.education_levels).toEqual(['básica', 'media']);
  });
});

describe('GET /projects', () => {
  let app, tk;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
  });

  it('sin token → 401', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });

  it('superadmin → 200 con todos los proyectos', async () => {
    await createProject(app, tk, { name: 'A' });
    await createProject(app, tk, { name: 'B' });
    const res = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('researcher sin membresía → 200 []', async () => {
    await createProject(app, tk);
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../../middleware/auth');
    const { v4: uuidv4 } = require('uuid');
    const user = { id: uuidv4(), role: 'researcher', active: true, must_change_password: false };
    store.users.push({ ...user, full_name: 'R', email: 'r@r.com', password_hash: 'x', token_version: 0 });
    const rTk = jwt.sign({ user_id: user.id, role: 'researcher', jti: uuidv4() }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${rTk}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('researcher con membresía → 200 con sus proyectos', async () => {
    const projRes = await createProject(app, tk);
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../../middleware/auth');
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();
    store.users.push({ id: userId, full_name: 'R', email: 'r2@r.com', password_hash: 'x', role: 'researcher', active: true, must_change_password: false, token_version: 0 });
    store.projectMembers.push({ id: uuidv4(), project_id: projRes.body.data.id, user_id: userId, role: 'researcher', added_at: new Date() });
    const rTk = jwt.sign({ user_id: userId, role: 'researcher', jti: uuidv4() }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${rTk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(projRes.body.data.id);
  });
});

describe('GET /projects/:id', () => {
  let app, tk;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
  });

  it('id existente → 200 con members e instruments', async () => {
    const projRes = await createProject(app, tk);
    const id = projRes.body.data.id;
    const res = await request(app).get(`/api/v1/projects/${id}`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.members).toEqual([]);
    expect(res.body.data.instruments).toEqual([]);
  });

  it('id inexistente → 404', async () => {
    const res = await request(app).get('/api/v1/projects/nope').set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /projects/:id', () => {
  let app, tk;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
  });

  it('actualiza nombre y descripción', async () => {
    const { body: { data: { id } } } = await createProject(app, tk);
    const res = await request(app)
      .patch(`/api/v1/projects/${id}`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ name: 'Nuevo Nombre', description: 'Nueva desc' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Nuevo Nombre');
  });

  it('body vacío → 400', async () => {
    const { body: { data: { id } } } = await createProject(app, tk);
    const res = await request(app)
      .patch(`/api/v1/projects/${id}`)
      .set('Authorization', `Bearer ${tk}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /projects/:id', () => {
  let app, tk;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
  });

  it('204; GET posterior → 404', async () => {
    const { body: { data: { id } } } = await createProject(app, tk);
    const del = await request(app).delete(`/api/v1/projects/${id}`).set('Authorization', `Bearer ${tk}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`/api/v1/projects/${id}`).set('Authorization', `Bearer ${tk}`);
    expect(get.status).toBe(404);
  });
});

// ── CF-011: Membresía ─────────────────────────────────────────────────────────

describe('POST /projects/:id/members', () => {
  let app, tk, projId, userId;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;
    const { v4: uuidv4 } = require('uuid');
    userId = uuidv4();
    store.users.push({ id: userId, full_name: 'Inv', email: 'inv@test.com', password_hash: 'x', role: 'researcher', active: true, must_change_password: false, token_version: 0 });
  });

  it('sin token → 401', async () => {
    const res = await request(app).post(`/api/v1/projects/${projId}/members`).send({ user_id: userId, role: 'researcher' });
    expect(res.status).toBe(401);
  });

  it('user_id inexistente → 404', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projId}/members`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ user_id: 'no-existe', role: 'researcher' });
    expect(res.status).toBe(404);
  });

  it('role inválido → 400', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projId}/members`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ user_id: userId, role: 'superadmin' });
    expect(res.status).toBe(400);
  });

  it('válido → 201', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projId}/members`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ user_id: userId, role: 'researcher' });
    expect(res.status).toBe(201);
    expect(res.body.data.user_id).toBe(userId);
  });

  it('usuario ya miembro → 409 ALREADY_MEMBER', async () => {
    await request(app).post(`/api/v1/projects/${projId}/members`).set('Authorization', `Bearer ${tk}`).send({ user_id: userId, role: 'researcher' });
    const res = await request(app).post(`/api/v1/projects/${projId}/members`).set('Authorization', `Bearer ${tk}`).send({ user_id: userId, role: 'researcher' });
    expect(res.status).toBe(409);
    expect(res.body.data.code).toBe('ALREADY_MEMBER');
  });
});

describe('GET /projects/:id/members', () => {
  let app, tk, projId;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;
  });

  it('sin token → 401', async () => {
    const res = await request(app).get(`/api/v1/projects/${projId}/members`);
    expect(res.status).toBe(401);
  });

  it('devuelve lista de miembros', async () => {
    const { v4: uuidv4 } = require('uuid');
    const uid = uuidv4();
    store.users.push({ id: uid, full_name: 'X', email: 'x@t.com', password_hash: 'x', role: 'researcher', active: true, must_change_password: false, token_version: 0 });
    store.projectMembers.push({ id: uuidv4(), project_id: projId, user_id: uid, role: 'researcher', added_at: new Date() });
    const res = await request(app).get(`/api/v1/projects/${projId}/members`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].email).toBe('x@t.com');
  });

  it('?role=researcher filtra correctamente', async () => {
    const { v4: uuidv4 } = require('uuid');
    const uid1 = uuidv4(); const uid2 = uuidv4();
    store.users.push(
      { id: uid1, full_name: 'R', email: 'r@t.com', password_hash: 'x', role: 'researcher', active: true, must_change_password: false, token_version: 0 },
      { id: uid2, full_name: 'A', email: 'a@t.com', password_hash: 'x', role: 'applicator', active: true, must_change_password: false, token_version: 0 }
    );
    store.projectMembers.push(
      { id: uuidv4(), project_id: projId, user_id: uid1, role: 'researcher', added_at: new Date() },
      { id: uuidv4(), project_id: projId, user_id: uid2, role: 'applicator', added_at: new Date() }
    );
    const res = await request(app).get(`/api/v1/projects/${projId}/members?role=researcher`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].role).toBe('researcher');
  });
});

describe('DELETE /projects/:id/members/:userId', () => {
  let app, tk, projId, userId;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;
    const { v4: uuidv4 } = require('uuid');
    userId = uuidv4();
    store.users.push({ id: userId, full_name: 'M', email: 'm@t.com', password_hash: 'x', role: 'researcher', active: true, must_change_password: false, token_version: 0 });
    store.projectMembers.push({ id: uuidv4(), project_id: projId, user_id: userId, role: 'researcher', added_at: new Date() });
  });

  it('superadmin → 204', async () => {
    const res = await request(app).delete(`/api/v1/projects/${projId}/members/${userId}`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(204);
    expect(store.projectMembers.length).toBe(0);
  });

  it('miembro inexistente → 404', async () => {
    const res = await request(app).delete(`/api/v1/projects/${projId}/members/no-existe`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(404);
  });
});

// ── CF-011: Instrumentos por proyecto ────────────────────────────────────────

describe('POST /projects/:id/instruments', () => {
  let app, tk, projId, instId;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;
    const instRes = await request(app)
      .post('/api/v1/instruments')
      .set('Authorization', `Bearer ${tk}`)
      .send({ name: 'Instrumento Test', use_defaults: true });
    instId = instRes.body.data?.id || store.instruments[0]?.id;
  });

  it('instrument_id inexistente → 404', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projId}/instruments`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ instrument_id: 'nope' });
    expect(res.status).toBe(404);
  });

  it('válido → 201', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projId}/instruments`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ instrument_id: instId });
    expect(res.status).toBe(201);
  });

  it('instrumento ya asignado → 409 ALREADY_ASSIGNED', async () => {
    await request(app).post(`/api/v1/projects/${projId}/instruments`).set('Authorization', `Bearer ${tk}`).send({ instrument_id: instId });
    const res = await request(app).post(`/api/v1/projects/${projId}/instruments`).set('Authorization', `Bearer ${tk}`).send({ instrument_id: instId });
    expect(res.status).toBe(409);
    expect(res.body.data.code).toBe('ALREADY_ASSIGNED');
  });
});

describe('GET /projects/:id/instruments', () => {
  let app, tk, projId;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;
  });

  it('devuelve lista de instrumentos asignados', async () => {
    const instRes = await request(app).post('/api/v1/instruments').set('Authorization', `Bearer ${tk}`).send({ name: 'Inst1', use_defaults: true });
    const instId = instRes.body.data?.id || store.instruments[0]?.id;
    await request(app).post(`/api/v1/projects/${projId}/instruments`).set('Authorization', `Bearer ${tk}`).send({ instrument_id: instId });
    const res = await request(app).get(`/api/v1/projects/${projId}/instruments`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Inst1');
  });
});

describe('DELETE /projects/:id/instruments/:instrumentId', () => {
  let app, tk, projId, instId;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;
    await request(app).post('/api/v1/instruments').set('Authorization', `Bearer ${tk}`).send({ name: 'DelInst', use_defaults: true });
    instId = store.instruments[0]?.id;
    await request(app).post(`/api/v1/projects/${projId}/instruments`).set('Authorization', `Bearer ${tk}`).send({ instrument_id: instId });
  });

  it('superadmin → 204', async () => {
    const res = await request(app).delete(`/api/v1/projects/${projId}/instruments/${instId}`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(204);
  });

  it('instrumento no asignado → 404', async () => {
    const res = await request(app).delete(`/api/v1/projects/${projId}/instruments/nope`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(404);
  });
});

// ── CF-012: Config operativa por proyecto ─────────────────────────────────────

describe('GET /config/system-defaults', () => {
  let app, tk;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
  });

  it('sin token → 401', async () => {
    const res = await request(app).get('/api/v1/config/system-defaults');
    expect(res.status).toBe(401);
  });

  it('superadmin → 200 con education_levels, age_cohort_ranges, subject_limit, mode', async () => {
    const res = await request(app).get('/api/v1/config/system-defaults').set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.education_levels)).toBe(true);
    expect(Array.isArray(res.body.data.age_cohort_ranges)).toBe(true);
    expect(typeof res.body.data.subject_limit).toBe('number');
    expect(res.body.data.mode).toBeDefined();
  });
});

describe('GET /projects/:id/config/operativo', () => {
  let app, tk, projId;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;
  });

  it('proyecto con config → 200 con valores', async () => {
    const res = await request(app).get(`/api/v1/projects/${projId}/config/operativo`).set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.education_levels).toBeDefined();
    expect(res.body.data.subject_limit).toBeDefined();
  });

  it('sin token → 401', async () => {
    const res = await request(app).get(`/api/v1/projects/${projId}/config/operativo`);
    expect(res.status).toBe(401);
  });
});

describe('PUT /projects/:id/config/operativo', () => {
  let app, tk, projId;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;
  });

  it('superadmin, body válido → 200', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${projId}/config/operativo`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ subject_limit: 30, mode: 'restricted' });
    expect(res.status).toBe(200);
    expect(res.body.data.subject_limit).toBe(30);
    expect(res.body.data.mode).toBe('restricted');
  });

  it('body vacío → 400', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${projId}/config/operativo`)
      .set('Authorization', `Bearer ${tk}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('subject_limit no entero → 400', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${projId}/config/operativo`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ subject_limit: 'mucho' });
    expect(res.status).toBe(400);
  });
});

// ── CF-016: GET /projects/:id/subjects/mine ───────────────────────────────────

describe('GET /projects/:id/subjects/mine', () => {
  let app, tk, projId, appTk;

  beforeEach(async () => {
    resetStore();
    app = buildApp();
    tk  = await getSuperadminToken(app);
    projId = (await createProject(app, tk)).body.data.id;

    // Crear usuario applicator con token directo
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../../middleware/auth');
    const { v4: uuidv4 } = require('uuid');
    const appUserId = uuidv4();
    store.users.push({ id: appUserId, full_name: 'App', email: 'app@t.com', password_hash: 'x', role: 'applicator', active: true, must_change_password: false, token_version: 0 });
    store.projectMembers.push({ id: uuidv4(), project_id: projId, user_id: appUserId, role: 'applicator', added_at: new Date() });
    appTk = jwt.sign({ user_id: appUserId, role: 'applicator', jti: uuidv4() }, JWT_SECRET, { expiresIn: '1h' });
  });

  it('sin token → 401', async () => {
    const res = await request(app).get(`/api/v1/projects/${projId}/subjects/mine`);
    expect(res.status).toBe(401);
  });

  it('applicator sin sujetos → 200 []', async () => {
    const res = await request(app).get(`/api/v1/projects/${projId}/subjects/mine`).set('Authorization', `Bearer ${appTk}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('applicator con sujetos → 200 con aplicaciones y next_available_date', async () => {
    // Insertar sujeto y aplicación directamente en el store
    const { v4: uuidv4 } = require('uuid');
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../../middleware/auth');
    const payload = jwt.decode(appTk);
    const appUserId = payload.user_id;

    // Crear instrumento con min_days
    const instId = uuidv4();
    store.instruments.push({ id: instId, name: 'Inst', is_active: true, tags: [], min_days_between_applications: 15 });
    store.projectInstruments.push({ id: uuidv4(), project_id: projId, instrument_id: instId, added_at: new Date() });

    // Crear sujeto
    const subjectId = uuidv4();
    store.subjects.push({ id: subjectId, project_id: projId, created_by: appUserId, created_at: new Date(), context: null });

    // Crear aplicación
    store.applications.push({ id: uuidv4(), subject_id: subjectId, instrument_id: instId, application_date: '2026-04-01', notes: null, created_at: new Date() });

    const res = await request(app).get(`/api/v1/projects/${projId}/subjects/mine`).set('Authorization', `Bearer ${appTk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    const sub = res.body.data[0];
    expect(sub.applications.length).toBe(1);
    expect(sub.applications[0].next_available_date).toBe('2026-04-16'); // 2026-04-01 + 15 días
  });
});
