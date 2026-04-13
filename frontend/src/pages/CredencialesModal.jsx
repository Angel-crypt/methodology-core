import { useState } from 'react'
import PropTypes from 'prop-types'
import { Copy, Check, Link } from 'lucide-react'
import { Modal, Button, Alert, Typography } from '@/components/app'

/**
 * CredencialesModal
 * Muestra al administrador el email y el enlace de configuración inicial
 * de la cuenta creada o restablecida. El enlace es de un solo uso y expira en 24 horas.
 *
 * El modal no puede cerrarse hasta confirmar. El admin debe enviar el enlace al
 * usuario por cualquier canal disponible (WhatsApp, Slack, etc.).
 *
 * Props:
 *   open          boolean
 *   onClose       () => void  — llamado al presionar "Entendido"
 *   email         string
 *   setupToken    string      — token CSPRNG; la URL se construye client-side
 *   nombreUsuario string
 */
function CredencialesModal({ open, onClose, email, setupToken, nombreUsuario }) {
  const [copiadoEmail, setCopiadoEmail] = useState(false)
  const [copiadoUrl, setCopiadoUrl] = useState(false)

  const setupUrl = `${window.location.origin}/setup?token=${setupToken}`

  function copiar(texto, setCopia) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopia(true)
      setTimeout(() => setCopia(false), 2000)
    })
  }

  function copiarUrlYCerrar() {
    navigator.clipboard.writeText(setupUrl).then(() => {
      setCopiadoUrl(true)
      setTimeout(() => onClose(), 800)
    })
  }

  return (
    <Modal
      open={open}
      onClose={null}
      title="Enlace de acceso inicial"
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
          Envía este enlace a <strong>{nombreUsuario}</strong> por cualquier canal
          disponible. Al hacer clic, podrá crear su contraseña directamente.
        </Typography>

        {/* Correo electrónico */}
        <div>
          <p
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-1)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Correo electrónico
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-text-primary)',
                wordBreak: 'break-all',
              }}
            >
              {email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={copiadoEmail ? Check : Copy}
              onClick={() => copiar(email, setCopiadoEmail)}
              aria-label="Copiar correo electrónico"
            />
          </div>
        </div>

        {/* Enlace de configuración */}
        <div>
          <p
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-1)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Enlace de configuración <span style={{ color: 'var(--color-warning)' }}>(24 h · un solo uso)</span>
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Link
              size={14}
              style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}
              aria-hidden="true"
            />
            <span
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-text-primary)',
                wordBreak: 'break-all',
              }}
            >
              {setupUrl}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={copiadoUrl ? Check : Copy}
              onClick={() => copiar(setupUrl, setCopiadoUrl)}
              aria-label="Copiar enlace de configuración"
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}

CredencialesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  setupToken: PropTypes.string.isRequired,
  nombreUsuario: PropTypes.string.isRequired,
}

export default CredencialesModal
