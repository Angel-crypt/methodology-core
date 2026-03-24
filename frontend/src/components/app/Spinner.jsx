import PropTypes from 'prop-types'
import { Loader2 } from 'lucide-react'

/**
 * Spinner — animated loading indicator
 * Props: size (16|20|24), color ('primary'|'current'), label (accessible text)
 */
function Spinner({ size = 16, color = 'primary', label = 'Cargando...' }) {
  const colorStyle =
    color === 'primary'
      ? { color: 'var(--color-primary)' }
      : { color: 'currentColor' }

  return (
    <span role="status" aria-label={label}>
      <Loader2
        size={size}
        className="animate-spin"
        style={colorStyle}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

Spinner.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
  label: PropTypes.string,
}

export default Spinner
