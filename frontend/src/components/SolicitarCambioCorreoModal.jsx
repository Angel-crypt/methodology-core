import { useState } from 'react'
import PropTypes from 'prop-types'
import { Modal, FormField, Button, Alert } from '@/components/app'
import { useAuth } from '@/contexts/AuthContext'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function SolicitarCambioCorreoModal({ open, onClose }) {
  const { token } = useAuth()
  const [newEmail, setNewEmail] = useState('')
  const [reason, setReason] = useState('')
  const [emailError, setEmailError] = useState('')
  const [feedback, setFeedback] = useState(null) // { type: 'success'|'error', message }
  const [loading, setLoading] = useState(false)

  function handleClose() {
    setNewEmail('')
    setReason('')
    setEmailError('')
    setFeedback(null)
    onClose()
  }

  async function handleSubmit() {
    setEmailError('')
    setFeedback(null)

    if (!isValidEmail(newEmail)) {
      setEmailError('El formato del correo es inválido.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/users/me/email-change-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_email: newEmail, reason }),
      })
      const data = await res.json()

      if (res.status === 201) {
        setFeedback({ type: 'success', message: 'Solicitud enviada. El administrador la revisará.' })
        return
      }

      const code = data?.data?.code
      if (code === 'PENDING_REQUEST_EXISTS') {
        setFeedback({ type: 'error', message: 'Ya tienes una solicitud pendiente de revisión.' })
      } else if (code === 'EMAIL_ALREADY_EXISTS') {
        setFeedback({ type: 'error', message: 'Ese correo ya está registrado en el sistema.' })
      } else {
        setFeedback({ type: 'error', message: data?.message || 'No se pudo enviar la solicitud.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Solicitar cambio de correo"
      size="sm"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Solicitar cambio
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          No puedes cambiar tu correo directamente. Tu solicitud será revisada por el administrador del sistema.
        </p>

        {feedback && (
          <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
            {feedback.message}
          </Alert>
        )}

        <FormField
          id="scm-email"
          label="Nuevo correo electrónico"
          type="email"
          placeholder="correo@dominio.com"
          required
          value={newEmail}
          onChange={(e) => { setNewEmail(e.target.value); if (emailError) setEmailError('') }}
          error={emailError}
          autoFocus
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor="scm-reason" className="field-label" style={{ marginBottom: 0 }}>
            Motivo <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>(opcional)</span>
          </label>
          <textarea
            id="scm-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: cambié de institución"
            rows={3}
            style={{
              resize: 'vertical',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'inherit',
              color: 'var(--color-text-primary)',
              background: 'var(--color-surface)',
            }}
          />
        </div>
      </div>
    </Modal>
  )
}

SolicitarCambioCorreoModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default SolicitarCambioCorreoModal
