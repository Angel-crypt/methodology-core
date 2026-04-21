/**
 * Tests de SuperadminProfileConfigPage — configuración de campos de onboarding.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import SuperadminProfileConfigPage from '@/pages/SuperadminProfileConfigPage'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token', role: 'superadmin' }),
  AuthProvider: ({ children }) => children,
}))

const MOCK_CONFIG = { require_phone: false, require_institution: true, require_terms: true }

function renderPage() {
  return render(<MemoryRouter><SuperadminProfileConfigPage /></MemoryRouter>)
}

describe('SuperadminProfileConfigPage — carga', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: MOCK_CONFIG })
      )
    )
  })

  it('muestra checkboxes de configuración', async () => {
    renderPage()
    expect(await screen.findByRole('checkbox', { name: /institución/i })).toBeInTheDocument()
  })

  it('refleja el estado inicial de la config', async () => {
    renderPage()
    const checkboxInst = await screen.findByRole('checkbox', { name: /institución/i })
    expect(checkboxInst).toBeChecked()
  })
})

describe('SuperadminProfileConfigPage — guardado', () => {
  it('llama PUT /superadmin/profile-config al guardar', async () => {
    let saved = false
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: MOCK_CONFIG })
      ),
      http.put('/api/v1/superadmin/profile-config', () => {
        saved = true
        return HttpResponse.json({ status: 'success', data: MOCK_CONFIG })
      })
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('checkbox', { name: /institución/i })
    await user.click(screen.getByRole('button', { name: /guardar/i }))
    await vi.waitFor(() => expect(saved).toBe(true))
  })

  it('muestra confirmación de éxito tras guardar', async () => {
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: MOCK_CONFIG })
      ),
      http.put('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: MOCK_CONFIG })
      )
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('checkbox', { name: /institución/i })
    await user.click(screen.getByRole('button', { name: /guardar/i }))
    expect(await screen.findByText(/guardad|éxito|configuración actualizada/i)).toBeInTheDocument()
  })
})
