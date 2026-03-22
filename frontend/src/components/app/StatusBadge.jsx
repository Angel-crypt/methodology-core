import { CheckCircle, XCircle, Clock } from 'lucide-react'

/**
 * StatusBadge — displays record status with color and icon
 * Props: status ('active'|'inactive'|'pending')
 */

const statusConfig = {
  active: {
    label: 'Activo',
    Icon: CheckCircle,
    className: 'badge-status badge-status-active',
  },
  inactive: {
    label: 'Inactivo',
    Icon: XCircle,
    className: 'badge-status badge-status-inactive',
  },
  pending: {
    label: 'Pendiente',
    Icon: Clock,
    className: 'badge-status badge-status-pending',
  },
}

function StatusBadge({ status }) {
  const config = statusConfig[status]

  if (!config) return null

  const { label, Icon, className } = config

  return (
    <span className={className}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  )
}

export default StatusBadge
