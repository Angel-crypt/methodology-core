/**
 * lib/api.js
 * Utilidades compartidas para llamadas a la API REST.
 */

/**
 * Parsea la respuesta de un fetch. Devuelve el JSON o un objeto de error
 * estructurado si el servidor no retorna JSON válido.
 * @param {Response} res
 * @returns {Promise<{status: string, message?: string, data?: any}>}
 */
export async function parseResponse(res) {
  try {
    return await res.json()
  } catch {
    return { status: 'error', message: `Error del servidor (HTTP ${res.status})` }
  }
}
