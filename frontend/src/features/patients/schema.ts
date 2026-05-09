import { z } from 'zod'

/**
 * Patient as returned by GET /api/v1/patients (entity-shape, includes the
 * numeric `id` PK). The wire keys MUST match exactly — see WEB_REBUILD_PLAN.md
 * §3 (Frozen Contract).
 */
export const PatientSchema = z
  .object({
    id: z.number().int(),
    patientId: z.string().min(1),
    name: z.string().min(1),
    age: z.number().int().min(0),
    sex: z.string().min(1),
    height: z.number(),
    weight: z.number(),
  })
  .strict()

export type Patient = z.infer<typeof PatientSchema>

export const PatientListSchema = z.array(PatientSchema)

/**
 * POST /api/v1/patients body. The server today returns 201 with the same
 * entity shape, so the response uses PatientSchema as well.
 *
 * patientId regex per IMPL_SPEC §7.15 — conservative whitelist so the form
 * does not reject unfamiliar real-world IDs while still blocking obvious
 * garbage. Backend remains source of truth.
 */
export const CreatePatientSchema = z
  .object({
    patientId: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, 'patientId may contain letters, digits, "_" and "-" only'),
    name: z.string().min(1).max(50),
    age: z.number().int().min(0).max(150),
    sex: z.enum(['male', 'female', 'other']),
    height: z.number().min(50).max(250),
    weight: z.number().min(10).max(250),
  })
  .strict()

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>
