import { useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useT } from '../../shared/hooks/useT'
import { formatN } from '../../shared/lib/units'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Skeleton } from '../../shared/ui/Loading'

import { ComparisonFigure } from './ComparisonFigure'
import { OverlayChart, paletteColor, type OverlaySeries } from './OverlayChart'
import { VisitComparison } from './VisitComparison'
import { countValidIdSegments, MAX_COMPARE_IDS, parseCompareIds } from './lib/compareIds'
import { pairMotionForIndex, type PairMotion } from './lib/pairLabel'
import { computeSessionStats } from './lib/stats'
import { pickVisitPairFromIds } from './lib/visits'
import type { DataPoint, MeasurementSummary } from './schema'
import { useDataPointsQuery, useMeasurementSummaryQuery } from './useMeasurements'

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
  // Count only well-formed segments; counting raw .split length would
  // misclassify `1,abc,xyz,foo,bar` as "too many" (5 segments) when only
  // 1 valid id exists — the user would expect "too few" instead.
  const validSubmittedCount = countValidIdSegments(raw)
  const ids = parseCompareIds(raw)

  if (validSubmittedCount > MAX_COMPARE_IDS) {
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
      <CompareLoader ids={ids} />
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

interface CompareLoaderProps {
  ids: ReadonlyArray<number>
}

function CompareLoader({ ids }: CompareLoaderProps) {
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

  // Per-measurement metadata. Resolves the id directly regardless of
  // which patient owns it — replaces the previous patient-scan that was
  // capped at 4 patients (IMPL_SPEC §8.9 carry-over). Patient #5+ now
  // gets the same hero comparison as everyone else.
  const meta0 = useMeasurementSummaryQuery(slots[0])
  const meta1 = useMeasurementSummaryQuery(slots[1])
  const meta2 = useMeasurementSummaryQuery(slots[2])
  const meta3 = useMeasurementSummaryQuery(slots[3])
  const metaQueries = [meta0, meta1, meta2, meta3]
  const sessionsAll: MeasurementSummary[] = metaQueries
    .map((q) => q.data)
    .filter((m): m is MeasurementSummary => !!m)

  const anyLoading =
    dataQueries.slice(0, ids.length).some((q) => q.isLoading) ||
    metaQueries.slice(0, ids.length).some((q) => q.isLoading)

  // Per-query error precedence (matches SessionDetail): only fallback
  // when data is actually missing (no stale cache to render).
  const anyDataMissing = dataQueries.slice(0, ids.length).some((q) => !q.data && q.isError)
  const anyMetaMissing = metaQueries.slice(0, ids.length).some((q) => !q.data && q.isError)

  // Build chart series + table rows up-front (memoized). useMemo must be
  // called unconditionally — rules-of-hooks forbids hooks after the
  // early returns below. Result is only USED in the happy-path render.
  const data0Ref = data0.data
  const data1Ref = data1.data
  const data2Ref = data2.data
  const data3Ref = data3.data
  const meta0Ref = meta0.data
  const meta1Ref = meta1.data
  const meta2Ref = meta2.data
  const meta3Ref = meta3.data
  const sessionsKey = sessionsAll.length
  const built = useMemo(() => {
    const seriesOut: OverlaySeries[] = []
    const rowsOut: Array<{
      id: number
      label: string
      memo: string | null
      peak: number | null
    }> = []
    const dataByMid = new Map<number, ReadonlyArray<DataPoint>>()
    // Pair (flexion/extension) label is derived from each measurement's
    // chronological position in the patient's full session list. See
    // IMPL_SPEC §8.14 — replaced by an explicit device-side motion field
    // in a future contract revision.
    const chronological = [...sessionsAll].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const pairOf = (mid: number): PairMotion => {
      const idx = chronological.findIndex((s) => s.measurementId === mid)
      return pairMotionForIndex(idx < 0 ? 0 : idx)
    }
    const pairCandidates: Array<{
      meta: MeasurementSummary
      points: ReadonlyArray<DataPoint>
      pair: PairMotion
    }> = []
    ids.forEach((id, i) => {
      const points = (dataQueries[i]?.data ?? []) as ReadonlyArray<DataPoint>
      dataByMid.set(id, points)
      const meta = sessionsAll.find((s) => s.measurementId === id)
      const label = meta ? `#${id} · ${meta.startTime.slice(0, 16)}` : `#${id}`
      seriesOut.push({ id, label, points })
      const stats = computeSessionStats(points)
      rowsOut.push({
        id,
        label,
        memo: meta?.memo ?? null,
        peak: stats.peakN,
      })
      if (meta) pairCandidates.push({ meta, points, pair: pairOf(id) })
    })
    // Figure pair: only when exactly two sessions and BOTH have resolved
    // metadata + non-empty data. Baseline = earlier startTime.
    let figurePair: {
      baseline: (typeof pairCandidates)[number]
      followup: (typeof pairCandidates)[number]
    } | null = null
    if (
      ids.length === 2 &&
      pairCandidates.length === 2 &&
      pairCandidates[0]!.points.length > 0 &&
      pairCandidates[1]!.points.length > 0
    ) {
      const sorted = [...pairCandidates].sort((a, b) =>
        a.meta.startTime.localeCompare(b.meta.startTime),
      )
      figurePair = { baseline: sorted[0]!, followup: sorted[1]! }
    }
    // Visit pair: 4 ids that group cleanly into two complete visits.
    // Baseline = older visit, Followup = newer. See lib/visits.ts.
    const visitPair = pickVisitPairFromIds(ids, sessionsAll)
    return { series: seriesOut, rows: rowsOut, figurePair, visitPair, dataByMid }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ids,
    data0Ref,
    data1Ref,
    data2Ref,
    data3Ref,
    meta0Ref,
    meta1Ref,
    meta2Ref,
    meta3Ref,
    sessionsKey,
  ])

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
  if (anyDataMissing || anyMetaMissing) {
    const err =
      dataQueries.find((q) => q.isError)?.error ?? metaQueries.find((q) => q.isError)?.error ?? null
    return (
      <ErrorFallback
        error={err}
        onReset={() => {
          dataQueries.forEach((q) => {
            if (q.isError) q.refetch()
          })
          metaQueries.forEach((q) => {
            if (q.isError) q.refetch()
          })
        }}
        title={t('common.error')}
      />
    )
  }

  // Visit-pair mode: 4 ids forming two complete clinical visits (flex+ext
  // each). Renders flexion-vs-flexion stacked over extension-vs-extension,
  // each with its own ΔPeak panel. Triggered automatically when the URL
  // ids resolve to a clean 2-visit set (see lib/visits.ts).
  if (built.visitPair) {
    return (
      <VisitComparison
        baselineVisit={built.visitPair.baselineVisit}
        followupVisit={built.visitPair.followupVisit}
        dataByMid={built.dataByMid}
      />
    )
  }

  // Figure mode: exactly 2 sessions selected AND both metas resolved.
  // Used when comparing across visits without a full pair (e.g. flexion
  // vs flexion across two visits). Same paper-quality layout, just one
  // motion at a time.
  if (ids.length === 2 && built.figurePair) {
    return (
      <ComparisonFigure baseline={built.figurePair.baseline} followup={built.figurePair.followup} />
    )
  }

  // Multi-overlay mode (3 ids that aren't a clean visit pair, or any
  // mid-count we don't have a specialized layout for). Peak-only table —
  // impulse intentionally dropped per Phase 10 user request.
  return (
    <>
      <OverlayChart series={built.series} />
      <table className="session-compare__table" aria-label={t('session.compare.legend')}>
        <thead>
          <tr>
            <th scope="col">{t('session.compare.table.session')}</th>
            <th scope="col">{t('session.compare.table.memo')}</th>
            <th scope="col">{t('session.compare.table.peak')}</th>
          </tr>
        </thead>
        <tbody>
          {built.rows.map((row, i) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
