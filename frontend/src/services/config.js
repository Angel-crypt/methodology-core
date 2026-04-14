/**
 * services/config.js
 * Configuración global del Registro Operativo.
 * Base path: /api/v1/config
 * Solo Administrador.
 */

import { parseResponse } from '@/lib/api'

const BASE = '/api/v1/config'

function headers(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * GET /config/operativo
 * Obtiene la configuración global del Registro Operativo.
 * @param {string} token
 */
export async function obtenerConfigOperativo(token) {
  const res = await fetch(`${BASE}/operativo`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * PUT /config/operativo
 * Guarda la configuración global del Registro Operativo (patch parcial).
 * @param {string} token
 * @param {object} config
 */
export async function guardarConfigOperativo(token, config) {
  const res = await fetch(`${BASE}/operativo`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(config),
  })
  return parseResponse(res)
}
