import { describe, expect, it } from 'vitest'

import { countValidIdSegments, MAX_COMPARE_IDS, parseCompareIds } from '../compareIds'

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

describe('countValidIdSegments', () => {
  it('returns 0 for null/empty', () => {
    expect(countValidIdSegments(null)).toBe(0)
    expect(countValidIdSegments('')).toBe(0)
  })

  it('counts only well-formed segments', () => {
    expect(countValidIdSegments('1,2,3')).toBe(3)
    expect(countValidIdSegments('1,abc,3')).toBe(2)
    expect(countValidIdSegments('1,0,-3,2.5,4')).toBe(2)
  })

  it('lets SessionCompare distinguish "too many" from "mostly garbage"', () => {
    // Was the bug: raw.split(',').length over-counted invalid segments and
    // triggered tooMany on a mostly-garbage URL where the user wanted tooFew.
    expect(countValidIdSegments('1,abc,xyz,foo,bar')).toBe(1)
  })

  it('returns the count of valid segments even past the cap', () => {
    expect(countValidIdSegments('1,2,3,4,5')).toBe(5)
  })
})
