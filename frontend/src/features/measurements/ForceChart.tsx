import type { ChartOptions } from 'chart.js'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'

import { useT } from '../../shared/hooks/useT'
import { KGF_TO_N } from '../../shared/lib/units'

import './chartSetup'
import { lttbDownsample } from './lib/downsample'
import type { DataPoint } from './schema'

import './force-chart.css'

interface ForceChartProps {
  points: ReadonlyArray<DataPoint>
}

const DOWNSAMPLE_THRESHOLD = 10_000
const DOWNSAMPLE_TARGET = 1_500

/**
 * Line chart of force (N) vs time (s). Pure presentation — fetches nothing,
 * mutates nothing. The wire values stay in kg-force; conversion to Newton
 * happens here so the chart label / tooltip / Y-axis are all consistent.
 *
 * Large sessions (>10k points) are LTTB-downsampled to ~1.5k points to
 * keep chart.js interactions snappy without flattening peaks (verified by
 * downsample.test.ts spike-loss assertion).
 *
 * Respects prefers-reduced-motion: animations are disabled when the OS
 * preference is set. The chart re-mounts when input identity changes.
 */
export function ForceChart({ points }: ForceChartProps) {
  const { t } = useT()

  const visiblePoints = useMemo(
    () =>
      points.length > DOWNSAMPLE_THRESHOLD ? lttbDownsample(points, DOWNSAMPLE_TARGET) : points,
    [points],
  )

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: t('session.chart.forceLabel'),
          data: visiblePoints.map((p) => ({
            x: p.timeOffsetMs / 1000,
            y: p.kgValue * KGF_TO_N,
          })),
          borderColor: 'oklch(58% 0.16 250)',
          backgroundColor: 'oklch(58% 0.16 250 / 0.12)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15,
          fill: true,
        },
      ],
    }),
    [visiblePoints, t],
  )

  const options = useMemo<ChartOptions<'line'>>(() => {
    const maxX =
      visiblePoints.length === 0
        ? 1
        : (visiblePoints[visiblePoints.length - 1]!.timeOffsetMs / 1000) * 1.1
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion ? false : { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: Math.max(maxX, 1),
          title: { display: true, text: t('session.chart.timeLabel') },
          ticks: {
            callback: (value) => `${value}s`,
          },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: t('session.chart.forceLabel') },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const yVal = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0
              return `${yVal.toFixed(2)} N`
            },
          },
        },
      },
    }
  }, [visiblePoints, t])

  return (
    <div className="force-chart" role="figure" aria-label={t('session.chart.forceLabel')}>
      <Line data={data} options={options} />
    </div>
  )
}
