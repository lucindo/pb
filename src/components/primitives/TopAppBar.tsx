import type { ReactNode } from 'react'

export interface TopAppBarProps {
  title: string
  eyebrow?: string
  leading?: ReactNode
  trailing?: ReactNode
}

/** Page-level header bar: optional eyebrow above title, optional
 *  `leading` / `trailing` slots that position themselves with their own
 *  `absolute left-0 top-0` / `absolute right-0 top-0` classes. The bar
 *  itself is `position: relative` so absolutely-positioned slot children
 *  resolve correctly. Visual values match the previous inline AppHeader
 *  in AppScreen.tsx — eyebrow uses page-header scale (text-sm,
 *  tracking-[0.35em], accent color), distinct from the small section
 *  Eyebrow primitive which targets card-group dividers. */
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
