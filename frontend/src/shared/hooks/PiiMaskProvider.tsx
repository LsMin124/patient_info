import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'patientinfo:pii-mask'

interface PiiMaskContextValue {
  enabled: boolean
  setEnabled: (next: boolean) => void
  toggle: () => void
}

const PiiMaskContext = createContext<PiiMaskContextValue | null>(null)

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Single source of truth for the "PII 마스킹" toggle. Persists to
 * localStorage and syncs across tabs via storage event. Default: off
 * (the everyday clinical view shows names in the clear).
 */
export function PiiMaskProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(readStored)

  const setEnabled = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
    setEnabledState(next)
  }, [])

  const toggle = useCallback(() => {
    setEnabledState((v) => {
      const next = !v
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setEnabledState(e.newValue === '1')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<PiiMaskContextValue>(
    () => ({ enabled, setEnabled, toggle }),
    [enabled, setEnabled, toggle],
  )

  return <PiiMaskContext.Provider value={value}>{children}</PiiMaskContext.Provider>
}

export function usePiiMask(): PiiMaskContextValue {
  const ctx = useContext(PiiMaskContext)
  if (!ctx) {
    throw new Error('usePiiMask must be used inside <PiiMaskProvider>')
  }
  return ctx
}
