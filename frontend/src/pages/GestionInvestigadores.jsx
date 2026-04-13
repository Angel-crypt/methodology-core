import { useEffect } from 'react'
import PropTypes from 'prop-types'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Power, RotateCcw, Search } from 'lucide-react'
import {
  Button,
  DataTable,
  RoleBadge,
  StatusBadge,
  Modal,
  FormField,
  Alert,
  EmptyState,
  ToastContainer,
  PillToggle,
  Typography,
} from '@/components/app'
import {
  useGestionUsuarios,
  FILTROS_ESTADO,
  formatFecha,
  getUserStatus,
} from '@/hooks/useGestionUsuarios'
import CredencialesModal from '@/pages/CredencialesModal'
import DetalleUsuarioDrawer from '@/pages/DetalleUsuarioDrawer'

/**
 * GestionInvestigadores — Gestión de Usuarios
 * Cubre: RF-M1-LIST, RF-M1-01, RF-M1-02, RF-M1-RESET para role=researcher
 *
 * Props:
 *   token string — JWT para autenticar llamadas a la API
 */
function GestionInvestigadores({ token }) {
  const {
    esAdmin,
    usuarios,
    cargando,
    filtroEstado,
    setFiltroEstado,
    modalCrear,
    setModalCrear,
    modalEstado,
    setModalEstado,
    usuarioSeleccionado,
    modalCredenciales,
    credencialesNuevas,
    cerrarModalCredenciales,
    formCrear,
    erroresCrear,
    errorApiCrear,
    guardandoCrear,
    errorApiEstado,
    guardandoEstado,
    guardandoReset,
    toasts,
    dismiss,
    abrirModalCrear,
    handleChangeCrear,
    handleGuardarCrear,
    abrirModalEstado,
    handleConfirmarEstado,
    handleResetearPassword,
    drawerUsuario,
    abrirDetalle,
    cerrarDetalle,
    searchQuery,
    setSearchQuery,
    usuariosFiltrados,
    usuariosConSesion,
  } = useGestionUsuarios({ token, role: 'researcher', labelSingular: 'investigador' })

  const location = useLocation()
  const navigate = useNavigate()

  // Navegación desde GlobalSearch: abrir drawer o modal de creación
  useEffect(() => {
    const s = location.state
    if (!s) return
    if (s.openDrawer) abrirDetalle(s.openDrawer)
    if (s.openCrear) abrirModalCrear()
    navigate(location.pathname, { replace: true, state: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // ─── Columnas de tabla ─────────────────────────────────────────
  const columnas = [
    { key: 'full_name', label: 'Nombre completo' },
    { key: 'email', label: 'Correo electrónico' },
    {
      key: 'role',
      label: 'Rol',
      render: (value) => (
        <RoleBadge role={value === 'administrator' ? 'admin' : value === 'applicator' ? 'aplicador' : 'researcher'} />
      ),
    },
    {
      key: 'active',
      label: 'Estado',
      render: (_, row) => <StatusBadge status={getUserStatus(row)} />,
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (value) => (
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
          {formatFecha(value)}
        </span>
      ),
    },
    {
      key: '_session',
      label: 'Sesión',
      render: (_, row) => usuariosConSesion.has(row.id)
        ? <span className="session-dot session-dot--active" title="Sesión activa" aria-label="Sesión activa" />
        : <span className="session-dot session-dot--inactive" title="Sin sesión" aria-label="Sin sesión activa" />,
    },
    ...(esAdmin ? [{
      key: 'id',
      label: 'Acciones',
      render: (_, row) => {
        const status = getUserStatus(row)

        if (status === 'inactive') {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                variant="secondary"
                size="sm"
                icon={Power}
                onClick={() => abrirModalEstado(row)}
                aria-label={`Activar a ${row.full_name}`}
              >
                Activar
              </Button>
            </div>
          )
        }

        // pending o active: mostrar botón de contraseña + desactivar
        return (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={() => handleResetearPassword(row)}
              loading={guardandoReset}
              aria-label={status === 'pending' ? `Regenerar contraseña de ${row.full_name}` : `Restablecer contraseña de ${row.full_name}`}
            >
              {status === 'pending' ? 'Regenerar' : 'Restablecer'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={Power}
              onClick={() => abrirModalEstado(row)}
              aria-label={`Desactivar a ${row.full_name}`}
            >
              Desactivar
            </Button>
          </div>
        )
      },
    }] : []),
  ]

  // ─── Render ────────────────────────────────────────────────────
  return (
    <main className="page-container">
      {/* Encabezado */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Investigadores</Typography>
        <Typography
          as="small"
          style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}
        >
          Cuentas con permisos de consulta y exportación del dataset.
        </Typography>
      </div>

      {/* Búsqueda y filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div className="page-search-wrapper">
          <Search size={14} className="page-search-icon" aria-hidden="true" />
          <input
            className="page-search-input"
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {FILTROS_ESTADO.map(({ value, label }) => (
            <PillToggle
              key={value}
              selected={filtroEstado === value}
              onClick={() => setFiltroEstado(value)}
            >
              {label}
            </PillToggle>
          ))}
          {esAdmin && (
            <Button
              icon={Plus}
              onClick={abrirModalCrear}
              style={{ marginLeft: 'auto' }}
            >
              Nuevo investigador
            </Button>
          )}
        </div>
      </div>

      {/* Tabla / Empty state */}
      {cargando ? (
        <DataTable columns={columnas} data={[]} loading={true} />
      ) : usuarios.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin investigadores registrados"
          message="Crea el primer investigador para habilitar el acceso al dataset."
          action={
            esAdmin ? (
              <Button size="sm" icon={Plus} onClick={abrirModalCrear}>
                Nuevo investigador
              </Button>
            ) : null
          }
        />
      ) : (
        <DataTable
          columns={columnas}
          data={usuariosFiltrados}
          loading={false}
          emptyMessage="No hay investigadores que coincidan con el filtro."
          onRowClick={abrirDetalle}
        />
      )}

      {/* Modal — Crear investigador */}
      <Modal
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        title="Nuevo investigador"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              onClick={() => setModalCrear(false)}
              disabled={guardandoCrear}
            >
              Cancelar
            </Button>
            <Button onClick={handleGuardarCrear} loading={guardandoCrear}>
              Crear investigador
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorApiCrear && <Alert variant="error">{errorApiCrear}</Alert>}
          <FormField
            id="inv-crear-nombre"
            label="Nombre completo"
            placeholder="Ej. Carlos Ramírez"
            required
            value={formCrear.full_name}
            onChange={handleChangeCrear('full_name')}
            error={erroresCrear.full_name}
          />
          <FormField
            id="inv-crear-email"
            label="Correo electrónico"
            type="email"
            placeholder="usuario@institución.edu"
            required
            value={formCrear.email}
            onChange={handleChangeCrear('email')}
            error={erroresCrear.email}
          />
        </div>
      </Modal>

      {/* Modal — Confirmar cambio de estado */}
      <Modal
        open={modalEstado}
        onClose={() => setModalEstado(false)}
        title={usuarioSeleccionado?.active ? 'Desactivar cuenta' : 'Activar cuenta'}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              onClick={() => setModalEstado(false)}
              disabled={guardandoEstado}
            >
              Cancelar
            </Button>
            <Button
              variant={usuarioSeleccionado?.active ? 'danger' : 'primary'}
              onClick={handleConfirmarEstado}
              loading={guardandoEstado}
            >
              {usuarioSeleccionado?.active ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorApiEstado && <Alert variant="error">{errorApiEstado}</Alert>}
          <Typography as="body">
            {usuarioSeleccionado?.active
              ? `¿Desactivar la cuenta de ${usuarioSeleccionado?.full_name}? El usuario no podrá iniciar sesión hasta ser reactivado.`
              : `¿Activar la cuenta de ${usuarioSeleccionado?.full_name}? El usuario podrá iniciar sesión nuevamente.`}
          </Typography>
        </div>
      </Modal>

      {/* Modal — Credenciales de acceso (una sola vez) */}
      {credencialesNuevas && (
        <CredencialesModal
          open={modalCredenciales}
          onClose={cerrarModalCredenciales}
          email={credencialesNuevas.email}
          setupToken={credencialesNuevas.setupToken}
          nombreUsuario={credencialesNuevas.nombreUsuario}
        />
      )}

      {/* Drawer — Detalle de usuario */}
      <DetalleUsuarioDrawer
        open={!!drawerUsuario}
        onClose={cerrarDetalle}
        usuario={drawerUsuario}
        formatFecha={formatFecha}
        token={token}
        esAdmin={esAdmin}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

GestionInvestigadores.propTypes = {
  token: PropTypes.string.isRequired,
}

export default GestionInvestigadores
