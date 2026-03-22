import { NavLink } from 'react-router-dom'

/**
 * Sidebar — navigation sidebar with NavLink items
 * Props: items ([{label, icon, to, end?}]), header (ReactNode)
 */
function Sidebar({ items = [], header }) {
  return (
    <aside className="sidebar">
      {header && (
        <div
          style={{
            padding: 'var(--space-4) var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {header}
        </div>
      )}

      <nav style={{ padding: 'var(--space-2) 0' }}>
        {items.map(({ label, icon: Icon, to, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' is-active' : ''}`
            }
          >
            {Icon && <Icon size={20} aria-hidden="true" />}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
