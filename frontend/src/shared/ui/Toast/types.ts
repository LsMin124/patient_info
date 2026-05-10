export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  durationMs: number
}
