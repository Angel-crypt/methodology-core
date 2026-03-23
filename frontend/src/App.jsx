import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LogOut, ClipboardList, Search } from 'lucide-react'
import { Sidebar, Button } from '@/components/app'
import LoginPage from './pages/LoginPage'
import GestionAplicadores from './pages/GestionAplicadores'
import GestionInvestigadores from './pages/GestionInvestigadores'
import GalleryPage from './pages/GalleryPage'
import GestionInstrumentos from './pages/GestionInstrumentos'
import AppLayout from './layouts/AppLayout'

const USUARIOS_NAV = [
  { label: 'Aplicadores', icon: ClipboardList, to: '/usuarios/aplicadores' },
  { label: 'Investigadores', icon: Search, to: '/usuarios/investigadores' },
]

function UsuariosLayout({ onLogout, children }) {
  return (
    <div className="app-layout">
      <Sidebar
        items={USUARIOS_NAV}
        header={
          <span
            style={{
              fontSize: 'var(--font-size-small)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}
          >
            Métricas Lingüísticas
          </span>
        }
        footer={
          <Button
            variant="ghost"
            size="sm"
            icon={LogOut}
            onClick={onLogout}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            Cerrar sesión
          </Button>
        }
      />
      <div className="app-content">
        <div className="page-container">{children}</div>
      </div>
    </div>
  )
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('access_token') || '')

  function handleLogin(tk) {
    localStorage.setItem('access_token', tk)
    setToken(tk)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    setToken('')
  }

  const defaultAuthed = '/usuarios/aplicadores'

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Galería del DS — sin autenticación */}
        <Route path="/gallery" element={<GalleryPage />} />

        {/* Login */}
        <Route
          path="/login"
          element={
            token ? (
              <Navigate to={defaultAuthed} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        {/* Módulo 1 — Gestión de usuarios */}
        <Route
          path="/usuarios/aplicadores"
          element={
            token ? (
              <UsuariosLayout onLogout={handleLogout}>
                <GestionAplicadores token={token} />
              </UsuariosLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/usuarios/investigadores"
          element={
            token ? (
              <UsuariosLayout onLogout={handleLogout}>
                <GestionInvestigadores token={token} />
              </UsuariosLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Módulo 2 — Gestión de Instrumentos */}
        <Route
          path="/instruments"
          element={
            token ? (
              <AppLayout onLogout={handleLogout}>
                <GestionInstrumentos token={token} />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Redirect raíz */}
        <Route
          path="*"
          element={<Navigate to={token ? defaultAuthed : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
