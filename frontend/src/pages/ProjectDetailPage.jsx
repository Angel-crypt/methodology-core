/**
 * ProjectDetailPage — Detalle de proyecto con 4 tabs (CF-013)
 * Ruta: /proyectos/:id | Rol: superadmin
 * Tabs: General · Miembros · Instrumentos · Configuración Operativa
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, BookOpen, Settings, Info } from 'lucide-react'
import {
  Button, Alert, Spinner, Typography, ToastContainer, useToast,
  StatusBadge, PillToggle,
} from '@/components/app'
import { useAuth } from '@/contexts/AuthContext'
import {
  obtenerProyecto, listarMiembros, agregarMiembro, eliminarMiembro,
  listarInstrumentosProyecto, asignarInstrumento, quitarInstrumento,
  obtenerConfigProyecto, guardarConfigProyecto, obtenerSystemDefaults,
} from '@/services/projects'
import { listarTodosUsuarios } from '@/services/users'
import { listarInstrumentos } from '@/services/instruments'

// ── Tab General ───────────────────────────────────────────────────────────────

function TabGeneral({ project }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>Nombre</Typography>
        <Typography as="h3">{project.name}</Typography>
      </div>
      {project.description && (
        <div>
          <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>Descripción</Typography>
          <Typography as="p">{project.description}</Typography>
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
        <div>
          <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>Miembros</Typography>
          <Typography as="p" style={{ fontWeight: 'var(--font-weight-medium)' }}>{project.member_count}</Typography>
        </div>
        <div>
          <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>Instrumentos</Typography>
          <Typography as="p" style={{ fontWeight: 'var(--font-weight-medium)' }}>{project.instrument_count}</Typography>
        </div>
        <div>
          <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>Creado</Typography>
          <Typography as="p">{new Date(project.created_at).toLocaleDateString('es-MX')}</Typography>
        </div>
      </div>
    </div>
  )
}

// ── Tab Miembros ──────────────────────────────────────────────────────────────

function TabMiembros({ projectId, token, toast }) {
  const [members, setMembers]     = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [selectedUser, setSelUser] = useState('')
  const [addError, setAddError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [mRes, uRes] = await Promise.all([
      listarMiembros(token, projectId),
      listarTodosUsuarios(token),
    ])
    if (mRes.ok) setMembers(mRes.data)
    if (uRes.status === 'success') setUsers(
      uRes.data.filter((u) => u.role !== 'superadmin' && u.active)
    )
    setLoading(false)
  }, [token, projectId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!selectedUser) { setAddError('Selecciona un usuario'); return }
    const userObj = availableUsers.find((u) => u.id === selectedUser)
    setAdding(true); setAddError('')
    const result = await agregarMiembro(token, projectId, { user_id: selectedUser, role: userObj?.role ?? 'applicator' })
    setAdding(false)
    if (!result.ok) {
      setAddError(result.code === 'ALREADY_MEMBER' ? 'Este usuario ya es miembro' : result.error)
      return
    }
    setSelUser(''); load()
    toast({ type: 'success', title: 'Miembro agregado' })
  }

  async function handleRemove(userId) {
    const result = await eliminarMiembro(token, projectId, userId)
    if (!result.ok) { toast({ type: 'error', title: 'Error', message: result.error }); return }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    toast({ type: 'success', title: 'Miembro eliminado' })
  }

  const availableUsers = users.filter((u) => !members.some((m) => m.user_id === u.id))
  const noUsersInSystem = !loading && users.length === 0

  if (loading) return <div style={{ padding: 'var(--space-6)' }}><Spinner /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Typography as="h3">Agregar miembro</Typography>
        {addError && <Alert variant="error">{addError}</Alert>}

        {noUsersInSystem ? (
          <Alert variant="info">
            No hay aplicadores ni investigadores en el sistema.{' '}
            <a href="/usuarios/aplicadores" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' }}>
              Crear usuario
            </a>
          </Alert>
        ) : availableUsers.length === 0 ? (
            <Alert variant="info">No hay más usuarios disponibles para agregar.</Alert>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <select
              className="input-base"
              style={{ flex: 1, minWidth: 220 }}
              value={selectedUser}
              onChange={(e) => setSelUser(e.target.value)}
            >
              <option value="">Selecciona un usuario...</option>
              {availableUsers.map((u) => {
                const roleLabel = u.role === 'researcher' ? 'Investigador' : 'Aplicador'
                return <option key={u.id} value={u.id}>{u.full_name} — {roleLabel}</option>
              })}
            </select>
            <Button onClick={handleAdd} loading={adding}>Agregar</Button>
          </div>
        )}
      </div>

      {!noUsersInSystem && (
        members.length === 0 ? (
          <Alert variant="info">No hay miembros en este proyecto.</Alert>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-small)' }}>Nombre</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-small)' }}>Correo</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-small)' }}>Rol</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }} />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{m.full_name || '—'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}>{m.email}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <StatusBadge status={m.role === 'researcher' ? 'active' : 'pending'} label={m.role === 'researcher' ? 'Investigador' : 'Aplicador'} />
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(m.user_id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

// ── Tab Instrumentos ──────────────────────────────────────────────────────────

function TabInstrumentos({ projectId, token, toast }) {
  const [projInstruments, setProjInstruments] = useState([])
  const [allInstruments, setAllInstruments]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [selected, setSelected] = useState('')
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [piRes, allRes] = await Promise.all([
      listarInstrumentosProyecto(token, projectId),
      listarInstrumentos(token),
    ])
    if (piRes.ok)  setProjInstruments(piRes.data)
    if (allRes.ok) setAllInstruments(allRes.data)
    setLoading(false)
  }, [token, projectId])

  useEffect(() => { load() }, [load])

  async function handleAssign() {
    if (!selected) { setAddError('Selecciona un instrumento'); return }
    setAdding(true); setAddError('')
    const result = await asignarInstrumento(token, projectId, { instrument_id: selected })
    setAdding(false)
    if (!result.ok) {
      setAddError(result.code === 'ALREADY_ASSIGNED' ? 'Instrumento ya asignado' : result.error)
      return
    }
    setSelected(''); load()
    toast({ type: 'success', title: 'Instrumento asignado' })
  }

  async function handleRemove(instId) {
    const result = await quitarInstrumento(token, projectId, instId)
    if (!result.ok) { toast({ type: 'error', title: 'Error', message: result.error }); return }
    setProjInstruments((prev) => prev.filter((i) => i.id !== instId))
    toast({ type: 'success', title: 'Instrumento quitado' })
  }

  const activeInstruments = allInstruments.filter((i) => i.is_active)
  const available = activeInstruments.filter(
    (i) => !projInstruments.some((pi) => pi.id === i.id)
  )
  const noInstrumentsInSystem = !loading && activeInstruments.length === 0

  if (loading) return <div style={{ padding: 'var(--space-6)' }}><Spinner /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Typography as="h3">Asignar instrumento</Typography>
        {addError && <Alert variant="error">{addError}</Alert>}

        {noInstrumentsInSystem ? (
          <Alert variant="info">
            No hay instrumentos activos en el sistema.{' '}
            <a href="/instruments" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' }}>
              Crear instrumento
            </a>
          </Alert>
        ) : available.length === 0 ? (
          <Alert variant="info">Todos los instrumentos activos ya están asignados a este proyecto.</Alert>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <select className="input-base" style={{ flex: 1 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Selecciona un instrumento...</option>
              {available.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <Button onClick={handleAssign} loading={adding}>Asignar</Button>
          </div>
        )}
      </div>

      {!noInstrumentsInSystem && projInstruments.length === 0 && (
        <Alert variant="info">No hay instrumentos asignados a este proyecto.</Alert>
      )}
      {projInstruments.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-small)' }}>Nombre</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-small)' }}>Estado</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }} />
              </tr>
            </thead>
            <tbody>
              {projInstruments.map((i) => (
                <tr key={i.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{i.name}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <StatusBadge status={i.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(i.id)}>Quitar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Tab Configuración Operativa ───────────────────────────────────────────────

/**
 * Convierte config guardada → filas { name, range, enabled }.
 * age_cohort_map contiene TODOS los niveles (activos e inactivos).
 * education_levels contiene solo los activos — determina enabled.
 */
