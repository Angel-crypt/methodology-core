import { useState } from 'react'
import PropTypes from 'prop-types'
import { BookOpen, ClipboardList, Users } from 'lucide-react'
import { Sidebar, GlobalSearch, ProfileDropdown } from '@/components/app'
import CambiarPasswordModal from '@/pages/CambiarPasswordModal'

// ── Helpers ─────────────────────────────────────────────────────────────────

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      role:     payload.role     ?? null,
      fullName: payload.full_name ?? '',
      email:    payload.email    ?? '',
    }
  } catch {
    return { role: null, fullName: '', email: '' }
  }
}

function getNavSections(role) {
  const sections = [
    {
      id:    'gestion',
      label: role === 'administrator' ? 'GESTIÓN' : null,
      items: [
        { label: 'Instrumentos', icon: BookOpen, to: '/instruments' },
      ],
    },
  ]

  if (role === 'administrator') {
    sections.push({
      id:    'usuarios',
      label: 'USUARIOS',
      items: [
        { label: 'Aplicadores',    icon: ClipboardList, to: '/usuarios/aplicadores'   },
        { label: 'Investigadores', icon: Users,         to: '/usuarios/investigadores' },
      ],
    })
  }

  return sections
}

// ── Componente ───────────────────────────────────────────────────────────────

/**
 * AppLayout
 * Layout raíz para páginas autenticadas.
 * Compone Sidebar lateral colapsable + Topbar con búsqueda y perfil.
 *
 * Props:
 *   children  ReactNode
 *   onLogout  () => void
 *   token     string — JWT activo
 */
function AppLayout({ children, onLogout, token }) {
  const { role, fullName, email } = decodeToken(token)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )
  const [modalOpen, setModalOpen] = useState(false)

  function handleToggleSidebar() {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const sections = getNavSections(role)
  const esAdmin  = role === 'administrator'

  return (
    <div className="app-layout">

      <Sidebar
        sections={sections}
        isCollapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        user={{ fullName, role }}
        onLogout={onLogout}
      />

      <div className="app-content">

        {/* Topbar */}
        <header className="topbar">
          {esAdmin && <GlobalSearch token={token} />}
          <div style={{ flex: 1 }} />
          <ProfileDropdown
            fullName={fullName}
            role={role}
            email={email}
            onChangePassword={() => setModalOpen(true)}
          />
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
  token:    PropTypes.string.isRequired,
}

export default AppLayout
