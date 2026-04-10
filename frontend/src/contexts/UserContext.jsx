/**
 * UserContext — perfil completo del usuario autenticado.
 * Se carga automáticamente tras el login via GET /users/me.
 * Expone: user (perfil completo), loadingUser, reloadUser()
 *
 * Separado de AuthContext para que los cambios de perfil (full_name, email)
 * se reflejen sin requerir un nuevo JWT.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from './AuthContext'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const { token } = useAuth()
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(false)

  const reloadUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      return
    }
    setLoadingUser(true)
    try {
      const res = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setUser(json.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoadingUser(false)
    }
  }, [token])

  useEffect(() => {
    reloadUser()
  }, [reloadUser])

  return (
    <UserContext.Provider value={{ user, loadingUser, reloadUser }}>
      {children}
    </UserContext.Provider>
  )
}

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser debe usarse dentro de UserProvider')
  return ctx
}
