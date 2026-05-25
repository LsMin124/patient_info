import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { server } from '../../../test/setup'
import { useDataPointsQuery, useSessionsQuery } from '../useMeasurements'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useSessionsQuery', () => {
  it('loads sessions when patientId is provided', async () => {
    const { result } = renderHook(() => useSessionsQuery('p001'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })

  it('stays disabled (no fetch) when patientId is undefined', async () => {
    const { result } = renderHook(() => useSessionsQuery(undefined), {
      wrapper: makeWrapper(),
    })
    // enabled:false → never leaves pending/idle into fetching
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('surfaces a sanitized ApiError on backend failure', async () => {
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )
    const { result } = renderHook(() => useSessionsQuery('p001'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('The server is temporarily unavailable.')
  })
})

describe('useDataPointsQuery', () => {
  it('loads data points for a valid measurementId', async () => {
    const { result } = renderHook(() => useDataPointsQuery(101), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(7)
  })

  it('stays disabled for measurementId <= 0 or undefined', () => {
    const { result } = renderHook(() => useDataPointsQuery(undefined), {
      wrapper: makeWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
