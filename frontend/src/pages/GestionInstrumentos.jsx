import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Power, RotateCw, BookOpen } from 'lucide-react'
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
} from '@/components/app'
import {
  listarInstrumentos,
  crearInstrumento,
  editarInstrumento,
  cambiarEstadoInstrumento,
} from '@/services/instruments'

/**
 * GestionInstrumentos — Módulo 2
 * Cubre: RF-M2-01, RF-M2-02, RF-M2-03, RF-M2-04, RF-M2-LIST
 *
 * Props:
 *   token string — JWT para autenticar llamadas a la API
 */
function GestionInstrumentos({ token }) {
  // ─── Rol del usuario desde el JWT ─────────────────────────────
  const esAdmin = (() => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.role === 'administrator'
    } catch {
      return false
    }
  })()

  // ─── Estado principal ──────────────────────────────────────────
  const [instrumentos, setInstrumentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')

  // ─── Estado modales ────────────────────────────────────────────
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalEstado, setModalEstado] = useState(false)
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState(null)

  // ─── Estado formulario crear ───────────────────────────────────
  const [formCrear, setFormCrear] = useState({
    name: '',
    methodological_description: '',
    start_date: '',
    end_date: '',
  })
  const [erroresCrear, setErroresCrear] = useState({})
  const [errorApiCrear, setErrorApiCrear] = useState('')
  const [guardandoCrear, setGuardandoCrear] = useState(false)

  // ─── Estado formulario editar ──────────────────────────────────
  const [formEditar, setFormEditar] = useState({
    methodological_description: '',
    start_date: '',
    end_date: '',
  })
  const [erroresEditar, setErroresEditar] = useState({})
  const [errorApiEditar, setErrorApiEditar] = useState('')
  const [guardandoEditar, setGuardandoEditar] = useState(false)

  // ─── Estado modal cambiar estado ───────────────────────────────
  const [errorApiEstado, setErrorApiEstado] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)

  const { toasts, toast, dismiss } = useToast()

  // ─── Cargar instrumentos ───────────────────────────────────────
  const cargarInstrumentos = useCallback(async () => {
    setCargando(true)
    try {
      const res = await listarInstrumentos(token, filtroEstado)
      if (res.status === 'success') {
        setInstrumentos(res.data)
      } else {
        toast({ type: 'error', title: 'Error', message: res.message || 'No se pudo cargar la lista.' })
      }
    } catch {
      toast({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setCargando(false)
    }
  }, [token, filtroEstado, toast])

  useEffect(() => {
    cargarInstrumentos()
  }, [cargarInstrumentos])

  // ─── Helpers formulario crear ──────────────────────────────────
  function cambiarCrear(campo) {
    return (e) => {
      setFormCrear((prev) => ({ ...prev, [campo]: e.target.value }))
      if (erroresCrear[campo]) setErroresCrear((prev) => ({ ...prev, [campo]: '' }))
    }
  }

  function validarCrear() {
    const errs = {}
    if (!formCrear.name.trim()) errs.name = 'El nombre es obligatorio.'
    if (formCrear.start_date && formCrear.end_date && formCrear.end_date <= formCrear.start_date) {
      errs.end_date = 'La fecha de fin debe ser posterior a la de inicio.'
    }
    return errs
  }

  async function handleCrear() {
    const errs = validarCrear()
    if (Object.keys(errs).length > 0) { setErroresCrear(errs); return }

    setGuardandoCrear(true)
    setErrorApiCrear('')

    const body = { name: formCrear.name.trim() }
    if (formCrear.methodological_description.trim()) {
      body.methodological_description = formCrear.methodological_description.trim()
    }
    if (formCrear.start_date) body.start_date = formCrear.start_date
    if (formCrear.end_date) body.end_date = formCrear.end_date

    try {
      const res = await crearInstrumento(token, body)
      if (res.status === 'success') {
        setInstrumentos((prev) => [res.data, ...prev])
        toast({ type: 'success', title: 'Instrumento creado', message: `"${res.data.name}" fue registrado correctamente.` })
        cerrarModalCrear()
      } else {
        setErrorApiCrear(res.message || 'Error al crear el instrumento.')
      }
    } catch {
      setErrorApiCrear('No se pudo conectar con el servidor.')
    } finally {
      setGuardandoCrear(false)
    }
  }

  function cerrarModalCrear() {
    setModalCrear(false)
    setFormCrear({ name: '', methodological_description: '', start_date: '', end_date: '' })
    setErroresCrear({})
    setErrorApiCrear('')
  }

  // ─── Helpers formulario editar ─────────────────────────────────
  function abrirModalEditar(instrumento) {
    setInstrumentoSeleccionado(instrumento)
    setFormEditar({
      methodological_description: instrumento.methodological_description || '',
      start_date: instrumento.start_date || '',
      end_date: instrumento.end_date || '',
    })
    setErroresEditar({})
    setErrorApiEditar('')
    setModalEditar(true)
  }

  function cambiarEditar(campo) {
    return (e) => {
      setFormEditar((prev) => ({ ...prev, [campo]: e.target.value }))
      if (erroresEditar[campo]) setErroresEditar((prev) => ({ ...prev, [campo]: '' }))
    }
  }

  function validarEditar() {
    const errs = {}
    if (!formEditar.methodological_description.trim()) {
      errs.methodological_description = 'La descripción no puede estar vacía.'
    }
    if (formEditar.start_date && formEditar.end_date && formEditar.end_date <= formEditar.start_date) {
      errs.end_date = 'La fecha de fin debe ser posterior a la de inicio.'
    }
    return errs
  }

  async function handleEditar() {
    const errs = validarEditar()
    if (Object.keys(errs).length > 0) { setErroresEditar(errs); return }

    setGuardandoEditar(true)
    setErrorApiEditar('')

    const body = {
      methodological_description: formEditar.methodological_description.trim(),
    }
    if (formEditar.start_date) body.start_date = formEditar.start_date
    if (formEditar.end_date) body.end_date = formEditar.end_date

    try {
      const res = await editarInstrumento(token, instrumentoSeleccionado.id, body)
      if (res.status === 'success') {
        setInstrumentos((prev) =>
          prev.map((i) => (i.id === res.data.id ? { ...i, ...res.data } : i))
        )
        toast({ type: 'success', title: 'Instrumento actualizado', message: 'Los cambios se guardaron correctamente.' })
        cerrarModalEditar()
      } else {
        setErrorApiEditar(res.message || 'Error al actualizar el instrumento.')
      }
    } catch {
      setErrorApiEditar('No se pudo conectar con el servidor.')
    } finally {
      setGuardandoEditar(false)
    }
  }

  function cerrarModalEditar() {
    setModalEditar(false)
    setInstrumentoSeleccionado(null)
    setErroresEditar({})
    setErrorApiEditar('')
  }

  // ─── Helpers cambiar estado ────────────────────────────────────
  function abrirModalEstado(instrumento) {
    setInstrumentoSeleccionado(instrumento)
    setErrorApiEstado('')
    setModalEstado(true)
  }

  async function handleCambiarEstado() {
    const nuevoEstado = instrumentoSeleccionado.status === 'active' ? 'inactive' : 'active'
    setGuardandoEstado(true)
    setErrorApiEstado('')

    try {
      const res = await cambiarEstadoInstrumento(token, instrumentoSeleccionado.id, nuevoEstado)
      if (res.status === 'success') {
        setInstrumentos((prev) =>
          prev.map((i) => (i.id === res.data.id ? { ...i, status: res.data.status } : i))
        )
        const etiqueta = res.data.status === 'active' ? 'activado' : 'desactivado'
        toast({ type: 'success', title: 'Estado actualizado', message: `El instrumento fue ${etiqueta}.` })
        cerrarModalEstado()
      } else {
        setErrorApiEstado(res.message || 'Error al cambiar el estado.')
      }
    } catch {
      setErrorApiEstado('No se pudo conectar con el servidor.')
    } finally {
      setGuardandoEstado(false)
    }
  }

  function cerrarModalEstado() {
    setModalEstado(false)
    setInstrumentoSeleccionado(null)
    setErrorApiEstado('')
  }

  // ─── Formatear fechas ──────────────────────────────────────────
  function formatearFecha(fecha) {
    if (!fecha) return <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
    const [anio, mes, dia] = fecha.split('-')
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-small)' }}>{`${dia}/${mes}/${anio}`}</span>
  }

  // ─── Columnas de la tabla ──────────────────────────────────────
  const columnas = [
    {
      key: 'name',
      label: 'Nombre',
      render: (valor) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
          {valor}
        </span>
      ),
    },
    {
      key: 'methodological_description',
      label: 'Descripción metodológica',
      render: (valor) =>
        valor ? (
          <span
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-small)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: 300,
            }}
          >
            {valor}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-small)' }}>
            Sin descripción
          </span>
        ),
    },
    {
      key: 'start_date',
      label: 'Inicio vigencia',
      render: (valor) => formatearFecha(valor),
    },
    {
      key: 'end_date',
      label: 'Fin vigencia',
      render: (valor) => formatearFecha(valor),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (valor) => <StatusBadge status={valor} />,
    },
    // Columna de acciones solo visible para administrador (FUNC-02)
    ...(esAdmin ? [{
      key: 'id',
      label: 'Acciones',
      render: (_, fila) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button
            variant="icon"
            size="sm"
            icon={Pencil}
            aria-label={`Editar ${fila.name}`}
            onClick={() => abrirModalEditar(fila)}
          />
          <Button
            variant="icon"
            size="sm"
            icon={Power}
            aria-label={fila.status === 'active' ? `Desactivar ${fila.name}` : `Activar ${fila.name}`}
            onClick={() => abrirModalEstado(fila)}
            style={{
              color: fila.status === 'active' ? 'var(--color-error)' : 'var(--color-success)',
            }}
          />
        </div>
      ),
    }] : []),
  ]

  // ─── Opciones de filtro ────────────────────────────────────────
  const filtros = [
    { valor: '', etiqueta: 'Todos' },
    { valor: 'active', etiqueta: 'Activos' },
    { valor: 'inactive', etiqueta: 'Inactivos' },
  ]

  // ─── Variables del modal de estado ────────────────────────────
  const estaActivo = instrumentoSeleccionado?.status === 'active'
  const accionEstado = estaActivo ? 'Desactivar' : 'Activar'
  const varianteBotonEstado = estaActivo ? 'danger' : 'primary'

  // ─── Render ────────────────────────────────────────────────────
  return (
    <main className="page-container">

      {/* Encabezado de página */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-h1)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}
          >
            Instrumentos
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-text-secondary)',
              marginTop: 'var(--space-1)',
            }}
          >
            Gestión de instrumentos metodológicos lingüísticos
          </p>
        </div>

        {/* Botón nuevo solo para admin (FUNC-02) */}
        {esAdmin && (
          <Button icon={Plus} iconPosition="left" onClick={() => setModalCrear(true)}>
            Nuevo instrumento
          </Button>
        )}
      </div>

      {/* Barra de filtros */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {filtros.map(({ valor, etiqueta }) => (
            <button
              key={valor || 'all'}
              aria-pressed={filtroEstado === valor}
              onClick={() => setFiltroEstado(valor)}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid',
                fontSize: 'var(--font-size-small)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderColor: filtroEstado === valor ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: filtroEstado === valor ? 'var(--color-primary-light)' : 'var(--color-surface)',
                color: filtroEstado === valor ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                fontWeight: filtroEstado === valor ? 'var(--font-weight-medium)' : 'var(--font-weight-regular)',
              }}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon={RotateCw}
          aria-label="Recargar lista"
          onClick={cargarInstrumentos}
          disabled={cargando}
        />
      </div>

      {/* Tabla principal */}
      {!cargando && instrumentos.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No hay instrumentos registrados"
          message={
            filtroEstado
              ? `No se encontraron instrumentos con estado "${filtros.find(f => f.valor === filtroEstado)?.etiqueta}".`
              : 'Crea el primer instrumento para comenzar.'
          }
          action={
            esAdmin && !filtroEstado && (
              <Button size="sm" icon={Plus} iconPosition="left" onClick={() => setModalCrear(true)}>
                Nuevo instrumento
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          columns={columnas}
          data={instrumentos}
          loading={cargando}
          emptyMessage="No hay instrumentos para mostrar."
        />
      )}

      {/* ── Modal: Crear instrumento (RF-M2-01) ── */}
      <Modal
        open={modalCrear}
        onClose={cerrarModalCrear}
        title="Nuevo instrumento"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={cerrarModalCrear} disabled={guardandoCrear}>
              Cancelar
            </Button>
            <Button onClick={handleCrear} loading={guardandoCrear}>
              Crear instrumento
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorApiCrear && <Alert variant="error">{errorApiCrear}</Alert>}

          <FormField
            id="crear-nombre"
            label="Nombre"
            required
            placeholder="Ej. Prueba de Comprensión Lectora"
            value={formCrear.name}
            onChange={cambiarCrear('name')}
            error={erroresCrear.name}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="crear-descripcion" className="field-label">
              Descripción metodológica
            </label>
            <textarea
              id="crear-descripcion"
              className="input-base"
              placeholder="Describe el instrumento, su base teórica y contexto de aplicación..."
              rows={4}
              value={formCrear.methodological_description}
              onChange={cambiarCrear('methodological_description')}
              style={{ height: 'auto', padding: 'var(--space-2) var(--space-3)', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField
              id="crear-inicio"
              label="Inicio de vigencia"
              type="date"
              value={formCrear.start_date}
              onChange={cambiarCrear('start_date')}
            />
            <FormField
              id="crear-fin"
              label="Fin de vigencia"
              type="date"
              value={formCrear.end_date}
              onChange={cambiarCrear('end_date')}
              error={erroresCrear.end_date}
            />
          </div>
        </div>
      </Modal>

      {/* ── Modal: Editar instrumento (RF-M2-02 + RF-M2-03) ── */}
      <Modal
        open={modalEditar}
        onClose={cerrarModalEditar}
        title={instrumentoSeleccionado ? `Editar — ${instrumentoSeleccionado.name}` : 'Editar instrumento'}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={cerrarModalEditar} disabled={guardandoEditar}>
              Cancelar
            </Button>
            <Button onClick={handleEditar} loading={guardandoEditar}>
              Guardar cambios
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorApiEditar && <Alert variant="error">{errorApiEditar}</Alert>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="editar-descripcion" className="field-label">
              Descripción metodológica
            </label>
            <textarea
              id="editar-descripcion"
              className="input-base"
              placeholder="Describe el instrumento, su base teórica y contexto de aplicación..."
              rows={5}
              value={formEditar.methodological_description}
              onChange={cambiarEditar('methodological_description')}
              style={{ height: 'auto', padding: 'var(--space-2) var(--space-3)', resize: 'vertical' }}
              aria-invalid={erroresEditar.methodological_description ? 'true' : undefined}
            />
            {erroresEditar.methodological_description && (
              <p className="field-error" role="alert">
                {erroresEditar.methodological_description}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField
              id="editar-inicio"
              label="Inicio de vigencia"
              type="date"
              value={formEditar.start_date}
              onChange={cambiarEditar('start_date')}
            />
            <FormField
              id="editar-fin"
              label="Fin de vigencia"
              type="date"
              value={formEditar.end_date}
              onChange={cambiarEditar('end_date')}
              error={erroresEditar.end_date}
            />
          </div>
        </div>
      </Modal>

      {/* ── Modal: Cambiar estado (RF-M2-04) ── */}
      <Modal
        open={modalEstado}
        onClose={cerrarModalEstado}
        size="sm"
        title={`${accionEstado} instrumento`}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={cerrarModalEstado} disabled={guardandoEstado}>
              Cancelar
            </Button>
            <Button variant={varianteBotonEstado} onClick={handleCambiarEstado} loading={guardandoEstado}>
              {accionEstado}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorApiEstado && <Alert variant="error">{errorApiEstado}</Alert>}

          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}>
            {estaActivo ? (
              <>
                ¿Desactivar el instrumento{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {instrumentoSeleccionado?.name}
                </strong>
                ? Los registros históricos no se verán afectados, pero no podrá recibir nuevas aplicaciones.
              </>
            ) : (
              <>
                ¿Activar el instrumento{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {instrumentoSeleccionado?.name}
                </strong>
                ? Quedará disponible para recibir nuevas aplicaciones.
              </>
            )}
          </p>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

export default GestionInstrumentos