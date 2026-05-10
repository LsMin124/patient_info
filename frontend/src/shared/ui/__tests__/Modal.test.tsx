import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { Modal } from '../Modal'

describe('Modal', () => {
  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="t">
        body
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders dialog with aria-modal and labelled by title', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="신규 환자 등록">
        <p>body</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('신규 환자 등록')).toBeInTheDocument()
  })

  it('closes on ESC', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="t">
        <input aria-label="any" />
      </Modal>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on backdrop click but not on dialog click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="t">
        <input aria-label="content" />
      </Modal>,
    )
    await user.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    await user.click(document.querySelector('.modal-backdrop')!)
    expect(onClose).toHaveBeenCalled()
  })
})
