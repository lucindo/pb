import type { ReactNode } from 'react'

export interface TopAppBarProps {
  title: string
  eyebrow?: string
  leading?: ReactNode
  trailing?: ReactNode
}

/** Page-level header bar: optional eyebrow above title, optional
 *  `leading` / `trailing` slots that position themselves with their own
 *  `absolute left-0 top-0` / `absolute right-0 top-0` classes.
 *
 *  CONTRACT: the outer container MUST stay `position: relative` (i.e. the
 *  `relative` Tailwind class on the root <div> below). Absolutely-positioned
 *  slot children (SettingsAnchor, LearnAnchor, page back-buttons) pin
 *  against this container — removing the `relative` class will cause them
 *  to escape to the nearest positioned ancestor, breaking the header
 *  layout silently. */
export function TopAppBar({ title, eyebrow, leading, trailing }: TopAppBarProps) {
  return (
    <div className="relative w-full">
      {eyebrow !== undefined && (
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[var(--color-breathing-accent)]">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)] sm:text-5xl">
        {title}
      </h1>
      {leading}
      {trailing}
    </div>
  )
}
