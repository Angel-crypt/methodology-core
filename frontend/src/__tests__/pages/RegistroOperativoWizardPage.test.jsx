/**
 * Verifica que el wizard de Registro Operativo (M4) solicita los instrumentos
 * con el filtro `?is_active=true` cuando el usuario llega al paso 3.
 * CF-015: El wizard ahora inicia en Paso 0 (selección de proyecto).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { AuthProvider } from '@/contexts/AuthContext'
import RegistroOperativoWizardPage from '@/pages/RegistroOperativoWizardPage'

const APPLICATOR_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYXBwbGljYXRvciJ9.sig'

const SUBJECT_UUID = '11111111-1111-4111-8111-111111111111'

let capturedInstrumentsRequests = []

beforeEach(() => {
  capturedInstrumentsRequests = []
  sessionStorage.setItem('access_token', APPLICATOR_TOKEN)
  sessionStorage.setItem('role', 'applicator')

  server.use(
    http.get('/api/v1/subjects/:id', ({ params }) =>
      HttpResponse.json({
        status: 'success',
        data: {
          id: params.id,
          context: {
            school_type: 'public',
            education_level: 'primary_upper',
            age_cohort: '9-11',
            gender: 'female',
            socioeconomic_level: 'medium',
          },
        },
      })
    ),
    http.get('/api/v1/instruments', ({ request }) => {
      capturedInstrumentsRequests.push(new URL(request.url))
      return HttpResponse.json({
        status: 'success',
        data: [
          { id: 'inst-active', name: 'Activo', is_active: true },
        ],
      })
    })
  )
})

afterEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

/** Paso 0: selecciona el primer proyecto de la lista */
async function seleccionarProyecto(user) {
  const btn = await screen.findByRole('button', { name: /Estudio Piloto 2026/i })
  await user.click(btn)
}

async function avanzarHastaPaso3(user) {
  // CF-015: primero hay que seleccionar un proyecto
  await seleccionarProyecto(user)

  await screen.findByRole('heading', { name: /paso 1: identificar sujeto/i })

  await user.click(screen.getByRole('button', { name: /sujeto existente/i }))

  const uuidInput = screen.getByPlaceholderText(/xxxxxxxx-xxxx-xxxx-xxxx/i)
  await user.type(uuidInput, SUBJECT_UUID)
  await user.click(screen.getByRole('button', { name: /cargar sujeto/i }))

  await screen.findByRole('heading', { name: /paso 2: registrar contexto/i })

  await user.click(screen.getByRole('button', { name: /continuar/i }))

  await screen.findByRole('heading', { name: /paso 3: registrar aplicación/i })
}

describe('RegistroOperativoWizardPage — Paso 0 selección de proyecto (CF-015)', () => {
  it('muestra lista de proyectos accesibles antes del wizard', async () => {
    render(<AuthProvider><RegistroOperativoWizardPage /></AuthProvider>)
    expect(await screen.findByRole('heading', { name: /paso 0: seleccionar proyecto/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Estudio Piloto 2026/i })).toBeInTheDocument()
  })

  it('al seleccionar proyecto avanza a Paso 1', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><RegistroOperativoWizardPage /></AuthProvider>)
    await seleccionarProyecto(user)
    expect(await screen.findByRole('heading', { name: /paso 1: identificar sujeto/i })).toBeInTheDocument()
  })

  it('sin proyectos muestra mensaje de alerta', async () => {
    server.use(
      http.get('/api/v1/projects', () =>
        HttpResponse.json({ status: 'success', data: [] })
      )
    )
    render(<AuthProvider><RegistroOperativoWizardPage /></AuthProvider>)
    expect(await screen.findByText(/no tienes proyectos asignados/i)).toBeInTheDocument()
  })
})

describe('RegistroOperativoWizardPage — Paso 1 Mis sujetos (CF-016)', () => {
  it('tab "Mis sujetos" muestra sujetos del proyecto cuando hay historial', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/v1/projects/:id/subjects/mine', () =>
        HttpResponse.json({
          status: 'success',
          data: [
            {
              id: SUBJECT_UUID,
              anonymous_code: '11111111',
              created_at: '2026-04-01T00:00:00Z',
              applications: [
                { application_id: 'app-1', instrument_id: 'inst-active', instrument_name: 'Activo', application_date: '2026-04-01', next_available_date: null },
              ],
            },
          ],
        })
      )
    )
    render(<AuthProvider><RegistroOperativoWizardPage /></AuthProvider>)
    await seleccionarProyecto(user)
    await screen.findByRole('heading', { name: /paso 1: identificar sujeto/i })
    await user.click(screen.getByRole('button', { name: /mis sujetos/i }))
    expect(await screen.findByText('11111111')).toBeInTheDocument()
  })

  it('tab "Mis sujetos" vacío muestra mensaje info', async () => {
    const user = userEvent.setup()
    // base handler returns empty array for subjects/mine
    render(<AuthProvider><RegistroOperativoWizardPage /></AuthProvider>)
    await seleccionarProyecto(user)
    await screen.findByRole('heading', { name: /paso 1: identificar sujeto/i })
    await user.click(screen.getByRole('button', { name: /mis sujetos/i }))
    expect(await screen.findByText(/no has registrado sujetos/i)).toBeInTheDocument()
  })
})

describe('RegistroOperativoWizardPage — filtro is_active=true', () => {
  it('GET /api/v1/instruments incluye is_active=true cuando el wizard llega al paso 3', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><RegistroOperativoWizardPage /></AuthProvider>)

    await avanzarHastaPaso3(user)

    await waitFor(() => {
      expect(capturedInstrumentsRequests.length).toBeGreaterThan(0)
    })

    for (const url of capturedInstrumentsRequests) {
      expect(url.searchParams.get('is_active')).toBe('true')
    }
  })

  it('no se hace ninguna llamada sin el filtro is_active=true', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><RegistroOperativoWizardPage /></AuthProvider>)

    await avanzarHastaPaso3(user)

    await waitFor(() => {
      expect(capturedInstrumentsRequests.length).toBeGreaterThan(0)
    })

    const llamadasSinFiltro = capturedInstrumentsRequests.filter(
      (url) => url.searchParams.get('is_active') !== 'true'
    )
    expect(llamadasSinFiltro).toHaveLength(0)
  })
})
