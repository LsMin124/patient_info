import { describe, expect, it } from 'vitest'

import type { MeasurementSummary } from '../../schema'
import { groupIntoVisits, pickVisitPairFromIds } from '../visits'

function s(measurementId: number, startTime: string): MeasurementSummary {
  return { measurementId, startTime, endTime: null, memo: null }
}

describe('groupIntoVisits', () => {
  it('pairs consecutive measurements: even idx=flexion, odd=extension', () => {
    const visits = groupIntoVisits([
      s(1, '2026-05-25T10:00:00'),
      s(2, '2026-05-25T10:00:10'),
      s(3, '2026-05-26T10:00:00'),
      s(4, '2026-05-26T10:00:10'),
    ])
    expect(visits).toHaveLength(2)
    expect(visits[0]!.visitNumber).toBe(1)
    expect(visits[0]!.flexion.measurementId).toBe(1)
    expect(visits[0]!.extension?.measurementId).toBe(2)
    expect(visits[1]!.visitNumber).toBe(2)
    expect(visits[1]!.flexion.measurementId).toBe(3)
    expect(visits[1]!.extension?.measurementId).toBe(4)
  })

  it('sorts input by startTime first (does not trust source order)', () => {
    const visits = groupIntoVisits([
      s(4, '2026-05-26T10:00:10'),
      s(2, '2026-05-25T10:00:10'),
      s(3, '2026-05-26T10:00:00'),
      s(1, '2026-05-25T10:00:00'),
    ])
    expect(visits[0]!.flexion.measurementId).toBe(1)
    expect(visits[0]!.extension?.measurementId).toBe(2)
    expect(visits[1]!.flexion.measurementId).toBe(3)
    expect(visits[1]!.extension?.measurementId).toBe(4)
  })

  it('emits a partial visit (flexion only) when the count is odd', () => {
    const visits = groupIntoVisits([
      s(1, '2026-05-25T10:00:00'),
      s(2, '2026-05-25T10:00:10'),
      s(3, '2026-05-26T10:00:00'),
    ])
    expect(visits).toHaveLength(2)
    expect(visits[1]!.flexion.measurementId).toBe(3)
    expect(visits[1]!.extension).toBeNull()
  })

  it('returns empty array for empty input', () => {
    expect(groupIntoVisits([])).toEqual([])
  })
})

describe('pickVisitPairFromIds', () => {
  const sessions = [
    s(1, '2026-05-25T10:00:00'),
    s(2, '2026-05-25T10:00:10'),
    s(3, '2026-05-26T10:00:00'),
    s(4, '2026-05-26T10:00:10'),
    s(5, '2026-05-27T10:00:00'),
    s(6, '2026-05-27T10:00:10'),
  ]

  it('resolves 4 ids forming two complete visits', () => {
    const result = pickVisitPairFromIds([1, 2, 3, 4], sessions)
    expect(result).not.toBeNull()
    expect(result!.baselineVisit.visitNumber).toBe(1)
    expect(result!.followupVisit.visitNumber).toBe(2)
  })

  it('tolerates URL ordering (ids in any order)', () => {
    const result = pickVisitPairFromIds([4, 1, 3, 2], sessions)
    expect(result!.baselineVisit.visitNumber).toBe(1)
    expect(result!.followupVisit.visitNumber).toBe(2)
  })

  it('picks the right two visits when more than two visits exist', () => {
    const result = pickVisitPairFromIds([3, 4, 5, 6], sessions)
    expect(result!.baselineVisit.visitNumber).toBe(2)
    expect(result!.followupVisit.visitNumber).toBe(3)
  })

  it('returns null when ids belong to a single visit (dup payload)', () => {
    expect(pickVisitPairFromIds([1, 2, 1, 2], sessions)).toBeNull()
  })

  it('returns null for ids count !== 4', () => {
    expect(pickVisitPairFromIds([1, 2], sessions)).toBeNull()
    expect(pickVisitPairFromIds([1, 2, 3], sessions)).toBeNull()
    expect(pickVisitPairFromIds([1, 2, 3, 4, 5], sessions)).toBeNull()
  })

  it('returns null when a partial visit (no extension) is involved', () => {
    const oddSessions = [
      s(1, '2026-05-25T10:00:00'),
      s(2, '2026-05-25T10:00:10'),
      s(3, '2026-05-26T10:00:00'),
    ]
    expect(pickVisitPairFromIds([1, 2, 3, 99], oddSessions)).toBeNull()
  })

  it('returns null when ids span 3 visits instead of cleanly 2', () => {
    expect(pickVisitPairFromIds([1, 2, 3, 6], sessions)).toBeNull()
  })

  it('returns null when an id cannot be located in the session list', () => {
    expect(pickVisitPairFromIds([1, 2, 999, 1000], sessions)).toBeNull()
  })
})
