import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Copy, Monitor, Shield } from 'lucide-react'
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
  obtenerPermisos,
  guardarPermisos,
} from '@/services/users'
import { obtenerConfigOperativo } from '@/services/config'
import { formatFecha, getUserStatus } from '@/hooks/useGestionUsuarios'
import CredencialesModal from '@/pages/CredencialesModal'
import { EDUCATION_LEVEL_META } from '@/constants/educationLevels'

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
function DetalleAplicadorPage({ token, backTo = '/usuarios/aplicadores', backLabel = 'Aplicadores' }) {
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

  // ── Estado — Config global ──────────────────────────────────────
  const [configGlobal,     setConfigGlobal]     = useState(null)
  const [cargandoConfig,   setCargandoConfig]   = useState(true)

  // ── Estado — Permisos ───────────────────────────────────────────
  const [permisos,          setPermisos]          = useState({ mode: 'libre', education_levels: [], subject_limit: null })
  const [permisosGuardados, setPermisosGuardados] = useState(null)
  const [cargandoPermisos,  setCargandoPermisos]  = useState(true)
  const [guardandoPermisos, setGuardandoPermisos] = useState(false)
  const [errorPermisos,     setErrorPermisos]     = useState(null)

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

  // ── Fetch: config global + permisos (en paralelo) ───────────────
  useEffect(() => {
    setCargandoConfig(true)
    setCargandoPermisos(true)

    Promise.all([
      obtenerConfigOperativo(token),
      obtenerPermisos(token, id),
    ]).then(([cfg, perm]) => {
      if (cfg.status === 'success')  setConfigGlobal(cfg.data)
      if (perm.status === 'success') {
        setPermisos(perm.data)
        setPermisosGuardados(perm.data)
      } else {
        setErrorPermisos(perm.message || 'No se pudieron cargar los permisos.')
      }
    }).catch(() => setErrorPermisos('Error de conexión.'))
      .finally(() => { setCargandoConfig(false); setCargandoPermisos(false) })
  }, [id, token])

  // ── Handlers — Permisos ─────────────────────────────────────────

  function toggleLevel(level) {
    setPermisos((prev) => {
      const has = prev.education_levels.includes(level)
      return {
        ...prev,
        education_levels: has
          ? prev.education_levels.filter((l) => l !== level)
          : [...prev.education_levels, level],
      }
    })
  }

  async function handleGuardarPermisos() {
    setGuardandoPermisos(true)
    setErrorPermisos(null)
    try {
      const data = await guardarPermisos(token, id, permisos)
      if (data.status === 'success') {
        setPermisosGuardados(permisos)
        toast({ type: 'success', title: 'Permisos guardados', message: 'Los permisos de acceso se actualizaron.' })
      } else {
        setErrorPermisos(data.message || 'No se pudieron guardar los permisos.')
      }
    } catch {
      setErrorPermisos('Error de conexión.')
    } finally {
      setGuardandoPermisos(false)
    }
  }

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
        setUsuario((prev) => ({ ...prev, must_change_password: true }))
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

  const nivelesDisponibles = configGlobal?.education_levels ?? []
  const nivelesTotal       = nivelesDisponibles.length

  const permisosResumen = permisos.mode === 'libre'
    ? `Libre — acceso a los ${nivelesTotal} niveles habilitados globalmente`
    : permisos.education_levels.length === 0
      ? 'Restringido — sin niveles habilitados'
      : `Restringido — ${permisos.education_levels.length} de ${nivelesTotal} nivel${nivelesTotal !== 1 ? 'es' : ''} habilitado${permisos.education_levels.length !== 1 ? 's' : ''}`

  const permisosHanCambiado = JSON.stringify(permisos) !== JSON.stringify(permisosGuardados)

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
              <dt style={LABEL_STYLE}>Permisos actuales</dt>
              <dd style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
                {cargandoPermisos ? 'Cargando...' : permisosResumen}
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

      {/* ── Permisos de acceso — ancho completo ───────────────── */}
      {usuario?.role === 'applicator' && (
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* Encabezado de sección */}
        <div>
          <Typography as="h2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <Shield size={16} aria-hidden="true" />
            Permisos de Registro Operativo
          </Typography>
          <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
            Define qué niveles educativos puede registrar este aplicador en el Módulo de Registro Operativo.
            En modo <strong>libre</strong> puede registrar sujetos de cualquier nivel. En modo <strong>restringido</strong>,
            solo puede registrar los niveles habilitados en la tabla.
          </Typography>
        </div>

        {errorPermisos && <Alert variant="error">{errorPermisos}</Alert>}

        {cargandoPermisos ? (
          <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>Cargando permisos...</Typography>
        ) : (
          <>
            {/* Selector de modo */}
            <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }}>
              <span style={LABEL_STYLE}>Modo de acceso</span>
              <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
                {[
                  { value: 'libre',      label: 'Libre',       desc: 'Accede a todos los niveles' },
                  { value: 'restricted', label: 'Restringido', desc: 'Solo niveles habilitados'  },
                ].map(({ value, label, desc }) => (
                  <label
                    key={value}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}
                  >
                    <input
                      type="radio"
                      name={`permission-mode-${id}`}
                      value={value}
                      checked={permisos.mode === value}
                      onChange={() => setPermisos((prev) => ({ ...prev, mode: value }))}
                    />
                    <span>
                      <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-body)' }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-1)' }}>
                        — {desc}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tabla de niveles educativos — solo los habilitados globalmente */}
            {(cargandoConfig || nivelesDisponibles.length === 0) ? (
              <Typography as="small" style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                {cargandoConfig
                  ? 'Cargando niveles disponibles...'
                  : 'No hay niveles educativos habilitados en la Configuración Operativa.'}
              </Typography>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
                      Nivel educativo
                    </th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
                      Descripción
                    </th>
                    <th style={{ textAlign: 'center', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)', width: '120px' }}>
                      Acceso
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nivelesDisponibles.map((level, idx) => {
                    const meta = EDUCATION_LEVEL_META[level] ?? { label: level, desc: '' }
                    const isRestricted = permisos.mode === 'restricted'
                    return (
                      <tr
                        key={level}
                        style={{
                          background:   idx % 2 === 0 ? 'transparent' : 'var(--color-bg-subtle)',
                          borderBottom: '1px solid var(--color-border)',
                          opacity:      !isRestricted ? 0.65 : 1,
                        }}
                      >
                        <td style={{ padding: 'var(--space-3)', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                          {meta.label}
                        </td>
                        <td style={{ padding: 'var(--space-3)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
                          {meta.desc}
                        </td>
                        <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                          {isRestricted ? (
                            <input
                              type="checkbox"
                              checked={permisos.education_levels.includes(level)}
                              onChange={() => toggleLevel(level)}
                              aria-label={`Habilitar ${meta.label}`}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          ) : (
                            <span
                              style={{
                                display:        'inline-flex',
                                alignItems:     'center',
                                justifyContent: 'center',
                                width:          '20px',
                                height:         '20px',
                                borderRadius:   '50%',
                                background:     'var(--color-success)',
                                fontSize:       '11px',
                                color:          'var(--color-primary-text)',
                              }}
                              aria-label="Acceso completo (modo libre)"
                            >
                              ✓
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {/* Límite de sujetos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="subject-limit"
                  style={{ ...LABEL_STYLE, display: 'block' }}
                >
                  Límite de sujetos registrables
                </label>
                <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
                  Máximo de sujetos que este aplicador puede registrar. Dejar en 0 para sin límite.
                </Typography>
              </div>
              <input
                id="subject-limit"
                type="number"
                min="0"
                step="1"
                className="input-base"
                style={{ width: '120px' }}
                value={permisos.subject_limit ?? ''}
                placeholder="Sin límite"
                onChange={(e) => {
                  const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
                  setPermisos((prev) => ({ ...prev, subject_limit: v === 0 ? null : v }))
                }}
              />
            </div>

            {/* Pie de sección */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
                {permisos.mode === 'libre'
                  ? `Acceso libre a los ${nivelesTotal} niveles habilitados globalmente.`
                  : `${permisos.education_levels.length} de ${nivelesTotal} niveles habilitados.`}
                {permisos.subject_limit ? ` Límite: ${permisos.subject_limit} sujetos.` : ''}
              </Typography>
              <Button
                onClick={handleGuardarPermisos}
                loading={guardandoPermisos}
                disabled={!permisosHanCambiado}
              >
                Guardar permisos
              </Button>
            </div>
          </>
        )}
      </section>
      )}

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
  token:     PropTypes.string.isRequired,
  backTo:    PropTypes.string,
  backLabel: PropTypes.string,
}

export default DetalleAplicadorPage
