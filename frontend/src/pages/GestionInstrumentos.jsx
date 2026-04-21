import { useState, useEffect, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Power, RotateCw, BookOpen, Search, Trash2, Eye, X } from 'lucide-react'
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
  eliminarInstrumento,
  crearMetrica,
  listarTags,
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

const METRIC_TYPES = [
  { value: 'numeric',     label: 'Numérico'   },
  { value: 'categorical', label: 'Categórico' },
  { value: 'boolean',     label: 'Booleano'   },
  { value: 'short_text',  label: 'Texto corto'},
]

const TIPO_LABELS = Object.fromEntries(METRIC_TYPES.map((t) => [t.value, t.label]))

// ── Componente reutilizable: chip-input de etiquetas con catálogo clicable ────
function TagChipInput({ label, inputId, tags, tagInput, catalog, onAdd, onRemove, onInputChange, onKeyDown }) {
  const available = catalog.filter((t) => !tags.includes(t))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <label htmlFor={inputId} className="field-label">{label}</label>
      {/* Chips seleccionados + input */}
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)',
          padding: 'var(--space-1) var(--space-2)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)', alignItems: 'center',
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
              padding: '2px var(--space-2)',
              background: 'var(--color-info-bg)', color: 'var(--color-info-text)',
              borderRadius: 'var(--radius-pill)', fontSize: 'var(--font-size-small)',
            }}
          >
            {tag}
            <button
              type="button"
              style={{ padding: 0, height: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', lineHeight: 1 }}
              onClick={() => onRemove(tag)}
              aria-label={`Quitar ${tag}`}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className="input-base"
          style={{ flex: 1, minWidth: 120, border: 'none', boxShadow: 'none', padding: 'var(--space-1)' }}
          placeholder={tags.length === 0 ? 'Añade etiquetas (Enter o coma)' : ''}
          value={tagInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => tagInput && onAdd(tagInput)}
        />
      </div>
      {/* Etiquetas del catálogo disponibles para reutilizar */}
      {available.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', alignSelf: 'center', marginRight: 'var(--space-1)' }}>
            Existentes:
          </span>
          {available.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onAdd(t)}
              style={{
                padding: '2px var(--space-2)',
                background: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)',
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--font-size-caption)', cursor: 'pointer',
              }}
            >
              +{t}
            </button>
          ))}
        </div>
      )}
      <p className="field-helper">Las etiquetas ayudan a agrupar instrumentos por dominio o nivel.</p>
    </div>
  )
}

TagChipInput.propTypes = {
  label: PropTypes.string.isRequired,
  inputId: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  tagInput: PropTypes.string.isRequired,
  catalog: PropTypes.arrayOf(PropTypes.string).isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
}

function emptyMetricForm() {
  return { name: '', metric_type: 'numeric', required: true, description: '', min_value: '', max_value: '', options: '' }
}

