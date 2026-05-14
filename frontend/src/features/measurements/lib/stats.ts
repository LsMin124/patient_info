import { KGF_TO_N } from '../../../shared/lib/units'
import type { DataPoint } from '../schema'

/**
 * Summary statistics for one measurement session, all force values already
 * converted to Newtons (the wire values are kg-force; see units.ts).
 *
 * A field is `null` when it cannot be computed from the available samples
 * (empty session, or RFD windows the session is too short to cover). The UI
 * renders null as '-' rather than a misleading 0.
 */
export interface SessionStats {
  /** Peak force (N). */
  peakN: number | null
  /** Arithmetic mean of all samples (N). */
  meanN: number | null
  /** timeOffsetMs at which the peak occurs. */
  timeToPeakMs: number | null
  /** Rate of force development 0→100ms (N/s). */
  rfd0_100: number | null
  /** Rate of force development 100→200ms (N/s). */
  rfd100_200: number | null
  /** Impulse — trapezoidal integral of force over time (N·s). */
  impulseNs: number | null
}

const EMPTY_STATS: SessionStats = {
  peakN: null,
  meanN: null,
  timeToPeakMs: null,
  rfd0_100: null,
  rfd100_200: null,
  impulseNs: null,
}

/**
 * Linear-interpolate the force (in N) at an arbitrary time within a curve
 * whose points are sorted ascending by timeOffsetMs. Returns null when the
 * target time is outside the sampled range — RFD must not extrapolate.
 */
function forceAtMs(points: ReadonlyArray<DataPoint>, targetMs: number): number | null {
  if (points.length === 0) return null
  const first = points[0]!
  const last = points[points.length - 1]!
  if (targetMs < first.timeOffsetMs || targetMs > last.timeOffsetMs) return null

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!
    const b = points[i + 1]!
    if (targetMs >= a.timeOffsetMs && targetMs <= b.timeOffsetMs) {
      const span = b.timeOffsetMs - a.timeOffsetMs
      if (span === 0) return a.kgValue * KGF_TO_N
      const ratio = (targetMs - a.timeOffsetMs) / span
      const kgf = a.kgValue + (b.kgValue - a.kgValue) * ratio
      return kgf * KGF_TO_N
    }
  }
  // targetMs === last.timeOffsetMs exactly
  return last.kgValue * KGF_TO_N
}

/**
 * RFD over a [startMs, endMs] window: (forceEnd - forceStart) / windowSeconds.
 * Returns null if either endpoint falls outside the sampled range.
 */
function rfd(points: ReadonlyArray<DataPoint>, startMs: number, endMs: number): number | null {
  const fStart = forceAtMs(points, startMs)
  const fEnd = forceAtMs(points, endMs)
  if (fStart === null || fEnd === null) return null
  const windowSeconds = (endMs - startMs) / 1000
  return (fEnd - fStart) / windowSeconds
}

/**
 * Trapezoidal integral of force (N) over time (s) → impulse in N·s.
 */
function impulse(points: ReadonlyArray<DataPoint>): number | null {
  if (points.length < 2) return null
  let total = 0
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!
    const b = points[i + 1]!
    const dtSeconds = (b.timeOffsetMs - a.timeOffsetMs) / 1000
    const avgForceN = ((a.kgValue + b.kgValue) / 2) * KGF_TO_N
    total += avgForceN * dtSeconds
  }
  return total
}

/**
 * Compute all summary statistics for a session's force curve.
 * `points` MUST be sorted ascending by timeOffsetMs (the API guarantees this;
 * locked by the backend ReadApiContractTest).
 */
export function computeSessionStats(points: ReadonlyArray<DataPoint>): SessionStats {
  if (points.length === 0) return { ...EMPTY_STATS }

  let peakKgf = points[0]!.kgValue
  let timeToPeakMs = points[0]!.timeOffsetMs
  let sumKgf = 0
  for (const p of points) {
    if (p.kgValue > peakKgf) {
      peakKgf = p.kgValue
      timeToPeakMs = p.timeOffsetMs
    }
    sumKgf += p.kgValue
  }

  return {
    peakN: peakKgf * KGF_TO_N,
    meanN: (sumKgf / points.length) * KGF_TO_N,
    timeToPeakMs,
    rfd0_100: rfd(points, 0, 100),
    rfd100_200: rfd(points, 100, 200),
    impulseNs: impulse(points),
  }
}
