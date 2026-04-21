import { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, DatePicker, EmptyState, Spinner, Typography, ToastContainer, useToast } from '@/components/app'
import { listarAuditLog } from '@/services/auditLog'

// ── Catálogo de eventos ────────────────────────────────────────────────────────

const EVENTOS = [
  { value: '',                     label: 'Todos los eventos'        },
  { value: 'LOGIN',                label: 'Inicio de sesión'         },
  { value: 'LOGIN_FALLIDO',        label: 'Login fallido'            },
  { value: 'LOGOUT',               label: 'Cierre de sesión'         },
  { value: 'CAMBIO_CONTRASENA',    label: 'Cambio de contraseña'     },
  { value: 'RATE_LIMIT_ACTIVADO',  label: 'Rate limit activado'      },
  { value: 'ACCESO_DENEGADO',      label: 'Acceso denegado'          },
  { value: 'CONSULTA_USUARIOS',    label: 'Consulta de usuarios'     },
]

const EVENT_COLORS = {
  LOGIN:               { bg: 'var(--color-success-subtle)', text: 'var(--color-success)' },
  LOGIN_FALLIDO:       { bg: 'var(--color-error-subtle)',   text: 'var(--color-error)'   },
  LOGOUT:              { bg: 'var(--color-info-subtle)',    text: 'var(--color-info)'     },
  CAMBIO_CONTRASENA:   { bg: 'var(--color-warning-subtle)',text: 'var(--color-warning)'  },
  RATE_LIMIT_ACTIVADO: { bg: 'var(--color-error-subtle)',   text: 'var(--color-error)'   },
  ACCESO_DENEGADO:     { bg: 'var(--color-error-subtle)',   text: 'var(--color-error)'   },
  CONSULTA_USUARIOS:   { bg: 'var(--color-info-subtle)',    text: 'var(--color-info)'     },
}

const EVENT_LABELS = Object.fromEntries(
  EVENTOS.filter((e) => e.value).map((e) => [e.value, e.label])
)

