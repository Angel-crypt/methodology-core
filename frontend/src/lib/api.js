/**
 * lib/api.js
 * Utilidades compartidas para llamadas a la API REST.
 */

/**
 * Parsea la respuesta de un fetch. Devuelve el JSON o un objeto de error
 * estructurado si el servidor no retorna JSON válido.
 * Despacha 'auth:session-expired' en cualquier 401 para que AuthContext
 * redirija al login con mensaje visible (C-05).
 * @param {Response} res
 * @returns {Promise<{status: string, message?: string, data?: any}>}
 */
export async function parseResponse(res) {
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
  }
  try {
    return await res.json()
  } catch {
    return { status: 'error', message: `Error del servidor (HTTP ${res.status})` }
  }
}
