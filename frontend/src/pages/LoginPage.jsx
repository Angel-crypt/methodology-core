import { useState } from 'react'
import { KeyRound, LogIn } from 'lucide-react'
import { Button, FormField, Alert } from '@/components/app'

/**
 * LoginPage
 * Solicita el token JWT al usuario para autenticar las peticiones al API.
 *
 * Props:
 *   onLogin (token: string) => void — recibe el token ingresado
 */
function LoginPage({ onLogin }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    const trimmed = token.trim()
    if (!trimmed) {
      setError('El token no puede estar vacío.')
      return
    }
    setError('')
    onLogin(trimmed)
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
            <KeyRound size={24} aria-hidden="true" />
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
              Ingresa tu token JWT para continuar
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <FormField
            id="jwt-token"
            label="Token JWT"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            required
            helper="El token lo provee el administrador del sistema."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          <Button
            icon={LogIn}
            iconPosition="right"
            onClick={handleSubmit}
            style={{ width: '100%' }}
          >
            Ingresar
          </Button>
        </div>

      </div>
    </div>
  )
}

export default LoginPage