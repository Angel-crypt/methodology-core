/**
 * Tests de DetalleUsuarioPage — detalle compartido para investigadores y aplicadores.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import DetalleUsuarioPage from '@/pages/DetalleUsuarioPage'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token', role: 'superadmin' }),
  AuthProvider: ({ children }) => children,
}))

const MOCK_USER = {
  id: 'user-app-1',
  full_name: 'Ana García',
  email: 'ana@mock.local',
  role: 'applicator',
  active: true,
  must_change_password: false,
  institution: 'Universidad Test',
  created_at: '2026-01-15T00:00:00Z',
  updated_at: null,
}

const MOCK_PROJECTS = [
  { id: 'proj-1', name: 'Proyecto Alpha', user_role: 'applicator' },
]

function renderPage(props = {}) {
  return render(
    <MemoryRouter initialEntries={[`/usuarios/aplicadores/${MOCK_USER.id}`]}>
      <Routes>
        <Route
          path="/usuarios/aplicadores/:id"
          element={<DetalleUsuarioPage backTo="/usuarios/aplicadores" backLabel="Aplicadores" {...props} />}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('DetalleUsuarioPage — carga de datos', () => {
  beforeEach(() => {
    server.use(
      http.get(`/api/v1/users/${MOCK_USER.id}`, () =>
        HttpResponse.json({ status: 'success', data: MOCK_USER })
      ),
      http.get(`/api/v1/users/${MOCK_USER.id}/sessions`, () =>
        HttpResponse.json({ status: 'success', data: [] })
      ),
      http.get('/api/v1/projects', () =>
        HttpResponse.json({ status: 'success', data: MOCK_PROJECTS })
      )
    )
  })

  it('muestra el nombre del usuario', async () => {
    renderPage()
    expect(await screen.findByText('Ana García')).toBeInTheDocument()
  })

  it('muestra el correo electrónico', async () => {
    renderPage()
    expect(await screen.findByText('ana@mock.local')).toBeInTheDocument()
  })

  it('muestra proyectos asignados', async () => {
    renderPage()
    expect(await screen.findByText('Proyecto Alpha')).toBeInTheDocument()
  })
})

describe('DetalleUsuarioPage — acciones', () => {
  beforeEach(() => {
    server.use(
      http.get(`/api/v1/users/${MOCK_USER.id}`, () =>
        HttpResponse.json({ status: 'success', data: MOCK_USER })
      ),
      http.get(`/api/v1/users/${MOCK_USER.id}/sessions`, () =>
        HttpResponse.json({ status: 'success', data: [] })
      ),
      http.get('/api/v1/projects', () =>
        HttpResponse.json({ status: 'success', data: MOCK_PROJECTS })
      )
    )
  })

  it('desactivar usuario llama a PATCH /users/:id/status', async () => {
    let patched = false
    server.use(
      http.patch(`/api/v1/users/${MOCK_USER.id}/status`, () => {
        patched = true
        return HttpResponse.json({ status: 'success', data: null })
      })
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana García')
    const btn = screen.getByRole('button', { name: /desactivar/i })
    await user.click(btn)
    await vi.waitFor(() => expect(patched).toBe(true))
  })
})
