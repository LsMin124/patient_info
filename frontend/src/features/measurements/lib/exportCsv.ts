import { kgfToN } from '../../../shared/lib/units'
import type { DataPoint } from '../schema'

/**
 * Build the CSV text body for a session's force curve.
 *
 * Columns: time_offset_ms, force_n, kg_value
 * - time_offset_ms / kg_value mirror the wire keys exactly so the export
 *   round-trips against the raw API payload.
 * - force_n is the derived Newton value (kgfToN) — clinical staff work in
 *   Newtons; including both columns avoids a lossy choice.
 * A UTF-8 BOM is prepended so Excel on Windows opens Korean text correctly.
 */
const BOM = '﻿'
const HEADER = 'time_offset_ms,force_n,kg_value'

/**
 * Fractional digits for the derived force_n column. 6 is past the visible
 * tooltip precision (2) but well below IEEE 754 double's 15-significant-
 * digit limit, so clinical staff reading the export against the on-screen
 * tooltip see consistent numbers without losing precision they actually need.
 */
const FORCE_N_DIGITS = 6

export function buildCsv(points: ReadonlyArray<DataPoint>): string {
  const rows = points.map((p) => {
    const forceN = kgfToN(p.kgValue).toFixed(FORCE_N_DIGITS)
    return `${p.timeOffsetMs},${forceN},${p.kgValue}`
  })
  return BOM + [HEADER, ...rows].join('\r\n') + '\r\n'
}

/**
 * Filename for a session export: session-{id}-{startISO}.csv with the
 * colons stripped from the ISO timestamp so it is filesystem-safe on all
 * platforms. `startTime` is the ISO-8601 string from the wire contract.
 */
export function csvFilename(measurementId: number, startTime: string): string {
  const safeStamp = startTime.replace(/[:.]/g, '-')
  return `session-${measurementId}-${safeStamp}.csv`
}

/**
 * Trigger a browser download of the session CSV. Side-effecting (creates a
 * blob URL + temporary anchor); kept here so the React component stays a
 * thin caller and the download mechanics are unit-testable in isolation.
 */
export function downloadSessionCsv(
  measurementId: number,
  startTime: string,
  points: ReadonlyArray<DataPoint>,
): void {
  const csv = buildCsv(points)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = csvFilename(measurementId, startTime)
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Defer revocation: Safari and Firefox can drop the download if the
  // blob URL is revoked on the same tick as anchor.click(); Chromium
  // tolerates it but the deferred path is correct everywhere.
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
