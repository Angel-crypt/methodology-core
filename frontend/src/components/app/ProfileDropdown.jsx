import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, KeyRound } from 'lucide-react'
import PropTypes from 'prop-types'
import UserAvatar from './UserAvatar'
import RoleBadge from './RoleBadge'
import { jwtRoleToDisplay } from '@/lib/utils'

/**
 * ProfileDropdown — menú desplegable de perfil en el topbar.
 * Muestra nombre, email y rol del usuario autenticado.
 * Permite acceder a "Cambiar contraseña".
 *
 * Props:
 *   fullName          string
 *   role              'superadmin'|'researcher'|'applicator' — rol JWT
 *   email             string
 *   onChangePassword  () => void — abre CambiarPasswordModal
 */
function ProfileDropdown({ fullName, role, email, onChangePassword }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="profile-trigger" aria-label="Menú de perfil">
          <UserAvatar fullName={fullName} role={role} size="sm" />
          <ChevronDown size={14} className="profile-trigger__chevron" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="profile-dropdown"
          align="end"
          sideOffset={8}
        >
          {/* Header — info del usuario, no clickable */}
          <div className="profile-dropdown__header">
            <UserAvatar fullName={fullName} role={role} size="md" />
            <div className="profile-dropdown__info">
              <span className="profile-dropdown__name">{fullName}</span>
              <span className="profile-dropdown__email">{email}</span>
            </div>
          </div>

          <DropdownMenu.Separator className="profile-dropdown__separator" />

          {/* Rol */}
          <div className="profile-dropdown__role-row">
            <RoleBadge role={jwtRoleToDisplay(role)} />
          </div>

          <DropdownMenu.Separator className="profile-dropdown__separator" />

          {/* Cambiar contraseña */}
          <DropdownMenu.Item
            className="profile-dropdown__item"
            onSelect={onChangePassword}
          >
            <KeyRound size={14} aria-hidden="true" />
            Cambiar contraseña
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

ProfileDropdown.propTypes = {
  fullName:         PropTypes.string.isRequired,
  role:             PropTypes.oneOf(['superadmin', 'researcher', 'applicator']).isRequired,
  email:            PropTypes.string.isRequired,
  onChangePassword: PropTypes.func.isRequired,
}

export default ProfileDropdown
