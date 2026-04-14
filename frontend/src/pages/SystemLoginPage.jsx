/**
 * SystemLoginPage — acceso con email+contraseña exclusivo para el superadmin.
 * Servida en la ruta configurada por VITE_SYSTEM_LOGIN_PATH (default /__sys-auth).
 * No tiene enlace desde la UI pública; se accede por URL directa.
 */
import PropTypes from 'prop-types'
import { useState } from 'react'
import { Button, FormField, Alert } from '@/components/app'

function SystemLoginPage({ onLogin }) {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [cargando, setCargando] = useState(false)

  function handleChange(campo) {
    return (e) => {
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
      if (error) setError('')
    }
  }

  async function handleSubmit() {
    if (!form.email.trim() || !form.password.trim()) {
      setError('El correo y la contraseña son obligatorios.')
      return
    }

    setCargando(true)
    setError('')

    try {
      const res  = await fetch('/api/v1/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email.trim(), password: form.password }),
      })
      const data = await res.json()

      if (data.status === 'success') {
        const { access_token, must_change_password, user } = data.data
        if (user?.role !== 'superadmin') {
          setError('Esta vía es solo para administradores del sistema.')
          return
        }
        onLogin(access_token, must_change_password === true)
      } else if (res.status === 401) {
        setError('Credenciales inválidas.')
      } else {
        setError('No se pudo iniciar sesión. Inténtalo de nuevo.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        <div
          style={{
            textAlign: 'center',
            marginBottom: 'var(--space-8)',
          }}
        >
          <h1
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}
          >
            Acceso al sistema
          </h1>
        </div>

        {error && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField
            id="sys-login-email"
            label="Correo electrónico"
            type="email"
            placeholder="admin@dominio.com"
            required
            value={form.email}
            onChange={handleChange('email')}
            onKeyDown={handleKeyDown}
            autoComplete="email"
            autoFocus
          />

          <FormField
            id="sys-login-password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            required
            value={form.password}
            onChange={handleChange('password')}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
          />

          <Button
            onClick={handleSubmit}
            loading={cargando}
            style={{ width: '100%' }}
          >
            Acceder al sistema
          </Button>
        </div>
      </div>
    </div>
  )
}

SystemLoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
}

export default SystemLoginPage
