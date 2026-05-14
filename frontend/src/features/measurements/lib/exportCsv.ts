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

export function buildCsv(points: ReadonlyArray<DataPoint>): string {
  const rows = points.map((p) => {
    const forceN = kgfToN(p.kgValue)
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
  URL.revokeObjectURL(url)
}
