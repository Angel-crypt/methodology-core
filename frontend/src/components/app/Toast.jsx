import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Toast — individual toast notification item
 * ToastContainer — renders all active toasts in bottom-right position
 */

const toastConfig = {
  success: {
    Icon: CheckCircle,
    style: {
      backgroundColor: 'var(--color-success-bg)',
      borderLeftColor: 'var(--color-success)',
      color: 'var(--color-success-text)',
    },
  },
  error: {
    Icon: XCircle,
    style: {
      backgroundColor: 'var(--color-error-bg)',
      borderLeftColor: 'var(--color-error)',
      color: 'var(--color-error-text)',
    },
  },
  warning: {
    Icon: AlertTriangle,
    style: {
      backgroundColor: 'var(--color-warning-bg)',
      borderLeftColor: 'var(--color-warning)',
      color: 'var(--color-warning-text)',
    },
  },
  info: {
    Icon: Info,
    style: {
      backgroundColor: 'var(--color-info-bg)',
      borderLeftColor: 'var(--color-info)',
      color: 'var(--color-info-text)',
    },
  },
}

function Toast({ id, type = 'info', title, message, onDismiss }) {
  const config = toastConfig[type] || toastConfig.info
  const { Icon } = config

  return (
    <div
      className="toast"
      aria-atomic="true"
      style={{
        ...config.style,
        position: 'relative',
      }}
    >
      <Icon size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <p style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: message ? 'var(--space-1)' : 0 }}>
            {title}
          </p>
        )}
        {message && (
          <p style={{ opacity: 0.9 }}>{message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Cerrar notificación"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 'var(--space-0-5)',
          color: 'inherit',
          opacity: 0.7,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null

  return createPortal(
    <div
      aria-live="polite"
      aria-label="Notificaciones"
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        maxWidth: '360px',
        width: '100%',
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  )
}

Toast.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  title: PropTypes.string,
  message: PropTypes.string,
  onDismiss: PropTypes.func.isRequired,
}

ToastContainer.propTypes = {
  toasts: PropTypes.array,
  onDismiss: PropTypes.func.isRequired,
}

export default Toast
