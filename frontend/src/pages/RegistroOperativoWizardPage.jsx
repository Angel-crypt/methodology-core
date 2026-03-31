import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, DatePicker, FormField, Alert, Spinner, Typography, ToastContainer, useToast } from '@/components/app'

const AGE_COHORT_REGEX = /^\d+-\d+$/

function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const CONTEXT_OPTIONS = {
  school_type:         ['public', 'private', 'unknown'],
  education_level:     ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'],
  gender:              ['male', 'female', 'non_binary', 'prefer_not_to_say'],
  socioeconomic_level: ['low', 'medium', 'high', 'unknown'],
}

// Etiquetas en español para los valores API de los enums de contexto
const CONTEXT_LABELS = {
  school_type: {
    public:  'Pública',
    private: 'Privada',
    unknown: 'Desconocido',
  },
  education_level: {
    preschool:     'Preescolar',
    primary_lower: 'Primaria inferior (1°–3°)',
    primary_upper: 'Primaria superior (4°–6°)',
    secondary:     'Secundaria',
    unknown:       'Desconocido',
  },
  gender: {
    male:              'Masculino',
    female:            'Femenino',
    non_binary:        'No binario',
    prefer_not_to_say: 'Prefiero no decirlo',
  },
  socioeconomic_level: {
    low:     'Bajo',
    medium:  'Medio',
    high:    'Alto',
    unknown: 'Desconocido',
  },
}

const STEP_LABELS = [
  '1. Sujeto',
  '2. Contexto',
  '3. Aplicación',
  '4. Métricas',
]

