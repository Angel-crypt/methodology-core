import PropTypes from 'prop-types'
import { Plus, Power, ClipboardList } from 'lucide-react'
import {
  Button,
  DataTable,
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
} from '@/hooks/useGestionUsuarios'

/**
 * GestionAplicadores — Gestión de Usuarios
 * Cubre: RF-M1-LIST, RF-M1-01, RF-M1-02 para role=applicator
 *
 * Props:
 *   token string — JWT para autenticar llamadas a la API
 */
function GestionAplicadores({ token }) {
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
    formCrear,
    erroresCrear,
    errorApiCrear,
    guardandoCrear,
    errorApiEstado,
    guardandoEstado,
    toasts,
    dismiss,
    abrirModalCrear,
    handleChangeCrear,
    handleGuardarCrear,
    abrirModalEstado,
    handleConfirmarEstado,
  } = useGestionUsuarios({ token, role: 'applicator', labelSingular: 'aplicador' })

  // ─── Columnas de tabla ─────────────────────────────────────────
  const columnas = [
    { key: 'full_name', label: 'Nombre completo' },
    { key: 'email', label: 'Correo electrónico' },
    {
      key: 'active',
      label: 'Estado',
      render: (value) => <StatusBadge status={value ? 'active' : 'inactive'} />,
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
    ...(esAdmin ? [{
      key: 'id',
      label: 'Acciones',
      render: (_, row) => (
        <Button
          variant={row.active ? 'danger' : 'secondary'}
          size="sm"
          icon={Power}
          onClick={() => abrirModalEstado(row)}
          aria-label={`${row.active ? 'Desactivar' : 'Activar'} a ${row.full_name}`}
        >
          {row.active ? 'Desactivar' : 'Activar'}
        </Button>
      ),
    }] : []),
  ]

  // ─── Render ────────────────────────────────────────────────────
  return (
    <main className="page-container">
      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div>
          <Typography as="h1">Profesionales Aplicadores</Typography>
          <Typography
            as="small"
            style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}
          >
            Cuentas con permisos de registro de sujetos y captura de métricas.
          </Typography>
        </div>
        {esAdmin && (
          <Button icon={Plus} onClick={abrirModalCrear}>
            Nuevo aplicador
          </Button>
        )}
      </div>

      {/* Filtros de estado */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {FILTROS_ESTADO.map(({ value, label }) => (
          <PillToggle
            key={value}
            selected={filtroEstado === value}
            onClick={() => setFiltroEstado(value)}
          >
            {label}
          </PillToggle>
        ))}
      </div>

      {/* Tabla / Empty state */}
      {cargando ? (
        <DataTable columns={columnas} data={[]} loading={true} />
      ) : usuarios.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin aplicadores registrados"
          message="Crea el primer profesional aplicador para comenzar."
          action={
            esAdmin ? (
              <Button size="sm" icon={Plus} onClick={abrirModalCrear}>
                Nuevo aplicador
              </Button>
            ) : null
          }
        />
      ) : (
        <DataTable
          columns={columnas}
          data={usuarios}
          loading={false}
          emptyMessage="No hay aplicadores que coincidan con el filtro."
        />
      )}

      {/* Modal — Crear aplicador */}
      <Modal
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        title="Nuevo aplicador"
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
              Crear aplicador
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorApiCrear && <Alert variant="error">{errorApiCrear}</Alert>}
          <FormField
            id="apl-crear-nombre"
            label="Nombre completo"
            placeholder="Ej. María López"
            required
            value={formCrear.full_name}
            onChange={handleChangeCrear('full_name')}
            error={erroresCrear.full_name}
          />
          <FormField
            id="apl-crear-email"
            label="Correo electrónico"
            type="email"
            placeholder="usuario@institución.edu"
            required
            value={formCrear.email}
            onChange={handleChangeCrear('email')}
            error={erroresCrear.email}
          />
          <FormField
            id="apl-crear-password"
            label="Contraseña inicial"
            type="password"
            required
            value={formCrear.password}
            onChange={handleChangeCrear('password')}
            error={erroresCrear.password}
            helper="El usuario podrá cambiarla desde su perfil."
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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

GestionAplicadores.propTypes = {
  token: PropTypes.string.isRequired,
}

export default GestionAplicadores
