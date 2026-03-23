/**
 * services/users.js
 * Módulo — Gestión de Usuarios
 *
 * Encapsula todas las llamadas a la API REST del módulo.
 * Base path: /api/v1/users
 * Todas las peticiones requieren Authorization: Bearer {token}
 */

const BASE = '/api/v1/users'

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
  return res.json()
}

/**
 * RF-M1-01 — POST /users
 * Solo Administrador. El role viene fijo desde la página que lo llama.
 * @param {string} token
 * @param {{ full_name: string, email: string, password: string, role: string }} body
 */
export async function crearUsuario(token, body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return res.json()
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
  return res.json()
}
