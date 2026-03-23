import { useState, useEffect, useCallback } from 'react'
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
  useToast,
  PillToggle,
  Typography,
} from '@/components/app'
import { listarUsuarios, crearUsuario, cambiarEstadoUsuario } from '@/services/users'

/**
 * GestionAplicadores — Gestión de Usuarios
 * Cubre: RF-M1-LIST, RF-M1-01, RF-M1-02 para role=applicator
 *
 * Props:
 *   token string — JWT para autenticar llamadas a la API
 */

const ROLE = 'applicator'

const FILTROS_ESTADO = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

const FORM_INICIAL = { full_name: '', email: '', password: '' }

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function GestionAplicadores({ token }) {
  // ─── Estado principal ──────────────────────────────────────────
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')

  // ─── Estado modales ────────────────────────────────────────────
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEstado, setModalEstado] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)

  // ─── Estado formulario crear ───────────────────────────────────
  const [formCrear, setFormCrear] = useState(FORM_INICIAL)
  const [erroresCrear, setErroresCrear] = useState({})
  const [errorApiCrear, setErrorApiCrear] = useState('')
  const [guardandoCrear, setGuardandoCrear] = useState(false)

  // ─── Estado cambio de estado ───────────────────────────────────
  const [errorApiEstado, setErrorApiEstado] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)

  const { toasts, toast, dismiss } = useToast()

  // ─── Carga de datos ────────────────────────────────────────────
  const cargarUsuarios = useCallback(async () => {
    setCargando(true)
    try {
      const data = await listarUsuarios(token, ROLE, filtroEstado)
      if (data.status === 'success') {
        setUsuarios(data.data)
      } else {
        toast({ type: 'error', title: 'Error', message: data.message || 'No se pudo cargar la lista.' })
      }
    } catch {
      toast({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setCargando(false)
    }
  }, [token, filtroEstado]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargarUsuarios()
  }, [cargarUsuarios])

  // ─── Handlers — Modal Crear ────────────────────────────────────
  function abrirModalCrear() {
    setFormCrear(FORM_INICIAL)
    setErroresCrear({})
    setErrorApiCrear('')
    setModalCrear(true)
  }

  function handleChangeCrear(campo) {
    return (e) => {
      setFormCrear((prev) => ({ ...prev, [campo]: e.target.value }))
      if (erroresCrear[campo]) setErroresCrear((prev) => ({ ...prev, [campo]: '' }))
      if (errorApiCrear) setErrorApiCrear('')
    }
  }

  function validarFormCrear() {
    const errs = {}
    if (!formCrear.full_name.trim()) errs.full_name = 'El nombre es obligatorio.'
    if (!formCrear.email.trim()) errs.email = 'El correo es obligatorio.'
    if (!formCrear.password.trim()) errs.password = 'La contraseña es obligatoria.'
    setErroresCrear(errs)
    return Object.keys(errs).length === 0
  }

  async function handleGuardarCrear() {
    if (!validarFormCrear()) return
    setGuardandoCrear(true)
    setErrorApiCrear('')
    try {
      const data = await crearUsuario(token, {
        full_name: formCrear.full_name.trim(),
        email: formCrear.email.trim(),
        password: formCrear.password,
        role: ROLE,
      })
      if (data.status === 'success') {
        setModalCrear(false)
        toast({
          type: 'success',
          title: 'Aplicador creado',
          message: `${formCrear.full_name.trim()} fue registrado correctamente.`,
        })
        cargarUsuarios()
      } else {
        setErrorApiCrear(data.message || 'No se pudo crear el aplicador.')
      }
    } catch {
      setErrorApiCrear('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardandoCrear(false)
    }
  }

  // ─── Handlers — Modal Estado ───────────────────────────────────
  function abrirModalEstado(usuario) {
    setUsuarioSeleccionado(usuario)
    setErrorApiEstado('')
    setModalEstado(true)
  }

  async function handleConfirmarEstado() {
    if (!usuarioSeleccionado) return
    setGuardandoEstado(true)
    setErrorApiEstado('')
    const nuevoEstado = !usuarioSeleccionado.active
    try {
      const data = await cambiarEstadoUsuario(token, usuarioSeleccionado.id, nuevoEstado)
      if (data.status === 'success') {
        setModalEstado(false)
        const accion = nuevoEstado ? 'activado' : 'desactivado'
        toast({
          type: 'success',
          title: 'Estado actualizado',
          message: `${usuarioSeleccionado.full_name} fue ${accion}.`,
        })
        cargarUsuarios()
      } else {
        setErrorApiEstado(data.message || 'No se pudo cambiar el estado.')
      }
    } catch {
      setErrorApiEstado('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardandoEstado(false)
    }
  }

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
    {
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
    },
  ]

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div>
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
        <Button icon={Plus} onClick={abrirModalCrear}>
          Nuevo aplicador
        </Button>
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
            <Button size="sm" icon={Plus} onClick={abrirModalCrear}>
              Nuevo aplicador
            </Button>
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
    </div>
  )
}

export default GestionAplicadores
