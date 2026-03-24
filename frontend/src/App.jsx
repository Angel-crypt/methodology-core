import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import GalleryPage from './pages/GalleryPage'
import GestionAplicadores from './pages/GestionAplicadores'
import GestionInvestigadores from './pages/GestionInvestigadores'
import GestionInstrumentos from './pages/GestionInstrumentos'
import AppLayout from './layouts/AppLayout'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('access_token') || '')

  function handleLogin(tk) {
    localStorage.setItem('access_token', tk)
    setToken(tk)
  }

  async function handleLogout() {
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // best effort — cerrar sesión local aunque falle la revocación
      }
    }
    localStorage.removeItem('access_token')
    setToken('')
  }

  function getRoleFromToken(tk) {
    try {
      return JSON.parse(atob(tk.split('.')[1])).role
    } catch {
      return null
    }
  }

  const authedLayout = (page) =>
    token ? (
      <AppLayout onLogout={handleLogout} token={token}>{page}</AppLayout>
    ) : (
      <Navigate to="/login" replace />
    )

  const adminLayout = (page) => {
    if (!token) return <Navigate to="/login" replace />
    if (getRoleFromToken(token) !== 'administrator') return <Navigate to="/instruments" replace />
    return <AppLayout onLogout={handleLogout} token={token}>{page}</AppLayout>
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Dev — galería de componentes, sin autenticación */}
        <Route path="/gallery" element={<GalleryPage />} />

        {/* Login */}
        <Route
          path="/login"
          element={
            token
              ? <Navigate to="/instruments" replace />
              : <LoginPage onLogin={handleLogin} />
          }
        />

        {/* Módulo 2 — Gestión de Instrumentos */}
        <Route path="/instruments" element={authedLayout(<GestionInstrumentos token={token} />)} />

        {/* Módulo 1 — Gestión de usuarios (solo Administrador) */}
        <Route path="/usuarios/aplicadores" element={adminLayout(<GestionAplicadores token={token} />)} />
        <Route path="/usuarios/investigadores" element={adminLayout(<GestionInvestigadores token={token} />)} />

        {/* Redirect raíz */}
        <Route
          path="*"
          element={<Navigate to={token ? '/instruments' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