function GestionInstrumentos() {
  const { token, role } = useAuth()
  const esAdmin = useMemo(() => role === 'superadmin', [role])

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
    tags: [],
    tagInput: '',
    min_days_between_applications: '',
  })
  const [erroresCrear, setErroresCrear] = useState({})
  const [errorApiCrear, setErrorApiCrear] = useState('')
  const [guardandoCrear, setGuardandoCrear] = useState(false)

  // ─── Estado formulario editar ──────────────────────────────────
  const [formEditar, setFormEditar] = useState({
    methodological_description: '',
    start_date: '',
    end_date: '',
    tags: [],
    tagInput: '',
    min_days_between_applications: '',
  })

  // ─── Catálogo y filtro de tags ─────────────────────────────────
  const [tagCatalog, setTagCatalog] = useState([])
  const [tagFilter, setTagFilter] = useState([])
  const [erroresEditar, setErroresEditar] = useState({})
  const [errorApiEditar, setErrorApiEditar] = useState('')
  const [guardandoEditar, setGuardandoEditar] = useState(false)

  // ─── Estado modal cambiar estado ───────────────────────────────
  const [errorApiEstado, setErrorApiEstado] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)

  // ─── Estado modal eliminar (soft delete) ──────────────────────
  const [modalEliminar, setModalEliminar] = useState(false)
  const [errorApiEliminar, setErrorApiEliminar] = useState('')
  const [guardandoEliminar, setGuardandoEliminar] = useState(false)

  // ─── Estado wizard crear — paso 2: métricas ───────────────────
  const [pasoCrear, setPasoCrear] = useState(1)
  const [metricasCrear, setMetricasCrear] = useState([])
  const [formMetrica, setFormMetrica] = useState(emptyMetricForm())
  const [erroresMetrica, setErroresMetrica] = useState({})

  const { toasts, toast, dismiss } = useToast()

  // ─── Cargar instrumentos ───────────────────────────────────────
  const cargarInstrumentos = useCallback(async () => {
    setCargando(true)
    try {
      const res = await listarInstrumentos(token, filtroEstado, tagFilter)
      if (res.ok) {
        setInstrumentos(res.data)
      } else {
        toast({ type: 'error', title: 'Error', message: res.error || 'No se pudo cargar la lista.' })
      }
    } catch {
      toast({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setCargando(false)
    }
  }, [token, filtroEstado, tagFilter, toast])

  useEffect(() => {
    cargarInstrumentos()
  }, [cargarInstrumentos])

  // ─── Cargar catálogo de tags ───────────────────────────────────
  const cargarTags = useCallback(async () => {
    try {
      const res = await listarTags(token)
      if (res.ok && Array.isArray(res.data)) {
        setTagCatalog(res.data)
      }
    } catch {
      // silencioso: el catálogo es solo para sugerencias, no es crítico
    }
  }, [token])

  useEffect(() => {
    cargarTags()
  }, [cargarTags])

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
      tags: [],
      tagInput: '',
      min_days_between_applications: '',
    })
    setErroresCrear({})
    setErrorApiCrear('')
    setPasoCrear(1)
    setMetricasCrear([])
    setFormMetrica(emptyMetricForm())
    setErroresMetrica({})
    setModalCrear(true)
  }

  // ─── Helpers del chip-input de tags ────────────────────────────
  function addTagCrear(raw) {
    const norm = (raw || '').trim().toLowerCase()
    if (!norm) return
    setFormCrear((prev) =>
      prev.tags.includes(norm)
        ? { ...prev, tagInput: '' }
        : { ...prev, tags: [...prev.tags, norm], tagInput: '' }
    )
  }
  function removeTagCrear(tag) {
    setFormCrear((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }
  function handleTagInputKeyDownCrear(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTagCrear(formCrear.tagInput)
    } else if (e.key === 'Backspace' && formCrear.tagInput === '' && formCrear.tags.length > 0) {
      removeTagCrear(formCrear.tags[formCrear.tags.length - 1])
    }
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
    if (pasoCrear === 1) {
      const errs = validarCrear()
      if (Object.keys(errs).length > 0) { setErroresCrear(errs); return }
      setPasoCrear(2)
      setErrorApiCrear('')
      return
    }

    // Paso 2 — validar al menos 1 métrica
    if (metricasCrear.length === 0) {
      setErrorApiCrear('Agrega al menos una métrica antes de crear el instrumento.')
      return
    }

    setGuardandoCrear(true)
    setErrorApiCrear('')

    const body = {
      name: formCrear.name.trim(),
      start_date: formCrear.start_date,
      end_date: formCrear.end_date,
      tags: formCrear.tags,
      min_days_between_applications: Number(formCrear.min_days_between_applications) || 0,
    }
    if (formCrear.methodological_description.trim()) {
      body.methodological_description = formCrear.methodological_description.trim()
    }

    try {
      const res = await crearInstrumento(token, body)
      if (!res.ok) {
        setErrorApiCrear(res.error || 'Error al crear el instrumento.')
        setGuardandoCrear(false)
        return
      }
      const nuevoId = res.data.id

      for (const m of metricasCrear) {
        const mb = {
          instrument_id: nuevoId,
          name: m.name.trim(),
          metric_type: m.metric_type,
          required: m.required,
        }
        if (m.description.trim()) mb.description = m.description.trim()
        if (m.metric_type === 'numeric') {
          if (m.min_value !== '') mb.min_value = parseFloat(m.min_value)
          if (m.max_value !== '') mb.max_value = parseFloat(m.max_value)
        }
        if (m.metric_type === 'categorical') {
          mb.options = m.options.split(',').map((o) => o.trim()).filter(Boolean)
        }
        await crearMetrica(token, nuevoId, mb)
      }

      setInstrumentos((prev) => [res.data, ...prev])
      toast({
        type: 'success',
        title: 'Instrumento creado',
        message: `"${res.data.name}" registrado con ${metricasCrear.length} métrica${metricasCrear.length > 1 ? 's' : ''}.`,
      })
      cerrarModalCrear()
      cargarTags()
    } catch {
      setErrorApiCrear('No se pudo conectar con el servidor.')
    } finally {
      setGuardandoCrear(false)
    }
  }

  function cerrarModalCrear() {
    setModalCrear(false)
    setFormCrear({
      name: '',
      methodological_description: '',
      start_date: '',
      end_date: '',
      end_date_preset: '3m',
      tags: [],
      tagInput: '',
      min_days_between_applications: '',
    })
    setErroresCrear({})
    setErrorApiCrear('')
    setPasoCrear(1)
    setMetricasCrear([])
    setFormMetrica(emptyMetricForm())
    setErroresMetrica({})
  }

  // ─── Helpers formulario editar ─────────────────────────────────
  function abrirModalEditar(instrumento) {
    setInstrumentoSeleccionado(instrumento)
    setFormEditar({
      methodological_description: instrumento.methodological_description || '',
      start_date: instrumento.start_date || '',
      end_date: instrumento.end_date || '',
      tags: [...(instrumento.tags || [])],
      tagInput: '',
      min_days_between_applications: instrumento.min_days_between_applications || '',
    })
    setErroresEditar({})
    setErrorApiEditar('')
    setModalEditar(true)
  }

  function addTagEditar(raw) {
    const norm = (raw || '').trim().toLowerCase()
    if (!norm) return
    setFormEditar((prev) =>
      prev.tags.includes(norm)
        ? { ...prev, tagInput: '' }
        : { ...prev, tags: [...prev.tags, norm], tagInput: '' }
    )
  }
  function removeTagEditar(tag) {
    setFormEditar((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }
  function handleTagInputKeyDownEditar(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTagEditar(formEditar.tagInput)
    } else if (e.key === 'Backspace' && formEditar.tagInput === '' && formEditar.tags.length > 0) {
      removeTagEditar(formEditar.tags[formEditar.tags.length - 1])
    }
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
      tags: formEditar.tags,
      min_days_between_applications: Number(formEditar.min_days_between_applications) || 0,
    }
    if (formEditar.start_date) body.start_date = formEditar.start_date
    if (formEditar.end_date) body.end_date = formEditar.end_date

    try {
      const res = await editarInstrumento(token, instrumentoSeleccionado.id, body)
      if (res.ok) {
        setInstrumentos((prev) =>
          prev.map((i) => (i.id === res.data.id ? { ...i, ...res.data } : i))
        )
        toast({ type: 'success', title: 'Instrumento actualizado', message: 'Los cambios se guardaron correctamente.' })
        cerrarModalEditar()
        cargarTags()
      } else {
        setErrorApiEditar(res.error || 'Error al actualizar el instrumento.')
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
    const nuevoEstado = instrumentoSeleccionado.is_active ? 'inactive' : 'active'
    setGuardandoEstado(true)
    setErrorApiEstado('')

    try {
      const res = await cambiarEstadoInstrumento(token, instrumentoSeleccionado.id, nuevoEstado)
      if (res.ok) {
        setInstrumentos((prev) =>
          prev.map((i) => (i.id === res.data.id ? { ...i, is_active: res.data.is_active } : i))
        )
        const etiqueta = res.data.is_active ? 'activado' : 'desactivado'
        toast({ type: 'success', title: 'Estado actualizado', message: `El instrumento fue ${etiqueta}.` })
        cerrarModalEstado()
      } else {
        setErrorApiEstado(res.error || 'Error al cambiar el estado.')
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

  // ─── Helpers eliminar instrumento (soft delete) ────────────────
  function abrirModalEliminar(instrumento) {
    setInstrumentoSeleccionado(instrumento)
    setErrorApiEliminar('')
    setModalEliminar(true)
  }

  async function handleEliminar() {
    setGuardandoEliminar(true)
    setErrorApiEliminar('')
    try {
      const res = await eliminarInstrumento(token, instrumentoSeleccionado.id)
      if (res.ok) {
        setInstrumentos((prev) => prev.filter((i) => i.id !== instrumentoSeleccionado.id))
        toast({ type: 'success', title: 'Instrumento eliminado', message: `"${instrumentoSeleccionado.name}" fue eliminado.` })
        setModalEliminar(false)
        setInstrumentoSeleccionado(null)
      } else {
        setErrorApiEliminar(res.error || 'Error al eliminar el instrumento.')
      }
    } catch {
      setErrorApiEliminar('No se pudo conectar con el servidor.')
    } finally {
      setGuardandoEliminar(false)
    }
  }

  // ─── Helpers métricas en wizard crear ─────────────────────────
  function validarMetricaCrear() {
    const errs = {}
    if (!formMetrica.name.trim()) errs.name = 'El nombre es obligatorio.'
    if (formMetrica.metric_type === 'categorical' && !formMetrica.options.trim()) {
      errs.options = 'Las opciones son obligatorias para tipo categórico.'
    }
    if (
      formMetrica.metric_type === 'numeric' &&
      formMetrica.min_value !== '' &&
      formMetrica.max_value !== '' &&
      parseFloat(formMetrica.min_value) >= parseFloat(formMetrica.max_value)
    ) {
      errs.max_value = 'El valor máximo debe ser mayor que el mínimo.'
    }
    return errs
  }

  function agregarMetricaCrear() {
    const errs = validarMetricaCrear()
    if (Object.keys(errs).length > 0) { setErroresMetrica(errs); return }
    setMetricasCrear((prev) => [...prev, { ...formMetrica, _tempId: Date.now() }])
    setFormMetrica(emptyMetricForm())
    setErroresMetrica({})
  }

  function quitarMetricaCrear(tempId) {
    setMetricasCrear((prev) => prev.filter((m) => m._tempId !== tempId))
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
      key: 'is_active',
      label: 'Estado',
      render: (valor) => <StatusBadge status={valor ? 'active' : 'inactive'} />,
    },
    // Columna de acciones solo visible para administrador (FUNC-02)
    ...(esAdmin ? [{
      key: 'id',
      label: 'Acciones',
      render: (_, fila) => (
        <ActionsMenu actions={[
          { label: 'Ver detalles', icon: Eye,    onClick: () => navigate(`/instruments/${fila.id}`, { state: { instrumento: fila } }) },
          { label: 'Editar',       icon: Pencil, onClick: () => abrirModalEditar(fila) },
          {
            label:   fila.is_active ? 'Desactivar' : 'Activar',
            icon:    Power,
            onClick: () => abrirModalEstado(fila),
            variant: fila.is_active ? 'danger' : 'default',
          },
          { label: 'Eliminar', icon: Trash2, onClick: () => abrirModalEliminar(fila), variant: 'danger' },
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
  const estaActivo = instrumentoSeleccionado?.is_active === true
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

        {/* Filtro por tags: toggle por chip del catálogo */}
        {tagCatalog.length > 0 && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexWrap: 'wrap' }}
            aria-label="Filtrar por etiquetas"
          >
            {tagCatalog.map((t) => {
              const active = tagFilter.includes(t)
              return (
                <PillToggle
                  key={t}
                  selected={active}
                  onClick={() =>
                    setTagFilter((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                >
                  #{t}
                </PillToggle>
              )
            })}
          </div>
        )}

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
          onRowClick={(row) => navigate(`/instruments/${row.id}`, { state: { instrumento: row } })}
        />
      )}

      {/* Modal: Crear instrumento (formulario en 2 pasos: datos + métricas) */}
      <Modal
        open={modalCrear}
        onClose={cerrarModalCrear}
        title={pasoCrear === 1 ? 'Nuevo instrumento' : 'Métricas del instrumento'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            {pasoCrear === 1 && (
              <Button variant="ghost" onClick={cerrarModalCrear} disabled={guardandoCrear}>
                Cancelar
              </Button>
            )}
            {pasoCrear === 2 && (
              <Button variant="ghost" onClick={() => setPasoCrear(1)} disabled={guardandoCrear}>
                Atrás
              </Button>
            )}
            <Button
              onClick={handleCrear}
              loading={guardandoCrear}
              disabled={pasoCrear === 2 && metricasCrear.length === 0}
            >
              {pasoCrear === 1 ? 'Siguiente' : 'Crear instrumento'}
            </Button>
          </div>
        }
      >
        {/* Indicador de pasos */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          {[
            { n: 1, label: 'Información' },
            { n: 2, label: 'Métricas' },
          ].map(({ n, label }) => (
            <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <div style={{
                height: 3,
                borderRadius: 2,
                background: pasoCrear >= n ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'background 0.2s',
              }} />
              <span style={{
                fontSize: 'var(--font-size-small)',
                color: pasoCrear === n ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                fontWeight: pasoCrear === n ? 'var(--font-weight-medium)' : 'normal',
              }}>
                {n}. {label}
              </span>
            </div>
          ))}
        </div>

        {/* Paso 1 — info del instrumento */}
        {pasoCrear === 1 && (
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

            {/* Etiquetas */}
            <TagChipInput
              label="Etiquetas"
              inputId="crear-tags"
              tags={formCrear.tags}
              tagInput={formCrear.tagInput}
              catalog={tagCatalog}
              onAdd={addTagCrear}
              onRemove={removeTagCrear}
              onInputChange={(v) => setFormCrear((prev) => ({ ...prev, tagInput: v }))}
              onKeyDown={handleTagInputKeyDownCrear}
            />

            {/* Días mínimos entre aplicaciones */}
            <FormField
              id="crear-min-days"
              label="Días mínimos entre aplicaciones"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={formCrear.min_days_between_applications}
              onChange={(e) =>
                setFormCrear((prev) => ({
                  ...prev,
                  min_days_between_applications: e.target.value === '' ? '' : String(Math.max(0, parseInt(e.target.value, 10) || 0)),
                }))
              }
              helper="0 = sin restricción. Bloquea aplicaciones repetidas dentro de la ventana."
            />
          </div>
        )}

        {/* Paso 2 — definir métricas */}
        {pasoCrear === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {errorApiCrear && <Alert variant="error">{errorApiCrear}</Alert>}

            {/* Lista de métricas añadidas */}
            {metricasCrear.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {metricasCrear.map((m) => (
                  <div key={m._tempId} style={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    gap: 'var(--space-3)',
                    alignItems: 'flex-start',
                  }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                      {/* Fila 1: nombre + tipo + obligatoria */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-small)', color: 'var(--color-text-primary)' }}>
                          {m.name}
                        </span>
                        <span style={{
                          fontSize: 'var(--font-size-small)',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1px var(--space-2)',
                          color: 'var(--color-text-secondary)',
                        }}>
                          {TIPO_LABELS[m.metric_type]}
                        </span>
                        {m.required ? (
                          <span style={{
                            fontSize: 'var(--font-size-small)',
                            color: 'var(--color-error-text)',
                            background: 'var(--color-error-bg)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1px var(--space-2)',
                          }}>
                            Obligatoria
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 'var(--font-size-small)',
                            color: 'var(--color-text-tertiary)',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1px var(--space-2)',
                          }}>
                            Opcional
                          </span>
                        )}
                      </div>
                      {/* Fila 2: detalles tipo-específicos */}
                      {m.metric_type === 'numeric' && (m.min_value !== '' || m.max_value !== '') && (
                        <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                          Rango: {m.min_value !== '' ? m.min_value : '—'} → {m.max_value !== '' ? m.max_value : '—'}
                        </p>
                      )}
                      {m.metric_type === 'categorical' && m.options && (
                        <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                          Opciones: {m.options}
                        </p>
                      )}
                      {/* Fila 3: descripción */}
                      {m.description && (
                        <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)', margin: 0 }}>
                          {m.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-icon"
                      style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
                      onClick={() => quitarMetricaCrear(m._tempId)}
                      aria-label={`Quitar ${m.name}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario inline para nueva métrica — siempre visible */}
            <div style={{
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}>
              <p style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
                {metricasCrear.length === 0 ? 'Define la primera métrica *' : 'Agregar otra métrica'}
              </p>

              <FormField
                id="crear-m-nombre"
                label="Nombre de la métrica"
                required
                placeholder="Ej. Velocidad lectora"
                value={formMetrica.name}
                onChange={(e) => { setFormMetrica((p) => ({ ...p, name: e.target.value })); if (erroresMetrica.name) setErroresMetrica((p) => ({ ...p, name: '' })) }}
                error={erroresMetrica.name}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label className="field-label">
                  Tipo <span style={{ color: 'var(--color-error-text)' }}>*</span>
                </label>
                <select
                  className="input-base"
                  value={formMetrica.metric_type}
                  onChange={(e) => setFormMetrica((p) => ({ ...p, metric_type: e.target.value, min_value: '', max_value: '', options: '' }))}
                >
                  {METRIC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  id="crear-m-required"
                  type="checkbox"
                  checked={formMetrica.required}
                  onChange={(e) => setFormMetrica((p) => ({ ...p, required: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="crear-m-required" className="field-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Campo obligatorio
                </label>
              </div>

              {formMetrica.metric_type === 'numeric' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <FormField id="crear-m-min" label="Valor mínimo" type="number" placeholder="Sin límite"
                    value={formMetrica.min_value}
                    onChange={(e) => setFormMetrica((p) => ({ ...p, min_value: e.target.value }))}
                  />
                  <FormField id="crear-m-max" label="Valor máximo" type="number" placeholder="Sin límite"
                    value={formMetrica.max_value}
                    onChange={(e) => { setFormMetrica((p) => ({ ...p, max_value: e.target.value })); if (erroresMetrica.max_value) setErroresMetrica((p) => ({ ...p, max_value: '' })) }}
                    error={erroresMetrica.max_value}
                  />
                </div>
              )}

              {formMetrica.metric_type === 'categorical' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label className="field-label">
                    Opciones <span style={{ color: 'var(--color-error-text)' }}>*</span>
                    <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 'normal', marginLeft: 'var(--space-1)' }}>(separadas por coma)</span>
                  </label>
                  <textarea
                    className="input-base"
                    placeholder="Ej. Bajo, Medio, Alto"
                    rows={2}
                    value={formMetrica.options}
                    onChange={(e) => { setFormMetrica((p) => ({ ...p, options: e.target.value })); if (erroresMetrica.options) setErroresMetrica((p) => ({ ...p, options: '' })) }}
                    style={{ height: 'auto', padding: 'var(--space-2) var(--space-3)', resize: 'vertical' }}
                  />
                  {erroresMetrica.options && <p className="field-error" role="alert">{erroresMetrica.options}</p>}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="button" size="sm" icon={Plus} onClick={agregarMetricaCrear}>
                  {metricasCrear.length === 0 ? 'Agregar métrica' : 'Añadir otra métrica'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Editar instrumento */}
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

          <TagChipInput
            label="Etiquetas"
            inputId="editar-tags"
            tags={formEditar.tags}
            tagInput={formEditar.tagInput}
            catalog={tagCatalog}
            onAdd={addTagEditar}
            onRemove={removeTagEditar}
            onInputChange={(v) => setFormEditar((prev) => ({ ...prev, tagInput: v }))}
            onKeyDown={handleTagInputKeyDownEditar}
          />

          <FormField
            id="editar-min-days"
            label="Días mínimos entre aplicaciones"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={formEditar.min_days_between_applications}
            onChange={(e) =>
              setFormEditar((prev) => ({
                ...prev,
                min_days_between_applications: e.target.value === '' ? '' : String(Math.max(0, parseInt(e.target.value, 10) || 0)),
              }))
            }
            helper="0 = sin restricción."
          />
        </div>
      </Modal>

      {/* Modal: Cambiar estado del instrumento (activo / inactivo) */}
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

      {/* ── Modal: Eliminar instrumento (soft delete) ── */}
      <Modal
        open={modalEliminar}
        onClose={() => { setModalEliminar(false); setInstrumentoSeleccionado(null) }}
        size="sm"
        title="Eliminar instrumento"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setModalEliminar(false); setInstrumentoSeleccionado(null) }} disabled={guardandoEliminar}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEliminar} loading={guardandoEliminar}>
              Eliminar
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorApiEliminar && <Alert variant="error">{errorApiEliminar}</Alert>}
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}>
            ¿Eliminar el instrumento{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{instrumentoSeleccionado?.name}</strong>?
            Esta acción lo elimina de la lista. Los registros históricos no se verán afectados.
          </p>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

export default GestionInstrumentos
