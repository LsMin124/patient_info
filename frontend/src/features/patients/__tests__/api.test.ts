import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../../../test/setup'
import { createPatient, listPatients } from '../api'

describe('listPatients', () => {
  it('returns the seeded list parsed by PatientSchema', async () => {
    const patients = await listPatients()
    expect(patients).toHaveLength(2)
    expect(patients[0]).toMatchObject({
      patientId: 'p001',
      name: '테스트환자A',
      sex: 'male',
    })
  })

  it('rejects responses missing a contract key', async () => {
    server.use(
      http.get('/api/v1/patients', () =>
        HttpResponse.json([
          {
            id: 1,
            patientId: 'p001',
            name: 'x',
            age: 30,
            // sex missing
            height: 175,
            weight: 70,
          },
        ]),
      ),
    )
    await expect(listPatients()).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
    })
  })
})

describe('createPatient', () => {
  it('serializes valid input and returns the parsed Patient on 201', async () => {
    const created = await createPatient({
      patientId: 'p100',
      name: '신환자',
      age: 25,
      sex: 'female',
      height: 165,
      weight: 55,
    })
    expect(created.patientId).toBe('p100')
    expect(created.name).toBe('신환자')
    expect(created.id).toEqual(expect.any(Number))
  })

  it('throws synchronously on invalid input (zod parse before fetch)', async () => {
    await expect(
      createPatient({
        // patientId fails the [A-Za-z0-9_-]{1,32} regex
        patientId: 'p 001',
        name: 'x',
        age: 25,
        sex: 'female',
        height: 165,
        weight: 55,
      }),
    ).rejects.toThrow()
  })

  it('surfaces backend rejection as ApiError without leaking details to message', async () => {
    server.use(
      http.post('/api/v1/patients', () =>
        HttpResponse.json({ error: 'Patient ID already exists: p001' }, { status: 409 }),
      ),
    )
    const err = await createPatient({
      patientId: 'p001',
      name: 'duplicate',
      age: 30,
      sex: 'male',
      height: 175,
      weight: 70,
    }).catch((e: unknown) => e)
    expect(err).toMatchObject({ name: 'ApiError', status: 409 })
    if (err instanceof Error) {
      expect(err.message).toBe('A record with this value already exists.')
      expect(err.message).not.toContain('p001')
    }
  })
})
