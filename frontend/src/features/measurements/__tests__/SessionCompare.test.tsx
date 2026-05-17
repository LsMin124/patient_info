import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '../../../shared/i18n/LocaleProvider'
import { server } from '../../../test/setup'
import { SessionCompare } from '../SessionCompare'

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="overlay-chart" />,
}))
vi.mock('../chartSetup', () => ({}))

function renderAt(search: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <MemoryRouter initialEntries={[`/sessions/compare${search}`]}>
            <Routes>
              <Route path="/sessions/compare" element={children} />
              <Route path="/patients" element={<div>patient-list</div>} />
            </Routes>
          </MemoryRouter>
        </LocaleProvider>
      </QueryClientProvider>
    )
  }
  return render(<SessionCompare />, { wrapper: Wrapper })
}

describe('SessionCompare', () => {
  it('renders "too few" empty state when fewer than 2 ids', async () => {
    renderAt('?ids=1')
    expect(await screen.findByText('비교할 세션이 부족합니다')).toBeInTheDocument()
  })

  it('renders "too many" empty state when >MAX ids supplied', async () => {
    renderAt('?ids=1,2,3,4,5')
    expect(await screen.findByText('최대 4개까지만 비교할 수 있습니다')).toBeInTheDocument()
  })

  it('renders chart + comparison table on valid ids', async () => {
    server.use(
      http.get('/api/v1/measurements/:id/data', ({ params }) =>
        HttpResponse.json([
          { timeOffsetMs: 0, kgValue: Number(params.id) },
          { timeOffsetMs: 100, kgValue: Number(params.id) + 5 },
        ]),
      ),
    )

    renderAt('?ids=101,102')
    expect(await screen.findByTestId('overlay-chart')).toBeInTheDocument()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    // header + 2 data rows
    expect(rows).toHaveLength(3)
    // peak column for id=101 → (101+5)*9.80665 = 106*9.80665 = 1039.5049
    expect(within(rows[1]!).getByText('1039.50 N')).toBeInTheDocument()
  })

  it('drops invalid segments silently and still renders if 2+ valid remain', async () => {
    server.use(
      http.get('/api/v1/measurements/:id/data', () =>
        HttpResponse.json([{ timeOffsetMs: 0, kgValue: 1 }]),
      ),
    )
    renderAt('?ids=abc,101,-5,102')
    expect(await screen.findByTestId('overlay-chart')).toBeInTheDocument()
    const rows = within(await screen.findByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(3) // header + 2
  })

  it('surfaces error fallback when a session data fetch fails', async () => {
    server.use(
      http.get('/api/v1/measurements/101/data', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/measurements/102/data', () =>
        HttpResponse.json([{ timeOffsetMs: 0, kgValue: 1 }]),
      ),
    )
    renderAt('?ids=101,102')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
