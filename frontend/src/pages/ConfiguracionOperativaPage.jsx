import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Button,
  Alert,
  Typography,
  ToastContainer,
  useToast,
} from '@/components/app'
import { obtenerConfigOperativo, guardarConfigOperativo } from '@/services/config'
import { EDUCATION_LEVEL_META, ALL_EDUCATION_LEVELS } from '@/constants/educationLevels'

// ── Metadatos ────────────────────────────────────────────────────────────────

const SCHOOL_TYPE_LABELS = {
  public:  'Pública',
  private: 'Privada',
  unknown: 'Desconocido',
}

const GENDER_LABELS = {
  male:             'Masculino',
  female:           'Femenino',
  non_binary:       'No binario',
  prefer_not_to_say:'Prefiero no decirlo',
}

const SOCIOECONOMIC_LABELS = {
  low:     'Bajo',
  medium:  'Medio',
  high:    'Alto',
  unknown: 'Desconocido',
}

const ALL_SCHOOL_TYPES       = Object.keys(SCHOOL_TYPE_LABELS)
const ALL_GENDERS            = Object.keys(GENDER_LABELS)
const ALL_SOCIOECONOMIC      = Object.keys(SOCIOECONOMIC_LABELS)

// ── Estilos comunes ──────────────────────────────────────────────────────────

const LABEL_STYLE = {
  fontSize:     'var(--font-size-label)',
  color:        'var(--color-text-secondary)',
  marginBottom: 'var(--space-1)',
  fontWeight:   'var(--font-weight-medium)',
}

const TH_STYLE = {
  textAlign:   'left',
  padding:     'var(--space-2) var(--space-3)',
  fontSize:    'var(--font-size-label)',
  color:       'var(--color-text-secondary)',
  fontWeight:  'var(--font-weight-medium)',
  borderBottom:'1px solid var(--color-border)',
}

// ── Componente ───────────────────────────────────────────────────────────────

/**
 * ConfiguracionOperativaPage
 * Panel de configuración global del Módulo de Registro Operativo.
 * El administrador define qué niveles educativos están disponibles,
 * el modo de validación de cohortes de edad y los campos de contexto activos.
 *
 * Ruta: /configuracion-operativa
 * Solo Administrador.
 *
 * Props:
 *   token  string — JWT activo
 */
