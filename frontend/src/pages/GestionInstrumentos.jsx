import { useState, useEffect, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Power, RotateCw, BookOpen, Search } from 'lucide-react'
import {
  Button,
  DataTable,
  StatusBadge,
  Modal,
  FormField,
  Alert,
  EmptyState,
  PillToggle,
  ToastContainer,
  Typography,
  ActionsMenu,
  useToast,
} from '@/components/app'
import {
  listarInstrumentos,
  crearInstrumento,
  editarInstrumento,
  cambiarEstadoInstrumento,
} from '@/services/instruments'

const DESCRIPTION_COL_MAX_WIDTH = 300

// ── Helpers de fechas ────────────────────────────────────────────────────────

function hoy() {
  return new Date().toISOString().split('T')[0]
}

function sumarMeses(fechaISO, meses) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const totalMeses  = (m - 1) + meses
  const targetYear  = y + Math.floor(totalMeses / 12)
  const targetMonth = (totalMeses % 12) + 1
  const diasEnMes   = new Date(targetYear, targetMonth, 0).getDate()
  const targetDay   = Math.min(d, diasEnMes)
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function fechaLegible(fechaISO) {
  if (!fechaISO) return ''
  const [y, m, d] = fechaISO.split('-')
  return `${parseInt(d)} ${MESES_ES[parseInt(m) - 1]} ${y}`
}

const VIGENCIA_PRESETS = [
  { key: '1m',     label: '1 mes',              meses: 1  },
  { key: '3m',     label: '3 meses',             meses: 3  },
  { key: '6m',     label: '6 meses',             meses: 6  },
  { key: '12m',    label: '1 año',               meses: 12 },
  { key: 'custom', label: 'Fecha personalizada', meses: null },
]

/**
 * GestionInstrumentos — Módulo 2
 * Cubre: RF-M2-01, RF-M2-02, RF-M2-03, RF-M2-04, RF-M2-LIST
 *
 * Props:
 *   token string — JWT para autenticar llamadas a la API
 */
