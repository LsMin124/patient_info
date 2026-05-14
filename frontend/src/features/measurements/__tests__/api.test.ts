import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../../../test/setup'
import { getDataPoints, listSessions } from '../api'

describe('listSessions', () => {
  it('returns the seeded session list parsed by MeasurementListSchema', async () => {
    const sessions = await listSessions('p001')
    expect(sessions).toHaveLength(2)
    expect(sessions[0]).toMatchObject({ measurementId: 101, memo: 'L knee' })
  })

  it('normalizes an in-progress session (endTime null) and null memo', async () => {
    const sessions = await listSessions('p001')
    const inProgress = sessions.find((s) => s.measurementId === 102)
    expect(inProgress?.endTime).toBeNull()
    expect(inProgress?.memo).toBeNull()
  })

  it('rejects a session with a non-ISO startTime', async () => {
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', () =>
        HttpResponse.json([
          { measurementId: 1, startTime: '2026/05/01 10:30', endTime: null, memo: null },
        ]),
      ),
    )
    await expect(listSessions('p001')).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
    })
  })

  it('url-encodes the patientId path segment', async () => {
    let captured = ''
    server.use(
      http.get('/api/v1/patients/:patientId/measurements', ({ params }) => {
        captured = String(params.patientId)
        return HttpResponse.json([])
      }),
    )
    await listSessions('p 001')
    expect(captured).toBe('p 001')
  })
})

describe('getDataPoints', () => {
  it('returns the seeded force curve parsed by DataPointListSchema', async () => {
    const points = await getDataPoints(101)
    expect(points).toHaveLength(7)
    expect(points[0]).toEqual({ timeOffsetMs: 0, kgValue: 0 })
    expect(points.at(-1)).toEqual({ timeOffsetMs: 300, kgValue: 6.0 })
  })

  it('returns an empty array for a session with no data', async () => {
    server.use(http.get('/api/v1/measurements/:id/data', () => HttpResponse.json([])))
    await expect(getDataPoints(999)).resolves.toEqual([])
  })

  it('rejects a data point with a negative timeOffsetMs', async () => {
    server.use(
      http.get('/api/v1/measurements/:id/data', () =>
        HttpResponse.json([{ timeOffsetMs: -1, kgValue: 0 }]),
      ),
    )
    await expect(getDataPoints(101)).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
    })
  })
})
