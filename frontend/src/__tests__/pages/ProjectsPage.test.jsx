/**
 * Tests de ProjectsPage (CF-013)
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import ProjectsPage from '@/pages/ProjectsPage'

// Contexto mínimo de auth
const AUTH = { token: 'mock-token', role: 'superadmin', mustChangePassword: false, login: vi.fn(), logout: vi.fn() }
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => AUTH,
  AuthProvider: ({ children }) => children,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>
  )
}

describe('ProjectsPage', () => {
  it('carga y muestra lista de proyectos', async () => {
    renderPage()
    expect(await screen.findByText('Estudio Piloto 2026')).toBeInTheDocument()
    expect(screen.getByText('Cohorte B')).toBeInTheDocument()
  })

  it('sin proyectos → mensaje vacío', async () => {
    server.use(
      http.get('/api/v1/projects', () =>
        HttpResponse.json({ status: 'success', data: [] })
      )
    )
    renderPage()
<<<<<<< HEAD
    expect(await screen.findByText(/Sin proyectos registrados/i)).toBeInTheDocument()
=======
    expect(await screen.findByText(/No hay proyectos registrados/i)).toBeInTheDocument()
>>>>>>> 3a7630c009c6f33a2d92137b75d439562b99d0c1
  })

  it('botón "Nuevo proyecto" abre modal', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Estudio Piloto 2026')
    await user.click(screen.getByRole('button', { name: /nuevo proyecto/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument()
  })

  it('modal abre con configuración predeterminada ya seleccionada → botón Crear habilitado', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Estudio Piloto 2026')
    await user.click(screen.getByRole('button', { name: /nuevo proyecto/i }))
    await screen.findByRole('dialog')
    const createBtn = screen.getByRole('button', { name: /crear proyecto/i })
    expect(createBtn).not.toBeDisabled()
    expect(screen.getByRole('radio', { name: /predeterminada/i })).toBeChecked()
  })

  it('seleccionar defaults + nombre → POST /projects y aparece en lista', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/projects', () =>
        HttpResponse.json(
          { status: 'success', data: { id: 'proj-3', name: 'Test Proj', description: null, member_count: 0, instrument_count: 0, created_at: new Date().toISOString() } },
          { status: 201 }
        )
      )
    )
    renderPage()
    await screen.findByText('Estudio Piloto 2026')
    await user.click(screen.getByRole('button', { name: /nuevo proyecto/i }))
    await screen.findByRole('dialog')

    await user.type(screen.getByLabelText(/Nombre/i), 'Test Proj')
    await user.click(screen.getByLabelText(/Usar configuración predeterminada/i))
    await user.click(screen.getByRole('button', { name: /crear proyecto/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
<<<<<<< HEAD
    expect(await screen.findByText('Test Proj', { selector: 'span' })).toBeInTheDocument()
=======
    expect(await screen.findByRole('heading', { name: 'Test Proj' })).toBeInTheDocument()
>>>>>>> 3a7630c009c6f33a2d92137b75d439562b99d0c1
  })

  it('POST 400 → muestra error, modal no cierra', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/projects', () =>
        HttpResponse.json({ status: 'error', message: 'Error de validación', data: { code: 'VALIDATION_ERROR' } }, { status: 400 })
      )
    )
    renderPage()
    await screen.findByText('Estudio Piloto 2026')
    await user.click(screen.getByRole('button', { name: /nuevo proyecto/i }))
    await screen.findByRole('dialog')

    await user.type(screen.getByLabelText(/Nombre/i), 'X')
    await user.click(screen.getByLabelText(/Usar configuración predeterminada/i))
    await user.click(screen.getByRole('button', { name: /crear proyecto/i }))

    expect(await screen.findByText(/Error de validación/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
