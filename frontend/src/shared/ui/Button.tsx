import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Spinner } from './Loading'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

/**
 * Visual button with four variants and a built-in loading state. The loading
 * state preserves width by rendering a Spinner in place of the leading icon
 * and disabling pointer events; consumers do not need to swap content.
 */
export function Button({
  variant = 'primary',
  isLoading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, className].filter(Boolean).join(' ')
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <Spinner aria-hidden="true" /> : leadingIcon}
      <span>{children}</span>
      {!isLoading && trailingIcon}
    </button>
  )
}
