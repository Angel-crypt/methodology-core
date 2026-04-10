import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Power, RotateCcw, ClipboardList, Search } from 'lucide-react'
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
  ActionsMenu,
} from '@/components/app'
import {
  useGestionUsuarios,
  FILTROS_ESTADO,
  formatFecha,
  getUserStatus,
} from '@/hooks/useGestionUsuarios'
import CredencialesModal from '@/pages/CredencialesModal'
import SolicitudesCambioCorreoPanel from '@/components/SolicitudesCambioCorreoPanel'

function GestionAplicadores() {
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
    handleEmailBlur,
    institutionDetected,
    handleGuardarCrear,
    abrirModalEstado,
    handleConfirmarEstado,
    handleResetearPassword,
    searchQuery,
    setSearchQuery,
    usuariosFiltrados,
    usuariosConSesion,
  } = useGestionUsuarios({ role: 'applicator', labelSingular: 'aplicador' })

  const location = useLocation()
  const navigate = useNavigate()

  // Navegación desde GlobalSearch: abrir drawer o modal de creación
  useEffect(() => {
    const s = location.state
    if (!s) return
    if (s.openCrear) abrirModalCrear()
    navigate(location.pathname, { replace: true, state: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // ─── Columnas de tabla ─────────────────────────────────────────
  const columnas = [
    { key: 'full_name', label: 'Nombre completo' },
    { key: 'email', label: 'Correo electrónico' },
    {
      key: 'institution',
      label: 'Institución',
      render: (v) => v
        ? <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>{v}</span>
        : <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>—</span>,
    },
    {
      key: 'role',
      label: 'Rol',
      render: (value) => (
        <RoleBadge role={value === 'superadmin' ? 'admin' : value === 'applicator' ? 'aplicador' : 'researcher'} />
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
        const actions = []

        if (status === 'inactive') {
          actions.push({ label: 'Activar cuenta', icon: Power, onClick: () => abrirModalEstado(row) })
        } else {
          actions.push({
            label: status === 'pending' ? 'Regenerar contraseña' : 'Restablecer contraseña',
            icon: RotateCcw,
            onClick: () => handleResetearPassword(row),
            disabled: guardandoReset,
          })
          actions.push({ label: 'Desactivar cuenta', icon: Power, onClick: () => abrirModalEstado(row), variant: 'danger' })
        }

        return <ActionsMenu actions={actions} />
      },
    }] : []),
  ]

  // ─── Render ────────────────────────────────────────────────────
  return (
    <main className="page-container">
      {/* Encabezado */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Profesionales Aplicadores</Typography>
        <Typography
          as="small"
          style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}
        >
          Cuentas con permisos de registro de sujetos y captura de métricas.
        </Typography>
      </div>

      {/* Panel solicitudes de cambio de correo — solo superadmin */}
      {esAdmin && <SolicitudesCambioCorreoPanel />}

      {/* Búsqueda y filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <div className="page-search-wrapper" style={{ flex: '1 1 200px' }}>
          <Search size={14} className="page-search-icon" aria-hidden="true" />
          <input
            className="page-search-input"
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
          <Button icon={Plus} onClick={abrirModalCrear} style={{ marginLeft: 'auto' }}>
            Nuevo aplicador
          </Button>
        )}
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
          data={usuariosFiltrados}
          loading={false}
          emptyMessage="No hay aplicadores que coincidan con el filtro."
          onRowClick={(row) => navigate(`/usuarios/aplicadores/${row.id}`, { state: { usuario: row } })}
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
            onBlur={handleEmailBlur}
            error={erroresCrear.email}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <FormField
              id="apl-crear-institucion"
              label="Institución (opcional)"
              placeholder="Nombre de la institución"
              value={formCrear.institution}
              onChange={handleChangeCrear('institution')}
            />
            {institutionDetected && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Institución detectada por dominio: <strong>{institutionDetected}</strong>
              </span>
            )}
          </div>
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
          magicLink={credencialesNuevas.magicLink}
          nombreUsuario={credencialesNuevas.nombreUsuario}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

export default GestionAplicadores
