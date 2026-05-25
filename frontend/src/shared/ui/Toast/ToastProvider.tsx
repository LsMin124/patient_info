import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { ToastContext, type ToastContextValue } from './ToastContext'
import type { Toast } from './types'

const DEFAULT_DURATION_MS = 4000

interface ToastProviderProps {
  children: ReactNode
  defaultDurationMs?: number
  /**
   * Accessible label for the live-region. Default '알림' keeps the provider
   * usable standalone (e.g. in unit tests without a LocaleProvider). The
   * app-level wiring in `app/providers.tsx` passes the locale-aware value
   * via `t('common.notifications')` so screen readers see the right language.
   */
  regionLabel?: string
}

export function ToastProvider({
  children,
  defaultDurationMs = DEFAULT_DURATION_MS,
  regionLabel = 'Notifications',
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback<ToastContextValue['addToast']>(
    ({ message, variant = 'info', durationMs }) => {
      counterRef.current += 1
      const id = `toast-${counterRef.current}-${Date.now()}`
      const effective = durationMs ?? defaultDurationMs
      setToasts((prev) => [...prev, { id, message, variant, durationMs: effective }])
      if (effective > 0) {
        const timer = setTimeout(() => dismissToast(id), effective)
        timersRef.current.set(id, timer)
      }
      return id
    },
    [defaultDurationMs, dismissToast],
  )

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, addToast, dismissToast }),
    [toasts, addToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-live="polite" aria-label={regionLabel}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.variant}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
