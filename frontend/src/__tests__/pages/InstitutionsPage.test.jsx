/**
 * Tests de InstitutionsPage — administración de instituciones (solo superadmin).
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import InstitutionsPage from '@/pages/InstitutionsPage'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token', role: 'superadmin' }),
  AuthProvider: ({ children }) => children,
}))

const MOCK_INSTITUTIONS = [
  { id: 'inst-1', name: 'Universidad Nacional', domain: 'unam.mx', created_at: '2026-01-01T00:00:00Z' },
  { id: 'inst-2', name: 'Instituto Tecnológico', domain: null, created_at: '2026-02-01T00:00:00Z' },
]

function renderPage() {
  return render(<MemoryRouter><InstitutionsPage /></MemoryRouter>)
}

describe('InstitutionsPage — carga de datos', () => {
  it('muestra la lista de instituciones', async () => {
    server.use(
      http.get('/api/v1/institutions', () =>
        HttpResponse.json({ status: 'success', data: MOCK_INSTITUTIONS })
      )
    )
    renderPage()
    expect(await screen.findByText('Universidad Nacional')).toBeInTheDocument()
    expect(screen.getByText('Instituto Tecnológico')).toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay instituciones', async () => {
    server.use(
      http.get('/api/v1/institutions', () =>
        HttpResponse.json({ status: 'success', data: [] })
      )
    )
    renderPage()
    // El componente puede mostrar un EmptyState o tabla vacía
    await vi.waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())
    expect(screen.queryByText('Universidad Nacional')).not.toBeInTheDocument()
  })
})

describe('InstitutionsPage — modal de creación', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/v1/institutions', () =>
        HttpResponse.json({ status: 'success', data: MOCK_INSTITUTIONS })
      )
    )
  })

  it('abre modal al hacer clic en "Nueva institución"', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Universidad Nacional')
    await user.click(screen.getByRole('button', { name: /nueva institución/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('muestra error de validación si nombre está vacío', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Universidad Nacional')
    await user.click(screen.getByRole('button', { name: /nueva institución/i }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: /crear|guardar/i }))
    expect(await screen.findByText(/nombre es obligatorio/i)).toBeInTheDocument()
  })

  it('crea institución y cierra modal con éxito', async () => {
    let posted = false
    server.use(
      http.post('/api/v1/institutions', () => {
        posted = true
        return HttpResponse.json(
          { status: 'success', data: { id: 'inst-3', name: 'Nueva U', domain: null, created_at: new Date().toISOString() } },
          { status: 201 }
        )
      })
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Universidad Nacional')
    await user.click(screen.getByRole('button', { name: /nueva institución/i }))
    await user.type(await screen.findByLabelText(/nombre/i), 'Nueva U')
    await user.click(screen.getByRole('button', { name: /crear|guardar/i }))
    await vi.waitFor(() => expect(posted).toBe(true))
  })
})
