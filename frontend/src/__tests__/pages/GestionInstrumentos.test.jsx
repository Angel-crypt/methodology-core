/**
 * Tests del wizard de creación de instrumentos en GestionInstrumentos.
 *
 * Cubre:
 *   - Validación start_date < end_date al pasar de paso 1 a paso 2.
 *   - Chip-input de tags y campo min_days_between_applications en el POST.
 *   - Eliminación de un chip al hacer clic en su botón de cierre.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { server } from '@/test/server'
import { AuthProvider } from '@/contexts/AuthContext'
import GestionInstrumentos from '@/pages/GestionInstrumentos'

// JWT mínimo con payload {"role":"superadmin"} decodeable por atob()
const SUPERADMIN_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic3VwZXJhZG1pbiJ9.sig'

function renderPage() {
  sessionStorage.setItem('access_token', SUPERADMIN_TOKEN)
  sessionStorage.setItem('role', 'superadmin')
  return render(
    <MemoryRouter>
      <AuthProvider>
        <GestionInstrumentos />
      </AuthProvider>
    </MemoryRouter>
  )
}

async function abrirModalYActivarFechaCustom(user) {
  await screen.findByRole('button', { name: /nuevo instrumento/i })
  await user.click(screen.getByRole('button', { name: /nuevo instrumento/i }))

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText(/nuevo instrumento/i)).toBeInTheDocument()

  const nombreInput = within(dialog).getByLabelText(/nombre/i)
  await user.clear(nombreInput)
  await user.type(nombreInput, 'Instrumento de prueba')

  const presetSelect = within(dialog).getByLabelText(/fin de vigencia/i)
  await user.selectOptions(presetSelect, 'custom')

  return dialog
}

function getDateInputs(dialog) {
  // Primer input date = inicio; segundo (visible solo con preset custom) = fin
  const inputs = dialog.querySelectorAll('input[type="date"]')
  return { startInput: inputs[0], endInput: inputs[1] }
}

describe('GestionInstrumentos — validación start_date < end_date', () => {
  beforeEach(() => {
    sessionStorage.clear()
    document.body.innerHTML = ''
  })

  it('bloquea el avance del wizard cuando end_date < start_date', async () => {
    const user = userEvent.setup()
    renderPage()

    const dialog = await abrirModalYActivarFechaCustom(user)
    const { startInput, endInput } = getDateInputs(dialog)

    await user.clear(startInput)
    await user.type(startInput, '2026-06-01')
    await user.clear(endInput)
    await user.type(endInput, '2026-05-01')

    await user.click(within(dialog).getByRole('button', { name: /siguiente/i }))

    expect(
      await within(dialog).findByText(/la fecha de fin debe ser posterior a la de inicio/i)
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /siguiente/i })).toBeInTheDocument()
    expect(within(dialog).queryByText(/define la primera métrica/i)).toBeNull()
  })

  it('bloquea el avance del wizard cuando end_date == start_date (igualdad estricta)', async () => {
    const user = userEvent.setup()
    renderPage()

    const dialog = await abrirModalYActivarFechaCustom(user)
    const { startInput, endInput } = getDateInputs(dialog)

    await user.clear(startInput)
    await user.type(startInput, '2026-06-01')
    await user.clear(endInput)
    await user.type(endInput, '2026-06-01')

    await user.click(within(dialog).getByRole('button', { name: /siguiente/i }))

    expect(
      await within(dialog).findByText(/la fecha de fin debe ser posterior a la de inicio/i)
    ).toBeInTheDocument()
    expect(within(dialog).queryByText(/define la primera métrica/i)).toBeNull()
  })

  it('permite avanzar al paso 2 cuando start_date < end_date', async () => {
    const user = userEvent.setup()
    renderPage()

    const dialog = await abrirModalYActivarFechaCustom(user)
    const { startInput, endInput } = getDateInputs(dialog)

    await user.clear(startInput)
    await user.type(startInput, '2026-06-01')
    await user.clear(endInput)
    await user.type(endInput, '2026-09-01')

    await user.click(within(dialog).getByRole('button', { name: /siguiente/i }))

    // Paso 2: el título del modal cambia y aparece el form de métricas
    await waitFor(() => {
      expect(within(dialog).getByText(/métricas del instrumento/i)).toBeInTheDocument()
    })
    expect(within(dialog).getByRole('button', { name: /crear instrumento/i })).toBeInTheDocument()
    expect(
      within(dialog).queryByText(/la fecha de fin debe ser posterior a la de inicio/i)
    ).toBeNull()
  })
})

describe('GestionInstrumentos — tags y min_days en la creación', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('access_token', SUPERADMIN_TOKEN)
    sessionStorage.setItem('role', 'superadmin')
    document.body.innerHTML = ''
  })

  it('al añadir tags y min_days, el POST /instruments incluye ambos campos', async () => {
    let capturedBody = null
    server.use(
      http.get('/api/v1/instruments/tags', () =>
        HttpResponse.json({ status: 'success', data: [] })
      ),
      http.post('/api/v1/instruments', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            status: 'success',
            data: {
              id: 'inst-cf029',
              name: capturedBody.name,
              tags: capturedBody.tags || [],
              min_days_between_applications: capturedBody.min_days_between_applications ?? 0,
              is_active: true,
            },
          },
          { status: 201 }
        )
      })
    )

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthProvider><GestionInstrumentos /></AuthProvider>
      </MemoryRouter>
    )

    await screen.findByRole('button', { name: /nuevo instrumento/i })
    await user.click(screen.getByRole('button', { name: /nuevo instrumento/i }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/nombre/i), 'Lectura I')

    const tagInput = within(dialog).getByLabelText(/tags|etiquetas/i)
    await user.type(tagInput, 'Lectura{Enter}')
    await user.type(tagInput, 'Primaria{Enter}')

    expect(within(dialog).getByText(/^lectura$/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/^primaria$/i)).toBeInTheDocument()

    const minDaysInput = within(dialog).getByLabelText(/días.*entre.*aplicaciones|min.*días/i)
    await user.clear(minDaysInput)
    await user.type(minDaysInput, '7')

    await user.click(within(dialog).getByRole('button', { name: /siguiente/i }))
    await within(dialog).findByText(/métricas del instrumento/i)

    await user.type(within(dialog).getByLabelText(/nombre de la métrica/i), 'Velocidad')
    await user.click(within(dialog).getByRole('button', { name: /añadir|agregar/i }))

    await user.click(within(dialog).getByRole('button', { name: /crear instrumento/i }))

    await waitFor(() => {
      expect(capturedBody).not.toBeNull()
    })
    expect(capturedBody.tags).toEqual(['lectura', 'primaria'])
    expect(capturedBody.min_days_between_applications).toBe(7)
  })

  it('elimina un chip al hacer clic en su botón de cerrar', async () => {
    server.use(
      http.get('/api/v1/instruments/tags', () =>
        HttpResponse.json({ status: 'success', data: [] })
      )
    )

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthProvider><GestionInstrumentos /></AuthProvider>
      </MemoryRouter>
    )

    await screen.findByRole('button', { name: /nuevo instrumento/i })
    await user.click(screen.getByRole('button', { name: /nuevo instrumento/i }))

    const dialog = await screen.findByRole('dialog')
    const tagInput = within(dialog).getByLabelText(/tags|etiquetas/i)
    await user.type(tagInput, 'lectura{Enter}')
    expect(within(dialog).getByText(/^lectura$/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /quitar lectura/i }))
    expect(within(dialog).queryByText(/^lectura$/i)).toBeNull()
  })
})
