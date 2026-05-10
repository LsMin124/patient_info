import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { EmptyState } from '../EmptyState'
import { LoadingOverlay, Skeleton, Spinner } from '../Loading'

describe('Loading primitives', () => {
  it('Spinner has role="status" and accessible label', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading')
  })

  it('Skeleton renders aria-hidden block with given dimensions', () => {
    const { container } = render(<Skeleton width={120} height={16} />)
    const block = container.querySelector('.skeleton')!
    expect(block).toHaveAttribute('aria-hidden', 'true')
    expect((block as HTMLElement).style.width).toBe('120px')
    expect((block as HTMLElement).style.height).toBe('16px')
  })

  it('LoadingOverlay shows the configured message', () => {
    render(<LoadingOverlay message="로딩 중..." />)
    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })

  it('EmptyState renders title + description + action slot', () => {
    render(
      <EmptyState
        title="측정 기록이 없습니다"
        description="장비를 통해 측정을 시작해 보세요."
        action={<button type="button">확인</button>}
      />,
    )
    expect(screen.getByText('측정 기록이 없습니다')).toBeInTheDocument()
    expect(screen.getByText('장비를 통해 측정을 시작해 보세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
  })
})
