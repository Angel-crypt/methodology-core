/**
 * services/registro.js
 * Módulo 4 — Registro Operativo
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
 * GET /applications/my
 * Devuelve las aplicaciones completadas por el aplicador autenticado,
 * enriquecidas con nombre del instrumento y valores de métrica.
 * @param {string} token
 */
export async function listarMisRegistros(token, params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.page_size) query.set('page_size', String(params.page_size))
  if (params.instrument) query.set('instrument', params.instrument)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  if (params.project_id) query.set('project_id', params.project_id)
  if (params.anonymous_code) query.set('anonymous_code', params.anonymous_code)
  const qs = query.toString()
  const res = await fetch(`/api/v1/applications/my${qs ? `?${qs}` : ''}`, { headers: headers(token) })
  return parseResponse(res)
}
