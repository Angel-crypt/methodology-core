/**
 * services/exportacion.js
 * Módulo 6 — Exportación Estructurada
 *
 * Base path: /api/v1/export
 * Solo accesible para researcher.
 */

function headers(token) {
  return { Authorization: `Bearer ${token}` }
}

function buildParams(params = {}) {
  const q = new URLSearchParams()
  if (params.instrument_id) q.set('instrument_id', params.instrument_id)
  if (params.start_date)    q.set('start_date',    params.start_date)
  if (params.end_date)      q.set('end_date',      params.end_date)
  return q.toString()
}

async function triggerDownload(res, fallbackExt) {
  if (!res.ok) {
    let body = null
    try { body = await res.json() } catch { /* sin JSON */ }
    return { ok: false, error: body?.message || `Error ${res.status}` }
  }

  // Extraer nombre de archivo del header Content-Disposition
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match ? match[1] : `dataset_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${fallbackExt}`

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return { ok: true }
}

/**
 * GET /export/csv
 * Descarga el dataset como archivo CSV.
 * @param {string} token
 * @param {{ instrument_id?, start_date?, end_date? }} params
 */
export async function exportarCSV(token, params = {}) {
  const qs  = buildParams(params)
  const res = await fetch(`/api/v1/export/csv${qs ? `?${qs}` : ''}`, { headers: headers(token) })
  return triggerDownload(res, 'csv')
}

/**
 * GET /export/json
 * Descarga el dataset como archivo JSON jerárquico.
 * @param {string} token
 * @param {{ instrument_id?, start_date?, end_date? }} params
 */
export async function exportarJSON(token, params = {}) {
  const qs  = buildParams(params)
  const res = await fetch(`/api/v1/export/json${qs ? `?${qs}` : ''}`, { headers: headers(token) })
  return triggerDownload(res, 'json')
}

/**
 * GET /export/pdf
 * Descarga reporte operativo en PDF. Solo superadmin.
 * Filtros opcionales: start_date, end_date (sin instrument_id — el reporte es siempre global).
 * @param {string} token
 * @param {{ start_date?, end_date? }} params
 */
export async function exportarPDF(token, params = {}) {
  const q = new URLSearchParams()
  if (params.start_date) q.set('start_date', params.start_date)
  if (params.end_date)   q.set('end_date',   params.end_date)
  const qs  = q.toString()
  const res = await fetch(`/api/v1/export/pdf${qs ? `?${qs}` : ''}`, { headers: headers(token) })
  return triggerDownload(res, 'pdf')
}
