import { httpGet, httpPost } from '../../shared/lib/http'

import {
  CreatePatientSchema,
  PatientListSchema,
  PatientSchema,
  type CreatePatientInput,
  type Patient,
} from './schema'

const PATIENTS_PATH = '/api/v1/patients'

/**
 * GET /api/v1/patients — entity-shaped list (id + 6 wire keys, see
 * WEB_REBUILD_PLAN.md §3). The schema rejects any extra key today; if the
 * backend ever adds new fields the failure surfaces as a 422-class
 * ApiError with the offending key in `cause`, not as a runtime crash.
 */
export function listPatients(signal?: AbortSignal): Promise<Patient[]> {
  const opts = signal ? { signal } : {}
  return httpGet(PATIENTS_PATH, PatientListSchema, opts)
}

/**
 * POST /api/v1/patients — backend echoes the entity shape (status 201).
 * The request body is validated with `CreatePatientSchema` BEFORE sending
 * so callers cannot accidentally bypass the input contract by passing
 * unsanitized form values.
 */
export async function createPatient(
  input: CreatePatientInput,
  signal?: AbortSignal,
): Promise<Patient> {
  // `async` so a zod validation throw becomes a Promise rejection rather
  // than a synchronous throw — callers (including TanStack Query
  // mutations) can `.catch()`/await without a try/catch wrapper.
  const validated = CreatePatientSchema.parse(input)
  const opts = signal ? { signal } : {}
  return httpPost(PATIENTS_PATH, PatientSchema, validated, opts)
}
