import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider, useTheme } from '../ThemeProvider'

interface MockMediaQueryList {
  matches: boolean
  media: string
  onchange: null
  addEventListener: (type: string, listener: (e: MediaQueryListEvent) => void) => void
  removeEventListener: (type: string, listener: (e: MediaQueryListEvent) => void) => void
  addListener: (l: (e: MediaQueryListEvent) => void) => void
  removeListener: (l: (e: MediaQueryListEvent) => void) => void
  dispatchEvent: (e: MediaQueryListEvent) => boolean
}

let osPrefersDark = false
let registeredListener: ((e: MediaQueryListEvent) => void) | null = null

function makeMockMatchMedia() {
  return vi.fn().mockImplementation((q: string): MockMediaQueryList => {
    return {
      matches: q.includes('dark') ? osPrefersDark : !osPrefersDark,
      media: q,
      onchange: null,
      addEventListener: vi
        .fn()
        .mockImplementation((_: string, listener: (e: MediaQueryListEvent) => void) => {
          registeredListener = listener
        }),
      removeEventListener: vi.fn().mockImplementation(() => {
        registeredListener = null
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}

const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>

describe('ThemeProvider / useTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    window.localStorage.clear()
    osPrefersDark = false
    registeredListener = null
    vi.stubGlobal('matchMedia', makeMockMatchMedia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to light when no stored value and OS prefers light', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('reads stored value over OS preference', () => {
    window.localStorage.setItem('patientinfo:theme', 'dark')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('dark')
  })

  it('toggleTheme persists to localStorage and reflects on <html>', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('patientinfo:theme')).toBe('dark')
  })

  it('OS preference change updates state when user has not set a theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('light')

    act(() => {
      registeredListener?.({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current.theme).toBe('dark')
  })

  it('OS preference change does NOT override an explicit user choice', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('light')
    })
    expect(result.current.theme).toBe('light')

    act(() => {
      registeredListener?.({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current.theme).toBe('light')
  })

  it('throws when useTheme is called outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useTheme())).toThrow(/inside <ThemeProvider>/)
    spy.mockRestore()
  })

  it('two consumers in the same tree share state', async () => {
    const user = userEvent.setup()
    function Reader({ id }: { id: string }) {
      const { theme } = useTheme()
      return <span data-testid={id}>{theme}</span>
    }
    function Writer() {
      const { toggleTheme } = useTheme()
      return (
        <button type="button" onClick={toggleTheme}>
          toggle
        </button>
      )
    }

    render(
      <ThemeProvider>
        <Reader id="a" />
        <Reader id="b" />
        <Writer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('a').textContent).toBe('light')
    expect(screen.getByTestId('b').textContent).toBe('light')

    await user.click(screen.getByRole('button', { name: 'toggle' }))

    expect(screen.getByTestId('a').textContent).toBe('dark')
    expect(screen.getByTestId('b').textContent).toBe('dark')
  })
})
