import { describe, expect, it } from 'vitest'

import type { DataPoint } from '../../schema'
import { lttbDownsample } from '../downsample'

function mkRamp(n: number): DataPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    timeOffsetMs: i,
    kgValue: i,
  }))
}

function mkSpike(n: number, peakIdx: number, peakValue: number): DataPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    timeOffsetMs: i,
    kgValue: i === peakIdx ? peakValue : 1,
  }))
}

describe('lttbDownsample', () => {
  it('returns the input verbatim when threshold <= 2', () => {
    const points = mkRamp(10)
    expect(lttbDownsample(points, 2)).toEqual(points)
    expect(lttbDownsample(points, 0)).toEqual(points)
  })

  it('returns the input verbatim when length <= threshold', () => {
    const points = mkRamp(5)
    expect(lttbDownsample(points, 10)).toEqual(points)
  })

  it('preserves first and last points exactly', () => {
    const points = mkRamp(1000)
    const out = lttbDownsample(points, 100)
    expect(out[0]).toEqual(points[0])
    expect(out.at(-1)).toEqual(points.at(-1))
  })

  it('outputs exactly `threshold` points', () => {
    const points = mkRamp(10_000)
    const out = lttbDownsample(points, 500)
    expect(out).toHaveLength(500)
  })

  it('output remains ascending by timeOffsetMs', () => {
    const points = mkRamp(2000)
    const out = lttbDownsample(points, 200)
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i]!.timeOffsetMs).toBeGreaterThanOrEqual(out[i - 1]!.timeOffsetMs)
    }
  })

  it('retains the peak of a spike curve (loss < 5%)', () => {
    // Per IMPL_SPEC §7.8: down-sampling must not flatten clinical peaks.
    const peakValue = 100
    const points = mkSpike(10_000, 5_000, peakValue)
    const out = lttbDownsample(points, 1500)
    const observedPeak = Math.max(...out.map((p) => p.kgValue))
    const loss = (peakValue - observedPeak) / peakValue
    expect(loss).toBeLessThan(0.05)
  })

  it('returns a fresh array (no aliasing of input)', () => {
    const points = mkRamp(10)
    const out = lttbDownsample(points, 20) // length <= threshold path
    expect(out).not.toBe(points)
  })
})
