import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useT } from '../../shared/hooks/useT'
import { formatN } from '../../shared/lib/units'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Skeleton } from '../../shared/ui/Loading'
import { usePatientsQuery } from '../patients/usePatients'

import { OverlayChart, paletteColor, type OverlaySeries } from './OverlayChart'
import { MAX_COMPARE_IDS, parseCompareIds } from './lib/compareIds'
import { computeSessionStats } from './lib/stats'
import type { DataPoint, MeasurementSummary } from './schema'
import { useDataPointsQuery, useSessionsQuery } from './useMeasurements'

import './session-compare.css'

/**
 * /sessions/compare?ids=… — overlays up to MAX_COMPARE_IDS measurement
 * curves on a single Force(N)/Time(s) chart, with a stats comparison table.
 *
 * Validation: the `ids` query parameter is attacker-influenced (anyone can
 * craft the URL), so segments are clamped via `parseCompareIds` before any
 * query fires. Anything outside the regex/positive-integer/≤4 contract is
 * dropped silently — see post-Phase-4 security review.
 *
 * Data source: each session is fetched via the shared per-id useDataPoints
 * cache, so navigating in from SessionDetail (which already populated those
 * caches) is instant. The patient/sessions lookup runs against the cached
 * lists too. Stale-cache rendering is preserved by per-query error
 * precedence (mirrors SessionDetail's approach).
 */
