/**
 * Servicio de gestión de proyectos (CF-013)
 * Todas las funciones devuelven { ok, data, meta, error, code }
 */

import { parseResponse } from '@/lib/api'

const API = '/api/v1'

function headers(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// ── Proyectos ─────────────────────────────────────────────────────────────────

export async function listarProyectos(token) {
  const res = await fetch(`${API}/projects`, { headers: headers(token) })
  return parseResponse(res)
}

export async function listarProyectosMiembro(token, userId) {
  const params = new URLSearchParams({ member_id: userId })
  const res = await fetch(`${API}/projects?${params}`, { headers: headers(token) })
  return parseResponse(res)
}

export async function crearProyecto(token, body) {
  const res = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

export async function obtenerProyecto(token, id) {
  const res = await fetch(`${API}/projects/${id}`, { headers: headers(token) })
  return parseResponse(res)
}

export async function actualizarProyecto(token, id, body) {
  const res = await fetch(`${API}/projects/${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

export async function eliminarProyecto(token, id) {
  const res = await fetch(`${API}/projects/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (res.status === 204) return { ok: true }
  return parseResponse(res)
}

// ── Defaults del sistema ──────────────────────────────────────────────────────

export async function obtenerSystemDefaults(token) {
  const res = await fetch(`${API}/config/system-defaults`, { headers: headers(token) })
  return parseResponse(res)
}

// ── Miembros ──────────────────────────────────────────────────────────────────

export async function listarMiembros(token, projectId, role) {
  const params = role ? `?role=${role}` : ''
  const res = await fetch(`${API}/projects/${projectId}/members${params}`, { headers: headers(token) })
  return parseResponse(res)
}

export async function agregarMiembro(token, projectId, body) {
  const res = await fetch(`${API}/projects/${projectId}/members`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

export async function eliminarMiembro(token, projectId, userId) {
  const res = await fetch(`${API}/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (res.status === 204) return { ok: true }
  return parseResponse(res)
}

// ── Instrumentos por proyecto ─────────────────────────────────────────────────

export async function listarInstrumentosProyecto(token, projectId) {
  const res = await fetch(`${API}/projects/${projectId}/instruments`, { headers: headers(token) })
  return parseResponse(res)
}

export async function asignarInstrumento(token, projectId, body) {
  const res = await fetch(`${API}/projects/${projectId}/instruments`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}

export async function quitarInstrumento(token, projectId, instrumentId) {
  const res = await fetch(`${API}/projects/${projectId}/instruments/${instrumentId}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (res.status === 204) return { ok: true }
  return parseResponse(res)
}

// ── Config operativa por proyecto ─────────────────────────────────────────────

export async function obtenerConfigProyecto(token, projectId) {
  const res = await fetch(`${API}/projects/${projectId}/config/operativo`, { headers: headers(token) })
  return parseResponse(res)
}

export async function guardarConfigProyecto(token, projectId, body) {
  const res = await fetch(`${API}/projects/${projectId}/config/operativo`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  return parseResponse(res)
}
