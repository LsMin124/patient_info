import { useMemo } from 'react'

import { useT } from '../../shared/hooks/useT'

import { ComparisonFigure } from './ComparisonFigure'
import { computePeakDelta, type PeakDeltaResult } from './lib/peakDelta'
import type { Visit } from './lib/visits'
import type { DataPoint } from './schema'

import './visit-comparison.css'

const EMPTY_POINTS: ReadonlyArray<DataPoint> = []

/**
 * Stacked paired visit comparison — the single-screen story of one clinical
 * visit vs the next. Structure:
 *
 *   1. Hero card — "Visit N → Visit N+1" with dates and TWO side-by-side
 *      motion chips (FLEXION %, EXTENSION %) so the headline improvement
 *      reads in a glance, no scrolling required.
 *   2. Flexion section — a full ComparisonFigure (its own hero strip + chart
 *      with peak annotations and conditional fill).
 *   3. Extension section — same layout, below.
 *
 * Used by SessionCompare when 4 URL ids resolve to exactly two complete
 * visits (see `lib/visits.ts#pickVisitPairFromIds`).
 */
export interface VisitComparisonProps {
  baselineVisit: Visit
  followupVisit: Visit
  /** Per-measurementId data points map, keyed by measurementId. */
  dataByMid: ReadonlyMap<number, ReadonlyArray<DataPoint>>
}

export function VisitComparison({ baselineVisit, followupVisit, dataByMid }: VisitComparisonProps) {
  const { t } = useT()

  // pickVisitPairFromIds guarantees both extensions exist, but TS can't see
  // that across the boundary. Defensive nulls keep render predictable.
  const baselineExt = baselineVisit.extension
  const followupExt = followupVisit.extension

  // Memoize the empty-array fallback so the identity is stable across
  // renders; otherwise downstream useMemo deps churn on every render.
  const flexBaselinePoints = useMemo(
    () => dataByMid.get(baselineVisit.flexion.measurementId) ?? EMPTY_POINTS,
    [dataByMid, baselineVisit.flexion.measurementId],
  )
  const flexFollowupPoints = useMemo(
    () => dataByMid.get(followupVisit.flexion.measurementId) ?? EMPTY_POINTS,
    [dataByMid, followupVisit.flexion.measurementId],
  )
  const extBaselinePoints = useMemo(
    () => (baselineExt ? (dataByMid.get(baselineExt.measurementId) ?? EMPTY_POINTS) : EMPTY_POINTS),
    [dataByMid, baselineExt],
  )
  const extFollowupPoints = useMemo(
    () => (followupExt ? (dataByMid.get(followupExt.measurementId) ?? EMPTY_POINTS) : EMPTY_POINTS),
    [dataByMid, followupExt],
  )

  const flexDelta = useMemo(
    () => computePeakDelta(flexBaselinePoints, flexFollowupPoints),
    [flexBaselinePoints, flexFollowupPoints],
  )
  const extDelta = useMemo(
    () => computePeakDelta(extBaselinePoints, extFollowupPoints),
    [extBaselinePoints, extFollowupPoints],
  )

  if (!baselineExt || !followupExt) return null

  const heading = t('session.figure.visitTitle')
    .replace('{baseline}', String(baselineVisit.visitNumber))
    .replace('{followup}', String(followupVisit.visitNumber))

  return (
    <article className="visit-comparison" aria-label={heading}>
      <VisitHero
        heading={heading}
        baselineDate={baselineVisit.startTime}
        followupDate={followupVisit.startTime}
        flexDelta={flexDelta}
        extDelta={extDelta}
      />

      <section
        className="visit-comparison__section visit-comparison__section--flexion"
        aria-labelledby="visit-compare-flex-h"
      >
        <h3 id="visit-compare-flex-h" className="visit-comparison__section-title">
          <span className="visit-comparison__motion-dot visit-comparison__motion-dot--flexion" />
          {t('session.figure.flexionSection')}
        </h3>
        <ComparisonFigure
          baseline={{
            meta: baselineVisit.flexion,
            points: flexBaselinePoints,
            pair: 'flexion',
          }}
          followup={{
            meta: followupVisit.flexion,
            points: flexFollowupPoints,
            pair: 'flexion',
          }}
        />
      </section>

      <section
        className="visit-comparison__section visit-comparison__section--extension"
        aria-labelledby="visit-compare-ext-h"
      >
        <h3 id="visit-compare-ext-h" className="visit-comparison__section-title">
          <span className="visit-comparison__motion-dot visit-comparison__motion-dot--extension" />
          {t('session.figure.extensionSection')}
        </h3>
        <ComparisonFigure
          baseline={{
            meta: baselineExt,
            points: extBaselinePoints,
            pair: 'extension',
          }}
          followup={{
            meta: followupExt,
            points: extFollowupPoints,
            pair: 'extension',
          }}
        />
      </section>
    </article>
  )
}

