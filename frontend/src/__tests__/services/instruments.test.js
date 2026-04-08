/**
 * Tests del servicio de instrumentos (frontend → mock).
 *
 * Cubre:
 *   - cambiarEstadoInstrumento envía `{ is_active }` (booleano) a
 *     PATCH /instruments/:id/status con header de autorización.
 *   - listarInstrumentos serializa los filtros opcionales `is_active` y `tag`
 *     (repetible) en el query string.
 *   - listarTags llama a GET /instruments/tags.
 *   - crearInstrumento y editarInstrumento incluyen los campos `tags` y
 *     `min_days_between_applications` en el body cuando se pasan.
 *   - Los endpoints de métricas usan los paths canónicos
 *     /instruments/:id/metrics[/:metricId].
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cambiarEstadoInstrumento,
  listarInstrumentos,
  listarTags,
  crearInstrumento,
  editarInstrumento,
  listarMetricas,
  crearMetrica,
  editarMetrica,
  eliminarMetrica,
} from '@/services/instruments'

function mockFetch(responseBody, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

describe('cambiarEstadoInstrumento — contrato API', () => {
  let fetchSpy
  const TOKEN = 'test-token'
  const INSTRUMENT_ID = 'inst-abc'

  beforeEach(() => {
    vi.restoreAllMocks()
    fetchSpy = mockFetch({ status: 'success', data: null })
  })

  it('envía { is_active: false } al desactivar', async () => {
    await cambiarEstadoInstrumento(TOKEN, INSTRUMENT_ID, 'inactive')
    const [, options] = fetchSpy.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body).toEqual({ is_active: false })
    expect(body).not.toHaveProperty('status')
  })

  it('envía { is_active: true } al activar', async () => {
    await cambiarEstadoInstrumento(TOKEN, INSTRUMENT_ID, 'active')
    const [, options] = fetchSpy.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body).toEqual({ is_active: true })
    expect(body).not.toHaveProperty('status')
  })

  it('llama al endpoint correcto PATCH /instruments/:id/status', async () => {
    await cambiarEstadoInstrumento(TOKEN, INSTRUMENT_ID, 'inactive')
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toContain(`/instruments/${INSTRUMENT_ID}/status`)
    expect(options.method).toBe('PATCH')
  })

  it('incluye Authorization header con el token', async () => {
    await cambiarEstadoInstrumento(TOKEN, INSTRUMENT_ID, 'active')
    const [, options] = fetchSpy.mock.calls[0]
    expect(options.headers['Authorization']).toBe(`Bearer ${TOKEN}`)
  })
})

describe('listarInstrumentos — filtro is_active', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('sin filtro llama a /instruments sin parámetros', async () => {
    const spy = mockFetch({ status: 'success', data: [] })
    await listarInstrumentos('token')
    const [url] = spy.mock.calls[0]
    expect(url).toMatch(/\/instruments$/)
  })

  it('con filtro "active" envía ?is_active=true', async () => {
    const spy = mockFetch({ status: 'success', data: [] })
    await listarInstrumentos('token', 'active')
    const [url] = spy.mock.calls[0]
    expect(url).toContain('is_active=true')
    expect(url).not.toContain('status=')
  })

  it('con filtro "inactive" envía ?is_active=false', async () => {
    const spy = mockFetch({ status: 'success', data: [] })
    await listarInstrumentos('token', 'inactive')
    const [url] = spy.mock.calls[0]
    expect(url).toContain('is_active=false')
  })
})

describe('tags y min_days_between_applications', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('listarTags → GET /instruments/tags con header de auth', async () => {
    const spy = mockFetch({ status: 'success', data: ['lectura', 'matemáticas'] })
    const result = await listarTags('test-token')
    const [url, options] = spy.mock.calls[0]
    expect(url).toMatch(/\/instruments\/tags$/)
    expect(options.headers.Authorization).toBe('Bearer test-token')
    expect(result.data).toEqual(['lectura', 'matemáticas'])
  })

  it('listarInstrumentos con filtro de un tag → ?tag=lectura', async () => {
    const spy = mockFetch({ status: 'success', data: [] })
    await listarInstrumentos('token', '', ['lectura'])
    const [url] = spy.mock.calls[0]
    expect(url).toContain('tag=lectura')
  })

  it('listarInstrumentos con varios tags → ?tag=...&tag=... (OR semántico)', async () => {
    const spy = mockFetch({ status: 'success', data: [] })
    await listarInstrumentos('token', '', ['lectura', 'matemáticas'])
    const [url] = spy.mock.calls[0]
    const params = new URL(url, 'http://x').searchParams.getAll('tag')
    expect(params.sort()).toEqual(['lectura', 'matemáticas'])
  })

  it('listarInstrumentos combina is_active y tag', async () => {
    const spy = mockFetch({ status: 'success', data: [] })
    await listarInstrumentos('token', 'active', ['lectura'])
    const [url] = spy.mock.calls[0]
    expect(url).toContain('is_active=true')
    expect(url).toContain('tag=lectura')
  })

  it('crearInstrumento envía tags y min_days_between_applications en el body', async () => {
    const spy = mockFetch({ status: 'success', data: { id: 'i-1' } }, 201)
    await crearInstrumento('token', {
      name: 'Test',
      tags: ['lectura', 'primaria'],
      min_days_between_applications: 7,
    })
    const [, options] = spy.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.tags).toEqual(['lectura', 'primaria'])
    expect(body.min_days_between_applications).toBe(7)
  })

  it('editarInstrumento permite actualizar solo tags', async () => {
    const spy = mockFetch({ status: 'success', data: null })
    await editarInstrumento('token', 'i-1', { tags: ['nuevo'] })
    const [url, options] = spy.mock.calls[0]
    expect(url).toContain('/instruments/i-1')
    expect(options.method).toBe('PATCH')
    const body = JSON.parse(options.body)
    expect(body).toEqual({ tags: ['nuevo'] })
  })
})

describe('Métricas — endpoints bajo /instruments/:id/metrics', () => {
  const TOKEN = 'tok'
  const INSTRUMENT_ID = 'inst-1'
  const METRIC_ID = 'met-1'

  beforeEach(() => vi.restoreAllMocks())

  it('listarMetricas → GET /instruments/:id/metrics', async () => {
    const spy = mockFetch({ status: 'success', data: [] })
    await listarMetricas(TOKEN, INSTRUMENT_ID)
    const [url] = spy.mock.calls[0]
    expect(url).toContain(`/instruments/${INSTRUMENT_ID}/metrics`)
    expect(url).not.toContain('?instrument_id=')
  })

  it('crearMetrica → POST /instruments/:id/metrics', async () => {
    const spy = mockFetch({ status: 'success', data: {} }, 201)
    await crearMetrica(TOKEN, INSTRUMENT_ID, { name: 'Test', data_type: 'numeric' })
    const [url, options] = spy.mock.calls[0]
    expect(url).toContain(`/instruments/${INSTRUMENT_ID}/metrics`)
    expect(options.method).toBe('POST')
  })

  it('editarMetrica → PATCH /instruments/:instrumentId/metrics/:metricId', async () => {
    const spy = mockFetch({ status: 'success', data: {} })
    await editarMetrica(TOKEN, INSTRUMENT_ID, METRIC_ID, { name: 'Nuevo' })
    const [url, options] = spy.mock.calls[0]
    expect(url).toContain(`/instruments/${INSTRUMENT_ID}/metrics/${METRIC_ID}`)
    expect(options.method).toBe('PATCH')
  })

  it('eliminarMetrica → DELETE /instruments/:instrumentId/metrics/:metricId', async () => {
    const spy = mockFetch({ status: 'success', data: {} })
    await eliminarMetrica(TOKEN, INSTRUMENT_ID, METRIC_ID)
    const [url, options] = spy.mock.calls[0]
    expect(url).toContain(`/instruments/${INSTRUMENT_ID}/metrics/${METRIC_ID}`)
    expect(options.method).toBe('DELETE')
  })
})
