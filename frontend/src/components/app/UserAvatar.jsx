import PropTypes from 'prop-types'
import { Crown, Search, ClipboardList } from 'lucide-react'

/**
 * UserAvatar — avatar circular con color e ícono según el rol del usuario.
 * Muestra el ícono del rol (pequeño) y la inicial del nombre.
 *
 * Props:
 *   fullName  string — nombre completo del usuario (para la inicial)
 *   role      'administrator'|'researcher'|'applicator' — rol JWT
 *   size      'sm' (32px) | 'md' (40px)
 */

const ROLE_CONFIG = {
  administrator: {
    bg:   'var(--purple-600)',
    color: 'var(--purple-50)',
    Icon: Crown,
  },
  researcher: {
    bg:   'var(--color-primary)',
    color: 'var(--color-primary-text)',
    Icon: Search,
  },
  applicator: {
    bg:   'var(--amber-500)',
    color: 'var(--amber-50)',
    Icon: ClipboardList,
  },
}

const SIZE_DIM  = { sm: 32, md: 40 }
const ICON_SIZE = { sm: 11, md: 13 }
const TEXT_SIZE = { sm: 9,  md: 11 }

function UserAvatar({ fullName = '', role = 'researcher', size = 'sm' }) {
  const config  = ROLE_CONFIG[role] ?? ROLE_CONFIG.researcher
  const dim     = SIZE_DIM[size]  ?? SIZE_DIM.sm
  const iSize   = ICON_SIZE[size] ?? ICON_SIZE.sm
  const tSize   = TEXT_SIZE[size] ?? TEXT_SIZE.sm
  const initial = fullName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className="user-avatar"
      style={{
        width: dim,
        height: dim,
        backgroundColor: config.bg,
        color: config.color,
        fontSize: tSize,
      }}
      aria-hidden="true"
    >
      <config.Icon size={iSize} />
      <span>{initial}</span>
    </div>
  )
}

UserAvatar.propTypes = {
  fullName: PropTypes.string,
  role:     PropTypes.oneOf(['administrator', 'researcher', 'applicator']),
  size:     PropTypes.oneOf(['sm', 'md']),
}

export default UserAvatar
