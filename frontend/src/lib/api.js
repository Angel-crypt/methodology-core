/**
 * lib/api.js — Utilidades compartidas para llamadas a la API REST.
 *
 * Contrato único de respuesta: { ok, data, meta, error, code }
 *   ok:    true en 2xx, false en cualquier error
 *   data:  body.data en éxito, undefined en error
 *   meta:  body.meta en éxito (paginación), undefined si no hay
 *   error: mensaje de error legible, undefined en éxito
 *   code:  código de error de negocio (body.data.code), undefined si no hay
 *
 * 401 despacha 'auth:session-revoked' o 'auth:session-expired' según el código.
 */

export async function parseResponse(res) {
  let body = null
  try { body = await res.json() } catch { /* respuesta sin JSON */ }

  if (res.status === 401) {
    const event = body?.data?.code === 'SESSION_REVOKED'
      ? 'auth:session-revoked'
      : 'auth:session-expired'
    window.dispatchEvent(new CustomEvent(event))
    return { ok: false, error: body?.message || 'No autorizado', code: body?.data?.code }
  }

  if (!res.ok) {
    return { ok: false, error: body?.message || `Error ${res.status}`, code: body?.data?.code }
  }

  return { ok: true, data: body?.data, meta: body?.meta }
}
