/**
 * MisUsuariosPage — usuarios registrados por el aplicador.
 * Muestra la lista de sujetos (usuarios registrados) y sus aplicaciones.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/app'
import { Typography, Button, EmptyState, Spinner, ToastContainer } from '@/components/app'
import { ChevronRight, Users, ClipboardList, Calendar } from 'lucide-react'

// GET /subjects/mine — sujetos creados por el aplicador
async function fetchMisSujetos(token) {
  const res = await fetch('/api/v1/subjects/mine', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return json.status === 'success' ? json.data : []
}

// GET /subjects/:id/applications — aplicaciones de un sujeto
async function fetchAplicacionesSujeto(token, subjectId) {
  const res = await fetch(`/api/v1/subjects/${subjectId}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return json.status === 'success' ? json.data : []
}

function SujetoRow({ sujeto, seleccionado, onClick }) {
  const tieneContexto = sujeto.context && Object.keys(sujeto.context).length > 0

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
      <div style={{ flex: 1 }}>
        <Typography as="strong" style={{ color: 'var(--color-text-primary)' }}>
          {sujeto.anonymous_code}
        </Typography>
        {tieneContexto && (
          <Typography as="small" style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {sujeto.context.full_name || 'Sin nombre'}
          </Typography>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-tertiary)' }}>
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
        gridTemplateColumns: '120px 1fr 80px',
        gap: 'var(--space-4)',
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

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const data = await fetchMisSujetos(token)
      setSujetos(data)
      setCargando(false)
    }
    cargar()
  }, [token])

  async function handleSeleccionarSujeto(sujeto) {
    setSujetoSeleccionado(sujeto)
    setCargandoApps(true)
    const apps = await fetchAplicacionesSujeto(token, sujeto.id)
    setAplicaciones(apps)
    setCargandoApps(false)
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', height: 'calc(100vh - 220px)' }}>
          {/* Lista de usuarios */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}>
              <Users size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <Typography as="strong" style={{ fontSize: 'var(--font-size-small)' }}>
                Usuarios ({sujetos.length})
              </Typography>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '100%' }}>
              {sujetos.map((s) => (
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
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}>
              <ClipboardList size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <Typography as="strong" style={{ fontSize: 'var(--font-size-small)' }}>
                {sujetoSeleccionado ? `Aplicaciones de ${sujetoSeleccionado.anonymous_code}` : 'Selecciona un usuario'}
              </Typography>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '100%' }}>
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
              ) : aplicaciones.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                  <Typography as="small" style={{ color: 'var(--color-text-tertiary)' }}>
                    Este usuario no tiene aplicaciones registradas.
                  </Typography>
                </div>
              ) : (
                <>
                  {/* Cabecera */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr 80px',
                      gap: 'var(--space-4)',
                      padding: 'var(--space-2) var(--space-4)',
                      backgroundColor: 'var(--color-bg-subtle)',
                    }}
                  >
                    <Typography as="small" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)' }}>Fecha</Typography>
                    <Typography as="small" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)' }}>Instrumento</Typography>
                    <Typography as="small" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)', textAlign: 'right' }}>Métricas</Typography>
                  </div>
                  {aplicaciones.map((app) => (
                    <AplicacionRow key={app.application_id} app={app} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}