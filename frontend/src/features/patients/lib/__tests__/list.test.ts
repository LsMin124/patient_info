import { describe, expect, it } from 'vitest'

import type { Patient } from '../../schema'
import { filterPatients, paginate, sortPatients } from '../list'

const mk = (over: Partial<Patient>): Patient => ({
  id: 1,
  patientId: 'p001',
  name: 'A',
  age: 30,
  sex: 'male',
  height: 175,
  weight: 70,
  ...over,
})

const rows: Patient[] = [
  mk({ id: 1, patientId: 'p001', name: '김민준' }),
  mk({ id: 2, patientId: 'p002', name: '이서연' }),
  mk({ id: 3, patientId: 'p010', name: '박지호' }),
]

describe('filterPatients', () => {
  it('matches both patientId and name (case-insensitive)', () => {
    expect(filterPatients(rows, 'p00').map((p) => p.id)).toEqual([1, 2])
    expect(filterPatients(rows, '서연')).toHaveLength(1)
    expect(filterPatients(rows, 'P010')).toHaveLength(1)
  })

  it('treats blank query as no filter', () => {
    expect(filterPatients(rows, '')).toHaveLength(3)
    expect(filterPatients(rows, '   ')).toHaveLength(3)
  })

  it('does not mutate the input array', () => {
    const before = [...rows]
    filterPatients(rows, 'p')
    expect(rows).toEqual(before)
  })
})

describe('sortPatients', () => {
  it('name sort uses Korean locale', () => {
    const sorted = sortPatients(rows, 'name').map((p) => p.name)
    // Korean alphabetic order: 김 < 박 < 이
    expect(sorted).toEqual(['김민준', '박지호', '이서연'])
  })

  it('registered sort is descending by id (newest first)', () => {
    expect(sortPatients(rows, 'registered').map((p) => p.id)).toEqual([3, 2, 1])
  })
})

describe('paginate', () => {
  const many = Array.from({ length: 60 }, (_, i) =>
    mk({ id: i + 1, patientId: `p${String(i + 1).padStart(3, '0')}`, name: `N${i + 1}` }),
  )

  it('returns page size and total counts', () => {
    const r = paginate(many, 1, 25)
    expect(r.rows).toHaveLength(25)
    expect(r.totalPages).toBe(3)
    expect(r.totalCount).toBe(60)
    expect(r.page).toBe(1)
  })

  it('clamps below 1', () => {
    expect(paginate(many, 0, 25).page).toBe(1)
    expect(paginate(many, -5, 25).page).toBe(1)
  })

  it('clamps above totalPages', () => {
    expect(paginate(many, 99, 25).page).toBe(3)
    expect(paginate(many, 99, 25).rows).toHaveLength(10)
  })

  it('handles empty input', () => {
    const r = paginate([], 1, 25)
    expect(r.totalPages).toBe(1)
    expect(r.rows).toHaveLength(0)
  })
})
