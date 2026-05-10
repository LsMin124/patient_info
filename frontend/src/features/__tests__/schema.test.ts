import { describe, it, expect } from 'vitest'

import {
  DataPointListSchema,
  DataPointSchema,
  MeasurementListSchema,
  MeasurementSummarySchema,
  StartRequestSchema,
  StartResponseSchema,
} from '../measurements/schema'
import { CreatePatientSchema, PatientListSchema, PatientSchema } from '../patients/schema'

describe('PatientSchema', () => {
  const valid = {
    id: 1,
    patientId: 'p001',
    name: '테스트환자A',
    age: 25,
    sex: 'male',
    height: 175.0,
    weight: 70.0,
  }

  it('parses a complete entity-shaped patient', () => {
    expect(PatientSchema.parse(valid)).toEqual(valid)
  })

  it('rejects unknown extra keys (strict)', () => {
    expect(() => PatientSchema.parse({ ...valid, extra: 'nope' })).toThrow()
  })

  it('rejects negative age', () => {
    expect(() => PatientSchema.parse({ ...valid, age: -1 })).toThrow()
  })

  it('parses a list of patients', () => {
    expect(PatientListSchema.parse([valid])).toHaveLength(1)
  })
})

describe('CreatePatientSchema', () => {
  const valid = {
    patientId: 'p100',
    name: '신환자',
    age: 25,
    sex: 'female',
    height: 165.0,
    weight: 55.0,
  }

  it('accepts well-formed input', () => {
    expect(CreatePatientSchema.parse(valid)).toEqual(valid)
  })

  it('accepts patientId with letters, digits, dash, underscore', () => {
    expect(CreatePatientSchema.parse({ ...valid, patientId: 'P-001_test' })).toBeTruthy()
  })

  it('rejects patientId with spaces or special chars', () => {
    expect(() => CreatePatientSchema.parse({ ...valid, patientId: 'p 001' })).toThrow()
    expect(() => CreatePatientSchema.parse({ ...valid, patientId: 'p#001' })).toThrow()
  })

  it('rejects patientId longer than 32 chars', () => {
    expect(() => CreatePatientSchema.parse({ ...valid, patientId: 'p'.repeat(33) })).toThrow()
  })

  it('rejects sex outside the enum', () => {
    expect(() => CreatePatientSchema.parse({ ...valid, sex: 'unknown' })).toThrow()
  })

  it('rejects out-of-range height/weight', () => {
    expect(() => CreatePatientSchema.parse({ ...valid, height: 30 })).toThrow()
    expect(() => CreatePatientSchema.parse({ ...valid, weight: 300 })).toThrow()
  })
})

describe('MeasurementSummarySchema', () => {
  const completed = {
    measurementId: 123,
    startTime: '2026-05-09T10:30:00',
    endTime: '2026-05-09T10:35:00',
    memo: 'L knee',
  }

  it('parses a completed session', () => {
    const r = MeasurementSummarySchema.parse(completed)
    expect(r.endTime).toBe('2026-05-09T10:35:00')
    expect(r.memo).toBe('L knee')
  })

  it('parses an in-progress session (endTime null)', () => {
    const r = MeasurementSummarySchema.parse({ ...completed, endTime: null })
    expect(r.endTime).toBeNull()
  })

  it('parses a session with omitted endTime as null', () => {
    const { endTime: _e, ...withoutEnd } = completed
    const r = MeasurementSummarySchema.parse(withoutEnd)
    expect(r.endTime).toBeNull()
  })

  it('parses a session with null memo', () => {
    expect(MeasurementSummarySchema.parse({ ...completed, memo: null }).memo).toBeNull()
  })

  it('rejects non-ISO-8601 startTime', () => {
    expect(() =>
      MeasurementSummarySchema.parse({ ...completed, startTime: '2026/05/09 10:30:00' }),
    ).toThrow()
  })

  it('parses a list', () => {
    expect(MeasurementListSchema.parse([completed])).toHaveLength(1)
  })
})

describe('DataPointSchema', () => {
  it('parses a sample', () => {
    expect(DataPointSchema.parse({ timeOffsetMs: 100, kgValue: 1.98 })).toBeTruthy()
  })

  it('accepts negative kgValue (sensor noise)', () => {
    expect(DataPointSchema.parse({ timeOffsetMs: 0, kgValue: -0.05 })).toBeTruthy()
  })

  it('rejects negative timeOffsetMs', () => {
    expect(() => DataPointSchema.parse({ timeOffsetMs: -1, kgValue: 0 })).toThrow()
  })

  it('rejects extra keys (strict)', () => {
    expect(() => DataPointSchema.parse({ timeOffsetMs: 0, kgValue: 0, extra: 1 })).toThrow()
  })

  it('parses a list', () => {
    const samples = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 50, kgValue: 1.5 },
    ]
    expect(DataPointListSchema.parse(samples)).toHaveLength(2)
  })
})

describe('StartResponseSchema', () => {
  it('parses measurement_Id (capital I) and renames to measurementId', () => {
    const r = StartResponseSchema.parse({ measurement_Id: 42 })
    expect(r).toEqual({ measurementId: 42 })
  })

  it('rejects lowercase measurement_id', () => {
    expect(() => StartResponseSchema.parse({ measurement_id: 42 })).toThrow()
  })

  it('rejects extra fields', () => {
    expect(() => StartResponseSchema.parse({ measurement_Id: 1, extra: 2 })).toThrow()
  })
})

describe('StartRequestSchema', () => {
  it('parses with memo', () => {
    expect(StartRequestSchema.parse({ patientId: 'p001', memo: 'L' })).toBeTruthy()
  })

  it('parses without memo', () => {
    expect(StartRequestSchema.parse({ patientId: 'p001' })).toBeTruthy()
  })

  it('rejects empty patientId', () => {
    expect(() => StartRequestSchema.parse({ patientId: '' })).toThrow()
  })
})
