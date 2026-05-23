import type { ReactNode } from 'react'

export interface PageShellProps {
  children: ReactNode
  overlays?: ReactNode
}

/** Page-level wrapper: radial-gradient `<main>` with consistent padding,
 *  containing a centered `<section>` capped at max-w-3xl. Page-level
 *  overlays (install banners, dialogs) render as siblings of the section
 *  via the `overlays` slot — kept inside `<main>` to preserve page
 *  semantics. Visual values match the practice surface page shell from
 *  the previous inline AppScreen markup. */
export function PageShell({ children, overlays }: PageShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-breathing-bg-soft),_var(--color-breathing-bg)_48%,_var(--color-breathing-bg-edge))] px-4 py-6 text-[var(--color-breathing-accent-strong)] sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-start text-center sm:min-h-[calc(100vh-4rem)]">
        {children}
      </section>
      {overlays}
    </main>
  )
}
