/**
 * T001 — BUG-006: Contrato API de cambio de estado de instrumento
 * T008 — BUG-004: Filtro is_active=true en listarInstrumentos
 * T030 — Corrección de endpoints de métricas (paths SRS canónicos)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cambiarEstadoInstrumento,
  listarInstrumentos,
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

describe('cambiarEstadoInstrumento — contrato API (T001 / BUG-006)', () => {
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

describe('listarInstrumentos — filtro is_active (T008 / BUG-004)', () => {
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

describe('Métricas — endpoints bajo /instruments/:id/metrics (T030)', () => {
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
