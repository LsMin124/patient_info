import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ErrorFallback } from '../shared/ui/ErrorFallback'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional renderer override — defaults to the shared ErrorFallback. */
  fallback?: (error: unknown, reset: () => void) => ReactNode
  /** Side-effect for telemetry / external error reporters. Optional. */
  onError?: (error: unknown, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: unknown | null
}

/**
 * Top-level error boundary. Class component — React still requires this for
 * componentDidCatch even in 19.x. Resets via local state when the user clicks
 * the fallback's "다시 시도" button.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error !== null) {
      return this.props.fallback ? (
        this.props.fallback(error, this.reset)
      ) : (
        <ErrorFallback error={error} onReset={this.reset} />
      )
    }
    return this.props.children
  }
}
