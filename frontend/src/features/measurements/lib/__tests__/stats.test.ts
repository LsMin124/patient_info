import { describe, expect, it } from 'vitest'

import { KGF_TO_N } from '../../../../shared/lib/units'
import type { DataPoint } from '../../schema'
import { computeSessionStats } from '../stats'

const N = KGF_TO_N

describe('computeSessionStats', () => {
  it('returns all-null stats for an empty session', () => {
    const s = computeSessionStats([])
    expect(s).toEqual({
      peakN: null,
      meanN: null,
      timeToPeakMs: null,
      rfd0_100: null,
      rfd100_200: null,
      impulseNs: null,
    })
  })

  it('computes peak and time-to-peak from the highest sample', () => {
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 100, kgValue: 5 },
      { timeOffsetMs: 200, kgValue: 10 },
      { timeOffsetMs: 300, kgValue: 8 },
    ]
    const s = computeSessionStats(points)
    expect(s.peakN).toBeCloseTo(10 * N, 5)
    expect(s.timeToPeakMs).toBe(200)
  })

  it('computes mean across all samples in Newtons', () => {
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 2 },
      { timeOffsetMs: 100, kgValue: 4 },
    ]
    const s = computeSessionStats(points)
    expect(s.meanN).toBeCloseTo(3 * N, 5)
  })

  it('computes RFD 0-100 as (force@100 - force@0) / 0.1s', () => {
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 100, kgValue: 5 },
      { timeOffsetMs: 200, kgValue: 9 },
    ]
    const s = computeSessionStats(points)
    // (5*N - 0) / 0.1 = 50*N
    expect(s.rfd0_100).toBeCloseTo(50 * N, 4)
    // (9*N - 5*N) / 0.1 = 40*N
    expect(s.rfd100_200).toBeCloseTo(40 * N, 4)
  })

  it('interpolates force at RFD window edges between samples', () => {
    // No sample exactly at 100ms — must interpolate between 50 and 150.
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 50, kgValue: 2 },
      { timeOffsetMs: 150, kgValue: 6 },
      { timeOffsetMs: 250, kgValue: 10 },
    ]
    // force@100 interpolated: 2 + (6-2)*(50/100) = 4 kgf
    // force@0 = 0 → rfd0_100 = (4*N - 0) / 0.1 = 40*N
    const s = computeSessionStats(points)
    expect(s.rfd0_100).toBeCloseTo(40 * N, 4)
    // force@200 interpolated: 6 + (10-6)*(50/100) = 8 kgf
    // rfd100_200 = (8*N - 4*N) / 0.1 = 40*N
    expect(s.rfd100_200).toBeCloseTo(40 * N, 4)
  })

  it('returns null RFD when the window exceeds the sampled range', () => {
    // Session ends at 80ms — neither 100 nor 200 is reachable.
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 80, kgValue: 3 },
    ]
    const s = computeSessionStats(points)
    expect(s.rfd0_100).toBeNull()
    expect(s.rfd100_200).toBeNull()
  })

  it('computes impulse as the trapezoidal integral (N·s)', () => {
    // Constant 10 kgf for 1000ms → impulse = 10*N * 1.0s
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 10 },
      { timeOffsetMs: 1000, kgValue: 10 },
    ]
    const s = computeSessionStats(points)
    expect(s.impulseNs).toBeCloseTo(10 * N * 1.0, 4)
  })

  it('impulse handles a ramp: triangle area', () => {
    // 0→10 kgf over 1000ms → average 5 kgf → impulse = 5*N * 1.0s
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 1000, kgValue: 10 },
    ]
    const s = computeSessionStats(points)
    expect(s.impulseNs).toBeCloseTo(5 * N * 1.0, 4)
  })

  it('returns null impulse for a single-sample session', () => {
    const s = computeSessionStats([{ timeOffsetMs: 0, kgValue: 5 }])
    expect(s.impulseNs).toBeNull()
  })

  it('handles a sample exactly at a window edge without interpolation drift', () => {
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 1 },
      { timeOffsetMs: 100, kgValue: 3 },
      { timeOffsetMs: 200, kgValue: 7 },
    ]
    const s = computeSessionStats(points)
    expect(s.rfd0_100).toBeCloseTo((3 - 1) * N * 10, 4)
  })

  it('handles negative kgValue samples (sensor noise) without crashing', () => {
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: -0.5 },
      { timeOffsetMs: 100, kgValue: 4 },
    ]
    const s = computeSessionStats(points)
    expect(s.peakN).toBeCloseTo(4 * N, 5)
    expect(s.timeToPeakMs).toBe(100)
  })

  it('handles duplicate timeOffsetMs samples (zero-span interpolation)', () => {
    // Two samples share timeOffsetMs=100; forceAtMs must not divide by zero
    // and resolves the exact time to the first matching segment's start.
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 100, kgValue: 5 },
      { timeOffsetMs: 100, kgValue: 6 },
      { timeOffsetMs: 200, kgValue: 9 },
    ]
    const s = computeSessionStats(points)
    // force@100 → first matching segment [100,100] → 5 kgf; force@0 = 0
    // rfd0_100 = (5*N) / 0.1 = 50*N
    expect(s.rfd0_100).toBeCloseTo(50 * N, 4)
    expect(Number.isFinite(s.rfd100_200 ?? NaN)).toBe(true)
  })
})
