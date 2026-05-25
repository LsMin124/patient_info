import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { LocaleProvider } from '../../../shared/i18n/LocaleProvider'
import { server } from '../../../test/setup'
import { SessionList } from '../SessionList'
import type { MeasurementSummary } from '../schema'

function wrap(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return (
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </LocaleProvider>
    </QueryClientProvider>
  )
}

const session = (over: Partial<MeasurementSummary>): MeasurementSummary => ({
  measurementId: 1,
  startTime: '2026-05-01T10:30:00',
  endTime: '2026-05-01T10:30:05',
  memo: 'L knee',
  ...over,
})

describe('SessionList', () => {
  it('groups sessions into visits (flex+ext) and renders newest visit first', async () => {
    // 4 sessions → 2 visits: visit 1 = (mid 1, mid 3), visit 2 = (mid 2, mid 4).
    // Newest visit (visit 2) renders first. Each visit has 2 motion links.
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json([
          session({ measurementId: 1, startTime: '2026-05-01T10:30:00' }),
          session({ measurementId: 3, startTime: '2026-05-01T10:30:10' }),
          session({ measurementId: 2, startTime: '2026-05-03T09:00:00' }),
          session({ measurementId: 4, startTime: '2026-05-03T09:00:10' }),
        ]),
      ),
    )
    render(wrap(<SessionList patientId="p001" />))
    const links = await screen.findAllByRole('link')
    // Newest visit first: flex mid 2, ext mid 4 → then visit 1: flex mid 1, ext mid 3.
    expect(links[0]).toHaveAttribute('href', '/patients/p001/sessions/2')
    expect(links[1]).toHaveAttribute('href', '/patients/p001/sessions/4')
    expect(links[2]).toHaveAttribute('href', '/patients/p001/sessions/1')
    expect(links[3]).toHaveAttribute('href', '/patients/p001/sessions/3')
    expect(screen.getByText('Visit 2')).toBeInTheDocument()
    expect(screen.getByText('Visit 1')).toBeInTheDocument()
  })

  it('renders an empty state when there are no sessions', async () => {
    server.use(http.get('/api/v1/patients/:patientId/measurements', () => HttpResponse.json([])))
    render(wrap(<SessionList patientId="p001" />))
    expect(await screen.findByText('No measurement sessions yet.')).toBeInTheDocument()
  })

  it('labels in-progress motions inside a visit card with the warning badge', async () => {
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json([
          session({ measurementId: 9, endTime: null, memo: null }),
          session({
            measurementId: 10,
            startTime: '2026-05-01T10:30:10',
            endTime: null,
            memo: null,
          }),
        ]),
      ),
    )
    render(wrap(<SessionList patientId="p001" />))
    const flexLink = await screen.findByRole('link', { name: /Flexion/ })
    expect(within(flexLink).getByText('Measurement in progress')).toBeInTheDocument()
    expect(within(flexLink).getByText('No memo')).toBeInTheDocument()
  })

  it('compare link reflects 2 individually-checked sessions (oldest first)', async () => {
    // Per-session selection so the user can compare any two measurements
    // regardless of visit pairing. Selecting just the two flexions yields
    // ?ids=oldFlex,newFlex (chronological) — routes to single-motion
    // ComparisonFigure in SessionCompare.
    const user = userEvent.setup()
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json([
          session({ measurementId: 5, startTime: '2026-05-01T10:30:00' }),
          session({ measurementId: 6, startTime: '2026-05-01T10:30:10' }),
          session({ measurementId: 7, startTime: '2026-05-03T10:30:00' }),
          session({ measurementId: 8, startTime: '2026-05-03T10:30:10' }),
        ]),
      ),
    )
    render(wrap(<SessionList patientId="p001" />))
    // 2 visits × 2 motions = 4 measurement checkboxes + 2 visit-level
    // checkboxes (one per visit card) = 6 total.
    const checks = await screen.findAllByRole('checkbox')
    expect(checks.length).toBe(6)

    // Find the two flexion-row checkboxes by aria-label and tick them.
    const flexCheck5 = screen.getByLabelText('Select measurement #5 for comparison')
    const flexCheck7 = screen.getByLabelText('Select measurement #7 for comparison')
    await user.click(flexCheck5)
    await user.click(flexCheck7)

    const compare = screen.getByRole('link', { name: /Compare/ })
    expect(compare).toHaveAttribute('href', '/sessions/compare?ids=5,7')
  })

  it('visit-level checkbox selects both motions in the visit at once', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json([
          session({ measurementId: 5, startTime: '2026-05-01T10:30:00' }),
          session({ measurementId: 6, startTime: '2026-05-01T10:30:10' }),
          session({ measurementId: 7, startTime: '2026-05-03T10:30:00' }),
          session({ measurementId: 8, startTime: '2026-05-03T10:30:10' }),
        ]),
      ),
    )
    render(wrap(<SessionList patientId="p001" />))
    const v1 = await screen.findByLabelText('Select visit 1 for comparison')
    const v2 = await screen.findByLabelText('Select visit 2 for comparison')
    await user.click(v1)
    await user.click(v2)
    const compare = screen.getByRole('link', { name: /Compare/ })
    expect(compare).toHaveAttribute('href', '/sessions/compare?ids=5,6,7,8')
  })

  it('shows error fallback on API failure', async () => {
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )
    render(wrap(<SessionList patientId="p001" />))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
