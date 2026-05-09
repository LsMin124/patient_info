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

  it('throws ApiError carrying server status on non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'not found' }, 404))
    await expect(httpGet('/api/v1/missing', okSchema)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'not found',
    })
  })

  it('uses status-only message when error body is unparseable', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>500</html>', { status: 500 }))
    await expect(httpGet('/api/v1/oops', okSchema)).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('500'),
    })
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
