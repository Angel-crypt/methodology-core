import PropTypes from 'prop-types'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

/**
 * Alert — static inline alert component
 * Props: variant ('info'|'success'|'warning'|'error'), title, children, icon (override)
 */

const variantConfig = {
  success: {
    Icon: CheckCircle,
    containerStyle: {
      backgroundColor: 'var(--color-success-bg)',
      borderLeftColor: 'var(--color-success)',
      color: 'var(--color-success-text)',
    },
  },
  error: {
    Icon: XCircle,
    containerStyle: {
      backgroundColor: 'var(--color-error-bg)',
      borderLeftColor: 'var(--color-error)',
      color: 'var(--color-error-text)',
    },
  },
  warning: {
    Icon: AlertTriangle,
    containerStyle: {
      backgroundColor: 'var(--color-warning-bg)',
      borderLeftColor: 'var(--color-warning)',
      color: 'var(--color-warning-text)',
    },
  },
  info: {
    Icon: Info,
    containerStyle: {
      backgroundColor: 'var(--color-info-bg)',
      borderLeftColor: 'var(--color-info)',
      color: 'var(--color-info-text)',
    },
  },
}

function Alert({ variant = 'info', title, children, icon: IconOverride }) {
  const config = variantConfig[variant] || variantConfig.info
  const Icon = IconOverride || config.Icon

  return (
    <div
      role="alert"
      style={{
        ...config.containerStyle,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        borderLeft: '4px solid',
        fontSize: 'var(--font-size-small)',
      }}
    >
      <Icon
        size={16}
        aria-hidden="true"
        style={{ flexShrink: 0, marginTop: 'var(--space-0-5)' }}
      />
      <div style={{ flex: 1 }}>
        {title && (
          <p style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: children ? 'var(--space-1)' : 0 }}>
            {title}
          </p>
        )}
        {children && (
          <div style={{ opacity: 0.9 }}>{children}</div>
        )}
      </div>
    </div>
  )
}

Alert.propTypes = {
  variant: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  title: PropTypes.string,
  children: PropTypes.node,
  icon: PropTypes.elementType,
}

export default Alert
