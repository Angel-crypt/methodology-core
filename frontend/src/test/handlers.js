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
        user: { id: 'user-1', email: 'super@methodology.local', role: 'superadmin' },
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
      status: 'success',
      data: {
        access_token: 'mock-oidc-jwt-token',
        must_change_password: false,
      },
    })
  ),

  // ── M1 — Perfil propio ────────────────────────────────────────────────────
  http.get(`${API}/users/me`, () =>
    HttpResponse.json({
      status: 'success',
      data: {
        id: 'user-1',
        full_name: 'Superadministrador',
        email: 'super@methodology.local',
        role: 'superadmin',
        active: true,
        must_change_password: false,
        phone: null,
        institution: null,
        terms_accepted_at: null,
        onboarding_completed: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: null,
      },
    })
  ),

  http.patch(`${API}/users/me/profile`, () =>
    HttpResponse.json({ status: 'success', data: { id: 'user-1', full_name: 'Superadministrador', email: 'super@methodology.local', phone: null, institution: null } })
  ),

  http.post(`${API}/users/me/accept-terms`, () =>
    HttpResponse.json({ status: 'success', data: { terms_accepted_at: new Date().toISOString() } })
  ),

  // ── M1 — Usuarios ──────────────────────────────────────────────────────────
  http.get(`${API}/users`, () =>
    HttpResponse.json({
      status: 'success',
      data: [
        { id: 'user-1', full_name: 'Superadministrador', email: 'super@methodology.local', role: 'superadmin', active: true, must_change_password: false, institution: null },
        { id: 'user-2', full_name: 'Aplicador Test', email: 'app@mock.local', role: 'applicator', active: true, institution: null },
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

  http.post(`${API}/users/:id/magic-link`, () =>
    HttpResponse.json({ status: 'success', data: { _mock_magic_link: '/api/v1/auth/activate/mock-token' } })
  ),

  http.get(`${API}/users/sessions`, () =>
    HttpResponse.json({ status: 'success', data: [] })
  ),

  http.get(`${API}/auth/activate/:token`, () =>
    new HttpResponse(null, { status: 302, headers: { location: '/login?activated=1' } })
  ),

  // ── CF-009 — Solicitudes de cambio de correo ────────────────────────────────
  http.post(`${API}/users/me/email-change-request`, () =>
    HttpResponse.json(
      { status: 'success', message: 'Solicitud enviada. El administrador la revisará.', data: { id: 'req-1' } },
      { status: 201 }
    )
  ),

  http.get(`${API}/users/email-change-requests`, () =>
    HttpResponse.json({ status: 'success', data: [] })
  ),

  http.delete(`${API}/users/email-change-requests/:id`, () =>
    new HttpResponse(null, { status: 204 })
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

  http.get(`${API}/applications/my`, () =>
    HttpResponse.json({ status: 'success', data: [], meta: { total: 0, page: 1, page_size: 20, pages: 1 } })
  ),

  http.get(`${API}/applications/:appId`, ({ params }) =>
    HttpResponse.json({
      status: 'success',
      data: {
        application_id: params.appId,
        application_date: '2026-04-15',
        instrument_name: 'Instrumento A',
        values_count: 3,
        notes: 'Condiciones normales.',
        metric_values: [
          { metric_id: 'mv-1', metric_name: 'Puntaje total', metric_type: 'numeric', value: '42' },
          { metric_id: 'mv-2', metric_name: 'Observación clínica', metric_type: 'text', value: 'Sin alteraciones' },
          { metric_id: 'mv-3', metric_name: 'Requiere seguimiento', metric_type: 'boolean', value: 'false' },
        ],
      },
    })
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

  // ── M4 paths canónicos con project_id (CF-017) ────────────────────────────
  http.post(`${API}/projects/:projectId/applications`, () =>
    HttpResponse.json({ status: 'success', data: { id: 'app-1' } }, { status: 201 })
  ),

  http.post(`${API}/projects/:projectId/applications/:appId/metric-values`, () =>
    HttpResponse.json({ status: 'success', data: null }, { status: 201 })
  ),

  http.get(`${API}/subjects/mine`, () =>
    HttpResponse.json({
      status: 'success',
      data: [
        { id: 'subj-1', anonymous_code: 'ABC123', project_name: 'Estudio Piloto 2026', project_id: 'proj-1', created_at: '2026-04-15T10:00:00Z' },
        { id: 'subj-2', anonymous_code: 'DEF456', project_name: 'Cohorte B', project_id: 'proj-2', created_at: '2026-04-16T14:30:00Z' },
      ],
    })
  ),

  http.get(`${API}/subjects/:subjectId/applications`, () =>
    HttpResponse.json({
      status: 'success',
      data: [
        {
          application_id: 'app-1', application_date: '2026-04-15', instrument_name: 'Instrumento A', values_count: 3, notes: 'Condiciones normales.',
          metric_values: [
            { metric_id: 'mv-1', metric_name: 'Puntaje total', metric_type: 'numeric', value: '42' },
            { metric_id: 'mv-2', metric_name: 'Observación clínica', metric_type: 'text', value: 'Sin alteraciones' },
            { metric_id: 'mv-3', metric_name: 'Requiere seguimiento', metric_type: 'boolean', value: 'false' },
          ],
        },
        {
          application_id: 'app-2', application_date: '2026-04-10', instrument_name: 'Instrumento B', values_count: 2, notes: null,
          metric_values: [
            { metric_id: 'mv-4', metric_name: 'Resultado', metric_type: 'text', value: 'Normal' },
            { metric_id: 'mv-5', metric_name: 'Puntaje', metric_type: 'numeric', value: '75' },
          ],
        },
      ],
    })
  ),

  http.post(`${API}/subjects/:id/context`, () =>
    HttpResponse.json({ status: 'success', data: null }, { status: 201 })
  ),

  http.patch(`${API}/subjects/:id/context`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),

  http.get(`${API}/projects/:id/subjects/mine`, () =>
    HttpResponse.json({ status: 'success', data: [] })
  ),

  // ── M2-PROJECT — Proyectos (CF-013) ────────────────────────────────────────
  http.get(`${API}/projects`, ({ request }) => {
    const url = new URL(request.url)
    const memberId = url.searchParams.get('member_id')
    if (memberId) {
      return HttpResponse.json({
        status: 'success',
        data: [
          { id: 'proj-1', name: 'Estudio Piloto 2026', description: 'Demo', member_count: 1, instrument_count: 2, created_at: '2026-04-01T00:00:00Z', user_role: 'researcher' },
        ],
      })
    }
    return HttpResponse.json({
      status: 'success',
      data: [
        { id: 'proj-1', name: 'Estudio Piloto 2026', description: 'Demo', member_count: 1, instrument_count: 2, created_at: '2026-04-01T00:00:00Z' },
        { id: 'proj-2', name: 'Cohorte B', description: null, member_count: 0, instrument_count: 0, created_at: '2026-04-02T00:00:00Z' },
      ],
    })
  }),

  http.post(`${API}/projects`, () =>
    HttpResponse.json(
      { status: 'success', data: { id: 'proj-new', name: 'Nuevo Proyecto', description: null, member_count: 0, instrument_count: 0, created_at: new Date().toISOString() } },
      { status: 201 }
    )
  ),

  http.get(`${API}/projects/:id`, ({ params }) =>
    HttpResponse.json({
      status: 'success',
      data: {
        id: params.id, name: 'Estudio Piloto 2026', description: 'Demo',
        member_count: 1, instrument_count: 2, created_at: '2026-04-01T00:00:00Z', updated_at: null,
        members: [{ id: 'm-1', user_id: 'user-2', email: 'app@mock.local', full_name: 'Aplicador Test', role: 'applicator', added_at: '2026-04-01T00:00:00Z' }],
        instruments: [],
      },
    })
  ),

  http.patch(`${API}/projects/:id`, () =>
    HttpResponse.json({ status: 'success', data: { id: 'proj-1', name: 'Actualizado' } })
  ),

  http.delete(`${API}/projects/:id`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/projects/:id/members`, () =>
    HttpResponse.json({ status: 'success', data: [] })
  ),

  http.post(`${API}/projects/:id/members`, () =>
    HttpResponse.json({ status: 'success', data: { id: 'm-new', user_id: 'user-2', role: 'researcher' } }, { status: 201 })
  ),

  http.delete(`${API}/projects/:id/members/:userId`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${API}/projects/:projectId/instruments`, () =>
    HttpResponse.json({ status: 'success', data: null }, { status: 201 })
  ),

  http.get(`${API}/projects/:projectId/instruments`, () =>
    HttpResponse.json({
      status: 'success',
      data: [{ id: 'inst-proj-1', name: 'Instrumento del Proyecto', is_active: true }],
    })
  ),

  http.delete(`${API}/projects/:id/instruments/:instrumentId`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/projects/:id/config/operativo`, () =>
    HttpResponse.json({
      status: 'success',
      data: {
        education_levels: ['Preescolar', 'Primaria menor', 'Primaria mayor', 'Secundaria'],
        age_cohort_map: { 'Preescolar': '3-6', 'Primaria menor': '6-9', 'Primaria mayor': '9-12', 'Secundaria': '12-15' },
        cohort_mode: 'libre', subject_limit: 50, mode: 'normal',
      },
    })
  ),

  http.put(`${API}/projects/:id/config/operativo`, () =>
    HttpResponse.json({
      status: 'success',
      data: {
        education_levels: ['Preescolar', 'Primaria menor', 'Primaria mayor', 'Secundaria'],
        age_cohort_map: { 'Preescolar': '3-6', 'Primaria menor': '6-9', 'Primaria mayor': '9-12', 'Secundaria': '12-15' },
        cohort_mode: 'libre', subject_limit: 30, mode: 'normal',
      },
    })
  ),

  http.get(`${API}/config/system-defaults`, () =>
    HttpResponse.json({
      status: 'success',
      data: {
        education_levels: ['Preescolar', 'Primaria menor', 'Primaria mayor', 'Secundaria'],
        age_cohort_map: { 'Preescolar': '3-6', 'Primaria menor': '6-9', 'Primaria mayor': '9-12', 'Secundaria': '12-15' },
        cohort_mode: 'libre', subject_limit: 50, mode: 'normal',
      },
    })
  ),

  http.get(`${API}/config/operativo`, () =>
    new HttpResponse(JSON.stringify({ status: 'error', data: { code: 'GONE' } }), { status: 410 })
  ),

  // ── Sprint 4 — Instituciones y legal ───────────────────────────────────────
  http.get(`${API}/institutions`, () =>
    HttpResponse.json({ status: 'success', data: [] })
  ),

  http.post(`${API}/institutions`, () =>
    HttpResponse.json({ status: 'success', data: { id: 'inst-1', name: 'test', domain: null, created_at: new Date().toISOString() } }, { status: 201 })
  ),

  http.patch(`${API}/institutions/:id`, () =>
    HttpResponse.json({ status: 'success', data: { id: 'inst-1', name: 'Editado', domain: 'editado.edu', created_at: new Date().toISOString() } })
  ),

  http.get(`${API}/institutions/resolve`, () =>
    HttpResponse.json({ status: 'success', data: null })
  ),

  http.get(`${API}/legal/terms`, () =>
    HttpResponse.json({ status: 'success', data: { version: '1.0', updated_at: '2026-04-01', content: 'Términos de prueba.' } })
  ),

  http.get(`${API}/legal/privacy`, () =>
    HttpResponse.json({ status: 'success', data: { version: '1.0', updated_at: '2026-04-01', content: 'Aviso de privacidad de prueba.' } })
  ),

  http.get(`${API}/superadmin/profile-config`, () =>
    HttpResponse.json({ status: 'success', data: { require_phone: true, require_institution: true, require_terms: true } })
  ),

  http.put(`${API}/superadmin/profile-config`, () =>
    HttpResponse.json({ status: 'success', data: { require_phone: false, require_institution: true, require_terms: true } })
  ),
]
