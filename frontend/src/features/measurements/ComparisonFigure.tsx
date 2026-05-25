import type { ChartOptions } from 'chart.js'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'

import { useT } from '../../shared/hooks/useT'
import { KGF_TO_N } from '../../shared/lib/units'

import './chartSetup'
import './comparison-figure.css'
import { lttbDownsample } from './lib/downsample'
import { computePeakDelta } from './lib/peakDelta'
import type { DataPoint, MeasurementSummary } from './schema'

/**
 * Paper-figure mode for SessionCompare. Renders when exactly TWO sessions
 * are selected — a deliberately minimal layout suitable for screenshotting
 * into a clinical paper:
 *
 *   - Two force curves overlaid (baseline = dashed grey, follow-up = solid
 *     accent), each with a single dot annotating the peak point.
 *   - Side / bottom panel showing baseline peak, follow-up peak, and the
 *     headline ΔPeak with direction colour (green = improvement, red =
 *     regression, neutral = unchanged).
 *
 * No stats table, no per-session memo column — intentionally. The multi-
 * overlay flow (3-4 sessions) still has those.
 */
export interface ComparisonFigureProps {
  /** Earlier of the two sessions, plus its data points. */
  baseline: { meta: MeasurementSummary; points: ReadonlyArray<DataPoint> }
  /** Later of the two sessions, plus its data points. */
  followup: { meta: MeasurementSummary; points: ReadonlyArray<DataPoint> }
}

const DOWNSAMPLE_THRESHOLD = 10_000
const DOWNSAMPLE_TARGET = 1_500
const BASELINE_COLOR = 'oklch(55% 0 0)' // neutral grey
const FOLLOWUP_COLOR = 'oklch(58% 0.16 250)' // accent

export function ComparisonFigure({ baseline, followup }: ComparisonFigureProps) {
  const { t } = useT()
  const delta = useMemo(
    () => computePeakDelta(baseline.points, followup.points),
    [baseline.points, followup.points],
  )

  const datasets = useMemo(() => {
    const basePoints =
      baseline.points.length > DOWNSAMPLE_THRESHOLD
        ? lttbDownsample(baseline.points, DOWNSAMPLE_TARGET)
        : baseline.points
    const followPoints =
      followup.points.length > DOWNSAMPLE_THRESHOLD
        ? lttbDownsample(followup.points, DOWNSAMPLE_TARGET)
        : followup.points

    return [
      buildDataset(
        `${t('session.figure.baseline')} · ${shortDate(baseline.meta.startTime)}`,
        basePoints,
        delta.baselinePeakTimeSec,
        BASELINE_COLOR,
        /* dashed */ true,
      ),
      buildDataset(
        `${t('session.figure.followup')} · ${shortDate(followup.meta.startTime)}`,
        followPoints,
        delta.followupPeakTimeSec,
        FOLLOWUP_COLOR,
        /* dashed */ false,
      ),
    ]
  }, [baseline, followup, delta, t])

  const maxX = useMemo(() => {
    const lastB = baseline.points[baseline.points.length - 1]
    const lastF = followup.points[followup.points.length - 1]
    const ms = Math.max(lastB?.timeOffsetMs ?? 0, lastF?.timeOffsetMs ?? 0)
    return Math.max((ms / 1000) * 1.05, 1)
  }, [baseline.points, followup.points])

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion ? false : { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: maxX,
          title: { display: true, text: t('session.chart.timeLabel') },
          grid: { color: 'oklch(90% 0 0)' },
          ticks: { callback: (v) => `${v}s` },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: t('session.chart.forceLabel') },
          grid: { color: 'oklch(90% 0 0)' },
        },
      },
      plugins: {
        legend: { display: true, position: 'top' as const, align: 'end' as const },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const y = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0
              return `${ctx.dataset.label}: ${y.toFixed(2)} N`
            },
          },
        },
      },
    }),
    [maxX, reduceMotion, t],
  )

  return (
    <article className="comparison-figure" aria-label={t('session.figure.title')}>
      <div
        className="comparison-figure__chart"
        role="figure"
        aria-label={t('session.figure.title')}
      >
        <Line data={{ datasets }} options={options} />
      </div>

      <aside className="comparison-figure__panel" aria-label={t('session.figure.deltaPeak')}>
        <PeakRow
          label={t('session.figure.baseline')}
          date={baseline.meta.startTime}
          peakN={delta.baselinePeakN}
          color={BASELINE_COLOR}
          dashed
        />
        <PeakRow
          label={t('session.figure.followup')}
          date={followup.meta.startTime}
          peakN={delta.followupPeakN}
          color={FOLLOWUP_COLOR}
        />
        <DeltaBox
          deltaN={delta.deltaN}
          deltaPercent={delta.deltaPercent}
          direction={delta.direction}
          improvementWord={t('session.figure.improvement')}
          regressionWord={t('session.figure.regression')}
          unchangedWord={t('session.figure.unchanged')}
          deltaPeakLabel={t('session.figure.deltaPeak')}
        />
      </aside>
    </article>
  )
}

