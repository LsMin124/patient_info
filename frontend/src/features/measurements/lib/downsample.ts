import type { DataPoint } from '../schema'

/**
 * Largest-Triangle-Three-Buckets downsampling (Sveinn Steinarsson 2013).
 *
 * Reduces a long, dense time-series to `threshold` points while preserving
 * the visual shape — crucial for clinical force curves where peaks must
 * not be flattened away. The algorithm walks the source in three buckets
 * per output point and keeps the candidate that maximises the triangle
 * area formed with the previous selected point and the next bucket's
 * average — see https://skemman.is/handle/1946/15343 for the original
 * thesis.
 *
 * Vendored (≈40 lines) rather than pulled from npm because the only
 * available package (`downsample-lttb@0.0.1`) had no tests, no types,
 * and a single maintainer — unsuitable for a clinical bundle.
 *
 * Contract:
 *  - Input must be sorted ascending by `timeOffsetMs` (the API guarantees
 *    this, locked by ReadApiContractTest server-side).
 *  - If `threshold <= 2` or `points.length <= threshold`, the input is
 *    returned verbatim (a defensive copy).
 *  - The first and last points are always retained.
 *  - Output preserves the `DataPoint` shape (timeOffsetMs / kgValue).
 */
export function lttbDownsample(points: ReadonlyArray<DataPoint>, threshold: number): DataPoint[] {
  const n = points.length
  if (threshold <= 2 || n <= threshold) return [...points]

  const sampled: DataPoint[] = []
  // Bucket size; leave one bucket each for the first and last point.
  const bucketSize = (n - 2) / (threshold - 2)
  let aIdx = 0
  sampled.push(points[0]!)

  for (let i = 0; i < threshold - 2; i += 1) {
    // Next bucket's average (point c) — anchor for the triangle.
    const nextStart = Math.floor((i + 1) * bucketSize) + 1
    const nextEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n)
    const nextLen = nextEnd - nextStart || 1
    let avgX = 0
    let avgY = 0
    for (let k = nextStart; k < nextEnd; k += 1) {
      avgX += points[k]!.timeOffsetMs
      avgY += points[k]!.kgValue
    }
    avgX /= nextLen
    avgY /= nextLen

    // Current bucket — pick the point that maximises triangle area with
    // (a, c).
    const rangeStart = Math.floor(i * bucketSize) + 1
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1
    const aPoint = points[aIdx]!
    let maxArea = -1
    let chosen = points[rangeStart]!
    let chosenIdx = rangeStart
    for (let k = rangeStart; k < rangeEnd; k += 1) {
      const p = points[k]!
      const area = Math.abs(
        (aPoint.timeOffsetMs - avgX) * (p.kgValue - aPoint.kgValue) -
          (aPoint.timeOffsetMs - p.timeOffsetMs) * (avgY - aPoint.kgValue),
      )
      if (area > maxArea) {
        maxArea = area
        chosen = p
        chosenIdx = k
      }
    }
    sampled.push(chosen)
    aIdx = chosenIdx
  }

  sampled.push(points[n - 1]!)
  return sampled
}
