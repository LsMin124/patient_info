import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Button } from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Optional override for the close button label, used in tests/aria. */
  closeLabel?: string
}

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog. Renders into a portal at document.body. Traps
 * focus within the dialog while open, restores focus to the previously-focused
 * element on close, and locks body scroll. ESC closes. Backdrop click closes.
 */
export function Modal({ isOpen, onClose, title, children, closeLabel = 'Close' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [isOpen, onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Defer focus to next frame to ensure the dialog is in the DOM.
    const id = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current
      const first = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      first?.focus()
    })

    return () => {
      window.cancelAnimationFrame(id)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal"
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <Button variant="ghost" onClick={onClose} aria-label={closeLabel}>
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
