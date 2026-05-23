import type { MouseEventHandler, Ref, ReactNode } from 'react'

export type IconButtonSize = 'sm' | 'md'

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: 'size-8',
  md: 'size-10',
}

export interface IconButtonProps {
  icon: ReactNode
  label: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  size?: IconButtonSize
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  buttonRef?: Ref<HTMLButtonElement>
}

/** Round white icon button. Used for top-bar slots (info / gear / back) and
 *  modal-close affordances. Size sm = 32px, md = 40px (default). The icon
 *  prop is any ReactNode — typically one of the icons exported from
 *  src/components/icons/. `buttonRef` lets a parent imperatively focus the
 *  underlying button (used by pages to focus the back chevron on mount). */
export function IconButton({
  icon,
  label,
  onClick,
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
  buttonRef,
}: IconButtonProps) {
  return (
    <button
      ref={buttonRef}
      type={type}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid ${SIZE_CLASS[size]} place-items-center rounded-full bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 ${className}`.trim()}
    >
      {icon}
    </button>
  )
}
