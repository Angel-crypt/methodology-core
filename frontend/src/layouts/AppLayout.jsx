import { useState } from 'react'
import PropTypes from 'prop-types'
import { BookOpen, ClipboardList, Users } from 'lucide-react'
import { Sidebar, Button } from '@/components/app'
import CambiarPasswordModal from '@/pages/CambiarPasswordModal'

const NAV_ITEMS_BASE = [
  { label: 'Instrumentos', icon: BookOpen, to: '/instruments' },
]

const NAV_ITEMS_ADMIN = [
  { label: 'Aplicadores', icon: ClipboardList, to: '/usuarios/aplicadores' },
  { label: 'Investigadores', icon: Users, to: '/usuarios/investigadores' },
]

function getRoleFromToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).role
  } catch {
    return null
  }
}

/**
 * AppLayout
 * Layout raíz para páginas autenticadas.
 * Incluye Sidebar lateral con navegación completa y Topbar con cerrar sesión.
 *
 * Props:
 *   children  ReactNode
 *   onLogout  () => void — limpia el token y regresa al login
 *   token     string    — JWT activo para derivar el rol del usuario
 */
function AppLayout({ children, onLogout, token }) {
  const [modalOpen, setModalOpen] = useState(false)

  const esAdmin = getRoleFromToken(token) === 'administrator'
  const navItems = esAdmin ? [...NAV_ITEMS_BASE, ...NAV_ITEMS_ADMIN] : NAV_ITEMS_BASE

  return (
    <div className="app-layout">

      <Sidebar
        items={navItems}
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
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
            Cambiar contraseña
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </header>

        {children}

        <CambiarPasswordModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          token={token}
          onSuccess={onLogout}
        />

      </div>
    </div>
  )
}

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
  onLogout: PropTypes.func.isRequired,
  token: PropTypes.string.isRequired,
}

export default AppLayout
