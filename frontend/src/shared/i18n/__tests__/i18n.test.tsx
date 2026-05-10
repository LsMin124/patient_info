import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useT } from '../../hooks/useT'
import { LocaleProvider } from '../LocaleProvider'
import { t } from '../index'

const wrapper = ({ children }: { children: ReactNode }) => (
  <LocaleProvider>{children}</LocaleProvider>
)

describe('i18n.t (pure)', () => {
  it('looks up nested keys for ko', () => {
    expect(t('ko', 'app.title')).toBe('근기능 측정 대시보드')
    expect(t('ko', 'session.stats.peak')).toBe('피크')
  })

  it('looks up nested keys for en', () => {
    expect(t('en', 'app.title')).toBe('Strength Measurement Dashboard')
  })

  it('falls back to key path when missing in all locales', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = t('en', 'nonexistent.key' as any)
    expect(result).toBe('nonexistent.key')
    warn.mockRestore()
  })
})

describe('LocaleProvider + useT', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('defaults to ko when no stored locale', () => {
    const { result } = renderHook(() => useT(), { wrapper })
    expect(result.current.locale).toBe('ko')
    expect(result.current.t('app.title')).toBe('근기능 측정 대시보드')
  })

  it('reads en from localStorage', () => {
    window.localStorage.setItem('patientinfo:locale', 'en')
    const { result } = renderHook(() => useT(), { wrapper })
    expect(result.current.locale).toBe('en')
    expect(result.current.t('app.title')).toBe('Strength Measurement Dashboard')
  })

  it('setLocale persists', () => {
    const { result } = renderHook(() => useT(), { wrapper })
    act(() => {
      result.current.setLocale('en')
    })
    expect(result.current.locale).toBe('en')
    expect(window.localStorage.getItem('patientinfo:locale')).toBe('en')
  })

  it('useT outside LocaleProvider throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useT())).toThrow(/inside <LocaleProvider>/)
    spy.mockRestore()
  })

  it('locale change in one component re-renders sibling consumers', async () => {
    const user = userEvent.setup()
    function Reader({ id }: { id: string }) {
      const { t: tr } = useT()
      return <span data-testid={id}>{tr('app.title')}</span>
    }
    function Writer() {
      const { setLocale } = useT()
      return (
        <button type="button" onClick={() => setLocale('en')}>
          to en
        </button>
      )
    }

    render(
      <LocaleProvider>
        <Reader id="a" />
        <Reader id="b" />
        <Writer />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('a').textContent).toBe('근기능 측정 대시보드')
    expect(screen.getByTestId('b').textContent).toBe('근기능 측정 대시보드')

    await user.click(screen.getByRole('button', { name: 'to en' }))

    expect(screen.getByTestId('a').textContent).toBe('Strength Measurement Dashboard')
    expect(screen.getByTestId('b').textContent).toBe('Strength Measurement Dashboard')
  })
})
