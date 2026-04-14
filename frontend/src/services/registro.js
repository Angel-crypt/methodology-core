/**
 * services/registro.js
 * Módulo 4 — Registro Operativo
 *
 * Base path: /api/v1
 * Todas las peticiones requieren Authorization: Bearer {token}
 */

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
    return { status: 'error', message: `Error del servidor (HTTP ${res.status})`, data: null }
  }
}

/**
 * GET /applications/my
 * Devuelve las aplicaciones completadas por el aplicador autenticado,
 * enriquecidas con nombre del instrumento y valores de métrica.
 * @param {string} token
 */
export async function listarMisRegistros(token) {
  const res = await fetch('/api/v1/applications/my', { headers: headers(token) })
  return parseResponse(res)
}
