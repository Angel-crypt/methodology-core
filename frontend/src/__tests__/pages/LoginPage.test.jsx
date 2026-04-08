/**
 * Tests de LoginPage.
 *
 * Cubre:
 *   - El DOM no expone credenciales literales (admin@mock.local, Admin123, etc.).
 *   - El callback onLogin recibe (token, mustChangePassword: boolean) tras un
 *     login exitoso, propagando el flag tal como lo devuelve el servidor.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import LoginPage from '@/pages/LoginPage'

const noop = () => {}

describe('LoginPage — sin credenciales literales en el DOM', () => {
  it('no muestra texto "Admin123" en el DOM en ningún entorno', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.queryByText(/Admin123/)).toBeNull()
  })

  it('no muestra texto "admin@mock.local" en el DOM', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.queryByText(/admin@mock\.local/)).toBeNull()
  })

  it('no muestra texto "DEMO_EMAIL" ni "DEMO_PASSWORD" como texto literal', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.queryByText(/DEMO_EMAIL/)).toBeNull()
    expect(screen.queryByText(/DEMO_PASSWORD/)).toBeNull()
  })
})

describe('LoginPage — propagación de must_change_password', () => {
  it('llama a onLogin(token, true) cuando el servidor responde must_change_password=true', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({
          status: 'success',
          data: {
            access_token: 'tk-pendiente',
            token_type: 'Bearer',
            expires_in: 3600,
            must_change_password: true,
          },
        })
      )
    )
    const onLogin = vi.fn()
    const user = userEvent.setup()
    render(<LoginPage onLogin={onLogin} />)

    await user.type(screen.getByLabelText(/correo/i), 'pendiente@test.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1!')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|entrar|ingresar/i }))

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalled())
    expect(onLogin).toHaveBeenCalledWith('tk-pendiente', true)
  })

  it('llama a onLogin(token, false) cuando el servidor responde must_change_password=false', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({
          status: 'success',
          data: {
            access_token: 'tk-normal',
            token_type: 'Bearer',
            expires_in: 3600,
            must_change_password: false,
          },
        })
      )
    )
    const onLogin = vi.fn()
    const user = userEvent.setup()
    render(<LoginPage onLogin={onLogin} />)

    await user.type(screen.getByLabelText(/correo/i), 'normal@test.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1!')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|entrar|ingresar/i }))

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalled())
    expect(onLogin).toHaveBeenCalledWith('tk-normal', false)
  })

  it('llama a onLogin con false cuando el servidor omite must_change_password (defensivo)', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({
          status: 'success',
          data: {
            access_token: 'tk-legacy',
            token_type: 'Bearer',
            expires_in: 3600,
          },
        })
      )
    )
    const onLogin = vi.fn()
    const user = userEvent.setup()
    render(<LoginPage onLogin={onLogin} />)

    await user.type(screen.getByLabelText(/correo/i), 'legacy@test.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1!')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|entrar|ingresar/i }))

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalled())
    expect(onLogin).toHaveBeenCalledWith('tk-legacy', false)
  })
})
