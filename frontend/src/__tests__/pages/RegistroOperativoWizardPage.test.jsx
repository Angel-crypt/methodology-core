/**
 * Verifica que el wizard de Registro Operativo (M4) solicita los instrumentos
 * con el filtro `?is_active=true` cuando el usuario llega al paso 3.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import RegistroOperativoWizardPage from '@/pages/RegistroOperativoWizardPage'

const APPLICATOR_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYXBwbGljYXRvciJ9.sig'

const SUBJECT_UUID = '11111111-1111-4111-8111-111111111111'
const PROJECT_ID = 'proj-test-1'

let capturedInstrumentsRequests = []

beforeEach(() => {
  capturedInstrumentsRequests = []

  server.use(
    http.get('/api/v1/config/operativo', () =>
      HttpResponse.json({
        status: 'success',
        data: {
          project_id: PROJECT_ID,
          school_types: ['public', 'private', 'unknown'],
          education_levels: ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'],
          genders: ['male', 'female', 'non_binary', 'prefer_not_to_say'],
          socioeconomic_levels: ['low', 'medium', 'high', 'unknown'],
          cohort_mode: 'libre',
          age_cohort_map: {},
        },
      })
    ),
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
})

async function avanzarHastaPaso3(user) {
  await screen.findByRole('heading', { name: /paso 1: identificar sujeto/i })

  await user.click(screen.getByRole('button', { name: /sujeto existente/i }))

  const uuidInput = screen.getByPlaceholderText(/xxxxxxxx-xxxx-xxxx-xxxx/i)
  await user.type(uuidInput, SUBJECT_UUID)
  await user.click(screen.getByRole('button', { name: /cargar sujeto/i }))

  await screen.findByRole('heading', { name: /paso 2: registrar contexto/i })

  await user.click(screen.getByRole('button', { name: /continuar/i }))

  await screen.findByRole('heading', { name: /paso 3: registrar aplicación/i })
}

describe('RegistroOperativoWizardPage — filtro is_active=true', () => {
  it('GET /api/v1/instruments incluye is_active=true cuando el wizard llega al paso 3', async () => {
    const user = userEvent.setup()
    render(<RegistroOperativoWizardPage token={APPLICATOR_TOKEN} />)

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
    render(<RegistroOperativoWizardPage token={APPLICATOR_TOKEN} />)

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
