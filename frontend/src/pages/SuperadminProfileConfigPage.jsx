/**
 * SuperadminProfileConfigPage — configura qué campos son obligatorios en el onboarding.
 * GET/PUT /superadmin/profile-config
 */
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Alert, Typography } from '@/components/app'

export default function SuperadminProfileConfigPage() {
  const { token } = useAuth()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/v1/superadmin/profile-config', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => setConfig(json.data))
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/v1/superadmin/profile-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Error al guardar la configuración')
      const json = await res.json()
      setConfig(json.data)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function toggle(field) {
    setConfig((prev) => ({ ...prev, [field]: !prev[field] }))
    setSuccess(false)
  }

  const checkboxStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    background: 'var(--color-bg-subtle)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    userSelect: 'none',
  }

  return (
    <main className="page-container">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Configuración de perfil</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Define qué información deben completar los usuarios durante el onboarding.
        </Typography>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Cargando...</p>
      ) : (
        <div className="card" style={{ maxWidth: 480 }}>
          <Typography as="h2" style={{ marginBottom: 'var(--space-5)' }}>
            Campos requeridos en el onboarding
          </Typography>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={config?.require_institution ?? true}
                onChange={() => toggle('require_institution')}
              />
              <div>
                <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                  Institución obligatoria
                </div>
                <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
                  El usuario debe indicar su institución al activar su cuenta.
                </div>
              </div>
            </label>

            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={config?.require_phone ?? false}
                onChange={() => toggle('require_phone')}
              />
              <div>
                <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                  Teléfono obligatorio
                </div>
                <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
                  El usuario debe proporcionar un número de contacto.
                </div>
              </div>
            </label>

            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={config?.require_terms ?? true}
                onChange={() => toggle('require_terms')}
              />
              <div>
                <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                  Aceptación de T&amp;C obligatoria
                </div>
                <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
                  El usuario debe aceptar los Términos y Condiciones antes de continuar.
                </div>
              </div>
            </label>
          </div>

          {error && <Alert variant="error" style={{ marginBottom: 'var(--space-4)' }}>{error}</Alert>}
          {success && <Alert variant="success" style={{ marginBottom: 'var(--space-4)' }}>Configuración guardada correctamente.</Alert>}

          <Button onClick={handleSave} loading={saving}>
            Guardar cambios
          </Button>
        </div>
      )}
    </main>
  )
}
