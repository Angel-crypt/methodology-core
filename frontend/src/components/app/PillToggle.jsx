import PropTypes from 'prop-types'

/**
 * PillToggle — Pill-shaped toggle button for filter groups
 *
 * Use when you need a set of mutually exclusive options displayed
 * as pill-shaped toggles (e.g., status filters: All / Active / Inactive).
 *
 * Props:
 *   selected    boolean       — whether this pill is currently active
 *   children    ReactNode     — label text
 *   disabled    boolean       — disables the button
 *   className   string        — additional CSS classes
 *   ...props    HTMLButton    — forwarded to the underlying <button>
 */

function PillToggle({ selected = false, disabled = false, children, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 'var(--space-1) var(--space-3)',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid',
        fontSize: 'var(--font-size-small)',
        lineHeight: 'var(--line-height-tight)',
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
        backgroundColor: selected ? 'var(--color-primary-light)' : 'var(--color-surface)',
        color: selected
          ? 'var(--color-primary-dark)'
          : disabled
            ? 'var(--color-text-tertiary)'
            : 'var(--color-text-secondary)',
        fontWeight: selected ? 'var(--font-weight-medium)' : 'var(--font-weight-regular)',
        opacity: disabled ? 0.6 : 1,
      }}
      {...props}
    >
      {children}
    </button>
  )
}

PillToggle.propTypes = {
  selected: PropTypes.bool,
  disabled: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
}

export default PillToggle
