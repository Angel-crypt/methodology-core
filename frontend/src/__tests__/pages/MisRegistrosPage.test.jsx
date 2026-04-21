/**
 * Tests de MisRegistrosPage — historial de aplicaciones del aplicador.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import MisRegistrosPage from '@/pages/MisRegistrosPage'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token', role: 'applicator' }),
  AuthProvider: ({ children }) => children,
}))

const MOCK_REGISTRO = {
  application_id: 'app-1',
  anonymous_code: 'S-001',
  instrument_name: 'Instrumento A',
  application_date: '2026-04-10',
  notes: null,
  project_id: 'proj-1',
  project_name: 'Estudio Piloto',
  values_count: 3,
  metric_values: [
    { metric_id: 'met-1', metric_name: 'Edad', metric_type: 'numeric', value: 8 },
    { metric_id: 'met-2', metric_name: 'Activo', metric_type: 'boolean', value: true },
    { metric_id: 'met-3', metric_name: 'Nivel', metric_type: 'categorical', value: 'Alto' },
  ],
}

const MOCK_META = { total: 1, page: 1, page_size: 20, pages: 1 }

function renderPage() {
  return render(<MemoryRouter><MisRegistrosPage /></MemoryRouter>)
}

describe('MisRegistrosPage — carga de datos', () => {
  it('muestra registros al cargar', async () => {
    server.use(
      http.get('/api/v1/applications/my', () =>
        HttpResponse.json({ status: 'success', data: [MOCK_REGISTRO], meta: MOCK_META })
      )
    )
    renderPage()
    // El instrumento aparece en el filtro (option) y en la fila — verificamos con getAllByText
    const matches = await screen.findAllByText('Instrumento A')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('S-001').length).toBeGreaterThan(0)
  })

  it('muestra estado vacío cuando no hay registros', async () => {
    server.use(
      http.get('/api/v1/applications/my', () =>
        HttpResponse.json({ status: 'success', data: [], meta: { total: 0, page: 1, page_size: 20, pages: 1 } })
      )
    )
    renderPage()
    expect(await screen.findByText(/sin registros/i)).toBeInTheDocument()
  })

  it('muestra toast de error si la carga falla', async () => {
    server.use(
      http.get('/api/v1/applications/my', () =>
        HttpResponse.json({ message: 'Error interno', data: null }, { status: 500 })
      )
    )
    renderPage()
    // Toast tiene título "Error" y mensaje — verificamos que aparece el mensaje del servidor
    expect(await screen.findByText('Error interno')).toBeInTheDocument()
  })
})

describe('MisRegistrosPage — expansión de fila', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/v1/applications/my', () =>
        HttpResponse.json({ status: 'success', data: [MOCK_REGISTRO], meta: MOCK_META })
      )
    )
  })

  it('expande fila y muestra valores de métrica', async () => {
    const user = userEvent.setup()
    renderPage()
    // El instrumento aparece como texto en el botón de fila — tomamos el span, no el option
    const spans = await screen.findAllByText('Instrumento A')
    const rowButton = spans.find((el) => el.closest('button'))?.closest('button')
    expect(rowButton).toBeTruthy()
    await user.click(rowButton)
    expect(await screen.findByText('Edad')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Sí')).toBeInTheDocument()
    expect(screen.getByText('Alto')).toBeInTheDocument()
  })
})

describe('MisRegistrosPage — paginación', () => {
  it('muestra número de página correcta', async () => {
    server.use(
      http.get('/api/v1/applications/my', () =>
        HttpResponse.json({ status: 'success', data: [MOCK_REGISTRO], meta: { total: 1, page: 1, page_size: 20, pages: 1 } })
      )
    )
    renderPage()
    expect(await screen.findByText(/página 1 de 1/i)).toBeInTheDocument()
  })

  it('botón Anterior deshabilitado en primera página', async () => {
    server.use(
      http.get('/api/v1/applications/my', () =>
        HttpResponse.json({ status: 'success', data: [MOCK_REGISTRO], meta: MOCK_META })
      )
    )
    renderPage()
    await screen.findAllByText('Instrumento A')
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })

  it('botón Siguiente deshabilitado en última página', async () => {
    server.use(
      http.get('/api/v1/applications/my', () =>
        HttpResponse.json({ status: 'success', data: [MOCK_REGISTRO], meta: MOCK_META })
      )
    )
    renderPage()
    await screen.findAllByText('Instrumento A')
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled()
  })
})
