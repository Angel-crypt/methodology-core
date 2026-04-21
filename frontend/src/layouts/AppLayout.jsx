/**
 * AppLayout — layout raíz para páginas autenticadas.
 * Lee token, role, logout desde AuthContext; no acepta props de autenticación.
 */
import { useState } from 'react'
import PropTypes from 'prop-types'
import { BookOpen, ClipboardList, ClipboardCheck, Database, Download, FolderOpen, Users, Building2, Settings, ShieldAlert } from 'lucide-react'
import { Sidebar, GlobalSearch, ProfileDropdown } from '@/components/app'
import CambiarPasswordModal from '@/pages/CambiarPasswordModal'
import SolicitarCambioCorreoModal from '@/components/SolicitarCambioCorreoModal'
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/contexts/UserContext'

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

  if (role === 'researcher') {
    sections.push({
      id:    'consulta',
      label: 'DATOS',
      items: [
        { label: 'Consulta',    icon: Database, to: '/consulta' },
        { label: 'Exportación', icon: Download,  to: '/exportar' },
      ],
    })
  }

  if (role === 'applicator') {
    sections.push({
      id:    'registro',
      label: 'REGISTRO',
      items: [
        { label: 'Registro Operativo', icon: ClipboardCheck, to: '/registro-operativo' },
        { label: 'Mis Registros',      icon: ClipboardList,  to: '/mis-registros'       },
        { label: 'Mis Usuarios',       icon: Users,          to: '/mis-usuarios'       },
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
      id:    'consulta',
      label: 'CONSULTA',
      items: [
        { label: 'Dataset', icon: Database, to: '/consulta' },
      ],
    })
    sections.push({
      id:    'proyectos',
      label: 'PROYECTOS',
      items: [
        { label: 'Proyectos', icon: FolderOpen, to: '/proyectos' },
      ],
    })
    sections.push({
      id:    'sistema',
      label: 'SISTEMA',
      items: [
        { label: 'Instituciones',       icon: Building2,  to: '/instituciones'       },
        { label: 'Config. de perfil',   icon: Settings,   to: '/configuracion-perfil' },
        { label: 'Audit Log',           icon: ShieldAlert, to: '/audit-log'           },
      ],
    })
  }

  return sections
}

function AppLayout({ children }) {
  const { role, logout } = useAuth()
  const { user } = useUser()
  const fullName = user?.full_name ?? ''
  const email    = user?.email    ?? ''

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
            onChangePassword={esAdmin ? () => setModalOpen(true) : undefined}
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
