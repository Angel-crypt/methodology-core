import { parseResponse } from '@/lib/api'

const API = '/api/v1'

function headers(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function listarMisSujetos(token) {
  const res = await fetch(`${API}/subjects/mine`, { headers: headers(token) })
  return parseResponse(res)
}

export async function listarAplicacionesSujeto(token, subjectId) {
  const res = await fetch(`${API}/subjects/${subjectId}/applications`, { headers: headers(token) })
  return parseResponse(res)
}


