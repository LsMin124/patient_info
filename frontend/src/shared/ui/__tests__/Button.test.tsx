import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { Button } from '../Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>등록</Button>)
    expect(screen.getByRole('button', { name: '등록' })).toBeInTheDocument()
  })

  it('applies variant class', () => {
    render(<Button variant="danger">삭제</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn--danger')
  })

  it('disables when isLoading and announces aria-busy', () => {
    render(<Button isLoading>등록</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('does not invoke onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        등록
      </Button>,
    )
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to type="button" so it never submits parent forms accidentally', () => {
    render(<Button>x</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
