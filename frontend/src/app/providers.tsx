import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { PiiMaskProvider } from '../shared/hooks/PiiMaskProvider'
import { ThemeProvider } from '../shared/hooks/ThemeProvider'
import { useT } from '../shared/hooks/useT'
import { LocaleProvider } from '../shared/i18n/LocaleProvider'
import { ToastProvider } from '../shared/ui/Toast'

import { ErrorBoundary } from './ErrorBoundary'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Global provider stack (outer → inner):
 *   ErrorBoundary       — outermost so any provider failure is caught
 *   QueryClientProvider — server cache; lives for the app's lifetime
 *   ThemeProvider       — single theme state (applies <html data-theme=...>)
 *   LocaleProvider      — single locale state (re-renders all useT consumers)
 *   PiiMaskProvider     — patient-PII masking toggle (Phase 6)
 *   ToastProvider       — innermost so any child component can dispatch toasts
 *
 * Theme/Locale/PiiMask each persist to localStorage and sync across tabs
 * via the 'storage' event. Lifting state into Context fixes the
 * cross-component desync surfaced in the post-Phase-2 review.
 */
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <PiiMaskProvider>
              <LocalizedToastProvider>{children}</LocalizedToastProvider>
            </PiiMaskProvider>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

/**
 * Inner wrapper so the live-region aria-label is locale-aware. Lives inside
 * LocaleProvider so useT() resolves; ToastProvider stays standalone-friendly
 * for unit tests via its default regionLabel.
 */
function LocalizedToastProvider({ children }: { children: ReactNode }) {
  const { t } = useT()
  return <ToastProvider regionLabel={t('common.notifications')}>{children}</ToastProvider>
}
