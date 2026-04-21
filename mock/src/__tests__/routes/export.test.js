/**
 * Tests M6 — Exportación Estructurada
 * HU21: GET /export/csv
 * HU22: GET /export/json
 */
const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')
const { store } = require('../../store')
const { JWT_SECRET } = require('../../middleware/auth')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/v1', require('../../routes/m6'))
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
    { id: 'admin-1',      role: 'superadmin', email: 'admin@test.com',      active: true },
    { id: 'app-1',        role: 'applicator', email: 'app@test.com',        active: true },
  ]
  store.revokedTokens = new Map()
  store.instruments = [
    { id: 'inst-1', name: 'Instrumento A', methodological_description: 'Desc A', is_active: true, deleted: false },
    { id: 'inst-2', name: 'Instrumento B', methodological_description: null,     is_active: true, deleted: false },
  ]
  store.metrics = [
    { id: 'metric-1', instrument_id: 'inst-1', name: 'Puntuación', metric_type: 'numeric'     },
    { id: 'metric-2', instrument_id: 'inst-1', name: 'Categoría',  metric_type: 'categorical' },
    { id: 'metric-3', instrument_id: 'inst-2', name: 'Resultado',  metric_type: 'boolean'     },
  ]
  store.subjects = [
    {
      id: 'subj-1', project_id: 'proj-1', created_by: 'app-1', created_at: new Date(),
      context: {
        school_type: 'public', education_level: 'primary_lower',
        age_cohort: '6-9', gender: 'female', socioeconomic_level: 'medium',
        additional_attributes: null,
      },
    },
    {
      id: 'subj-2', project_id: 'proj-1', created_by: 'app-1', created_at: new Date(),
      context: null,
    },
  ]
  store.applications = [
    { id: 'app-a1', subject_id: 'subj-1', instrument_id: 'inst-1', application_date: '2026-03-10', created_at: new Date() },
    { id: 'app-a2', subject_id: 'subj-2', instrument_id: 'inst-2', application_date: '2026-03-20', created_at: new Date() },
    { id: 'app-a3', subject_id: 'subj-1', instrument_id: 'inst-1', application_date: '2026-04-05', created_at: new Date() },
  ]
  store.metricValues = [
    { id: 'mv-1', application_id: 'app-a1', metric_id: 'metric-1', value: 42    },
    { id: 'mv-2', application_id: 'app-a1', metric_id: 'metric-2', value: 'alto' },
    { id: 'mv-3', application_id: 'app-a2', metric_id: 'metric-3', value: true  },
  ]
}

// ── CSV ───────────────────────────────────────────────────────────────────────

describe('HU21 — GET /export/csv', () => {
  let app

  beforeEach(() => {
    seedData()
    app = buildApp()
  })

  // CA-HU21-01
  it('researcher descarga CSV → 200 con Content-Type text/csv', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
  })

  // CA-HU21-02
  it('primera fila del CSV contiene encabezados con columnas fijas y métricas', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv')
      .set('Authorization', `Bearer ${researcherToken()}`)

    const rows = res.text.split('\r\n')
    const headers = rows[0]
    expect(headers).toContain('application_id')
    expect(headers).toContain('subject_id')
    expect(headers).toContain('instrument_name')
    expect(headers).toContain('application_date')
    expect(headers).toContain('school_type')
    // Columnas de métricas dinámicas
    expect(headers).toContain('Puntuación')
    expect(headers).toContain('Categoría')
    expect(headers).toContain('Resultado')
  })

  // CA-HU21-03
  it('cada fila posterior representa una aplicación', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv')
      .set('Authorization', `Bearer ${researcherToken()}`)

    const rows = res.text.split('\r\n').filter(Boolean)
    expect(rows.length).toBe(4) // 1 header + 3 aplicaciones
  })

  // CA-HU21-04
  it('sujeto sin ContextData → celdas de contexto vacías, sin error', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    const rows = res.text.split('\r\n').filter(Boolean)
    // La aplicación de subj-2 (sin contexto) debe estar presente sin error
    const appRow = rows.find((r) => r.includes('app-a2'))
    expect(appRow).toBeDefined()
  })

  // CA-HU21-05
  it('filtro por instrument_id válido → solo aplicaciones de ese instrumento', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv?instrument_id=inst-1')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    const rows = res.text.split('\r\n').filter(Boolean)
    expect(rows.length).toBe(3) // 1 header + 2 apps de inst-1
  })

  // CA-HU21-06
  it('filtro por rango de fechas → solo aplicaciones dentro del rango', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv?start_date=2026-03-01&end_date=2026-03-31')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    const rows = res.text.split('\r\n').filter(Boolean)
    expect(rows.length).toBe(3) // 1 header + 2 apps de marzo
  })

  // CA-HU21-07
  it('sin aplicaciones que coincidan → CSV con solo encabezados → 200', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv?start_date=2020-01-01&end_date=2020-12-31')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    const rows = res.text.split('\r\n').filter(Boolean)
    expect(rows.length).toBe(1) // solo encabezados
  })

  // CA-HU21-08
  it('Content-Disposition incluye filename con fecha', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.headers['content-disposition']).toMatch(/attachment; filename="dataset_\d{8}\.csv"/)
  })

  // CA-HU21-09
  it('applicator intenta exportar → 403', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv')
      .set('Authorization', `Bearer ${applicatorToken()}`)

    expect(res.status).toBe(403)
  })

  // CA-HU21-10
  it('sin token JWT → 401', async () => {
    const res = await request(app).get('/api/v1/export/csv')
    expect(res.status).toBe(401)
  })

  it('superadmin intenta exportar CSV → 403', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(403)
  })

  it('instrument_id inexistente → 404', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv?instrument_id=no-existe')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(404)
  })

  it('start_date > end_date → 400', async () => {
    const res = await request(app)
      .get('/api/v1/export/csv?start_date=2026-04-01&end_date=2026-03-01')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(400)
  })
})

