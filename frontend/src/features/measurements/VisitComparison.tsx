import { useT } from '../../shared/hooks/useT'

import { ComparisonFigure } from './ComparisonFigure'
import type { Visit } from './lib/visits'
import type { DataPoint } from './schema'

import './visit-comparison.css'

/**
 * Stacked paired comparison — flexion-vs-flexion above, extension-vs-extension
 * below. Each section gets its own ComparisonFigure with peak markers and a
 * ΔPeak headline. Both sections share the 0–5s X window for visual alignment.
 *
 * Used by SessionCompare when the 4 URL ids resolve to exactly two complete
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
  const heading = t('session.figure.visitTitle')
    .replace('{baseline}', String(baselineVisit.visitNumber))
    .replace('{followup}', String(followupVisit.visitNumber))

  // Defensive: extension can't be null here because pickVisitPairFromIds
  // already requires both visits to be complete, but TypeScript doesn't know.
  const baselineExt = baselineVisit.extension
  const followupExt = followupVisit.extension
  if (!baselineExt || !followupExt) return null

  const flexBaseline = {
    meta: baselineVisit.flexion,
    points: dataByMid.get(baselineVisit.flexion.measurementId) ?? [],
    pair: 'flexion' as const,
  }
  const flexFollowup = {
    meta: followupVisit.flexion,
    points: dataByMid.get(followupVisit.flexion.measurementId) ?? [],
    pair: 'flexion' as const,
  }
  const extBaseline = {
    meta: baselineExt,
    points: dataByMid.get(baselineExt.measurementId) ?? [],
    pair: 'extension' as const,
  }
  const extFollowup = {
    meta: followupExt,
    points: dataByMid.get(followupExt.measurementId) ?? [],
    pair: 'extension' as const,
  }

  return (
    <article className="visit-comparison" aria-label={heading}>
      <header className="visit-comparison__header">
        <h2>{heading}</h2>
      </header>
      <section
        className="visit-comparison__section visit-comparison__section--flexion"
        aria-labelledby="visit-compare-flex-h"
      >
        <h3 id="visit-compare-flex-h" className="visit-comparison__section-title">
          <span className="visit-comparison__motion-dot visit-comparison__motion-dot--flexion" />
          {t('session.figure.flexionSection')}
        </h3>
        <ComparisonFigure baseline={flexBaseline} followup={flexFollowup} />
      </section>
      <section
        className="visit-comparison__section visit-comparison__section--extension"
        aria-labelledby="visit-compare-ext-h"
      >
        <h3 id="visit-compare-ext-h" className="visit-comparison__section-title">
          <span className="visit-comparison__motion-dot visit-comparison__motion-dot--extension" />
          {t('session.figure.extensionSection')}
        </h3>
        <ComparisonFigure baseline={extBaseline} followup={extFollowup} />
      </section>
    </article>
  )
}