function configToRows(config) {
  const map     = config?.age_cohort_map   || {}
  const enabled = new Set(config?.education_levels || [])
  // Mostrar todos los niveles del mapa; si no hay mapa, usar education_levels
  const allNames = Object.keys(map).length > 0
    ? Object.keys(map)
    : (config?.education_levels || [])
  return allNames.map((name) => ({ name, range: map[name] || '', enabled: enabled.has(name) }))
}

/**
 * Convierte filas → campos de la config.
 * education_levels = solo los habilitados.
 * age_cohort_map   = todos (para conservar deshabilitados entre guardados).
 */
function rowsToConfig(rows, draft) {
  return {
    education_levels: rows.filter((r) => r.enabled).map((r) => r.name),
    age_cohort_map:   Object.fromEntries(rows.map((r) => [r.name, r.range])),
    cohort_mode:      draft.cohortMode,
    subject_limit:    parseInt(draft.subject_limit, 10),
  }
}

function TabConfig({ projectId, token, toast }) {
  const [saved, setSaved]     = useState(null)   // config original del servidor
  const [rows, setRows]       = useState([])     // filas de la tabla
  const [cohortMode, setCohortMode] = useState('libre')
  const [subjectLimit, setSubjectLimit] = useState(50)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    obtenerConfigProyecto(token, projectId).then((r) => {
      if (r.ok) {
        setSaved(r.data)
        setRows(configToRows(r.data))
        setCohortMode(r.data.cohort_mode || 'libre')
        setSubjectLimit(r.data.subject_limit ?? 50)
      }
      setLoading(false)
    })
  }, [token, projectId])

  // Dirty check — compara draft vs saved
  const isDirty = (() => {
    if (!saved) return false
    const draft = rowsToConfig(rows, { cohortMode, subject_limit: subjectLimit })
    return (
      JSON.stringify(draft.education_levels)  !== JSON.stringify(saved.education_levels) ||
      JSON.stringify(draft.age_cohort_map)    !== JSON.stringify(saved.age_cohort_map)   ||
      draft.cohort_mode   !== (saved.cohort_mode   || 'libre')  ||
      draft.subject_limit !== saved.subject_limit
    )
  })()

  function updateRow(idx, field, value) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function toggleRow(idx) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r))
  }

  function addRow() {
    setRows((prev) => [...prev, { name: '', range: '', enabled: true }])
  }

  function removeRow(idx) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    const emptyName = rows.some((r) => !r.name.trim())
    if (emptyName) { setError('Todos los niveles deben tener un nombre.'); return }

    setSaving(true); setError('')
    const body = rowsToConfig(rows, { cohortMode, subject_limit: subjectLimit })
    const result = await guardarConfigProyecto(token, projectId, body)
    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    setSaved(result.data)
    setRows(configToRows(result.data))
    setCohortMode(result.data.cohort_mode || 'libre')
    setSubjectLimit(result.data.subject_limit ?? 50)
    toast({ type: 'success', title: 'Configuración guardada' })
  }

  if (loading) return <div style={{ padding: 'var(--space-6)' }}><Spinner /></div>
  if (!saved)  return <Alert variant="error">No se pudo cargar la configuración.</Alert>

  const TH = { padding: 'var(--space-2) var(--space-3)', textAlign: 'left', fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)', background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }
  const TD = { padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-border)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {error && <Alert variant="error">{error}</Alert>}

      {/* ── Niveles educativos ── */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)' }}>
          <Typography as="h3" style={{ margin: 0 }}>Educación Básica</Typography>
          <Typography as="small" style={{ color: 'var(--color-text-secondary)', display: 'block', marginTop: 'var(--space-1)' }}>
            Define los niveles educativos del proyecto y el rango de edades correspondiente a cada uno. Puedes editar los nombres y rangos, o agregar nuevos niveles.
          </Typography>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '45%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '7%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>Nivel</th>
              <th style={TH}>Rango de edades</th>
              <th style={{ ...TH, textAlign: 'center' }}>Estado</th>
              <th style={{ ...TH, textAlign: 'center' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ opacity: row.enabled ? 1 : 0.5 }}>
                <td style={TD}>
                  <input
                    className="input-base"
                    style={{ width: '100%' }}
                    value={row.name}
                    placeholder="Nombre del nivel"
                    onChange={(e) => updateRow(idx, 'name', e.target.value)}
                  />
                </td>
                <td style={TD}>
                  <input
                    className="input-base"
                    style={{ width: '100%' }}
                    value={row.range}
                    placeholder="ej. 6-12"
                    onChange={(e) => updateRow(idx, 'range', e.target.value)}
                  />
                </td>
                <td style={{ ...TD, textAlign: 'center' }}>
                  <button
                    type="button"
                    title={row.enabled ? 'Desactivar nivel' : 'Activar nivel'}
                    onClick={() => toggleRow(idx)}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      width: 40, height: 22, borderRadius: 11,
                      background: row.enabled ? 'var(--color-primary)' : 'var(--color-border)',
                      border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                      flexShrink: 0, position: 'relative',
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute', transition: 'left 0.15s',
                      left: row.enabled ? 21 : 3,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }} />
                  </button>
                </td>
                <td style={{ ...TD, textAlign: 'center' }}>
                  <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} title="Eliminar nivel">✕</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <Button variant="ghost" size="sm" onClick={addRow}>+ Agregar nivel</Button>
        </div>
      </section>

      {/* ── Modo de cohorte ── */}
      <section className="card">
        <Typography as="h3" style={{ marginBottom: 'var(--space-1)' }}>Modo de cohorte de edades</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--space-3)' }}>
          <strong>Libre:</strong> el aplicador ingresa la edad del sujeto sin restricciones por nivel.<br />
          <strong>Restringido:</strong> la edad debe corresponder al rango definido para el nivel seleccionado.
        </Typography>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {['libre', 'restringido'].map((opt) => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="radio" name="cohort-mode" value={opt} checked={cohortMode === opt} onChange={() => setCohortMode(opt)} />
              <span style={{ textTransform: 'capitalize' }}>{opt}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ── Límites ── */}
      <section className="card">
        <Typography as="h3" style={{ marginBottom: 'var(--space-1)' }}>Límites</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--space-3)' }}>
          Máximo de sujetos que puede registrar un aplicador en este proyecto.
        </Typography>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
          <label htmlFor="subject-limit" className="field-label" style={{ margin: 0 }}>
            Límite de sujetos por aplicador
          </label>
          <input
            id="subject-limit"
            className="input-base"
            type="number"
            min={1}
            style={{ width: 120 }}
            value={subjectLimit}
            onChange={(e) => setSubjectLimit(e.target.value)}
          />
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleSave} loading={saving} disabled={!isDirty}>
          Guardar configuración
        </Button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',       label: 'General',             icon: Info     },
  { id: 'miembros',      label: 'Miembros',            icon: Users    },
  { id: 'instrumentos',  label: 'Instrumentos',        icon: BookOpen },
  { id: 'config',        label: 'Configuración',       icon: Settings },
]

