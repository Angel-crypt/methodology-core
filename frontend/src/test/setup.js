import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, afterAll, beforeAll } from 'vitest'
import { server } from './server'

// Limpia el DOM después de cada test
afterEach(() => cleanup())

// Levanta MSW antes de todos los tests, resetea handlers después de cada test
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
