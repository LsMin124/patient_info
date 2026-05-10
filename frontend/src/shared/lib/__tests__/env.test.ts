import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// env.ts reads import.meta.env at module-load time. To test the schema without
// coupling to Vite's env injection, we re-implement the same schema here
// mirror-style and assert the constraints.

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .refine(
      (v) => v === '' || /^https?:\/\/[^\s]+[^/]$/i.test(v),
      'VITE_API_BASE_URL must be empty or an http(s) URL with no trailing slash',
    )
    .default(''),
})

describe('env schema (mirror)', () => {
  it('accepts empty string (same-origin)', () => {
    expect(envSchema.parse({ VITE_API_BASE_URL: '' }).VITE_API_BASE_URL).toBe('')
  })

  it('defaults to empty when missing', () => {
    expect(envSchema.parse({}).VITE_API_BASE_URL).toBe('')
  })

  it('accepts http and https URLs without trailing slash', () => {
    expect(envSchema.parse({ VITE_API_BASE_URL: 'http://localhost:8080' }).VITE_API_BASE_URL).toBe(
      'http://localhost:8080',
    )
    expect(
      envSchema.parse({ VITE_API_BASE_URL: 'https://api.example.com' }).VITE_API_BASE_URL,
    ).toBe('https://api.example.com')
  })

  it('rejects URLs with trailing slash', () => {
    expect(() => envSchema.parse({ VITE_API_BASE_URL: 'https://api.example.com/' })).toThrow()
  })

  it('rejects non-http schemes', () => {
    expect(() => envSchema.parse({ VITE_API_BASE_URL: 'ftp://example.com' })).toThrow()
  })

  it('rejects garbage strings', () => {
    expect(() => envSchema.parse({ VITE_API_BASE_URL: 'not a url' })).toThrow()
  })
})

// Also import the live env module to ensure it parses successfully at runtime
// under Vitest (where VITE_API_BASE_URL is undefined → default '').
describe('apiUrl', () => {
  it('returns the path unchanged when same-origin', async () => {
    const { apiUrl } = await import('../env')
    expect(apiUrl('/api/v1/patients')).toBe('/api/v1/patients')
  })

  it('throws when path is missing leading slash', async () => {
    const { apiUrl } = await import('../env')
    expect(() => apiUrl('api/v1/patients')).toThrow(/must start with/)
  })
})
