import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Plus, Pencil, Trash2, Hash } from 'lucide-react'
import {
  Button,
  Modal,
  FormField,
  Alert,
  EmptyState,
  StatusBadge,
  Typography,
  ActionsMenu,
  ToastContainer,
  useToast,
} from '@/components/app'
import {
  obtenerInstrumento,
  listarMetricas,
  crearMetrica,
  editarMetrica,
  eliminarMetrica,
} from '@/services/instruments'

// ── Constantes ───────────────────────────────────────────────────────────────

const METRIC_TYPES = [
  { value: 'numeric',     label: 'Numérico'   },
  { value: 'categorical', label: 'Categórico' },
  { value: 'boolean',     label: 'Booleano'   },
  { value: 'short_text',  label: 'Texto corto'},
]

const TIPO_LABELS = Object.fromEntries(METRIC_TYPES.map((t) => [t.value, t.label]))

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function fechaLegible(fechaISO) {
  if (!fechaISO) return '—'
  const [y, m, d] = fechaISO.split('-')
  return `${parseInt(d)} ${MESES_ES[parseInt(m) - 1]} ${y}`
}

function emptyForm() {
  return {
    name: '',
    metric_type: 'numeric',
    required: true,
    description: '',
    min_value: '',
    max_value: '',
    options: '',
  }
}

// ── Subcomponente: formulario de métrica ─────────────────────────────────────

