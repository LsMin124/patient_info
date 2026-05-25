import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders AppShell with Dashboard heading on default route', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard')
  })

  it('renders the skip-link as the first focusable element', () => {
    render(<App />)
    expect(screen.getByText('Skip to content')).toBeInTheDocument()
  })

  it('renders nav links for primary sections', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Patients' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  })
})
