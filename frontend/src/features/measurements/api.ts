import { httpGet } from '../../shared/lib/http'

import {
  DataPointListSchema,
  MeasurementListSchema,
  MeasurementSummarySchema,
  type DataPoint,
  type MeasurementSummary,
} from './schema'

/**
 * GET /api/v1/patients/{patientId}/measurements — session summaries for one
 * patient. The web is read-only for the measurement lifecycle (start/data/
 * stop are device-driven); this endpoint and getDataPoints are the only two
 * the session UI consumes. See WEB_REBUILD_PLAN.md §3.
 */
export function listSessions(
  patientId: string,
  signal?: AbortSignal,
): Promise<MeasurementSummary[]> {
  const opts = signal ? { signal } : {}
  return httpGet(
    `/api/v1/patients/${encodeURIComponent(patientId)}/measurements`,
    MeasurementListSchema,
    opts,
  )
}

/**
 * GET /api/v1/measurements/{id}/data — raw force samples for one session,
 * already sorted ascending by timeOffsetMs server-side (locked by
 * ReadApiContractTest). Returned values are kg-force; the UI converts to
 * Newtons at display time via shared/lib/units.ts — this module never
 * mutates the wire values.
 */
export function getDataPoints(measurementId: number, signal?: AbortSignal): Promise<DataPoint[]> {
  const opts = signal ? { signal } : {}
  return httpGet(
    `/api/v1/measurements/${encodeURIComponent(String(measurementId))}/data`,
    DataPointListSchema,
    opts,
  )
}

/**
 * GET /api/v1/measurements/{id} — single session summary by measurementId,
 * across all patients. Used by the compare flow so it can resolve metadata
 * for ids in the URL without scanning every patient's session list (the
 * previous implementation was capped at 4 patients due to rules-of-hooks,
 * which silently broke patient #5+ — see IMPL_SPEC §8.9 carry-over).
 */
export function getMeasurementSummary(
  measurementId: number,
  signal?: AbortSignal,
): Promise<MeasurementSummary> {
  const opts = signal ? { signal } : {}
  return httpGet(
    `/api/v1/measurements/${encodeURIComponent(String(measurementId))}`,
    MeasurementSummarySchema,
    opts,
  )
}
