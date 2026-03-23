import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LogOut, ClipboardList, Search } from 'lucide-react'
import { Sidebar, Button } from '@/components/app'
import LoginPage from './pages/LoginPage'
import GestionAplicadores from './pages/GestionAplicadores'
import GestionInvestigadores from './pages/GestionInvestigadores'
import GalleryPage from './pages/GalleryPage'

const NAV_ITEMS = [
  { label: 'Aplicadores', icon: ClipboardList, to: '/usuarios/aplicadores' },
  { label: 'Investigadores', icon: Search, to: '/usuarios/investigadores' },
]

function AppLayout({ onLogout, children }) {
  return (
    <div className="app-layout">
      <Sidebar
        items={NAV_ITEMS}
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
        <Route path="/gallery" element={<GalleryPage />} />

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

        <Route
          path="/usuarios/aplicadores"
          element={
            token ? (
              <AppLayout onLogout={handleLogout}>
                <GestionAplicadores token={token} />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/usuarios/investigadores"
          element={
            token ? (
              <AppLayout onLogout={handleLogout}>
                <GestionInvestigadores token={token} />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to={token ? defaultAuthed : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
