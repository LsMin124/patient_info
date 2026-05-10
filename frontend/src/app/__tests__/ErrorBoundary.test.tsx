import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'

import { ErrorBoundary } from '../ErrorBoundary'

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('test failure')
  }
  return <span>no error</span>
}

function Toggle() {
  const [shouldThrow, setShouldThrow] = useState(true)
  return (
    <ErrorBoundary>
      <button type="button" onClick={() => setShouldThrow(false)}>
        clear
      </button>
      <Boom shouldThrow={shouldThrow} />
    </ErrorBoundary>
  )
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('no error')).toBeInTheDocument()
  })

  it('renders fallback on thrown error and shows the message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('test failure')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('reset button keeps showing fallback when child still throws', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Toggle />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('calls onError telemetry handler when an error is caught', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(onError).toHaveBeenCalledOnce()
    const [errArg] = onError.mock.calls[0]!
    expect(errArg).toBeInstanceOf(Error)
    spy.mockRestore()
  })
})
