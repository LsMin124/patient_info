import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PiiMaskProvider, usePiiMask } from '../PiiMaskProvider'

const STORAGE_KEY = 'patientinfo:pii-mask'

function Display() {
  const { enabled, toggle, setEnabled } = usePiiMask()
  return (
    <>
      <output data-testid="state">{enabled ? 'on' : 'off'}</output>
      <button type="button" onClick={toggle} data-testid="toggle">
        toggle
      </button>
      <button type="button" onClick={() => setEnabled(true)} data-testid="on">
        on
      </button>
      <button type="button" onClick={() => setEnabled(false)} data-testid="off">
        off
      </button>
    </>
  )
}

describe('PiiMaskProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('defaults to off when localStorage is empty', () => {
    render(
      <PiiMaskProvider>
        <Display />
      </PiiMaskProvider>,
    )
    expect(screen.getByTestId('state').textContent).toBe('off')
  })

  it('hydrates from localStorage on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, '1')
    render(
      <PiiMaskProvider>
        <Display />
      </PiiMaskProvider>,
    )
    expect(screen.getByTestId('state').textContent).toBe('on')
  })

  it('toggle flips state and writes to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <PiiMaskProvider>
        <Display />
      </PiiMaskProvider>,
    )
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()

    await user.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('state').textContent).toBe('on')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1')

    await user.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('state').textContent).toBe('off')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('0')
  })

  it('setEnabled writes the explicit value', async () => {
    const user = userEvent.setup()
    render(
      <PiiMaskProvider>
        <Display />
      </PiiMaskProvider>,
    )
    await user.click(screen.getByTestId('on'))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1')
    await user.click(screen.getByTestId('off'))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('0')
  })

  it('syncs cross-tab via storage event', () => {
    render(
      <PiiMaskProvider>
        <Display />
      </PiiMaskProvider>,
    )
    expect(screen.getByTestId('state').textContent).toBe('off')

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '1' }))
    })
    expect(screen.getByTestId('state').textContent).toBe('on')

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '0' }))
    })
    expect(screen.getByTestId('state').textContent).toBe('off')
  })

  it('ignores storage events for unrelated keys', () => {
    window.localStorage.setItem(STORAGE_KEY, '1')
    render(
      <PiiMaskProvider>
        <Display />
      </PiiMaskProvider>,
    )
    expect(screen.getByTestId('state').textContent).toBe('on')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other-key', newValue: '0' }))
    })
    expect(screen.getByTestId('state').textContent).toBe('on')
  })

  it('throws when used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Display />)).toThrow(/usePiiMask/)
    spy.mockRestore()
  })
})
