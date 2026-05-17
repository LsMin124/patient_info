import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { LocaleProvider } from '../../../shared/i18n/LocaleProvider'
import { SummaryStats } from '../SummaryStats'
import type { DataPoint } from '../schema'

function wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>
}

describe('SummaryStats', () => {
  it('renders all six metric labels', () => {
    render(<SummaryStats points={[]} />, { wrapper })
    expect(screen.getByText('피크')).toBeInTheDocument()
    expect(screen.getByText('평균')).toBeInTheDocument()
    expect(screen.getByText('피크 도달 시간')).toBeInTheDocument()
    expect(screen.getByText('RFD 0–100ms')).toBeInTheDocument()
    expect(screen.getByText('RFD 100–200ms')).toBeInTheDocument()
    expect(screen.getByText('면적 (Impulse)')).toBeInTheDocument()
  })

  it('renders "-" for every metric when the session is empty', () => {
    render(<SummaryStats points={[]} />, { wrapper })
    const values = screen.getAllByText('-')
    expect(values).toHaveLength(6)
  })

  it('renders peak in Newtons and time-to-peak in ms for a real curve', () => {
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 100, kgValue: 5 },
      { timeOffsetMs: 200, kgValue: 10 },
    ]
    render(<SummaryStats points={points} />, { wrapper })
    // peak = 10 kgf * 9.80665 = 98.07 N
    expect(screen.getByText('98.07 N')).toBeInTheDocument()
    expect(screen.getByText('200 ms')).toBeInTheDocument()
  })

  it('renders RFD with N/s unit and impulse with N·s unit', () => {
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 100, kgValue: 5 },
      { timeOffsetMs: 200, kgValue: 9 },
    ]
    render(<SummaryStats points={points} />, { wrapper })
    // rfd0_100 = 5*9.80665/0.1 = 490.3 N/s
    expect(screen.getByText('490.3 N/s')).toBeInTheDocument()
    // impulse present with N·s suffix
    expect(screen.getByText(/N·s$/)).toBeInTheDocument()
  })
})
