import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeft, Copy, Monitor } from 'lucide-react'
import {
  Button,
  Alert,
  RoleBadge,
  StatusBadge,
  Typography,
  ToastContainer,
  useToast,
} from '@/components/app'
import {
  obtenerUsuario,
  listarSesionesUsuario,
  cambiarEstadoUsuario,
  resetearPassword,
} from '@/services/users'
import { formatFecha, getUserStatus } from '@/hooks/useGestionUsuarios'
import CredencialesModal from '@/pages/CredencialesModal'

// ── Estilos comunes ──────────────────────────────────────────────────────────

const LABEL_STYLE = {
  fontSize:     'var(--font-size-label)',
  color:        'var(--color-text-secondary)',
  marginBottom: 'var(--space-1)',
}

// ── Componente ───────────────────────────────────────────────────────────────

/**
 * DetalleAplicadorPage
 * Página de detalle de un aplicador: datos de cuenta, acciones administrativas,
 * sesiones activas y configuración de permisos de Registro Operativo.
 *
 * Ruta: /usuarios/aplicadores/:id
 * Solo Administrador.
 *
 * Props:
 *   token  string — JWT activo
 */
function DetalleAplicadorPage({ backTo = '/usuarios/aplicadores', backLabel = 'Aplicadores' }) {
  const { token } = useAuth()
  const { id }       = useParams()
  const location     = useLocation()
  const navigate     = useNavigate()
  const { toasts, toast, dismiss } = useToast()

  // ── Estado — Usuario ────────────────────────────────────────────
  const [usuario,         setUsuario]         = useState(location.state?.usuario || null)
  const [cargandoUsuario, setCargandoUsuario] = useState(!location.state?.usuario)
  const [errorUsuario,    setErrorUsuario]    = useState(null)

  // ── Estado — Sesiones ───────────────────────────────────────────
  const [sesiones,          setSesiones]          = useState([])
  const [cargandoSesiones,  setCargandoSesiones]  = useState(true)
  const [errorSesiones,     setErrorSesiones]     = useState(false)

  // ── Estado — Acciones ───────────────────────────────────────────
  const [guardandoEstado,    setGuardandoEstado]    = useState(false)
  const [guardandoReset,     setGuardandoReset]     = useState(false)
  const [modalCredenciales,  setModalCredenciales]  = useState(false)
  const [credencialesNuevas, setCredencialesNuevas] = useState(null)

  // ── Fetch: usuario (solo si no viene en location.state) ─────────
  useEffect(() => {
    if (usuario) return
    setCargandoUsuario(true)
    obtenerUsuario(token, id)
      .then((data) => {
        if (data.status === 'success') setUsuario(data.data)
        else setErrorUsuario(data.message || 'No se pudo cargar el usuario.')
      })
      .catch(() => setErrorUsuario('Error de conexión.'))
      .finally(() => setCargandoUsuario(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  // ── Fetch: sesiones ─────────────────────────────────────────────
  useEffect(() => {
    setCargandoSesiones(true)
    listarSesionesUsuario(token, id)
      .then((data) => {
        if (data.status === 'success') setSesiones(data.data)
        else setErrorSesiones(true)
      })
      .catch(() => setErrorSesiones(true))
      .finally(() => setCargandoSesiones(false))
  }, [id, token])

  // ── Handlers — Acciones ─────────────────────────────────────────

  async function handleCambiarEstado() {
    if (!usuario) return
    setGuardandoEstado(true)
    try {
      const data = await cambiarEstadoUsuario(token, id, !usuario.active)
      if (data.status === 'success') {
        setUsuario((prev) => ({ ...prev, active: !prev.active }))
        toast({
          type: 'success',
          title: usuario.active ? 'Cuenta desactivada' : 'Cuenta activada',
          message: `La cuenta de ${usuario.full_name} fue ${usuario.active ? 'desactivada' : 'activada'}.`,
        })
      } else {
        toast({ type: 'error', title: 'Error', message: data.message || 'No se pudo cambiar el estado.' })
      }
    } catch {
      toast({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setGuardandoEstado(false)
    }
  }

  async function handleResetearPassword() {
    if (!usuario) return
    setGuardandoReset(true)
    try {
      const data = await resetearPassword(token, id)
      if (data.status === 'success') {
        const setupToken = data.data?._mock_setup_token
        setCredencialesNuevas({ email: usuario.email, setupToken, nombreUsuario: usuario.full_name })
        setModalCredenciales(true)
      } else {
        toast({ type: 'error', title: 'Error', message: data.message || 'No se pudo restablecer la contraseña.' })
      }
    } catch {
      toast({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setGuardandoReset(false)
    }
  }

  // ── Render — estados de carga / error ───────────────────────────

  if (cargandoUsuario) {
    return (
      <main className="page-container">
        <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>Cargando...</Typography>
      </main>
    )
  }

  if (errorUsuario || !usuario) {
    return (
      <main className="page-container">
        <Button variant="ghost" icon={ChevronLeft} size="sm" onClick={() => navigate(backTo)}>
          {backLabel}
        </Button>
        <Alert variant="error" style={{ marginTop: 'var(--space-4)' }}>
          {errorUsuario || 'Usuario no encontrado.'}
        </Alert>
      </main>
    )
  }

  const status  = getUserStatus(usuario)
  const roleKey = usuario.role === 'superadmin' ? 'admin'
                : usuario.role === 'applicator'    ? 'aplicador'
                : 'researcher'

  // ── Render ──────────────────────────────────────────────────────

  return (
    <main className="page-container">

      {/* Breadcrumb */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Button variant="ghost" icon={ChevronLeft} size="sm" onClick={() => navigate(backTo)}>
          {backLabel}
        </Button>
      </div>

      {/* Header */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           'var(--space-3)',
        marginBottom:  'var(--space-6)',
        flexWrap:      'wrap',
      }}>
        <Typography as="h1" style={{ margin: 0 }}>{usuario.full_name}</Typography>
        <RoleBadge role={roleKey} />
        <StatusBadge status={status} />
      </div>

      {/* ── Fila superior: 3 tarjetas igual altura ────────────── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap:                 'var(--space-5)',
        marginBottom:        'var(--space-5)',
        alignItems:          'stretch',
      }}>

        {/* Datos de cuenta */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
          <Typography as="h2">Datos de cuenta</Typography>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <dt style={LABEL_STYLE}>Correo electrónico</dt>
              <dd style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                {usuario.email}
                <button
                  type="button"
                  title="Copiar correo"
                  aria-label="Copiar correo electrónico"
                  onClick={() => {
                    navigator.clipboard.writeText(usuario.email).then(() =>
                      toast({ type: 'success', title: 'Copiado', message: 'Correo copiado al portapapeles.' })
                    )
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, padding: 'var(--space-1)', borderRadius: 'var(--radius-sm)',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <Copy size={13} />
                </button>
              </dd>
            </div>
            <div>
              <dt style={LABEL_STYLE}>Creado</dt>
              <dd style={{ color: 'var(--color-text-primary)' }}>{formatFecha(usuario.created_at)}</dd>
            </div>
            {usuario.updated_at && usuario.updated_at !== usuario.created_at && (
              <div>
                <dt style={LABEL_STYLE}>Última modificación</dt>
                <dd style={{ color: 'var(--color-text-primary)' }}>{formatFecha(usuario.updated_at)}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Sesiones activas */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: '100%' }}>
          <Typography as="h2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Monitor size={16} aria-hidden="true" />
            Sesiones activas
          </Typography>
          {cargandoSesiones ? (
            <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>Cargando...</Typography>
          ) : errorSesiones ? (
            <Typography as="small" style={{ color: 'var(--color-error)' }}>
              No se pudieron cargar las sesiones.
            </Typography>
          ) : sesiones.length === 0 ? (
            <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
              Sin sesiones activas.
            </Typography>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {sesiones.map((s) => (
                <li
                  key={s.jti}
                  style={{
                    padding:      'var(--space-2) var(--space-3)',
                    background:   'var(--color-bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize:     'var(--font-size-caption)',
                    display:      'flex',
                    justifyContent: 'space-between',
                    gap:          'var(--space-2)',
                  }}
                >
                  <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                    {s.ip}
                  </span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{formatFecha(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Acciones — derecha */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: '100%' }}>
          <Typography as="h2">Acciones</Typography>
          <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
            Gestión de credenciales y estado de la cuenta.
          </Typography>
          <div style={{ flex: 1 }} />
          <Button
            variant="secondary"
            loading={guardandoReset}
            onClick={handleResetearPassword}
          >
            {status === 'pending' ? 'Regenerar contraseña' : 'Restablecer contraseña'}
          </Button>
          <Button
            variant={usuario.active ? 'danger' : 'primary'}
            loading={guardandoEstado}
            onClick={handleCambiarEstado}
          >
            {usuario.active ? 'Desactivar cuenta' : 'Activar cuenta'}
          </Button>
        </section>
      </div>


      {credencialesNuevas && (
        <CredencialesModal
          open={modalCredenciales}
          onClose={() => setModalCredenciales(false)}
          email={credencialesNuevas.email}
          setupToken={credencialesNuevas.setupToken}
          nombreUsuario={credencialesNuevas.nombreUsuario}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

DetalleAplicadorPage.propTypes = {
  backTo:    PropTypes.string,
  backLabel: PropTypes.string,
}

export default DetalleAplicadorPage
