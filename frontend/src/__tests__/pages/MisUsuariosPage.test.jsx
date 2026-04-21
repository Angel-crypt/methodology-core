/**
 * Tests de MisUsuariosPage - usuarios registrados por el aplicador.
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

function appsHandler(apps) {
  return http.get('/api/v1/applications/my', () =>
    HttpResponse.json({
      status: 'success',
      data: apps,
      meta: { total: apps.length, page: 1, page_size: 200, pages: 1 },
    })
  )
}

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
            { id: 'subj-1', anonymous_code: 'ABC123', created_at: '2026-04-15T10:00:00Z' },
            { id: 'subj-2', anonymous_code: 'DEF456', created_at: '2026-04-16T14:30:00Z' },
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
          data: [{ id: 'subj-1', anonymous_code: 'ABC123', created_at: '2026-04-15T10:00:00Z' }],
        })
      ),
      appsHandler([
        { application_id: 'app-1', anonymous_code: 'ABC123', application_date: '2026-04-15', instrument_name: 'Instrumento A', values_count: 5, notes: null, metric_values: [] },
      ])
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('ABC123'))

    const matches = await screen.findAllByText('Instrumento A')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('expandir aplicación muestra notas y botón ver métricas', async () => {
    server.use(
      http.get('/api/v1/subjects/mine', () =>
        HttpResponse.json({
          status: 'success',
          data: [{ id: 'subj-1', anonymous_code: 'ABC123', created_at: '2026-04-15T10:00:00Z' }],
        })
      ),
      appsHandler([
        { application_id: 'app-1', anonymous_code: 'ABC123', application_date: '2026-04-15', instrument_name: 'Instrumento A', values_count: 3, notes: 'Sin novedades', metric_values: [] },
      ])
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('ABC123'))

    const filas = await screen.findAllByText('Instrumento A')
    const botonFila = filas.find((el) => el.closest('button'))?.closest('button')
    await user.click(botonFila)

    expect(await screen.findByText(/Sin novedades/)).toBeInTheDocument()
    expect(screen.getByText('Ver métricas completas')).toBeInTheDocument()
  })

  it('ver métricas completas abre modal con metric_values embebidos', async () => {
    server.use(
      http.get('/api/v1/subjects/mine', () =>
        HttpResponse.json({
          status: 'success',
          data: [{ id: 'subj-1', anonymous_code: 'ABC123', created_at: '2026-04-15T10:00:00Z' }],
        })
      ),
      appsHandler([
        {
          application_id: 'app-1', anonymous_code: 'ABC123', application_date: '2026-04-15',
          instrument_name: 'Instrumento A', values_count: 1, notes: null,
          metric_values: [{ metric_id: 'mv-1', metric_name: 'Puntaje total', metric_type: 'numeric', value: '88' }],
        },
      ])
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('ABC123'))

    const filas = await screen.findAllByText('Instrumento A')
    const botonFila = filas.find((el) => el.closest('button'))?.closest('button')
    await user.click(botonFila)

    await user.click(await screen.findByText('Ver métricas completas'))

    expect(await screen.findByText('Puntaje total')).toBeInTheDocument()
    expect(screen.getByText('88')).toBeInTheDocument()
  })
})
