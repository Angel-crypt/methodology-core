/**
 * SessionCard — muestra datos enriquecidos de una sesión activa.
 * Parseamos el user_agent para mostrar browser y OS en lugar del string crudo.
 */
import PropTypes from 'prop-types'
import { Monitor, Globe, Clock, LogIn } from 'lucide-react'
import { parseUserAgent } from '@/lib/userAgent'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtFecha(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()} ${h}:${m}`
}

function fmtExpiry(ts) {
  if (!ts) return '—'
  const exp = new Date(typeof ts === 'number' ? ts * 1000 : ts)
  if (isNaN(exp.getTime())) return '—'
  const now = new Date()
  const diffMs = exp - now
  if (diffMs <= 0) return 'Expirada'
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `Expira en ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Expira en ${diffH}h`
  return `Expira ${fmtFecha(exp)}`
}

function Row({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <Icon size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} aria-hidden="true" />
      <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption)' }}>
        {label}:
      </span>
      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
        {value}
      </span>
    </div>
  )
}

Row.propTypes = {
  icon:  PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
}

export default function SessionCard({ session, current = false }) {
  const { browser, os } = parseUserAgent(session.user_agent)

  return (
    <li style={{
      padding:      'var(--space-3)',
      background:   'var(--color-bg-subtle)',
      borderRadius: 'var(--radius-md)',
      border:       current ? '1px solid var(--color-primary)' : '1px solid transparent',
      display:      'flex',
      flexDirection:'column',
      gap:          'var(--space-1)',
    }}>
      {current && (
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
          Sesión actual
        </span>
      )}
      <Row icon={Monitor} label="Navegador" value={browser} />
      <Row icon={Globe}   label="Sistema"   value={os} />
      <Row icon={Globe}   label="IP"        value={session.ip || '—'} />
      <Row icon={LogIn}   label="Inicio"    value={fmtFecha(session.created_at)} />
      <Row icon={Clock}   label="Expiración" value={fmtExpiry(session.expires_at)} />
    </li>
  )
}

SessionCard.propTypes = {
  session: PropTypes.shape({
    jti:        PropTypes.string,
    user_agent: PropTypes.string,
    ip:         PropTypes.string,
    created_at: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    expires_at: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  current: PropTypes.bool,
}
