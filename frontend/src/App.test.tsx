import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders AppShell with Dashboard heading on default route', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('대시보드')
  })

  it('renders the skip-link as the first focusable element', () => {
    render(<App />)
    expect(screen.getByText('본문으로 건너뛰기')).toBeInTheDocument()
  })

  it('renders nav links for primary sections', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '환자' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '설정' })).toBeInTheDocument()
  })
})
