/**
 * Tests del flujo de solicitud de cambio de correo (CF-009).
 * No autoservicio: el usuario solicita, el superadmin aprueba aplicando PATCH /users/:id/email.
 * Aplicar el cambio: invalida broker_subject y revoca todas las sesiones del usuario.
 */
const request  = require('supertest')
const express  = require('express')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const { store } = require('../../store')
const { JWT_SECRET } = require('../../middleware/auth')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.set('trust proxy', false)
  app.use('/api/v1', require('../../routes/m1'))
  return app
}

function ensureSuperadmin() {
  const sa = store.users.find((u) => u.role === 'superadmin')
  if (sa) sa.must_change_password = false
  return sa
}

async function getSuperadminToken(app) {
  const sa = ensureSuperadmin()
  const r = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: sa.email, password: process.env.SUPERADMIN_PASSWORD || 'cambiar-pronto' })
  return r.body.data.access_token
}

function seedResearcher(overrides = {}) {
  const user = {
    id: `user-${Date.now()}-${Math.random()}`,
    full_name: 'Investigador Test',
    email: `inv${Date.now()}@test.com`,
    password_hash: bcrypt.hashSync('pass', 4),
    role: 'researcher',
    active: true,
    must_change_password: false,
    broker_subject: 'google-sub-original',
    token_version: 0,
    created_at: new Date(),
    updated_at: null,
    password_changed_at: null,
    ...overrides,
  }
  store.users.push(user)
  return user
}

function makeJwt(user) {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 21600
  return jwt.sign(
    { user_id: user.id, role: user.role, email: user.email, jti: `jti-${user.id}`, iat, exp },
    JWT_SECRET,
    { algorithm: 'HS256', noTimestamp: true }
  )
}

describe('POST /users/me/email-change-request', () => {
  let app

  beforeEach(() => {
    store.users             = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens     = new Map()
    store.loginAttempts     = new Map()
    store.sessions          = []
    store.emailChangeRequests = []
    app = buildApp()
  })

  it('crea una solicitud y devuelve 201', async () => {
    const user = seedResearcher()
    const tk   = makeJwt(user)

    const res = await request(app)
      .post('/api/v1/users/me/email-change-request')
      .set('Authorization', `Bearer ${tk}`)
      .send({ new_email: 'nuevo@dominio.com', reason: 'Cambié de empresa' })

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data.new_email).toBe('nuevo@dominio.com')
  })

  it('devuelve 400 si falta new_email', async () => {
    const user = seedResearcher()
    const tk   = makeJwt(user)

    const res = await request(app)
      .post('/api/v1/users/me/email-change-request')
      .set('Authorization', `Bearer ${tk}`)
      .send({ reason: 'sin correo' })

    expect(res.status).toBe(400)
  })

  it('devuelve 400 si new_email tiene formato inválido', async () => {
    const user = seedResearcher()
    const tk   = makeJwt(user)

    const res = await request(app)
      .post('/api/v1/users/me/email-change-request')
      .set('Authorization', `Bearer ${tk}`)
      .send({ new_email: 'no-es-email' })

    expect(res.status).toBe(400)
  })

  it('devuelve 409 PENDING_REQUEST_EXISTS si ya hay una solicitud pendiente', async () => {
    const user = seedResearcher()
    const tk   = makeJwt(user)
    store.emailChangeRequests.push({ id: 'req-1', user_id: user.id, new_email: 'a@b.com', reason: '', created_at: new Date() })

    const res = await request(app)
      .post('/api/v1/users/me/email-change-request')
      .set('Authorization', `Bearer ${tk}`)
      .send({ new_email: 'otro@b.com' })

    expect(res.status).toBe(409)
    expect(res.body.data?.code).toBe('PENDING_REQUEST_EXISTS')
  })

  it('devuelve 409 EMAIL_ALREADY_EXISTS si new_email ya está registrado', async () => {
    const user  = seedResearcher({ email: 'orig@test.com' })
    const other = seedResearcher({ id: 'other-id', email: 'taken@test.com' })
    const tk    = makeJwt(user)

    const res = await request(app)
      .post('/api/v1/users/me/email-change-request')
      .set('Authorization', `Bearer ${tk}`)
      .send({ new_email: other.email })

    expect(res.status).toBe(409)
    expect(res.body.data?.code).toBe('EMAIL_ALREADY_EXISTS')
  })
})

