import { Link, useLocation } from 'react-router-dom'

import { SessionCompare } from '../features/measurements/SessionCompare'
import { SessionDetail } from '../features/measurements/SessionDetail'
import { PatientDetail } from '../features/patients/PatientDetail'
import { PatientList } from '../features/patients/PatientList'
import { useT } from '../shared/hooks/useT'
import { Button } from '../shared/ui/Button'
import { EmptyState } from '../shared/ui/EmptyState'

/**
 * Phase 2 placeholders. Real implementations land in Phase 3 (T19–T21:
 * patients) and Phase 4–5 (T22–T28: sessions). Each placeholder renders an
 * EmptyState so the layout looks finished and screen readers announce the
 * page name correctly even before content arrives.
 */

export function DashboardPage() {
  const { t } = useT()
  return (
    <div>
      <h1>{t('nav.dashboard')}</h1>
      <EmptyState
        title="대시보드 준비 중"
        description="Phase 3 이후에 최근 측정 요약이 여기에 표시됩니다."
      />
    </div>
  )
}

export function PatientsPage() {
  return <PatientList />
}

export function PatientDetailPage() {
  return <PatientDetail />
}

export function SessionDetailPage() {
  return <SessionDetail />
}

export function SessionComparePage() {
  return <SessionCompare />
}

export function SettingsPage() {
  const { t } = useT()
  return (
    <div>
      <h1>{t('nav.settings')}</h1>
      <EmptyState title="준비 중" description="언어·테마 토글이 추가됩니다." />
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useT()
  // useLocation() reads the in-context path so MemoryRouter-driven tests
  // (and any future SSR snapshot) reflect the actual route under test
  // instead of the hosting frame's window.location.pathname.
  const { pathname } = useLocation()
  return (
    <div role="alert" style={{ textAlign: 'center', padding: 'var(--space-7) var(--space-5)' }}>
      <h1>{t('notFound.title')}</h1>
      <p style={{ margin: 'var(--space-3) 0', color: 'var(--color-fg-muted)' }}>
        {t('notFound.description')}
      </p>
      <p style={{ marginBottom: 'var(--space-5)', color: 'var(--color-fg-subtle)' }}>
        <code>{pathname}</code>
      </p>
      <Link to="/">
        <Button variant="primary">{t('notFound.home')}</Button>
      </Link>
    </div>
  )
}
