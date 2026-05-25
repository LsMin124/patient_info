import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { Input } from '../Input'

describe('Input', () => {
  it('connects label to input via htmlFor/id', () => {
    render(<Input label="Name" defaultValue="DemoSubject" />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveValue('DemoSubject')
  })

  it('renders hint and connects aria-describedby', () => {
    render(<Input label="Patient ID" hint="e.g. p001" />)
    const input = screen.getByLabelText('Patient ID')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(screen.getByText('e.g. p001').id).toBe(describedBy)
  })

  it('renders error with aria-invalid and role="alert"', () => {
    render(<Input label="Age" error="0–150 only" />)
    const input = screen.getByLabelText('Age')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('0–150 only')
  })
})
