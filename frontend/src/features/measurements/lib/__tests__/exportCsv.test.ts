import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { KGF_TO_N } from '../../../../shared/lib/units'
import type { DataPoint } from '../../schema'
import { buildCsv, csvFilename, downloadSessionCsv } from '../exportCsv'

const points: DataPoint[] = [
  { timeOffsetMs: 0, kgValue: 0 },
  { timeOffsetMs: 50, kgValue: 1.5 },
  { timeOffsetMs: 100, kgValue: -0.2 },
]

describe('buildCsv', () => {
  it('starts with a UTF-8 BOM', () => {
    expect(buildCsv(points).startsWith('﻿')).toBe(true)
  })

  it('has the frozen header row', () => {
    const lines = buildCsv(points).slice(1).split('\r\n')
    expect(lines[0]).toBe('time_offset_ms,force_n,kg_value')
  })

  it('emits one row per data point with force_n derived via kgfToN', () => {
    const lines = buildCsv(points).slice(1).split('\r\n').filter(Boolean)
    expect(lines).toHaveLength(4) // header + 3 rows
    expect(lines[1]).toBe(`0,0,0`)
    expect(lines[2]).toBe(`50,${1.5 * KGF_TO_N},1.5`)
    // negative kg (sensor noise) preserved, not clamped
    expect(lines[3]).toBe(`100,${-0.2 * KGF_TO_N},-0.2`)
  })

  it('uses CRLF line endings and a trailing newline', () => {
    const csv = buildCsv(points)
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(csv.split('\r\n').length).toBeGreaterThan(3)
  })

  it('handles an empty session (header only)', () => {
    const csv = buildCsv([])
    expect(csv).toBe('﻿time_offset_ms,force_n,kg_value\r\n')
  })
})

describe('csvFilename', () => {
  it('builds a filesystem-safe name from id + ISO start time', () => {
    expect(csvFilename(101, '2026-05-01T10:30:00')).toBe('session-101-2026-05-01T10-30-00.csv')
  })

  it('strips fractional-second dots too', () => {
    expect(csvFilename(7, '2026-05-01T10:30:00.123')).toBe('session-7-2026-05-01T10-30-00-123.csv')
  })
})

describe('downloadSessionCsv', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock')
    revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    clickSpy = vi.fn()
    // jsdom anchors have no real click navigation; spy on the prototype.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates a blob URL, clicks a download anchor, and revokes the URL', () => {
    downloadSessionCsv(101, '2026-05-01T10:30:00', points)
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('removes the temporary anchor from the DOM after the click', () => {
    downloadSessionCsv(101, '2026-05-01T10:30:00', points)
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
