import type { CSSProperties } from 'react'

export interface ErrorFallbackProps {
  /** The thrown value, narrowed if you have a typed error envelope. */
  error: unknown
  /** Reset handler injected by the boundary; clears the captured error. */
  onReset: () => void
  /** Optional override for the user-facing title; defaults to a generic message. */
  title?: string
}

/**
 * Generic error UI rendered by the top-level ErrorBoundary. Stays presentation-
 * only — no router calls, no toast — so it can render even if React state is
 * compromised. ARIA role="alert" makes screen readers announce it immediately.
 */
export function ErrorFallback({ error, onReset, title }: ErrorFallbackProps) {
  const message = errorMessageOf(error)
  const heading = title ?? 'Something went wrong.'

  return (
    <div role="alert" style={containerStyle}>
      <h2 style={headingStyle}>{heading}</h2>
      <p style={messageStyle}>{message}</p>
      <button type="button" onClick={onReset} style={resetButtonStyle}>
        Retry
      </button>
    </div>
  )
}

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred.'
}

const containerStyle: CSSProperties = {
  padding: 'var(--space-5)',
  margin: 'var(--space-5)',
  border: '1px solid var(--color-danger)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-danger-bg)',
  color: 'var(--color-fg)',
  maxWidth: '36rem',
}

const headingStyle: CSSProperties = {
  margin: '0 0 var(--space-2) 0',
  fontSize: 'var(--text-xl)',
  fontWeight: 700,
}

const messageStyle: CSSProperties = {
  margin: '0 0 var(--space-4) 0',
  color: 'var(--color-fg-muted)',
}

const resetButtonStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-accent)',
  color: 'var(--color-accent-fg)',
  fontWeight: 600,
}
