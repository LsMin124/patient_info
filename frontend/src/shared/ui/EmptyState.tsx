import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: ReactNode
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
