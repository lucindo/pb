import type { ReactElement, ReactNode } from 'react'

export interface TopAppBarProps {
  title: string
  leading?: ReactNode
  trailing?: ReactNode
}

// Page-level header: 36×36 leading slot, centered title, 36×36 trailing slot.
// Locked title sizing: 17 px / weight 600 / tracking 0.01em / text token.
// Empty 36×36 placeholders maintain title centering when a slot is absent.
// Top padding: 16 px base + safe-area inset (handles iOS PWA notch in standalone
// mode without burning dead vertical space on desktop).
export function TopAppBar({ title, leading, trailing }: TopAppBarProps): ReactElement {
  return (
    <div
      className="flex w-full items-center justify-between px-5 pb-3 sm:px-8"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
    >
      {leading ?? <div className="size-9" aria-hidden="true" />}
      <h1 className="text-[17px] font-semibold tracking-[0.01em] text-[var(--color-breathing-text)]">
        {title}
      </h1>
      {trailing ?? <div className="size-9" aria-hidden="true" />}
    </div>
  )
}
