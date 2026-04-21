/**
 * Tests de TermsPage — pantalla de T&C obligatoria para researcher/applicator.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import TermsPage from '@/pages/TermsPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token' }),
  AuthProvider: ({ children }) => children,
}))

vi.mock('@/contexts/UserContext', () => ({
  useUser: () => ({ reloadUser: vi.fn().mockResolvedValue(undefined) }),
  UserProvider: ({ children }) => children,
}))

function renderPage() {
  return render(<MemoryRouter><TermsPage /></MemoryRouter>)
}

describe('TermsPage — estructura', () => {
  it('renderiza encabezado "Términos y Condiciones"', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /términos y condiciones/i })).toBeInTheDocument()
  })

  it('muestra botón de aceptación', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /acepto/i })).toBeInTheDocument()
  })
})

describe('TermsPage — carga de contenido', () => {
  it('muestra el texto de T&C cargado desde la API', async () => {
    server.use(
      http.get('/api/v1/legal/terms', () =>
        HttpResponse.json({ status: 'success', data: { content: 'Texto de prueba de términos.' } })
      )
    )
    renderPage()
    expect(await screen.findByText('Texto de prueba de términos.')).toBeInTheDocument()
  })
})

describe('TermsPage — flujo de aceptación', () => {
  it('al aceptar llama a POST /users/me/accept-terms y navega a /onboarding', async () => {
    const user = userEvent.setup()
    let posted = false
    server.use(
      http.post('/api/v1/users/me/accept-terms', () => {
        posted = true
        return HttpResponse.json({ status: 'success', data: { terms_accepted_at: new Date().toISOString() } })
      })
    )
    renderPage()
    await user.click(await screen.findByRole('button', { name: /acepto/i }))
    await vi.waitFor(() => expect(posted).toBe(true))
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true })
  })

  it('muestra error si el POST falla', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/users/me/accept-terms', () =>
        HttpResponse.json({ status: 'error', message: 'Error interno' }, { status: 500 })
      )
    )
    renderPage()
    await user.click(await screen.findByRole('button', { name: /acepto/i }))
    expect(await screen.findByText(/error/i)).toBeInTheDocument()
  })
})