export default function ProjectDetailPage() {
  const { id }             = useParams()
  const navigate           = useNavigate()
  const { token }          = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [activeTab, setTab]   = useState('general')

  useEffect(() => {
    obtenerProyecto(token, id).then((r) => {
      if (r.ok) setProject(r.data)
      else setError(r.error)
      setLoading(false)
    })
  }, [token, id])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}><Spinner /></div>
  if (error)   return <div style={{ padding: 'var(--space-6)' }}><Alert variant="error">{error}</Alert></div>

  return (
    <main className="page-container">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <button
        onClick={() => navigate('/proyectos')}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-small)' }}
      >
        <ArrowLeft size={14} /> Proyectos
      </button>

      <Typography as="h1" style={{ marginBottom: 'var(--space-5)' }}>{project.name}</Typography>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)', marginBottom: 'var(--space-5)' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-4)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: active ? 'var(--font-weight-medium)' : 'normal',
                marginBottom: -2,
                fontSize: 'var(--font-size-small)',
              }}
            >
              <Icon size={14} /> {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'general'      && <TabGeneral      project={project} />}
      {activeTab === 'miembros'     && <TabMiembros     projectId={id} token={token} toast={toast} />}
      {activeTab === 'instrumentos' && <TabInstrumentos projectId={id} token={token} toast={toast} />}
      {activeTab === 'config'       && <TabConfig       projectId={id} token={token} toast={toast} />}
    </main>
  )
}