function ConfiguracionOperativaPage() {
  const { token } = useAuth()
  const { toasts, toast, dismiss } = useToast()

  const [config,       setConfig]       = useState(null)
  const [savedConfig,  setSavedConfig]  = useState(null)
  const [cargando,     setCargando]     = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [error,        setError]        = useState(null)

  // ── Fetch inicial ───────────────────────────────────────────────
  useEffect(() => {
    setCargando(true)
    obtenerConfigOperativo(token)
      .then((data) => {
        if (data.status === 'success') {
          setConfig(data.data)
          setSavedConfig(data.data)
        } else {
          setError(data.message || 'No se pudo cargar la configuración.')
        }
      })
      .catch(() => setError('Error de conexión.'))
      .finally(() => setCargando(false))
  }, [token])

  // ── Helpers de estado local ─────────────────────────────────────

  function toggleArray(field, value) {
    setConfig((prev) => {
      const arr = prev[field] || []
      const has = arr.includes(value)
      return { ...prev, [field]: has ? arr.filter((v) => v !== value) : [...arr, value] }
    })
  }

  function setCohortMode(mode) {
    setConfig((prev) => ({ ...prev, cohort_mode: mode }))
  }

  function setCohortRange(level, value) {
    setConfig((prev) => ({
      ...prev,
      age_cohort_map: { ...prev.age_cohort_map, [level]: value },
    }))
  }

  // ── Guardar ─────────────────────────────────────────────────────
  async function handleGuardar() {
    setGuardando(true)
    setError(null)
    try {
      const data = await guardarConfigOperativo(token, config)
      if (data.status === 'success') {
        setConfig(data.data)
        setSavedConfig(data.data)
        toast({ type: 'success', title: 'Configuración guardada', message: 'Los cambios se aplicarán a nuevos registros.' })
      } else {
        setError(data.message || 'No se pudo guardar la configuración.')
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Render — carga / error ──────────────────────────────────────

  if (cargando) {
    return (
      <main className="page-container">
        <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>Cargando configuración...</Typography>
      </main>
    )
  }

  if (!config) {
    return (
      <main className="page-container">
        <Alert variant="error">{error || 'No se pudo cargar la configuración.'}</Alert>
      </main>
    )
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <main className="page-container">

      {/* Encabezado */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Settings size={24} aria-hidden="true" />
          Configuración Operativa
        </Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Define qué opciones están disponibles en el Módulo de Registro Operativo para todos los aplicadores.
          Los cambios afectan a nuevos registros; los datos ya guardados no se modifican.
        </Typography>
      </div>

      {error && <Alert variant="error" style={{ marginBottom: 'var(--space-4)' }}>{error}</Alert>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* ── Niveles educativos disponibles ─────────────────────── */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <Typography as="h2">Niveles educativos disponibles</Typography>
            <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
              Solo los niveles habilitados aquí aparecerán en el selector de contexto del wizard de registro.
            </Typography>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH_STYLE}>Nivel educativo</th>
                <th style={TH_STYLE}>Descripción</th>
                <th style={{ ...TH_STYLE, width: '220px' }}>Cohorte de edad</th>
                <th style={{ ...TH_STYLE, textAlign: 'center', width: '110px' }}>Disponible</th>
              </tr>
            </thead>
            <tbody>
              {ALL_EDUCATION_LEVELS.map((level, idx) => {
                const { label, desc } = EDUCATION_LEVEL_META[level]
                const enabled = (config.education_levels || []).includes(level)
                const range   = (config.age_cohort_map || {})[level] || ''
                return (
                  <tr
                    key={level}
                    style={{
                      background:   idx % 2 === 0 ? 'transparent' : 'var(--color-bg-subtle)',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <td style={{ padding: 'var(--space-3)', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                      {label}
                    </td>
                    <td style={{ padding: 'var(--space-3)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
                      {desc}
                    </td>
                    <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                      <input
                        type="text"
                        className="input-base"
                        placeholder="Ej. 3-5, 4-6"
                        value={range}
                        onChange={(e) => setCohortRange(level, e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleArray('education_levels', level)}
                        aria-label={`Habilitar ${label}`}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* ── Cohortes de edad ───────────────────────────────────── */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <Typography as="h2">Cohorte de edad</Typography>
            <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
              Los rangos de edad se definen por nivel en la tabla de arriba.
              Aquí controlas cómo los usa el aplicador al registrar un sujeto.
            </Typography>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
            {[
              { value: 'libre',      label: 'Libre',       desc: 'El aplicador define el rango libremente. Los rangos configurados arriba son solo una referencia.' },
              { value: 'restricted', label: 'Restringido', desc: 'El aplicador debe seleccionar uno de los rangos definidos arriba para cada nivel educativo.'       },
            ].map(({ value, label, desc }) => (
              <label
                key={value}
                style={{
                  display:      'flex',
                  alignItems:   'flex-start',
                  gap:          'var(--space-2)',
                  cursor:       'pointer',
                  flex:         1,
                  padding:      'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border:       `2px solid ${config.cohort_mode === value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background:   config.cohort_mode === value ? 'var(--color-bg-subtle)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="cohort-mode"
                  value={value}
                  checked={config.cohort_mode === value}
                  onChange={() => setCohortMode(value)}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <span>
                  <span style={{ display: 'block', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)', display: 'block' }}>
                    {desc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── Opciones de contexto ───────────────────────────────── */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <Typography as="h2">Campos de contexto disponibles</Typography>
            <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
              Controla qué opciones aparecen en cada selector del paso de contexto del wizard.
              Deshabilitar una opción la elimina del wizard; los registros existentes con ese valor no se afectan.
            </Typography>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>

            {/* Tipo de escuela */}
            <div>
              <p style={LABEL_STYLE}>Tipo de escuela</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                {ALL_SCHOOL_TYPES.map((v) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-body)' }}>
                    <input
                      type="checkbox"
                      checked={(config.school_types || []).includes(v)}
                      onChange={() => toggleArray('school_types', v)}
                    />
                    {SCHOOL_TYPE_LABELS[v]}
                  </label>
                ))}
              </div>
            </div>

            {/* Género */}
            <div>
              <p style={LABEL_STYLE}>Género</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                {ALL_GENDERS.map((v) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-body)' }}>
                    <input
                      type="checkbox"
                      checked={(config.genders || []).includes(v)}
                      onChange={() => toggleArray('genders', v)}
                    />
                    {GENDER_LABELS[v]}
                  </label>
                ))}
              </div>
            </div>

            {/* Nivel socioeconómico */}
            <div>
              <p style={LABEL_STYLE}>Nivel socioeconómico</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                {ALL_SOCIOECONOMIC.map((v) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-body)' }}>
                    <input
                      type="checkbox"
                      checked={(config.socioeconomic_levels || []).includes(v)}
                      onChange={() => toggleArray('socioeconomic_levels', v)}
                    />
                    {SOCIOECONOMIC_LABELS[v]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Botón global guardar ────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Typography as="small" style={{ color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>
            Los cambios afectan a nuevos registros únicamente.
          </Typography>
          <Button
            onClick={handleGuardar}
            loading={guardando}
            disabled={JSON.stringify(config) === JSON.stringify(savedConfig)}
          >
            Guardar configuración
          </Button>
        </div>

      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}

export default ConfiguracionOperativaPage
