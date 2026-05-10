import { z } from 'zod'

/**
 * Wire shape for GET /api/v1/patients/{patientId}/measurements (camelCase).
 * Locks: ISO-8601 startTime, nullable endTime (in-progress) and memo (no input).
 * See WEB_REBUILD_PLAN.md §3 + IMPL_SPEC §7.7 (in-progress handling).
 */
const ISO_LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/

export const MeasurementSummarySchema = z
  .object({
    measurementId: z.number().int(),
    startTime: z.string().regex(ISO_LOCAL_DATE_TIME, 'startTime must be ISO-8601 LocalDateTime'),
    endTime: z
      .string()
      .regex(ISO_LOCAL_DATE_TIME, 'endTime must be ISO-8601 LocalDateTime')
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    memo: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  .strict()

export type MeasurementSummary = z.infer<typeof MeasurementSummarySchema>

export const MeasurementListSchema = z.array(MeasurementSummarySchema)

/**
 * GET /api/v1/measurements/{id}/data — list of force samples. Service layer
 * sorts ascending by timeOffsetMs (verified by the backend contract test
 * ReadApiContractTest.getDataPoints_returnsCamelCaseKeysAndOrderedAsc).
 */
export const DataPointSchema = z
  .object({
    timeOffsetMs: z.number().int().min(0),
    kgValue: z.number(),
  })
  .strict()

export type DataPoint = z.infer<typeof DataPointSchema>

export const DataPointListSchema = z.array(DataPointSchema)

/**
 * POST /api/v1/measurements/start response. The wire key is
 * `measurement_Id` with capital `I` — preserved exactly. The transform
 * re-shapes it to `measurementId` for ergonomic consumption inside the app.
 * If the device firmware ever changes the wire key, the .strict() below
 * surfaces it immediately as a parse error.
 */
export const StartResponseSchema = z
  .object({
    measurement_Id: z.number().int(),
  })
  .strict()
  .transform((v) => ({ measurementId: v.measurement_Id }))

export type StartResponse = z.infer<typeof StartResponseSchema>

/**
 * POST /api/v1/measurements/start body. memo is optional on the wire — the
 * device may omit it; when present it is a free-text label the device sends.
 * The web is read-only for this endpoint per the architecture decision, but
 * the schema is here for completeness and future use behind a feature flag.
 */
export const StartRequestSchema = z
  .object({
    patientId: z.string().min(1),
    memo: z.string().optional(),
  })
  .strict()

export type StartRequest = z.infer<typeof StartRequestSchema>
