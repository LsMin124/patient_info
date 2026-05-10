import { act, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { ToastProvider, useToast } from '../Toast'

function TriggerButton({ message }: { message: string }) {
  const { addToast } = useToast()
  return (
    <button type="button" onClick={() => addToast({ message })}>
      add
    </button>
  )
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('addToast appends a toast that the region renders', () => {
    render(
      <ToastProvider defaultDurationMs={1000}>
        <TriggerButton message="저장됨" />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText('add').click()
    })
    expect(screen.getByText('저장됨')).toBeInTheDocument()
  })

  it('auto-dismisses after the specified duration', () => {
    render(
      <ToastProvider defaultDurationMs={500}>
        <TriggerButton message="저장됨" />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText('add').click()
    })
    expect(screen.getByText('저장됨')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.queryByText('저장됨')).toBeNull()
  })

  it('throws when used outside ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TriggerButton message="x" />)).toThrow(/inside <ToastProvider>/)
    spy.mockRestore()
  })
})
