/**
 * Tests de endpoints OIDC simulados del mock.
 * GET  /auth/oidc/authorize — redirige al redirect_uri con code y state
 * POST /auth/oidc/callback  — valida code, vincula broker_subject, emite JWT
 */
const request  = require('supertest')
const express  = require('express')
const bcrypt   = require('bcryptjs')
const { store } = require('../../store')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.set('trust proxy', false)
  app.use('/api/v1', require('../../routes/m1'))
  return app
}

function seedUser({ email, active = true, brokerSubject = null }) {
  store.users.push({
    id: `user-${email}`,
    full_name: 'Usuario Test',
    email,
    password_hash: bcrypt.hashSync('Password1!', 4),
    role: 'researcher',
    active,
    must_change_password: false,
    broker_subject: brokerSubject,
    token_version: 0,
    created_at: new Date(),
    updated_at: null,
    password_changed_at: null,
  })
}

describe('GET /auth/oidc/authorize', () => {
  let app

  beforeEach(() => {
    store.users        = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens = new Map()
    store.loginAttempts = new Map()
    store.sessions     = []
    app = buildApp()
  })

  it('redirige al simulador mock-sso con code, redirect_uri y state', async () => {
    const res = await request(app)
      .get('/api/v1/auth/oidc/authorize')
      .query({ redirect_uri: 'http://localhost:5173/auth/callback', state: 'abc123' })

    expect(res.status).toBe(302)
    const location = res.headers.location
    // En desarrollo redirige al selector de usuario del mock SSO
    expect(location).toMatch(/\/auth\/oidc\/mock-sso/)
    expect(location).toMatch(/code=/)
    expect(location).toMatch(/redirect_uri=/)
    expect(location).toMatch(/state=/)
  })

  it('devuelve 400 si falta redirect_uri', async () => {
    const res = await request(app)
      .get('/api/v1/auth/oidc/authorize')
      .query({ state: 'abc' })

    expect(res.status).toBe(400)
  })
})

describe('POST /auth/oidc/callback', () => {
  let app

  beforeEach(() => {
    store.users        = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens = new Map()
    store.loginAttempts = new Map()
    store.sessions     = []
    store.oidcCodes    = new Map()
    app = buildApp()
  })

  async function getValidCode(email, redirectUri = 'http://localhost:5173/auth/callback') {
    const res = await request(app)
      .get('/api/v1/auth/oidc/authorize')
      .query({ redirect_uri: redirectUri, state: 'st' })

    // El authorize ahora redirige a /auth/oidc/mock-sso (URL relativa).
    // Parseamos el code directamente del query string sin necesitar base URL.
    const location = res.headers.location
    const code = new URLSearchParams(location.split('?')[1]).get('code')
    store.oidcCodes.set(code, email)
    return code
  }

  it('emite JWT y vincula broker_subject en primer login OIDC', async () => {
    seedUser({ email: 'inv@test.com' })
    const code = await getValidCode('inv@test.com')

    const res = await request(app)
      .post('/api/v1/auth/oidc/callback')
      .send({ code, state: 'st' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(typeof res.body.data.access_token).toBe('string')

    const user = store.users.find((u) => u.email === 'inv@test.com')
    expect(user.broker_subject).not.toBeNull()
  })

  it('emite JWT cuando broker_subject coincide con el sub vinculado', async () => {
    seedUser({ email: 'vinc@test.com', brokerSubject: 'google-sub-abc' })
    const code = await getValidCode('vinc@test.com')
    // Simular que el code lleva el mismo sub
    store.oidcCodes.set(code, { email: 'vinc@test.com', sub: 'google-sub-abc' })

    const res = await request(app)
      .post('/api/v1/auth/oidc/callback')
      .send({ code, state: 'st' })

    expect(res.status).toBe(200)
  })

  it('devuelve 401 INVALID_CREDENTIALS cuando el sub no coincide con el vinculado', async () => {
    seedUser({ email: 'mismatch@test.com', brokerSubject: 'sub-original' })
    const code = await getValidCode('mismatch@test.com')
    store.oidcCodes.set(code, { email: 'mismatch@test.com', sub: 'sub-distinto' })

    const res = await request(app)
      .post('/api/v1/auth/oidc/callback')
      .send({ code, state: 'st' })

    expect(res.status).toBe(401)
    expect(res.body.status).toBe('error')
  })

  it('devuelve 401 cuando el code no existe o ya fue usado', async () => {
    const res = await request(app)
      .post('/api/v1/auth/oidc/callback')
      .send({ code: 'codigo-invalido', state: 'st' })

    expect(res.status).toBe(401)
  })

  it('devuelve 401 cuando el email del code no está registrado', async () => {
    const code = await getValidCode('noexiste@test.com')

    const res = await request(app)
      .post('/api/v1/auth/oidc/callback')
      .send({ code, state: 'st' })

    expect(res.status).toBe(401)
  })

  it('devuelve 401 si el usuario está inactivo', async () => {
    seedUser({ email: 'inactivo@test.com', active: false })
    const code = await getValidCode('inactivo@test.com')

    const res = await request(app)
      .post('/api/v1/auth/oidc/callback')
      .send({ code, state: 'st' })

    expect(res.status).toBe(401)
  })
})
