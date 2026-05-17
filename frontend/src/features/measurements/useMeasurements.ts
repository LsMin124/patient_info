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

export function useSessionsQuery(patientId: string | undefined) {
  return useQuery<MeasurementSummary[], Error>({
    queryKey: sessionsKey(patientId ?? ''),
    queryFn: ({ signal }) => listSessions(patientId as string, signal),
    enabled: Boolean(patientId),
  })
}

export function useDataPointsQuery(measurementId: number | undefined) {
  return useQuery<DataPoint[], Error>({
    queryKey: dataPointsKey(measurementId ?? -1),
    queryFn: ({ signal }) => getDataPoints(measurementId as number, signal),
    enabled: typeof measurementId === 'number' && measurementId > 0,
    // Force samples never change once a session is stopped; keep them
    // fresh for the whole session so re-visiting a chart is instant.
    staleTime: 5 * 60_000,
  })
}
