/**
 * MisUsuariosPage — usuarios registrados por el aplicador.
 */
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/app'
import { Typography, Button, EmptyState, Spinner, ToastContainer } from '@/components/app'
import { ChevronRight, Users, ClipboardList, Calendar, X } from 'lucide-react'

async function fetchMisSujetos(token) {
  const res = await fetch('/api/v1/subjects/mine', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return json.status === 'success' ? json.data : []
}

async function fetchAplicacionesSujeto(token, subjectId) {
  const res = await fetch(`/api/v1/subjects/${subjectId}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return json.status === 'success' ? json.data : []
}

function SujetoRow({ sujeto, seleccionado, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        backgroundColor: seleccionado ? 'var(--color-primary-light)' : 'transparent',
        transition: 'background-color 0.15s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography as="strong" style={{ color: 'var(--color-text-primary)' }}>
          {sujeto.anonymous_code}
        </Typography>
        {sujeto.project_name && (
          <Typography as="small" style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sujeto.project_name}
          </Typography>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
        <Calendar size={14} />
        <Typography as="small">
          {sujeto.created_at ? new Date(sujeto.created_at).toLocaleDateString('es-CO') : '—'}
        </Typography>
        <ChevronRight size={16} />
      </div>
    </div>
  )
}

function AplicacionRow({ app }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 80px',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        alignItems: 'center',
      }}
    >
      <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
        {app.application_date ? new Date(app.application_date).toLocaleDateString('es-CO') : '—'}
      </Typography>
      <Typography as="small">{app.instrument_name || '—'}</Typography>
      <Typography as="small" style={{ color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
        {app.values_count || 0} métricas
      </Typography>
    </div>
  )
}

export default function MisUsuariosPage() {
  const { token } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [sujetos, setSujetos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [sujetoSeleccionado, setSujetoSeleccionado] = useState(null)
  const [aplicaciones, setAplicaciones] = useState([])
  const [cargandoApps, setCargandoApps] = useState(false)

  // Filtros
  const [filtroProyecto, setFiltroProyecto] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroInstrumento, setFiltroInstrumento] = useState('')

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        const data = await fetchMisSujetos(token)
        setSujetos(data)
      } catch {
        toast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los usuarios.' })
      } finally {
        setCargando(false)
      }
    }
    cargar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleSeleccionarSujeto(sujeto) {
    setSujetoSeleccionado(sujeto)
    setFiltroInstrumento('')
    setCargandoApps(true)
    try {
      const apps = await fetchAplicacionesSujeto(token, sujeto.id)
      setAplicaciones(apps)
    } catch {
      setAplicaciones([])
    } finally {
      setCargandoApps(false)
    }
  }

  // Proyectos únicos derivados
  const proyectos = useMemo(() => {
    const seen = new Map()
    sujetos.forEach((s) => { if (s.project_id && s.project_name) seen.set(s.project_id, s.project_name) })
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [sujetos])

  // Instrumentos únicos del sujeto seleccionado
  const instrumentosSujeto = useMemo(
    () => [...new Set(aplicaciones.map((a) => a.instrument_name).filter(Boolean))].sort(),
    [aplicaciones]
  )

  // Filtros aplicados a sujetos
  const sujetosFiltrados = useMemo(() => {
    return sujetos.filter((s) => {
      if (filtroProyecto && s.project_id !== filtroProyecto) return false
      if (filtroDesde && s.created_at && s.created_at.slice(0, 10) < filtroDesde) return false
      if (filtroHasta && s.created_at && s.created_at.slice(0, 10) > filtroHasta) return false
      return true
    })
  }, [sujetos, filtroProyecto, filtroDesde, filtroHasta])

  // Filtro de instrumento sobre aplicaciones del sujeto seleccionado
  const aplicacionesFiltradas = useMemo(() => {
    if (!filtroInstrumento) return aplicaciones
    return aplicaciones.filter((a) => a.instrument_name === filtroInstrumento)
  }, [aplicaciones, filtroInstrumento])

  const hayFiltrosSujeto = filtroProyecto || filtroDesde || filtroHasta

  function limpiarFiltros() {
    setFiltroProyecto('')
    setFiltroDesde('')
    setFiltroHasta('')
  }

  return (
    <main className="page-container">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Mis Usuarios</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Usuarios que has registrado. Haz clic para ver sus aplicaciones.
        </Typography>
      </div>

      {cargando ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Spinner />
          <Typography as="small">Cargando usuarios...</Typography>
        </div>
      ) : sujetos.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin usuarios registrados"
          description="Aún no has registrado ningún usuario. Usa el Registro Operativo para crear uno."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Filtros sujetos */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 180px', maxWidth: 260 }}>
              Proyecto
              <select
                className="input-base"
                value={filtroProyecto}
                onChange={(e) => { setFiltroProyecto(e.target.value); setSujetoSeleccionado(null) }}
              >
                <option value="">Todos</option>
                {proyectos.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 140px', maxWidth: 180 }}>
              Registrado desde
              <input
                className="input-base"
                type="date"
                value={filtroDesde}
                max={filtroHasta || undefined}
                onChange={(e) => { setFiltroDesde(e.target.value); setSujetoSeleccionado(null) }}
              />
            </label>

            <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 140px', maxWidth: 180 }}>
              Registrado hasta
              <input
                className="input-base"
                type="date"
                value={filtroHasta}
                min={filtroDesde || undefined}
                onChange={(e) => { setFiltroHasta(e.target.value); setSujetoSeleccionado(null) }}
              />
            </label>

            {hayFiltrosSujeto && (
              <Button variant="ghost" size="sm" onClick={limpiarFiltros} style={{ alignSelf: 'flex-end' }}>
                <X size={14} style={{ marginRight: 4 }} />
                Limpiar
              </Button>
            )}
          </div>

          {hayFiltrosSujeto && (
            <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
              {sujetosFiltrados.length} {sujetosFiltrados.length === 1 ? 'usuario' : 'usuarios'} encontrados
            </Typography>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', height: 'calc(100vh - 340px)', minHeight: 300 }}>
            {/* Lista de usuarios */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                flexShrink: 0,
              }}>
                <Users size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <Typography as="strong" style={{ fontSize: 'var(--font-size-small)' }}>
                  Usuarios ({sujetosFiltrados.length})
                </Typography>
              </div>
              <div style={{ overflow: 'auto', flex: 1 }}>
                {sujetosFiltrados.length === 0 ? (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                    <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
                      Sin usuarios con los filtros aplicados.
                    </Typography>
                  </div>
                ) : sujetosFiltrados.map((s) => (
                  <SujetoRow
                    key={s.id}
                    sujeto={s}
                    seleccionado={sujetoSeleccionado?.id === s.id}
                    onClick={() => handleSeleccionarSujeto(s)}
                  />
                ))}
              </div>
            </div>

            {/* Detalle del usuario seleccionado */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                flexShrink: 0,
              }}>
                <ClipboardList size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <Typography as="strong" style={{ fontSize: 'var(--font-size-small)' }}>
                  {sujetoSeleccionado ? `Aplicaciones de ${sujetoSeleccionado.anonymous_code}` : 'Selecciona un usuario'}
                </Typography>
              </div>

              {sujetoSeleccionado && !cargandoApps && aplicaciones.length > 0 && (
                <div style={{ padding: 'var(--space-2) var(--space-4)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 0 }}>
                    <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Instrumento:</span>
                    <select
                      className="input-base"
                      style={{ fontSize: 'var(--font-size-caption)', padding: '2px var(--space-2)' }}
                      value={filtroInstrumento}
                      onChange={(e) => setFiltroInstrumento(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {instrumentosSujeto.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  {filtroInstrumento && (
                    <Button variant="ghost" size="sm" onClick={() => setFiltroInstrumento('')}>
                      <X size={12} />
                    </Button>
                  )}
                </div>
              )}

              <div style={{ overflow: 'auto', flex: 1 }}>
                {!sujetoSeleccionado ? (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                    <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
                      Haz clic en un usuario para ver sus aplicaciones.
                    </Typography>
                  </div>
                ) : cargandoApps ? (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                    <Spinner />
                  </div>
                ) : aplicacionesFiltradas.length === 0 ? (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                    <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
                      {filtroInstrumento ? 'Sin aplicaciones con ese instrumento.' : 'Este usuario no tiene aplicaciones registradas.'}
                    </Typography>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr 80px',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-2) var(--space-4)',
                        backgroundColor: 'var(--color-bg-subtle)',
                      }}
                    >
                      <Typography as="small" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)' }}>Fecha</Typography>
                      <Typography as="small" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)' }}>Instrumento</Typography>
                      <Typography as="small" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)', textAlign: 'right' }}>Métricas</Typography>
                    </div>
                    {aplicacionesFiltradas.map((app) => (
                      <AplicacionRow key={app.application_id} app={app} />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
