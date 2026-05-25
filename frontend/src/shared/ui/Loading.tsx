import type { CSSProperties, HTMLAttributes } from 'react'

export type SpinnerProps = HTMLAttributes<HTMLSpanElement>

/** Inline spinner; sized by current font size (em-relative). */
export function Spinner({ className, ...rest }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={['spinner', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
}

/** Pulsing block placeholder for content-loading states. */
export function Skeleton({ width, height = '1em', style, ...rest }: SkeletonProps) {
  const composed: CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : (width ?? '100%'),
    height: typeof height === 'number' ? `${height}px` : height,
    ...style,
  }
  return <div className="skeleton" aria-hidden="true" style={composed} {...rest} />
}

export interface LoadingOverlayProps {
  message?: string
}

/**
 * Absolute-positioned overlay; expects the parent to be position: relative.
 * Use for page-area loading where you want to keep the underlying content
 * visible (greyed out) instead of a full-screen spinner.
 */
export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="loading-overlay" role="status">
      <Spinner aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
