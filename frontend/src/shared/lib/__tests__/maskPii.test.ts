import { describe, expect, it } from 'vitest'

import { maskName, maskPatientId } from '../maskPii'

describe('maskName', () => {
  it('keeps a single character', () => {
    expect(maskName('홍')).toBe('홍')
  })
  it('masks Korean names: first char visible', () => {
    expect(maskName('홍길동')).toBe('홍··')
    // 6 input chars → 1 visible + 5 dots (length-1)
    expect(maskName('테스트환자A')).toBe('테·····')
  })
  it('masks ASCII names: first and last visible', () => {
    expect(maskName('John Doe')).toBe('J······e')
  })
  it('handles 2-char ASCII names', () => {
    expect(maskName('Jo')).toBe('J·')
  })
  it('trims whitespace before masking', () => {
    expect(maskName('  Bob  ')).toBe('B·b')
  })
})

describe('maskPatientId', () => {
  it('keeps a single character', () => {
    expect(maskPatientId('p')).toBe('p')
  })
  it('masks the rest with dashes', () => {
    expect(maskPatientId('p001')).toBe('p---')
    expect(maskPatientId('PATIENT-123')).toBe('P----------')
  })
})
