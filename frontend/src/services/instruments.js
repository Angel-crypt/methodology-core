/**
 * services/instruments.js
 * Módulo 2 — Gestión de Instrumentos
 *
 * Encapsula todas las llamadas a la API REST del módulo.
 * Base path: /api/v1/instruments
 * Todas las peticiones requieren Authorization: Bearer {token}
 */

const BASE = '/api/v1/instruments'

function headers(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function parseResponse(res) {
  try {
    return await res.json()
  } catch {
    return {
      status: 'error',
      message: `Error del servidor (HTTP ${res.status})`,
      data: null,
    }
  }
}

/**
 * RF-M2-LIST — GET /instruments
 * Accesible por todos los roles autenticados.
 * @param {string} token
 * @param {'active'|'inactive'|''} statusFilter
 */
export async function listarInstrumentos(token, statusFilter = '') {
  const url = statusFilter ? `${BASE}?status=${statusFilter}` : BASE
  const res = await fetch(url, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * RF-M2-01 — POST /instruments
 * Solo Administrador.
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
 * RF-M2-02 + RF-M2-03 — PATCH /instruments/:id
 * Edita descripción metodológica y/o periodo de vigencia.
 * Solo Administrador.
 * @param {string} token
 * @param {string} id UUID del instrumento
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
 * RF-M2-04 — PATCH /instruments/:id/status
 * Activa o desactiva un instrumento.
 * Solo Administrador.
 * @param {string} token
 * @param {string} id UUID del instrumento
 * @param {'active'|'inactive'} status
 */
export async function cambiarEstadoInstrumento(token, id, status) {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ status }),
  })
  return parseResponse(res)
}