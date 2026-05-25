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
  it('renders sessions in startTime-descending order', async () => {
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json([
          session({ measurementId: 1, startTime: '2026-05-01T10:30:00' }),
          session({ measurementId: 2, startTime: '2026-05-03T09:00:00' }),
          session({ measurementId: 3, startTime: '2026-05-02T14:15:00' }),
        ]),
      ),
    )
    render(wrap(<SessionList patientId="p001" />))
    const links = await screen.findAllByRole('link')
    // first link goes to measurement 2 (newest), then 3, then 1
    expect(links[0]).toHaveAttribute('href', '/patients/p001/sessions/2')
    expect(links[1]).toHaveAttribute('href', '/patients/p001/sessions/3')
    expect(links[2]).toHaveAttribute('href', '/patients/p001/sessions/1')
  })

  it('renders an empty state when there are no sessions', async () => {
    server.use(http.get('/api/v1/patients/:patientId/measurements', () => HttpResponse.json([])))
    render(wrap(<SessionList patientId="p001" />))
    expect(await screen.findByText('No measurement sessions yet.')).toBeInTheDocument()
  })

  it('labels in-progress sessions (endTime null) with the warning badge', async () => {
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json([session({ measurementId: 9, endTime: null, memo: null })]),
      ),
    )
    render(wrap(<SessionList patientId="p001" />))
    const link = await screen.findByRole('link')
    expect(within(link).getByText('Measurement in progress')).toBeInTheDocument()
    expect(within(link).getByText('No memo')).toBeInTheDocument()
  })

  it('shows a compare button once 2+ sessions are selected', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json([
          session({ measurementId: 5 }),
          session({ measurementId: 7, startTime: '2026-05-02T10:30:00' }),
        ]),
      ),
    )
    render(wrap(<SessionList patientId="p001" />))
    const checks = await screen.findAllByRole('checkbox')
    await user.click(checks[0]!)
    expect(screen.queryByRole('link', { name: /Compare/ })).toBeNull()
    await user.click(checks[1]!)
    const compare = screen.getByRole('link', { name: /Compare/ })
    expect(compare).toHaveAttribute('href', '/sessions/compare?ids=5,7')
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
