/**
 * Tests del flujo de magic link de activación de cuenta (CF-008).
 *
 * POST /users       → genera magic link; usuario queda inactive
 * GET /auth/activate/:token → activa cuenta; redirige a /login
 * POST /auth/setup  → debe retornar 404 (eliminado)
 * POST /users/:id/magic-link → reemplaza a reset-password
 */
const request = require('supertest')
const express = require('express')
const bcrypt  = require('bcryptjs')
const { store } = require('../../store')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.set('trust proxy', false)
  app.use('/api/v1', require('../../routes/m1'))
  return app
}

function getSuperadminToken(app) {
  // Asegurar que el superadmin no tenga must_change_password en tests
  const sa = store.users.find((u) => u.role === 'superadmin')
  if (sa) sa.must_change_password = false

  return request(app)
    .post('/api/v1/auth/login')
    .send({
      email: sa.email,
      password: process.env.SUPERADMIN_PASSWORD || 'metodologia-bootstrap-cambiar-pronto',
    })
    .then((r) => r.body.data.access_token)
}

describe('POST /users — magic link en la respuesta', () => {
  let app

  beforeEach(() => {
    store.users        = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens = new Map()
    store.loginAttempts = new Map()
    store.sessions     = []
    store.setupTokens  = new Map()
    app = buildApp()
  })

  it('devuelve _mock_magic_link con la URL completa de activación', async () => {
    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tk}`)
      .send({ full_name: 'Nuevo Usuario', email: 'nuevo@test.com', role: 'researcher' })

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('_mock_magic_link')
    expect(res.body.data._mock_magic_link).toMatch(/\/api\/v1\/auth\/activate\//)
  })

  it('el usuario creado queda inactive hasta la activación', async () => {
    const tk = await getSuperadminToken(app)
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tk}`)
      .send({ full_name: 'Inact', email: 'inact@test.com', role: 'researcher' })

    const user = store.users.find((u) => u.email === 'inact@test.com')
    expect(user.active).toBe(false)
  })
})

describe('GET /auth/activate/:token', () => {
  let app

  beforeEach(() => {
    store.users        = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens = new Map()
    store.loginAttempts = new Map()
    store.sessions     = []
    store.setupTokens  = new Map()
    app = buildApp()
  })

  async function crearUsuarioYObtenerToken() {
    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tk}`)
      .send({ full_name: 'Test', email: 'actv@test.com', role: 'researcher' })

    const link = res.body.data._mock_magic_link
    const token = link.split('/api/v1/auth/activate/')[1]
    return token
  }

  it('activa la cuenta y redirige a /login con ?activated=1', async () => {
    const activToken = await crearUsuarioYObtenerToken()
    const res = await request(app).get(`/api/v1/auth/activate/${activToken}`)

    expect(res.status).toBe(302)
    expect(res.headers.location).toMatch(/\/login/)
    expect(res.headers.location).toMatch(/activated=1/)
  })

  it('tras activar, el usuario queda active=true', async () => {
    const activToken = await crearUsuarioYObtenerToken()
    await request(app).get(`/api/v1/auth/activate/${activToken}`)

    const user = store.users.find((u) => u.email === 'actv@test.com')
    expect(user.active).toBe(true)
  })

  it('el token es single-use: segundo uso devuelve 410', async () => {
    const activToken = await crearUsuarioYObtenerToken()
    await request(app).get(`/api/v1/auth/activate/${activToken}`)
    const res2 = await request(app).get(`/api/v1/auth/activate/${activToken}`)

    expect(res2.status).toBe(410)
    expect(res2.body.data?.code).toBe('LINK_EXPIRED_OR_USED')
  })

  it('token inexistente devuelve 410', async () => {
    const res = await request(app).get('/api/v1/auth/activate/nonce-invalido-abc')
    expect(res.status).toBe(410)
  })
})

describe('POST /auth/setup — eliminado', () => {
  let app
  beforeEach(() => { app = buildApp() })

  it('responde 404', async () => {
    const res = await request(app).post('/api/v1/auth/setup').send({})
    expect(res.status).toBe(404)
  })
})

describe('POST /users/:id/magic-link — reenvío de link de activación', () => {
  let app

  beforeEach(() => {
    store.users        = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens = new Map()
    store.loginAttempts = new Map()
    store.sessions     = []
    store.setupTokens  = new Map()
    app = buildApp()
  })

  it('regenera el magic link para un usuario existente', async () => {
    const userId = 'user-magic-test'
    store.users.push({
      id: userId,
      full_name: 'Reen',
      email: 'reen@test.com',
      password_hash: bcrypt.hashSync('placeholder', 4),
      role: 'researcher',
      active: false,
      must_change_password: false,
      broker_subject: null,
      token_version: 0,
      created_at: new Date(),
      updated_at: null,
      password_changed_at: null,
    })

    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .post(`/api/v1/users/${userId}/magic-link`)
      .set('Authorization', `Bearer ${tk}`)

    expect(res.status).toBe(200)
    expect(res.body.data._mock_magic_link).toMatch(/\/api\/v1\/auth\/activate\//)
  })

  it('POST /users/:id/reset-password devuelve 404 (renombrado)', async () => {
    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .post('/api/v1/users/cualquier-id/reset-password')
      .set('Authorization', `Bearer ${tk}`)
    expect(res.status).toBe(404)
  })
})
