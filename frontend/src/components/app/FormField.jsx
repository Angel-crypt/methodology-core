import PropTypes from 'prop-types'
import { forwardRef, useState } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

/**
 * FormField — label + input + helper/error message
 * Props: id, label, type, error, helper, required, disabled, reveal, ...inputProps
 * 
 * Si reveal=true y type="password", agrega un botón para mostrar/ocultar la contraseña.
 */

const FormField = forwardRef(function FormField(
  {
    id,
    label,
    type = 'text',
    error,
    helper,
    required = false,
    disabled,
    reveal = false,
    className = '',
    ...inputProps
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false)
  const showToggle = reveal && type === 'password'
  const inputType = showToggle ? (showPassword ? 'text' : 'password') : type

  const helperId = helper ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {label && (
        <label
          htmlFor={id}
          className="field-label"
          style={{ marginBottom: 0 }}
        >
          {label}
          {required && (
            <span
              aria-hidden="true"
              style={{
                color: 'var(--color-error-text)',
                marginLeft: 'var(--space-1)',
              }}
            >
              *
            </span>
          )}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          ref={ref}
          id={id}
          type={inputType}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`input-base ${className}`}
          style={showToggle ? { paddingRight: 'var(--space-9)' } : undefined}
          {...inputProps}
        />
        {showToggle && (
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar' : 'Ver'}
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: 'var(--space-2)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 'var(--space-1)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          className="field-error"
          role="alert"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      )}

      {!error && helper && (
        <p id={helperId} className="field-helper">
          {helper}
        </p>
      )}
    </div>
  )
})

FormField.displayName = 'FormField'

FormField.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  type: PropTypes.string,
  error: PropTypes.string,
  helper: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  reveal: PropTypes.bool,
  className: PropTypes.string,
}

export default FormField
