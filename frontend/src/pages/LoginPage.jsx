import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { Button, FormField, Alert } from '@/components/app'

/**
 * LoginPage
 * Autentica al usuario con email y contraseña contra POST /api/v1/auth/login.
 * Guarda el access_token recibido y lo pasa al App via onLogin.
 *
 * Props:
 *   onLogin (token: string) => void
 */
function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
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
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      })
      const data = await res.json()

      if (data.status === 'success') {
        onLogin(data.data.access_token)
      } else {
        setError(data.message || 'Credenciales incorrectas.')
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
        <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'var(--font-size-display)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
              lineHeight: 'var(--line-height-tight)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Iniciar sesión
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Sistema de Registro de Métricas Lingüísticas
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <Alert variant="error">{error}</Alert>}

          <FormField
            id="login-email"
            label="Correo electrónico"
            type="email"
            placeholder="usuario@institución.edu"
            required
            value={form.email}
            onChange={handleChange('email')}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />

          <FormField
            id="login-password"
            label="Contraseña"
            type="password"
            required
            value={form.password}
            onChange={handleChange('password')}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
          />

          <Button
            onClick={handleSubmit}
            loading={cargando}
            icon={LogIn}
            iconPosition="right"
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            Ingresar
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
