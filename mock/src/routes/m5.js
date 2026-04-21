/**
 * M5 — Consulta Interna Básica
 *
 * Rutas:
 *   GET /applications          (researcher)  — listado paginado con filtros
 *   GET /applications/stats    (superadmin)  — agregados sin detalle
 *
 * Acceso por rol:
 *   researcher  → GET /applications (detalle completo)
 *   superadmin  → GET /applications/stats (solo agregados)
 *   applicator  → 403 en ambos endpoints
 */
const express = require('express')
const { store } = require('../store')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

const RESEARCHER_ROLES = ['researcher']
const SUPERADMIN_ROLES = ['superadmin']

/**
 * Valida una fecha ISO 8601. Retorna true si es válida, false si no.
 */
function isValidDate(str) {
  if (!str) return false
  const d = new Date(str)
  return !isNaN(d.getTime())
}

/**
 * Construye el payload de métrica a partir del store.
 */
function buildMetricValues(applicationId) {
  return store.metricValues
    .filter((v) => v.application_id === applicationId)
    .map((v) => {
      const metric = store.metrics.find((m) => m.id === v.metric_id)
      return {
        metric_name: metric ? metric.name : '—',
        metric_type: metric ? metric.metric_type : '—',
        value: v.value,
      }
    })
}

// ─── GET /applications/stats ──────────────────────────────────────────────────
// Solo SUPERADMIN. Retorna agregados sin detalle de aplicaciones ni sujetos.
// HU21 — CA-HU21-01 a 04
router.get('/applications/stats', authMiddleware(SUPERADMIN_ROLES), (_req, res) => {
  const apps = store.applications

  const byInstrument = {}
  for (const app of apps) {
    const instrument = store.instruments.find((i) => i.id === app.instrument_id)
    const name = instrument ? instrument.name : '—'
    if (!byInstrument[app.instrument_id]) {
      byInstrument[app.instrument_id] = { instrument_id: app.instrument_id, instrument_name: name, count: 0 }
    }
    byInstrument[app.instrument_id].count++
  }

  const dates = apps
    .map((a) => a.application_date)
    .filter(Boolean)
    .sort()

  return res.status(200).json({
    status: 'success',
    message: 'Estadísticas del dataset',
    data: {
      total_applications: apps.length,
      total_subjects: store.subjects.length,
      by_instrument: Object.values(byInstrument),
      date_range: {
        earliest: dates.length ? dates[0] : null,
        latest: dates.length ? dates[dates.length - 1] : null,
      },
    },
  })
})

// ─── GET /applications ────────────────────────────────────────────────────────
// Solo RESEARCHER. Listado paginado con filtros opcionales.
// HU18 — CA-HU18-01 a 07
// HU19 — CA-HU19-01 a 04 (filtro instrument_id)
// HU20 — CA-HU20-01 a 06 (filtro start_date / end_date)
router.get('/applications', authMiddleware(RESEARCHER_ROLES), (req, res) => {
  const rawPage     = parseInt(req.query.page, 10)
  const rawPageSize = parseInt(req.query.page_size, 10)

  const page     = isNaN(rawPage)     || rawPage     < 1 ? 1  : rawPage
  const pageSize = isNaN(rawPageSize) || rawPageSize < 1 ? 20 : rawPageSize

  // RNF-M5-02 — page_size máximo: 100
  if (!isNaN(rawPageSize) && rawPageSize > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'page_size no puede superar 100',
      data: null,
    })
  }

  const instrumentId = (req.query.instrument_id || '').toString().trim()
  const startDate    = (req.query.start_date    || '').toString().trim()
  const endDate      = (req.query.end_date      || '').toString().trim()
  const projectId    = (req.query.project_id    || '').toString().trim()

  // Validar formato de fechas
  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({ status: 'error', message: 'Formato de start_date inválido. Use ISO 8601 (YYYY-MM-DD).', data: null })
  }
  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({ status: 'error', message: 'Formato de end_date inválido. Use ISO 8601 (YYYY-MM-DD).', data: null })
  }

  // start_date > end_date → 400
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({ status: 'error', message: 'start_date no puede ser posterior a end_date', data: null })
  }

  // Validar instrument_id si se provee
  if (instrumentId) {
    const instrumentExists = store.instruments.some((i) => i.id === instrumentId && !i.deleted)
    if (!instrumentExists) {
      return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null })
    }
  }

  // Validar project_id si se provee
  if (projectId) {
    const projectExists = store.projects.some((p) => p.id === projectId && !p.deleted)
    if (!projectExists) {
      return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null })
    }
  }

  let apps = [...store.applications]

  // Filtro por proyecto (via subjects)
  if (projectId) {
    const subjectsInProject = new Set(
      store.subjects.filter((s) => s.project_id === projectId).map((s) => s.id)
    )
    apps = apps.filter((a) => subjectsInProject.has(a.subject_id))
  }

  // Filtro por instrumento
  if (instrumentId) {
    apps = apps.filter((a) => a.instrument_id === instrumentId)
  }

  // Filtro por fechas (límite abierto si solo se provee uno)
  if (startDate) {
    apps = apps.filter((a) => a.application_date >= startDate)
  }
  if (endDate) {
    apps = apps.filter((a) => a.application_date <= endDate)
  }

  const total      = apps.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start      = (page - 1) * pageSize
  const paged      = apps.slice(start, start + pageSize)

  const data = paged.map((app) => {
    const instrument = store.instruments.find((i) => i.id === app.instrument_id)
    return {
      id:               app.id,
      subject_id:       app.subject_id,
      instrument_name:  instrument ? instrument.name : '—',
      application_date: app.application_date,
      metric_values:    buildMetricValues(app.id),
    }
  })

  return res.status(200).json({
    status: 'success',
    message: 'Aplicaciones recuperadas',
    data,
    meta: {
      page,
      page_size: pageSize,
      total_records: total,
      total_pages: totalPages,
    },
  })
})

module.exports = router
