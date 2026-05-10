import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { t } from '../index'

describe('i18n.t', () => {
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

describe('useT', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('defaults to ko when no stored locale', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useT } = await import('../../hooks/useT')
    const { result } = renderHook(() => useT())
    expect(result.current.locale).toBe('ko')
    expect(result.current.t('app.title')).toBe('근기능 측정 대시보드')
  })

  it('reads en from localStorage', async () => {
    window.localStorage.setItem('patientinfo:locale', 'en')
    const { renderHook } = await import('@testing-library/react')
    const { useT } = await import('../../hooks/useT')
    const { result } = renderHook(() => useT())
    expect(result.current.locale).toBe('en')
    expect(result.current.t('app.title')).toBe('Strength Measurement Dashboard')
  })

  it('setLocale persists', async () => {
    const { act, renderHook } = await import('@testing-library/react')
    const { useT } = await import('../../hooks/useT')
    const { result } = renderHook(() => useT())
    act(() => {
      result.current.setLocale('en')
    })
    expect(result.current.locale).toBe('en')
    expect(window.localStorage.getItem('patientinfo:locale')).toBe('en')
  })
})
