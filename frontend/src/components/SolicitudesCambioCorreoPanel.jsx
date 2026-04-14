import { useState, useEffect, useCallback } from 'react'
import { Mail, Check, X } from 'lucide-react'
import { Button, Alert, Spinner } from '@/components/app'
import { useAuth } from '@/contexts/AuthContext'
import {
  listarSolicitudesCambioCorreo,
  aprobarCambioCorreo,
  rechazarSolicitudCambioCorreo,
} from '@/services/emailChangeRequests'

/**
 * SolicitudesCambioCorreoPanel
 * Panel para superadmin: lista y gestiona solicitudes de cambio de correo pendientes.
 * Se monta en GestionAplicadores y GestionInvestigadores.
 */
function SolicitudesCambioCorreoPanel() {
  const { token } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorApi, setErrorApi] = useState('')
  const [accionando, setAccionando] = useState(null) // request id being processed

  const cargar = useCallback(async () => {
    setCargando(true)
    setErrorApi('')
    const data = await listarSolicitudesCambioCorreo(token)
    if (data.status === 'success') {
      setSolicitudes(data.data)
    } else {
      setErrorApi(data.message || 'No se pudieron cargar las solicitudes.')
    }
    setCargando(false)
  }, [token])

  useEffect(() => { cargar() }, [cargar])

  async function handleAprobar(solicitud) {
    setAccionando(solicitud.id)
    const data = await aprobarCambioCorreo(token, solicitud.user_id, solicitud.new_email)
    if (data.status === 'success') {
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitud.id))
    } else {
      setErrorApi(data.message || 'No se pudo aprobar la solicitud.')
    }
    setAccionando(null)
  }

  async function handleRechazar(solicitud) {
    setAccionando(solicitud.id)
    const data = await rechazarSolicitudCambioCorreo(token, solicitud.id)
    if (data.status === 'success') {
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitud.id))
    } else {
      setErrorApi(data.message || 'No se pudo rechazar la solicitud.')
    }
    setAccionando(null)
  }

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
        <Spinner />
      </div>
    )
  }

  if (solicitudes.length === 0 && !errorApi) return null

  return (
    <section
      aria-label="Solicitudes de cambio de correo"
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <Mail size={16} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
          Solicitudes de cambio de correo
        </h3>
        <span
          style={{
            background: 'var(--color-warning-subtle)',
            color: 'var(--color-warning-text)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            padding: '0 var(--space-2)',
          }}
        >
          {solicitudes.length}
        </span>
      </div>

      {errorApi && (
        <Alert variant="error" style={{ marginBottom: 'var(--space-3)' }}>{errorApi}</Alert>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {solicitudes.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', margin: 0 }}>
                <strong>{s.current_email ?? s.user_id}</strong>
                {' → '}
                <span style={{ color: 'var(--color-brand)' }}>{s.new_email}</span>
              </p>
              {s.reason && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                  {s.reason}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Rechazar solicitud"
                onClick={() => handleRechazar(s)}
                disabled={accionando === s.id}
              >
                <X size={14} aria-hidden="true" />
                Rechazar
              </Button>
              <Button
                size="sm"
                aria-label="Aprobar solicitud"
                onClick={() => handleAprobar(s)}
                loading={accionando === s.id}
              >
                <Check size={14} aria-hidden="true" />
                Aprobar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SolicitudesCambioCorreoPanel
