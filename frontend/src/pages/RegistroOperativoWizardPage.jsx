import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, FormField, Alert, Spinner, Typography, ToastContainer, useToast } from '@/components/app'

const AGE_COHORT_REGEX = /^\d+-\d+$/

const CONTEXT_OPTIONS = {
  school_type: ['public', 'private', 'unknown'],
  education_level: ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'],
  gender: ['male', 'female', 'non_binary', 'prefer_not_to_say'],
  socioeconomic_level: ['low', 'medium', 'high', 'unknown'],
}

const STEP_LABELS = [
  '1. Sujeto',
  '2. Contexto',
  '3. Aplicacion',
  '4. Metricas',
]

function Step1Subject({ onCreate, loading, apiError, subjectId }) {
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Typography as="h2">Paso 1: Registrar sujeto anonimizado</Typography>
      <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
        Este paso crea un sujeto con UUID automatico via `POST /subjects`.
      </Typography>

      {apiError && <Alert variant="error">{apiError}</Alert>}

      {subjectId ? (
        <Alert variant="success">Sujeto registrado correctamente. UUID: {subjectId}</Alert>
      ) : (
        <Button onClick={onCreate} loading={loading}>
          Registrar nuevo sujeto
        </Button>
      )}
    </section>
  )
}

function Step2Context({ contextData, onChange, onSubmit, onBack, loading, apiError, validationError }) {
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Typography as="h2">Paso 2: Registrar contexto (body parcial)</Typography>
      <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
        Puedes enviar solo los campos necesarios. `additional_attributes` queda fuera de este MVP.
      </Typography>

      {apiError && <Alert variant="error">{apiError}</Alert>}
      {validationError && <Alert variant="warning">{validationError}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <label className="field-label">
          School type
          <select className="input-base" value={contextData.school_type} onChange={(e) => onChange('school_type', e.target.value)}>
            <option value="">Sin definir</option>
            {CONTEXT_OPTIONS.school_type.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Education level
          <select className="input-base" value={contextData.education_level} onChange={(e) => onChange('education_level', e.target.value)}>
            <option value="">Sin definir</option>
            {CONTEXT_OPTIONS.education_level.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <FormField
          id="m4-age-cohort"
          label="Age cohort (N-N)"
          placeholder="Ej. 6-8"
          value={contextData.age_cohort}
          onChange={(e) => onChange('age_cohort', e.target.value)}
        />

        <label className="field-label">
          Gender
          <select className="input-base" value={contextData.gender} onChange={(e) => onChange('gender', e.target.value)}>
            <option value="">Sin definir</option>
            {CONTEXT_OPTIONS.gender.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Socioeconomic level
          <select
            className="input-base"
            value={contextData.socioeconomic_level}
            onChange={(e) => onChange('socioeconomic_level', e.target.value)}
          >
            <option value="">Sin definir</option>
            {CONTEXT_OPTIONS.socioeconomic_level.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onSubmit} loading={loading}>Guardar contexto y continuar</Button>
      </div>
    </section>
  )
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
}) {
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Typography as="h2">Paso 3: Registrar aplicacion</Typography>
      <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
        Se muestran todos los instrumentos del endpoint. El backend valida vigencia y estado.
      </Typography>

      {apiError && <Alert variant="error">{apiError}</Alert>}

      {loadingInstruments ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Spinner />
          <Typography as="small">Cargando instrumentos...</Typography>
        </div>
      ) : (
        <label className="field-label">
          Instrumento
          <select className="input-base" value={applicationDraft.instrument_id} onChange={(e) => onChange('instrument_id', e.target.value)}>
            <option value="">Selecciona un instrumento</option>
            {instruments.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.name} ({instrument.status})
              </option>
            ))}
          </select>
        </label>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <FormField
          id="m4-application-date"
          label="Fecha de aplicacion (opcional)"
          type="date"
          value={applicationDraft.application_date}
          onChange={(e) => onChange('application_date', e.target.value)}
        />
        <FormField
          id="m4-application-notes"
          label="Notas (opcional)"
          placeholder="Notas de campo"
          value={applicationDraft.notes}
          onChange={(e) => onChange('notes', e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onSubmit} loading={loadingSubmit}>Guardar aplicacion y continuar</Button>
      </div>
    </section>
  )
}

