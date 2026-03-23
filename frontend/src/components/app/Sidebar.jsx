import { NavLink } from 'react-router-dom'

/**
 * Sidebar — navigation sidebar with NavLink items
 * Props: items ([{label, icon, to, end?}]), header (ReactNode),
 *        renderItem (fn: item → ReactNode) — override default NavLink render,
 *        footer (ReactNode) — optional slot pinned to bottom
 */
function Sidebar({ items = [], header, renderItem, footer }) {
  const defaultRender = ({ label, icon: Icon, to, end }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `sidebar-item${isActive ? ' is-active' : ''}`
      }
    >
      {Icon && <Icon size={20} aria-hidden="true" />}
      <span>{label}</span>
    </NavLink>
  )

  const render = renderItem ?? defaultRender

  return (
    <aside className="sidebar">
      {header}

      <nav style={{ padding: 'var(--space-2) 0', flex: 1 }}>
        {items.map((item) => (
          <div key={item.to ?? item.id}>{render(item)}</div>
        ))}
      </nav>

      {footer && (
        <div
          style={{
            marginTop: 'auto',
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {footer}
        </div>
      )}
    </aside>
  )
}

export default Sidebar
