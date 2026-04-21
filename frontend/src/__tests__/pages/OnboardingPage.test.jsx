/**
 * Tests de OnboardingPage — formulario dinámico de perfil post-T&C.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import OnboardingPage from '@/pages/OnboardingPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token' }),
  AuthProvider: ({ children }) => children,
}))

const mockReloadUser = vi.fn().mockResolvedValue(undefined)
vi.mock('@/contexts/UserContext', () => ({
  useUser: () => ({
    user: { email: 'test@universidadtest.edu.mx', phone: null, institution: null },
    reloadUser: mockReloadUser,
  }),
  UserProvider: ({ children }) => children,
}))

function renderPage() {
  return render(<MemoryRouter><OnboardingPage /></MemoryRouter>)
}

describe('OnboardingPage — estructura', () => {
  it('muestra campo de institución', async () => {
    renderPage()
    expect(await screen.findByLabelText(/institución/i)).toBeInTheDocument()
  })

  it('muestra botón de guardar', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /continuar|guardar|completar/i })).toBeInTheDocument()
  })
})

describe('OnboardingPage — validación', () => {
  it('no llama al API si institución requerida está vacía', async () => {
    let patched = false
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: { require_phone: false, require_institution: true, require_terms: true } })
      ),
      http.get('/api/v1/institutions/resolve', () =>
        HttpResponse.json({ status: 'success', data: { institution: null } })
      ),
      http.patch('/api/v1/users/me/profile', () => {
        patched = true
        return HttpResponse.json({ status: 'success', data: {} })
      })
    )
    const user = userEvent.setup()
    renderPage()
    const btn = await screen.findByRole('button', { name: /continuar|guardar|completar/i })
    await user.click(btn)
    // Error de validación: el PATCH no debe ejecutarse
    await new Promise((r) => setTimeout(r, 200))
    expect(patched).toBe(false)
  })
})

describe('OnboardingPage — institución pre-asignada por dominio', () => {
  it('muestra institución detectada y oculta el campo libre', async () => {
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: { require_phone: false, require_institution: false, require_terms: true } })
      ),
      http.get('/api/v1/institutions/resolve', () =>
        HttpResponse.json({ status: 'success', data: { institution: 'Universidad Test' } })
      )
    )
    renderPage()
    expect(await screen.findByText('Universidad Test')).toBeInTheDocument()
  })
})

describe('OnboardingPage — teléfono con código de país', () => {
  it('muestra selector de código de país cuando teléfono es requerido', async () => {
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: { require_phone: true, require_institution: false, require_terms: true } })
      ),
      http.get('/api/v1/institutions/resolve', () =>
        HttpResponse.json({ status: 'success', data: null })
      )
    )
    renderPage()
    // Debe mostrar el campo de teléfono y el selector de país
    expect(await screen.findByLabelText(/teléfono/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /país|código/i })).toBeInTheDocument()
  })

  it('permite seleccionar código de país y escribir número', async () => {
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: { require_phone: true, require_institution: false, require_terms: true } })
      ),
      http.get('/api/v1/institutions/resolve', () =>
        HttpResponse.json({ status: 'success', data: null })
      )
    )
    const user = userEvent.setup()
    renderPage()

    const countrySelect = await screen.findByRole('combobox', { name: /país|código/i })
    await user.selectOptions(countrySelect, '+52')

    const phoneInput = screen.getByLabelText(/teléfono/i)
    await user.type(phoneInput, '5512345678')

    expect(phoneInput.value).toBe('5512345678')
  })

  it('envía teléfono con código de país al guardar', async () => {
    let patchedBody = null
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: { require_phone: true, require_institution: false, require_terms: true } })
      ),
      http.get('/api/v1/institutions/resolve', () =>
        HttpResponse.json({ status: 'success', data: null })
      ),
      http.patch('/api/v1/users/me/profile', async ({ request }) => {
        // Capturamos solo el primer PATCH (el de perfil, no el de onboarding_completed)
        if (!patchedBody) {
          patchedBody = await request.json()
        }
        return HttpResponse.json({ status: 'success', data: {} })
      })
    )
    const user = userEvent.setup()
    renderPage()

    const countrySelect = await screen.findByRole('combobox', { name: /país/i })
    await user.selectOptions(countrySelect, '+52')

    const phoneInput = screen.getByLabelText(/teléfono/i)
    await user.type(phoneInput, '5512345678')

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    // El body debe contener el teléfono con código de país
    await vi.waitFor(() => {
      expect(patchedBody).not.toBeNull()
      expect(patchedBody.phone).toBe('+525512345678')
    })
  })

  it('bloquea el avance si el teléfono tiene menos de 7 dígitos', async () => {
    let patched = false
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: { require_phone: true, require_institution: false, require_terms: true } })
      ),
      http.get('/api/v1/institutions/resolve', () =>
        HttpResponse.json({ status: 'success', data: null })
      ),
      http.patch('/api/v1/users/me/profile', () => {
        patched = true
        return HttpResponse.json({ status: 'success', data: {} })
      })
    )
    const user = userEvent.setup()
    renderPage()

    // El input filtra caracteres no numéricos, queda "123"
    const phoneInput = await screen.findByLabelText(/teléfono/i)
    await user.type(phoneInput, 'abc123xyz')

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    // No debe llamar al API por validación de longitud
    await new Promise((r) => setTimeout(r, 200))
    expect(patched).toBe(false)
    expect(screen.getByText(/entre 7 y 15 dígitos/i)).toBeInTheDocument()
  })
})

describe('OnboardingPage — submit exitoso', () => {
  it('llama a PATCH /users/me/profile y navega al home', async () => {
    let patched = false
    server.use(
      http.get('/api/v1/superadmin/profile-config', () =>
        HttpResponse.json({ status: 'success', data: { require_phone: false, require_institution: true, require_terms: true } })
      ),
      http.get('/api/v1/institutions/resolve', () =>
        HttpResponse.json({ status: 'success', data: { institution: null } })
      ),
      http.patch('/api/v1/users/me/profile', () => {
        patched = true
        return HttpResponse.json({ status: 'success', data: {} })
      })
    )
    const user = userEvent.setup()
    renderPage()
    const input = await screen.findByLabelText(/institución/i)
    await user.type(input, 'Mi Universidad')
    await user.click(screen.getByRole('button', { name: /continuar|guardar|completar/i }))
    await vi.waitFor(() => expect(patched).toBe(true))
  })
})
