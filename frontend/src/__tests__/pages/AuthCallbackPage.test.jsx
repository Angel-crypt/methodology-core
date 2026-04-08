/**
 * Tests de AuthCallbackPage — procesamiento del callback de Google OIDC.
 * Al montar, toma el code y state de la URL y llama al backend.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import AuthCallbackPage from '@/pages/AuthCallbackPage'

function renderCallback(search = '?code=MOCK_CODE&state=xyz', onLogin = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage onLogin={onLogin} />} />
        <Route path="/instruments" element={<div>Instruments</div>} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AuthCallbackPage — callback OIDC exitoso', () => {
  it('llama a onLogin con el token y redirige a /instruments', async () => {
    server.use(
      http.post('/api/v1/auth/oidc/callback', () =>
        HttpResponse.json({
          status: 'success',
          data: {
            access_token: 'oidc-token',
            must_change_password: false,
          },
        })
      )
    )
    const onLogin = vi.fn()
    renderCallback('?code=MOCK_CODE&state=xyz', onLogin)

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledWith('oidc-token', false))
    await screen.findByText('Instruments')
  })
})

describe('AuthCallbackPage — callback OIDC fallido', () => {
  it('redirige a /login con mensaje de error ante 401', async () => {
    server.use(
      http.post('/api/v1/auth/oidc/callback', () =>
        HttpResponse.json({ status: 'error' }, { status: 401 })
      )
    )
    renderCallback()

    await screen.findByText('Login')
  })

  it('muestra estado de carga mientras espera la respuesta', () => {
    server.use(
      http.post('/api/v1/auth/oidc/callback', async () => {
        await new Promise(() => {})
      })
    )
    renderCallback()

    expect(screen.getByText(/verificando|procesando/i)).toBeInTheDocument()
  })
})
