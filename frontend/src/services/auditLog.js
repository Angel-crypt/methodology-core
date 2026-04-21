/**
 * services/auditLog.js
 * Audit log del sistema — solo superadmin.
 * Base path: /api/v1/audit-log
 */

import { parseResponse } from '@/lib/api'

function headers(token) {
  return { Authorization: `Bearer ${token}` }
}

/**
 * GET /audit-log
 * @param {string} token
 * @param {{ event?, user_id?, from?, to?, page?, limit? }} params
 */
export async function listarAuditLog(token, params = {}) {
  const q = new URLSearchParams()
  if (params.event)   q.set('event',   params.event)
  if (params.user_id) q.set('user_id', params.user_id)
  if (params.from)    q.set('from',    params.from)
  if (params.to)      q.set('to',      params.to)
  if (params.page)    q.set('page',    String(params.page))
  if (params.limit)   q.set('limit',   String(params.limit))
  const qs = q.toString()
  const res = await fetch(`/api/v1/audit-log${qs ? `?${qs}` : ''}`, { headers: headers(token) })
  return parseResponse(res)
}
