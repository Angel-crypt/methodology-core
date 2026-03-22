import { Loader2 } from 'lucide-react'

/**
 * Spinner — animated loading indicator
 * Props: size (16|20|24), color ('primary'|'current')
 */
function Spinner({ size = 16, color = 'primary' }) {
  const colorStyle =
    color === 'primary'
      ? { color: 'var(--color-primary)' }
      : { color: 'currentColor' }

  return (
    <Loader2
      size={size}
      className="animate-spin"
      style={colorStyle}
      aria-hidden="true"
    />
  )
}

export default Spinner
