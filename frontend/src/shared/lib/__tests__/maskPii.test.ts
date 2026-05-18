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

  it('strips zero-width characters so the visible first char is never invisible', () => {
    // U+200B (zero-width space) prefix must not be retained as the visible
    // first character. The real first letter is '홍'.
    expect(maskName('​홍길동')).toBe('홍··')
    // Zero-width joiner inside the name should be removed before counting.
    expect(maskName('홍‍길동')).toBe('홍··')
  })

  it('NFC-normalizes combining sequences before counting', () => {
    // NFD form of '홍' is composed of Jamo: ᄒ + ᅩ + ᆼ. After NFC it becomes
    // a single U+D64D ('홍'), so the masked output of the decomposed and
    // composed forms should match.
    const decomposed = '홍길동'.normalize('NFD')
    expect(maskName(decomposed)).toBe(maskName('홍길동'))
  })

  it('counts supplementary-plane characters as one grapheme', () => {
    // 4 visible chars (the emoji is a surrogate pair). Mixed name → falls
    // into the non-ASCII branch: first char kept + (length-1) dots = 3 dots.
    expect(maskName('🙂abc')).toBe('🙂···')
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
