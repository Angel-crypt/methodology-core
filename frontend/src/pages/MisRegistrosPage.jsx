import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
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

// Columnas: Fecha | Proyecto | Instrumento | Sujeto | Métricas | Chevron
const COL_TEMPLATE = '110px 1fr 1.5fr 90px 80px 24px'

function RegistroRow({ registro }) {
  const [expanded, setExpanded] = useState(false)
  const anonCode = registro.anonymous_code

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
          gap: 'var(--space-3)',
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

        {/* Proyecto */}
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {registro.project_name ?? '—'}
        </span>

        {/* Instrumento */}
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {registro.instrument_name}
        </span>

        {/* Sujeto */}
        <span style={{ fontSize: 'var(--font-size-caption)', fontFamily: 'monospace', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {anonCode}
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
            Código anónimo:{' '}
            <span style={{ fontFamily: 'monospace' }}>{registro.anonymous_code}</span>
            {registro.project_name && (
              <> · Proyecto: <strong>{registro.project_name}</strong></>
            )}
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
    anonymous_code:   PropTypes.string.isRequired,
    instrument_name:  PropTypes.string.isRequired,
    application_date: PropTypes.string,
    notes:            PropTypes.string,
    project_id:       PropTypes.string,
    project_name:     PropTypes.string,
    values_count:     PropTypes.number.isRequired,
    metric_values:    PropTypes.array.isRequired,
  }).isRequired,
}

function MisRegistrosPage() {
  const { token } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [registros, setRegistros]         = useState([])
  const [cargando, setCargando]           = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [meta, setMeta] = useState({ total: 0, page: 1, page_size: 20, pages: 1 })
  const [filtroInstrumento, setFiltroInstrumento] = useState('')
  const [filtroDesde, setFiltroDesde]     = useState('')
  const [filtroHasta, setFiltroHasta]     = useState('')
  const [filtroProyecto, setFiltroProyecto] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')

  // Acumula todos los registros cargados para derivar listas de filtros
  const [todosRegistros, setTodosRegistros] = useState([])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const res = await listarMisRegistros(token, {
        page,
        page_size: pageSize,
        instrument: filtroInstrumento || undefined,
        from: filtroDesde || undefined,
        to: filtroHasta || undefined,
        project_id: filtroProyecto || undefined,
        anonymous_code: filtroUsuario || undefined,
      })
      setCargando(false)
      if (res.ok) {
        setRegistros(res.data || [])
        setMeta(res.meta || { total: (res.data || []).length, page, page_size: pageSize, pages: 1 })
        if (!filtroInstrumento && !filtroDesde && !filtroHasta && !filtroProyecto && !filtroUsuario && page === 1) {
          setTodosRegistros(res.data || [])
        }
      } else {
        toast({ type: 'error', title: 'Error', message: res.error || 'No se pudieron cargar los registros.' })
      }
    }
    cargar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, pageSize, filtroInstrumento, filtroDesde, filtroHasta, filtroProyecto, filtroUsuario])

  const instrumentos = useMemo(
    () => [...new Set(todosRegistros.map((r) => r.instrument_name))].filter(Boolean).sort(),
    [todosRegistros]
  )

  const usuarios = useMemo(
    () => [...new Set(todosRegistros.map((r) => r.anonymous_code))].filter(Boolean).sort(),
    [todosRegistros]
  )

  // Filtro client-side por usuario (fallback si backend no soporta anonymous_code param)
  const registrosFiltrados = useMemo(() => {
    if (!filtroUsuario) return registros
    return registros.filter((r) => r.anonymous_code === filtroUsuario)
  }, [registros, filtroUsuario])

  const proyectos = useMemo(
    () => {
      const seen = new Map()
      todosRegistros.forEach((r) => { if (r.project_id && r.project_name) seen.set(r.project_id, r.project_name) })
      return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
    },
    [todosRegistros]
  )

  const hayFiltros = filtroInstrumento || filtroDesde || filtroHasta || filtroProyecto || filtroUsuario

  function limpiarFiltros() {
    setFiltroInstrumento('')
    setFiltroDesde('')
    setFiltroHasta('')
    setFiltroProyecto('')
    setFiltroUsuario('')
    setPage(1)
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
      ) : registros.length === 0 && !hayFiltros ? (
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
              Proyecto
              <select
                className="input-base"
                value={filtroProyecto}
                onChange={(e) => { setFiltroProyecto(e.target.value); setPage(1) }}
              >
                <option value="">Todos</option>
                {proyectos.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 150px', maxWidth: 200 }}>
              Usuario
              <select
                className="input-base"
                value={filtroUsuario}
                onChange={(e) => { setFiltroUsuario(e.target.value); setPage(1) }}
              >
                <option value="">Todos</option>
                {usuarios.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </label>

            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 180px', maxWidth: 260 }}>
              Instrumento
              <select
                className="input-base"
                value={filtroInstrumento}
                onChange={(e) => {
                  setFiltroInstrumento(e.target.value)
                  setPage(1)
                }}
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
                onChange={(e) => { setFiltroDesde(e.target.value); setPage(1) }}
              />
            </label>

            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 140px', maxWidth: 180 }}>
              Fecha hasta
              <input
                className="input-base"
                type="date"
                value={filtroHasta}
                min={filtroDesde || undefined}
                onChange={(e) => { setFiltroHasta(e.target.value); setPage(1) }}
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
            gap: 'var(--space-3)',
            padding: '0 var(--space-4)',
          }}>
            {['Fecha', 'Proyecto', 'Instrumento', 'Sujeto', 'Métricas', ''].map((col) => (
              <Typography key={col} as="small" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)' }}>
                {col}
              </Typography>
            ))}
          </div>

          {registrosFiltrados.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', padding: 'var(--space-4)' }}>
              Ningún registro coincide con los filtros aplicados.
            </p>
          ) : (
            registrosFiltrados.map((r) => <RegistroRow key={r.application_id} registro={r} />)
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
              Página {meta.page || page} de {meta.pages || 1}
            </Typography>
            <Button variant="ghost" size="sm" disabled={page >= (meta.pages || 1)} onClick={() => setPage((p) => Math.min(meta.pages || 1, p + 1))}>
              Siguiente
            </Button>
          </div>

          {hayFiltros && (
            <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
              {meta.total || 0} {meta.total === 1 ? 'registro' : 'registros'} encontrados
            </Typography>
          )}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

export default MisRegistrosPage
