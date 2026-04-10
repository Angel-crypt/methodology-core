import PropTypes from 'prop-types'
import { CheckCircle, XCircle, Clock, Ban } from 'lucide-react'

/**
 * StatusBadge — displays record status with color and icon
 * Props:
 *   status  'active'|'pending'|'inactive'|'disabled'
 *   label   optional override label
 */

const statusConfig = {
  active: {
    label: 'Activo',
    Icon: CheckCircle,
    className: 'badge-status badge-status-active',
  },
  pending: {
    label: 'Pendiente',
    Icon: Clock,
    className: 'badge-status badge-status-pending',
  },
  inactive: {
    label: 'Inactivo',
    Icon: XCircle,
    className: 'badge-status badge-status-inactive',
  },
  disabled: {
    label: 'Desactivado',
    Icon: Ban,
    className: 'badge-status badge-status-inactive',
  },
}

function StatusBadge({ status, label: labelOverride }) {
  const config = statusConfig[status] ?? statusConfig.inactive

  const { label, Icon, className } = config

  return (
    <span className={className}>
      <Icon size={12} aria-hidden="true" />
      {labelOverride ?? label}
    </span>
  )
}

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['active', 'pending', 'inactive', 'disabled']).isRequired,
  label:  PropTypes.string,
}

export default StatusBadge
