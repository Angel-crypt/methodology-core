import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown } from 'lucide-react'
import PropTypes from 'prop-types'

/**
 * ActionsMenu — menú desplegable de acciones para filas de tabla.
 *
 * Props:
 *   actions  [{ label, icon, onClick, variant?, disabled? }]
 *            variant: 'default' | 'danger'  (default: 'default')
 *   label    string — texto del trigger (default: 'Acciones')
 */
function ActionsMenu({ actions, label = 'Acciones' }) {
  if (!actions || actions.length === 0) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="actions-menu-trigger"
          onClick={(e) => e.stopPropagation()}
          aria-label={label}
        >
          {label}
          <ChevronDown size={12} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="profile-dropdown"
          align="end"
          sideOffset={4}
          style={{ minWidth: '180px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, idx) => {
            const Icon = action.icon
            const isDanger = action.variant === 'danger'
            return (
              <DropdownMenu.Item
                key={idx}
                className={`profile-dropdown__item${isDanger ? ' profile-dropdown__item--danger' : ''}`}
                onSelect={action.onClick}
                disabled={action.disabled}
              >
                {Icon && <Icon size={14} aria-hidden="true" />}
                {action.label}
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

ActionsMenu.propTypes = {
  label: PropTypes.string,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label:    PropTypes.string.isRequired,
      icon:     PropTypes.elementType,
      onClick:  PropTypes.func.isRequired,
      variant:  PropTypes.oneOf(['default', 'danger']),
      disabled: PropTypes.bool,
    })
  ).isRequired,
}

export default ActionsMenu
