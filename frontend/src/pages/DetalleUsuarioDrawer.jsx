import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Monitor } from 'lucide-react'
import { Modal, RoleBadge, StatusBadge } from '@/components/app'
import { useAuth } from '@/contexts/AuthContext'
import { listarSesionesUsuario } from '@/services/users'

/**
 * DetalleUsuarioDrawer
 * Panel de solo lectura con los datos completos de un usuario.
 * Si esAdmin=true, carga y muestra las sesiones activas del usuario.
 *
 * Props:
 *   open        boolean
 *   onClose     () => void
 *   usuario     objeto usuario (full_name, email, role, active, must_change_password, created_at, updated_at)
 *   formatFecha (isoString) => string
 *   token       string — JWT del admin (para cargar sesiones)
 *   esAdmin     boolean
 */
function DetalleUsuarioDrawer({ open, onClose, usuario, formatFecha, esAdmin }) {
  const { token } = useAuth()
  const [sesiones, setSesiones] = useState([])
  const [cargandoSesiones, setCargandoSesiones] = useState(false)
  const [errorSesiones, setErrorSesiones] = useState(false)

  useEffect(() => {
    if (!open || !esAdmin || !usuario) return
    setCargandoSesiones(true)
    setSesiones([])
    setErrorSesiones(false)
    listarSesionesUsuario(token, usuario.id)
      .then((data) => {
        if (data.ok) {
          setSesiones(data.data)
        } else {
          setErrorSesiones(true)
        }
      })
      .catch(() => setErrorSesiones(true))
      .finally(() => setCargandoSesiones(false))
  }, [open, usuario, esAdmin, token])

  if (!usuario) return null

  const status = !usuario.active
    ? 'inactive'
    : usuario.must_change_password
      ? 'pending'
      : 'active'

  const roleKey =
    usuario.role === 'superadmin' ? 'admin'
    : usuario.role === 'applicator'  ? 'aplicador'
    : 'researcher'

  const labelStyle = { fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }

  return (
    <Modal open={open} onClose={onClose} title="Detalle de usuario" size="sm">
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <dt style={labelStyle}>Nombre completo</dt>
          <dd style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
            {usuario.full_name}
          </dd>
        </div>

        <div>
          <dt style={labelStyle}>Correo electrónico</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>{usuario.email}</dd>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
          <div>
            <dt style={labelStyle}>Rol</dt>
            <dd><RoleBadge role={roleKey} /></dd>
          </div>
          <div>
            <dt style={labelStyle}>Estado</dt>
            <dd><StatusBadge status={status} /></dd>
          </div>
        </div>

        <div>
          <dt style={labelStyle}>Creado</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>{formatFecha(usuario.created_at)}</dd>
        </div>

        {usuario.updated_at && usuario.updated_at !== usuario.created_at && (
          <div>
            <dt style={labelStyle}>Última modificación</dt>
            <dd style={{ color: 'var(--color-text-primary)' }}>{formatFecha(usuario.updated_at)}</dd>
          </div>
        )}

        {esAdmin && (
          <div>
            <dt style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <Monitor size={12} aria-hidden="true" />
              Sesiones activas
            </dt>
            {cargandoSesiones ? (
              <dd style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
                Cargando...
              </dd>
            ) : errorSesiones ? (
              <dd style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-error)' }}>
                No se pudieron cargar las sesiones.
              </dd>
            ) : sesiones.length === 0 ? (
              <dd style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
                Sin sesiones activas
              </dd>
            ) : (
              <dd>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {sesiones.map((s) => (
                    <li
                      key={s.jti}
                      style={{
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-caption)',
                      }}
                    >
                      <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                        {s.ip}
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)' }}>
                        {formatFecha(s.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            )}
          </div>
        )}
      </dl>
    </Modal>
  )
}

DetalleUsuarioDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  usuario: PropTypes.shape({
    id: PropTypes.string,
    full_name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    active: PropTypes.bool,
    must_change_password: PropTypes.bool,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
  }),
  formatFecha: PropTypes.func.isRequired,
  esAdmin: PropTypes.bool,
}

export default DetalleUsuarioDrawer
