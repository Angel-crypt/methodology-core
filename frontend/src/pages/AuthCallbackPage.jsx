/**
 * AuthCallbackPage — procesa el callback de Google OIDC.
 * Montado en /auth/callback; extrae code y state de la URL, llama al backend
 * y redirige a /instruments si tiene éxito, o a /login si falla.
 */
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function AuthCallbackPage({ onLogin }) {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const [error, setError] = useState(false)
  // useRef persiste a través del desmontaje/remontaje de StrictMode (dev).
  // Garantiza que el fetch al code single-use se hace exactamente una vez.
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const code  = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      navigate('/login', { replace: true })
      return
    }

    async function processCallback() {
      try {
        const res  = await fetch('/api/v1/auth/oidc/callback', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code, state }),
        })
        const data = await res.json()

        if (data.status === 'success') {
          const { access_token } = data.data
          onLogin(access_token, false)
          navigate('/instruments', { replace: true })
        } else {
          setError(true)
          navigate('/login', { replace: true })
        }
      } catch {
        setError(true)
        navigate('/login', { replace: true })
      }
    }

    processCallback()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return null

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--color-text-secondary)',
      }}
    >
      Verificando tu cuenta…
    </div>
  )
}

AuthCallbackPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
}

export default AuthCallbackPage
