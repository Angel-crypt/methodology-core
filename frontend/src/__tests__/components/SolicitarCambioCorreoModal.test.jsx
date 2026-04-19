/**
 * Tests de SolicitarCambioCorreoModal — modal de solicitud de cambio de correo.
 * El usuario no puede cambiar su correo directamente; solo puede solicitar el cambio.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { AuthProvider } from '@/contexts/AuthContext'
import SolicitarCambioCorreoModal from '@/components/SolicitarCambioCorreoModal'

function renderModal(props = {}) {
  return render(
    <AuthProvider>
      <SolicitarCambioCorreoModal open={true} onClose={vi.fn()} {...props} />
    </AuthProvider>
  )
}

describe('SolicitarCambioCorreoModal — estructura', () => {
  it('renderiza el campo "Nuevo correo electrónico"', () => {
    renderModal()
    expect(screen.getByLabelText(/nuevo correo/i)).toBeInTheDocument()
  })

  it('renderiza un campo opcional de motivo', () => {
    renderModal()
    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument()
  })

  it('muestra mensaje aclaratorio sobre revisión del administrador', () => {
    renderModal()
    expect(screen.getByText(/administrador/i)).toBeInTheDocument()
  })
})

describe('SolicitarCambioCorreoModal — comportamiento', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('no llama al API si el correo tiene formato inválido', async () => {
    let called = false
    server.use(
      http.post('/api/v1/users/me/email-change-request', () => {
        called = true
        return HttpResponse.json({ status: 'success' }, { status: 201 })
      })
    )
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/nuevo correo/i), 'no-es-email')
    await user.click(screen.getByRole('button', { name: /enviar|solicitar/i }))

    expect(called).toBe(false)
    expect(screen.getByText(/formato|inválido/i)).toBeInTheDocument()
  })

  it('llama al API y muestra mensaje de éxito con correo válido', async () => {
    server.use(
      http.post('/api/v1/users/me/email-change-request', () =>
        HttpResponse.json({
          status: 'success',
          message: 'Solicitud enviada. El administrador la revisará.',
          data: { id: 'req-1' },
        }, { status: 201 })
      )
    )
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/nuevo correo/i), 'nuevo@dominio.com')
    await user.click(screen.getByRole('button', { name: /enviar|solicitar/i }))

    await screen.findByText(/solicitud enviada|administrador la revisará/i)
  })

  it('muestra error específico ante 409 PENDING_REQUEST_EXISTS', async () => {
    server.use(
      http.post('/api/v1/users/me/email-change-request', () =>
        HttpResponse.json({ status: 'error', data: { code: 'PENDING_REQUEST_EXISTS' } }, { status: 409 })
      )
    )
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/nuevo correo/i), 'x@x.com')
    await user.click(screen.getByRole('button', { name: /enviar|solicitar/i }))

    await screen.findByText(/solicitud pendiente/i)
  })

  it('muestra error específico ante 409 EMAIL_ALREADY_EXISTS', async () => {
    server.use(
      http.post('/api/v1/users/me/email-change-request', () =>
        HttpResponse.json({ status: 'error', data: { code: 'EMAIL_ALREADY_EXISTS' } }, { status: 409 })
      )
    )
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/nuevo correo/i), 'taken@x.com')
    await user.click(screen.getByRole('button', { name: /enviar|solicitar/i }))

    await screen.findByText(/ya está registrado/i)
  })
})
