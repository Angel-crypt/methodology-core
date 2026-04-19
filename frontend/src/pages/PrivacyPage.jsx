/**
 * PrivacyPage — Aviso de Privacidad. Página informativa pública.
 */
import { useState, useEffect } from 'react'

export default function PrivacyPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/legal/privacy')
      .then((r) => r.json())
      .then((json) => setContent(json.data?.content ?? ''))
      .catch(() => setContent('No se pudo cargar el documento.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="login-layout">
      <div className="login-card" style={{ maxWidth: 640 }}>
        <h2 style={{ margin: '0 0 var(--space-4)' }}>Aviso de Privacidad</h2>

        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Cargando...</p>
        ) : (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.7,
            }}
          >
            {content}
          </div>
        )}
      </div>
    </div>
  )
}
