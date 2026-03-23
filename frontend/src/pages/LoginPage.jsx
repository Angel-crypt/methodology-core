import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { Button, FormField, Alert } from '@/components/app'

const DEMO_EMAIL = 'admin@mock.local'
const DEMO_PASSWORD = 'Admin123!'

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

        {/* Ícono + título */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-8)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-dark)',
            }}
          >
            <LogIn size={24} aria-hidden="true" />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: 'var(--font-size-h2)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Sistema de Perfiles Lingüísticos
            </h1>
            <p
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-text-secondary)',
                marginTop: 'var(--space-1)',
              }}
            >
              Inicia sesión para continuar
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {/* Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField
            id="login-email"
            label="Correo electrónico"
            type="email"
            placeholder="usuario@dominio.com"
            required
            value={form.email}
            onChange={handleChange('email')}
            onKeyDown={handleKeyDown}
            autoComplete="email"
            autoFocus
          />

          <FormField
            id="login-password"
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
            icon={LogIn}
            iconPosition="right"
            onClick={handleSubmit}
            loading={cargando}
            style={{ width: '100%' }}
          >
            Ingresar
          </Button>
        </div>

        {/* Referencia de credenciales — solo entorno de desarrollo */}
        {import.meta.env.DEV && (
          <div
            style={{
              marginTop: 'var(--space-5)',
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border)',
            }}
          >
            <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
              Credenciales de prueba (mock):
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>
              {DEMO_EMAIL}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-primary)' }}>
              {DEMO_PASSWORD}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

export default LoginPage
