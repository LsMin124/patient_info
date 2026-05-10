import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { Input } from '../Input'

describe('Input', () => {
  it('connects label to input via htmlFor/id', () => {
    render(<Input label="이름" defaultValue="테스트환자A" />)
    const input = screen.getByLabelText('이름')
    expect(input).toHaveValue('테스트환자A')
  })

  it('renders hint and connects aria-describedby', () => {
    render(<Input label="환자 ID" hint="예: p001" />)
    const input = screen.getByLabelText('환자 ID')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(screen.getByText('예: p001').id).toBe(describedBy)
  })

  it('renders error with aria-invalid and role="alert"', () => {
    render(<Input label="나이" error="0–150 사이" />)
    const input = screen.getByLabelText('나이')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('0–150 사이')
  })
})
