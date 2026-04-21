/**
 * M6 — Exportación Estructurada
 *
 * Rutas:
 *   GET /export/csv   (researcher)  — dataset completo o filtrado en CSV
 *   GET /export/json  (researcher)  — dataset completo o filtrado en JSON jerárquico
 *   GET /export/pdf   (superadmin)  — reporte agregado en PDF (sin detalle de sujetos)
 *
 * Acceso por rol:
 *   researcher  → /export/csv y /export/json
 *   superadmin  → /export/pdf (solo agregados)
 *   applicator  → 403
 *
 * Filtros opcionales: instrument_id, start_date, end_date
 * Archivos generados en memoria (sin escritura en disco).
 */
const express = require('express')
const PDFDocument = require('pdfkit')
const { store } = require('../store')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

const RESEARCHER_ROLES = ['researcher']
const SUPERADMIN_ROLES = ['superadmin']

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidDate(str) {
  if (!str) return false
  const d = new Date(str)
  return !isNaN(d.getTime())
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function escapeCSV(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Valida y aplica los filtros comunes a ambos endpoints.
 * Retorna { error, apps, instrumentId, startDate, endDate } o { error } si hay problema.
 */
function applyFilters(query) {
  const instrumentId = (query.instrument_id || '').toString().trim()
  const startDate    = (query.start_date    || '').toString().trim()
  const endDate      = (query.end_date      || '').toString().trim()

  if (startDate && !isValidDate(startDate)) {
    return { error: { status: 400, message: 'Formato de start_date inválido. Use ISO 8601 (YYYY-MM-DD).' } }
  }
  if (endDate && !isValidDate(endDate)) {
    return { error: { status: 400, message: 'Formato de end_date inválido. Use ISO 8601 (YYYY-MM-DD).' } }
  }
  if (startDate && endDate && startDate > endDate) {
    return { error: { status: 400, message: 'start_date no puede ser posterior a end_date.' } }
  }
  if (instrumentId) {
    const exists = store.instruments.some((i) => i.id === instrumentId && !i.deleted)
    if (!exists) {
      return { error: { status: 404, message: 'Instrumento no encontrado.' } }
    }
  }

  let apps = [...store.applications]
  if (instrumentId) apps = apps.filter((a) => a.instrument_id === instrumentId)
  if (startDate)    apps = apps.filter((a) => a.application_date >= startDate)
  if (endDate)      apps = apps.filter((a) => a.application_date <= endDate)

  return { apps, instrumentId, startDate, endDate }
}

/**
 * Construye la lista de columnas de métricas dinámicas para el CSV.
 * Orden: por instrumento (nombre asc), luego por nombre de métrica (asc).
 * Retorna [{ key: 'inst_id::metric_name', label: 'metric_name', instrumentId, metricId }]
 */
function buildMetricColumns(apps) {
  const instrMap = {}
  for (const app of apps) {
    if (!instrMap[app.instrument_id]) {
      const instr = store.instruments.find((i) => i.id === app.instrument_id)
      instrMap[app.instrument_id] = instr ? instr.name : '—'
    }
  }

  const instrIds = Object.keys(instrMap).sort((a, b) =>
    instrMap[a].localeCompare(instrMap[b])
  )

  const cols = []
  for (const instrId of instrIds) {
    const metrics = store.metrics
      .filter((m) => m.instrument_id === instrId)
      .sort((a, b) => a.name.localeCompare(b.name))
    for (const m of metrics) {
      cols.push({ key: `${instrId}::${m.name}`, label: m.name, instrumentId: instrId, metricId: m.id })
    }
  }
  return cols
}

// ── Traducción de cabeceras CSV ───────────────────────────────────────────────

const FIXED_HEADERS_EN = [
  'application_id', 'subject_id', 'instrument_name', 'application_date',
  'school_type', 'education_level', 'age_cohort', 'gender', 'socioeconomic_level',
]

const FIXED_HEADERS_ES = [
  'id_aplicacion', 'id_sujeto', 'instrumento', 'fecha_aplicacion',
  'tipo_escuela', 'nivel_educativo', 'cohorte_edad', 'genero', 'nivel_socioeconomico',
]

// ── GET /export/csv ───────────────────────────────────────────────────────────
// RF-M6-01 — HU21
router.get('/export/csv', authMiddleware(RESEARCHER_ROLES), (req, res) => {
  const result = applyFilters(req.query)
  if (result.error) {
    return res.status(result.error.status).json({ status: 'error', message: result.error.message, data: null })
  }

  const { apps, instrumentId, startDate, endDate } = result
  const metricCols = buildMetricColumns(apps)

  const lang = (req.query.lang || 'en').toString().toLowerCase()
  const FIXED_HEADERS = lang === 'es' ? FIXED_HEADERS_ES : FIXED_HEADERS_EN

  const allHeaders = [...FIXED_HEADERS, ...metricCols.map((c) => c.label)]
  const rows = [allHeaders.map(escapeCSV).join(',')]

  for (const app of apps) {
    const instrument = store.instruments.find((i) => i.id === app.instrument_id)
    const subject    = store.subjects.find((s) => s.id === app.subject_id)
    const ctx        = subject?.context || {}

    const fixedValues = [
      app.id,
      app.subject_id,
      instrument ? instrument.name : '—',
      app.application_date || '',
      ctx.school_type          || '',
      ctx.education_level      || '',
      ctx.age_cohort           || '',
      ctx.gender               || '',
      ctx.socioeconomic_level  || '',
    ]

    const metricValueMap = {}
    for (const mv of store.metricValues.filter((v) => v.application_id === app.id)) {
      const metric = store.metrics.find((m) => m.id === mv.metric_id)
      if (metric) {
        metricValueMap[`${metric.instrument_id}::${metric.name}`] = mv.value
      }
    }

    const dynamicValues = metricCols.map((col) => {
      const val = metricValueMap[col.key]
      return val !== undefined ? val : ''
    })

    rows.push([...fixedValues, ...dynamicValues].map(escapeCSV).join(','))
  }

  const csv = rows.join('\r\n')
  const filename = `dataset_${todayStr()}.csv`

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('X-Filters-Applied', JSON.stringify({ instrument_id: instrumentId || null, start_date: startDate || null, end_date: endDate || null }))
  return res.status(200).send(csv)
})

// ── GET /export/json ──────────────────────────────────────────────────────────
// RF-M6-02 — HU22
router.get('/export/json', authMiddleware(RESEARCHER_ROLES), (req, res) => {
  const result = applyFilters(req.query)
  if (result.error) {
    return res.status(result.error.status).json({ status: 'error', message: result.error.message, data: null })
  }

  const { apps, instrumentId, startDate, endDate } = result

  // Agrupar por instrumento
  const instrMap = {}
  for (const app of apps) {
    if (!instrMap[app.instrument_id]) {
      const instr = store.instruments.find((i) => i.id === app.instrument_id)
      instrMap[app.instrument_id] = {
        instrument_id:              app.instrument_id,
        instrument_name:            instr ? instr.name : '—',
        methodological_description: instr ? (instr.methodological_description || null) : null,
        applications:               [],
      }
    }

    const subject = store.subjects.find((s) => s.id === app.subject_id)
    const ctx     = subject?.context || null

    const metric_values = store.metricValues
      .filter((v) => v.application_id === app.id)
      .map((v) => {
        const metric = store.metrics.find((m) => m.id === v.metric_id)
        return {
          metric_name: metric ? metric.name : '—',
          metric_type: metric ? metric.metric_type : '—',
          value:       v.value,
        }
      })

    instrMap[app.instrument_id].applications.push({
      application_id:   app.id,
      subject_id:       app.subject_id,
      application_date: app.application_date,
      context: ctx
        ? {
            school_type:          ctx.school_type          || null,
            education_level:      ctx.education_level      || null,
            age_cohort:           ctx.age_cohort           || null,
            gender:               ctx.gender               || null,
            socioeconomic_level:  ctx.socioeconomic_level  || null,
            additional_attributes: ctx.additional_attributes || {},
          }
        : null,
      metric_values,
    })
  }

  const payload = {
    exported_at:        new Date().toISOString(),
    total_applications: apps.length,
    filters_applied: {
      instrument_id: instrumentId || null,
      start_date:    startDate    || null,
      end_date:      endDate      || null,
    },
    instruments: Object.values(instrMap),
  }

  const filename = `dataset_${todayStr()}.json`
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.status(200).json(payload)
})

// ── GET /export/pdf ───────────────────────────────────────────────────────────
// Solo SUPERADMIN. Reporte agregado en PDF — sin detalle de sujetos ni aplicaciones.
// Filtros opcionales: start_date, end_date (sin instrument_id — el reporte siempre es global por instrumento).
router.get('/export/pdf', authMiddleware(SUPERADMIN_ROLES), (req, res) => {
  const startDate = (req.query.start_date || '').toString().trim()
  const endDate   = (req.query.end_date   || '').toString().trim()

  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({ status: 'error', message: 'Formato de start_date inválido. Use ISO 8601 (YYYY-MM-DD).', data: null })
  }
  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({ status: 'error', message: 'Formato de end_date inválido. Use ISO 8601 (YYYY-MM-DD).', data: null })
  }
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({ status: 'error', message: 'start_date no puede ser posterior a end_date.', data: null })
  }

  let apps = [...store.applications]
  if (startDate) apps = apps.filter((a) => a.application_date >= startDate)
  if (endDate)   apps = apps.filter((a) => a.application_date <= endDate)

  // Estadísticas agregadas
  const byInstrument = {}
  for (const app of apps) {
    const instr = store.instruments.find((i) => i.id === app.instrument_id)
    const name  = instr ? instr.name : '—'
    if (!byInstrument[app.instrument_id]) {
      byInstrument[app.instrument_id] = { name, count: 0 }
    }
    byInstrument[app.instrument_id].count++
  }
  const instrRows = Object.values(byInstrument).sort((a, b) => b.count - a.count)

  const dates    = apps.map((a) => a.application_date).filter(Boolean).sort()
  const earliest = dates.length ? dates[0]               : null
  const latest   = dates.length ? dates[dates.length - 1] : null

  const generatedAt = new Date()
  const filename    = `reporte_${todayStr()}.pdf`

  // ── Construcción del PDF en memoria ─────────────────────────────────────────
  const doc    = new PDFDocument({ margin: 50, size: 'A4' })
  const chunks = []

  doc.on('data', (chunk) => chunks.push(chunk))
  doc.on('end', () => {
    const pdf = Buffer.concat(chunks)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', pdf.length)
    res.status(200).end(pdf)
  })

  // ── Colores y constantes de estilo ───────────────────────────────────────────
  const COLOR_PRIMARY   = '#1a56db'
  const COLOR_TEXT      = '#1a1a2e'
  const COLOR_SECONDARY = '#6b7280'
  const COLOR_BORDER    = '#e5e7eb'
  const COLOR_ROW_ALT   = '#f9fafb'
  const PAGE_WIDTH      = doc.page.width - 100   // margen 50 cada lado

  // ── Encabezado ───────────────────────────────────────────────────────────────
  doc
    .rect(0, 0, doc.page.width, 80)
    .fill(COLOR_PRIMARY)

  doc
    .fillColor('#ffffff')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('Sistema de Perfiles Lingüísticos', 50, 22)
    .fontSize(11)
    .font('Helvetica')
    .text('Reporte Operativo del Dataset', 50, 46)

  doc.y = 100

  // ── Metadatos del reporte ────────────────────────────────────────────────────
  doc
    .fillColor(COLOR_SECONDARY)
    .fontSize(9)
    .font('Helvetica')
    .text(`Generado: ${generatedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`, 50, doc.y)

  if (startDate || endDate) {
    const rangeText = startDate && endDate
      ? `Período filtrado: ${startDate} — ${endDate}`
      : startDate
        ? `Desde: ${startDate}`
        : `Hasta: ${endDate}`
    doc.text(rangeText, 50, doc.y + 14)
    doc.moveDown(0.5)
  } else {
    doc.text('Período: completo (sin filtros)', 50, doc.y + 14)
    doc.moveDown(0.5)
  }

  doc.moveDown(1)

  // ── Separador ────────────────────────────────────────────────────────────────
  doc.moveTo(50, doc.y).lineTo(50 + PAGE_WIDTH, doc.y).strokeColor(COLOR_BORDER).lineWidth(1).stroke()
  doc.moveDown(1)

  // ── Sección: Resumen ─────────────────────────────────────────────────────────
  doc
    .fillColor(COLOR_TEXT)
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('Resumen del Dataset', 50, doc.y)

  doc.moveDown(0.6)

  const summaryItems = [
    ['Total de aplicaciones', String(apps.length)],
    ['Total de sujetos registrados', String(store.subjects.length)],
    ['Instrumentos activos', String(store.instruments.filter((i) => i.is_active && !i.deleted).length)],
    ['Primera aplicación', earliest || '—'],
    ['Última aplicación',  latest   || '—'],
  ]

  const COL1_X = 50
  const COL2_X = 280
  const ROW_H  = 22

  for (let i = 0; i < summaryItems.length; i++) {
    const rowY = doc.y
    if (i % 2 === 0) {
      doc.rect(COL1_X, rowY - 4, PAGE_WIDTH, ROW_H).fill(COLOR_ROW_ALT)
    }
    doc.fillColor(COLOR_SECONDARY).fontSize(10).font('Helvetica').text(summaryItems[i][0], COL1_X + 8, rowY)
    doc.fillColor(COLOR_TEXT).fontSize(10).font('Helvetica-Bold').text(summaryItems[i][1], COL2_X, rowY)
    doc.moveDown(0.55)
  }

  doc.moveDown(1.2)

  // ── Sección: Aplicaciones por instrumento ────────────────────────────────────
  doc
    .fillColor(COLOR_TEXT)
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('Aplicaciones por Instrumento', 50, doc.y)

  doc.moveDown(0.6)

  if (instrRows.length === 0) {
    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(10)
      .font('Helvetica')
      .text('Sin aplicaciones registradas en el período seleccionado.', 50, doc.y)
  } else {
    // Encabezado de tabla
    const HEAD_Y = doc.y
    doc.rect(COL1_X, HEAD_Y - 4, PAGE_WIDTH, ROW_H).fill(COLOR_PRIMARY)
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
    doc.text('Instrumento',   COL1_X + 8,  HEAD_Y)
    doc.text('Aplicaciones',  COL2_X,      HEAD_Y)
    doc.text('%',             COL2_X + 90, HEAD_Y)
    doc.moveDown(0.55)

    const total = apps.length || 1
    for (let i = 0; i < instrRows.length; i++) {
      const rowY = doc.y
      if (i % 2 === 0) {
        doc.rect(COL1_X, rowY - 4, PAGE_WIDTH, ROW_H).fill(COLOR_ROW_ALT)
      }
      const pct = ((instrRows[i].count / total) * 100).toFixed(1)
      doc.fillColor(COLOR_TEXT).fontSize(10).font('Helvetica')
      doc.text(instrRows[i].name,           COL1_X + 8,  rowY)
      doc.text(String(instrRows[i].count),  COL2_X,      rowY)
      doc.text(`${pct}%`,                   COL2_X + 90, rowY)
      doc.moveDown(0.55)
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const FOOTER_Y = doc.page.height - 40
  doc
    .moveTo(50, FOOTER_Y - 10)
    .lineTo(50 + PAGE_WIDTH, FOOTER_Y - 10)
    .strokeColor(COLOR_BORDER)
    .lineWidth(0.5)
    .stroke()

  doc
    .fillColor(COLOR_SECONDARY)
    .fontSize(8)
    .font('Helvetica')
    .text(
      `Sistema de Perfiles Lingüísticos — Reporte confidencial generado el ${generatedAt.toISOString()}`,
      50,
      FOOTER_Y,
      { align: 'center', width: PAGE_WIDTH }
    )

  doc.end()
})

module.exports = router
