import PropTypes from 'prop-types'
import { Crown, Search, ClipboardList } from 'lucide-react'

/**
 * RoleBadge — displays user role with appropriate color and icon
 * Props: role ('admin'|'researcher'|'aplicador')
 */

const roleConfig = {
  admin: {
    label: 'Admin',
    Icon: Crown,
    className: 'badge-role badge-role-admin',
  },
  researcher: {
    label: 'Investigador',
    Icon: Search,
    className: 'badge-role badge-role-researcher',
  },
  aplicador: {
    label: 'Aplicador',
    Icon: ClipboardList,
    className: 'badge-role badge-role-aplicador',
  },
}

function RoleBadge({ role }) {
  const config = roleConfig[role]

  if (!config) return null

  const { label, Icon, className } = config

  return (
    <span className={className}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  )
}

RoleBadge.propTypes = {
  role: PropTypes.oneOf(['admin', 'researcher', 'aplicador']).isRequired,
}

export default RoleBadge
