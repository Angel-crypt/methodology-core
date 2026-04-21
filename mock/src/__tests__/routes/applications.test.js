/**
 * Tests M5 — Consulta Interna Básica
 * HU18: GET /applications — paginación base
 * HU19: GET /applications — filtro por instrumento
 * HU20: GET /applications — filtro por fecha
 * HU21: GET /applications/stats — estadísticas SUPERADMIN
 */
const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')
const { store } = require('../../store')
const { JWT_SECRET } = require('../../middleware/auth')

function buildApp() {
  const app = express()
  app.use(express.json())
  // m4 primero para que /applications/my no colisione con m5
  app.use('/api/v1', require('../../routes/m4'))
  app.use('/api/v1', require('../../routes/m5'))
  return app
}

function researcherToken() {
  return jwt.sign(
    { user_id: 'researcher-1', role: 'researcher', email: 'researcher@test.com', jti: 'jti-res' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function adminToken() {
  return jwt.sign(
    { user_id: 'admin-1', role: 'superadmin', email: 'admin@test.com', jti: 'jti-admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function applicatorToken() {
  return jwt.sign(
    { user_id: 'app-1', role: 'applicator', email: 'app@test.com', jti: 'jti-app' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function seedData() {
  store.users = [
    { id: 'researcher-1', role: 'researcher', email: 'researcher@test.com', active: true },
    { id: 'admin-1', role: 'superadmin', email: 'admin@test.com', active: true },
    { id: 'app-1', role: 'applicator', email: 'app@test.com', active: true },
  ]
  store.revokedTokens = new Map()
  store.instruments = [
    { id: 'inst-1', name: 'Instrumento A', is_active: true, deleted: false },
    { id: 'inst-2', name: 'Instrumento B', is_active: true, deleted: false },
  ]
  store.metrics = [
    { id: 'metric-1', instrument_id: 'inst-1', name: 'Puntuación', metric_type: 'numeric' },
    { id: 'metric-2', instrument_id: 'inst-2', name: 'Categoría', metric_type: 'categorical' },
  ]
  store.subjects = [
    { id: 'subj-1', project_id: 'proj-1', created_by: 'app-1', created_at: new Date() },
    { id: 'subj-2', project_id: 'proj-1', created_by: 'app-1', created_at: new Date() },
  ]
  store.applications = [
    { id: 'app-a1', subject_id: 'subj-1', instrument_id: 'inst-1', application_date: '2026-03-10', created_at: new Date() },
    { id: 'app-a2', subject_id: 'subj-2', instrument_id: 'inst-2', application_date: '2026-03-20', created_at: new Date() },
    { id: 'app-a3', subject_id: 'subj-1', instrument_id: 'inst-1', application_date: '2026-04-01', created_at: new Date() },
  ]
  store.metricValues = [
    { id: 'mv-1', application_id: 'app-a1', metric_id: 'metric-1', value: 42 },
    { id: 'mv-2', application_id: 'app-a2', metric_id: 'metric-2', value: 'alto' },
  ]
}

describe('HU18 — GET /applications (researcher)', () => {
  let app

  beforeEach(() => {
    seedData()
    app = buildApp()
  })

  // CA-HU18-01
  it('researcher autenticado recibe listado paginado con metadatos → 200', async () => {
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.meta).toHaveProperty('page')
    expect(res.body.meta).toHaveProperty('page_size')
    expect(res.body.meta).toHaveProperty('total_records')
    expect(res.body.meta).toHaveProperty('total_pages')
  })

  // CA-HU18-02
  it('cada elemento tiene id, subject_id, instrument_name, application_date, metric_values', async () => {
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    const item = res.body.data[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('subject_id')
    expect(item).toHaveProperty('instrument_name')
    expect(item).toHaveProperty('application_date')
    expect(Array.isArray(item.metric_values)).toBe(true)
  })

  // CA-HU18-03
  it('página que excede el total retorna listado vacío con metadatos correctos → 200', async () => {
    const res = await request(app)
      .get('/api/v1/applications?page=999')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta.total_records).toBe(3)
  })

  // CA-HU18-04
  it('page_size > 100 → 400', async () => {
    const res = await request(app)
      .get('/api/v1/applications?page_size=101')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(400)
    expect(res.body.status).toBe('error')
  })

  // CA-HU18-05
  it('applicator intenta acceder → 403', async () => {
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${applicatorToken()}`)

    expect(res.status).toBe(403)
  })

  // CA-HU18-06
  it('sin token JWT → 401', async () => {
    const res = await request(app).get('/api/v1/applications')
    expect(res.status).toBe(401)
  })

  // CA-HU18-07
  it('sin aplicaciones registradas → 200 con listado vacío y total_records=0', async () => {
    store.applications = []
    store.metricValues = []
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta.total_records).toBe(0)
  })
})

describe('HU19 — GET /applications?instrument_id (filtro por instrumento)', () => {
  let app

  beforeEach(() => {
    seedData()
    app = buildApp()
  })

  // CA-HU19-01
  it('filtro por instrument_id válido retorna solo sus aplicaciones', async () => {
    const res = await request(app)
      .get('/api/v1/applications?instrument_id=inst-1')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.data.every((a) => a.instrument_name === 'Instrumento A')).toBe(true)
    expect(res.body.meta.total_records).toBe(2)
  })

  // CA-HU19-02
  it('instrumento sin aplicaciones → 200 con listado vacío', async () => {
    store.instruments.push({ id: 'inst-empty', name: 'Vacío', is_active: true, deleted: false })
    const res = await request(app)
      .get('/api/v1/applications?instrument_id=inst-empty')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta.total_records).toBe(0)
  })

  // CA-HU19-03
  it('instrument_id inexistente → 404', async () => {
    const res = await request(app)
      .get('/api/v1/applications?instrument_id=no-existe')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(404)
  })

  // CA-HU19-04
  it('instrument_id + rango de fechas combinados', async () => {
    const res = await request(app)
      .get('/api/v1/applications?instrument_id=inst-1&start_date=2026-04-01&end_date=2026-04-30')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total_records).toBe(1)
    expect(res.body.data[0].id).toBe('app-a3')
  })
})

describe('HU20 — GET /applications con filtros de fecha', () => {
  let app

  beforeEach(() => {
    seedData()
    app = buildApp()
  })

  // CA-HU20-01
  it('start_date y end_date válidos retorna solo aplicaciones dentro del rango', async () => {
    const res = await request(app)
      .get('/api/v1/applications?start_date=2026-03-01&end_date=2026-03-31')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total_records).toBe(2)
  })

  // CA-HU20-02
  it('solo start_date → desde esa fecha en adelante', async () => {
    const res = await request(app)
      .get('/api/v1/applications?start_date=2026-03-20')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total_records).toBe(2)
  })

  // CA-HU20-03
  it('solo end_date → desde el inicio hasta esa fecha', async () => {
    const res = await request(app)
      .get('/api/v1/applications?end_date=2026-03-10')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total_records).toBe(1)
  })

  // CA-HU20-04
  it('start_date > end_date → 400', async () => {
    const res = await request(app)
      .get('/api/v1/applications?start_date=2026-04-01&end_date=2026-03-01')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(400)
  })

  // CA-HU20-05
  it('formato de fecha inválido → 400', async () => {
    const res = await request(app)
      .get('/api/v1/applications?start_date=not-a-date')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(400)
  })

  // CA-HU20-06
  it('rango sin aplicaciones → 200 con listado vacío', async () => {
    const res = await request(app)
      .get('/api/v1/applications?start_date=2020-01-01&end_date=2020-12-31')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta.total_records).toBe(0)
  })
})

describe('HU21 — GET /applications/stats (SUPERADMIN)', () => {
  let app

  beforeEach(() => {
    seedData()
    app = buildApp()
  })

  // CA-HU21-01
  it('superadmin recibe estadísticas agregadas → 200', async () => {
    const res = await request(app)
      .get('/api/v1/applications/stats')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(res.body.data).toHaveProperty('total_applications')
    expect(res.body.data).toHaveProperty('by_instrument')
    expect(res.body.data).toHaveProperty('date_range')
  })

  // CA-HU21-02
  it('respuesta no incluye subject_id ni metric_values en datos de aplicaciones', async () => {
    const res = await request(app)
      .get('/api/v1/applications/stats')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(200)
    // data.by_instrument items solo tienen instrument_id, instrument_name, count
    const row = res.body.data.by_instrument[0]
    expect(row).not.toHaveProperty('subject_id')
    expect(row).not.toHaveProperty('metric_values')
    expect(row).toHaveProperty('count')
  })

  // CA-HU21-03
  it('applicator intenta acceder a stats → 403', async () => {
    const res = await request(app)
      .get('/api/v1/applications/stats')
      .set('Authorization', `Bearer ${applicatorToken()}`)

    expect(res.status).toBe(403)
  })

  // CA-HU21-04
  it('sin token JWT en stats → 401', async () => {
    const res = await request(app).get('/api/v1/applications/stats')
    expect(res.status).toBe(401)
  })

  it('researcher no puede acceder a stats → 403', async () => {
    const res = await request(app)
      .get('/api/v1/applications/stats')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(403)
  })
})
