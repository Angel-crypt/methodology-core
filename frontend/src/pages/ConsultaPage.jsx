import { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Database, Download } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, DatePicker, EmptyState, Spinner, Typography, ToastContainer, useToast } from '@/components/app'
import { listarAplicaciones, obtenerEstadisticas } from '@/services/consulta'
import { exportarPDF } from '@/services/exportacion'
import { listarInstrumentos } from '@/services/instruments'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${MESES[parseInt(m) - 1]} ${y}`
}

function fmtValor(value, metric_type) {
  if (value === null || value === undefined) return '—'
  if (metric_type === 'boolean') return value === true || value === 'true' ? 'Sí' : 'No'
  return String(value)
}

// ── Stats para SUPERADMIN ─────────────────────────────────────────────────────

function StatsPanel({ token }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [pdfFilters, setPdfFilters] = useState({ start_date: '', end_date: '' })
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    setLoading(true)
    obtenerEstadisticas(token).then((result) => {
      if (result.ok) {
        setStats(result.data)
      } else {
        setError(result.error || 'Error al cargar estadísticas')
      }
      setLoading(false)
    })
  }, [token])

  async function handlePDF() {
    setLoadingPDF(true)
    const params = {}
    if (pdfFilters.start_date) params.start_date = pdfFilters.start_date
    if (pdfFilters.end_date)   params.end_date   = pdfFilters.end_date
    const result = await exportarPDF(token, params)
    if (!result.ok) addToast({ type: 'error', message: result.error || 'Error al generar PDF' })
    else addToast({ type: 'success', message: 'Descarga del reporte iniciada' })
    setLoadingPDF(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}><Spinner /></div>
  if (error) return <Typography variant="body" style={{ color: 'var(--color-error)' }}>{error}</Typography>
  if (!stats) return null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard label="Total aplicaciones" value={stats.total_applications} />
        <StatCard label="Total sujetos" value={stats.total_subjects} />
        {stats.date_range.earliest && (
          <StatCard label="Primera aplicación" value={fmtFecha(stats.date_range.earliest)} />
        )}
        {stats.date_range.latest && (
          <StatCard label="Última aplicación" value={fmtFecha(stats.date_range.latest)} />
        )}
      </div>

      {stats.by_instrument.length > 0 && (
        <div>
          <Typography variant="h3" style={{ marginBottom: 'var(--space-3)' }}>
            Aplicaciones por instrumento
          </Typography>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-bg-subtle)',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <Typography variant="caption" style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Instrumento</Typography>
              <Typography variant="caption" style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Aplicaciones</Typography>
            </div>
            {stats.by_instrument.map((row) => (
              <div key={row.instrument_id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <Typography variant="body">{row.instrument_name}</Typography>
                <Typography variant="body" style={{ textAlign: 'right', fontWeight: 'var(--font-weight-medium)' }}>{row.count}</Typography>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.by_instrument.length === 0 && (
        <EmptyState
          icon={Database}
          title="Sin aplicaciones registradas"
          description="No hay datos en el dataset todavía."
        />
      )}

      {/* Reporte PDF */}
      <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <Typography variant="h3" style={{ marginBottom: 'var(--space-1)' }}>Reporte PDF</Typography>
        <Typography variant="caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--space-4)' }}>
          Generá un reporte operativo con estadísticas agregadas. Puedes filtrar por período.
        </Typography>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Desde (opcional)
            </label>
            <DatePicker
              value={pdfFilters.start_date}
              onChange={(iso) => setPdfFilters((p) => ({ ...p, start_date: iso || '' }))}
              placeholder="Fecha inicio"
              max={pdfFilters.end_date || undefined}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Hasta (opcional)
            </label>
            <DatePicker
              value={pdfFilters.end_date}
              onChange={(iso) => setPdfFilters((p) => ({ ...p, end_date: iso || '' }))}
              placeholder="Fecha fin"
              min={pdfFilters.start_date || undefined}
            />
          </div>
          <Button variant="primary" onClick={handlePDF} disabled={loadingPDF}>
            {loadingPDF ? <Spinner size="sm" /> : <Download size={16} />}
            {loadingPDF ? 'Generando…' : 'Descargar PDF'}
          </Button>
        </div>
      </div>
    </div>
  )
}

StatsPanel.propTypes = {
  token: PropTypes.string.isRequired,
}

function StatCard({ label, value }) {
  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      background: 'var(--color-bg-surface)',
    }}>
      <Typography variant="caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
        {label}
      </Typography>
      <Typography variant="h2">{value}</Typography>
    </div>
  )
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

// ── Tabla de aplicaciones para RESEARCHER ─────────────────────────────────────

const COL_TEMPLATE = '140px 1fr 1fr 90px'

function AplicacionRow({ app }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-2)' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: COL_TEMPLATE,
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-bg-surface)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
          {fmtFecha(app.application_date)}
        </span>
        <span style={{ fontSize: 'var(--font-size-small)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {app.instrument_name}
        </span>
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {app.subject_id}
        </span>
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
          {app.metric_values.length} métrica{app.metric_values.length !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && app.metric_values.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)', padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)', fontWeight: 'var(--font-weight-medium)' }}>
            <span>Métrica</span>
            <span>Valor</span>
            <span>Tipo</span>
          </div>
          {app.metric_values.map((mv, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--font-size-caption)', padding: 'var(--space-1) 0', borderTop: i === 0 ? '1px solid var(--color-border)' : 'none' }}>
              <span>{mv.metric_name}</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>{fmtValor(mv.value, mv.metric_type)}</span>
              <span style={{ color: 'var(--color-text-tertiary)' }}>{mv.metric_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

AplicacionRow.propTypes = {
  app: PropTypes.shape({
    id:               PropTypes.string.isRequired,
    application_date: PropTypes.string,
    instrument_name:  PropTypes.string,
    subject_id:       PropTypes.string,
    metric_values:    PropTypes.arrayOf(PropTypes.shape({
      metric_name: PropTypes.string,
      metric_type: PropTypes.string,
      value:       PropTypes.any,
    })),
  }).isRequired,
}

function TableHeader() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: COL_TEMPLATE,
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-4)',
      fontSize: 'var(--font-size-caption)',
      fontWeight: 'var(--font-weight-medium)',
      color: 'var(--color-text-secondary)',
      marginBottom: 'var(--space-2)',
    }}>
      <span>Fecha</span>
      <span>Instrumento</span>
      <span>Sujeto (UUID)</span>
      <span style={{ textAlign: 'right' }}>Métricas</span>
    </div>
  )
}

function AplicacionesTable({ token }) {
  const [apps, setApps] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [instruments, setInstruments] = useState([])

  const [filters, setFilters] = useState({
    instrument_id: '',
    start_date: '',
    end_date: '',
    page: 1,
    page_size: 20,
  })

  const { toasts, addToast, removeToast } = useToast()

  const fetchApps = useCallback(async (f) => {
    setLoading(true)
    setError(null)
    const params = {}
    if (f.page)          params.page          = f.page
    if (f.page_size)     params.page_size     = f.page_size
    if (f.instrument_id) params.instrument_id = f.instrument_id
    if (f.start_date)    params.start_date    = f.start_date
    if (f.end_date)      params.end_date      = f.end_date

    const result = await listarAplicaciones(token, params)
    if (result.ok) {
      setApps(result.data)
      setMeta(result.meta)
    } else {
      setError(result.error || 'Error al cargar aplicaciones')
      addToast({ type: 'error', message: result.error || 'Error al cargar aplicaciones' })
    }
    setLoading(false)
  }, [token, addToast])

  useEffect(() => {
    listarInstrumentos(token).then((r) => {
      if (r.ok) setInstruments(r.data || [])
    })
  }, [token])

  useEffect(() => {
    fetchApps(filters)
  }, [filters, fetchApps])

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  function handleClearFilters() {
    setFilters({ instrument_id: '', start_date: '', end_date: '', page: 1, page_size: 20 })
  }

  const hasFilters = filters.instrument_id || filters.start_date || filters.end_date

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--space-5)' }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
            Instrumento
          </label>
          <select
            value={filters.instrument_id}
            onChange={(e) => handleFilterChange('instrument_id', e.target.value)}
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
            onChange={(iso) => handleFilterChange('start_date', iso || '')}
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
            onChange={(iso) => handleFilterChange('end_date', iso || '')}
            placeholder="Fecha fin"
            min={filters.start_date || undefined}
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Tabla */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Spinner />
        </div>
      )}

      {!loading && error && (
        <Typography variant="body" style={{ color: 'var(--color-error)' }}>{error}</Typography>
      )}

      {!loading && !error && apps.length === 0 && (
        <EmptyState
          icon={Database}
          title="Sin resultados"
          description={hasFilters ? 'No hay aplicaciones con los filtros aplicados.' : 'No hay aplicaciones registradas en el sistema.'}
        />
      )}

      {!loading && !error && apps.length > 0 && (
        <>
          <TableHeader />
          {apps.map((app) => <AplicacionRow key={app.id} app={app} />)}
        </>
      )}

      {/* Paginación */}
      {meta && meta.total_pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <Typography variant="caption" style={{ color: 'var(--color-text-secondary)' }}>
            {meta.total_records} resultado{meta.total_records !== 1 ? 's' : ''} · Página {meta.page} de {meta.total_pages}
          </Typography>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="ghost"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={filters.page >= meta.total_pages}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

AplicacionesTable.propTypes = {
  token: PropTypes.string.isRequired,
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ConsultaPage() {
  const { token, role } = useAuth()

  return (
    <main style={{ padding: 'var(--space-6)', maxWidth: '1100px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography variant="h1">Consulta del Dataset</Typography>
        <Typography variant="body" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          {role === 'superadmin'
            ? 'Estadísticas agregadas del dataset de aplicaciones.'
            : 'Revisión del dataset de aplicaciones registradas.'}
        </Typography>
      </div>

      {role === 'researcher' && <AplicacionesTable token={token} />}
      {role === 'superadmin' && <StatsPanel token={token} />}
    </main>
  )
}
