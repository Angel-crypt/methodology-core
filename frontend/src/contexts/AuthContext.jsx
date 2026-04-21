/**
 * AuthContext — estado global de autenticación.
 * Expone: token, role, mustChangePassword, login(), logout()
 * Persistencia: sessionStorage (access_token, role, must_change_password)
 *
 * SESSION_REVOKED: cualquier módulo puede despachar el evento
 * 'auth:session-revoked' en window para forzar el cierre de sesión.
 * Esto ocurre cuando el superadmin aprueba un cambio de correo y el
 * token_version del usuario incrementa, invalidando su JWT actual.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'

const AuthContext = createContext(null)

function decodeRole(tk) {
  try {
    return JSON.parse(atob(tk.split('.')[1])).role || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem('access_token') || ''
  )
  const [role, setRole] = useState(
    () => sessionStorage.getItem('role') || null
  )
  const [mustChangePassword, setMustChangePassword] = useState(
    () => sessionStorage.getItem('must_change_password') === 'true'
  )

  const login = useCallback((tk, mustChange = false) => {
    const userRole = decodeRole(tk)
    sessionStorage.setItem('access_token', tk)
    if (userRole) sessionStorage.setItem('role', userRole)
    if (mustChange) {
      sessionStorage.setItem('must_change_password', 'true')
    } else {
      sessionStorage.removeItem('must_change_password')
    }
    setToken(tk)
    setRole(userRole)
    setMustChangePassword(mustChange)
  }, [])

  const logout = useCallback(async (reason) => {
    if (!token) return
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // best effort — cierra sesión local aunque falle la revocación
    }
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('must_change_password')
    if (reason === 'session_revoked') {
      sessionStorage.setItem('login_message', 'Tu sesión fue cerrada porque tu correo fue actualizado. Iniciá sesión nuevamente.')
    } else if (reason === 'session_expired') {
      sessionStorage.setItem('login_message', 'Tu sesión expiró. Iniciá sesión nuevamente.')
    }
    setToken('')
    setRole(null)
    setMustChangePassword(false)
  }, [token])

  // Sesión revocada: correo cambiado por superadmin, token invalidado.
  useEffect(() => {
    function handleRevoked() { logout('session_revoked') }
    window.addEventListener('auth:session-revoked', handleRevoked)
    return () => window.removeEventListener('auth:session-revoked', handleRevoked)
  }, [logout])

  // Sesión expirada: cualquier 401 de endpoint autenticado (token vencido).
  useEffect(() => {
    function handleExpired() { logout('session_expired') }
    window.addEventListener('auth:session-expired', handleExpired)
    return () => window.removeEventListener('auth:session-expired', handleExpired)
  }, [logout])

  return (
    <AuthContext.Provider value={{ token, role, mustChangePassword, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
