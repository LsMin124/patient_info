import { z, type ZodTypeAny } from 'zod'

import { apiUrl } from './env'

/**
 * Thin fetch wrapper used by every API call in the app. Goals:
 * - Force every response body through a zod schema so wire-contract drift
 *   (IMPL_SPEC §1.1) surfaces immediately as a parse failure instead of a
 *   runtime "Cannot read property of undefined" 30 seconds later.
 * - Single ApiError shape for UI mapping (toast / inline / 404 page).
 * - AbortController-aware so TanStack Query can cancel in-flight requests.
 *
 * The wrapper stays intentionally tiny: no axios, no interceptors, no global
 * state. Any cross-cutting concern (auth, retry) belongs at the query layer.
 */

export class ApiError extends Error {
  readonly status: number
  override readonly cause: unknown

  constructor(message: string, status: number, cause?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.cause = cause
  }
}

const NETWORK_STATUS = 0
const PARSE_STATUS = 422

/**
 * Map a non-2xx status code to a generic, user-safe message. The mapping is
 * intentionally coarse — UI surfaces (toast, error banner) render this string
 * directly so it must never contain server-provided detail. Callers that need
 * status-specific UX (e.g. "invalid input — see fields") should branch on
 * `error.status` rather than parse the message.
 */
function genericMessageForStatus(status: number): string {
  if (status === 400) return 'Bad request.'
  if (status === 401) return 'Authentication required.'
  if (status === 403) return 'Access denied.'
  if (status === 404) return 'The requested resource was not found.'
  if (status === 409) return 'A record with this value already exists.'
  if (status === 422) return 'Please check the submitted values.'
  if (status >= 500) return 'The server is temporarily unavailable.'
  return `Request failed (${status})`
}

interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
}

async function request<TSchema extends ZodTypeAny>(
  method: 'GET' | 'POST',
  path: string,
  schema: TSchema,
  body: unknown | undefined,
  options: RequestOptions = {},
): Promise<z.infer<TSchema>> {
  const url = apiUrl(path)
  // Derive the init type from `fetch` directly so we never reference the
  // bare global `RequestInit` (ESLint's no-undef doesn't know about DOM lib
  // types and would flag it; the inferred type is identical).
  const init: NonNullable<Parameters<typeof fetch>[1]> = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(options.signal ? { signal: options.signal } : {}),
  }

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    throw new ApiError('Network error', NETWORK_STATUS, err)
  }

  if (!response.ok) {
    // Build a user-safe message from the status code only. Never inline a
    // server-provided string into ApiError.message — Spring Boot exception
    // messages have historically leaked patient identifiers (e.g.
    // "Invalid patient Id: p001") via IllegalArgumentException, and the
    // backend has no @ControllerAdvice yet to sanitize them. The full
    // parsed body is preserved on `cause` so logs / error trackers keep
    // the diagnostic detail without it surfacing in the UI.
    let serverDetail: unknown = undefined
    try {
      serverDetail = await response.json()
    } catch {
      // body was non-JSON or empty; ignore
    }
    throw new ApiError(genericMessageForStatus(response.status), response.status, serverDetail)
  }

  // 204 No Content / 200 with empty body — only valid for the void-shaped
  // schema. Treat undefined as the absence of payload.
  const contentLength = response.headers.get('Content-Length')
  if (response.status === 204 || contentLength === '0') {
    return schema.parse(undefined)
  }

  let json: unknown
  try {
    json = await response.json()
  } catch (err) {
    throw new ApiError('Response was not valid JSON', PARSE_STATUS, err)
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    // Do NOT inline the URL path into the user-visible message — paths in this
    // app contain raw patientIds (/api/v1/patients/:patientId/...). The PII
    // masking toggle would be defeated if a failed schema parse rendered the
    // path in an ErrorFallback that the operator might screenshot or print.
    // Method + path are preserved on `cause` for debugging only.
    throw new ApiError(genericMessageForStatus(PARSE_STATUS), PARSE_STATUS, {
      method,
      path,
      zod: parsed.error,
    })
  }
  return parsed.data as z.infer<TSchema>
}

export function httpGet<TSchema extends ZodTypeAny>(
  path: string,
  schema: TSchema,
  options?: RequestOptions,
): Promise<z.infer<TSchema>> {
  return request('GET', path, schema, undefined, options)
}

export function httpPost<TSchema extends ZodTypeAny>(
  path: string,
  schema: TSchema,
  body: unknown,
  options?: RequestOptions,
): Promise<z.infer<TSchema>> {
  return request('POST', path, schema, body, options)
}

/**
 * Schema for endpoints that return 200 OK with no body (e.g. /stop, /data).
 * Pair with httpPost to satisfy TypeScript while keeping the wire contract
 * documented at the call site.
 */
export const VoidSchema = z.undefined()
