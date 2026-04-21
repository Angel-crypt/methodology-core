/**
 * PrivacyPage — Aviso de Privacidad. Página informativa pública.
 */
import { useState, useEffect } from 'react'

export default function PrivacyPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/v1/legal/privacy')
      .then((r) => r.json())
      .then((json) => setContent(json.data?.content ?? ''))
      .catch(() => setError('No se pudo cargar el documento.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="login-layout">
      <div className="login-card legal-document">
        <h1 className="legal-title">Aviso de Privacidad y Protección de Datos Personales</h1>

        {loading ? (
          <p className="legal-loading">Cargando...</p>
        ) : error ? (
          <p className="legal-error">{error}</p>
        ) : (
          <div
            className="legal-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </div>
  )
}
