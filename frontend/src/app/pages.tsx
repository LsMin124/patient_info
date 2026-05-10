import { Link } from 'react-router-dom'

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
  const { t } = useT()
  return (
    <div>
      <h1>{t('patient.list.title')}</h1>
      <EmptyState
        title={t('patient.list.empty')}
        description="Phase 3에서 환자 목록·검색·등록 기능이 추가됩니다."
      />
    </div>
  )
}

export function PatientDetailPage() {
  return (
    <div>
      <h1>환자 상세</h1>
      <EmptyState title="준비 중" description="Phase 3 T21에서 구현됩니다." />
    </div>
  )
}

export function SessionDetailPage() {
  return (
    <div>
      <h1>세션 상세</h1>
      <EmptyState title="준비 중" description="Phase 4 T27에서 구현됩니다." />
    </div>
  )
}

export function SessionComparePage() {
  return (
    <div>
      <h1>세션 비교</h1>
      <EmptyState title="준비 중" description="Phase 5 T28에서 구현됩니다." />
    </div>
  )
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
  const path = window.location.pathname
  return (
    <div role="alert" style={{ textAlign: 'center', padding: 'var(--space-7) var(--space-5)' }}>
      <h1>{t('notFound.title')}</h1>
      <p style={{ margin: 'var(--space-3) 0', color: 'var(--color-fg-muted)' }}>
        {t('notFound.description')}
      </p>
      <p style={{ marginBottom: 'var(--space-5)', color: 'var(--color-fg-subtle)' }}>
        <code>{path}</code>
      </p>
      <Link to="/">
        <Button variant="primary">{t('notFound.home')}</Button>
      </Link>
    </div>
  )
}
