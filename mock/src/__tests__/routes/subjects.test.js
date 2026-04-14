/**
 * T002 — BUG-003: Endpoint de sujetos debe ser POST /projects/:projectId/subjects
 * T011: endpoints de contexto documentados y funcionales
 */
const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')
const { store } = require('../../store')
const { JWT_SECRET } = require('../../middleware/auth')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/v1', require('../../routes/m4'))
  return app
}

function applicatorToken() {
  return jwt.sign(
    { user_id: 'app-1', role: 'applicator', email: 'app@test.com', jti: 'jti-app' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

describe('M4 — POST /projects/:projectId/subjects (T002 — BUG-003)', () => {
  let app

  beforeEach(() => {
    store.subjects = []
    store.revokedTokens = new Map()
    store.users = [{ id: 'app-1', role: 'applicator', email: 'app@test.com', active: true }]
    store.userPermissions = new Map()
    app = buildApp()
  })

  it('crea un sujeto bajo el proyecto correcto → 201 con subject_id', async () => {
    const res = await request(app)
      .post('/api/v1/projects/proj-123/subjects')
      .set('Authorization', `Bearer ${applicatorToken()}`)
      .send()

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('success')
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data).toHaveProperty('project_id', 'proj-123')
  })

  it('el subject_id generado es un UUID v4', async () => {
    const res = await request(app)
      .post('/api/v1/projects/proj-xyz/subjects')
      .set('Authorization', `Bearer ${applicatorToken()}`)
      .send()

    expect(res.status).toBe(201)
    expect(res.body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('rechaza body con datos (Privacy by Design) → 400', async () => {
    const res = await request(app)
      .post('/api/v1/projects/proj-123/subjects')
      .set('Authorization', `Bearer ${applicatorToken()}`)
      .send({ nombre: 'Juan' })

    expect(res.status).toBe(400)
  })

  it('requiere autenticación — sin token → 401', async () => {
    const res = await request(app)
      .post('/api/v1/projects/proj-123/subjects')
      .send()

    expect(res.status).toBe(401)
  })
})

describe('M4 — GET /config/operativo deprecado (CF-014)', () => {
  let app

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/v1', require('../../routes/config'))
  })

  it('GET /config/operativo → 410 GONE (usa /projects/:id/config/operativo)', async () => {
    const res = await request(app)
      .get('/api/v1/config/operativo')

    expect(res.status).toBe(410)
    expect(res.body.data.code).toBe('GONE')
  })
})
