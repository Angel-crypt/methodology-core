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
 * Lista usuarios filtrados por rol y estado. Solo Administrador.
 * @param {string} token
 * @param {'applicator'|'researcher'|'superadmin'} role
 * @param {'true'|'false'|''} activeFilter — '' para todos
 */
export async function listarUsuarios(token, role, activeFilter = '') {
  const params = new URLSearchParams({ role })
  if (activeFilter !== '') params.set('active', activeFilter)
  const res = await fetch(`${BASE}?${params}`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * Crea un usuario. Solo Administrador.
 * El servidor genera el setup token internamente; la respuesta incluye
 * _mock_setup_token solo en el mock (en producción se envía por email).
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
 * Activa o desactiva una cuenta de usuario. Solo Administrador.
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
 * GET /users — sin filtro de rol, devuelve todos los usuarios.
 * Usado por la búsqueda global (todos los roles).
 * Solo Administrador.
 * @param {string} token
 */
export async function listarTodosUsuarios(token) {
  const res = await fetch(`${BASE}?limit=50`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * GET /users/sessions
 * Lista todas las sesiones activas de todos los usuarios.
 * Solo Administrador. Usado para indicador de sesión en tablas de usuarios.
 * @param {string} token
 */
export async function listarTodasLasSesiones(token) {
  const res = await fetch(`${BASE}/sessions`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * GET /users/:id/sessions
 * Lista las sesiones activas de un usuario.
 * Solo Administrador.
 * @param {string} token
 * @param {string} id UUID del usuario
 */
export async function listarSesionesUsuario(token, id) {
  const res = await fetch(`${BASE}/${id}/sessions`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * GET /users/:id
 * Devuelve los datos completos de un usuario (sin password_hash).
 * Solo Administrador.
 * @param {string} token
 * @param {string} id UUID del usuario
 */
export async function obtenerUsuario(token, id) {
  const res = await fetch(`${BASE}/${id}`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * Restablece la contraseña de un usuario (genera un nuevo setup link).
 * Solo Administrador. El usuario queda en estado must_change_password=true.
 * @param {string} token
 * @param {string} id UUID del usuario
 */
export async function resetearPassword(token, id) {
  const res = await fetch(`${BASE}/${id}/magic-link`, {
    method: 'POST',
    headers: headers(token),
  })
  return parseResponse(res)
}

/**
 * GET /users/:id/permissions
 * Obtiene los permisos de Registro Operativo de un aplicador.
 * Solo Administrador.
 * @param {string} token
 * @param {string} id UUID del usuario
 */
export async function obtenerPermisos(token, id) {
  const res = await fetch(`${BASE}/${id}/permissions`, { headers: headers(token) })
  return parseResponse(res)
}

/**
 * PUT /users/:id/permissions
 * Actualiza los permisos de Registro Operativo de un aplicador (patch parcial).
 * Solo Administrador.
 * @param {string} token
 * @param {string} id UUID del usuario
 * @param {{ mode?: string, education_levels?: string[], subject_limit?: number|null }} body
 */
export async function guardarPermisos(token, id, body) {
  const res = await fetch(`${BASE}/${id}/permissions`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}
