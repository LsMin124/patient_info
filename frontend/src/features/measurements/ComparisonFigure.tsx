import type { ChartOptions, Plugin } from 'chart.js'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'

import { useT } from '../../shared/hooks/useT'
import { KGF_TO_N } from '../../shared/lib/units'

import './chartSetup'
import './comparison-figure.css'
import { lttbDownsample } from './lib/downsample'
import type { PairMotion } from './lib/pairLabel'
import { computePeakDelta } from './lib/peakDelta'
import type { DataPoint, MeasurementSummary } from './schema'

/**
 * Hero comparison figure — paper-quality single-screen story:
 * "previous vs current → +X% improvement" reads in one glance.
 *
 * Layout (top → bottom):
 *   1. Hero strip — big arrow, +X% headline, baseline-N → followup-N,
 *      dates, "Baseline / Follow-up" labels.
 *   2. Chart — overlaid baseline (dashed grey) and followup (solid accent)
 *      curves. The area between them is tinted GREEN where followup beats
 *      baseline and RED where it regresses. An inline plugin draws:
 *        - vertical drop guides from each peak to the X-axis,
 *        - a horizontal guide from each peak to the Y-axis with the value,
 *        - a floating +X% badge anchored to the follow-up peak,
 *        - prominent ring-style peak dots.
 *
 * No side panel — the chart fills the card width so the comparison is
 * unmistakable at screenshot resolution.
 */
export interface ComparisonFigureProps {
  baseline: { meta: MeasurementSummary; points: ReadonlyArray<DataPoint>; pair: PairMotion }
  followup: { meta: MeasurementSummary; points: ReadonlyArray<DataPoint>; pair: PairMotion }
}

const DOWNSAMPLE_THRESHOLD = 10_000
const DOWNSAMPLE_TARGET = 1_500
const BASELINE_COLOR = 'oklch(55% 0 0)'
const FOLLOWUP_COLOR = 'oklch(58% 0.16 250)'
const IMPROVE_TINT = 'oklch(70% 0.18 150 / 0.18)'
const REGRESS_TINT = 'oklch(65% 0.22 25 / 0.18)'

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
        /* fillBetween */ false,
      ),
      buildDataset(
        `${t('session.figure.followup')} · ${shortDate(followup.meta.startTime)}`,
        followPoints,
        delta.followupPeakTimeSec,
        FOLLOWUP_COLOR,
        /* dashed */ false,
        /* fillBetween */ true,
      ),
    ]
  }, [baseline, followup, delta, t])

  const maxX = 5

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
      // The plugin draws a floating Δ% badge above the follow-up peak — give
      // the top of the chart breathing room so the badge does not collide
      // with the topmost data points.
      layout: { padding: { top: 36, right: 8, left: 4, bottom: 0 } },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: maxX,
          bounds: 'ticks',
          title: { display: true, text: t('session.chart.timeLabel') },
          grid: { color: 'oklch(92% 0 0)' },
          ticks: { stepSize: 1, callback: (v) => `${v}s` },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: t('session.chart.forceLabel') },
          grid: { color: 'oklch(92% 0 0)' },
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

  // Inline plugin: drop lines + horizontal guides + value labels + Δ badge.
  // Defined per-render so it can close over the current peak delta values.
  const annotationPlugin = useMemo<Plugin<'line'>>(
    () => ({
      id: 'comparisonAnnotations',
      afterDatasetsDraw(chart) {
        const xScale = chart.scales.x
        const yScale = chart.scales.y
        if (!xScale || !yScale) return
        const ctx = chart.ctx

        const drawPeakAnnotation = (
          peakX: number,
          peakY: number,
          color: string,
          dashed: boolean,
          labelText: string,
          labelAbove: boolean,
        ) => {
          if (peakY <= 0 || peakX > maxX) return
          const px = xScale.getPixelForValue(peakX)
          const py = yScale.getPixelForValue(peakY)
          const baselineY = yScale.getPixelForValue(0)
          const leftX = xScale.left

          ctx.save()
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.setLineDash(dashed ? [4, 4] : [2, 3])
          ctx.globalAlpha = 0.7

          // Vertical drop from peak to X-axis.
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(px, baselineY)
          ctx.stroke()

          // Horizontal guide from peak to Y-axis.
          ctx.beginPath()
          ctx.moveTo(leftX, py)
          ctx.lineTo(px, py)
          ctx.stroke()

          ctx.restore()

          // Ring-style peak dot for high contrast against the line.
          ctx.save()
          ctx.fillStyle = color
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(px, py, 5.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.restore()

          // Value label near the peak dot.
          ctx.save()
          ctx.fillStyle = color
          ctx.font =
            "600 12px system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
          ctx.textBaseline = labelAbove ? 'bottom' : 'top'
          ctx.textAlign = 'left'
          const offsetY = labelAbove ? -10 : 10
          ctx.fillText(labelText, px + 8, py + offsetY)
          ctx.restore()
        }

        // Baseline label below peak (so it doesn't collide with follow-up).
        drawPeakAnnotation(
          delta.baselinePeakTimeSec,
          delta.baselinePeakN,
          BASELINE_COLOR,
          true,
          `${delta.baselinePeakN.toFixed(1)} N`,
          /* labelAbove */ false,
        )
        // Follow-up label above peak.
        drawPeakAnnotation(
          delta.followupPeakTimeSec,
          delta.followupPeakN,
          FOLLOWUP_COLOR,
          false,
          `${delta.followupPeakN.toFixed(1)} N`,
          /* labelAbove */ true,
        )

        // Δ badge — floating chip anchored above the follow-up peak.
        if (delta.deltaPercent !== null && delta.followupPeakN > 0) {
          const px = xScale.getPixelForValue(Math.min(delta.followupPeakTimeSec, maxX))
          const py = yScale.getPixelForValue(delta.followupPeakN)
          const arrow = delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '▬'
          const pctText = `${delta.deltaPercent >= 0 ? '+' : '−'}${Math.abs(delta.deltaPercent).toFixed(1)}%`
          const badgeText = `${arrow} ${pctText}`
          const badgeColor =
            delta.direction === 'up'
              ? 'oklch(45% 0.16 150)'
              : delta.direction === 'down'
                ? 'oklch(52% 0.21 25)'
                : 'oklch(50% 0 0)'

          ctx.save()
          ctx.font =
            "700 13px system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
          const padX = 8
          const metrics = ctx.measureText(badgeText)
          const w = metrics.width + padX * 2
          const h = 22
          const desiredCenterX = px
          const minCenterX = xScale.left + w / 2 + 4
          const maxCenterX = xScale.right - w / 2 - 4
          const centerX = Math.max(minCenterX, Math.min(maxCenterX, desiredCenterX))
          const bx = centerX - w / 2
          const by = Math.max(yScale.top + 2, py - h - 22)

          ctx.fillStyle = 'white'
          ctx.strokeStyle = badgeColor
          ctx.lineWidth = 1.5
          roundedRect(ctx, bx, by, w, h, 11)
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = badgeColor
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.fillText(badgeText, centerX, by + h / 2 + 1)
          ctx.restore()
        }
      },
    }),
    [delta, maxX],
  )

  return (
    <article className="comparison-figure" aria-label={t('session.figure.title')}>
      <ComparisonHero delta={delta} baseline={baseline.meta} followup={followup.meta} />
      <div
        className="comparison-figure__chart"
        role="figure"
        aria-label={t('session.figure.title')}
      >
        <Line data={{ datasets }} options={options} plugins={[annotationPlugin]} />
      </div>
    </article>
  )
}