// ── Helpers ────────────────────────────────────────────────────────────────────

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtTimestamp(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}:${ss}`
}

function EventBadge({ event }) {
  const color = EVENT_COLORS[event] || { bg: 'var(--color-bg-subtle)', text: 'var(--color-text-secondary)' }
  return (
    <span style={{
      display:      'inline-block',
      padding:      '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize:     'var(--font-size-caption)',
      fontWeight:   'var(--font-weight-medium)',
      background:   color.bg,
      color:        color.text,
      whiteSpace:   'nowrap',
    }}>
      {EVENT_LABELS[event] || event}
    </span>
  )
}

EventBadge.propTypes = {
  event: PropTypes.string.isRequired,
}

const COL_TEMPLATE = '160px 1fr 110px 90px 1fr'

function TableHeader() {
  return (
    <div style={{
      display:     'grid',
      gridTemplateColumns: COL_TEMPLATE,
      gap:         'var(--space-3)',
      padding:     'var(--space-2) var(--space-4)',
      fontSize:    'var(--font-size-caption)',
      fontWeight:  'var(--font-weight-medium)',
      color:       'var(--color-text-secondary)',
      background:  'var(--color-bg-subtle)',
      borderRadius:'var(--radius-md) var(--radius-md) 0 0',
      border:      '1px solid var(--color-border)',
      borderBottom:'none',
    }}>
      <span>Fecha / Hora</span>
      <span>Evento</span>
      <span>IP</span>
      <span>Usuario</span>
      <span>Detalle</span>
    </div>
  )
}

function LogRow({ entry }) {
  const user = entry.user_full_name || entry.user_email || entry.user_id || '—'
  return (
    <div style={{
      display:    'grid',
      gridTemplateColumns: COL_TEMPLATE,
      gap:        'var(--space-3)',
      padding:    'var(--space-3) var(--space-4)',
      borderLeft: '1px solid var(--color-border)',
      borderRight:'1px solid var(--color-border)',
      borderBottom:'1px solid var(--color-border)',
      alignItems: 'start',
    }}>
      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
        {fmtTimestamp(entry.timestamp)}
      </span>
      <EventBadge event={entry.event} />
      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
        {entry.ip || '—'}
      </span>
      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={user}>
        {user}
      </span>
      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={entry.details || ''}>
        {entry.details || '—'}
      </span>
    </div>
  )
}

LogRow.propTypes = {
  entry: PropTypes.shape({
    timestamp:      PropTypes.string,
    event:          PropTypes.string.isRequired,
    ip:             PropTypes.string,
    user_full_name: PropTypes.string,
    user_email:     PropTypes.string,
    user_id:        PropTypes.string,
    details:        PropTypes.string,
  }).isRequired,
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { token } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  const [entries, setEntries] = useState([])
  const [meta,    setMeta]    = useState(null)
  const [loading, setLoading] = useState(false)

  const [filters, setFilters] = useState({
    event:  '',
    from:   '',
    to:     '',
    page:   1,
    limit:  50,
  })

  const fetchLog = useCallback(async (f) => {
    setLoading(true)
    const params = { page: f.page, limit: f.limit }
    if (f.event) params.event = f.event
    if (f.from)  params.from  = f.from
    if (f.to)    params.to    = f.to

    const result = await listarAuditLog(token, params)
    if (result.ok) {
      setEntries(result.data || [])
      setMeta(result.meta)
    } else {
      addToast({ type: 'error', message: result.error || 'Error al cargar audit log' })
    }
    setLoading(false)
  }, [token, addToast])

  useEffect(() => { fetchLog(filters) }, [filters, fetchLog])

  function handleFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  function clearFilters() {
    setFilters({ event: '', from: '', to: '', page: 1, limit: 50 })
  }

  const hasFilters = filters.event || filters.from || filters.to

  return (
    <main style={{ padding: 'var(--space-6)', maxWidth: '1200px' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography variant="h1">Audit Log del Sistema</Typography>
        <Typography variant="body" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Registro de todos los eventos de seguridad y acceso al sistema.
        </Typography>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--space-5)' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
            Tipo de evento
          </label>
          <select
            value={filters.event}
            onChange={(e) => handleFilter('event', e.target.value)}
            style={{
              width:        '100%',
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background:   'var(--color-surface)',
              color:        'var(--color-text-primary)',
              fontSize:     'var(--font-size-small)',
            }}
          >
            {EVENTOS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
            Desde
          </label>
          <DatePicker
            value={filters.from}
            onChange={(iso) => handleFilter('from', iso || '')}
            placeholder="Fecha inicio"
            max={filters.to || undefined}
          />
        </div>

        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
            Hasta
          </label>
          <DatePicker
            value={filters.to}
            onChange={(iso) => handleFilter('to', iso || '')}
            placeholder="Fecha fin"
            min={filters.from || undefined}
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
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

      {!loading && entries.length === 0 && (
        <EmptyState
          icon={ShieldAlert}
          title="Sin registros"
          description={hasFilters ? 'No hay eventos con los filtros aplicados.' : 'No hay eventos de auditoría registrados.'}
        />
      )}

      {!loading && entries.length > 0 && (
        <div>
          <TableHeader />
          {entries.map((e) => <LogRow key={e.id} entry={e} />)}
        </div>
      )}

      {/* Paginación */}
      {meta && meta.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <Typography variant="caption" style={{ color: 'var(--color-text-secondary)' }}>
            {meta.total} evento{meta.total !== 1 ? 's' : ''} · Página {meta.page} de {meta.pages}
          </Typography>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="ghost" size="sm" disabled={filters.page <= 1}
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}>
              Anterior
            </Button>
            <Button variant="ghost" size="sm" disabled={filters.page >= meta.pages}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
