import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { Button, EmptyState, Spinner, Typography, ToastContainer, useToast } from '@/components/app'
import { listarMisRegistros } from '@/services/registro'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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

const TIPO_LABELS = {
  numeric:    'Numérico',
  categorical:'Categórico',
  boolean:    'Booleano',
  short_text: 'Texto corto',
}

// Columnas: Fecha | Instrumento | Sujeto UUID | Métricas | Chevron
const COL_TEMPLATE = '130px 2fr 1fr 90px 24px'

function RegistroRow({ registro }) {
  const [expanded, setExpanded] = useState(false)
  const uuidAbrev = `${registro.subject_id.slice(0, 8)}…`

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: COL_TEMPLATE,
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-bg-surface)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Fecha */}
        <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
          {fmtFecha(registro.application_date)}
        </span>

        {/* Instrumento */}
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {registro.instrument_name}
        </span>

        {/* Sujeto UUID */}
        <span style={{ fontSize: 'var(--font-size-caption)', fontFamily: 'monospace', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {uuidAbrev}
        </span>

        {/* Métricas count */}
        <span style={{
          fontSize: 'var(--font-size-caption)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-info-bg)',
          color: 'var(--color-info-text)',
          justifySelf: 'start',
          whiteSpace: 'nowrap',
        }}>
          {registro.values_count} {registro.values_count === 1 ? 'métrica' : 'métricas'}
        </span>

        {/* Chevron */}
        <span style={{ color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {expanded && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--space-4)',
          background: 'var(--color-bg-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
            UUID completo del sujeto:{' '}
            <span style={{ fontFamily: 'monospace' }}>{registro.subject_id}</span>
          </p>

          {registro.notes && (
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
              <strong>Notas:</strong> {registro.notes}
            </p>
          )}

          {registro.metric_values.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
              Sin valores de métrica registrados.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
              {registro.metric_values.map((mv) => (
                <div
                  key={mv.metric_id}
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
                    {TIPO_LABELS[mv.metric_type] || mv.metric_type}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
                    {mv.metric_name}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-base)' }}>
                    {fmtValor(mv.value, mv.metric_type)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

RegistroRow.propTypes = {
  registro: PropTypes.shape({
    application_id:   PropTypes.string.isRequired,
    subject_id:       PropTypes.string.isRequired,
    instrument_name:  PropTypes.string.isRequired,
    application_date: PropTypes.string,
    notes:            PropTypes.string,
    values_count:     PropTypes.number.isRequired,
    metric_values:    PropTypes.array.isRequired,
  }).isRequired,
}

function MisRegistrosPage({ token }) {
  const { toasts, toast, dismiss } = useToast()
  const [registros, setRegistros]         = useState([])
  const [cargando, setCargando]           = useState(true)
  const [filtroInstrumento, setFiltroInstrumento] = useState('')
  const [filtroDesde, setFiltroDesde]     = useState('')
  const [filtroHasta, setFiltroHasta]     = useState('')

  useEffect(() => {
    async function cargar() {
      const res = await listarMisRegistros(token)
      setCargando(false)
      if (res.status === 'success') {
        setRegistros(res.data || [])
      } else {
        toast({ type: 'error', title: 'Error', message: res.message || 'No se pudieron cargar los registros.' })
      }
    }
    cargar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Opciones únicas de instrumento para el filtro
  const instrumentos = useMemo(
    () => [...new Set(registros.map((r) => r.instrument_name))].sort(),
    [registros]
  )

  // Filtrado client-side
  const filtered = useMemo(() => {
    return registros.filter((r) => {
      if (filtroInstrumento && r.instrument_name !== filtroInstrumento) return false
      if (filtroDesde && r.application_date < filtroDesde) return false
      if (filtroHasta && r.application_date > filtroHasta) return false
      return true
    })
  }, [registros, filtroInstrumento, filtroDesde, filtroHasta])

  const hayFiltros = filtroInstrumento || filtroDesde || filtroHasta

  function limpiarFiltros() {
    setFiltroInstrumento('')
    setFiltroDesde('')
    setFiltroHasta('')
  }

  return (
    <main className="page-container">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Mis Registros</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Aplicaciones completadas. Haz clic en una fila para ver los valores de métrica.
        </Typography>
      </div>

      {cargando ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Spinner />
          <Typography as="small">Cargando registros...</Typography>
        </div>
      ) : registros.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="Sin registros"
          description="Aún no tienes aplicaciones completadas. Usa Registro Operativo para crear uno."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Barra de filtros */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 180px', maxWidth: 260 }}>
              Instrumento
              <select
                className="input-base"
                value={filtroInstrumento}
                onChange={(e) => setFiltroInstrumento(e.target.value)}
              >
                <option value="">Todos</option>
                {instrumentos.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 140px', maxWidth: 180 }}>
              Fecha desde
              <input
                className="input-base"
                type="date"
                value={filtroDesde}
                max={filtroHasta || undefined}
                onChange={(e) => setFiltroDesde(e.target.value)}
              />
            </label>

            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 140px', maxWidth: 180 }}>
              Fecha hasta
              <input
                className="input-base"
                type="date"
                value={filtroHasta}
                min={filtroDesde || undefined}
                onChange={(e) => setFiltroHasta(e.target.value)}
              />
            </label>

            {hayFiltros && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limpiarFiltros}
                style={{ alignSelf: 'flex-end' }}
              >
                <X size={14} style={{ marginRight: 4 }} />
                Limpiar
              </Button>
            )}
          </div>

          {/* Cabecera de columnas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: COL_TEMPLATE,
            gap: 'var(--space-4)',
            padding: '0 var(--space-4)',
          }}>
            {['Fecha', 'Instrumento', 'Sujeto (UUID)', 'Métricas', ''].map((col) => (
              <Typography key={col} as="small" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)' }}>
                {col}
              </Typography>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', padding: 'var(--space-4) var(--space-4)' }}>
              Ningún registro coincide con los filtros aplicados.
            </p>
          ) : (
            filtered.map((r) => <RegistroRow key={r.application_id} registro={r} />)
          )}

          {hayFiltros && (
            <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
              {filtered.length} de {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
            </Typography>
          )}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

MisRegistrosPage.propTypes = {
  token: PropTypes.string.isRequired,
}

export default MisRegistrosPage
