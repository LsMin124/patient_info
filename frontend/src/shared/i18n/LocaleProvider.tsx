import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { DEFAULT_LOCALE, type Locale } from './index'

const STORAGE_KEY = 'patientinfo:locale'
const VALID_LOCALES: ReadonlyArray<Locale> = ['ko', 'en']

interface LocaleContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw && (VALID_LOCALES as ReadonlyArray<string>).includes(raw)) {
      return raw as Locale
    }
  } catch {
    // localStorage may be blocked (privacy mode); fall through
  }
  return DEFAULT_LOCALE
}

interface LocaleProviderProps {
  children: ReactNode
}

/**
 * Single locale source of truth for the whole tree. Without this, every
 * `useT()` call would manage its own state — toggling the locale in one
 * component would not propagate to other already-mounted components within
 * the same tab. The cross-tab sync via the 'storage' event lives here too.
 */
export function LocaleProvider({ children }: LocaleProviderProps) {
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

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocaleContext / useT must be used inside <LocaleProvider>')
  }
  return ctx
}
