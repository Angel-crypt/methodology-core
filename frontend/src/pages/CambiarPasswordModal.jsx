import { useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Check, X } from 'lucide-react'
import { Modal, FormField, Button, Alert } from '@/components/app'
import { useAuth } from '@/contexts/AuthContext'
import { parseResponse } from '@/lib/api'
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'

zxcvbnOptions.setOptions({
  graphs:     zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: zxcvbnCommonPackage.dictionary,
})

// Minimum zxcvbn score to allow submission (0-4 scale; 3 = safely unguessable)
const MIN_STRENGTH_SCORE = 3

function getStrengthRules(pw) {
  const score = pw.length > 0 ? zxcvbn(pw).score : 0
  return [
    { label: 'Mínimo 8 caracteres',              ok: pw.length >= 8 },
    { label: 'Al menos una mayúscula',            ok: /[A-Z]/.test(pw) },
    { label: 'Al menos un número',                ok: /\d/.test(pw) },
    { label: 'Al menos un carácter especial',     ok: /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/`~\\]/.test(pw) },
    { label: 'Contraseña segura', ok: pw.length > 0 && score >= MIN_STRENGTH_SCORE },
  ]
}

/**
 * CambiarPasswordModal
 * Props:
 *   open      boolean
 *   onClose   () => void  — ignorado si forced=true
 *   token     string — JWT activo para Authorization header
 *   onSuccess () => void — llamado tras 200 OK
 *   forced    boolean (opcional) — si true, el modal no puede cerrarse
 */
function CambiarPasswordModal({ open, onClose, onSuccess, forced = false }) {
  const { token } = useAuth()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [touched, setTouched] = useState({ new_password: false, confirm: false })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const strengthRules = useMemo(() => getStrengthRules(form.new_password), [form.new_password])
  const allRulesPassed = strengthRules.every((r) => r.ok)
  const confirmMatch = form.confirm === form.new_password
  const showConfirmError = touched.confirm && form.confirm.length > 0 && !confirmMatch
  const canSubmit = allRulesPassed && confirmMatch && form.current_password.trim().length > 0

  function handleChange(campo) {
    return (e) => {
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
      if (error) setError('')
    }
  }

  function handleBlur(campo) {
    return () => setTouched((prev) => ({ ...prev, [campo]: true }))
  }

  function handleClose() {
    if (forced) return
    setForm({ current_password: '', new_password: '', confirm: '' })
    setTouched({ new_password: false, confirm: false })
    setError('')
    onClose()
  }

  async function handleSubmit() {
    setTouched({ new_password: true, confirm: true })
    if (!form.current_password.trim()) { setError('La contraseña actual es obligatoria.'); return }
    if (!allRulesPassed) { setError('La nueva contraseña no cumple los requisitos.'); return }
    if (!confirmMatch) { setError('La nueva contraseña y su confirmación no coinciden.'); return }
    if (form.new_password === form.current_password) { setError('La nueva contraseña debe ser diferente a la actual.'); return }

    setCargando(true)
    setError('')

    try {
      const res = await fetch('/api/v1/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }),
      })
      const data = await parseResponse(res)
      if (data.ok) {
        onSuccess()
      } else {
        setError(data.error || 'No se pudo cambiar la contraseña.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  const showStrength = touched.new_password && form.new_password.length > 0

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
          <Button onClick={handleSubmit} loading={cargando} disabled={!canSubmit && touched.new_password}>
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
        {error && <Alert variant="error">{error}</Alert>}

        <FormField
          id="cp-current"
          label="Contraseña actual"
          type="password"
          placeholder="••••••••"
          required
          reveal
          value={form.current_password}
          onChange={handleChange('current_password')}
          autoComplete="current-password"
          autoFocus
        />

        <div>
          <FormField
            id="cp-new"
            label="Nueva contraseña"
            type="password"
            placeholder="••••••••"
            required
            reveal
            value={form.new_password}
            onChange={handleChange('new_password')}
            onBlur={handleBlur('new_password')}
            autoComplete="new-password"
          />
          {showStrength && (
            <ul style={{ listStyle: 'none', marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {strengthRules.map((rule) => (
                <li
                  key={rule.label}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-caption)', color: rule.ok ? 'var(--color-success-text)' : 'var(--color-error)' }}
                >
                  {rule.ok ? <Check size={12} /> : <X size={12} />}
                  {rule.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <FormField
          id="cp-confirm"
          label="Confirmar nueva contraseña"
          type="password"
          placeholder="••••••••"
          required
          reveal
          value={form.confirm}
          onChange={handleChange('confirm')}
          onBlur={handleBlur('confirm')}
          autoComplete="new-password"
          error={showConfirmError ? 'Las contraseñas no coinciden.' : undefined}
        />
      </div>
    </Modal>
  )
}

CambiarPasswordModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  forced: PropTypes.bool,
}

export default CambiarPasswordModal
