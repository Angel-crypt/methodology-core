import { useState } from 'react'
import PropTypes from 'prop-types'
import { Modal, FormField, Button, Alert } from '@/components/app'

/**
 * CambiarPasswordModal
 * Permite al usuario autenticado cambiar su contraseña (RF-M1-06).
 * Tras el cambio exitoso llama onSuccess — el servidor invalida todas
 * las sesiones previas via password_changed_at, por lo que onSuccess
 * debe cerrar la sesión local.
 *
 * Props:
 *   open      boolean
 *   onClose   () => void  — ignorado si forced=true
 *   token     string — JWT activo para Authorization header
 *   onSuccess () => void — llamado tras 200 OK
 *   forced    boolean (opcional) — si true, el modal no puede cerrarse
 *             y muestra un mensaje de cambio obligatorio
 */
function CambiarPasswordModal({ open, onClose, token, onSuccess, forced = false }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  function handleChange(campo) {
    return (e) => {
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
      if (error) setError('')
    }
  }

  function handleClose() {
    if (forced) return  // no cancelable en modo forzado
    setForm({ current_password: '', new_password: '', confirm: '' })
    setError('')
    onClose()
  }

  async function handleSubmit() {
    if (!form.current_password.trim() || !form.new_password.trim() || !form.confirm.trim()) {
      setError('Todos los campos son obligatorios.')
      return
    }
    if (form.new_password === form.current_password) {
      setError('La nueva contraseña debe ser diferente a la actual.')
      return
    }
    if (form.new_password !== form.confirm) {
      setError('La nueva contraseña y su confirmación no coinciden.')
      return
    }

    setCargando(true)
    setError('')

    try {
      const res = await fetch('/api/v1/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      })
      const data = await res.json()

      if (data.status === 'success') {
        onSuccess()
      } else {
        setError(data.message || 'No se pudo cambiar la contraseña.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={forced ? 'Cambia tu contraseña para continuar' : 'Cambiar contraseña'}
      size="sm"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          {!forced && (
            <Button variant="ghost" onClick={handleClose} disabled={cargando}>
              Cancelar
            </Button>
          )}
          <Button onClick={handleSubmit} loading={cargando}>
            Confirmar
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {forced && (
          <Alert variant="info">
            Tu cuenta tiene una contraseña temporal. Debes cambiarla antes de usar el sistema.
          </Alert>
        )}
        {error && (
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <FormField
          id="cp-current"
          label="Contraseña actual"
          type="password"
          placeholder="••••••••"
          required
          value={form.current_password}
          onChange={handleChange('current_password')}
          autoComplete="current-password"
          autoFocus
        />
        <FormField
          id="cp-new"
          label="Nueva contraseña"
          type="password"
          placeholder="••••••••"
          required
          value={form.new_password}
          onChange={handleChange('new_password')}
          autoComplete="new-password"
        />
        <FormField
          id="cp-confirm"
          label="Confirmar nueva contraseña"
          type="password"
          placeholder="••••••••"
          required
          value={form.confirm}
          onChange={handleChange('confirm')}
          autoComplete="new-password"
        />
      </div>
    </Modal>
  )
}

CambiarPasswordModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  token: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  forced: PropTypes.bool,
}

export default CambiarPasswordModal
