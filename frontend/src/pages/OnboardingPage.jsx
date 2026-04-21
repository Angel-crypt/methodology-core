/**
 * OnboardingPage — completa el perfil tras aceptar T&C.
 * Carga profileConfig para saber qué campos son obligatorios.
 * Institución: texto libre; pre-llenado y deshabilitado si hay match por dominio.
 * Teléfono: selector de código de país + número (solo dígitos).
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/contexts/UserContext'
import { Button, FormField, Alert } from '@/components/app'

// Códigos de país comunes para Latinoamérica y España
const COUNTRY_CODES = [
  { code: '+52', label: 'México (+52)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+55', label: 'Brasil (+55)' },
  { code: '+56', label: 'Chile (+56)' },
  { code: '+57', label: 'Colombia (+57)' },
  { code: '+58', label: 'Venezuela (+58)' },
  { code: '+591', label: 'Bolivia (+591)' },
  { code: '+593', label: 'Ecuador (+593)' },
  { code: '+595', label: 'Paraguay (+595)' },
  { code: '+51', label: 'Perú (+51)' },
  { code: '+598', label: 'Uruguay (+598)' },
  { code: '+34', label: 'España (+34)' },
  { code: '+1', label: 'EE.UU./Canadá (+1)' },
]

export default function OnboardingPage() {
  const { token } = useAuth()
  const { user, reloadUser } = useUser()
  const navigate = useNavigate()

  const [profileConfig, setProfileConfig] = useState({ require_phone: false, require_institution: true })
  const [countryCode, setCountryCode] = useState('+52')
  const [phoneNumber, setPhoneNumber] = useState(user?.phone ? user.phone.replace(/^\+\d+/, '') : '')
  const [institution, setInstitution] = useState(user?.institution || '')
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
    if (profileConfig.require_phone) {
      // Validar teléfono: solo dígitos, longitud mínima según país
      const cleanNumber = phoneNumber.replace(/\D/g, '')
      if (!cleanNumber) {
        setError('El campo Teléfono es obligatorio.')
        return
      }
      // Longitud mínima de 7 dígitos para cualquier país
      if (cleanNumber.length < 7 || cleanNumber.length > 15) {
        setError('El número de teléfono debe tener entre 7 y 15 dígitos.')
        return
      }
    }

    setSubmitting(true)
    try {
      const body = {}
      if (profileConfig.require_institution || institution.trim()) body.institution = institution.trim() || null
      if (profileConfig.require_phone && phoneNumber.trim()) {
        // Combinar código de país + número
        body.phone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`
      }

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
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 140px' }}>
                <label className="field-label" htmlFor="onb-country-code" style={{ marginBottom: 'var(--space-1)' }}>
                  País
                </label>
                <select
                  id="onb-country-code"
                  className="input-base"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <FormField
                  id="onb-phone"
                  label="Teléfono"
                  type="tel"
                  placeholder="55 0000 0000"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
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
