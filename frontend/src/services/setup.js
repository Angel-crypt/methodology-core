/**
 * services/setup.js
 * Flujo de configuración inicial de cuenta.
 *
 * Endpoints públicos — no requieren Authorization header.
 * Base path: /api/v1/auth/setup
 */

const BASE = '/api/v1/auth/setup'

async function parseResponse(res) {
  try {
    return await res.json()
  } catch {
    return { status: 'error', message: `Error del servidor (HTTP ${res.status})` }
  }
}

/**
 * Valida el setup token y devuelve los datos públicos del usuario (email, full_name).
 * @param {string} token
 * @returns {{ status, data: { email, full_name } }}
 */
export async function validarSetupToken(token) {
  const res = await fetch(`${BASE}/${token}`)
  return parseResponse(res)
}

/**
 * Establece la contraseña del usuario usando el setup token.
 * El token queda invalidado inmediatamente tras completar el setup.
 * @param {string} token
 * @param {string} password
 */
export async function completarSetup(token, password) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
  return parseResponse(res)
}
