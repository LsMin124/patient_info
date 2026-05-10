import { http, HttpResponse } from 'msw'

import type { Patient } from '../features/patients/schema'

/**
 * MSW handler hub for unit/integration tests. Each handler mirrors the wire
 * contract documented in WEB_REBUILD_PLAN.md §3 and protected by the backend
 * MockMvc tests in src/test/java/com/project/urp/controller/.
 *
 * Tests opt out of a default by calling `server.use(http.get(...))` to inject
 * a per-test override.
 */

const seedPatients: Patient[] = [
  {
    id: 1,
    patientId: 'p001',
    name: '테스트환자A',
    age: 30,
    sex: 'male',
    height: 175,
    weight: 70,
  },
  {
    id: 2,
    patientId: 'p002',
    name: '테스트환자B',
    age: 25,
    sex: 'female',
    height: 165,
    weight: 55,
  },
]

export const handlers = [
  http.get('/api/v1/patients', () => HttpResponse.json(seedPatients)),

  http.post('/api/v1/patients', async ({ request }) => {
    const body = (await request.json()) as Partial<Patient>
    const created: Patient = {
      id: Date.now(),
      patientId: body.patientId ?? 'p999',
      name: body.name ?? '신환자',
      age: body.age ?? 0,
      sex: body.sex ?? 'other',
      height: body.height ?? 170,
      weight: body.weight ?? 60,
    }
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('/api/v1/patients/:patientId/measurements', () => HttpResponse.json([])),

  http.get('/api/v1/measurements/:id/data', () => HttpResponse.json([])),
]

/**
 * Convenience builders for tests that need to override a single endpoint.
 * Keeps the override DSL terse: `server.use(...listPatientsReturning([...]))`
 */
export function listPatientsReturning(patients: Patient[]) {
  return [http.get('/api/v1/patients', () => HttpResponse.json(patients))]
}

export function createPatientFailing(status: number, body: Record<string, unknown> = {}) {
  return [http.post('/api/v1/patients', () => HttpResponse.json(body, { status }))]
}
