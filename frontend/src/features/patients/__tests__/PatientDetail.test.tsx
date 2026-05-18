import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { PiiMaskProvider } from '../../../shared/hooks/PiiMaskProvider'
import { LocaleProvider } from '../../../shared/i18n/LocaleProvider'
import { server } from '../../../test/setup'
import { PatientDetail } from '../PatientDetail'

function renderAt(patientId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <PiiMaskProvider>
            <MemoryRouter initialEntries={[`/patients/${patientId}`]}>
              <Routes>
                <Route path="/patients/:patientId" element={children} />
                <Route path="/patients" element={<div>list</div>} />
              </Routes>
            </MemoryRouter>
          </PiiMaskProvider>
        </LocaleProvider>
      </QueryClientProvider>
    )
  }
  return render(<PatientDetail />, { wrapper: Wrapper })
}

describe('PatientDetail', () => {
  it('renders the matching patient card from the cached list', async () => {
    renderAt('p001')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('테스트환자A')
    // Wire-shape values rendered with units
    expect(screen.getByText('175 cm')).toBeInTheDocument()
    expect(screen.getByText('70 kg')).toBeInTheDocument()
  })

  it('shows a not-found EmptyState for unknown patientId', async () => {
    renderAt('unknown999')
    // Wait for the query to resolve so we leave the skeleton state
    expect(await screen.findByText('환자를 찾을 수 없습니다')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '환자 목록' })).toHaveAttribute('href', '/patients')
  })

  it('shows error fallback when the underlying list query fails', async () => {
    server.use(http.get('/api/v1/patients', () => HttpResponse.json({}, { status: 500 })))
    renderAt('p001')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
