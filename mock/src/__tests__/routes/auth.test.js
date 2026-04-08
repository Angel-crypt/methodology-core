/**
 * Tests de POST /auth/login del mock — verifica que el flag
 * `must_change_password` viaja en el payload de respuesta tal como está
 * almacenado en el usuario.
 */
const request = require('supertest')
const express = require('express')
const bcrypt = require('bcryptjs')
const { store } = require('../../store')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.set('trust proxy', false)
  app.use('/api/v1', require('../../routes/m1'))
  return app
}

function seedUser({ email, mustChange }) {
  store.users.push({
    id: `user-${email}`,
    full_name: 'Usuario Test',
    email,
    password_hash: bcrypt.hashSync('Password1!', 4),
    role: 'applicator',
    active: true,
    must_change_password: mustChange,
    created_at: new Date(),
    updated_at: null,
    password_changed_at: null,
  })
}

describe('M1 — POST /auth/login (must_change_password)', () => {
  let app

  beforeEach(() => {
    store.users = store.users.filter((u) => u.email === 'admin@mock.local')
    store.revokedTokens = new Map()
    store.loginAttempts = new Map()
    store.sessions = []
    store.auditLog = []
    app = buildApp()
  })

  it('responde must_change_password=true cuando el usuario tiene el flag activo', async () => {
    seedUser({ email: 'pendiente@test.com', mustChange: true })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'pendiente@test.com', password: 'Password1!' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(res.body.data.must_change_password).toBe(true)
    expect(typeof res.body.data.access_token).toBe('string')
  })

  it('responde must_change_password=false cuando el usuario ya cambió su contraseña', async () => {
    seedUser({ email: 'normal@test.com', mustChange: false })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'normal@test.com', password: 'Password1!' })

    expect(res.status).toBe(200)
    expect(res.body.data.must_change_password).toBe(false)
  })

  it('el campo must_change_password siempre es booleano (no undefined ni null)', async () => {
    seedUser({ email: 'estricto@test.com', mustChange: false })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'estricto@test.com', password: 'Password1!' })

    expect(res.status).toBe(200)
    expect(typeof res.body.data.must_change_password).toBe('boolean')
  })
})
