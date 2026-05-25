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
    // Newest visit (visit 2) renders first. Each visit row exposes one
    // checkbox + a link per motion side, so we expect 4 motion links total.
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
    // Visit headings include "Visit 1" / "Visit 2"
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

  it('shows compare link once exactly 2 complete visits are selected', async () => {
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
    const checks = await screen.findAllByRole('checkbox')
    // 2 visits, 2 checkboxes (1 per visit — not 1 per measurement)
    expect(checks).toHaveLength(2)

    // 0 selected → no compare, no hint
    expect(screen.queryByRole('link', { name: /Compare/ })).toBeNull()

    // 1 visit selected → hint, but no compare link yet
    await user.click(checks[0]!)
    expect(
      screen.getByText('Select exactly two visits to compare flexion and extension side by side.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Compare/ })).toBeNull()

    // 2 visits selected → compare link with flex+ext ids of the older visit first
    await user.click(checks[1]!)
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
