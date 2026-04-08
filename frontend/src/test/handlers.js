/**
 * MSW handlers base — interceptan fetch en los tests.
 * Cada test puede agregar handlers adicionales con server.use(...) para casos específicos.
 */
import { http, HttpResponse } from 'msw'

const API = '/api/v1'

export const handlers = [
  // ── M1 — Autenticación ─────────────────────────────────────────────────────
  http.post(`${API}/auth/login`, () =>
    HttpResponse.json({
      status: 'success',
      data: {
        access_token: 'mock-jwt-token',
        user: { id: 'user-1', email: 'admin@mock.local', role: 'superadmin' },
      },
    })
  ),

  http.post(`${API}/auth/logout`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),

  http.get(`${API}/auth/oidc/authorize`, ({ request }) => {
    const url = new URL(request.url)
    const redirectUri = url.searchParams.get('redirect_uri')
    const state = url.searchParams.get('state') ?? ''
    const callbackUrl = `${redirectUri}?code=MOCK_CODE_TEST&state=${state}`
    return HttpResponse.redirect(callbackUrl, 302)
  }),

  http.post(`${API}/auth/oidc/callback`, () =>
    HttpResponse.json({
      access_token: 'mock-oidc-jwt-token',
      token_type: 'Bearer',
      expires_in: 3600,
    })
  ),

  // ── M1 — Usuarios ──────────────────────────────────────────────────────────
  http.get(`${API}/users`, () =>
    HttpResponse.json({
      status: 'success',
      data: [
        { id: 'user-1', email: 'admin@mock.local', role: 'superadmin', status: 'active' },
        { id: 'user-2', email: 'app@mock.local', role: 'applicator', status: 'active' },
      ],
    })
  ),

  http.post(`${API}/users`, () =>
    HttpResponse.json(
      { status: 'success', data: { id: 'user-new', setup_token: 'token-abc' } },
      { status: 201 }
    )
  ),

  http.patch(`${API}/users/:id/status`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),

  http.patch(`${API}/users/:id/email`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),

  http.post(`${API}/users/:id/reset-password`, () =>
    HttpResponse.json({ status: 'success', data: { setup_token: 'new-token' } })
  ),

  // ── M2 — Instrumentos ──────────────────────────────────────────────────────
  http.get(`${API}/instruments`, () =>
    HttpResponse.json({
      status: 'success',
      data: [
        { id: 'inst-1', name: 'Instrumento A', is_active: true },
        { id: 'inst-2', name: 'Instrumento B', is_active: false },
      ],
    })
  ),

  http.post(`${API}/instruments`, () =>
    HttpResponse.json(
      { status: 'success', data: { id: 'inst-new', name: 'Nuevo' } },
      { status: 201 }
    )
  ),

  http.patch(`${API}/instruments/:id`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),

  http.patch(`${API}/instruments/:id/status`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),

  http.delete(`${API}/instruments/:id`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  // ── M3 — Métricas ──────────────────────────────────────────────────────────
  http.get(`${API}/instruments/:id/metrics`, () =>
    HttpResponse.json({
      status: 'success',
      data: [
        { id: 'met-1', name: 'Métrica A', data_type: 'numeric', required: true },
      ],
    })
  ),

  http.post(`${API}/instruments/:id/metrics`, () =>
    HttpResponse.json(
      { status: 'success', data: { id: 'met-new' } },
      { status: 201 }
    )
  ),

  http.patch(`${API}/instruments/:instrumentId/metrics/:metricId`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),

  http.delete(`${API}/instruments/:instrumentId/metrics/:metricId`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  // ── M4 — Registro ──────────────────────────────────────────────────────────
  http.post(`${API}/projects/:projectId/subjects`, () =>
    HttpResponse.json(
      { status: 'success', data: { id: 'subj-1' } },
      { status: 201 }
    )
  ),

  http.post(`${API}/projects/:projectId/subjects/:subjectId/context`, () =>
    HttpResponse.json({ status: 'success', data: null }, { status: 201 })
  ),

  http.post(`${API}/applications`, () =>
    HttpResponse.json(
      { status: 'success', data: { id: 'app-1' } },
      { status: 201 }
    )
  ),

  http.post(`${API}/metric-values`, () =>
    HttpResponse.json({ status: 'success', data: null }, { status: 201 })
  ),

  // ── M5 — Consulta ──────────────────────────────────────────────────────────
  http.get(`${API}/applications`, () =>
    HttpResponse.json({
      status: 'success',
      data: { items: [], total: 0, page: 1, page_size: 10 },
    })
  ),

  // ── M6 — Exportación ───────────────────────────────────────────────────────
  http.get(`${API}/export/csv`, () =>
    new HttpResponse('col1,col2\nval1,val2', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="export.csv"',
      },
    })
  ),

  http.get(`${API}/export/json`, () =>
    HttpResponse.json([{ col1: 'val1' }])
  ),

  // ── M2 — Proyectos ─────────────────────────────────────────────────────────
  http.post(`${API}/projects/:projectId/instruments`, () =>
    HttpResponse.json(
      { status: 'success', data: null },
      { status: 201 }
    )
  ),

  http.get(`${API}/projects/:projectId/instruments`, () =>
    HttpResponse.json({ status: 'success', data: [] })
  ),
]
