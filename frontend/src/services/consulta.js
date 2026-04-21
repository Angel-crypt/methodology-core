/**
 * services/consulta.js
 * Módulo 5 — Consulta Interna Básica
 *
 * Base path: /api/v1
 * Todas las peticiones requieren Authorization: Bearer {token}
 */

import { parseResponse } from '@/lib/api'

function headers(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * GET /applications
 * Listado paginado de aplicaciones con valores de métricas.
 * Solo accesible para researcher.
 * @param {string} token
 * @param {{ page?, page_size?, instrument_id?, start_date?, end_date? }} params
 */
export async function listarAplicaciones(token, params = {}) {
  const query = new URLSearchParams()
  if (params.page)          query.set('page',          String(params.page))
  if (params.page_size)     query.set('page_size',     String(params.page_size))
  if (params.instrument_id) query.set('instrument_id', params.instrument_id)
  if (params.start_date)    query.set('start_date',    params.start_date)
  if (params.end_date)      query.set('end_date',      params.end_date)
  const qs = query.toString()
  const res = await fetch(`/api/v1/applications${qs ? `?${qs}` : ''}`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * GET /applications/stats
 * Estadísticas agregadas del dataset sin detalle de aplicaciones.
 * Solo accesible para superadmin.
 * @param {string} token
 */
export async function obtenerEstadisticas(token) {
  const res = await fetch('/api/v1/applications/stats', { headers: headers(token) })
  return parseResponse(res)
}