function MetricaForm({ form, onChange, errores, onClearError }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FormField
        id="mf-nombre"
        label="Nombre"
        required
        placeholder="Ej. Velocidad lectora"
        value={form.name}
        onChange={(e) => { onChange('name', e.target.value); onClearError('name') }}
        error={errores.name}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label className="field-label">
          Tipo de métrica <span style={{ color: 'var(--color-error-text)' }}>*</span>
        </label>
        <select
          className="input-base"
          value={form.metric_type}
          onChange={(e) => {
            onChange('metric_type', e.target.value)
            onChange('min_value', '')
            onChange('max_value', '')
            onChange('options', '')
          }}
        >
          {METRIC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input
          id="mf-required"
          type="checkbox"
          checked={form.required}
          onChange={(e) => onChange('required', e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        <label htmlFor="mf-required" className="field-label" style={{ margin: 0, cursor: 'pointer' }}>
          Campo obligatorio en registro
        </label>
      </div>

      {form.metric_type === 'numeric' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField
            id="mf-min"
            label="Valor mínimo"
            type="number"
            placeholder="Sin límite"
            value={form.min_value}
            onChange={(e) => onChange('min_value', e.target.value)}
          />
          <FormField
            id="mf-max"
            label="Valor máximo"
            type="number"
            placeholder="Sin límite"
            value={form.max_value}
            onChange={(e) => { onChange('max_value', e.target.value); onClearError('max_value') }}
            error={errores.max_value}
          />
        </div>
      )}

      {form.metric_type === 'categorical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label className="field-label">
            Opciones <span style={{ color: 'var(--color-error-text)' }}>*</span>
            <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 'normal', marginLeft: 'var(--space-1)' }}>
              (separadas por coma)
            </span>
          </label>
          <textarea
            className="input-base"
            placeholder="Ej. Bajo, Medio, Alto"
            rows={2}
            value={form.options}
            onChange={(e) => { onChange('options', e.target.value); onClearError('options') }}
            style={{ height: 'auto', padding: 'var(--space-2) var(--space-3)', resize: 'vertical' }}
          />
          {errores.options && <p className="field-error" role="alert">{errores.options}</p>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label className="field-label">Descripción</label>
        <textarea
          className="input-base"
          placeholder="Descripción o instrucciones de la métrica..."
          rows={2}
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          style={{ height: 'auto', padding: 'var(--space-2) var(--space-3)', resize: 'vertical' }}
        />
      </div>
    </div>
  )
}

MetricaForm.propTypes = {
  form:        PropTypes.object.isRequired,
  onChange:    PropTypes.func.isRequired,
  errores:     PropTypes.object.isRequired,
  onClearError: PropTypes.func.isRequired,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function validarForm(form) {
  const errs = {}
  if (!form.name.trim()) errs.name = 'El nombre es obligatorio.'
  if (form.metric_type === 'categorical' && !form.options.trim()) {
    errs.options = 'Las opciones son obligatorias para tipo categórico.'
  }
  if (
    form.metric_type === 'numeric' &&
    form.min_value !== '' &&
    form.max_value !== '' &&
    parseFloat(form.min_value) >= parseFloat(form.max_value)
  ) {
    errs.max_value = 'El valor máximo debe ser mayor que el mínimo.'
  }
  return errs
}

function buildBody(form) {
  const body = {
    name: form.name.trim(),
    metric_type: form.metric_type,
    required: form.required,
  }
  if (form.description.trim()) body.description = form.description.trim()
  if (form.metric_type === 'numeric') {
    if (form.min_value !== '') body.min_value = parseFloat(form.min_value)
    if (form.max_value !== '') body.max_value = parseFloat(form.max_value)
  }
  if (form.metric_type === 'categorical') {
    body.options = form.options.split(',').map((o) => o.trim()).filter(Boolean)
  }
  return body
}

function formFromMetrica(m) {
  return {
    name:        m.name,
    metric_type: m.metric_type,
    required:    m.required,
    description: m.description || '',
    min_value:   m.min_value != null ? String(m.min_value) : '',
    max_value:   m.max_value != null ? String(m.max_value) : '',
    options:     m.options ? m.options.join(', ') : '',
  }
}

// ── Componente principal ─────────────────────────────────────────────────────

function InstrumentoDetallePage() {
  const { token } = useAuth()
  const { id }       = useParams()
  const navigate     = useNavigate()
  const location     = useLocation()

  const [instrumento,       setInstrumento]       = useState(location.state?.instrumento || null)
  const [metricas,          setMetricas]          = useState([])
  const [cargando,          setCargando]          = useState(!location.state?.instrumento)
  const [cargandoMetricas,  setCargandoMetricas]  = useState(true)

  // Modal agregar
  const [modalAgregar,     setModalAgregar]     = useState(false)
  const [formAgregar,      setFormAgregar]      = useState(emptyForm())
  const [erroresAgregar,   setErroresAgregar]   = useState({})
  const [errorApiAgregar,  setErrorApiAgregar]  = useState('')
  const [guardandoAgregar, setGuardandoAgregar] = useState(false)

  // Modal editar
  const [modalEditar,     setModalEditar]     = useState(false)
  const [metricaEditar,   setMetricaEditar]   = useState(null)
  const [formEditar,      setFormEditar]      = useState(emptyForm())
  const [erroresEditar,   setErroresEditar]   = useState({})
  const [errorApiEditar,  setErrorApiEditar]  = useState('')
  const [guardandoEditar, setGuardandoEditar] = useState(false)

  // Modal eliminar
  const [modalEliminar,     setModalEliminar]     = useState(false)
  const [metricaEliminar,   setMetricaEliminar]   = useState(null)
  const [guardandoEliminar, setGuardandoEliminar] = useState(false)
  const [errorApiEliminar,  setErrorApiEliminar]  = useState('')

  const { toasts, toast, dismiss } = useToast()

  // ── Carga ─────────────────────────────────────────────────────────────────

  const cargarInstrumento = useCallback(async () => {
    setCargando(true)
    try {
      const res = await obtenerInstrumento(token, id)
      if (res.status === 'success') setInstrumento(res.data)
      else toast({ type: 'error', title: 'Error', message: res.message || 'No se pudo cargar el instrumento.' })
    } catch {
      toast({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setCargando(false)
    }
  }, [token, id, toast])

  const cargarMetricas = useCallback(async () => {
    setCargandoMetricas(true)
    try {
      const res = await listarMetricas(token, id)
      if (res.status === 'success') setMetricas(res.data)
    } catch {
      // silencioso — lista vacía
    } finally {
      setCargandoMetricas(false)
    }
  }, [token, id])

  useEffect(() => {
    if (!instrumento) cargarInstrumento()
    cargarMetricas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Helpers form ──────────────────────────────────────────────────────────

  function patchAgregar(campo, valor) {
    setFormAgregar((p) => ({ ...p, [campo]: valor }))
  }
  function clearErrAgregar(campo) {
    if (erroresAgregar[campo]) setErroresAgregar((p) => ({ ...p, [campo]: '' }))
  }

  function patchEditar(campo, valor) {
    setFormEditar((p) => ({ ...p, [campo]: valor }))
  }
  function clearErrEditar(campo) {
    if (erroresEditar[campo]) setErroresEditar((p) => ({ ...p, [campo]: '' }))
  }

  // ── Agregar ───────────────────────────────────────────────────────────────

  async function handleAgregar() {
    const errs = validarForm(formAgregar)
    if (Object.keys(errs).length > 0) { setErroresAgregar(errs); return }
    setGuardandoAgregar(true)
    setErrorApiAgregar('')
    try {
      const body = { ...buildBody(formAgregar), instrument_id: id }
      const res = await crearMetrica(token, body)
      if (res.status === 'success') {
        setMetricas((prev) => [...prev, res.data])
        toast({ type: 'success', title: 'Métrica agregada', message: `"${res.data.name}" fue registrada.` })
        setModalAgregar(false)
        setFormAgregar(emptyForm())
        setErroresAgregar({})
      } else {
        setErrorApiAgregar(res.message || 'Error al crear la métrica.')
      }
    } catch {
      setErrorApiAgregar('No se pudo conectar con el servidor.')
    } finally {
      setGuardandoAgregar(false)
    }
  }

  function abrirAgregar() {
    setFormAgregar(emptyForm())
    setErroresAgregar({})
    setErrorApiAgregar('')
    setModalAgregar(true)
  }

  // ── Editar ────────────────────────────────────────────────────────────────

  function abrirEditar(metrica) {
    setMetricaEditar(metrica)
    setFormEditar(formFromMetrica(metrica))
    setErroresEditar({})
    setErrorApiEditar('')
    setModalEditar(true)
  }

  async function handleEditar() {
    const errs = validarForm(formEditar)
    if (Object.keys(errs).length > 0) { setErroresEditar(errs); return }
    setGuardandoEditar(true)
    setErrorApiEditar('')
    try {
      const res = await editarMetrica(token, metricaEditar.id, buildBody(formEditar))
      if (res.status === 'success') {
        setMetricas((prev) => prev.map((m) => (m.id === res.data.id ? res.data : m)))
        toast({ type: 'success', title: 'Métrica actualizada', message: 'Los cambios se guardaron correctamente.' })
        setModalEditar(false)
      } else {
        setErrorApiEditar(res.message || 'Error al actualizar la métrica.')
      }
    } catch {
      setErrorApiEditar('No se pudo conectar con el servidor.')
    } finally {
      setGuardandoEditar(false)
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  function abrirEliminar(metrica) {
    setMetricaEliminar(metrica)
    setErrorApiEliminar('')
    setModalEliminar(true)
  }

  async function handleEliminar() {
    setGuardandoEliminar(true)
    setErrorApiEliminar('')
    try {
      const res = await eliminarMetrica(token, metricaEliminar.id)
      if (res.status === 'success') {
        setMetricas((prev) => prev.filter((m) => m.id !== metricaEliminar.id))
        toast({ type: 'success', title: 'Métrica eliminada', message: `"${metricaEliminar.name}" fue eliminada.` })
        setModalEliminar(false)
      } else {
        setErrorApiEliminar(res.message || 'Error al eliminar la métrica.')
      }
    } catch {
      setErrorApiEliminar('No se pudo conectar con el servidor.')
    } finally {
      setGuardandoEliminar(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <main className="page-container">
        <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-8)' }}>Cargando...</p>
      </main>
    )
  }

  return (
    <main className="page-container">

      {/* Back + header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button
          className="btn btn-ghost"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-1) var(--space-2)',
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-text-secondary)',
          }}
          onClick={() => navigate('/instruments')}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Instrumentos
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Typography as="h1">{instrumento?.name || '—'}</Typography>
          {instrumento?.is_active != null && <StatusBadge status={instrumento.is_active ? 'active' : 'inactive'} />}
        </div>
      </div>

      {/* Info card */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-5)',
        marginBottom: 'var(--space-6)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        <div>
          <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-1)' }}>
            Descripción metodológica
          </p>
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)' }}>
            {instrumento?.methodological_description || (
              <span style={{ color: 'var(--color-text-tertiary)' }}>Sin descripción</span>
            )}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-1)' }}>
            Vigencia
          </p>
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {fechaLegible(instrumento?.start_date)} → {fechaLegible(instrumento?.end_date)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-1)' }}>
            Métricas
          </p>
          <p style={{ fontSize: 'var(--font-size-body)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
            {cargandoMetricas ? '…' : `${metricas.length} ${metricas.length === 1 ? 'métrica' : 'métricas'}`}
          </p>
        </div>
      </div>

      {/* Sección métricas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <Typography as="h2" style={{ fontSize: 'var(--font-size-h2)' }}>
          Métricas del instrumento
        </Typography>
        <Button icon={Plus} onClick={abrirAgregar}>
          Agregar métrica
        </Button>
      </div>

      {/* Lista de métricas */}
      {!cargandoMetricas && metricas.length === 0 ? (
        <EmptyState
          icon={Hash}
          title="Sin métricas definidas"
          message="Agrega al menos una métrica para que el instrumento pueda recibir registros."
          action={
            <Button size="sm" icon={Plus} iconPosition="left" onClick={abrirAgregar}>
              Agregar métrica
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {metricas.map((metrica) => (
            <div
              key={metrica.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-4)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                    {metrica.name}
                  </span>
                  <span style={{
                    fontSize: 'var(--font-size-small)',
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1px var(--space-2)',
                    color: 'var(--color-text-secondary)',
                  }}>
                    {TIPO_LABELS[metrica.metric_type] || metrica.metric_type}
                  </span>
                  {metrica.required && (
                    <span style={{
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-error-text)',
                      background: 'var(--color-error-bg)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1px var(--space-2)',
                    }}>
                      Obligatoria
                    </span>
                  )}
                </div>

                {metrica.description && (
                  <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                    {metrica.description}
                  </p>
                )}

                {metrica.metric_type === 'numeric' && (metrica.min_value != null || metrica.max_value != null) && (
                  <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                    Rango: {metrica.min_value ?? '—'} → {metrica.max_value ?? '—'}
                  </p>
                )}

                {metrica.metric_type === 'categorical' && metrica.options?.length > 0 && (
                  <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                    Opciones: {metrica.options.join(', ')}
                  </p>
                )}
              </div>

              <ActionsMenu actions={[
                { label: 'Editar',   icon: Pencil, onClick: () => abrirEditar(metrica) },
                { label: 'Eliminar', icon: Trash2, onClick: () => abrirEliminar(metrica), variant: 'danger' },
              ]} />
            </div>
          ))}
        </div>
      )}

      {/* Modal: Agregar métrica */}
      <Modal
        open={modalAgregar}
        onClose={() => setModalAgregar(false)}
        title="Agregar métrica"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setModalAgregar(false)} disabled={guardandoAgregar}>
              Cancelar
            </Button>
            <Button onClick={handleAgregar} loading={guardandoAgregar}>
              Agregar
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorApiAgregar && <Alert variant="error">{errorApiAgregar}</Alert>}
          <MetricaForm
            form={formAgregar}
            onChange={patchAgregar}
            errores={erroresAgregar}
            onClearError={clearErrAgregar}
          />
        </div>
      </Modal>

      {/* Modal: Editar métrica */}
      <Modal
        open={modalEditar}
        onClose={() => setModalEditar(false)}
        title={metricaEditar ? `Editar — ${metricaEditar.name}` : 'Editar métrica'}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setModalEditar(false)} disabled={guardandoEditar}>
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
          <MetricaForm
            form={formEditar}
            onChange={patchEditar}
            errores={erroresEditar}
            onClearError={clearErrEditar}
          />
        </div>
      </Modal>

      {/* Modal: Confirmar eliminar */}
      <Modal
        open={modalEliminar}
        onClose={() => setModalEliminar(false)}
        size="sm"
        title="Eliminar métrica"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setModalEliminar(false)} disabled={guardandoEliminar}>
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
            ¿Eliminar la métrica{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{metricaEliminar?.name}</strong>?
            Esta acción no se puede deshacer.
          </p>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

export default InstrumentoDetallePage
