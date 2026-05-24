import type { ReactNode } from 'react'

export interface TopAppBarProps {
  title: string
  leading?: ReactNode
  trailing?: ReactNode
}

// Page-level header: 36×36 leading slot, centered title, 36×36 trailing slot.
// Title sizing verbatim from spike 010 PracticeTopBar / PageTopBar
// (index.html L1020-1054): 17 px / weight 600 / tracking 0.01em / text token.
// Empty 36×36 placeholders maintain title centering when a slot is absent
// (mirrors spike's L1051 `<div style={{ width: 36, height: 36 }}></div>`).
export function TopAppBar({ title, leading, trailing }: TopAppBarProps) {
  return (
    <div className="flex w-full items-center justify-between px-5 pb-3 pt-[50px] sm:px-8">
      {leading ?? <div className="size-9" aria-hidden="true" />}
      <h1 className="text-[17px] font-semibold tracking-[0.01em] text-[var(--color-breathing-text)]">
        {title}
      </h1>
      {trailing ?? <div className="size-9" aria-hidden="true" />}
    </div>
  )
}
