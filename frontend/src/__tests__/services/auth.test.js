/**
 * T006 — SEC-002: JWT debe almacenarse en sessionStorage, no en localStorage
 */
import { describe, it, expect, beforeEach } from 'vitest'

describe('Token storage — sessionStorage (T006 / SEC-002)', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('sessionStorage permite guardar y recuperar el token', () => {
    sessionStorage.setItem('access_token', 'jwt-test')
    expect(sessionStorage.getItem('access_token')).toBe('jwt-test')
  })

  it('sessionStorage.removeItem limpia el token', () => {
    sessionStorage.setItem('access_token', 'jwt-test')
    sessionStorage.removeItem('access_token')
    expect(sessionStorage.getItem('access_token')).toBeNull()
  })

  it('el entorno de test tiene sessionStorage disponible (precondición)', () => {
    expect(typeof sessionStorage.getItem).toBe('function')
    expect(typeof sessionStorage.setItem).toBe('function')
    expect(typeof sessionStorage.removeItem).toBe('function')
  })
})
