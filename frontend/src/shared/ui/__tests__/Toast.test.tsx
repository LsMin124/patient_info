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

  it('dismissToast removes a toast and clears its pending timer', () => {
    function CloseButton({ id }: { id: string }) {
      const { dismissToast } = useToast()
      return (
        <button type="button" onClick={() => dismissToast(id)}>
          close
        </button>
      )
    }

    function Harness() {
      const { addToast, toasts } = useToast()
      return (
        <>
          <button type="button" onClick={() => addToast({ message: '취소가능' })}>
            add
          </button>
          {toasts.length > 0 && <CloseButton id={toasts[0]!.id} />}
        </>
      )
    }

    render(
      <ToastProvider defaultDurationMs={10_000}>
        <Harness />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('add').click()
    })
    expect(screen.getByText('취소가능')).toBeInTheDocument()

    act(() => {
      screen.getByText('close').click()
    })
    expect(screen.queryByText('취소가능')).toBeNull()

    // Advancing past the original duration must NOT re-trigger anything —
    // dismissToast should have cleared the timer.
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(screen.queryByText('취소가능')).toBeNull()
  })

  it('durationMs=0 means persist (no auto-dismiss)', () => {
    function Trigger() {
      const { addToast } = useToast()
      return (
        <button type="button" onClick={() => addToast({ message: '영구', durationMs: 0 })}>
          add
        </button>
      )
    }
    render(
      <ToastProvider defaultDurationMs={500}>
        <Trigger />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText('add').click()
    })
    expect(screen.getByText('영구')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('영구')).toBeInTheDocument()
  })
})
