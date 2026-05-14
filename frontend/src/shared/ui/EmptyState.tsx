import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: ReactNode
  /**
   * Supplementary copy. Pass plain text or trusted React nodes only —
   * NEVER `dangerouslySetInnerHTML` or unsanitized HTML strings. Anything
   * sourced from user input or URL params must be validated/escaped at
   * the call site (see `PatientDetail.tsx` for the patientId regex guard).
   */
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}

/**
 * Standard empty/no-data placeholder. Use whenever a query returns 0 results
 * (e.g. patient list with no matches, session list before first measurement).
 */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      {icon}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
      {action}
    </div>
  )
}
