/**
 * services/emailChangeRequests.js
 * Módulo — Solicitudes de cambio de correo (CF-009)
 *
 * No autoservicio: el usuario solicita vía POST /users/me/email-change-request,
 * el superadmin aprueba vía PATCH /users/:id/email o rechaza vía
 * DELETE /users/email-change-requests/:id.
 */

const BASE = '/api/v1/users'

async function parseResponse(res) {
  let body
  try {
    body = await res.json()
  } catch {
    return { status: 'error', message: `Error del servidor (HTTP ${res.status})` }
  }
  if (res.status === 401 && body?.data?.code === 'SESSION_REVOKED') {
    window.dispatchEvent(new Event('auth:session-revoked'))
  }
  return body
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * POST /users/me/email-change-request
 * Crea una solicitud de cambio de correo para el usuario autenticado.
 * @param {string} token
 * @param {{ new_email: string, reason?: string }} body
 */
export async function solicitarCambioCorreo(token, body) {
  const res = await fetch(`${BASE}/me/email-change-request`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

/**
 * GET /users/email-change-requests
 * Lista todas las solicitudes pendientes. Solo superadmin.
 * @param {string} token
 */
export async function listarSolicitudesCambioCorreo(token) {
  const res = await fetch(`${BASE}/email-change-requests`, {
    headers: authHeaders(token),
  })
  return parseResponse(res)
}

/**
 * PATCH /users/:id/email
 * Aprueba la solicitud aplicando el nuevo correo. Solo superadmin.
 * Invalida broker_subject y revoca todas las sesiones del usuario.
 * @param {string} token
 * @param {string} userId
 * @param {string} newEmail
 */
export async function aprobarCambioCorreo(token, userId, newEmail) {
  const res = await fetch(`${BASE}/${userId}/email`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ email: newEmail }),
  })
  return parseResponse(res)
}

/**
 * DELETE /users/email-change-requests/:id
 * Rechaza (elimina) una solicitud pendiente. Solo superadmin.
 * @param {string} token
 * @param {string} requestId
 */
export async function rechazarSolicitudCambioCorreo(token, requestId) {
  const res = await fetch(`${BASE}/email-change-requests/${requestId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (res.status === 204) return { status: 'success', data: null }
  return parseResponse(res)
}
