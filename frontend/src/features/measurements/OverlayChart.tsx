import type { ChartOptions } from 'chart.js'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'

import { useT } from '../../shared/hooks/useT'
import { KGF_TO_N } from '../../shared/lib/units'

import './chartSetup'
import { lttbDownsample } from './lib/downsample'
import type { DataPoint } from './schema'

import './force-chart.css'

/**
 * Overlay chart for SessionCompare. Each series is rendered as its own
 * line in a shared Force(N) / Time(s) axis pair. Up to 4 series — see
 * `MAX_COMPARE_IDS` — so the per-series color palette is fixed-size and
 * sourced from CSS tokens (Phase 5 reuses the accent + status colors
 * already in tokens.css; no new design tokens added).
 */
export interface OverlaySeries {
  /** Stable identifier for cache key / legend label association. */
  id: number
  label: string
  points: ReadonlyArray<DataPoint>
}

const DOWNSAMPLE_THRESHOLD = 10_000
const DOWNSAMPLE_TARGET = 1_500

// 4 distinct OKLCH stops; matches the MAX_COMPARE_IDS cap from compareIds.ts.
const PALETTE = [
  'oklch(58% 0.16 250)', // accent
  'oklch(56% 0.14 150)', // success
  'oklch(70% 0.16 80)', // warning
  'oklch(55% 0.21 25)', // danger
]

interface OverlayChartProps {
  series: ReadonlyArray<OverlaySeries>
}

export function OverlayChart({ series }: OverlayChartProps) {
  const { t } = useT()

  const datasets = useMemo(() => {
    return series.map((s, i) => {
      const visible =
        s.points.length > DOWNSAMPLE_THRESHOLD
          ? lttbDownsample(s.points, DOWNSAMPLE_TARGET)
          : s.points
      const color = PALETTE[i % PALETTE.length]!
      return {
        label: s.label,
        data: visible.map((p) => ({ x: p.timeOffsetMs / 1000, y: p.kgValue * KGF_TO_N })),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      }
    })
  }, [series])

  const maxX = useMemo(() => {
    let maxMs = 0
    for (const s of series) {
      const last = s.points[s.points.length - 1]
      if (last && last.timeOffsetMs > maxMs) maxMs = last.timeOffsetMs
    }
    return Math.max((maxMs / 1000) * 1.1, 1)
  }, [series])

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
          ticks: { callback: (v) => `${v}s` },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: t('session.chart.forceLabel') },
        },
      },
      plugins: {
        legend: { display: true, position: 'top' as const },
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
    <div className="force-chart" role="figure" aria-label={t('session.compare.title')}>
      <Line data={{ datasets }} options={options} />
    </div>
  )
}

/** Exported for SessionCompare's stats table swatches — keep the mapping
 * single-sourced so legend colors match table colors. */
export function paletteColor(index: number): string {
  return PALETTE[index % PALETTE.length]!
}
