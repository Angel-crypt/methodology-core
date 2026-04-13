/**
 * Tests de SystemLoginPage — login con email+password exclusivo para superadmin.
 * Ruta configurable vía VITE_SYSTEM_LOGIN_PATH (default /__sys-auth).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import SystemLoginPage from '@/pages/SystemLoginPage'

const noop = () => {}

describe('SystemLoginPage — estructura', () => {
  it('renderiza input de correo electrónico', () => {
    render(<SystemLoginPage onLogin={noop} />)
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument()
  })

  it('renderiza input de contraseña', () => {
    render(<SystemLoginPage onLogin={noop} />)
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
  })

  it('renderiza botón "Acceder al sistema"', () => {
    render(<SystemLoginPage onLogin={noop} />)
    expect(screen.getByRole('button', { name: /acceder al sistema/i })).toBeInTheDocument()
  })
})

describe('SystemLoginPage — flujo de autenticación', () => {
  it('llama a onLogin con token cuando el servidor responde 200 con role superadmin', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({
          status: 'success',
          data: {
            access_token: 'tk-superadmin',
            must_change_password: false,
            user: { role: 'superadmin' },
          },
        })
      )
    )
    const onLogin = vi.fn()
    const user = userEvent.setup()
    render(<SystemLoginPage onLogin={onLogin} />)

    await user.type(screen.getByLabelText(/correo/i), 'super@methodology.local')
    await user.type(screen.getByLabelText(/contraseña/i), 'clave-segura')
    await user.click(screen.getByRole('button', { name: /acceder al sistema/i }))

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalled())
    expect(onLogin).toHaveBeenCalledWith('tk-superadmin', false)
  })

  it('muestra error cuando el role no es superadmin', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({
          status: 'success',
          data: {
            access_token: 'tk-researcher',
            must_change_password: false,
            user: { role: 'researcher' },
          },
        })
      )
    )
    const user = userEvent.setup()
    render(<SystemLoginPage onLogin={noop} />)

    await user.type(screen.getByLabelText(/correo/i), 'inv@test.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'clave')
    await user.click(screen.getByRole('button', { name: /acceder al sistema/i }))

    await screen.findByText(/solo para administradores/i)
  })

  it('muestra mensaje genérico ante 401', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 })
      )
    )
    const user = userEvent.setup()
    render(<SystemLoginPage onLogin={noop} />)

    await user.type(screen.getByLabelText(/correo/i), 'x@x.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /acceder al sistema/i }))

    await screen.findByText(/credenciales inválidas/i)
  })

  it('propaga must_change_password=true al onLogin', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({
          status: 'success',
          data: {
            access_token: 'tk-forzado',
            must_change_password: true,
            user: { role: 'superadmin' },
          },
        })
      )
    )
    const onLogin = vi.fn()
    const user = userEvent.setup()
    render(<SystemLoginPage onLogin={onLogin} />)

    await user.type(screen.getByLabelText(/correo/i), 'super@methodology.local')
    await user.type(screen.getByLabelText(/contraseña/i), 'clave')
    await user.click(screen.getByRole('button', { name: /acceder al sistema/i }))

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalled())
    expect(onLogin).toHaveBeenCalledWith('tk-forzado', true)
  })
})
