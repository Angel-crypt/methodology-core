/**
 * ProjectsPage — CRUD de proyectos (CF-013)
 * Ruta: /proyectos | Rol: superadmin
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, ChevronRight } from 'lucide-react'
import {
  Button, Modal, FormField, Alert, Spinner,
  Typography, ToastContainer, useToast, EmptyState,
} from '@/components/app'
import { useAuth } from '@/contexts/AuthContext'
import {
  listarProyectos, crearProyecto, obtenerSystemDefaults,
} from '@/services/projects'

// ── Modal de creación ─────────────────────────────────────────────────────────

function CrearProyectoModal({ open, onClose, onCreated, token }) {
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [configMode, setMode]     = useState('defaults')  // 'defaults' | 'custom'
  const [defaults, setDefaults]   = useState(null)
  const [customConfig, setCustom] = useState({ education_levels: [], age_cohort_ranges: [], subject_limit: '50', mode: 'normal' })
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (!open) return
    setName(''); setDesc(''); setMode('defaults'); setError(''); setLoading(false)
    setCustom({ education_levels: [], age_cohort_ranges: [], subject_limit: '50', mode: 'normal' })
    obtenerSystemDefaults(token).then((r) => {
      if (r.ok) {
        setDefaults(r.data)
        setCustom({ education_levels: [...(r.data.education_levels || [])], age_cohort_ranges: [...(r.data.age_cohort_ranges || [])], subject_limit: String(r.data.subject_limit ?? 50), mode: r.data.mode || 'normal' })
      }
    })
  }, [open, token])

  async function handleSubmit() {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!configMode)  { setError('Elige una opción de configuración'); return }

    setLoading(true); setError('')

    const body = { name: name.trim(), description: description.trim() || undefined }
    if (configMode === 'defaults') {
      body.use_defaults = true
    } else {
      body.config = {
        education_levels:  customConfig.education_levels,
        age_cohort_ranges: customConfig.age_cohort_ranges,
        subject_limit:     parseInt(customConfig.subject_limit, 10) || 50,
        mode:              customConfig.mode,
      }
    }

    const result = await crearProyecto(token, body)
    setLoading(false)
    if (!result.ok) { setError(result.error); return }
    onCreated(result.data)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo proyecto">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {error && <Alert variant="error">{error}</Alert>}

        <FormField id="proj-name" label="Nombre *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del proyecto" />
        <FormField id="proj-desc" label="Descripción (opcional)" value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción breve" />

        <div>
          <Typography as="small" style={{ fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 'var(--space-2)' }}>
            Configuración operativa *
          </Typography>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input type="radio" name="config-mode" value="defaults" checked={configMode === 'defaults'} onChange={() => setMode('defaults')} style={{ marginTop: 2 }} />
              <span>
                <strong>Usar configuración predeterminada del sistema</strong>
                {defaults && configMode === 'defaults' && (
                  <span style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                    Niveles: {defaults.education_levels?.join(', ')} · Límite: {defaults.subject_limit} sujetos
                  </span>
                )}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input type="radio" name="config-mode" value="custom" checked={configMode === 'custom'} onChange={() => setMode('custom')} style={{ marginTop: 2 }} />
              <strong>Configurar ahora</strong>
            </label>
          </div>

          {configMode === 'custom' && defaults && (
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingLeft: 'var(--space-5)' }}>
              <div>
                <Typography as="small" style={{ fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 'var(--space-2)' }}>Niveles educativos</Typography>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  {(defaults.education_levels || []).map((level) => (
                    <label key={level} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', userSelect: 'none', fontSize: 'var(--font-size-small)' }}>
                      <input
                        type="checkbox"
                        checked={customConfig.education_levels.includes(level)}
                        onChange={() => setCustom((p) => {
                          const arr = p.education_levels
                          return { ...p, education_levels: arr.includes(level) ? arr.filter((v) => v !== level) : [...arr, level] }
                        })}
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Typography as="small" style={{ fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 'var(--space-2)' }}>Rangos de edad</Typography>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  {(defaults.age_cohort_ranges || []).map((range) => (
                    <label key={range} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', userSelect: 'none', fontSize: 'var(--font-size-small)' }}>
                      <input
                        type="checkbox"
                        checked={customConfig.age_cohort_ranges.includes(range)}
                        onChange={() => setCustom((p) => {
                          const arr = p.age_cohort_ranges
                          return { ...p, age_cohort_ranges: arr.includes(range) ? arr.filter((v) => v !== range) : [...arr, range] }
                        })}
                      />
                      <span>{range}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <FormField
                  id="cfg-limit"
                  label="Límite de sujetos"
                  type="number"
                  value={customConfig.subject_limit}
                  onChange={(e) => setCustom((p) => ({ ...p, subject_limit: e.target.value }))}
                  style={{ width: 120 }}
                />
                <div>
                  <label className="field-label">
                    Modo
                    <select className="input-base" value={customConfig.mode} onChange={(e) => setCustom((p) => ({ ...p, mode: e.target.value }))}>
                      <option value="normal">Normal</option>
                      <option value="restricted">Restringido</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading}>
            Crear proyecto
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { token }        = useAuth()
  const navigate         = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [modalOpen, setModal]   = useState(false)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const result = await listarProyectos(token)
    setLoading(false)
    if (result.ok) setProjects(result.data)
    else setError(result.error)
  }, [token])

  useEffect(() => { loadProjects() }, [loadProjects])

  function handleCreated(project) {
    setProjects((prev) => [project, ...prev])
    toast({ type: 'success', title: 'Proyecto creado', message: project.name })
  }

  return (
    <main className="page-container">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Proyectos</Typography>
        <Button onClick={() => setModal(true)}>
          <Plus size={16} style={{ marginRight: 'var(--space-1)' }} />
          Nuevo proyecto
        </Button>
      </div>

      {error && <Alert variant="error" style={{ marginBottom: 'var(--space-4)' }}>{error}</Alert>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Spinner />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No hay proyectos registrados" description="Crea el primer proyecto para comenzar." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {projects.map((p) => (
            <button
              key={p.id}
              className="card"
              onClick={() => navigate(`/proyectos/${p.id}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', width: '100%', background: 'var(--color-bg-card)' }}
            >
              <div>
                <Typography as="h3" style={{ margin: 0 }}>{p.name}</Typography>
                {p.description && (
                  <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>{p.description}</Typography>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-1)' }}>
                  <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
                    {p.member_count} {p.member_count === 1 ? 'miembro' : 'miembros'}
                  </Typography>
                  <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
                    {p.instrument_count} {p.instrument_count === 1 ? 'instrumento' : 'instrumentos'}
                  </Typography>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      <CrearProyectoModal
        open={modalOpen}
        onClose={() => setModal(false)}
        onCreated={handleCreated}
        token={token}
      />
    </main>
  )
}
