/**
 * TermsPage — Términos y Condiciones.
 * Pantalla de bloqueo para researcher/applicator que aún no han aceptado T&C.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/contexts/UserContext'
import { Button, Alert } from '@/components/app'

export default function TermsPage() {
  const { token } = useAuth()
  const { reloadUser } = useUser()
  const navigate = useNavigate()

  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/v1/legal/terms')
      .then((r) => r.json())
      .then((json) => setContent(json.data?.content ?? ''))
      .catch(() => setContent('<p>No se pudo cargar el documento.</p>'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAccept() {
    setAccepting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/users/me/accept-terms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al registrar la aceptación')
      await reloadUser()
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="login-layout">
      <div className="login-card legal-document">
        <h1 className="legal-title">Términos y Condiciones</h1>

        {loading ? (
          <p className="legal-loading">Cargando...</p>
        ) : (
          <>
            <div
              className="legal-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            <p className="legal-consent">
              Al continuar también aceptas nuestro{' '}
              <a href="/aviso-privacidad" target="_blank" rel="noopener noreferrer">
                Aviso de Privacidad
              </a>
              .
            </p>

            {error && (
              <Alert variant="error" style={{ marginBottom: 'var(--space-4)' }}>
                {error}
              </Alert>
            )}

            <Button
              onClick={handleAccept}
              loading={accepting}
              disabled={loading}
              style={{ width: '100%' }}
            >
              Acepto los Términos y Condiciones
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
