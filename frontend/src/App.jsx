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

  function handleLogout() {
    localStorage.removeItem('access_token')
    setToken('')
  }

  const authedLayout = (page) =>
    token ? (
      <AppLayout onLogout={handleLogout}>{page}</AppLayout>
    ) : (
      <Navigate to="/login" replace />
    )

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

        {/* Módulo 1 — Gestión de usuarios */}
        <Route path="/usuarios/aplicadores" element={authedLayout(<GestionAplicadores token={token} />)} />
        <Route path="/usuarios/investigadores" element={authedLayout(<GestionInvestigadores token={token} />)} />

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
