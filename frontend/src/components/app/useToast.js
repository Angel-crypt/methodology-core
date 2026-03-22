import { useState, useCallback, useRef } from 'react'

/**
 * useToast — simple toast notification system
 * Returns: { toasts, toast, dismiss }
 *
 * toast({ type, title, message, duration })
 *   type: 'success'|'error'|'warning'|'info'
 *   duration: ms before auto-dismiss (0 = no auto-dismiss, default for errors)
 */

let nextId = 1

export function useToast() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
  }, [])

  const toast = useCallback(
    ({ type = 'info', title, message, duration }) => {
      const id = nextId++
      const autoDismissDuration =
        duration !== undefined
          ? duration
          : type === 'error'
          ? 0
          : 4000

      setToasts((prev) => [...prev, { id, type, title, message }])

      if (autoDismissDuration > 0) {
        timersRef.current[id] = setTimeout(() => {
          dismiss(id)
        }, autoDismissDuration)
      }

      return id
    },
    [dismiss]
  )

  return { toasts, toast, dismiss }
}
