import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import PropTypes from 'prop-types'

/**
 * Tooltip — muestra un label al hover sobre cualquier hijo.
 * Requiere que un <TooltipPrimitive.Provider> exista en el árbol padre.
 *
 * Props:
 *   content   string — texto del tooltip
 *   children  ReactNode — elemento que dispara el tooltip
 *   disabled  boolean — si true, renderiza solo el children sin tooltip
 */
function Tooltip({ content, children, disabled = false }) {
  if (disabled || !content) return children

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <span style={{ display: 'block' }}>{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="tooltip-content"
          side="right"
          sideOffset={8}
        >
          {content}
          <TooltipPrimitive.Arrow className="tooltip-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

Tooltip.propTypes = {
  content:  PropTypes.string,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
}

export default Tooltip
