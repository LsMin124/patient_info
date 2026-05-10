import { createContext } from 'react'

import type { Toast, ToastVariant } from './types'

export interface ToastContextValue {
  toasts: ReadonlyArray<Toast>
  addToast: (input: { message: string; variant?: ToastVariant; durationMs?: number }) => string
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
