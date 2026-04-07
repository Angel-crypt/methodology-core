import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import GestionAplicadores from './pages/GestionAplicadores'
import GestionInvestigadores from './pages/GestionInvestigadores'
import GestionInstrumentos from './pages/GestionInstrumentos'
import CambiarPasswordModal from './pages/CambiarPasswordModal'
import SetupPage from './pages/SetupPage'
import RegistroOperativoWizardPage from './pages/RegistroOperativoWizardPage'
import MisRegistrosPage from './pages/MisRegistrosPage'
import ConfiguracionOperativaPage from './pages/ConfiguracionOperativaPage'
import DetalleAplicadorPage from './pages/DetalleAplicadorPage'
import InstrumentoDetallePage from './pages/InstrumentoDetallePage'
import AppLayout from './layouts/AppLayout'

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('access_token') || '')
  const [mustChangePassword, setMustChangePassword] = useState(
    () => sessionStorage.getItem('must_change_password') === 'true'
  )

  function handleLogin(tk, mustChange = false) {
    sessionStorage.setItem('access_token', tk)
    if (mustChange) {
      sessionStorage.setItem('must_change_password', 'true')
    } else {
      sessionStorage.removeItem('must_change_password')
    }
    setToken(tk)
    setMustChangePassword(mustChange)
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
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('must_change_password')
    setToken('')
    setMustChangePassword(false)
  }

  // Llamado tras cambio forzado exitoso: el servidor invalidó el token,
  // hay que hacer logout para que el usuario inicie sesión con la nueva contraseña.
  function handleForcedPasswordChanged() {
    handleLogout()
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

  const applicatorLayout = (page) => {
    if (!token) return <Navigate to="/login" replace />
    if (getRoleFromToken(token) !== 'applicator') return <Navigate to="/instruments" replace />
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
        {/* Configuración inicial de cuenta — enlace enviado por el administrador */}
        <Route path="/setup" element={<SetupPage />} />

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
        <Route path="/instruments/:id" element={authedLayout(<InstrumentoDetallePage token={token} />)} />

        {/* Módulo 4 — Registro Operativo Anonimizado (solo Aplicador) */}
        <Route
          path="/registro-operativo"
          element={applicatorLayout(<RegistroOperativoWizardPage token={token} />)}
        />
        <Route
          path="/mis-registros"
          element={applicatorLayout(<MisRegistrosPage token={token} />)}
        />

        {/* Módulo 1 — Gestión de usuarios (solo Administrador) */}
        <Route path="/usuarios/aplicadores" element={adminLayout(<GestionAplicadores token={token} />)} />
        <Route path="/usuarios/investigadores" element={adminLayout(<GestionInvestigadores token={token} />)} />
        <Route path="/usuarios/aplicadores/:id" element={adminLayout(<DetalleAplicadorPage token={token} />)} />
        <Route path="/usuarios/investigadores/:id" element={adminLayout(
          <DetalleAplicadorPage token={token} backTo="/usuarios/investigadores" backLabel="Investigadores" />
        )} />

        {/* Configuración Operativa (solo Administrador) */}
        <Route path="/configuracion-operativa" element={adminLayout(<ConfiguracionOperativaPage token={token} />)} />

        {/* Redirect raíz */}
        <Route
          path="*"
          element={<Navigate to={token ? '/instruments' : '/login'} replace />}
        />
      </Routes>

      {token && mustChangePassword && (
        <CambiarPasswordModal
          open={true}
          onClose={() => {}}
          token={token}
          onSuccess={handleForcedPasswordChanged}
          forced={true}
        />
      )}
    </BrowserRouter>
  )
}

export default App