function Step1Subject({
  onCreate,
  loading,
  apiError,
  subjectId,
  mode,
  onModeChange,
  subjectInput,
  onSubjectInputChange,
  onLoadExisting,
  loadingExisting,
}) {
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Typography as="h2">Paso 1: Identificar sujeto</Typography>

      {apiError && <Alert variant="error">{apiError}</Alert>}

      {subjectId ? (
        <Alert variant="success">
          Sujeto listo. UUID: <span style={{ fontFamily: 'monospace' }}>{subjectId}</span>
        </Alert>
      ) : (
        <>
          {/* Toggle de modo */}
          <div className="date-mode-toggle">
            <button
              type="button"
              className={`date-mode-btn${mode === 'new' ? ' date-mode-btn--active' : ''}`}
              onClick={() => onModeChange('new')}
            >
              Nuevo sujeto
            </button>
            <button
              type="button"
              className={`date-mode-btn${mode === 'existing' ? ' date-mode-btn--active' : ''}`}
              onClick={() => onModeChange('existing')}
            >
              Sujeto existente
            </button>
          </div>

          {mode === 'new' && (
            <>
              <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
                Genera un nuevo identificador anónimo para este sujeto.
              </Typography>
              <Button onClick={onCreate} loading={loading}>
                Registrar nuevo sujeto
              </Button>
            </>
          )}

          {mode === 'existing' && (
            <>
              <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
                Ingresa el UUID de un sujeto ya registrado para añadirle una nueva aplicación de instrumento.
              </Typography>
              <label className="field-label">
                UUID del sujeto
                <input
                  className="input-base"
                  type="text"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={subjectInput}
                  onChange={(e) => onSubjectInputChange(e.target.value.trim())}
                  style={{ fontFamily: 'monospace' }}
                />
              </label>
              <div>
                <Button
                  onClick={onLoadExisting}
                  loading={loadingExisting}
                  disabled={!subjectInput}
                >
                  Cargar sujeto
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

const BADGE_COHORT = {
  restricted: { label: 'Restringido', bg: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' },
  libre:      { label: 'Libre',       bg: 'var(--color-info-bg)',    color: 'var(--color-info-text)'    },
}

function Step2Context({
  contextData,
  onChange,
  onSubmit,
  onBack,
  loading,
  apiError,
  validationError,
  contextOptions,
  cohortMode,
  ageCohortOptions,
  isValid,
  alreadySaved,
}) {
  const cohortRestricted = cohortMode === 'restricted'
  const badge = BADGE_COHORT[cohortMode] ?? BADGE_COHORT.libre

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Typography as="h2">Paso 2: Registrar contexto</Typography>
      <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
        Todos los campos son obligatorios.
      </Typography>

      {apiError && <Alert variant="error">{apiError}</Alert>}
      {validationError && <Alert variant="warning">{validationError}</Alert>}
      {alreadySaved && (
        <Alert variant="info">
          Paso guardado. Puedes revisar la información, pero ya no puede modificarse.
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <label className="field-label">
          Tipo de institución *
          <select className="input-base" value={contextData.school_type} onChange={(e) => onChange('school_type', e.target.value)} disabled={alreadySaved}>
            <option value="">Selecciona...</option>
            {contextOptions.school_type.map((value) => (
              <option key={value} value={value}>{CONTEXT_LABELS.school_type[value] || value}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Nivel educativo *
          <select className="input-base" value={contextData.education_level} onChange={(e) => onChange('education_level', e.target.value)} disabled={alreadySaved}>
            <option value="">Selecciona...</option>
            {contextOptions.education_level.map((value) => (
              <option key={value} value={value}>{CONTEXT_LABELS.education_level[value] || value}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            Cohorte de edad *
            <span style={{
              fontSize: 'var(--font-size-caption)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-pill)',
              background: badge.bg,
              color: badge.color,
              fontWeight: 'var(--font-weight-medium)',
            }}>
              {badge.label}
            </span>
          </span>
          {cohortRestricted ? (
            <input
              className="input-base"
              type="text"
              value={contextData.age_cohort}
              readOnly
              placeholder="Se asigna según nivel educativo"
              style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed', color: 'var(--color-text-secondary)' }}
            />
          ) : (
            <select className="input-base" value={contextData.age_cohort} onChange={(e) => onChange('age_cohort', e.target.value)} disabled={alreadySaved}>
              <option value="">Selecciona...</option>
              {ageCohortOptions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          )}
        </label>

        <label className="field-label">
          Género *
          <select className="input-base" value={contextData.gender} onChange={(e) => onChange('gender', e.target.value)} disabled={alreadySaved}>
            <option value="">Selecciona...</option>
            {contextOptions.gender.map((value) => (
              <option key={value} value={value}>{CONTEXT_LABELS.gender[value] || value}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Nivel socioeconómico *
          <select
            className="input-base"
            value={contextData.socioeconomic_level}
            onChange={(e) => onChange('socioeconomic_level', e.target.value)}
            disabled={alreadySaved}
          >
            <option value="">Selecciona...</option>
            {contextOptions.socioeconomic_level.map((value) => (
              <option key={value} value={value}>{CONTEXT_LABELS.socioeconomic_level[value] || value}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onSubmit} loading={loading} disabled={!isValid && !alreadySaved}>
          {alreadySaved ? 'Continuar →' : 'Guardar contexto y continuar'}
        </Button>
      </div>
    </section>
  )
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
function fmtISO(iso) {
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${MESES_CORTOS[parseInt(m) - 1]} ${y}`
}

function Step3Application({
  instruments,
  loadingInstruments,
  applicationDraft,
  onChange,
  onSubmit,
  onBack,
  loadingSubmit,
  apiError,
  validationError,
  alreadySaved,
}) {
  const todayISO = new Date().toISOString().split('T')[0]
  const minISO   = addDaysISO(todayISO, -3)
  const maxISO   = addDaysISO(todayISO,  3)

  const [dateMode, setDateMode] = useState(() => {
    if (!applicationDraft.application_date || applicationDraft.application_date === todayISO) return 'today'
    return 'other'
  })

  function handleDateMode(mode) {
    setDateMode(mode)
    if (mode === 'today') onChange('application_date', todayISO)
    else onChange('application_date', '')
  }

  const activeInstruments = instruments.filter((i) => i.status === 'active')

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Typography as="h2">Paso 3: Registrar aplicación</Typography>
      <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
        Selecciona el instrumento a aplicar y completa la información de sesión.
      </Typography>

      {apiError && <Alert variant="error">{apiError}</Alert>}
      {validationError && <Alert variant="warning">{validationError}</Alert>}
      {alreadySaved && (
        <Alert variant="info">
          Paso guardado. Puedes revisar la información, pero ya no puede modificarse.
        </Alert>
      )}

      {loadingInstruments ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Spinner />
          <Typography as="small">Cargando instrumentos...</Typography>
        </div>
      ) : (
        <label className="field-label">
          Instrumento *
          <select className="input-base" value={applicationDraft.instrument_id} onChange={(e) => onChange('instrument_id', e.target.value)} disabled={alreadySaved}>
            <option value="">Selecciona un instrumento</option>
            {activeInstruments.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div>
        <label className="field-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
          Fecha de aplicación *
        </label>
        <div className="date-mode-toggle">
          <button
            type="button"
            className={`date-mode-btn${dateMode === 'today' ? ' date-mode-btn--active' : ''}`}
            onClick={() => !alreadySaved && handleDateMode('today')}
            disabled={alreadySaved}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`date-mode-btn${dateMode === 'other' ? ' date-mode-btn--active' : ''}`}
            onClick={() => !alreadySaved && handleDateMode('other')}
            disabled={alreadySaved}
          >
            Otra fecha
          </button>
        </div>
        {dateMode === 'today' && (
          <p style={{
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-text-secondary)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
          }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
        {dateMode === 'other' && (
          <>
            <DatePicker
              value={applicationDraft.application_date}
              onChange={(iso) => onChange('application_date', iso)}
              min={minISO}
              max={maxISO}
              placeholder="Selecciona una fecha (±3 días)"
              disabled={alreadySaved}
            />
            <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
              Solo se permiten fechas entre {fmtISO(minISO)} y {fmtISO(maxISO)}.
            </p>
          </>
        )}
      </div>

      <FormField
        id="m4-application-notes"
        label="Notas (opcional)"
        placeholder="Notas de campo"
        value={applicationDraft.notes}
        onChange={(e) => onChange('notes', e.target.value)}
        disabled={alreadySaved}
      />

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onSubmit} loading={loadingSubmit}>
          {alreadySaved ? 'Continuar →' : 'Guardar aplicación y continuar'}
        </Button>
      </div>
    </section>
  )
}

function validateMetricField(metric, value) {
  if (value === '' || value === undefined || value === null) {
    return metric.required ? 'Campo obligatorio.' : ''
  }
  if (metric.metric_type === 'numeric') {
    const n = Number(value)
    if (isNaN(n)) return 'Debe ser un número.'
    if (metric.min_value != null && n < metric.min_value) return `Mínimo permitido: ${metric.min_value}.`
    if (metric.max_value != null && n > metric.max_value) return `Máximo permitido: ${metric.max_value}.`
  }
  return ''
}

function numericHelper(metric) {
  const hasMin = metric.min_value != null
  const hasMax = metric.max_value != null
  if (hasMin && hasMax) return `Rango: ${metric.min_value} – ${metric.max_value}`
  if (hasMin) return `Mínimo: ${metric.min_value}`
  if (hasMax) return `Máximo: ${metric.max_value}`
  return null
}

/** Texto de ayuda combinado: descripción opcional + restricción de rango */
function fieldHelper(metric) {
  const parts = []
  if (metric.description) parts.push(metric.description)
  if (metric.metric_type === 'numeric') {
    const range = numericHelper(metric)
    if (range) parts.push(range)
  }
  return parts.length ? parts.join(' · ') : undefined
}

function Step4Metrics({
  metricDefinitions,
  metricValues,
  onMetricChange,
  onBack,
  onSubmit,
  onErrorToast,
  loadingMetrics,
  loadingSubmit,
  apiError,
}) {
  const [fieldErrors, setFieldErrors] = useState({})
  const requiredCount = metricDefinitions.filter((m) => m.required).length

  function handleChange(metric, value) {
    onMetricChange(metric.id, value)
    const err = validateMetricField(metric, value)
    setFieldErrors((prev) => ({ ...prev, [metric.id]: err }))
  }

  function handleSubmitWithValidation() {
    const errs = {}
    let hasError = false
    metricDefinitions.forEach((m) => {
      const err = validateMetricField(m, metricValues[m.id] ?? '')
      if (err) { errs[m.id] = err; hasError = true }
    })
    if (hasError) {
      setFieldErrors(errs)
      onErrorToast('Hay campos obligatorios sin completar o con valores fuera de rango.')
      return
    }
    onSubmit()
  }

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Typography as="h2">Paso 4: Capturar métricas</Typography>
      <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
        Ingresa los valores para cada métrica del instrumento. Obligatorias: {requiredCount}.
      </Typography>

      {apiError && <Alert variant="error">{apiError}</Alert>}

      {loadingMetrics ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Spinner />
          <Typography as="small">Cargando definición de métricas...</Typography>
        </div>
      ) : metricDefinitions.length === 0 ? (
        <Alert variant="info">No hay métricas para el instrumento seleccionado.</Alert>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          {metricDefinitions.map((metric) => {
            const value = metricValues[metric.id] ?? ''
            const label = `${metric.name}${metric.required ? ' *' : ''}`
            const fieldErr = fieldErrors[metric.id] || ''
            // Required-only errors → toast + red border (no inline text)
            // Range/type errors → inline error text + red border
            const isRequiredOnly = fieldErr === 'Campo obligatorio.'
            const inlineError = !isRequiredOnly && fieldErr ? `Error: ${fieldErr}` : undefined
            const hasRedBorder = !!fieldErr

            const helper = inlineError ? undefined : fieldHelper(metric)

            if (metric.metric_type === 'numeric') {
              return (
                <FormField
                  key={metric.id}
                  id={`metric-${metric.id}`}
                  label={label}
                  type="number"
                  value={value}
                  onChange={(e) => handleChange(metric, e.target.value)}
                  placeholder="Valor numérico"
                  helper={helper}
                  error={inlineError}
                  aria-invalid={hasRedBorder && !inlineError ? 'true' : undefined}
                />
              )
            }

            if (metric.metric_type === 'categorical') {
              return (
                <div key={metric.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label className="field-label">{label}</label>
                  <select
                    className="input-base"
                    value={value}
                    onChange={(e) => handleChange(metric, e.target.value)}
                    aria-invalid={hasRedBorder ? 'true' : undefined}
                  >
                    <option value="">Selecciona una opción</option>
                    {(metric.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {inlineError && <p className="field-error" role="alert">{inlineError}</p>}
                  {helper && !inlineError && <p className="field-helper">{helper}</p>}
                </div>
              )
            }

            if (metric.metric_type === 'boolean') {
              return (
                <div key={metric.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label className="field-label">{label}</label>
                  <select
                    className="input-base"
                    value={value}
                    onChange={(e) => handleChange(metric, e.target.value)}
                    aria-invalid={hasRedBorder ? 'true' : undefined}
                  >
                    <option value="">Selecciona</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                  {inlineError && <p className="field-error" role="alert">{inlineError}</p>}
                  {helper && !inlineError && <p className="field-helper">{helper}</p>}
                </div>
              )
            }

            return (
              <FormField
                key={metric.id}
                id={`metric-${metric.id}`}
                label={label}
                value={value}
                onChange={(e) => handleChange(metric, e.target.value)}
                placeholder="Texto corto"
                helper={helper}
                error={inlineError}
                aria-invalid={hasRedBorder && !inlineError ? 'true' : undefined}
              />
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={handleSubmitWithValidation} loading={loadingSubmit}>Guardar métricas y finalizar</Button>
      </div>
    </section>
  )
}

function RegistroOperativoWizardPage({ token }) {
  const { toasts, toast, dismiss } = useToast()
  const [isDone, setIsDone] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [maxReachedStep, setMaxReachedStep] = useState(1)
  const [subjectMode, setSubjectMode] = useState('new')
  const [subjectInput, setSubjectInput] = useState('')
  const [wizardState, setWizardState] = useState({
    subjectId: '',
    contextData: {
      school_type: '',
      education_level: '',
      age_cohort: '',
      gender: '',
      socioeconomic_level: '',
    },
    applicationId: '',
    instrumentId: '',
    metricValues: {},
    applicationDraft: {
      instrument_id: '',
      application_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })
  const [uiState, setUiState] = useState({
    loadingSubject: false,
    loadingContext: false,
    loadingInstruments: false,
    loadingApplication: false,
    loadingMetrics: false,
    loadingMetricSubmit: false,
    apiError: '',
    validationError: '',
  })
  const [instruments, setInstruments] = useState([])
  const [metricDefinitions, setMetricDefinitions] = useState([])
  const [operativoConfig, setOperativoConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  function setApiError(message) {
    setUiState((prev) => ({ ...prev, apiError: message }))
  }

  function setValidationError(message) {
    setUiState((prev) => ({ ...prev, validationError: message }))
  }

  function clearErrors() {
    setUiState((prev) => ({ ...prev, apiError: '', validationError: '' }))
  }

  async function parseResponse(res) {
    try {
      return await res.json()
    } catch {
      return {
        status: 'error',
        message: `Error del servidor (HTTP ${res.status})`,
        data: null,
      }
    }
  }

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  )

  // Opciones de contexto derivadas de la config del admin (con fallback a enums locales)
  const contextOptions = useMemo(() => {
    if (!operativoConfig) return CONTEXT_OPTIONS
    return {
      school_type:         operativoConfig.school_types?.length        ? operativoConfig.school_types        : CONTEXT_OPTIONS.school_type,
      education_level:     operativoConfig.education_levels?.length    ? operativoConfig.education_levels    : CONTEXT_OPTIONS.education_level,
      gender:              operativoConfig.genders?.length             ? operativoConfig.genders             : CONTEXT_OPTIONS.gender,
      socioeconomic_level: operativoConfig.socioeconomic_levels?.length ? operativoConfig.socioeconomic_levels : CONTEXT_OPTIONS.socioeconomic_level,
    }
  }, [operativoConfig])

  const cohortMode = operativoConfig?.cohort_mode ?? 'libre'

  // Todos los campos de contexto deben estar llenos para habilitar el paso 2
  const step2Valid = useMemo(() => {
    const { school_type, education_level, age_cohort, gender, socioeconomic_level } = wizardState.contextData
    return !!(school_type && education_level && age_cohort && gender && socioeconomic_level)
  }, [wizardState.contextData])

  // Rangos disponibles para el modo libre (valores únicos del age_cohort_map)
  const ageCohortOptions = useMemo(() => {
    const map = operativoConfig?.age_cohort_map || {}
    return [...new Set(Object.values(map).filter(Boolean))]
  }, [operativoConfig])

  // Cargar config al montar
  useEffect(() => {
    async function loadConfig() {
      const res = await fetch('/api/v1/config/operativo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseResponse(res)
      setLoadingConfig(false)
      if (data.status === 'success') setOperativoConfig(data.data)
    }
    loadConfig()
  }, [token])

  useEffect(() => {
    if (currentStep < 3 || instruments.length > 0 || uiState.loadingInstruments) return

    async function loadInstruments() {
      setUiState((prev) => ({ ...prev, loadingInstruments: true }))
      const response = await fetch('/api/v1/instruments', { headers: authHeaders })
      const data = await parseResponse(response)
      setUiState((prev) => ({ ...prev, loadingInstruments: false }))

      if (data.status === 'success') {
        setInstruments(data.data || [])
        return
      }

      setApiError(data.message || 'No se pudieron cargar los instrumentos.')
    }

    loadInstruments()
  }, [currentStep, instruments.length, authHeaders, uiState.loadingInstruments])

  useEffect(() => {
    if (currentStep !== 4 || !wizardState.instrumentId || metricDefinitions.length > 0 || uiState.loadingMetrics) return

    async function loadMetrics() {
      setUiState((prev) => ({ ...prev, loadingMetrics: true }))
      const response = await fetch(`/api/v1/metrics?instrument_id=${wizardState.instrumentId}`, { headers: authHeaders })
      const data = await parseResponse(response)
      setUiState((prev) => ({ ...prev, loadingMetrics: false }))

      if (data.status === 'success') {
        setMetricDefinitions(data.data || [])
        return
      }

      setApiError(data.message || 'No se pudieron cargar las métricas.')
    }

    loadMetrics()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, wizardState.instrumentId, authHeaders, metricDefinitions.length])

  async function handleCreateSubject() {
    clearErrors()
    setUiState((prev) => ({ ...prev, loadingSubject: true }))

    const response = await fetch('/api/v1/subjects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await parseResponse(response)

    setUiState((prev) => ({ ...prev, loadingSubject: false }))

    if (data.status !== 'success') {
      setApiError(data.message || 'No se pudo registrar el sujeto.')
      return
    }

    const subjectId = data.data?.id || ''
    setWizardState((prev) => ({ ...prev, subjectId }))
    setCurrentStep(2)
    setMaxReachedStep(2)
    toast({ type: 'success', title: 'Sujeto creado', message: 'UUID generado correctamente.' })
  }

  async function handleLoadExistingSubject() {
    clearErrors()
    setUiState((prev) => ({ ...prev, loadingSubject: true }))

    const response = await fetch(`/api/v1/subjects/${subjectInput}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await parseResponse(response)

    setUiState((prev) => ({ ...prev, loadingSubject: false }))

    if (data.status !== 'success') {
      setApiError(data.message || 'No se encontró el sujeto.')
      return
    }

    const subjectId = data.data.id
    const ctx = data.data.context

    if (ctx) {
      // Sujeto con contexto ya registrado: cargar datos y saltar al paso 3
      setWizardState((prev) => ({
        ...prev,
        subjectId,
        contextData: {
          school_type:         ctx.school_type         || '',
          education_level:     ctx.education_level     || '',
          age_cohort:          ctx.age_cohort          || '',
          gender:              ctx.gender              || '',
          socioeconomic_level: ctx.socioeconomic_level || '',
        },
      }))
      setMaxReachedStep(3)
    } else {
      // Sujeto sin contexto: permitir registrar el contexto en paso 2
      setWizardState((prev) => ({ ...prev, subjectId }))
      setMaxReachedStep(2)
    }

    setCurrentStep(2)
    toast({ type: 'success', title: 'Sujeto cargado', message: `UUID: ${subjectId}` })
  }

  function updateContextData(field, value) {
    setWizardState((prev) => {
      const newContext = { ...prev.contextData, [field]: value }
      // Al cambiar nivel educativo, auto-rellenar cohorte de edad desde la config
      if (field === 'education_level') {
        const range = operativoConfig?.age_cohort_map?.[value]
        if (range) newContext.age_cohort = range
      }
      return { ...prev, contextData: newContext }
    })
  }

  async function handleSubmitContext() {
    clearErrors()
    if (maxReachedStep >= 3) { setCurrentStep(3); return }
    const { subjectId, contextData } = wizardState

    if (!subjectId) {
      setValidationError('Debes completar el paso 1 antes de continuar.')
      return
    }

    if (contextData.age_cohort && !AGE_COHORT_REGEX.test(contextData.age_cohort)) {
      setValidationError('age_cohort debe cumplir el formato N-N. Ejemplo: 6-8.')
      return
    }

    const payload = Object.fromEntries(
      Object.entries(contextData).filter(([, value]) => value !== '')
    )

    setUiState((prev) => ({ ...prev, loadingContext: true }))
    const response = await fetch(`/api/v1/subjects/${subjectId}/context`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    })
    const data = await parseResponse(response)
    setUiState((prev) => ({ ...prev, loadingContext: false }))

    if (data.status !== 'success') {
      setApiError(data.message || 'No se pudo registrar el contexto.')
      return
    }

    setCurrentStep(3)
    setMaxReachedStep(3)
    toast({ type: 'success', title: 'Contexto guardado', message: 'Paso 2 completado.' })
  }

  function updateApplicationDraft(field, value) {
    setWizardState((prev) => ({
      ...prev,
      applicationDraft: { ...prev.applicationDraft, [field]: value },
    }))
  }

  async function handleSubmitApplication() {
    clearErrors()
    if (maxReachedStep >= 4) { setCurrentStep(4); return }

    if (!wizardState.subjectId) {
      setValidationError('Debes completar el paso 1 antes de continuar.')
      return
    }

    if (!wizardState.applicationDraft.instrument_id) {
      setValidationError('Selecciona un instrumento para continuar.')
      return
    }

    if (!wizardState.applicationDraft.application_date) {
      setValidationError('La fecha de aplicación es obligatoria.')
      return
    }

    const _today = new Date().toISOString().split('T')[0]
    const _min   = addDaysISO(_today, -3)
    const _max   = addDaysISO(_today,  3)
    if (wizardState.applicationDraft.application_date < _min || wizardState.applicationDraft.application_date > _max) {
      setValidationError('La fecha de aplicación debe estar dentro de los 3 días anteriores o posteriores a hoy.')
      return
    }

    setUiState((prev) => ({ ...prev, loadingApplication: true }))

    const payload = {
      subject_id: wizardState.subjectId,
      instrument_id: wizardState.applicationDraft.instrument_id,
    }
    if (wizardState.applicationDraft.application_date) {
      payload.application_date = wizardState.applicationDraft.application_date
    }
    if (wizardState.applicationDraft.notes.trim()) {
      payload.notes = wizardState.applicationDraft.notes.trim()
    }

    const response = await fetch('/api/v1/applications', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    })
    const data = await parseResponse(response)
    setUiState((prev) => ({ ...prev, loadingApplication: false }))

    if (data.status !== 'success') {
      setApiError(data.message || 'No se pudo registrar la aplicacion.')
      return
    }

    const applicationId = data.data?.id || ''
    setWizardState((prev) => ({
      ...prev,
      applicationId,
      instrumentId: prev.applicationDraft.instrument_id,
    }))
    setCurrentStep(4)
    setMaxReachedStep(4)
    toast({ type: 'success', title: 'Aplicación guardada', message: 'Paso 3 completado.' })
  }

  function updateMetricValue(metricId, rawValue) {
    setWizardState((prev) => ({
      ...prev,
      metricValues: {
        ...prev.metricValues,
        [metricId]: rawValue,
      },
    }))
  }

  function normalizeMetricValue(metric, rawValue) {
    if (metric.metric_type === 'numeric') return Number(rawValue)
    if (metric.metric_type === 'boolean') return rawValue === 'true'
    return rawValue
  }

  function validateMetricByDefinition(metric, rawValue) {
    if (rawValue === '' || rawValue === undefined) {
      return metric.required ? `${metric.name} es requerida.` : null
    }

    if (metric.metric_type === 'numeric') {
      const numberValue = Number(rawValue)
      if (Number.isNaN(numberValue)) return `${metric.name} debe ser numérica.`
      if (metric.min_value !== null && metric.min_value !== undefined && numberValue < metric.min_value) {
        return `${metric.name} debe ser >= ${metric.min_value}.`
      }
      if (metric.max_value !== null && metric.max_value !== undefined && numberValue > metric.max_value) {
        return `${metric.name} debe ser <= ${metric.max_value}.`
      }
    }

    if (metric.metric_type === 'categorical') {
      const options = metric.options || []
      if (!options.includes(rawValue)) return `${metric.name} debe estar en las opciones permitidas.`
    }

    if (metric.metric_type === 'boolean' && rawValue !== 'true' && rawValue !== 'false') {
      return `${metric.name} debe ser true o false.`
    }

    return null
  }

  async function handleSubmitMetrics() {
    clearErrors()

    if (!wizardState.applicationId) {
      setValidationError('Debes completar el paso 3 antes de continuar.')
      return
    }

    const validationMessages = []
    const valuesPayload = []

    metricDefinitions.forEach((metric) => {
      const rawValue = wizardState.metricValues[metric.id] ?? ''
      const errorMessage = validateMetricByDefinition(metric, rawValue)
      if (errorMessage) {
        validationMessages.push(errorMessage)
        return
      }
      if (rawValue !== '') {
        valuesPayload.push({
          metric_id: metric.id,
          value: normalizeMetricValue(metric, rawValue),
        })
      }
    })

    if (validationMessages.length > 0) {
      toast({ type: 'warning', title: 'Campos incompletos', message: validationMessages[0] })
      return
    }

    setUiState((prev) => ({ ...prev, loadingMetricSubmit: true }))
    const response = await fetch('/api/v1/metric-values', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        application_id: wizardState.applicationId,
        values: valuesPayload,
      }),
    })
    const data = await parseResponse(response)
    setUiState((prev) => ({ ...prev, loadingMetricSubmit: false }))

    if (data.status !== 'success') {
      setApiError(data.message || 'No se pudieron guardar las métricas.')
      return
    }

    setIsDone(true)
  }

  function handleNuevoRegistro() {
    setIsDone(false)
    setCurrentStep(1)
    setMaxReachedStep(1)
    setSubjectMode('new')
    setSubjectInput('')
    setInstruments([])
    setMetricDefinitions([])
    setWizardState({
      subjectId: '',
      contextData: {
        school_type: '',
        education_level: '',
        age_cohort: '',
        gender: '',
        socioeconomic_level: '',
      },
      applicationId: '',
      instrumentId: '',
      metricValues: {},
      applicationDraft: {
        instrument_id: '',
        application_date: new Date().toISOString().split('T')[0],
        notes: '',
      },
    })
    setUiState((prev) => ({ ...prev, apiError: '', validationError: '' }))
  }

  function goBack() {
    clearErrors()
    setCurrentStep((prev) => Math.max(1, prev - 1))
  }

  function goToStep(step) {
    if (step <= maxReachedStep) {
      clearErrors()
      setCurrentStep(step)
    }
  }

  if (loadingConfig) {
    return (
      <main className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Spinner />
          <Typography as="small">Cargando configuración...</Typography>
        </div>
      </main>
    )
  }

  if (isDone) {
    return (
      <main className="page-container">
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Typography as="h1">Registro Operativo Anonimizado</Typography>
        </div>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Typography as="h2">Registro completado</Typography>
          <Alert variant="success">
            Todos los datos fueron guardados exitosamente.
          </Alert>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
              UUID del sujeto anonimizado
            </Typography>
            <code style={{
              display: 'block',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'monospace',
              fontSize: 'var(--font-size-small)',
              letterSpacing: '0.03em',
              wordBreak: 'break-all',
            }}>
              {wizardState.subjectId}
            </code>
          </div>
          <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
            Anota el UUID si necesitas hacer referencia a este sujeto en el futuro.
          </Typography>
          <div>
            <Button onClick={handleNuevoRegistro}>Iniciar nuevo registro</Button>
          </div>
        </section>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </main>
    )
  }

  return (
    <main className="page-container">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Registro Operativo Anonimizado</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Registra sujetos y aplica instrumentos paso a paso.
        </Typography>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {STEP_LABELS.map((label, index) => {
          const step = index + 1
          return (
            <Button
              key={label}
              size="sm"
              variant={currentStep === step ? 'primary' : 'ghost'}
              onClick={() => goToStep(step)}
              disabled={step > maxReachedStep}
            >
              {label}
            </Button>
          )
        })}
      </div>

      {currentStep === 1 && (
        <Step1Subject
          onCreate={handleCreateSubject}
          loading={uiState.loadingSubject}
          apiError={uiState.apiError}
          subjectId={wizardState.subjectId}
          mode={subjectMode}
          onModeChange={(m) => { setSubjectMode(m); clearErrors() }}
          subjectInput={subjectInput}
          onSubjectInputChange={setSubjectInput}
          onLoadExisting={handleLoadExistingSubject}
          loadingExisting={uiState.loadingSubject}
        />
      )}

      {currentStep === 2 && (
        <Step2Context
          contextData={wizardState.contextData}
          onChange={updateContextData}
          onSubmit={handleSubmitContext}
          onBack={goBack}
          loading={uiState.loadingContext}
          apiError={uiState.apiError}
          validationError={uiState.validationError}
          contextOptions={contextOptions}
          cohortMode={cohortMode}
          ageCohortOptions={ageCohortOptions}
          isValid={step2Valid}
          alreadySaved={maxReachedStep >= 3}
        />
      )}

      {currentStep === 3 && (
        <Step3Application
          instruments={instruments}
          loadingInstruments={uiState.loadingInstruments}
          applicationDraft={wizardState.applicationDraft}
          onChange={updateApplicationDraft}
          onSubmit={handleSubmitApplication}
          onBack={goBack}
          loadingSubmit={uiState.loadingApplication}
          apiError={uiState.apiError}
          validationError={uiState.validationError}
          alreadySaved={maxReachedStep >= 4}
        />
      )}

      {currentStep === 4 && (
        <Step4Metrics
          metricDefinitions={metricDefinitions}
          metricValues={wizardState.metricValues}
          onMetricChange={updateMetricValue}
          onBack={goBack}
          onSubmit={handleSubmitMetrics}
          onErrorToast={(msg) => toast({ type: 'warning', title: 'Campos incompletos', message: msg })}
          loadingMetrics={uiState.loadingMetrics}
          loadingSubmit={uiState.loadingMetricSubmit}
          apiError={uiState.apiError}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

Step1Subject.propTypes = {
  onCreate:              PropTypes.func.isRequired,
  loading:               PropTypes.bool.isRequired,
  apiError:              PropTypes.string.isRequired,
  subjectId:             PropTypes.string.isRequired,
  mode:                  PropTypes.string.isRequired,
  onModeChange:          PropTypes.func.isRequired,
  subjectInput:          PropTypes.string.isRequired,
  onSubjectInputChange:  PropTypes.func.isRequired,
  onLoadExisting:        PropTypes.func.isRequired,
  loadingExisting:       PropTypes.bool.isRequired,
}

Step2Context.propTypes = {
  contextData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  apiError: PropTypes.string.isRequired,
  validationError: PropTypes.string.isRequired,
  contextOptions: PropTypes.object.isRequired,
  cohortMode: PropTypes.string.isRequired,
  ageCohortOptions: PropTypes.array.isRequired,
  isValid: PropTypes.bool.isRequired,
  alreadySaved: PropTypes.bool.isRequired,
}

Step3Application.propTypes = {
  instruments: PropTypes.array.isRequired,
  loadingInstruments: PropTypes.bool.isRequired,
  applicationDraft: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  loadingSubmit: PropTypes.bool.isRequired,
  apiError: PropTypes.string.isRequired,
  validationError: PropTypes.string.isRequired,
  alreadySaved: PropTypes.bool.isRequired,
}

Step4Metrics.propTypes = {
  metricDefinitions: PropTypes.array.isRequired,
  metricValues: PropTypes.object.isRequired,
  onMetricChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onErrorToast: PropTypes.func.isRequired,
  loadingMetrics: PropTypes.bool.isRequired,
  loadingSubmit: PropTypes.bool.isRequired,
  apiError: PropTypes.string.isRequired,
}

RegistroOperativoWizardPage.propTypes = {
  token: PropTypes.string.isRequired,
}

export default RegistroOperativoWizardPage
