import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PiiMaskProvider } from '../../../shared/hooks/PiiMaskProvider'
import { LocaleProvider } from '../../../shared/i18n/LocaleProvider'
import { ToastProvider } from '../../../shared/ui/Toast'
import { server } from '../../../test/setup'
import { SessionDetail } from '../SessionDetail'

// react-chartjs-2 + chartSetup are unavailable in jsdom (canvas-less).
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart" />,
}))
vi.mock('../chartSetup', () => ({}))

function renderAt(patientId: string, measurementId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <PiiMaskProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={[`/patients/${patientId}/sessions/${measurementId}`]}>
                <Routes>
                  <Route path="/patients/:patientId/sessions/:measurementId" element={children} />
                  <Route path="/patients/:patientId" element={<div>patient-detail</div>} />
                  <Route path="/patients" element={<div>patient-list</div>} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </PiiMaskProvider>
        </LocaleProvider>
      </QueryClientProvider>
    )
  }
  return render(<SessionDetail />, { wrapper: Wrapper })
}

describe('SessionDetail', () => {
  let downloadSpy: ReturnType<typeof vi.fn>
  let originalCreate: typeof URL.createObjectURL | undefined
  let originalRevoke: typeof URL.revokeObjectURL | undefined
  beforeEach(() => {
    downloadSpy = vi.fn()
    // jsdom does not implement URL.createObjectURL; define a no-op then
    // spy. Replacing the whole URL global would break MSW URL parsing
    // (manifests as 'Network error' in unrelated tests).
    originalCreate = URL.createObjectURL
    originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock') as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(downloadSpy)
  })
  afterEach(() => {
    if (originalCreate) URL.createObjectURL = originalCreate
    else delete (URL as Partial<typeof URL>).createObjectURL
    if (originalRevoke) URL.revokeObjectURL = originalRevoke
    else delete (URL as Partial<typeof URL>).revokeObjectURL
    vi.restoreAllMocks()
  })

  it('renders patient header, chart, stats, and CSV button on happy path', async () => {
    renderAt('p001', '101')
    expect(
      await screen.findByRole('heading', { level: 1, name: /테스트환자A/ }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument()
    expect(screen.getByText('피크')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CSV 내려받기' })).toBeEnabled()
  })

  it('renders an EmptyState when the session has no data points', async () => {
    server.use(http.get('/api/v1/measurements/:id/data', () => HttpResponse.json([])))
    renderAt('p001', '101')
    expect(await screen.findByText('데이터가 없습니다')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CSV 내려받기' })).toBeDisabled()
  })

  it('renders an in-progress badge when the session endTime is null', async () => {
    renderAt('p001', '102')
    expect(await screen.findByText('측정 진행 중')).toBeInTheDocument()
  })

  it('routes to not-found EmptyState for an unknown measurementId', async () => {
    renderAt('p001', '99999')
    expect(await screen.findByText('세션을 찾을 수 없습니다')).toBeInTheDocument()
  })

  it('renders not-found for a non-numeric measurementId without firing a query', async () => {
    let dataCalls = 0
    server.use(
      http.get('/api/v1/measurements/:id/data', () => {
        dataCalls += 1
        return HttpResponse.json([])
      }),
    )
    renderAt('p001', 'abc')
    expect(await screen.findByText('세션을 찾을 수 없습니다')).toBeInTheDocument()
    expect(dataCalls).toBe(0)
  })

  it('triggers a CSV download via the temporary anchor when clicked', async () => {
    const user = userEvent.setup()
    renderAt('p001', '101')
    const button = await screen.findByRole('button', { name: 'CSV 내려받기' })
    await user.click(button)
    expect(downloadSpy).toHaveBeenCalledOnce()
  })
})
