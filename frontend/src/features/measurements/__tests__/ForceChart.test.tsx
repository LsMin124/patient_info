import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '../../../shared/i18n/LocaleProvider'
import type { DataPoint } from '../schema'

// react-chartjs-2 needs a real canvas. In jsdom we mock it and capture
// the props the component would render so we can assert the data shape
// and the options Newton/seconds conversions.
let capturedData: unknown = null
let capturedOptions: unknown = null

vi.mock('react-chartjs-2', () => ({
  Line: (props: { data: unknown; options: unknown }) => {
    capturedData = props.data
    capturedOptions = props.options
    return <div data-testid="mock-line-chart" />
  },
}))

// Mock chartSetup so chart.js' real registration does not run in tests.
vi.mock('../chartSetup', () => ({}))

// Import AFTER the mocks above so the component picks them up.
async function loadComponent() {
  return (await import('../ForceChart')).ForceChart
}

function wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>
}

describe('ForceChart', () => {
  beforeEach(() => {
    capturedData = null
    capturedOptions = null
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders inside a labelled figure region', async () => {
    const ForceChart = await loadComponent()
    render(<ForceChart points={[]} />, { wrapper })
    expect(screen.getByRole('figure')).toBeInTheDocument()
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument()
  })

  it('converts time to seconds and force to Newtons in the chart data', async () => {
    const ForceChart = await loadComponent()
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 500, kgValue: 10 }, // 10 kgf → 98.0665 N at 0.5s
    ]
    render(<ForceChart points={points} />, { wrapper })
    const dataset = (capturedData as { datasets: Array<{ data: Array<{ x: number; y: number }> }> })
      .datasets[0]!
    expect(dataset.data[0]).toEqual({ x: 0, y: 0 })
    expect(dataset.data[1]!.x).toBeCloseTo(0.5, 5)
    expect(dataset.data[1]!.y).toBeCloseTo(10 * 9.80665, 4)
  })

  it('hard-caps the X-axis at 5 seconds regardless of session duration', async () => {
    // Clinical protocol fixes the comparison window to 0–5s so successive
    // measurements (and the figure-mode overlay) line up visually. Data
    // past 5s stays in the dataset but renders outside the viewport.
    const ForceChart = await loadComponent()
    const points: DataPoint[] = [
      { timeOffsetMs: 0, kgValue: 0 },
      { timeOffsetMs: 8000, kgValue: 1 },
    ]
    render(<ForceChart points={points} />, { wrapper })
    const max = (capturedOptions as { scales: { x: { max: number } } }).scales.x.max
    expect(max).toBe(5)
  })

  it('disables animation when prefers-reduced-motion is set', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((q: string) => ({
        matches: q.includes('reduce'),
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn(),
      })),
    )
    const ForceChart = await loadComponent()
    render(<ForceChart points={[{ timeOffsetMs: 0, kgValue: 0 }]} />, { wrapper })
    const animation = (capturedOptions as { animation: false | { duration: number } }).animation
    expect(animation).toBe(false)
    vi.unstubAllGlobals()
  })

  it('downsamples sessions beyond 10k points to ~1.5k', async () => {
    const ForceChart = await loadComponent()
    const big: DataPoint[] = Array.from({ length: 10_500 }, (_, i) => ({
      timeOffsetMs: i,
      kgValue: i % 50,
    }))
    render(<ForceChart points={big} />, { wrapper })
    const dataset = (capturedData as { datasets: Array<{ data: unknown[] }> }).datasets[0]!
    expect(dataset.data.length).toBe(1_500)
  })
})