describe('GET /users/email-change-requests (superadmin)', () => {
  let app

  beforeEach(() => {
    store.users             = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens     = new Map()
    store.loginAttempts     = new Map()
    store.sessions          = []
    store.emailChangeRequests = []
    app = buildApp()
  })

  it('devuelve lista de solicitudes al superadmin', async () => {
    const sa = ensureSuperadmin()
    const user = seedResearcher()
    store.emailChangeRequests.push({ id: 'req-1', user_id: user.id, current_email: user.email, new_email: 'new@test.com', reason: '', created_at: new Date() })

    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .get('/api/v1/users/email-change-requests')
      .set('Authorization', `Bearer ${tk}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data[0]).toHaveProperty('new_email')
  })

  it('devuelve 403 si no es superadmin', async () => {
    const user = seedResearcher()
    const tk   = makeJwt(user)

    const res = await request(app)
      .get('/api/v1/users/email-change-requests')
      .set('Authorization', `Bearer ${tk}`)

    expect(res.status).toBe(403)
  })
})

describe('PATCH /users/:id/email — aprobación con revocación de sesión', () => {
  let app

  beforeEach(() => {
    store.users             = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens     = new Map()
    store.loginAttempts     = new Map()
    store.sessions          = []
    store.emailChangeRequests = []
    app = buildApp()
  })

  it('actualiza el email y resetea broker_subject', async () => {
    const user = seedResearcher({ email: 'old@test.com' })
    store.emailChangeRequests.push({ id: 'req-1', user_id: user.id, new_email: 'new@test.com', created_at: new Date() })

    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .patch(`/api/v1/users/${user.id}/email`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ email: 'new@test.com' })

    expect(res.status).toBe(200)
    expect(user.email).toBe('new@test.com')
    expect(user.broker_subject).toBeNull()
  })

  it('incrementa token_version para revocar sesiones activas', async () => {
    const user = seedResearcher()
    const prevVersion = user.token_version

    const tk = await getSuperadminToken(app)
    await request(app)
      .patch(`/api/v1/users/${user.id}/email`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ email: 'updated@test.com' })

    expect(user.token_version).toBe(prevVersion + 1)
  })

  it('elimina solicitudes pendientes del usuario tras aplicar el cambio', async () => {
    const user = seedResearcher()
    store.emailChangeRequests.push({ id: 'req-99', user_id: user.id, new_email: 'x@test.com', created_at: new Date() })

    const tk = await getSuperadminToken(app)
    await request(app)
      .patch(`/api/v1/users/${user.id}/email`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ email: 'x@test.com' })

    expect(store.emailChangeRequests.filter((r) => r.user_id === user.id).length).toBe(0)
  })

  it('devuelve 404 si el usuario no existe', async () => {
    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .patch('/api/v1/users/no-existe/email')
      .set('Authorization', `Bearer ${tk}`)
      .send({ email: 'x@test.com' })

    expect(res.status).toBe(404)
  })

  it('devuelve 409 EMAIL_ALREADY_EXISTS si el email nuevo ya está en uso', async () => {
    const user1 = seedResearcher({ email: 'a@test.com' })
    const user2 = seedResearcher({ email: 'b@test.com' })

    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .patch(`/api/v1/users/${user1.id}/email`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ email: user2.email })

    expect(res.status).toBe(409)
    expect(res.body.data?.code).toBe('EMAIL_ALREADY_EXISTS')
  })
})

describe('DELETE /users/email-change-requests/:id (superadmin)', () => {
  let app

  beforeEach(() => {
    store.users             = store.users.filter((u) => u.role === 'superadmin')
    store.revokedTokens     = new Map()
    store.loginAttempts     = new Map()
    store.sessions          = []
    store.emailChangeRequests = []
    app = buildApp()
  })

  it('elimina la solicitud y devuelve 204', async () => {
    const user = seedResearcher()
    store.emailChangeRequests.push({ id: 'req-del', user_id: user.id, new_email: 'x@x.com', created_at: new Date() })

    const tk = await getSuperadminToken(app)
    const res = await request(app)
      .delete('/api/v1/users/email-change-requests/req-del')
      .set('Authorization', `Bearer ${tk}`)

    expect(res.status).toBe(204)
    expect(store.emailChangeRequests.find((r) => r.id === 'req-del')).toBeUndefined()
  })

  it('devuelve 403 si no es superadmin', async () => {
    const user = seedResearcher()
    const tk   = makeJwt(user)

    const res = await request(app)
      .delete('/api/v1/users/email-change-requests/any-id')
      .set('Authorization', `Bearer ${tk}`)

    expect(res.status).toBe(403)
  })
})