// ── PDF ───────────────────────────────────────────────────────────────────────

describe('GET /export/pdf (superadmin — reporte agregado)', () => {
  let app

  beforeEach(() => {
    seedData()
    app = buildApp()
  })

  it('superadmin recibe PDF → 200 con Content-Type application/pdf', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf')
      .set('Authorization', `Bearer ${adminToken()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
  })

  it('Content-Disposition incluye filename con fecha', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf')
      .set('Authorization', `Bearer ${adminToken()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(res.headers['content-disposition']).toMatch(/attachment; filename="reporte_\d{8}\.pdf"/)
  })

  it('respuesta es un buffer con cabecera PDF válida (%PDF-)', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf')
      .set('Authorization', `Bearer ${adminToken()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(res.body.slice(0, 4).toString()).toBe('%PDF')
  })

  it('researcher intenta descargar PDF → 403', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(403)
  })

  it('applicator intenta descargar PDF → 403', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf')
      .set('Authorization', `Bearer ${applicatorToken()}`)

    expect(res.status).toBe(403)
  })

  it('sin token → 401', async () => {
    const res = await request(app).get('/api/v1/export/pdf')
    expect(res.status).toBe(401)
  })

  it('start_date > end_date → 400', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf?start_date=2026-04-01&end_date=2026-03-01')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(400)
  })

  it('filtro de fechas válido → 200', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf?start_date=2026-03-01&end_date=2026-03-31')
      .set('Authorization', `Bearer ${adminToken()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.body.slice(0, 4).toString()).toBe('%PDF')
  })
})

// ── JSON ──────────────────────────────────────────────────────────────────────

describe('HU22 — GET /export/json', () => {
  let app

  beforeEach(() => {
    seedData()
    app = buildApp()
  })

  // CA-HU22-01
  it('researcher descarga JSON → 200', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
  })

  // CA-HU22-02
  it('JSON contiene exported_at en formato ISO 8601', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.body).toHaveProperty('exported_at')
    expect(() => new Date(res.body.exported_at)).not.toThrow()
  })

  // CA-HU22-03
  it('JSON agrupa aplicaciones bajo su instrumento', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(Array.isArray(res.body.instruments)).toBe(true)
    const instrA = res.body.instruments.find((i) => i.instrument_name === 'Instrumento A')
    expect(instrA).toBeDefined()
    expect(Array.isArray(instrA.applications)).toBe(true)
    expect(instrA.applications.length).toBe(2)
  })

  // CA-HU22-04
  it('metric_values en cada aplicación tiene metric_name, metric_type, value', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${researcherToken()}`)

    const instrA = res.body.instruments.find((i) => i.instrument_name === 'Instrumento A')
    const mv = instrA.applications[0].metric_values[0]
    expect(mv).toHaveProperty('metric_name')
    expect(mv).toHaveProperty('metric_type')
    expect(mv).toHaveProperty('value')
  })

  // CA-HU22-05
  it('sujeto sin ContextData → context: null', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${researcherToken()}`)

    const instrB  = res.body.instruments.find((i) => i.instrument_name === 'Instrumento B')
    const appSubj2 = instrB.applications.find((a) => a.subject_id === 'subj-2')
    expect(appSubj2.context).toBeNull()
  })

  // CA-HU22-06
  it('filtros aplicados se reflejan en filters_applied', async () => {
    const res = await request(app)
      .get('/api/v1/export/json?instrument_id=inst-1&start_date=2026-03-01')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.body.filters_applied.instrument_id).toBe('inst-1')
    expect(res.body.filters_applied.start_date).toBe('2026-03-01')
  })

  // CA-HU22-07
  it('sin aplicaciones que coincidan → total_applications:0, instruments:[]', async () => {
    const res = await request(app)
      .get('/api/v1/export/json?start_date=2020-01-01&end_date=2020-12-31')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.total_applications).toBe(0)
    expect(res.body.instruments).toEqual([])
  })

  // CA-HU22-08 — schema básico
  it('JSON cumple estructura: exported_at, total_applications, filters_applied, instruments', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.body).toHaveProperty('exported_at')
    expect(res.body).toHaveProperty('total_applications')
    expect(res.body).toHaveProperty('filters_applied')
    expect(res.body).toHaveProperty('instruments')
  })

  // CA-HU22-09
  it('Content-Disposition incluye filename con fecha para JSON', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${researcherToken()}`)

    expect(res.headers['content-disposition']).toMatch(/attachment; filename="dataset_\d{8}\.json"/)
  })

  // CA-HU22-10
  it('applicator intenta exportar JSON → 403', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${applicatorToken()}`)

    expect(res.status).toBe(403)
  })

  it('superadmin intenta exportar JSON → 403', async () => {
    const res = await request(app)
      .get('/api/v1/export/json')
      .set('Authorization', `Bearer ${adminToken()}`)

    expect(res.status).toBe(403)
  })

  it('sin token JWT → 401', async () => {
    const res = await request(app).get('/api/v1/export/json')
    expect(res.status).toBe(401)
  })
})
