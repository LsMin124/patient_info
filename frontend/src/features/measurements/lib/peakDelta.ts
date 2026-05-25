import { KGF_TO_N } from '../../../shared/lib/units'
import type { DataPoint } from '../schema'

export interface PeakDeltaResult {
  baselinePeakN: number
  followupPeakN: number
  /** Time of peak in seconds (for the chart marker). */
  baselinePeakTimeSec: number
  followupPeakTimeSec: number
  /** N(follow-up) − N(baseline). Sign-bearing. */
  deltaN: number
  /** Same as deltaN expressed as a percentage of baselinePeakN; null if baseline=0. */
  deltaPercent: number | null
  /** 'up' for any positive Δ, 'down' for negative, 'flat' when within EPSILON_N. */
  direction: 'up' | 'down' | 'flat'
}

const EPSILON_N = 0.05 // any Δ ≤ ~5 cN counts as visually unchanged

/**
 * Pure peak-delta calculation for the visit-to-visit comparison figure.
 * Inputs are kgf data points from the device; outputs are all in Newtons.
 *
 * Empty / NaN-only inputs are treated as 0 N so the figure can still render
 * a sane "0 N → 0 N" panel (the chart itself will be empty).
 */
export function computePeakDelta(
  baseline: ReadonlyArray<DataPoint>,
  followup: ReadonlyArray<DataPoint>,
): PeakDeltaResult {
  const a = peakInfo(baseline)
  const b = peakInfo(followup)
  const deltaN = b.peakN - a.peakN
  const deltaPercent = a.peakN > 0 ? (deltaN / a.peakN) * 100 : null
  let direction: PeakDeltaResult['direction']
  if (Math.abs(deltaN) <= EPSILON_N) direction = 'flat'
  else direction = deltaN > 0 ? 'up' : 'down'

  return {
    baselinePeakN: a.peakN,
    followupPeakN: b.peakN,
    baselinePeakTimeSec: a.timeSec,
    followupPeakTimeSec: b.timeSec,
    deltaN,
    deltaPercent,
    direction,
  }
}

function peakInfo(points: ReadonlyArray<DataPoint>): { peakN: number; timeSec: number } {
  let peakKgf = 0
  let peakIdx = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (!p) continue
    const v = p.kgValue
    if (Number.isFinite(v) && v > peakKgf) {
      peakKgf = v
      peakIdx = i
    }
  }
  const peakPoint = points[peakIdx]
  const timeSec = peakPoint ? peakPoint.timeOffsetMs / 1000 : 0
  return { peakN: peakKgf * KGF_TO_N, timeSec }
}
