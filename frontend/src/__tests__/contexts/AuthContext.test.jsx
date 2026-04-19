/**
 * Tests de AuthContext — proveedor global de autenticación.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

// JWT mínimo con payload {"role":"superadmin"} decodeable por atob()
// eyJyb2xlIjoic3VwZXJhZG1pbiJ9 = base64url de {"role":"superadmin"}
const FAKE_SUPERADMIN_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic3VwZXJhZG1pbiJ9.sig'

function Spy() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="token">{auth.token}</span>
      <span data-testid="role">{auth.role ?? 'null'}</span>
      <span data-testid="mcp">{String(auth.mustChangePassword)}</span>
      <button onClick={() => auth.login(FAKE_SUPERADMIN_JWT, false)}>Login</button>
      <button onClick={() => auth.login(FAKE_SUPERADMIN_JWT, true)}>LoginForced</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('expone token vacío y role null por defecto', () => {
    render(<AuthProvider><Spy /></AuthProvider>)
    expect(screen.getByTestId('token').textContent).toBe('')
    expect(screen.getByTestId('role').textContent).toBe('null')
  })

  it('login() actualiza token y extrae role del JWT', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><Spy /></AuthProvider>)

    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(screen.getByTestId('token').textContent).toBe(FAKE_SUPERADMIN_JWT)
    expect(screen.getByTestId('role').textContent).toBe('superadmin')
    expect(screen.getByTestId('mcp').textContent).toBe('false')
  })

  it('login() con mustChange=true actualiza mustChangePassword', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><Spy /></AuthProvider>)

    await user.click(screen.getByRole('button', { name: 'LoginForced' }))

    expect(screen.getByTestId('mcp').textContent).toBe('true')
  })

  it('login() persiste access_token en sessionStorage', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><Spy /></AuthProvider>)

    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(sessionStorage.getItem('access_token')).toBe(FAKE_SUPERADMIN_JWT)
    expect(sessionStorage.getItem('role')).toBe('superadmin')
  })

  it('logout() limpia el estado y sessionStorage', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><Spy /></AuthProvider>)

    await user.click(screen.getByRole('button', { name: 'Login' }))
    await user.click(screen.getByRole('button', { name: 'Logout' }))

    expect(screen.getByTestId('token').textContent).toBe('')
    expect(screen.getByTestId('role').textContent).toBe('null')
    expect(sessionStorage.getItem('access_token')).toBeNull()
  })

  it('restaura sesión desde sessionStorage al montar', () => {
    sessionStorage.setItem('access_token', FAKE_SUPERADMIN_JWT)
    sessionStorage.setItem('role', 'researcher')

    render(<AuthProvider><Spy /></AuthProvider>)

    expect(screen.getByTestId('token').textContent).toBe(FAKE_SUPERADMIN_JWT)
    expect(screen.getByTestId('role').textContent).toBe('researcher')
  })

  it('useAuth() fuera del Provider lanza error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Spy />)).toThrow()
    consoleError.mockRestore()
  })
})
