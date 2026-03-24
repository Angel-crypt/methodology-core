/**
 * services/users.js
 * Módulo — Gestión de Usuarios
 *
 * Encapsula todas las llamadas a la API REST del módulo.
 * Base path: /api/v1/users
 * Todas las peticiones requieren Authorization: Bearer {token}
 */

const BASE = '/api/v1/users'

async function parseResponse(res) {
  try {
    return await res.json()
  } catch {
    return { status: 'error', message: `Error del servidor (HTTP ${res.status})` }
  }
}

function headers(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * RF-M1-LIST — GET /users
 * Accesible solo por Administrador.
 * @param {string} token
 * @param {'applicator'|'researcher'|'administrator'} role
 * @param {'true'|'false'|''} activeFilter — '' para todos
 */
export async function listarUsuarios(token, role, activeFilter = '') {
  const params = new URLSearchParams({ role })
  if (activeFilter !== '') params.set('active', activeFilter)
  const res = await fetch(`${BASE}?${params}`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * RF-M1-01 — POST /users
 * Solo Administrador. El role viene fijo desde la página que lo llama.
 * El servidor genera la contraseña temporal internamente (CSPRNG).
 * La respuesta incluye _mock_temp_password solo en el mock.
 * @param {string} token
 * @param {{ full_name: string, email: string, role: string }} body
 */
export async function crearUsuario(token, body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

/**
 * RF-M1-02 — PATCH /users/:id/status
 * Activa o desactiva una cuenta de usuario.
 * Solo Administrador.
 * @param {string} token
 * @param {string} id UUID del usuario
 * @param {boolean} active nuevo estado
 */
export async function cambiarEstadoUsuario(token, id, active) {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ active }),
  })
  return parseResponse(res)
}

/**
 * RF-M1-RESET — POST /users/:id/reset-password
 * Genera una nueva contraseña temporal para el usuario (pending o active).
 * Solo Administrador.
 * Respuesta incluye _mock_temp_password (solo en mock).
 * @param {string} token
 * @param {string} id UUID del usuario
 */
export async function resetearPassword(token, id) {
  const res = await fetch(`${BASE}/${id}/reset-password`, {
    method: 'POST',
    headers: headers(token),
  })
  return parseResponse(res)
}
