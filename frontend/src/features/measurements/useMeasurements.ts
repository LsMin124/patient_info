import { useQuery } from '@tanstack/react-query'

import { getDataPoints, listSessions } from './api'
import type { DataPoint, MeasurementSummary } from './schema'

/**
 * Query key namespaces. Sessions are keyed by patientId; data points by
 * measurementId. Both are read-only — there is no mutation that would need
 * to invalidate them (the device drives the measurement lifecycle).
 */
export const sessionsKey = (patientId: string) => ['sessions', patientId] as const
export const dataPointsKey = (measurementId: number) => ['dataPoints', measurementId] as const

// Distinct sentinel keys for the disabled state so cache writes never
// collide with a hypothetical real patientId === '' or measurementId === -1.
const DISABLED_SESSIONS_KEY = ['sessions', '__disabled__'] as const
const DISABLED_DATA_KEY = ['dataPoints', '__disabled__'] as const

export function useSessionsQuery(patientId: string | undefined) {
  return useQuery<MeasurementSummary[], Error>({
    queryKey: patientId ? sessionsKey(patientId) : DISABLED_SESSIONS_KEY,
    queryFn: ({ signal }) => listSessions(patientId as string, signal),
    enabled: Boolean(patientId),
  })
}

export function useDataPointsQuery(measurementId: number | undefined) {
  const enabled = typeof measurementId === 'number' && measurementId > 0
  return useQuery<DataPoint[], Error>({
    queryKey: enabled ? dataPointsKey(measurementId as number) : DISABLED_DATA_KEY,
    queryFn: ({ signal }) => getDataPoints(measurementId as number, signal),
    enabled,
    // Force samples never change once a session is stopped; keep them
    // fresh for the whole session so re-visiting a chart is instant.
    staleTime: 5 * 60_000,
  })
}
