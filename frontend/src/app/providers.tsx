import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { useTheme } from '../shared/hooks/useTheme'
import { ToastProvider } from '../shared/ui/Toast'

import { ErrorBoundary } from './ErrorBoundary'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Wraps the app in the four global providers in stable order:
 *   ErrorBoundary  — outermost so any provider failure is caught
 *   QueryClient    — server cache; lives for the app's lifetime
 *   ThemeBridge    — applies <html data-theme=...>
 *   ToastProvider  — innermost so any child component can dispatch toasts
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
        <ThemeBridge>
          <ToastProvider>{children}</ToastProvider>
        </ThemeBridge>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

function ThemeBridge({ children }: { children: ReactNode }) {
  // Mounting useTheme here applies <html data-theme>; consumers can also call
  // useTheme() directly to read/toggle.
  useTheme()
  return <>{children}</>
}
