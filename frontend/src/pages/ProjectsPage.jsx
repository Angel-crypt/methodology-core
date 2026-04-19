/**
 * ProjectsPage — CRUD de proyectos (CF-013)
 * Ruta: /proyectos | Rol: superadmin
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
<<<<<<< HEAD
import PropTypes from 'prop-types'
=======
>>>>>>> 3a7630c009c6f33a2d92137b75d439562b99d0c1
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Search } from 'lucide-react'
import {
  Button, Modal, FormField, Alert, DataTable,
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
  const [configMode, setMode]     = useState('defaults')
  const [defaults, setDefaults]   = useState(null)
  const [customConfig, setCustom] = useState({ education_levels: [], age_cohort_ranges: [], subject_limit: '50', mode: 'normal' })
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(''); setDesc(''); setMode('defaults'); setError(''); setNameError(''); setLoading(false)
    setCustom({ education_levels: [], age_cohort_ranges: [], subject_limit: '50', mode: 'normal' })
    obtenerSystemDefaults(token).then((r) => {
      if (r.ok) {
        setDefaults(r.data)
        setCustom({
          education_levels:  [...(r.data.education_levels || [])],
          age_cohort_ranges: [...(r.data.age_cohort_ranges || [])],
          subject_limit:     String(r.data.subject_limit ?? 50),
          mode:              r.data.mode || 'normal',
        })
      }
    })
  }, [open, token])

  async function handleSubmit() {
    if (!name.trim()) { setNameError('El nombre es obligatorio'); return }

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
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo proyecto"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading}>Crear proyecto</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {error && <Alert variant="error">{error}</Alert>}

        <FormField
          id="proj-name"
          label="Nombre"
          required
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError('') }}
          placeholder="Nombre del proyecto"
          error={nameError}
        />
        <FormField
          id="proj-desc"
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Descripción breve"
        />

        <div>
          <Typography as="small" style={{ fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 'var(--space-2)' }}>
            Configuración operativa <span style={{ color: 'var(--color-error)' }}>*</span>
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
      </div>
    </Modal>
  )
}

<<<<<<< HEAD
CrearProyectoModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
  token: PropTypes.string,
}

=======
>>>>>>> 3a7630c009c6f33a2d92137b75d439562b99d0c1
// ── Página principal ──────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { token }        = useAuth()
  const navigate         = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [modalOpen, setModal]     = useState(false)
  const [searchQuery, setSearch]  = useState('')

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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    )
  }, [projects, searchQuery])

  const columnas = [
    {
      key: 'name',
      label: 'Nombre',
      render: (v) => <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{v}</span>,
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (v) => v
        ? <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}>{v}</span>
        : <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-small)' }}>—</span>,
    },
    {
      key: 'member_count',
      label: 'Miembros',
      render: (v) => <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>{v ?? 0}</span>,
    },
    {
      key: 'instrument_count',
      label: 'Instrumentos',
      render: (v) => <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>{v ?? 0}</span>,
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (v) => (
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
          {v ? new Date(v).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
        </span>
      ),
    },
  ]

  return (
    <main className="page-container">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Proyectos</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Gestión de proyectos de investigación y sus configuraciones operativas.
        </Typography>
      </div>

      {error && <Alert variant="error" style={{ marginBottom: 'var(--space-4)' }}>{error}</Alert>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <div className="page-search-wrapper" style={{ flex: '1 1 200px' }}>
          <Search size={14} className="page-search-icon" aria-hidden="true" />
          <input
            className="page-search-input"
            placeholder="Buscar por nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button icon={Plus} onClick={() => setModal(true)} style={{ marginLeft: 'auto' }}>
          Nuevo proyecto
        </Button>
      </div>

      {!loading && projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Sin proyectos registrados"
          message="Crea el primer proyecto para comenzar."
          action={
            <Button size="sm" icon={Plus} onClick={() => setModal(true)}>
              Nuevo proyecto
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columnas}
          data={filtered}
          loading={loading}
          emptyMessage="No hay proyectos que coincidan con la búsqueda."
          onRowClick={(row) => navigate(`/proyectos/${row.id}`)}
        />
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