export function SessionCompare() {
  const { t } = useT()
  const [params] = useSearchParams()
  const raw = params.get('ids')
  // Count the user's intent BEFORE parsing — show "too many" even when
  // the parser would otherwise silently truncate to MAX. The tooFew
  // branch only triggers when the parsed set has < 2 valid entries.
  const submittedCount = raw ? raw.split(',').filter((s) => s.trim() !== '').length : 0
  const ids = parseCompareIds(raw)

  if (submittedCount > MAX_COMPARE_IDS) {
    return (
      <Shell title={t('session.compare.title')}>
        <EmptyState
          title={t('session.compare.tooMany')}
          description={t('session.compare.tooManyHint')}
          action={
            <Link to="/patients">
              <Button variant="secondary">{t('patient.list.title')}</Button>
            </Link>
          }
        />
      </Shell>
    )
  }

  if (ids.length < 2) {
    return (
      <Shell title={t('session.compare.title')}>
        <EmptyState
          title={t('session.compare.tooFew')}
          description={t('session.compare.tooFewHint')}
          action={
            <Link to="/patients">
              <Button variant="secondary">{t('patient.list.title')}</Button>
            </Link>
          }
        />
      </Shell>
    )
  }

  return (
    <Shell title={t('session.compare.title')}>
      <CompareBody ids={ids} />
    </Shell>
  )
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="session-compare">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

interface CompareBodyProps {
  ids: ReadonlyArray<number>
}

function CompareBody({ ids }: CompareBodyProps) {
  const { t } = useT()
  const patientsQuery = usePatientsQuery()
  // Session metadata can come from any patient's session list — for compare
  // we don't yet know which patient(s) the IDs belong to, so we read all
  // patients and probe each list. For Phase 5 the list of patients is
  // typically small enough that this is a no-op fetch (cache hit).
  const allSessionsByPatient = (patientsQuery.data ?? []).map((p) => p.patientId)

  return (
    <CompareLoader
      ids={ids}
      patientIds={allSessionsByPatient}
      patientsLoading={patientsQuery.isLoading}
      patientsError={patientsQuery.error}
      patientsHasData={!!patientsQuery.data}
      onRetry={() => patientsQuery.refetch()}
      label={t('session.compare.title')}
    />
  )
}

interface CompareLoaderProps {
  ids: ReadonlyArray<number>
  patientIds: ReadonlyArray<string>
  patientsLoading: boolean
  patientsError: Error | null
  patientsHasData: boolean
  onRetry: () => void
  label: string
}

function CompareLoader({
  ids,
  patientIds,
  patientsLoading,
  patientsError,
  patientsHasData,
  onRetry,
}: CompareLoaderProps) {
  const { t } = useT()
  // Fetch each id's data points + meta. Hooks must be called in stable
  // order, so cap is enforced (parseCompareIds returns at most
  // MAX_COMPARE_IDS) and we render up to 4 fixed slots.
  const slots = [0, 1, 2, 3].map((i) => ids[i])
  const data0 = useDataPointsQuery(slots[0])
  const data1 = useDataPointsQuery(slots[1])
  const data2 = useDataPointsQuery(slots[2])
  const data3 = useDataPointsQuery(slots[3])
  const dataQueries = [data0, data1, data2, data3]

  // Sessions metadata across all patients — query per patient. Same hook
  // order discipline: enforce up to 4 patient slots.
  // For correctness we just iterate the (small) patient list to find each
  // measurementId. Since Phase 4 already keys session caches by patientId,
  // each patient triggers at most one fetch.
  const psSlots = [0, 1, 2, 3].map((i) => patientIds[i])
  const sessionsP0 = useSessionsQuery(psSlots[0])
  const sessionsP1 = useSessionsQuery(psSlots[1])
  const sessionsP2 = useSessionsQuery(psSlots[2])
  const sessionsP3 = useSessionsQuery(psSlots[3])
  const sessionsAll: MeasurementSummary[] = (
    [sessionsP0, sessionsP1, sessionsP2, sessionsP3] as const
  ).flatMap((q) => q.data ?? [])

  const anyLoading =
    patientsLoading ||
    dataQueries.slice(0, ids.length).some((q) => q.isLoading) ||
    [sessionsP0, sessionsP1, sessionsP2, sessionsP3]
      .slice(0, patientIds.length)
      .some((q) => q.isLoading)

  // Per-query error precedence (matches SessionDetail): only fallback
  // when data is actually missing (no stale cache to render).
  const patientMissing = !patientsHasData && !!patientsError
  const anyDataMissing = dataQueries.slice(0, ids.length).some((q) => !q.data && q.isError)

  if (anyLoading) {
    return (
      <div
        className="session-compare__skeletons"
        role="status"
        aria-live="polite"
        aria-label={t('common.loading')}
      >
        <Skeleton height="20rem" />
        <Skeleton height="6rem" />
      </div>
    )
  }
  if (patientMissing || anyDataMissing) {
    const err = patientsError ?? dataQueries.find((q) => q.isError)?.error ?? null
    return (
      <ErrorFallback
        error={err}
        onReset={() => {
          if (patientMissing) onRetry()
          dataQueries.forEach((q) => {
            if (q.isError) q.refetch()
          })
        }}
        title={t('common.error')}
      />
    )
  }

  // Assemble the OverlayChart series + the stats rows for the table.
  const series: OverlaySeries[] = []
  const rows: Array<{
    id: number
    label: string
    memo: string | null
    peak: number | null
    impulse: number | null
  }> = []
  ids.forEach((id, i) => {
    const points = (dataQueries[i]?.data ?? []) as ReadonlyArray<DataPoint>
    const meta = sessionsAll.find((s) => s.measurementId === id)
    const label = meta ? `#${id} · ${meta.startTime.slice(0, 16)}` : `#${id}`
    series.push({ id, label, points })
    const stats = computeSessionStats(points)
    rows.push({
      id,
      label,
      memo: meta?.memo ?? null,
      peak: stats.peakN,
      impulse: stats.impulseNs,
    })
  })

  return (
    <>
      <OverlayChart series={series} />
      <table className="session-compare__table" aria-label={t('session.compare.legend')}>
        <thead>
          <tr>
            <th scope="col">{t('session.compare.table.session')}</th>
            <th scope="col">{t('session.compare.table.memo')}</th>
            <th scope="col">{t('session.compare.table.peak')}</th>
            <th scope="col">{t('session.compare.table.impulse')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id}>
              <td>
                <span
                  className="session-compare__swatch"
                  style={{ backgroundColor: paletteColor(i) }}
                  aria-hidden="true"
                />
                {row.label}
              </td>
              <td>{row.memo ?? t('session.list.noMemo')}</td>
              <td>{formatN(row.peak ?? NaN)}</td>
              <td>{row.impulse === null ? '-' : `${row.impulse.toFixed(2)} N·s`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
