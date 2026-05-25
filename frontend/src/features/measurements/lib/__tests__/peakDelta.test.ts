import { describe, expect, it } from 'vitest'

import { KGF_TO_N } from '../../../../shared/lib/units'
import type { DataPoint } from '../../schema'
import { computePeakDelta } from '../peakDelta'

function curve(peakKgf: number, peakAtMs: number): DataPoint[] {
  // simple triangle: ramps from 0 → peak (at peakAtMs) → back to 0 at 2*peakAtMs
  const out: DataPoint[] = []
  const half = peakAtMs
  for (let t = 0; t <= 2 * half; t += 10) {
    const v = t <= half ? (t / half) * peakKgf : ((2 * half - t) / half) * peakKgf
    out.push({ timeOffsetMs: t, kgValue: Math.max(0, v) })
  }
  return out
}

describe('computePeakDelta', () => {
  it('reports both peaks in Newtons and a positive delta when follow-up improves', () => {
    const result = computePeakDelta(curve(20, 500), curve(28, 500))
    expect(result.baselinePeakN).toBeCloseTo(20 * KGF_TO_N, 3)
    expect(result.followupPeakN).toBeCloseTo(28 * KGF_TO_N, 3)
    expect(result.deltaN).toBeCloseTo(8 * KGF_TO_N, 3)
    expect(result.deltaPercent).toBeCloseTo(40, 1)
    expect(result.direction).toBe('up')
  })

  it('reports negative delta + "down" when follow-up regresses', () => {
    const result = computePeakDelta(curve(30, 400), curve(25, 400))
    expect(result.deltaN).toBeCloseTo(-5 * KGF_TO_N, 3)
    expect(result.deltaPercent).toBeCloseTo((-5 / 30) * 100, 1)
    expect(result.direction).toBe('down')
  })

  it('classifies sub-epsilon Δ as "flat"', () => {
    const a = curve(15.0, 400)
    const b = curve(15.001, 400) // tiny noise
    const result = computePeakDelta(a, b)
    expect(result.direction).toBe('flat')
  })

  it('reports peak time (seconds) for chart markers', () => {
    const result = computePeakDelta(curve(20, 800), curve(28, 1200))
    expect(result.baselinePeakTimeSec).toBeCloseTo(0.8, 3)
    expect(result.followupPeakTimeSec).toBeCloseTo(1.2, 3)
  })

  it('handles empty baseline gracefully (deltaPercent=null, direction=up if followup non-zero)', () => {
    const result = computePeakDelta([], curve(20, 500))
    expect(result.baselinePeakN).toBe(0)
    expect(result.followupPeakN).toBeCloseTo(20 * KGF_TO_N, 3)
    expect(result.deltaPercent).toBeNull()
    expect(result.direction).toBe('up')
  })

  it('handles both empty: flat zero', () => {
    const result = computePeakDelta([], [])
    expect(result.baselinePeakN).toBe(0)
    expect(result.followupPeakN).toBe(0)
    expect(result.deltaN).toBe(0)
    expect(result.deltaPercent).toBeNull()
    expect(result.direction).toBe('flat')
  })

  it('skips NaN values when finding the peak', () => {
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 5 },
      { timeOffsetMs: 100, kgValue: NaN },
      { timeOffsetMs: 200, kgValue: 7 },
    ]
    const result = computePeakDelta(points, curve(10, 300))
    expect(result.baselinePeakN).toBeCloseTo(7 * KGF_TO_N, 3)
    expect(result.followupPeakN).toBeCloseTo(10 * KGF_TO_N, 3)
  })
})
