import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useT } from '../../shared/hooks/useT'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Skeleton } from '../../shared/ui/Loading'

import { MAX_COMPARE_IDS } from './lib/compareIds'
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
 * Per-patient session timeline grouped into visits (flexion + extension as
 * one clinical set — see IMPL_SPEC §8.14). Selection is at the MEASUREMENT
 * level, not the visit level: each motion row has its own checkbox so
 * legacy / unpaired data (e.g. a clinic that recorded individual single
 * measurements before adopting the flex/ext protocol) can still be
 * compared two-by-two. The visit-level checkbox is a convenience that
 * toggles every measurement in that visit at once.
 *
 * Compare routing (see SessionCompare):
 *   - 2 ids → ComparisonFigure (single-motion hero)
 *   - 4 ids forming 2 complete visits → VisitComparison (stacked hero)
 *   - 3 ids OR 4 ids not pairing cleanly → multi-overlay table
 */
export function SessionList({ patientId }: SessionListProps) {
  const { t } = useT()
  const query = useSessionsQuery(patientId)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(new Set())

  // Newest visit first for the UI; visitNumber itself is assigned
  // chronologically (1 = earliest).
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

  const toggleMeasurement = (mid: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(mid)) next.delete(mid)
      else if (next.size < MAX_COMPARE_IDS) next.add(mid)
      return next
    })
  }

  // Build the URL: ids ordered oldest-first so SessionCompare's visit-pair
  // detection (baselineVisit = older, followupVisit = newer) lines up
  // automatically when the user picked two complete visits.
  const allChronological = (query.data ?? [])
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const idsForCompare = allChronological
    .map((s) => s.measurementId)
    .filter((mid) => selectedIds.has(mid))
  const canCompare = idsForCompare.length >= 2 && idsForCompare.length <= MAX_COMPARE_IDS

  return (
    <section className="session-list" aria-label={t('session.list.title')}>
      <ul className="session-list__visits">
        {visitsDesc.map((v) => (
          <VisitCard
            key={v.visitNumber}
            patientId={patientId}
            visit={v}
            selectedIds={selectedIds}
            onToggleMeasurement={toggleMeasurement}
            maxReached={selectedIds.size >= MAX_COMPARE_IDS}
          />
        ))}
      </ul>
      {selectedIds.size > 0 && (
        <nav className="session-list__compare" aria-label="compare">
          {canCompare ? (
            <Link to={`/sessions/compare?ids=${idsForCompare.join(',')}`}>
              <Button>
                {t('session.list.compareSelected').replace('{count}', String(idsForCompare.length))}
              </Button>
            </Link>
          ) : (
            <span className="session-list__compare-hint" role="status">
              {t('session.list.selectSessionsHint')}
            </span>
          )}
        </nav>
      )}
      {selectedIds.size === 0 && (
        <p className="session-list__compare-hint" role="note">
          {t('session.list.selectSessionsHint')}
        </p>
      )}
    </section>
  )
}

interface VisitCardProps {
  patientId: string
  visit: Visit
  selectedIds: ReadonlySet<number>
  onToggleMeasurement: (mid: number) => void
  maxReached: boolean
}

function VisitCard({
  patientId,
  visit,
  selectedIds,
  onToggleMeasurement,
  maxReached,
}: VisitCardProps) {
  const { t } = useT()
  const visitTitle = t('session.list.visitLabel').replace('{n}', String(visit.visitNumber))
  const partial = visit.extension === null

  const visitMids = partial
    ? [visit.flexion.measurementId]
    : [visit.flexion.measurementId, visit.extension!.measurementId]
  const allSelected = visitMids.every((mid) => selectedIds.has(mid))
  const anySelected = visitMids.some((mid) => selectedIds.has(mid))
  // "Select both" — if all currently selected, deselect all; otherwise
  // select the ones that aren't already (respecting max cap).
  const toggleVisitGroup = () => {
    if (allSelected) {
      visitMids.forEach((mid) => onToggleMeasurement(mid))
    } else {
      visitMids.filter((mid) => !selectedIds.has(mid)).forEach((mid) => onToggleMeasurement(mid))
    }
  }
  const cardSelected = anySelected

  return (
    <li className={`session-list__visit${cardSelected ? ' session-list__visit--selected' : ''}`}>
      <div className="session-list__visit-header">
        <input
          type="checkbox"
          className="session-list__visit-checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = anySelected && !allSelected
          }}
          onChange={toggleVisitGroup}
          aria-label={t('session.list.compareSelectAria').replace(
            '{id}',
            String(visit.visitNumber),
          )}
        />
        <span className="session-list__visit-number">{visitTitle}</span>
        <time className="session-list__visit-date" dateTime={visit.startTime}>
          {formatStart(visit.startTime)}
        </time>
        {partial && (
          <span className="session-list__visit-partial">{t('session.list.partialVisit')}</span>
        )}
      </div>
      <div className="session-list__visit-rows">
        <VisitMotionRow
          patientId={patientId}
          session={visit.flexion}
          motion="flexion"
          label={t('session.pair.flexion')}
          isSelected={selectedIds.has(visit.flexion.measurementId)}
          maxReached={maxReached}
          onToggle={() => onToggleMeasurement(visit.flexion.measurementId)}
        />
        {visit.extension && (
          <VisitMotionRow
            patientId={patientId}
            session={visit.extension}
            motion="extension"
            label={t('session.pair.extension')}
            isSelected={selectedIds.has(visit.extension.measurementId)}
            maxReached={maxReached}
            onToggle={() => onToggleMeasurement(visit.extension!.measurementId)}
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
  isSelected: boolean
  maxReached: boolean
  onToggle: () => void
}

function VisitMotionRow({
  patientId,
  session,
  motion,
  label,
  isSelected,
  maxReached,
  onToggle,
}: VisitMotionRowProps) {
  const { t } = useT()
  const inProgress = session.endTime === null
  return (
    <div
      className={`session-list__motion session-list__motion--${motion}${isSelected ? ' session-list__motion--selected' : ''}`}
    >
      <input
        type="checkbox"
        className="session-list__motion-checkbox"
        checked={isSelected}
        disabled={!isSelected && maxReached}
        onChange={onToggle}
        aria-label={t('session.list.sessionSelectAria').replace(
          '{id}',
          String(session.measurementId),
        )}
      />
      <Link
        to={`/patients/${patientId}/sessions/${session.measurementId}`}
        className="session-list__motion-link"
      >
        <span className={`session-list__pair session-list__pair--${motion}`}>{label}</span>
        <span className="session-list__motion-id">#{session.measurementId}</span>
        <span className="session-list__memo">{session.memo ?? t('session.list.noMemo')}</span>
        {inProgress && <span className="session-list__badge">{t('session.list.inProgress')}</span>}
      </Link>
    </div>
  )
}

function formatStart(iso: string): string {
  const date = new Date(`${iso}+09:00`)
  if (Number.isNaN(date.valueOf())) return iso
  return dateFmt.format(date)
}
