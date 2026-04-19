/**
 * OnboardingPage — completa el perfil tras aceptar T&C.
 * Carga profileConfig para saber qué campos son obligatorios.
 * Institución: texto libre; pre-llenado y deshabilitado si hay match por dominio.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/contexts/UserContext'
import { Button, FormField, Alert } from '@/components/app'

export default function OnboardingPage() {
  const { token } = useAuth()
  const { user, reloadUser } = useUser()
  const navigate = useNavigate()

  const [profileConfig, setProfileConfig] = useState({ require_phone: false, require_institution: true })
  const [phone, setPhone] = useState('')
  const [institution, setInstitution] = useState('')
  const [institutionLocked, setInstitutionLocked] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Cargar config de campos requeridos
  useEffect(() => {
    fetch('/api/v1/superadmin/profile-config', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.data) setProfileConfig(json.data) })
      .catch(() => {})
      .finally(() => setLoadingConfig(false))
  }, [token])

  // Auto-detectar institución por dominio del correo
  useEffect(() => {
    if (!user?.email) return
    fetch(`/api/v1/institutions/resolve?email=${encodeURIComponent(user.email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data?.institution) {
          setInstitution(json.data.institution)
          setInstitutionLocked(true)
        }
      })
      .catch(() => {})
  }, [token, user?.email])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (profileConfig.require_institution && !institution.trim()) {
      setError('El campo Institución es obligatorio.')
      return
    }
    if (profileConfig.require_phone && !phone.trim()) {
      setError('El campo Teléfono es obligatorio.')
      return
    }

    setSubmitting(true)
    try {
      const body = {}
      if (profileConfig.require_institution || institution.trim()) body.institution = institution.trim() || null
      if (profileConfig.require_phone || phone.trim()) body.phone = phone.trim() || null

      const res = await fetch('/api/v1/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message || 'Error al guardar el perfil')
      }

      await fetch('/api/v1/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ onboarding_completed: true }),
      })

      await reloadUser()
      navigate('/instruments', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingConfig) {
    return (
      <div className="login-layout">
        <div className="login-card">
          <p style={{ color: 'var(--color-text-secondary)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        <h2 style={{ margin: '0 0 var(--space-2)' }}>Completa tu perfil</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-5)' }}>
          Antes de continuar necesitamos algunos datos adicionales.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {profileConfig.require_phone && (
            <FormField
              id="onb-phone"
              label="Teléfono"
              type="tel"
              placeholder="+52 55 0000 0000"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}

          {profileConfig.require_institution && !institutionLocked && (
            <FormField
              id="onb-institution"
              label="Institución"
              placeholder="Nombre de tu institución"
              required
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          )}

          {institutionLocked && (
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>Institución: </span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{institution}</strong>
              <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                Detectada automáticamente por el dominio de tu correo.
              </div>
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" loading={submitting} style={{ width: '100%' }}>
            Continuar
          </Button>
        </form>
      </div>
    </div>
  )
}