function GestionInstrumentos({ token }) {
  // ─── Rol del usuario desde el JWT ─────────────────────────────
  const esAdmin = useMemo(() => {
    try {
      return JSON.parse(atob(token.split('.')[1])).role === 'administrator'
    } catch {
      return false
    }
  }, [token])

  const location = useLocation()
  const navigate = useNavigate()

  // ─── Estado principal ──────────────────────────────────────────
  const [instrumentos, setInstrumentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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
    end_date_preset: '3m',
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

  // ─── Filtrado client-side por búsqueda ─────────────────────────
  const instrumentosFiltrados = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return instrumentos
    return instrumentos.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.methodological_description || '').toLowerCase().includes(q)
    )
  }, [instrumentos, searchQuery])

  // ─── Navegación desde GlobalSearch ────────────────────────────
  useEffect(() => {
    const s = location.state
    if (!s) return
    if (s.openCrear) setModalCrear(true)
    navigate(location.pathname, { replace: true, state: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // ─── Helpers formulario crear ──────────────────────────────────
  function abrirModalCrear() {
    const fechaInicio = hoy()
    setFormCrear({
      name: '',
      methodological_description: '',
      start_date: fechaInicio,
      end_date: sumarMeses(fechaInicio, 3),
      end_date_preset: '3m',
    })
    setErroresCrear({})
    setErrorApiCrear('')
    setModalCrear(true)
  }

  function cambiarCrear(campo) {
    return (e) => {
      setFormCrear((prev) => ({ ...prev, [campo]: e.target.value }))
      if (erroresCrear[campo]) setErroresCrear((prev) => ({ ...prev, [campo]: '' }))
    }
  }

  function handleCambiarStartDate(e) {
    const newStart = e.target.value
    setFormCrear((prev) => {
      const preset = VIGENCIA_PRESETS.find((p) => p.key === prev.end_date_preset)
      const newEnd = preset?.meses && newStart ? sumarMeses(newStart, preset.meses) : prev.end_date
      return { ...prev, start_date: newStart, end_date: newEnd }
    })
    if (erroresCrear.start_date) setErroresCrear((prev) => ({ ...prev, start_date: '' }))
  }

  function handleCambiarPreset(presetKey) {
    const preset = VIGENCIA_PRESETS.find((p) => p.key === presetKey)
    setFormCrear((prev) => {
      const newEnd = preset?.meses && prev.start_date ? sumarMeses(prev.start_date, preset.meses) : prev.end_date
      return { ...prev, end_date_preset: presetKey, end_date: newEnd }
    })
    if (erroresCrear.end_date) setErroresCrear((prev) => ({ ...prev, end_date: '' }))
  }

  function validarCrear() {
    const errs = {}
    if (!formCrear.name.trim()) errs.name = 'El nombre es obligatorio.'
    if (!formCrear.start_date) errs.start_date = 'La fecha de inicio es obligatoria.'
    if (!formCrear.end_date) errs.end_date = 'La fecha de fin es obligatoria.'
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

    const body = {
      name: formCrear.name.trim(),
      start_date: formCrear.start_date,
      end_date: formCrear.end_date,
    }
    if (formCrear.methodological_description.trim()) {
      body.methodological_description = formCrear.methodological_description.trim()
    }

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
    setFormCrear({ name: '', methodological_description: '', start_date: '', end_date: '', end_date_preset: '3m' })
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
              maxWidth: DESCRIPTION_COL_MAX_WIDTH,
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
        <ActionsMenu actions={[
          { label: 'Editar',    icon: Pencil, onClick: () => abrirModalEditar(fila) },
          {
            label:   fila.status === 'active' ? 'Desactivar' : 'Activar',
            icon:    Power,
            onClick: () => abrirModalEstado(fila),
            variant: fila.status === 'active' ? 'danger' : 'default',
          },
        ]} />
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
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Instrumentos</Typography>
        <Typography
          as="small"
          style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}
        >
          Gestión de instrumentos metodológicos lingüísticos
        </Typography>
      </div>

      {/* Búsqueda y filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <div className="page-search-wrapper" style={{ flex: '1 1 200px' }}>
          <Search size={14} className="page-search-icon" aria-hidden="true" />
          <input
            className="page-search-input"
            placeholder="Buscar por nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filtros.map(({ valor, etiqueta }) => (
          <PillToggle
            key={valor || 'all'}
            selected={filtroEstado === valor}
            onClick={() => setFiltroEstado(valor)}
          >
            {etiqueta}
          </PillToggle>
        ))}

        <Button
          variant="ghost"
          size="sm"
          icon={RotateCw}
          aria-label="Recargar lista"
          onClick={cargarInstrumentos}
          disabled={cargando}
        />

        {esAdmin && (
          <Button icon={Plus} onClick={abrirModalCrear} style={{ marginLeft: 'auto' }}>
            Nuevo instrumento
          </Button>
        )}
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
              <Button size="sm" icon={Plus} iconPosition="left" onClick={abrirModalCrear}>
                Nuevo instrumento
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          columns={columnas}
          data={instrumentosFiltrados}
          loading={cargando}
          emptyMessage="No hay instrumentos que coincidan con la búsqueda."
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
            {/* Inicio de vigencia — default: hoy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="crear-inicio" className="field-label">
                Inicio de vigencia <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                id="crear-inicio"
                type="date"
                className="input-base"
                value={formCrear.start_date}
                onChange={handleCambiarStartDate}
              />
              {erroresCrear.start_date && (
                <p className="field-error" role="alert">{erroresCrear.start_date}</p>
              )}
            </div>

            {/* Fin de vigencia — preset dropdown + picker opcional */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="crear-fin-preset" className="field-label">
                Fin de vigencia <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                id="crear-fin-preset"
                className="input-base"
                value={formCrear.end_date_preset}
                onChange={(e) => handleCambiarPreset(e.target.value)}
              >
                {VIGENCIA_PRESETS.map(({ key, label, meses }) => {
                  const fechaCalc = meses && formCrear.start_date ? sumarMeses(formCrear.start_date, meses) : null
                  const texto = fechaCalc ? `${label} — ${fechaLegible(fechaCalc)}` : label
                  return <option key={key} value={key}>{texto}</option>
                })}
              </select>
              {formCrear.end_date_preset === 'custom' && (
                <input
                  type="date"
                  className="input-base"
                  value={formCrear.end_date}
                  min={formCrear.start_date || undefined}
                  onChange={(e) => {
                    setFormCrear((prev) => ({ ...prev, end_date: e.target.value }))
                    if (erroresCrear.end_date) setErroresCrear((prev) => ({ ...prev, end_date: '' }))
                  }}
                  style={{ marginTop: 'var(--space-1)' }}
                />
              )}
              {erroresCrear.end_date && (
                <p className="field-error" role="alert">{erroresCrear.end_date}</p>
              )}
            </div>
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

GestionInstrumentos.propTypes = {
  token: PropTypes.string.isRequired,
}

export default GestionInstrumentos
