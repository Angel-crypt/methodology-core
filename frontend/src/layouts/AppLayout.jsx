import { BookOpen } from 'lucide-react'
import { Sidebar } from '@/components/app'

const NAV_ITEMS = [
  { label: 'Instrumentos', icon: BookOpen, to: '/instruments' },
]

/**
 * AppLayout
 * Layout raíz para páginas autenticadas.
 * Incluye Sidebar lateral y Topbar con opción de cerrar sesión.
 *
 * Props:
 *   children  ReactNode
 *   onLogout  () => void — limpia el token y regresa al login
 */
function AppLayout({ children, onLogout }) {
  return (
    <div className="app-layout">

      <Sidebar
        items={NAV_ITEMS}
        header={
          <div>
            <p
              style={{
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              SPL
            </p>
            <p
              style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-tertiary)',
                marginTop: 2,
              }}
            >
              Sistema de Perfiles Lingüísticos
            </p>
          </div>
        }
      />

      <div className="app-content">

        {/* Topbar */}
        <header className="topbar">
          <div style={{ flex: 1 }} />
          <button
            onClick={onLogout}
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Cerrar sesión
          </button>
        </header>

        {children}

      </div>
    </div>
  )
}

export default AppLayout