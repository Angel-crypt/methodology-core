import PropTypes from 'prop-types'
import { Database } from 'lucide-react'

/**
 * EmptyState — empty content placeholder
 * Props: icon (Lucide component), title, message, action (ReactNode)
 */
function EmptyState({ icon: Icon = Database, title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={24} aria-hidden="true" />
      </div>
      {title && (
        <p className="empty-state-title">{title}</p>
      )}
      {message && (
        <p className="empty-state-message">{message}</p>
      )}
      {action && (
        <div style={{ marginTop: 'var(--space-1)' }}>
          {action}
        </div>
      )}
    </div>
  )
}

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.node,
}

export default EmptyState
