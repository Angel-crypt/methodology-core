import { BookOpen, ClipboardList, Users } from 'lucide-react'
import { Sidebar, Button } from '@/components/app'

const NAV_ITEMS = [
  { label: 'Instrumentos', icon: BookOpen, to: '/instruments' },
  { label: 'Aplicadores', icon: ClipboardList, to: '/usuarios/aplicadores' },
  { label: 'Investigadores', icon: Users, to: '/usuarios/investigadores' },
]

/**
 * AppLayout
 * Layout raíz para páginas autenticadas.
 * Incluye Sidebar lateral con navegación completa y Topbar con cerrar sesión.
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
                fontSize: 'var(--font-size-label)',
                color: 'var(--color-text-tertiary)',
                marginTop: 'var(--space-0-5)',
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
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </header>

        {children}

      </div>
    </div>
  )
}

export default AppLayout
