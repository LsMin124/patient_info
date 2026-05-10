import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { handlers } from './handlers'

/**
 * Single MSW server for the whole vitest run. Tests can layer per-case
 * overrides via `server.use(...)`; afterEach.resetHandlers undoes them
 * so cases stay isolated. Default handlers live in ./handlers.ts.
 *
 * onUnhandledRequest='error' makes it impossible to silently fall through
 * to a real fetch attempt — a failure means a feature called an endpoint
 * we forgot to mock.
 */
export const server = setupServer(...handlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  // Clear browser-storage between tests so locale/theme persisted state
  // does not leak across files.
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterAll(() => {
  server.close()
})
