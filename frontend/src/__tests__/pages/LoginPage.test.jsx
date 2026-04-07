/**
 * T003 — SEC-001: Credenciales hardcodeadas eliminadas de LoginPage
 * T004 (parcial): LoginPage debe renderizar flujo OIDC, no formulario email+password
 *
 * Nota: T004 completo (OIDC redirect) se implementará en su propia tarea.
 * Aquí verificamos las precondiciones de seguridad.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/pages/LoginPage'

// Mock mínimo de onLogin para que el componente no lance error de PropTypes
const noop = () => {}

describe('LoginPage — Seguridad de credenciales (T003 / SEC-001)', () => {
  it('no muestra texto "Admin123" en el DOM en ningún entorno', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.queryByText(/Admin123/)).toBeNull()
  })

  it('no muestra texto "admin@mock.local" en el DOM', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.queryByText(/admin@mock\.local/)).toBeNull()
  })

  it('no muestra texto "DEMO_EMAIL" ni "DEMO_PASSWORD" como texto literal', () => {
    render(<LoginPage onLogin={noop} />)
    expect(screen.queryByText(/DEMO_EMAIL/)).toBeNull()
    expect(screen.queryByText(/DEMO_PASSWORD/)).toBeNull()
  })
})
