/**
 * Tests de rutas M2 — Instrumentos
 * T001 (mock side): PATCH /instruments/:id/status debe aceptar { is_active: boolean }
 * T011: DELETE /instruments/:id documentado y funcional
 */
const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')
const { store } = require('../../store')
const { JWT_SECRET } = require('../../middleware/auth')

// Construir una app de test aislada (sin el setInterval de limpieza)
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/v1', require('../../routes/m2'))
  return app
}

function adminToken() {
  return jwt.sign(
    { user_id: 'admin-1', role: 'administrator', email: 'admin@test.com', jti: 'jti-test' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

describe('M2 — PATCH /instruments/:id/status (T001 — BUG-006)', () => {
  let app
  let instrumentId

  beforeEach(() => {
    // Limpiar store y crear instrumento de prueba
    store.instruments = []
    store.revokedTokens = new Map()
    store.users = [{ id: 'admin-1', role: 'administrator', email: 'admin@test.com', active: true }]

    store.instruments.push({
      id: 'inst-test-1',
      name: 'Instrumento Test',
      is_active: true,
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    instrumentId = 'inst-test-1'
    app = buildApp()
  })

  it('acepta { is_active: false } y desactiva el instrumento', async () => {
    const res = await request(app)
      .patch(`/api/v1/instruments/${instrumentId}/status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ is_active: false })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(res.body.data.is_active).toBe(false)
  })

  it('acepta { is_active: true } y activa el instrumento', async () => {
    // Desactivar primero
    store.instruments[0].is_active = false

    const res = await request(app)
      .patch(`/api/v1/instruments/${instrumentId}/status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ is_active: true })

    expect(res.status).toBe(200)
    expect(res.body.data.is_active).toBe(true)
  })

  it('rechaza { status: "inactive" } (formato antiguo) con 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/instruments/${instrumentId}/status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'inactive' })

    expect(res.status).toBe(400)
  })

  it('rechaza body sin is_active con 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/instruments/${instrumentId}/status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('retorna 404 si el instrumento no existe', async () => {
    const res = await request(app)
      .patch('/api/v1/instruments/no-existe/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ is_active: false })

    expect(res.status).toBe(404)
  })
})

describe('M2 — DELETE /instruments/:id (T011 — G7)', () => {
  let app

  beforeEach(() => {
    store.instruments = [
      { id: 'inst-del-1', name: 'Para eliminar', is_active: true, deleted: false, created_at: new Date(), updated_at: new Date() },
    ]
    store.revokedTokens = new Map()
    store.users = [{ id: 'admin-1', role: 'administrator', email: 'admin@test.com', active: true }]
    app = buildApp()
  })

  it('elimina (soft delete) un instrumento existente → 200', async () => {
    const res = await request(app)
      .delete('/api/v1/instruments/inst-del-1')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    // Soft delete: el instrumento sigue en store pero marcado
    expect(store.instruments[0].deleted).toBe(true)
  })

  it('retorna 404 si el instrumento no existe', async () => {
    const res = await request(app)
      .delete('/api/v1/instruments/no-existe')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(404)
  })

  it('requiere autenticación — sin token retorna 401', async () => {
    const res = await request(app)
      .delete('/api/v1/instruments/inst-del-1')

    expect(res.status).toBe(401)
  })
})

describe('M2 — GET /instruments con filtro is_active', () => {
  let app

  beforeEach(() => {
    store.instruments = [
      { id: 'i1', name: 'Activo', is_active: true, deleted: false },
      { id: 'i2', name: 'Inactivo', is_active: false, deleted: false },
    ]
    store.revokedTokens = new Map()
    store.users = [{ id: 'admin-1', role: 'administrator', email: 'admin@test.com', active: true }]
    app = buildApp()
  })

  it('GET /instruments?is_active=true retorna solo los activos', async () => {
    const res = await request(app)
      .get('/api/v1/instruments?is_active=true')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('Activo')
  })

  it('GET /instruments?is_active=false retorna solo los inactivos', async () => {
    const res = await request(app)
      .get('/api/v1/instruments?is_active=false')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('Inactivo')
  })

  it('cada instrumento en la respuesta tiene campo is_active (boolean)', async () => {
    const res = await request(app)
      .get('/api/v1/instruments')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(200)
    res.body.data.forEach((inst) => {
      expect(typeof inst.is_active).toBe('boolean')
    })
  })
})
