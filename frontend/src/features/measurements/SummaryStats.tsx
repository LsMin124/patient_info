import { useT } from '../../shared/hooks/useT'
import { formatN } from '../../shared/lib/units'

import { computeSessionStats } from './lib/stats'
import type { DataPoint } from './schema'

import './summary-stats.css'

interface SummaryStatsProps {
  points: ReadonlyArray<DataPoint>
}

/**
 * Six summary metrics for a session's force curve. All force values are
 * already in Newtons (computeSessionStats does the kgf→N conversion). A
 * metric the session is too short to support renders as '-' rather than a
 * misleading 0.
 */
export function SummaryStats({ points }: SummaryStatsProps) {
  const { t } = useT()
  const stats = computeSessionStats(points)

  const items: Array<{ label: string; value: string }> = [
    { label: t('session.stats.peak'), value: formatN(stats.peakN ?? NaN) },
    { label: t('session.stats.mean'), value: formatN(stats.meanN ?? NaN) },
    {
      label: t('session.stats.timeToPeak'),
      value: stats.timeToPeakMs === null ? '-' : `${stats.timeToPeakMs} ms`,
    },
    { label: t('session.stats.rfd0_100'), value: formatRfd(stats.rfd0_100) },
    { label: t('session.stats.rfd100_200'), value: formatRfd(stats.rfd100_200) },
    { label: t('session.stats.impulse'), value: formatImpulse(stats.impulseNs) },
  ]

  return (
    <dl className="summary-stats">
      {items.map((item) => (
        <div key={item.label} className="summary-stats__item">
          <dt className="summary-stats__label">{item.label}</dt>
          <dd className="summary-stats__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function formatRfd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-'
  return `${value.toFixed(1)} N/s`
}

function formatImpulse(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-'
  return `${value.toFixed(2)} N·s`
}
