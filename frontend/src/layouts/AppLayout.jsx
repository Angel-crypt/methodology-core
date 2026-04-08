/**
 * AppLayout — layout raíz para páginas autenticadas.
 * Lee token, role, logout desde AuthContext; no acepta props de autenticación.
 */
import { useState } from 'react'
import PropTypes from 'prop-types'
import { BookOpen, ClipboardList, ClipboardCheck, Settings, Users } from 'lucide-react'
import { Sidebar, GlobalSearch, ProfileDropdown } from '@/components/app'
import CambiarPasswordModal from '@/pages/CambiarPasswordModal'
import SolicitarCambioCorreoModal from '@/components/SolicitarCambioCorreoModal'
import { useAuth } from '@/contexts/AuthContext'

function getNavSections(role) {
  const sections = [
    {
      id:    'gestion',
      label: role === 'superadmin' ? 'GESTIÓN' : null,
      items: [
        { label: 'Instrumentos', icon: BookOpen, to: '/instruments' },
      ],
    },
  ]

  if (role === 'applicator') {
    sections.push({
      id:    'registro',
      label: 'REGISTRO',
      items: [
        { label: 'Registro Operativo', icon: ClipboardCheck, to: '/registro-operativo' },
        { label: 'Mis Registros',      icon: ClipboardList,  to: '/mis-registros'       },
      ],
    })
  }

  if (role === 'superadmin') {
    sections.push({
      id:    'usuarios',
      label: 'USUARIOS',
      items: [
        { label: 'Aplicadores',    icon: ClipboardList, to: '/usuarios/aplicadores'   },
        { label: 'Investigadores', icon: Users,         to: '/usuarios/investigadores' },
      ],
    })
    sections.push({
      id:    'config',
      label: 'CONFIGURACIÓN',
      items: [
        { label: 'Config. Operativa', icon: Settings, to: '/configuracion-operativa' },
      ],
    })
  }

  return sections
}

function decodeTokenFields(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      fullName: payload.full_name ?? '',
      email:    payload.email    ?? '',
    }
  } catch {
    return { fullName: '', email: '' }
  }
}

function AppLayout({ children }) {
  const { token, role, logout } = useAuth()
  const { fullName, email } = decodeTokenFields(token)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)

  function handleToggleSidebar() {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const sections = getNavSections(role)
  const esAdmin  = role === 'superadmin'

  return (
    <div className="app-layout">

      <Sidebar
        sections={sections}
        isCollapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        user={{ fullName, role }}
        onLogout={logout}
      />

      <div className="app-content">

        <header className="topbar">
          {esAdmin && <GlobalSearch />}
          <div style={{ flex: 1 }} />
          <ProfileDropdown
            fullName={fullName}
            role={role}
            email={email}
            onChangePassword={() => setModalOpen(true)}
            onRequestEmailChange={role !== 'superadmin' ? () => setEmailModalOpen(true) : undefined}
          />
        </header>

        {children}

        <CambiarPasswordModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={logout}
        />

        <SolicitarCambioCorreoModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
        />

      </div>
    </div>
  )
}

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default AppLayout
