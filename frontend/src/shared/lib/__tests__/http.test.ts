import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ApiError, httpGet, httpPost, VoidSchema } from '../http'

const okSchema = z.object({ ok: z.boolean() }).strict()

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  const text = JSON.stringify(body)
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(text.length),
      ...headers,
    },
  })
}

function emptyResponse(status = 204): Response {
  return new Response(null, { status, headers: { 'Content-Length': '0' } })
}

describe('httpGet', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses a successful response with the provided schema', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    const result = await httpGet('/api/v1/test', okSchema)
    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/v1/test')
    expect((init as NonNullable<Parameters<typeof fetch>[1]>).method).toBe('GET')
  })

  it('throws ApiError with status 422 when JSON does not match schema', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 'yes' }))
    await expect(httpGet('/api/v1/bad', okSchema)).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
    })
  })

  it('schema-failure ApiError message does not leak the request path (PII guard)', async () => {
    // Path segments in this app contain raw patientIds; a schema-failure
    // message that inlined the path would defeat the PII masking toggle for
    // any error that lands in ErrorFallback.
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 'yes' }))
    const err = await httpGet('/api/v1/patients/p001/measurements', okSchema).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(422)
    expect(err.message).toBe('입력값을 확인해 주세요.')
    expect(err.message).not.toContain('p001')
    expect(err.message).not.toContain('/api/v1')
    // Path is still preserved on `cause` for debugging.
    expect(err.cause).toMatchObject({ method: 'GET', path: '/api/v1/patients/p001/measurements' })
  })

  it('throws ApiError carrying server status on non-2xx', async () => {
    // Server attempts to leak a patient identifier in the error body; ApiError
    // must use a generic message and quarantine the detail on `cause` only.
    // (Models the pre-Phase-7 leaky body — kept as a regression guard so a
    // future regression that disabled the message-sanitization layer would
    // still be caught here, even if the live backend now returns a
    // structured envelope per the test below.)
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Invalid patient Id: p001' }, 404))
    const err = await httpGet('/api/v1/missing', okSchema).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(404)
    expect(err.message).toBe('요청한 리소스를 찾을 수 없습니다.')
    expect(err.message).not.toContain('p001')
    expect(err.cause).toEqual({ error: 'Invalid patient Id: p001' })
  })

  it('quarantines the new sanitized {status,error,timestamp} envelope on cause', async () => {
    // Mirrors the Phase 7 backend GlobalExceptionHandler envelope shape.
    // Documents the live-server cause shape so any frontend code that
    // accidentally narrows `cause` to the old `{ error: string }` form
    // will surface as a test failure here rather than in a clinic.
    const serverEnvelope = {
      status: 404,
      error: 'Not Found',
      timestamp: '2026-05-18T13:59:25.967Z',
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(serverEnvelope, 404))
    const err = await httpGet('/api/v1/patients/p001/measurements', okSchema).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(404)
    expect(err.message).toBe('요청한 리소스를 찾을 수 없습니다.')
    expect(err.message).not.toContain('p001')
    expect(err.cause).toEqual(serverEnvelope)
  })

  it('uses status-keyed generic message when error body is unparseable', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>500</html>', { status: 500 }))
    const err = await httpGet('/api/v1/oops', okSchema).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(500)
    expect(err.message).toBe('서버에 일시적인 문제가 발생했습니다.')
    expect(err.cause).toBeUndefined()
  })

  it('maps 4xx statuses to status-specific generic messages', async () => {
    const cases: Array<[number, string]> = [
      [400, '잘못된 요청입니다.'],
      [401, '인증이 필요합니다.'],
      [403, '접근 권한이 없습니다.'],
      [409, '이미 존재하는 데이터입니다.'],
      [422, '입력값을 확인해 주세요.'],
    ]
    for (const [status, expected] of cases) {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'leaky-detail' }, status))
      const err = await httpGet('/api/v1/x', okSchema).catch((e) => e)
      expect(err.status).toBe(status)
      expect(err.message).toBe(expected)
    }
  })

  it('wraps network failures into ApiError(status=0)', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network down'))
    await expect(httpGet('/api/v1/x', okSchema)).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    })
  })

  it('propagates AbortError from a cancelled signal', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
    const controller = new AbortController()
    controller.abort()
    await expect(
      httpGet('/api/v1/x', okSchema, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('httpPost', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('serializes the body as JSON and sets Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    const payload = { hello: 'world' }
    await httpPost('/api/v1/test', okSchema, payload)

    const [, init] = fetchMock.mock.calls[0]!
    expect((init as NonNullable<Parameters<typeof fetch>[1]>).method).toBe('POST')
    expect((init as NonNullable<Parameters<typeof fetch>[1]>).body).toBe(JSON.stringify(payload))
    expect((init as NonNullable<Parameters<typeof fetch>[1]>).headers).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    })
  })

  it('returns undefined for 204 No Content with VoidSchema', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(204))
    await expect(httpPost('/api/v1/stop', VoidSchema, undefined)).resolves.toBeUndefined()
  })

  it('returns undefined for 200 with Content-Length 0 and VoidSchema', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(200))
    await expect(httpPost('/api/v1/stop', VoidSchema, undefined)).resolves.toBeUndefined()
  })
})

describe('ApiError', () => {
  it('preserves status, message, and cause', () => {
    const cause = new Error('underlying')
    const e = new ApiError('boom', 500, cause)
    expect(e.message).toBe('boom')
    expect(e.status).toBe(500)
    expect(e.cause).toBe(cause)
    expect(e.name).toBe('ApiError')
  })
})
