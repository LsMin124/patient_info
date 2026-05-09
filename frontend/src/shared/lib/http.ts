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
    let errorMessage = `${method} ${path} failed with status ${response.status}`
    try {
      const errBody = (await response.json()) as { error?: string; message?: string }
      const detail = errBody.error ?? errBody.message
      if (typeof detail === 'string' && detail.length > 0) {
        errorMessage = detail
      }
    } catch {
      // Fall through with the status-only message.
    }
    throw new ApiError(errorMessage, response.status)
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
    throw new ApiError(
      `Response failed schema validation for ${method} ${path}`,
      PARSE_STATUS,
      parsed.error,
    )
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
