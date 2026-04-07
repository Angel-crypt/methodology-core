/**
 * Tests de rutas M3 — Métricas (rutas canónicas /instruments/:id/metrics)
 * Verifica que los 4 endpoints canónicos funcionan correctamente.
 */
const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')
const { store } = require('../../store')
const { JWT_SECRET } = require('../../middleware/auth')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/v1', require('../../routes/m2'))
  app.use('/api/v1', require('../../routes/m3'))
  return app
}

function adminToken() {
  return jwt.sign(
    { user_id: 'admin-1', role: 'administrator', email: 'admin@test.com', jti: 'jti-m3' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function bearerToken() {
  return jwt.sign(
    { user_id: 'user-1', role: 'applicator', email: 'user@test.com', jti: 'jti-user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

const INSTRUMENT_ID = 'inst-m3-1'

describe('M3 — /instruments/:id/metrics (rutas canónicas)', () => {
  let app

  beforeEach(() => {
    store.instruments = [
      { id: INSTRUMENT_ID, name: 'Instrumento M3', is_active: true, deleted: false, created_at: new Date(), updated_at: new Date() },
    ]
    store.metrics = []
    store.revokedTokens = new Map()
    store.users = [
      { id: 'admin-1', role: 'administrator', email: 'admin@test.com', active: true },
      { id: 'user-1', role: 'applicator', email: 'user@test.com', active: true },
    ]
    app = buildApp()
  })

  it('POST /instruments/:id/metrics — crea una métrica', async () => {
    const res = await request(app)
      .post(`/api/v1/instruments/${INSTRUMENT_ID}/metrics`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Puntaje', metric_type: 'numeric', required: true })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('success')
    expect(res.body.data.name).toBe('Puntaje')
    expect(res.body.data.instrument_id).toBe(INSTRUMENT_ID)
  })

  it('GET /instruments/:id/metrics — lista métricas del instrumento', async () => {
    store.metrics.push({
      id: 'met-1', instrument_id: INSTRUMENT_ID, name: 'Test', metric_type: 'boolean',
      required: false, min_value: null, max_value: null, options: null, description: null,
    })

    const res = await request(app)
      .get(`/api/v1/instruments/${INSTRUMENT_ID}/metrics`)
      .set('Authorization', `Bearer ${bearerToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('Test')
  })

  it('GET /instruments/:id/metrics — 404 si el instrumento no existe', async () => {
    const res = await request(app)
      .get('/api/v1/instruments/no-existe/metrics')
      .set('Authorization', `Bearer ${bearerToken()}`)

    expect(res.status).toBe(404)
  })

  it('PATCH /instruments/:id/metrics/:metricId — edita una métrica', async () => {
    store.metrics.push({
      id: 'met-2', instrument_id: INSTRUMENT_ID, name: 'Original', metric_type: 'boolean',
      required: false, min_value: null, max_value: null, options: null, description: null,
      updated_at: new Date(),
    })

    const res = await request(app)
      .patch(`/api/v1/instruments/${INSTRUMENT_ID}/metrics/met-2`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Actualizado' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Actualizado')
  })

  it('DELETE /instruments/:id/metrics/:metricId — elimina una métrica', async () => {
    store.metrics.push({
      id: 'met-3', instrument_id: INSTRUMENT_ID, name: 'Para borrar', metric_type: 'boolean',
      required: false, min_value: null, max_value: null, options: null, description: null,
    })

    const res = await request(app)
      .delete(`/api/v1/instruments/${INSTRUMENT_ID}/metrics/met-3`)
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(200)
    expect(store.metrics).toHaveLength(0)
  })

  it('PATCH y DELETE retornan 404 si la métrica no pertenece al instrumento', async () => {
    store.metrics.push({
      id: 'met-4', instrument_id: 'otro-instrumento', name: 'Ajena', metric_type: 'boolean',
      required: false, min_value: null, max_value: null, options: null, description: null,
      updated_at: new Date(),
    })

    const patch = await request(app)
      .patch(`/api/v1/instruments/${INSTRUMENT_ID}/metrics/met-4`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'X' })

    const del = await request(app)
      .delete(`/api/v1/instruments/${INSTRUMENT_ID}/metrics/met-4`)
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(patch.status).toBe(404)
    expect(del.status).toBe(404)
  })
})

describe('M2 — POST /instruments respuesta con is_active', () => {
  let app

  beforeEach(() => {
    store.instruments = []
    store.revokedTokens = new Map()
    store.users = [{ id: 'admin-1', role: 'administrator', email: 'admin@test.com', active: true }]
    app = buildApp()
  })

  it('POST /instruments devuelve is_active: true (no status string)', async () => {
    const res = await request(app)
      .post('/api/v1/instruments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Nuevo instrumento' })

    expect(res.status).toBe(201)
    expect(typeof res.body.data.is_active).toBe('boolean')
    expect(res.body.data.is_active).toBe(true)
    expect(res.body.data).not.toHaveProperty('status')
  })

  it('GET /instruments/:id devuelve is_active (no status string)', async () => {
    store.instruments.push({
      id: 'inst-get-1', name: 'Test', is_active: true, deleted: false,
      methodological_description: null, start_date: null, end_date: null,
      created_at: new Date(), updated_at: new Date(),
    })
    store.metrics = []

    const res = await request(app)
      .get('/api/v1/instruments/inst-get-1')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(200)
    expect(typeof res.body.data.is_active).toBe('boolean')
    expect(res.body.data.is_active).toBe(true)
    expect(res.body.data).not.toHaveProperty('status')
  })
})
