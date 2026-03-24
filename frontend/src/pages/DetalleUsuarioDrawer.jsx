import PropTypes from 'prop-types'
import { Modal, RoleBadge, StatusBadge } from '@/components/app'

/**
 * DetalleUsuarioDrawer
 * Panel de solo lectura con los datos completos de un usuario.
 * Se abre al hacer clic sobre una fila en las tablas de gestión.
 *
 * Props:
 *   open      boolean
 *   onClose   () => void
 *   usuario   objeto usuario del store (full_name, email, role, active,
 *             must_change_password, created_at, updated_at)
 *   formatFecha  (isoString) => string — reutilizada del hook
 */
function DetalleUsuarioDrawer({ open, onClose, usuario, formatFecha }) {
  if (!usuario) return null

  const status = !usuario.active
    ? 'inactive'
    : usuario.must_change_password
      ? 'pending'
      : 'active'

  const roleKey =
    usuario.role === 'administrator' ? 'admin'
    : usuario.role === 'applicator'  ? 'aplicador'
    : 'researcher'

  return (
    <Modal open={open} onClose={onClose} title="Detalle de usuario" size="sm">
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <dt style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
            Nombre completo
          </dt>
          <dd style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
            {usuario.full_name}
          </dd>
        </div>

        <div>
          <dt style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
            Correo electrónico
          </dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>
            {usuario.email}
          </dd>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
          <div>
            <dt style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Rol
            </dt>
            <dd><RoleBadge role={roleKey} /></dd>
          </div>
          <div>
            <dt style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Estado
            </dt>
            <dd><StatusBadge status={status} /></dd>
          </div>
        </div>

        <div>
          <dt style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
            Creado
          </dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>
            {formatFecha(usuario.created_at)}
          </dd>
        </div>

        {usuario.updated_at && usuario.updated_at !== usuario.created_at && (
          <div>
            <dt style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Última modificación
            </dt>
            <dd style={{ color: 'var(--color-text-primary)' }}>
              {formatFecha(usuario.updated_at)}
            </dd>
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
    full_name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    active: PropTypes.bool,
    must_change_password: PropTypes.bool,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
  }),
  formatFecha: PropTypes.func.isRequired,
}

export default DetalleUsuarioDrawer
