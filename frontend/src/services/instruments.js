/**
 * services/instruments.js
 *
 * Todas las llamadas a la API de instrumentos y sus métricas.
 * Base path: /api/v1/instruments
 * Cada función requiere un JWT válido.
 */

import { parseResponse } from '@/lib/api'

const BASE = '/api/v1/instruments'

function headers(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Lista instrumentos. Acepta filtros opcionales de estado y de tags
 * (lista de tags con OR semántico, case-insensitive).
 * @param {string} token
 * @param {'active'|'inactive'|''} statusFilter
 * @param {string[]} tagFilter
 */
export async function listarInstrumentos(token, statusFilter = '', tagFilter = []) {
  const params = new URLSearchParams()
  if (statusFilter === 'active') params.set('is_active', 'true')
  else if (statusFilter === 'inactive') params.set('is_active', 'false')
  for (const t of tagFilter) {
    if (typeof t === 'string' && t.trim()) params.append('tag', t.trim().toLowerCase())
  }
  const qs = params.toString()
  const url = qs ? `${BASE}?${qs}` : BASE
  const res = await fetch(url, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * Lista todos los tags únicos del catálogo de instrumentos.
 * @param {string} token
 */
export async function listarTags(token) {
  const res = await fetch(`${BASE}/tags`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * Crea un nuevo instrumento.
 * @param {string} token
 * @param {{ name: string, methodological_description?: string, start_date?: string, end_date?: string }} body
 */
export async function crearInstrumento(token, body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

/**
 * Edita la descripción y/o el período de vigencia de un instrumento.
 * @param {string} token
 * @param {string} id
 * @param {{ methodological_description?: string, start_date?: string, end_date?: string }} body
 */
export async function editarInstrumento(token, id, body) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

/**
 * Activa o desactiva un instrumento.
 * @param {string} token
 * @param {string} id
 * @param {'active'|'inactive'} status
 */
export async function cambiarEstadoInstrumento(token, id, status) {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ is_active: status === 'active' }),
  })
  return parseResponse(res)
}

/** Obtiene un instrumento por ID, incluyendo el conteo de métricas. */
export async function obtenerInstrumento(token, id) {
  const res = await fetch(`${BASE}/${id}`, { headers: headers(token) })
  return parseResponse(res)
}

/** Elimina un instrumento (soft delete). */
export async function eliminarInstrumento(token, id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  return parseResponse(res)
}

/** Lista todas las métricas de un instrumento. */
export async function listarMetricas(token, instrumentId) {
  const res = await fetch(`${BASE}/${instrumentId}/metrics`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * Crea una nueva métrica asociada a un instrumento.
 * @param {string} token
 * @param {string} instrumentId
 * @param {{ name: string, data_type: string, required?: boolean, min?: number, max?: number }} body
 */
export async function crearMetrica(token, instrumentId, body) {
  const res = await fetch(`${BASE}/${instrumentId}/metrics`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

/**
 * Edita una métrica existente.
 * @param {string} token
 * @param {string} instrumentId
 * @param {string} metricId
 */
export async function editarMetrica(token, instrumentId, metricId, body) {
  const res = await fetch(`${BASE}/${instrumentId}/metrics/${metricId}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

/** Elimina una métrica de un instrumento. */
export async function eliminarMetrica(token, instrumentId, metricId) {
  const res = await fetch(`${BASE}/${instrumentId}/metrics/${metricId}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  return parseResponse(res)
}
