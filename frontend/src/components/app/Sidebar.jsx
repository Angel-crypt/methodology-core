import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import PropTypes from 'prop-types'
import { NavLink } from 'react-router-dom'
import Tooltip from './Tooltip'
import UserAvatar from './UserAvatar'
import RoleBadge from './RoleBadge'
import { jwtRoleToDisplay } from '@/lib/utils'

/**
 * Sidebar — navegación lateral colapsable con grupos de sección y footer de perfil.
 *
 * Props:
 *   sections      [{id, label?, items: [{label, icon, to, end?}]}]
 *   isCollapsed   boolean
 *   onToggle      () => void
 *   user          { fullName, role } — rol en formato JWT
 *   onLogout      () => void
 */
function Sidebar({ sections = [], isCollapsed = false, onToggle, user, onLogout }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400}>
      <aside className={`sidebar${isCollapsed ? ' sidebar--collapsed' : ''}`}>

        {/* ── Header ── */}
        <div className="sidebar__header">
          {!isCollapsed && (
            <div className="sidebar__brand">
              <p className="sidebar__title">SPL</p>
              <p className="sidebar__subtitle">Sistema de Perfiles Lingüísticos</p>
            </div>
          )}
          <button
            className="sidebar__toggle"
            onClick={onToggle}
            aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isCollapsed
              ? <ChevronRight size={16} aria-hidden="true" />
              : <ChevronLeft  size={16} aria-hidden="true" />
            }
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar__nav" aria-label="Navegación principal">
          {sections.map((section) => (
            <div key={section.id} className="sidebar__section">
              {section.label && (
                <span className="sidebar__section-label">{section.label}</span>
              )}
              {section.items.map((item) => (
                <Tooltip
                  key={item.to}
                  content={item.label}
                  disabled={!isCollapsed}
                >
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `sidebar-item${isActive ? ' is-active' : ''}`
                    }
                  >
                    {item.icon && <item.icon size={18} aria-hidden="true" />}
                    <span className="sidebar__item-label">{item.label}</span>
                  </NavLink>
                </Tooltip>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="sidebar__footer">
          <div className="sidebar__profile">
            <UserAvatar fullName={user.fullName} role={user.role} size="sm" />
            {!isCollapsed && (
              <div className="sidebar__profile-info">
                <span className="sidebar__profile-name">{user.fullName}</span>
                <RoleBadge role={jwtRoleToDisplay(user.role)} />
              </div>
            )}
          </div>

          <div className="sidebar__logout-separator" aria-hidden="true" />

          <Tooltip content="Cerrar sesión" disabled={!isCollapsed}>
            <button
              className="sidebar__logout"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="sidebar__logout-label">Cerrar sesión</span>
            </button>
          </Tooltip>
        </div>

      </aside>
    </TooltipPrimitive.Provider>
  )
}

Sidebar.propTypes = {
  sections:    PropTypes.arrayOf(
    PropTypes.shape({
      id:    PropTypes.string.isRequired,
      label: PropTypes.string,
      items: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          icon:  PropTypes.elementType,
          to:    PropTypes.string.isRequired,
          end:   PropTypes.bool,
        })
      ).isRequired,
    })
  ),
  isCollapsed: PropTypes.bool,
  onToggle:    PropTypes.func.isRequired,
  user:        PropTypes.shape({
    fullName: PropTypes.string.isRequired,
    role:     PropTypes.oneOf(['administrator', 'researcher', 'applicator']).isRequired,
  }).isRequired,
  onLogout:    PropTypes.func.isRequired,
}

export default Sidebar
