import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Button — DS button with multiple variants and sizes
 * Props: variant ('primary'|'secondary'|'ghost'|'danger'|'icon'),
 *        size ('sm'|'md'|'lg'), loading, disabled,
 *        icon (Lucide component), iconPosition ('left'|'right'),
 *        children, ...props
 */

const sizeStyles = {
  sm: {
    height: 'var(--button-height-sm)',
    padding: '0 var(--space-3)',
    fontSize: 'var(--font-size-small)',
  },
  md: {
    height: 'var(--button-height)',
    padding: '0 var(--space-4)',
    fontSize: 'var(--font-size-small)',
  },
  lg: {
    height: 'var(--button-height-lg)',
    padding: '0 var(--space-5)',
    fontSize: 'var(--font-size-body)',
  },
}

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    icon: Icon,
    iconPosition = 'left',
    children,
    className = '',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading
  const isIcon = variant === 'icon'

  const variantClass = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
    icon:      'btn-icon',
  }

  const baseClass = `btn ${variantClass[variant] ?? 'btn-primary'}`
  const iconSize = size === 'lg' ? 18 : 16

  return (
    <button
      ref={ref}
      className={`${baseClass} ${className}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      style={isIcon ? undefined : sizeStyles[size]}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" />
          {!isIcon && children}
        </>
      ) : isIcon ? (
        Icon && <Icon size={16} aria-hidden="true" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon size={iconSize} aria-hidden="true" />
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            <Icon size={iconSize} aria-hidden="true" />
          )}
        </>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
