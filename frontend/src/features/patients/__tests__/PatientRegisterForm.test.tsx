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
  await user.type(screen.getByLabelText('Patient ID'), 'p100')
  await user.type(screen.getByLabelText('Name'), '신환자')
  await user.type(screen.getByLabelText('Age'), '25')
  await user.selectOptions(screen.getByLabelText('Sex'), 'female')
  await user.type(screen.getByLabelText('Height (cm)'), '165')
  await user.type(screen.getByLabelText('Weight (kg)'), '55')
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
    await user.type(screen.getByLabelText('Patient ID'), 'p 100')
    await user.type(screen.getByLabelText('Name'), '신환자')
    await user.type(screen.getByLabelText('Age'), '25')
    await user.type(screen.getByLabelText('Height (cm)'), '165')
    await user.type(screen.getByLabelText('Weight (kg)'), '55')

    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Patient ID')).toHaveAttribute('aria-invalid', 'true')
    expect(postCount).toBe(0)
    expect(onDone).not.toHaveBeenCalled()
  })

  it('on success: shows success toast, clears form, calls onDone', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<PatientRegisterForm onDone={onDone} />, { wrapper: makeWrapper() })

    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(screen.getByText('Patient registered.')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('A record with this value already exists.')).toBeInTheDocument()
    expect(screen.queryByText(/p100/)).toBeNull()
    expect(onDone).not.toHaveBeenCalled()
  })
})
