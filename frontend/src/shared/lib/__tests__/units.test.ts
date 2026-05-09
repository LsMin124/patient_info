import { describe, it, expect } from 'vitest'

import { KGF_TO_N, kgfToN, formatN, formatKgfAsN } from '../units'

describe('KGF_TO_N constant', () => {
  it('matches the standard gravity value (9.80665 m/s^2)', () => {
    expect(KGF_TO_N).toBe(9.80665)
  })
})

describe('kgfToN', () => {
  it('returns 0 for 0', () => {
    expect(kgfToN(0)).toBe(0)
  })

  it('multiplies by KGF_TO_N for positive values', () => {
    expect(kgfToN(1)).toBeCloseTo(9.80665, 5)
    expect(kgfToN(10)).toBeCloseTo(98.0665, 4)
  })

  it('preserves sign for negative readings (sensor noise)', () => {
    expect(kgfToN(-1)).toBeCloseTo(-9.80665, 5)
  })

  it('returns NaN for NaN input (NaN propagates)', () => {
    expect(kgfToN(NaN)).toBeNaN()
  })

  it('returns Infinity for Infinity input', () => {
    expect(kgfToN(Infinity)).toBe(Infinity)
  })
})

describe('formatN', () => {
  it('formats with default 2 decimals and unit suffix', () => {
    expect(formatN(12.3456)).toBe('12.35 N')
  })

  it('honors a custom digits argument', () => {
    expect(formatN(12.3456, 0)).toBe('12 N')
    expect(formatN(12.3456, 4)).toBe('12.3456 N')
  })

  it('clamps digits to [0, 6]', () => {
    expect(formatN(1.123456789, 10)).toBe('1.123457 N')
    expect(formatN(1.5, -3)).toBe('2 N')
  })

  it('truncates non-integer digit arguments', () => {
    expect(formatN(1.236, 2.9)).toBe('1.24 N')
  })

  it('returns "-" for NaN', () => {
    expect(formatN(NaN)).toBe('-')
  })

  it('returns "-" for Infinity / -Infinity', () => {
    expect(formatN(Infinity)).toBe('-')
    expect(formatN(-Infinity)).toBe('-')
  })

  it('formats negative numbers with sign preserved', () => {
    expect(formatN(-3.5)).toBe('-3.50 N')
  })

  it('formats zero correctly', () => {
    expect(formatN(0)).toBe('0.00 N')
  })
})

describe('formatKgfAsN', () => {
  it('chains kgfToN and formatN', () => {
    expect(formatKgfAsN(1)).toBe('9.81 N')
    expect(formatKgfAsN(10, 1)).toBe('98.1 N')
  })

  it('returns "-" when input is NaN', () => {
    expect(formatKgfAsN(NaN)).toBe('-')
  })
})
