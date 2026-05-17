import { describe, expect, it } from 'vitest'

import { MAX_COMPARE_IDS, parseCompareIds } from '../compareIds'

describe('parseCompareIds', () => {
  it('returns empty for null/undefined/empty input', () => {
    expect(parseCompareIds(null)).toEqual([])
    expect(parseCompareIds(undefined)).toEqual([])
    expect(parseCompareIds('')).toEqual([])
  })

  it('parses a well-formed comma-separated list', () => {
    expect(parseCompareIds('1,2,3')).toEqual([1, 2, 3])
  })

  it('sorts ascending and dedupes', () => {
    expect(parseCompareIds('5,1,5,3')).toEqual([1, 3, 5])
  })

  it('drops non-positive, non-integer, or non-numeric segments', () => {
    expect(parseCompareIds('1,0,-3,abc,2.5,4')).toEqual([1, 4])
  })

  it('drops segments longer than 15 digits (regex cap)', () => {
    expect(parseCompareIds('1234567890123456,1')).toEqual([1])
  })

  it('caps at MAX_COMPARE_IDS', () => {
    expect(parseCompareIds('1,2,3,4,5,6')).toHaveLength(MAX_COMPARE_IDS)
  })

  it('tolerates whitespace around segments', () => {
    expect(parseCompareIds(' 1 , 2 , 3 ')).toEqual([1, 2, 3])
  })

  it('drops empty segments from trailing commas', () => {
    expect(parseCompareIds('1,,2,')).toEqual([1, 2])
  })
})
