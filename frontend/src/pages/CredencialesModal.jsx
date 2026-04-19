/**
 * CredencialesModal
 * Muestra al administrador el email y el magic link de activación de la cuenta.
 * El enlace es de un solo uso y expira en 24 horas.
 * El admin debe enviarlo al usuario por el canal que prefiera.
 * No se envía automáticamente para no exponer el canal al sistema.
 *
 * Props:
 *   open          boolean
 *   onClose       () => void
 *   email         string
 *   magicLink     string  — ruta relativa o URL completa de activación
 *   nombreUsuario string
 */
import { useState } from 'react'
import PropTypes from 'prop-types'
import { Copy, Check, Link } from 'lucide-react'
import { Modal, Button, Alert, Typography } from '@/components/app'

function CredencialesModal({ open, onClose, email, magicLink, nombreUsuario }) {
  const [copiadoEmail, setCopiadoEmail] = useState(false)
  const [copiadoUrl, setCopiadoUrl]     = useState(false)

  const activationUrl = magicLink?.startsWith('http')
    ? magicLink
    : `${window.location.origin}${magicLink}`

  function copiar(texto, setCopia) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopia(true)
      setTimeout(() => setCopia(false), 2000)
    })
  }

  function copiarUrlYCerrar() {
    navigator.clipboard.writeText(activationUrl).then(() => {
      setCopiadoUrl(true)
      setTimeout(() => onClose(), 800)
    })
  }

  return (
    <Modal
      open={open}
      onClose={null}
      title="Enlace de activación"
      size="sm"
      hideClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button icon={copiadoUrl ? Check : Copy} onClick={copiarUrlYCerrar}>
            Copiar enlace y cerrar
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Alert variant="warning">
          Este enlace expira en <strong>24 horas</strong> y solo puede usarse una vez.
          Si no se usa, el administrador deberá generar uno nuevo.
        </Alert>

        <Typography as="body" style={{ color: 'var(--color-text-secondary)' }}>
          Envíaselo a <strong>{nombreUsuario}</strong> por el medio que prefieras.
          Al hacer clic, podrá vincular su cuenta de Google y acceder al sistema.
        </Typography>

        {/* Correo electrónico */}
        <div>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)', fontWeight: 'var(--font-weight-medium)' }}>
            Correo electrónico
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 'var(--font-size-small)', color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
              {email}
            </span>
            <Button variant="ghost" size="sm" icon={copiadoEmail ? Check : Copy} onClick={() => copiar(email, setCopiadoEmail)} aria-label="Copiar correo electrónico" />
          </div>
        </div>

        {/* Enlace de activación */}
        <div>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)', fontWeight: 'var(--font-weight-medium)' }}>
            Enlace de activación <span style={{ color: 'var(--color-warning)' }}>(24 h · un solo uso)</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <Link size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} aria-hidden="true" />
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
              {activationUrl}
            </span>
            <Button variant="ghost" size="sm" icon={copiadoUrl ? Check : Copy} onClick={() => copiar(activationUrl, setCopiadoUrl)} aria-label="Copiar enlace de activación" />
          </div>
        </div>
      </div>
    </Modal>
  )
}

CredencialesModal.propTypes = {
  open:          PropTypes.bool.isRequired,
  onClose:       PropTypes.func.isRequired,
  email:         PropTypes.string.isRequired,
  magicLink:     PropTypes.string.isRequired,
  nombreUsuario: PropTypes.string.isRequired,
}

export default CredencialesModal