interface PeakRowProps {
  label: string
  date: string
  peakN: number
  color: string
  dashed?: boolean
}

function PeakRow({ label, date, peakN, color, dashed }: PeakRowProps) {
  return (
    <div className="comparison-figure__peak-row">
      <span
        className={`comparison-figure__swatch${dashed ? ' comparison-figure__swatch--dashed' : ''}`}
        style={{ backgroundColor: color, borderColor: color }}
        aria-hidden="true"
      />
      <div className="comparison-figure__peak-text">
        <div className="comparison-figure__peak-label">{label}</div>
        <div className="comparison-figure__peak-date">{shortDate(date)}</div>
      </div>
      <div className="comparison-figure__peak-value">{peakN.toFixed(1)} N</div>
    </div>
  )
}

interface DeltaBoxProps {
  deltaN: number
  deltaPercent: number | null
  direction: 'up' | 'down' | 'flat'
  improvementWord: string
  regressionWord: string
  unchangedWord: string
  deltaPeakLabel: string
}

function DeltaBox({
  deltaN,
  deltaPercent,
  direction,
  improvementWord,
  regressionWord,
  unchangedWord,
  deltaPeakLabel,
}: DeltaBoxProps) {
  const sign = deltaN > 0 ? '+' : deltaN < 0 ? '−' : ''
  const absN = Math.abs(deltaN).toFixed(1)
  const pctSuffix =
    deltaPercent === null
      ? ''
      : ` (${deltaPercent >= 0 ? '+' : '−'}${Math.abs(deltaPercent).toFixed(1)}%)`
  const word =
    direction === 'up' ? improvementWord : direction === 'down' ? regressionWord : unchangedWord

  return (
    <div className={`comparison-figure__delta comparison-figure__delta--${direction}`}>
      <div className="comparison-figure__delta-label">{deltaPeakLabel}</div>
      <div className="comparison-figure__delta-value">
        {sign}
        {absN} N{pctSuffix}
      </div>
      <div className="comparison-figure__delta-word">{word}</div>
    </div>
  )
}

/** Force the device's local-time ISO string to a compact YYYY-MM-DD. */
function shortDate(iso: string): string {
  return iso.slice(0, 10)
}

interface BuildDatasetReturn {
  label: string
  data: Array<{ x: number; y: number }>
  borderColor: string
  backgroundColor: string
  borderWidth: number
  pointRadius: number[]
  pointBackgroundColor: string
  pointBorderColor: string
  borderDash: number[]
  tension: number
}

function buildDataset(
  label: string,
  points: ReadonlyArray<DataPoint>,
  peakTimeSec: number,
  color: string,
  dashed: boolean,
): BuildDatasetReturn {
  // Find the index in the (possibly downsampled) array that is closest to
  // the peak time so we render exactly one annotated dot per series.
  let markerIdx = -1
  let bestDelta = Infinity
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (!p) continue
    const t = p.timeOffsetMs / 1000
    const d = Math.abs(t - peakTimeSec)
    if (d < bestDelta) {
      bestDelta = d
      markerIdx = i
    }
  }
  const pointRadius = points.map((_, i) => (i === markerIdx ? 5 : 0))

  return {
    label,
    data: points.map((p) => ({ x: p.timeOffsetMs / 1000, y: p.kgValue * KGF_TO_N })),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    pointRadius,
    pointBackgroundColor: color,
    pointBorderColor: color,
    borderDash: dashed ? [6, 6] : [],
    tension: 0.15,
  }
}
