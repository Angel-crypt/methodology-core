import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * FormField — label + input + helper/error message
 * Props: id, label, type, error, helper, required, disabled, ...inputProps
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
    className = '',
    ...inputProps
  },
  ref
) {
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

      <input
        ref={ref}
        id={id}
        type={type}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`input-base ${className}`}
        {...inputProps}
      />

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

export default FormField
