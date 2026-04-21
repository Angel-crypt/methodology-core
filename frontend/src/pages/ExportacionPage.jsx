import { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Download, Database } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, DatePicker, EmptyState, Spinner, Typography, ToastContainer, useToast } from '@/components/app'
import { exportarCSV, exportarJSON } from '@/services/exportacion'
import { listarInstrumentos } from '@/services/instruments'
import { listarAplicaciones } from '@/services/consulta'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${MESES[parseInt(m) - 1]} ${y}`
}

// ── Vista previa del dataset ──────────────────────────────────────────────────

const COL_TEMPLATE = '120px 1fr 130px 70px'

function PreviewTable({ apps, total, loading, lang }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <Spinner />
      </div>
    )
  }

  if (!apps.length) {
    return (
      <EmptyState
        icon={Database}
        title="Sin registros"
        description="No hay aplicaciones con los filtros seleccionados."
      />
    )
  }

  const labels = lang === 'es'
    ? { date: 'fecha_aplicacion', instrument: 'instrumento', subject: 'id_sujeto', metrics: 'métricas' }
    : { date: 'application_date', instrument: 'instrument_name', subject: 'subject_id', metrics: 'metrics' }

  return (
    <div>
      {/* Header */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: COL_TEMPLATE,
        gap:                 'var(--space-2)',
        padding:             'var(--space-2) var(--space-3)',
        background:          'var(--color-bg-subtle)',
        borderRadius:        'var(--radius-sm) var(--radius-sm) 0 0',
        border:              '1px solid var(--color-border)',
        borderBottom:        'none',
        fontSize:            'var(--font-size-caption)',
        fontWeight:          'var(--font-weight-medium)',
        color:               'var(--color-text-secondary)',
        fontFamily:          'monospace',
      }}>
        <span>{labels.date}</span>
        <span>{labels.instrument}</span>
        <span>{labels.subject}</span>
        <span style={{ textAlign: 'right' }}>{labels.metrics}</span>
      </div>

      {/* Rows */}
      {apps.map((app, i) => (
        <div key={app.id} style={{
          display:             'grid',
          gridTemplateColumns: COL_TEMPLATE,
          gap:                 'var(--space-2)',
          padding:             'var(--space-2) var(--space-3)',
          border:              '1px solid var(--color-border)',
          borderTop:           i === 0 ? '1px solid var(--color-border)' : 'none',
          background:          'var(--color-bg-surface)',
          fontSize:            'var(--font-size-caption)',
        }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{fmtFecha(app.application_date)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.instrument_name || '—'}</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {app.subject_id ? `${app.subject_id.slice(0, 8)}…` : '—'}
          </span>
          <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
            {app.metric_values?.length ?? 0}
          </span>
        </div>
      ))}

      {/* Footer */}
      <div style={{
        padding:      'var(--space-2) var(--space-3)',
        border:       '1px solid var(--color-border)',
        borderTop:    'none',
        borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
        background:   'var(--color-bg-subtle)',
      }}>
        <Typography variant="caption" style={{ color: 'var(--color-text-tertiary)' }}>
          {apps.length < total
            ? `Mostrando ${apps.length} de ${total} registros`
            : `${total} registro${total !== 1 ? 's' : ''} en total`}
        </Typography>
      </div>
    </div>
  )
}

PreviewTable.propTypes = {
  apps:    PropTypes.array.isRequired,
  total:   PropTypes.number.isRequired,
  loading: PropTypes.bool.isRequired,
  lang:    PropTypes.oneOf(['es', 'en']).isRequired,
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ExportacionPage() {
  const { token } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  const [instruments, setInstruments] = useState([])
  const [filters, setFilters] = useState({ instrument_id: '', start_date: '', end_date: '' })
  const [lang, setLang] = useState('es')

  const [loadingCSV,  setLoadingCSV]  = useState(false)
  const [loadingJSON, setLoadingJSON] = useState(false)

  const [preview, setPreview]         = useState([])
  const [previewTotal, setPreviewTotal] = useState(0)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    listarInstrumentos(token).then((r) => {
      if (r.ok) setInstruments(r.data || [])
    })
  }, [token])

  const fetchPreview = useCallback(async (f) => {
    setLoadingPreview(true)
    const params = { page: 1, page_size: 5 }
    if (f.instrument_id) params.instrument_id = f.instrument_id
    if (f.start_date)    params.start_date    = f.start_date
    if (f.end_date)      params.end_date      = f.end_date
    const result = await listarAplicaciones(token, params)
    if (result.ok) {
      setPreview(result.data || [])
      setPreviewTotal(result.meta?.total_records ?? 0)
    }
    setLoadingPreview(false)
  }, [token])

  useEffect(() => { fetchPreview(filters) }, [filters, fetchPreview])

  function handleFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({ instrument_id: '', start_date: '', end_date: '' })
  }

  function activeParams() {
    const p = { lang }
    if (filters.instrument_id) p.instrument_id = filters.instrument_id
    if (filters.start_date)    p.start_date    = filters.start_date
    if (filters.end_date)      p.end_date      = filters.end_date
    return p
  }

  async function handleCSV() {
    setLoadingCSV(true)
    try {
      const result = await exportarCSV(token, activeParams())
      if (!result.ok) addToast({ type: 'error', message: result.error || 'Error al exportar CSV' })
      else addToast({ type: 'success', message: 'Descarga CSV iniciada' })
    } finally {
      setLoadingCSV(false)
    }
  }

  async function handleJSON() {
    setLoadingJSON(true)
    try {
      const result = await exportarJSON(token, activeParams())
      if (!result.ok) addToast({ type: 'error', message: result.error || 'Error al exportar JSON' })
      else addToast({ type: 'success', message: 'Descarga JSON iniciada' })
    } finally {
      setLoadingJSON(false)
    }
  }

  const hasFilters = filters.instrument_id || filters.start_date || filters.end_date

  const langBtnBase = {
    padding:      'var(--space-1) var(--space-3)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor:       'pointer',
    fontSize:     'var(--font-size-caption)',
    fontWeight:   'var(--font-weight-medium)',
    transition:   'background 0.15s',
  }

  return (
    <main style={{ padding: 'var(--space-6)', maxWidth: '900px' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography variant="h1">Exportación del Dataset</Typography>
        <Typography variant="body" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Descargá el dataset de aplicaciones en CSV o JSON. Aplicá filtros y revisá la vista previa antes de exportar.
        </Typography>
      </div>

      {/* Filtros */}
      <section style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
        <Typography variant="h3" style={{ marginBottom: 'var(--space-4)' }}>Filtros (opcionales)</Typography>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Instrumento
            </label>
            <select
              value={filters.instrument_id}
              onChange={(e) => handleFilter('instrument_id', e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-small)',
              }}
            >
              <option value="">Todos los instrumentos</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Desde
            </label>
            <DatePicker
              value={filters.start_date}
              onChange={(iso) => handleFilter('start_date', iso || '')}
              placeholder="Fecha inicio"
              max={filters.end_date || undefined}
            />
          </div>

          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Hasta
            </label>
            <DatePicker
              value={filters.end_date}
              onChange={(iso) => handleFilter('end_date', iso || '')}
              placeholder="Fecha fin"
              min={filters.start_date || undefined}
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          )}
        </div>
      </section>

      {/* Vista previa */}
      <section style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <Typography variant="h3">Vista previa</Typography>
          <Typography variant="caption" style={{ color: 'var(--color-text-tertiary)' }}>
            Primeras 5 filas
          </Typography>
        </div>
        <PreviewTable
          apps={preview}
          total={previewTotal}
          loading={loadingPreview}
          lang={lang}
        />
      </section>

      {/* Idioma de columnas */}
      <section style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Typography variant="caption" style={{ color: 'var(--color-text-secondary)' }}>
          Columnas en:
        </Typography>
        <button
          type="button"
          style={{
            ...langBtnBase,
            background: lang === 'es' ? 'var(--color-primary)' : 'transparent',
            color:      lang === 'es' ? '#fff' : 'var(--color-text-secondary)',
            borderColor:lang === 'es' ? 'var(--color-primary)' : 'var(--color-border)',
          }}
          onClick={() => setLang('es')}
        >
          Español
        </button>
        <button
          type="button"
          style={{
            ...langBtnBase,
            background: lang === 'en' ? 'var(--color-primary)' : 'transparent',
            color:      lang === 'en' ? '#fff' : 'var(--color-text-secondary)',
            borderColor:lang === 'en' ? 'var(--color-primary)' : 'var(--color-border)',
          }}
          onClick={() => setLang('en')}
        >
          English
        </button>
      </section>

      {/* Botones de descarga */}
      <section style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
          <Typography variant="h3" style={{ marginBottom: 'var(--space-2)' }}>CSV</Typography>
          <Typography variant="caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--space-4)' }}>
            Tabla plana. Una fila por aplicación, una columna por métrica. Compatible con Excel y herramientas de análisis.
          </Typography>
          <Button
            variant="primary"
            onClick={handleCSV}
            disabled={loadingCSV || loadingJSON}
            style={{ width: '100%' }}
          >
            {loadingCSV ? <Spinner size="sm" /> : <Download size={16} />}
            {loadingCSV ? 'Generando…' : 'Descargar CSV'}
          </Button>
        </div>

        <div style={{ flex: '1 1 240px', padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
          <Typography variant="h3" style={{ marginBottom: 'var(--space-2)' }}>JSON</Typography>
          <Typography variant="caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--space-4)' }}>
            Jerarquía metodológica completa. Agrupado por instrumento. Insumo directo para fases de IA.
          </Typography>
          <Button
            variant="primary"
            onClick={handleJSON}
            disabled={loadingCSV || loadingJSON}
            style={{ width: '100%' }}
          >
            {loadingJSON ? <Spinner size="sm" /> : <Download size={16} />}
            {loadingJSON ? 'Generando…' : 'Descargar JSON'}
          </Button>
        </div>
      </section>
    </main>
  )
}
