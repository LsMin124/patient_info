import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { LocaleProvider } from '../../../shared/i18n/LocaleProvider'
import { ToastProvider } from '../../../shared/ui/Toast'
import { server } from '../../../test/setup'
import { PatientList } from '../PatientList'
import type { Patient } from '../schema'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <ToastProvider>
            <MemoryRouter>{children}</MemoryRouter>
          </ToastProvider>
        </LocaleProvider>
      </QueryClientProvider>
    )
  }
}

const seed = (over: Partial<Patient>): Patient => ({
  id: 1,
  patientId: 'p001',
  name: '테스트환자A',
  age: 30,
  sex: 'male',
  height: 175,
  weight: 70,
  ...over,
})

describe('PatientList', () => {
  it('renders rows from the API once loaded', async () => {
    render(<PatientList />, { wrapper: makeWrapper() })
    expect(await screen.findByRole('link', { name: 'p001' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'p002' })).toBeInTheDocument()
  })

  it('renders empty state when the API returns no rows', async () => {
    server.use(http.get('/api/v1/patients', () => HttpResponse.json([])))
    render(<PatientList />, { wrapper: makeWrapper() })
    expect(await screen.findByText('등록된 환자가 없습니다.')).toBeInTheDocument()
  })

  it('renders error fallback on API failure with retry button', async () => {
    server.use(http.get('/api/v1/patients', () => HttpResponse.json({}, { status: 500 })))
    render(<PatientList />, { wrapper: makeWrapper() })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('debounced search filters rows after the delay', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/v1/patients', () =>
        HttpResponse.json([
          seed({ id: 1, patientId: 'p001', name: '김민준' }),
          seed({ id: 2, patientId: 'p002', name: '이서연' }),
        ]),
      ),
    )
    render(<PatientList />, { wrapper: makeWrapper() })
    await screen.findByRole('link', { name: 'p001' })

    await user.type(screen.getByLabelText('이름 또는 ID로 검색'), '서연')
    await waitFor(
      () => {
        expect(screen.queryByRole('link', { name: 'p001' })).toBeNull()
      },
      { timeout: 1000 },
    )
    expect(screen.getByRole('link', { name: 'p002' })).toBeInTheDocument()
  })

  it('paginates a 30-row dataset into pages of 25', async () => {
    const many: Patient[] = Array.from({ length: 30 }, (_, i) =>
      seed({ id: i + 1, patientId: `p${String(i + 1).padStart(3, '0')}`, name: `이름${i + 1}` }),
    )
    server.use(http.get('/api/v1/patients', () => HttpResponse.json(many)))

    const user = userEvent.setup()
    render(<PatientList />, { wrapper: makeWrapper() })
    await screen.findByText(/1 \/ 2/)

    // Default sort is registered (newest first), so first page contains rows 30..6
    expect(screen.getByRole('link', { name: 'p030' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'p001' })).toBeNull()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText(/2 \/ 2/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'p001' })).toBeInTheDocument()
  })
})
