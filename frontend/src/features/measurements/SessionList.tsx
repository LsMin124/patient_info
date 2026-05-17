import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useT } from '../../shared/hooks/useT'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Skeleton } from '../../shared/ui/Loading'

import type { MeasurementSummary } from './schema'
import { useSessionsQuery } from './useMeasurements'

import './session-list.css'

interface SessionListProps {
  patientId: string
}

const SEOUL_TZ = 'Asia/Seoul'
const dateFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: SEOUL_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Per-patient session timeline. Reads from the cached useSessionsQuery and
 * renders sessions in startTime-descending order. In-progress sessions
 * (endTime === null) carry a visible "측정 진행 중" label and a different
 * accent so operators don't mistake them for finalized data — see
 * IMPL_SPEC §7.7.
 *
 * Multi-select state lives in this component; on confirm the user is
 * navigated to /sessions/compare?ids=... (Phase 5 T28 builds that page).
 * For now the compare button is rendered but routes to the placeholder.
 */
export function SessionList({ patientId }: SessionListProps) {
  const { t } = useT()
  const query = useSessionsQuery(patientId)
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())

  const sortedSessions = useMemo(() => {
    const rows = query.data ?? []
    return [...rows].sort((a, b) => b.startTime.localeCompare(a.startTime))
  }, [query.data])

  if (query.isLoading) {
    return (
      <div
        className="session-list__skeletons"
        role="status"
        aria-live="polite"
        aria-label={t('common.loading')}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="3rem" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorFallback
        error={query.error}
        onReset={() => query.refetch()}
        title={t('common.error')}
      />
    )
  }
  if (sortedSessions.length === 0) {
    return <EmptyState title={t('session.list.empty')} description={t('session.list.emptyHint')} />
  }

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="session-list" aria-label={t('session.list.title')}>
      <ul className="session-list__rows">
        {sortedSessions.map((s) => (
          <SessionRow
            key={s.measurementId}
            patientId={patientId}
            session={s}
            isSelected={selected.has(s.measurementId)}
            onToggle={() => toggle(s.measurementId)}
          />
        ))}
      </ul>
      {selected.size >= 2 && (
        <nav className="session-list__compare" aria-label="compare">
          {/*
            The `?ids=` payload is built from server-trusted measurementId
            integers. The Phase 5 compare page MUST re-validate each
            segment (regex /^\d{1,15}$/ + positive-integer guard, cap
            array length to <= 4) because the same URL can be crafted by
            hand. See post-Phase-4 security review note.
          */}
          <Link to={`/sessions/compare?ids=${[...selected].sort((a, b) => a - b).join(',')}`}>
            <Button>{`선택한 ${selected.size}개 비교`}</Button>
          </Link>
        </nav>
      )}
    </section>
  )
}

interface SessionRowProps {
  patientId: string
  session: MeasurementSummary
  isSelected: boolean
  onToggle: () => void
}

function SessionRow({ patientId, session, isSelected, onToggle }: SessionRowProps) {
  const { t } = useT()
  const inProgress = session.endTime === null
  return (
    <li className={`session-list__row${inProgress ? ' session-list__row--in-progress' : ''}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        aria-label={`세션 ${session.measurementId} 비교 선택`}
        className="session-list__check"
      />
      <Link
        to={`/patients/${patientId}/sessions/${session.measurementId}`}
        className="session-list__link"
      >
        <span className="session-list__time">{formatStart(session.startTime)}</span>
        <span className="session-list__memo">{session.memo ?? t('session.list.noMemo')}</span>
        {inProgress && <span className="session-list__badge">{t('session.list.inProgress')}</span>}
      </Link>
    </li>
  )
}

function formatStart(iso: string): string {
  // The wire is a LocalDateTime without timezone. The backend's JDBC URL
  // pins server timezone to Asia/Seoul, so we render in the same zone.
  const date = new Date(`${iso}+09:00`)
  if (Number.isNaN(date.valueOf())) return iso
  return dateFmt.format(date)
}
