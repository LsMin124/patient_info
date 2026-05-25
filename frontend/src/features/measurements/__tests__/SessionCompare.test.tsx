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
    expect(await screen.findByText('Not enough sessions to compare')).toBeInTheDocument()
  })

  it('renders "too many" empty state when >MAX ids supplied', async () => {
    renderAt('?ids=1,2,3,4,5')
    expect(await screen.findByText('Up to 4 sessions can be compared at once')).toBeInTheDocument()
  })

  it('renders multi-overlay chart + comparison table when 3+ valid ids', async () => {
    // ids.length === 2 triggers the dedicated figure mode (covered below).
    // The multi-overlay table path activates from 3 ids up.
    server.use(
      http.get('/api/v1/measurements/:id/data', ({ params }) =>
        HttpResponse.json([
          { timeOffsetMs: 0, kgValue: Number(params.id) },
          { timeOffsetMs: 100, kgValue: Number(params.id) + 5 },
        ]),
      ),
    )

    renderAt('?ids=101,102,103')
    expect(await screen.findByTestId('overlay-chart')).toBeInTheDocument()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    // header + 3 data rows
    expect(rows).toHaveLength(4)
    // peak column for id=101 → (101+5)*9.80665 = 106*9.80665 = 1039.5049
    expect(within(rows[1]!).getByText('1039.50 N')).toBeInTheDocument()
  })

  it('drops invalid segments silently and still renders if 3+ valid remain', async () => {
    server.use(
      http.get('/api/v1/measurements/:id/data', () =>
        HttpResponse.json([{ timeOffsetMs: 0, kgValue: 1 }]),
      ),
    )
    renderAt('?ids=abc,101,-5,102,103')
    expect(await screen.findByTestId('overlay-chart')).toBeInTheDocument()
    const rows = within(await screen.findByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(4) // header + 3
  })

  it('renders figure mode (ΔPeak panel, no stats table) when exactly 2 valid ids', async () => {
    // peak kgf: 101 → 6, 102 → 8 ; baseline=earlier (101 by startTime), follow-up=later (102).
    // ΔPeak in N: (8 - 6) * 9.80665 = 19.6133 → expect "+19.6 N" with "+33.3%"
    server.use(
      http.get('/api/v1/measurements/:id/data', ({ params }) =>
        HttpResponse.json(
          Number(params.id) === 101
            ? [
                { timeOffsetMs: 0, kgValue: 0 },
                { timeOffsetMs: 500, kgValue: 6 },
                { timeOffsetMs: 1000, kgValue: 0 },
              ]
            : [
                { timeOffsetMs: 0, kgValue: 0 },
                { timeOffsetMs: 600, kgValue: 8 },
                { timeOffsetMs: 1200, kgValue: 0 },
              ],
        ),
      ),
    )

    renderAt('?ids=101,102')
    // figure-mode chart still uses react-chartjs-2 (mocked → overlay-chart testid)
    expect(await screen.findByTestId('overlay-chart')).toBeInTheDocument()
    // No multi-overlay stats table in figure mode
    expect(screen.queryByRole('table')).toBeNull()
    // Headline split into percent (big) + Newton (secondary). Assert both
    // anchors independently so the exact markup can evolve without rewriting.
    expect(await screen.findByText('+33.3%')).toBeInTheDocument()
    expect(screen.getByText('+19.6 N')).toBeInTheDocument()
    // Baseline/follow-up labels both present
    expect(screen.getByText('Baseline')).toBeInTheDocument()
    expect(screen.getByText('Follow-up')).toBeInTheDocument()
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
