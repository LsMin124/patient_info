import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '../../../shared/i18n/LocaleProvider'
import { ToastProvider } from '../../../shared/ui/Toast'
import { server } from '../../../test/setup'
import { PatientRegisterForm } from '../PatientRegisterForm'

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
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </QueryClientProvider>
    )
  }
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('환자 ID'), 'p100')
  await user.type(screen.getByLabelText('이름'), '신환자')
  await user.type(screen.getByLabelText('나이'), '25')
  await user.selectOptions(screen.getByLabelText('성별'), 'female')
  await user.type(screen.getByLabelText('키 (cm)'), '165')
  await user.type(screen.getByLabelText('체중 (kg)'), '55')
}

describe('PatientRegisterForm', () => {
  it('publishes inline field errors on invalid input without calling the API', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    let postCount = 0
    server.use(
      http.post('/api/v1/patients', () => {
        postCount += 1
        return HttpResponse.json({ ok: true }, { status: 201 })
      }),
    )

    render(<PatientRegisterForm onDone={onDone} />, { wrapper: makeWrapper() })

    // Invalid: spaces are not allowed in patientId
    await user.type(screen.getByLabelText('환자 ID'), 'p 100')
    await user.type(screen.getByLabelText('이름'), '신환자')
    await user.type(screen.getByLabelText('나이'), '25')
    await user.type(screen.getByLabelText('키 (cm)'), '165')
    await user.type(screen.getByLabelText('체중 (kg)'), '55')

    await user.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('환자 ID')).toHaveAttribute('aria-invalid', 'true')
    expect(postCount).toBe(0)
    expect(onDone).not.toHaveBeenCalled()
  })

  it('on success: shows success toast, clears form, calls onDone', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<PatientRegisterForm onDone={onDone} />, { wrapper: makeWrapper() })

    await fillValid(user)
    await user.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(screen.getByText('환자가 등록되었습니다.')).toBeInTheDocument()
  })

  it('on backend rejection: shows sanitized error toast (no leak of raw server message)', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    server.use(
      http.post('/api/v1/patients', () =>
        HttpResponse.json({ error: 'Patient ID already exists: p100' }, { status: 409 }),
      ),
    )

    render(<PatientRegisterForm onDone={onDone} />, { wrapper: makeWrapper() })
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByText('이미 존재하는 데이터입니다.')).toBeInTheDocument()
    expect(screen.queryByText(/p100/)).toBeNull()
    expect(onDone).not.toHaveBeenCalled()
  })
})
