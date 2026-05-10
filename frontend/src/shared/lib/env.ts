import { z } from 'zod'

/**
 * Validated environment variables. Read at module-load time so misconfiguration
 * surfaces as a hard error during boot, not as mysterious 404s later.
 *
 * VITE_API_BASE_URL: optional, defaults to '' (same-origin).
 *   - In prod: empty → fetch '/api/v1/...' against the Spring Boot host.
 *   - In dev:  empty → fetch '/api/...' against Vite dev server which proxies
 *              '/api' to localhost:8080 (see vite.config.ts).
 *   - When set, must be an http(s) URL or empty string. No trailing slash.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .refine(
      (v) => v === '' || /^https?:\/\/[^\s]+[^/]$/i.test(v),
      'VITE_API_BASE_URL must be empty or an http(s) URL with no trailing slash',
    )
    .default(''),
})

const raw = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? '',
}

const parsed = envSchema.safeParse(raw)
if (!parsed.success) {
  // Throw early with a clear, actionable message — never silently fall back.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = parsed.data

/**
 * Build a full API URL from a path like "/api/v1/patients".
 * Always returns an absolute path or origin-prefixed URL. The caller passes
 * the path with a leading slash; the function never inserts double slashes.
 */
export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`apiUrl: path must start with '/' (got: ${path})`)
  }
  return env.VITE_API_BASE_URL ? `${env.VITE_API_BASE_URL}${path}` : path
}
