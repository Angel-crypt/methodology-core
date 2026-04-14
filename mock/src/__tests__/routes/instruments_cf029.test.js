/**
 * Tests de los campos `tags` y `min_days_between_applications` en M2.
 *
 * Cubre:
 *   - POST /instruments normaliza tags (trim + lowercase + dedupe) y aplica
 *     default 0 a min_days_between_applications.
 *   - PATCH /instruments/:id reemplaza tags y actualiza min_days.
 *   - GET /instruments?tag=... filtra con OR semántico (acepta repeticiones).
 *   - GET /instruments/tags devuelve el catálogo único en lowercase ordenado
 *     alfabéticamente, excluyendo instrumentos con soft delete.
 *   - Validaciones rechazan tags no-array, elementos no-string, vacíos, y
 *     valores de min_days negativos o no enteros.
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
  return app
}

function adminToken() {
  return jwt.sign(
    { user_id: 'admin-1', role: 'superadmin', email: 'admin@test.com', jti: 'jti-cf029' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function bearer() {
  return `Bearer ${adminToken()}`
}

describe('M2 — tags y min_days_between_applications', () => {
  let app

  beforeEach(() => {
    store.instruments = []
    store.revokedTokens = new Map()
    store.users = [{ id: 'admin-1', role: 'superadmin', email: 'admin@test.com', active: true }]
    app = buildApp()
  })

  describe('POST /instruments — creación con tags y min_days', () => {
    it('persiste tags normalizados (lowercase + trim + dedupe) y min_days', async () => {
      const res = await request(app)
        .post('/api/v1/instruments')
        .set('Authorization', bearer())
        .send({
          name: 'Lectura',
          tags: ['Lectura', 'lectura', '  Comprensión  ', 'COMPRENSIÓN'],
          min_days_between_applications: 7,
        })

      expect(res.status).toBe(201)
      expect(res.body.status).toBe('success')
      expect(res.body.data.tags).toEqual(['lectura', 'comprensión'])
      expect(res.body.data.min_days_between_applications).toBe(7)
    })

    it('acepta tags vacíos (array vacío) y default min_days = 0', async () => {
      const res = await request(app)
        .post('/api/v1/instruments')
        .set('Authorization', bearer())
        .send({ name: 'Sin tags' })

      expect(res.status).toBe(201)
      expect(res.body.data.tags).toEqual([])
      expect(res.body.data.min_days_between_applications).toBe(0)
    })

    it('rechaza tags que no sean array con 400', async () => {
      const res = await request(app)
        .post('/api/v1/instruments')
        .set('Authorization', bearer())
        .send({ name: 'Mal tag', tags: 'lectura' })

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/tags/i)
    })

    it('rechaza tags con elementos no-string o vacíos con 400', async () => {
      const res = await request(app)
        .post('/api/v1/instruments')
        .set('Authorization', bearer())
        .send({ name: 'Mal tag 2', tags: ['ok', '', 42] })

      expect(res.status).toBe(400)
    })

    it('rechaza min_days_between_applications negativo con 400', async () => {
      const res = await request(app)
        .post('/api/v1/instruments')
        .set('Authorization', bearer())
        .send({ name: 'Negativo', min_days_between_applications: -1 })

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/min_days/i)
    })

    it('rechaza min_days_between_applications no entero con 400', async () => {
      const res = await request(app)
        .post('/api/v1/instruments')
        .set('Authorization', bearer())
        .send({ name: 'Decimal', min_days_between_applications: 1.5 })

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /instruments/:id — actualización de tags y min_days', () => {
    let id

    beforeEach(async () => {
      const create = await request(app)
        .post('/api/v1/instruments')
        .set('Authorization', bearer())
        .send({ name: 'Editable', tags: ['inicial'], min_days_between_applications: 3 })
      id = create.body.data.id
    })

    it('actualiza tags con nueva lista (reemplazo total)', async () => {
      const res = await request(app)
        .patch(`/api/v1/instruments/${id}`)
        .set('Authorization', bearer())
        .send({ tags: ['nuevo', 'OTRO'] })

      expect(res.status).toBe(200)
      expect(res.body.data.tags).toEqual(['nuevo', 'otro'])
    })

    it('actualiza min_days_between_applications', async () => {
      const res = await request(app)
        .patch(`/api/v1/instruments/${id}`)
        .set('Authorization', bearer())
        .send({ min_days_between_applications: 14 })

      expect(res.status).toBe(200)
      expect(res.body.data.min_days_between_applications).toBe(14)
    })

    it('rechaza min_days negativo en patch con 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/instruments/${id}`)
        .set('Authorization', bearer())
        .send({ min_days_between_applications: -5 })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /instruments — filtro ?tag=', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/instruments').set('Authorization', bearer())
        .send({ name: 'A', tags: ['lectura', 'primaria'] })
      await request(app).post('/api/v1/instruments').set('Authorization', bearer())
        .send({ name: 'B', tags: ['matemáticas', 'primaria'] })
      await request(app).post('/api/v1/instruments').set('Authorization', bearer())
        .send({ name: 'C', tags: ['lectura', 'secundaria'] })
      await request(app).post('/api/v1/instruments').set('Authorization', bearer())
        .send({ name: 'D' })
    })

    it('?tag=lectura devuelve solo instrumentos con ese tag', async () => {
      const res = await request(app)
        .get('/api/v1/instruments?tag=lectura')
        .set('Authorization', bearer())

      expect(res.status).toBe(200)
      const names = res.body.data.map((i) => i.name).sort()
      expect(names).toEqual(['A', 'C'])
    })

    it('?tag=lectura&tag=matemáticas aplica OR semántico', async () => {
      const res = await request(app)
        .get('/api/v1/instruments?tag=lectura&tag=matemáticas')
        .set('Authorization', bearer())

      expect(res.status).toBe(200)
      const names = res.body.data.map((i) => i.name).sort()
      expect(names).toEqual(['A', 'B', 'C'])
    })

    it('?tag=LECTURA es case-insensitive (los tags se guardan lowercase)', async () => {
      const res = await request(app)
        .get('/api/v1/instruments?tag=LECTURA')
        .set('Authorization', bearer())

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })

    it('cada instrumento incluye tags y min_days_between_applications en la respuesta', async () => {
      const res = await request(app)
        .get('/api/v1/instruments')
        .set('Authorization', bearer())

      expect(res.status).toBe(200)
      res.body.data.forEach((inst) => {
        expect(Array.isArray(inst.tags)).toBe(true)
        expect(typeof inst.min_days_between_applications).toBe('number')
      })
    })
  })

  describe('GET /instruments/tags — catálogo de tags', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/instruments').set('Authorization', bearer())
        .send({ name: 'X', tags: ['lectura', 'primaria'] })
      await request(app).post('/api/v1/instruments').set('Authorization', bearer())
        .send({ name: 'Y', tags: ['matemáticas', 'PRIMARIA'] })
    })

    it('devuelve todos los tags únicos en lowercase ordenados alfabéticamente', async () => {
      const res = await request(app)
        .get('/api/v1/instruments/tags')
        .set('Authorization', bearer())

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('success')
      expect(res.body.data).toEqual(['lectura', 'matemáticas', 'primaria'])
    })

    it('los instrumentos eliminados (soft delete) no contribuyen tags', async () => {
      const create = await request(app).post('/api/v1/instruments').set('Authorization', bearer())
        .send({ name: 'Z', tags: ['exclusivo'] })
      await request(app).delete(`/api/v1/instruments/${create.body.data.id}`).set('Authorization', bearer())

      const res = await request(app)
        .get('/api/v1/instruments/tags')
        .set('Authorization', bearer())

      expect(res.body.data).not.toContain('exclusivo')
    })

    it('requiere autenticación', async () => {
      const res = await request(app).get('/api/v1/instruments/tags')
      expect(res.status).toBe(401)
    })
  })
})
