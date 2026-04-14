/**
 * App — árbol de rutas de la aplicación.
 * La autenticación se gestiona a través de AuthProvider/useAuth; no hay prop drilling de token.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { UserProvider, useUser } from './contexts/UserContext'
import LoginPage from './pages/LoginPage'
import SystemLoginPage from './pages/SystemLoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import GestionAplicadores from './pages/GestionAplicadores'
import GestionInvestigadores from './pages/GestionInvestigadores'
import GestionInstrumentos from './pages/GestionInstrumentos'
import CambiarPasswordModal from './pages/CambiarPasswordModal'
import SetupPage from './pages/SetupPage'
import RegistroOperativoWizardPage from './pages/RegistroOperativoWizardPage'
import MisRegistrosPage from './pages/MisRegistrosPage'
import DetalleUsuarioPage from './pages/DetalleUsuarioPage'
import InstrumentoDetallePage from './pages/InstrumentoDetallePage'
import SuperadminProfileConfigPage from './pages/SuperadminProfileConfigPage'
import InstitutionsPage from './pages/InstitutionsPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import OnboardingPage from './pages/OnboardingPage'
import AppLayout from './layouts/AppLayout'

const SYSTEM_LOGIN_PATH = import.meta.env.VITE_SYSTEM_LOGIN_PATH || '/__sys-auth'

function AppRoutes() {
  const { token, role, mustChangePassword, login, logout } = useAuth()
  const { user, loadingUser } = useUser()

  // Superadmin está exento de terms/onboarding.
  // Researcher y applicator deben aceptar T&C antes del onboarding.
  const needsTerms = !loadingUser && user && role !== 'superadmin' && !user.terms_accepted_at
  const needsOnboarding = !loadingUser && user && role !== 'superadmin' && user.terms_accepted_at && !user.onboarding_completed

  // Cuando hay cambio de contraseña pendiente, montamos AppLayout vacío para
  // que el modal forzado se muestre sin que las páginas hagan fetch en background.
  const authedLayout = (page) => {
    if (!token) return <Navigate to="/login" replace />
    if (mustChangePassword) return <AppLayout>{null}</AppLayout>
    if (needsTerms) return <Navigate to="/terminos" replace />
    if (needsOnboarding) return <Navigate to="/onboarding" replace />
    return <AppLayout>{page}</AppLayout>
  }

  const adminLayout = (page) => {
    if (!token) return <Navigate to="/login" replace />
    if (role !== 'superadmin') return <Navigate to="/instruments" replace />
    if (mustChangePassword) return <AppLayout>{null}</AppLayout>
    return <AppLayout>{page}</AppLayout>
  }

  const applicatorLayout = (page) => {
    if (!token) return <Navigate to="/login" replace />
    if (role !== 'applicator') return <Navigate to="/instruments" replace />
    if (mustChangePassword) return <AppLayout>{null}</AppLayout>
    if (needsTerms) return <Navigate to="/terminos" replace />
    if (needsOnboarding) return <Navigate to="/onboarding" replace />
    return <AppLayout>{page}</AppLayout>
  }

  return (
    <>
      <Routes>
        {/* Configuración inicial de cuenta — enlace enviado por el administrador */}
        <Route path="/setup" element={<SetupPage />} />

        {/* Login público — solo Google */}
        <Route
          path="/login"
          element={
            token
              ? <Navigate to="/instruments" replace />
              : <LoginPage onLogin={login} />
          }
        />

        {/* Acceso de sistema — email+password, exclusivo superadmin */}
        <Route
          path={SYSTEM_LOGIN_PATH}
          element={
            token
              ? <Navigate to="/instruments" replace />
              : <SystemLoginPage onLogin={login} />
          }
        />

        {/* Callback de Google OIDC */}
        <Route path="/auth/callback" element={<AuthCallbackPage onLogin={login} />} />

        {/* Módulo 2 — Gestión de Instrumentos */}
        <Route path="/instruments" element={authedLayout(<GestionInstrumentos />)} />
        <Route path="/instruments/:id" element={authedLayout(<InstrumentoDetallePage />)} />

        {/* Módulo 4 — Registro Operativo Anonimizado (solo Aplicador) */}
        <Route
          path="/registro-operativo"
          element={applicatorLayout(<RegistroOperativoWizardPage />)}
        />
        <Route
          path="/mis-registros"
          element={applicatorLayout(<MisRegistrosPage />)}
        />

        {/* Módulo 1 — Gestión de usuarios (solo Administrador) */}
        <Route path="/usuarios/aplicadores" element={adminLayout(<GestionAplicadores />)} />
        <Route path="/usuarios/investigadores" element={adminLayout(<GestionInvestigadores />)} />
        <Route path="/usuarios/aplicadores/:id" element={adminLayout(<DetalleUsuarioPage />)} />
        <Route
          path="/usuarios/investigadores/:id"
          element={adminLayout(
            <DetalleUsuarioPage backTo="/usuarios/investigadores" backLabel="Investigadores" />
          )}
        />

        {/* Módulo 2-PROJECT — Gestión de Proyectos (solo Administrador) */}
        <Route path="/proyectos" element={adminLayout(<ProjectsPage />)} />
        <Route path="/proyectos/:id" element={adminLayout(<ProjectDetailPage />)} />

        {/* Sprint 4 — Instituciones y config de perfil (solo Administrador) */}
        <Route path="/instituciones" element={adminLayout(<InstitutionsPage />)} />
        <Route path="/configuracion-perfil" element={adminLayout(<SuperadminProfileConfigPage />)} />

        {/* Configuración Operativa global — deprecada (CF-014), redirige a proyectos */}
        <Route path="/configuracion-operativa" element={<Navigate to="/proyectos" replace />} />

        {/* Sprint 4 — Legal y onboarding */}
        <Route
          path="/terminos"
          element={token ? <TermsPage /> : <Navigate to="/login" replace />}
        />
        <Route path="/aviso-privacidad" element={<PrivacyPage />} />

        <Route
          path="/onboarding"
          element={token ? <OnboardingPage /> : <Navigate to="/login" replace />}
        />

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
          onSuccess={logout}
          forced={true}
        />
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <UserProvider>
          <AppRoutes />
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