function Step4Metrics({
  metricDefinitions,
  metricValues,
  onMetricChange,
  onBack,
  onSubmit,
  loadingMetrics,
  loadingSubmit,
  apiError,
  validationError,
}) {
  const requiredCount = metricDefinitions.filter((metric) => metric.required).length

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Typography as="h2">Paso 4: Capturar metricas</Typography>
      <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
        Formulario dinamico desde `GET /metrics`. Requeridas: {requiredCount}.
      </Typography>

      {apiError && <Alert variant="error">{apiError}</Alert>}
      {validationError && <Alert variant="warning">{validationError}</Alert>}

      {loadingMetrics ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Spinner />
          <Typography as="small">Cargando definicion de metricas...</Typography>
        </div>
      ) : metricDefinitions.length === 0 ? (
        <Alert variant="info">No hay metricas para el instrumento seleccionado.</Alert>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          {metricDefinitions.map((metric) => {
            const currentValue = metricValues[metric.id] ?? ''
            const label = `${metric.name}${metric.required ? ' *' : ''}`

            if (metric.metric_type === 'numeric') {
              return (
                <FormField
                  key={metric.id}
                  id={`metric-${metric.id}`}
                  label={label}
                  type="number"
                  value={currentValue}
                  onChange={(e) => onMetricChange(metric.id, e.target.value)}
                  placeholder="Valor numerico"
                />
              )
            }

            if (metric.metric_type === 'categorical') {
              return (
                <label key={metric.id} className="field-label">
                  {label}
                  <select className="input-base" value={currentValue} onChange={(e) => onMetricChange(metric.id, e.target.value)}>
                    <option value="">Selecciona una opcion</option>
                    {(metric.options || []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              )
            }

            if (metric.metric_type === 'boolean') {
              return (
                <label key={metric.id} className="field-label">
                  {label}
                  <select className="input-base" value={currentValue} onChange={(e) => onMetricChange(metric.id, e.target.value)}>
                    <option value="">Selecciona</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </label>
              )
            }

            return (
              <FormField
                key={metric.id}
                id={`metric-${metric.id}`}
                label={label}
                value={currentValue}
                onChange={(e) => onMetricChange(metric.id, e.target.value)}
                placeholder="Texto corto"
              />
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onSubmit} loading={loadingSubmit}>Guardar metricas y finalizar</Button>
      </div>
    </section>
  )
}

function RegistroOperativoWizardPage({ token }) {
  const { toasts, toast, dismiss } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [maxReachedStep, setMaxReachedStep] = useState(1)
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
      application_date: '',
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
    if (currentStep !== 4 || !wizardState.instrumentId || uiState.loadingMetrics) return

    async function loadMetrics() {
      setUiState((prev) => ({ ...prev, loadingMetrics: true }))
      const response = await fetch(`/api/v1/metrics?instrument_id=${wizardState.instrumentId}`, { headers: authHeaders })
      const data = await parseResponse(response)
      setUiState((prev) => ({ ...prev, loadingMetrics: false }))

      if (data.status === 'success') {
        setMetricDefinitions(data.data || [])
        return
      }

      setApiError(data.message || 'No se pudieron cargar las metricas.')
    }

    loadMetrics()
  }, [currentStep, wizardState.instrumentId, authHeaders, uiState.loadingMetrics])

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

  function updateContextData(field, value) {
    setWizardState((prev) => ({
      ...prev,
      contextData: { ...prev.contextData, [field]: value },
    }))
  }

  async function handleSubmitContext() {
    clearErrors()
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

    if (!wizardState.subjectId) {
      setValidationError('Debes completar el paso 1 antes de continuar.')
      return
    }

    if (!wizardState.applicationDraft.instrument_id) {
      setValidationError('Selecciona un instrumento para continuar.')
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
    toast({ type: 'success', title: 'Aplicacion guardada', message: 'Paso 3 completado.' })
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
      if (Number.isNaN(numberValue)) return `${metric.name} debe ser numerica.`
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
      setValidationError(validationMessages[0])
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
      setApiError(data.message || 'No se pudieron guardar las metricas.')
      return
    }

    toast({ type: 'success', title: 'Registro completado', message: 'Se completo el flujo HU14-HU17.' })
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

  return (
    <main className="page-container">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Registro Operativo Anonimizado</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Wizard MVP en una sola ruta: /registro-operativo
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
        />
      )}

      {currentStep === 4 && (
        <Step4Metrics
          metricDefinitions={metricDefinitions}
          metricValues={wizardState.metricValues}
          onMetricChange={updateMetricValue}
          onBack={goBack}
          onSubmit={handleSubmitMetrics}
          loadingMetrics={uiState.loadingMetrics}
          loadingSubmit={uiState.loadingMetricSubmit}
          apiError={uiState.apiError}
          validationError={uiState.validationError}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

Step1Subject.propTypes = {
  onCreate: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  apiError: PropTypes.string.isRequired,
  subjectId: PropTypes.string.isRequired,
}

Step2Context.propTypes = {
  contextData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  apiError: PropTypes.string.isRequired,
  validationError: PropTypes.string.isRequired,
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
}

Step4Metrics.propTypes = {
  metricDefinitions: PropTypes.array.isRequired,
  metricValues: PropTypes.object.isRequired,
  onMetricChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loadingMetrics: PropTypes.bool.isRequired,
  loadingSubmit: PropTypes.bool.isRequired,
  apiError: PropTypes.string.isRequired,
  validationError: PropTypes.string.isRequired,
}

RegistroOperativoWizardPage.propTypes = {
  token: PropTypes.string.isRequired,
}

export default RegistroOperativoWizardPage
