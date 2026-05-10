import { useCallback, useEffect, useState } from 'react'

import { DEFAULT_LOCALE, t, type KeyPath, type Locale } from '../i18n'

const STORAGE_KEY = 'patientinfo:locale'
const VALID_LOCALES: ReadonlyArray<Locale> = ['ko', 'en']

function readStoredLocale(): Locale {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw && (VALID_LOCALES as ReadonlyArray<string>).includes(raw)) {
      return raw as Locale
    }
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE
}

export function useT() {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    setLocaleState(next)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const v = e.newValue
      if (v && (VALID_LOCALES as ReadonlyArray<string>).includes(v)) {
        setLocaleState(v as Locale)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const translate = useCallback((key: KeyPath) => t(locale, key), [locale])

  return { locale, setLocale, t: translate }
}
