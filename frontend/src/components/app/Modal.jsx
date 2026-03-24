import PropTypes from 'prop-types'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

const sizeMap = {
  sm: '400px',
  md: 'var(--modal-max-width)',
  lg: '720px',
}

function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const maxWidth = sizeMap[size] || sizeMap.md

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-content"
          style={{ maxWidth }}
          aria-describedby={undefined}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-5)',
            }}
          >
            {title && (
              <Dialog.Title asChild>
                <h2
                  style={{
                    fontSize: 'var(--font-size-h1)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {title}
                </h2>
              </Dialog.Title>
            )}
            <Dialog.Close asChild>
              <button
                className="btn btn-icon"
                aria-label="Cerrar modal"
                style={{ marginLeft: 'auto' }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div>{children}</div>

          {/* Footer */}
          {footer && <div className="modal-footer">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

Modal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
}

export default Modal
