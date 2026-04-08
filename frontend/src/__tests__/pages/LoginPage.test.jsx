/**
 * Tests de LoginPage — inicio de sesión con Google (OIDC).
 * LoginPage solo muestra el botón de Google; no tiene inputs de email/password.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/pages/LoginPage'

const noop = () => {}

describe('LoginPage — estructura del DOM', () => {
  it('muestra el botón "Iniciar sesión con Google"', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.getByRole('button', { name: /iniciar sesión con google/i })).toBeInTheDocument()
  })

  it('muestra texto de ayuda sobre cuentas invitadas', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.getByText(/invitad/i)).toBeInTheDocument()
  })

  it('no renderiza input de correo ni contraseña', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.queryByLabelText(/correo/i)).toBeNull()
    expect(screen.queryByLabelText(/contraseña/i)).toBeNull()
  })

  it('no expone textos de credenciales literales en el DOM', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.queryByText(/Admin123/)).toBeNull()
    expect(screen.queryByText(/admin@mock\.local/)).toBeNull()
    expect(screen.queryByText(/super@methodology\.local/)).toBeNull()
    expect(screen.queryByText(/__sys-auth/)).toBeNull()
  })
})

describe('LoginPage — comportamiento del botón Google', () => {
  let originalLocation

  beforeEach(() => {
    originalLocation = window.location
    delete window.location
    window.location = { href: '' }
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('al hacer click redirige al endpoint OIDC authorize', async () => {
    const user = userEvent.setup()
    render(<LoginPage onLogin={noop} />)

    await user.click(screen.getByRole('button', { name: /iniciar sesión con google/i }))

    expect(window.location.href).toMatch(/\/api\/v1\/auth\/oidc\/authorize/)
  })

  it('incluye redirect_uri en la URL del authorize', async () => {
    const user = userEvent.setup()
    render(<LoginPage onLogin={noop} />)

    await user.click(screen.getByRole('button', { name: /iniciar sesión con google/i }))

    expect(window.location.href).toMatch(/redirect_uri=/)
  })
})
