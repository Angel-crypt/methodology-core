/**
 * LoginPage — acceso mediante cuenta de Google (OIDC).
 * Solo para usuarios (researcher / applicator) invitados previamente por el superadmin.
 * El acceso del sistema (superadmin) se realiza en una ruta separada.
 */
import { useState } from 'react'
import PropTypes from 'prop-types'

// En desarrollo (mock) VITE_OIDC_AUTHORIZE_URL está vacío y se usa el proxy.
// En producción se configura con la URL real de Keycloak.
const OIDC_AUTHORIZE = import.meta.env.VITE_OIDC_AUTHORIZE_URL || '/api/v1/auth/oidc/authorize'
const CALLBACK_URI   = `${window.location.origin}/auth/callback`

function buildAuthorizeUrl() {
  const state = crypto.randomUUID()
  sessionStorage.setItem('oidc_state', state)
  const params = new URLSearchParams({
    redirect_uri: CALLBACK_URI,
    state,
  })
  return `${OIDC_AUTHORIZE}?${params}`
}

function LoginPage() {
  const [loginMessage] = useState(() => {
    const msg = sessionStorage.getItem('login_message')
    if (msg) sessionStorage.removeItem('login_message')
    return msg || ''
  })

  function handleGoogle() {
    window.location.href = buildAuthorizeUrl()
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-6)',
          }}
        >
          {loginMessage && (
            <p
              role="alert"
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-subtle)',
                color: 'var(--color-info-text)',
                fontSize: 'var(--font-size-sm)',
                textAlign: 'center',
              }}
            >
              {loginMessage}
            </p>
          )}

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
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-6)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-surface)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-primary)',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <GoogleIcon />
            Iniciar sesión con Google
          </button>

          <p
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            Solo para cuentas invitadas previamente por un administrador.
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

LoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
}

export default LoginPage
