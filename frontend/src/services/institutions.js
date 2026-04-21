import { parseResponse } from '@/lib/api'

const API = '/api/v1/institutions'

function headers(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export async function listarInstituciones(token) {
  const res = await fetch(API, { headers: headers(token) })
  return parseResponse(res)
}

export async function crearInstitucion(token, payload) {
  const res = await fetch(API, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  })
  return parseResponse(res)
}

export async function editarInstitucion(token, id, payload) {
  const res = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(payload),
  })
  return parseResponse(res)
}

export async function resolverInstitucionPorDominio(email) {
  const params = new URLSearchParams({ email })
  const res = await fetch(`${API}/resolve?${params}`)
  return parseResponse(res)
}
