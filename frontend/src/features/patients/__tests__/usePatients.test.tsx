import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { server } from '../../../test/setup'
import { useCreatePatientMutation, usePatientsQuery } from '../usePatients'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('usePatientsQuery', () => {
  it('loads the list via msw default handlers', async () => {
    const { result } = renderHook(() => usePatientsQuery(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })

  it('exposes ApiError on backend failure', async () => {
    server.use(http.get('/api/v1/patients', () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => usePatientsQuery(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('서버에 일시적인 문제가 발생했습니다.')
  })
})

describe('useCreatePatientMutation', () => {
  it('invalidates the list cache on success so a fresh fetch happens', async () => {
    const wrapper = makeWrapper()
    const { result: q } = renderHook(() => usePatientsQuery(), { wrapper })
    await waitFor(() => expect(q.current.isSuccess).toBe(true))

    let callCount = 0
    server.use(
      http.get('/api/v1/patients', () => {
        callCount += 1
        return HttpResponse.json([
          {
            id: 99,
            patientId: 'p999',
            name: '신',
            age: 22,
            sex: 'other',
            height: 170,
            weight: 60,
          },
        ])
      }),
    )

    const { result: m } = renderHook(() => useCreatePatientMutation(), { wrapper })
    await act(async () => {
      await m.current.mutateAsync({
        patientId: 'p999',
        name: '신',
        age: 22,
        sex: 'other',
        height: 170,
        weight: 60,
      })
    })

    await waitFor(() => expect(callCount).toBe(1))
  })
})
