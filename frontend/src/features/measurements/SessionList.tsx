import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useT } from '../../shared/hooks/useT'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Skeleton } from '../../shared/ui/Loading'

import { groupIntoVisits, type Visit } from './lib/visits'
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
 * Per-patient visit timeline. Sessions are grouped into visits — flexion +
 * extension as one clinical set (see IMPL_SPEC §8.14). Each visit card
 * carries a single checkbox; selecting two visits navigates to
 * /sessions/compare?ids=oldFlex,oldExt,newFlex,newExt which renders the
 * paired figure (flex-vs-flex stacked over ext-vs-ext).
 */
export function SessionList({ patientId }: SessionListProps) {
  const { t } = useT()
  const query = useSessionsQuery(patientId)
  const [selectedVisit, setSelectedVisit] = useState<ReadonlySet<number>>(new Set())

  // Newest visit first for the UI. Order doesn't affect the visitNumber
  // which is assigned chronologically by groupIntoVisits.
  const visitsDesc = useMemo(() => {
    const visits = groupIntoVisits(query.data ?? [])
    return [...visits].sort((a, b) => b.visitNumber - a.visitNumber)
  }, [query.data])

  if (query.isLoading) {
    return (
      <div
        className="session-list__skeletons"
        role="status"
        aria-live="polite"
        aria-label={t('common.loading')}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="4.5rem" />
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
  if (visitsDesc.length === 0) {
    return <EmptyState title={t('session.list.empty')} description={t('session.list.emptyHint')} />
  }

  const toggleVisit = (visitNumber: number) => {
    setSelectedVisit((prev) => {
      const next = new Set(prev)
      if (next.has(visitNumber)) next.delete(visitNumber)
      else next.add(visitNumber)
      return next
    })
  }

  const selectedComplete = [...selectedVisit]
    .map((vn) => visitsDesc.find((v) => v.visitNumber === vn))
    .filter((v): v is Visit => v !== undefined && v.extension !== null)
  const canCompare = selectedComplete.length === 2
  const idsForCompare = canCompare
    ? selectedComplete
        .sort((a, b) => a.visitNumber - b.visitNumber)
        .flatMap((v) => [v.flexion.measurementId, v.extension!.measurementId])
        .join(',')
    : ''

  return (
    <section className="session-list" aria-label={t('session.list.title')}>
      <ul className="session-list__visits">
        {visitsDesc.map((v) => (
          <VisitCard
            key={v.visitNumber}
            patientId={patientId}
            visit={v}
            isSelected={selectedVisit.has(v.visitNumber)}
            onToggle={() => toggleVisit(v.visitNumber)}
          />
        ))}
      </ul>
      {selectedVisit.size > 0 && (
        <nav className="session-list__compare" aria-label="compare">
          {canCompare ? (
            <Link to={`/sessions/compare?ids=${idsForCompare}`}>
              <Button>
                {t('session.list.compareSelected').replace(
                  '{count}',
                  String(selectedComplete.length),
                )}
              </Button>
            </Link>
          ) : (
            <span className="session-list__compare-hint" role="status">
              {t('session.list.visitNeedExactlyTwoHint')}
            </span>
          )}
        </nav>
      )}
    </section>
  )
}

interface VisitCardProps {
  patientId: string
  visit: Visit
  isSelected: boolean
  onToggle: () => void
}

function VisitCard({ patientId, visit, isSelected, onToggle }: VisitCardProps) {
  const { t } = useT()
  const visitTitle = t('session.list.visitLabel').replace('{n}', String(visit.visitNumber))
  const partial = visit.extension === null

  return (
    <li className={`session-list__visit${isSelected ? ' session-list__visit--selected' : ''}`}>
      <label className="session-list__visit-header">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          aria-label={t('session.list.compareSelectAria').replace(
            '{id}',
            String(visit.visitNumber),
          )}
          disabled={partial}
        />
        <span className="session-list__visit-number">{visitTitle}</span>
        <time className="session-list__visit-date" dateTime={visit.startTime}>
          {formatStart(visit.startTime)}
        </time>
        {partial && (
          <span className="session-list__visit-partial">{t('session.list.partialVisit')}</span>
        )}
      </label>
      <div className="session-list__visit-rows">
        <VisitMotionRow
          patientId={patientId}
          session={visit.flexion}
          motion="flexion"
          label={t('session.pair.flexion')}
        />
        {visit.extension && (
          <VisitMotionRow
            patientId={patientId}
            session={visit.extension}
            motion="extension"
            label={t('session.pair.extension')}
          />
        )}
      </div>
    </li>
  )
}

interface VisitMotionRowProps {
  patientId: string
  session: { measurementId: number; endTime: string | null; memo: string | null }
  motion: 'flexion' | 'extension'
  label: string
}

function VisitMotionRow({ patientId, session, motion, label }: VisitMotionRowProps) {
  const { t } = useT()
  const inProgress = session.endTime === null
  return (
    <Link
      to={`/patients/${patientId}/sessions/${session.measurementId}`}
      className={`session-list__motion session-list__motion--${motion}`}
    >
      <span className={`session-list__pair session-list__pair--${motion}`}>{label}</span>
      <span className="session-list__memo">{session.memo ?? t('session.list.noMemo')}</span>
      {inProgress && <span className="session-list__badge">{t('session.list.inProgress')}</span>}
    </Link>
  )
}

function formatStart(iso: string): string {
  // The wire is a LocalDateTime without timezone. The backend's JDBC URL
  // pins server timezone to Asia/Seoul, so we render in the same zone.
  const date = new Date(`${iso}+09:00`)
  if (Number.isNaN(date.valueOf())) return iso
  return dateFmt.format(date)
}
