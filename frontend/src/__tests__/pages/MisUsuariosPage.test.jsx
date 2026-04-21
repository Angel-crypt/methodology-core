/**
 * Tests de MisUsuariosPage - usuarios registrados por el aplicador.
 * El aplicador puede ver los sujetos que ha registrado y sus aplicaciones.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import MisUsuariosPage from '@/pages/MisUsuariosPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token', role: 'applicator' }),
  AuthProvider: ({ children }) => children,
}))

function renderPage() {
  return render(<MemoryRouter><MisUsuariosPage /></MemoryRouter>)
}

describe('MisUsuariosPage', () => {
  it('muestra título de la página', async () => {
    renderPage()
    expect(await screen.findByText(/mis usuarios/i)).toBeInTheDocument()
  })

  it('carga y muestra lista de usuarios registrados', async () => {
    server.use(
      http.get('/api/v1/subjects/mine', () =>
        HttpResponse.json({
          status: 'success',
          data: [
            { id: 'subj-1', anonymous_code: 'ABC123', context: { full_name: 'Juan Pérez' }, created_at: '2026-04-15T10:00:00Z' },
            { id: 'subj-2', anonymous_code: 'DEF456', context: { full_name: 'María García' }, created_at: '2026-04-16T14:30:00Z' },
          ],
        })
      )
    )
    renderPage()
    expect(await screen.findByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('DEF456')).toBeInTheDocument()
  })

  it('muestra mensaje cuando no hay usuarios registrados', async () => {
    server.use(
      http.get('/api/v1/subjects/mine', () =>
        HttpResponse.json({ status: 'success', data: [] })
      )
    )
    renderPage()
    expect(await screen.findByText('Sin usuarios registrados')).toBeInTheDocument()
  })

  it('al hacer clic en un usuario, muestra sus aplicaciones', async () => {
    server.use(
      http.get('/api/v1/subjects/mine', () =>
        HttpResponse.json({
          status: 'success',
          data: [
            { id: 'subj-1', anonymous_code: 'ABC123', context: { full_name: 'Juan Pérez' }, created_at: '2026-04-15T10:00:00Z' },
          ],
        })
      ),
      http.get('/api/v1/subjects/subj-1/applications', () =>
        HttpResponse.json({
          status: 'success',
          data: [
            { application_id: 'app-1', application_date: '2026-04-15', instrument_name: 'Instrumento A', values_count: 5 },
          ],
        })
      )
    )
    const user = userEvent.setup()
    renderPage()

    // Click en el usuario
    const usuario = await screen.findByText('ABC123')
    await user.click(usuario)

    // Verificar que muestra las aplicaciones del usuario (puede aparecer también en el filtro)
    const matches = await screen.findAllByText('Instrumento A')
    expect(matches.length).toBeGreaterThan(0)
  })
})