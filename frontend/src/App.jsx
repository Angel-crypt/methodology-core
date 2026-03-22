import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GalleryPage from './pages/GalleryPage'
import LoginPage from './pages/LoginPage'
import GestionInstrumentos from './pages/GestionInstrumentos'
import AppLayout from './layouts/AppLayout'

function App() {
  const [token, setToken] = useState('')

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
            token
              ? <Navigate to="/instruments" replace />
              : <LoginPage onLogin={setToken} />
          }
        />

        {/* Módulo 2 — Gestión de Instrumentos */}
        <Route
          path="/instruments"
          element={
            token
              ? (
                <AppLayout onLogout={() => setToken('')}>
                  <GestionInstrumentos token={token} />
                </AppLayout>
              )
              : <Navigate to="/login" replace />
          }
        />

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