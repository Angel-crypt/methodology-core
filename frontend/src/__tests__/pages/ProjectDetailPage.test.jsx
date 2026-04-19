/**
 * Tests de ProjectDetailPage (CF-013)
 */
<<<<<<< HEAD
import { render, screen } from '@testing-library/react'
=======
import { render, screen, waitFor } from '@testing-library/react'
>>>>>>> 3a7630c009c6f33a2d92137b75d439562b99d0c1
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import ProjectDetailPage from '@/pages/ProjectDetailPage'

const AUTH = { token: 'mock-token', role: 'superadmin', mustChangePassword: false }
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => AUTH,
  AuthProvider: ({ children }) => children,
}))

function renderPage(id = 'proj-1') {
  return render(
    <MemoryRouter initialEntries={[`/proyectos/${id}`]}>
      <Routes>
        <Route path="/proyectos/:id" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProjectDetailPage — Tab General', () => {
  it('carga y muestra nombre del proyecto en heading', async () => {
    renderPage()
    const headings = await screen.findAllByText('Estudio Piloto 2026')
    expect(headings.length).toBeGreaterThanOrEqual(1)
    expect(headings[0]).toBeInTheDocument()
  })

  it('404 → muestra alerta de error', async () => {
    server.use(
      http.get('/api/v1/projects/:id', () =>
        HttpResponse.json({ status: 'error', message: 'Proyecto no encontrado' }, { status: 404 })
      )
    )
    renderPage('no-existe')
    expect(await screen.findByText(/Proyecto no encontrado/i)).toBeInTheDocument()
  })
})

describe('ProjectDetailPage — Tab Miembros', () => {
  it('muestra lista de miembros al cambiar al tab', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/v1/projects/:id/members', () =>
        HttpResponse.json({ status: 'success', data: [
          { id: 'm-1', user_id: 'u-1', email: 'inv@test.com', full_name: 'Investigador', role: 'researcher', added_at: '2026-04-01T00:00:00Z' },
        ]})
      )
    )
    renderPage()
    await screen.findAllByText('Estudio Piloto 2026')
    await user.click(screen.getByRole('button', { name: /Miembros/i }))
    expect(await screen.findByText('inv@test.com')).toBeInTheDocument()
  })

  it('agregar miembro → POST /members', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/v1/projects/:id/members', () =>
        HttpResponse.json({ status: 'success', data: [] })
      ),
      http.get('/api/v1/users', () =>
        HttpResponse.json({ status: 'success', data: [
          { id: 'u-r', email: 'r@t.com', full_name: 'Inv', role: 'researcher', active: true },
        ]})
      ),
      http.post('/api/v1/projects/:id/members', () =>
        HttpResponse.json({ status: 'success', data: { id: 'm-new', user_id: 'u-r', role: 'researcher', email: 'r@t.com', full_name: 'Inv', added_at: new Date().toISOString() } }, { status: 201 })
      )
    )
    renderPage()
    await screen.findAllByText('Estudio Piloto 2026')
    await user.click(screen.getByRole('button', { name: /Miembros/i }))
<<<<<<< HEAD
    // buscar el usuario por correo en el combobox
    const searchInput = await screen.findByPlaceholderText(/Buscar usuario/i)
    await user.type(searchInput, 'r@t')
    const option = await screen.findByRole('option', { name: /r@t\.com/ })
    await user.click(option)
=======
    // esperar a que cargue la opción del usuario (buscar por email para no confundir con "Investigador")
    const option = await screen.findByRole('option', { name: /r@t\.com/ })
    await user.selectOptions(option.closest('select'), 'u-r')
>>>>>>> 3a7630c009c6f33a2d92137b75d439562b99d0c1
    await user.click(screen.getByRole('button', { name: /^Agregar$/i }))
    expect(await screen.findByText(/Miembro agregado/i)).toBeInTheDocument()
  })

  it('409 ALREADY_MEMBER → mensaje específico', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/v1/projects/:id/members', () =>
        HttpResponse.json({ status: 'success', data: [] })
      ),
      http.get('/api/v1/users', () =>
        HttpResponse.json({ status: 'success', data: [
          { id: 'u-r', email: 'r@t.com', full_name: 'Inv', role: 'researcher', active: true },
        ]})
      ),
      http.post('/api/v1/projects/:id/members', () =>
        HttpResponse.json({ status: 'error', message: 'Ya es miembro', data: { code: 'ALREADY_MEMBER' } }, { status: 409 })
      )
    )
    renderPage()
    await screen.findAllByText('Estudio Piloto 2026')
    await user.click(screen.getByRole('button', { name: /Miembros/i }))
<<<<<<< HEAD
    const searchInput = await screen.findByPlaceholderText(/Buscar usuario/i)
    await user.type(searchInput, 'r@t')
    const option = await screen.findByRole('option', { name: /r@t\.com/ })
    await user.click(option)
=======
    const option = await screen.findByRole('option', { name: /r@t\.com/ })
    await user.selectOptions(option.closest('select'), 'u-r')
>>>>>>> 3a7630c009c6f33a2d92137b75d439562b99d0c1
    await user.click(screen.getByRole('button', { name: /^Agregar$/i }))
    expect(await screen.findByText(/ya es miembro/i)).toBeInTheDocument()
  })
})

describe('ProjectDetailPage — Tab Configuración', () => {
  it('carga niveles educativos y guarda config al modificar el límite', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findAllByText('Estudio Piloto 2026')
    await user.click(screen.getByRole('button', { name: /Configuración/i }))
    // esperar que cargue la tabla con los niveles educativos
    expect(await screen.findByDisplayValue('Preescolar')).toBeInTheDocument()
    // modificar el límite y guardar
    const limitInput = screen.getByRole('spinbutton')
    await user.clear(limitInput)
    await user.type(limitInput, '30')
    await user.click(screen.getByRole('button', { name: /Guardar configuración/i }))
    expect(await screen.findByText(/Configuración guardada/i)).toBeInTheDocument()
  })
})