interface ComparisonHeroProps {
  delta: ReturnType<typeof computePeakDelta>
  baseline: MeasurementSummary
  followup: MeasurementSummary
}

function ComparisonHero({ delta, baseline, followup }: ComparisonHeroProps) {
  const { t } = useT()
  // % is the story; N is the supporting evidence. Both must remain in the
  // DOM (covered by SessionCompare.test.tsx assertions) but their visual
  // hierarchy is %-first.
  const arrow = delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '▬'
  const pctText =
    delta.deltaPercent === null
      ? '—'
      : `${delta.deltaPercent >= 0 ? '+' : '−'}${Math.abs(delta.deltaPercent).toFixed(1)}%`
  const nSign = delta.deltaN > 0 ? '+' : delta.deltaN < 0 ? '−' : ''
  const nText = `${nSign}${Math.abs(delta.deltaN).toFixed(1)} N`
  const word =
    delta.direction === 'up'
      ? t('session.figure.improvement')
      : delta.direction === 'down'
        ? t('session.figure.regression')
        : t('session.figure.unchanged')

  return (
    <header className={`comparison-figure__hero comparison-figure__hero--${delta.direction}`}>
      <div className="comparison-figure__hero-delta">
        <span className="comparison-figure__hero-arrow" aria-hidden="true">
          {arrow}
        </span>
        <span className="comparison-figure__hero-pct">{pctText}</span>
        <span className="comparison-figure__hero-word">{word}</span>
      </div>
      <div className="comparison-figure__hero-peaks">
        <div className="comparison-figure__hero-peak comparison-figure__hero-peak--baseline">
          <span className="comparison-figure__hero-peak-label">{t('session.figure.baseline')}</span>
          <span className="comparison-figure__hero-peak-value">
            {delta.baselinePeakN.toFixed(1)} N
          </span>
          <span className="comparison-figure__hero-peak-date">{shortDate(baseline.startTime)}</span>
        </div>
        <span className="comparison-figure__hero-peak-arrow" aria-hidden="true">
          →
        </span>
        <div className="comparison-figure__hero-peak comparison-figure__hero-peak--followup">
          <span className="comparison-figure__hero-peak-label">{t('session.figure.followup')}</span>
          <span className="comparison-figure__hero-peak-value">
            {delta.followupPeakN.toFixed(1)} N
          </span>
          <span className="comparison-figure__hero-peak-date">{shortDate(followup.startTime)}</span>
        </div>
        <span className="comparison-figure__hero-delta-n">{nText}</span>
      </div>
    </header>
  )
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

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
  fill?: { target: number; above: string; below: string }
}

function buildDataset(
  label: string,
  points: ReadonlyArray<DataPoint>,
  peakTimeSec: number,
  color: string,
  dashed: boolean,
  fillBetween: boolean,
): BuildDatasetReturn {
  // Inline plugin renders the peak markers as ring-style dots, so suppress
  // chart.js's default per-point dot rendering across the whole series.
  void peakTimeSec
  const pointRadius = points.map(() => 0)

  const base: BuildDatasetReturn = {
    label,
    data: points.map((p) => ({ x: p.timeOffsetMs / 1000, y: p.kgValue * KGF_TO_N })),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2.25,
    pointRadius,
    pointBackgroundColor: color,
    pointBorderColor: color,
    borderDash: dashed ? [6, 6] : [],
    tension: 0.15,
  }
  if (fillBetween) {
    // Conditional fill — Chart.js Filler plugin tints the area between the
    // follow-up curve and dataset index 0 (baseline). Above-baseline area
    // gets the improvement tint; below-baseline area gets the regression
    // tint. Works even when downsampling produces slightly different X
    // grids; Filler interpolates the target dataset at each source X.
    base.fill = { target: 0, above: IMPROVE_TINT, below: REGRESS_TINT }
  }
  return base
}
