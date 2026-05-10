import { useCallback } from 'react'

import { t, type KeyPath } from '../i18n'
import { useLocaleContext } from '../i18n/LocaleProvider'

/**
 * App-wide translation hook. Returns the current locale, a setter, and a
 * `t(key)` function bound to the locale. State is shared via LocaleContext
 * so a setLocale call in one component re-renders every consumer in the
 * same tab.
 */
export function useT() {
  const { locale, setLocale } = useLocaleContext()
  const translate = useCallback((key: KeyPath) => t(locale, key), [locale])
  return { locale, setLocale, t: translate }
}