interface VisitHeroProps {
  heading: string
  baselineDate: string
  followupDate: string
  flexDelta: PeakDeltaResult
  extDelta: PeakDeltaResult
}

function VisitHero({ heading, baselineDate, followupDate, flexDelta, extDelta }: VisitHeroProps) {
  const { t } = useT()
  return (
    <header className="visit-comparison__hero">
      <div className="visit-comparison__hero-title">
        <h2>{heading}</h2>
        <p className="visit-comparison__hero-dates">
          <span>{shortDate(baselineDate)}</span>
          <span aria-hidden="true">→</span>
          <span>{shortDate(followupDate)}</span>
        </p>
      </div>
      <div className="visit-comparison__hero-chips">
        <MotionChip
          motion="flexion"
          label={t('session.figure.flexionSection')}
          delta={flexDelta}
          improvementWord={t('session.figure.improvement')}
          regressionWord={t('session.figure.regression')}
          unchangedWord={t('session.figure.unchanged')}
        />
        <MotionChip
          motion="extension"
          label={t('session.figure.extensionSection')}
          delta={extDelta}
          improvementWord={t('session.figure.improvement')}
          regressionWord={t('session.figure.regression')}
          unchangedWord={t('session.figure.unchanged')}
        />
      </div>
    </header>
  )
}

interface MotionChipProps {
  motion: 'flexion' | 'extension'
  label: string
  delta: PeakDeltaResult
  improvementWord: string
  regressionWord: string
  unchangedWord: string
}

function MotionChip({
  motion,
  label,
  delta,
  improvementWord,
  regressionWord,
  unchangedWord,
}: MotionChipProps) {
  const arrow = delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '▬'
  const pctText =
    delta.deltaPercent === null
      ? '—'
      : `${delta.deltaPercent >= 0 ? '+' : '−'}${Math.abs(delta.deltaPercent).toFixed(1)}%`
  const word =
    delta.direction === 'up'
      ? improvementWord
      : delta.direction === 'down'
        ? regressionWord
        : unchangedWord
  return (
    <div
      className={`visit-comparison__chip visit-comparison__chip--${motion} visit-comparison__chip--${delta.direction}`}
    >
      <div className="visit-comparison__chip-label">
        <span className={`visit-comparison__motion-dot visit-comparison__motion-dot--${motion}`} />
        {label}
      </div>
      <div className="visit-comparison__chip-pct">
        <span className="visit-comparison__chip-arrow" aria-hidden="true">
          {arrow}
        </span>
        {pctText}
      </div>
      <div className="visit-comparison__chip-peaks">
        {delta.baselinePeakN.toFixed(1)} N <span aria-hidden="true">→</span>{' '}
        {delta.followupPeakN.toFixed(1)} N
      </div>
      <div className="visit-comparison__chip-word">{word}</div>
    </div>
  )
}

function shortDate(iso: string): string {
  return iso.slice(0, 10)
}
