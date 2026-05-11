// CONTEXT.md D-01: persistent anchor labeled `Learn`, always visible across idle,
// lead-in, and running session states (never unmounted). Positioning was moved from
// page-level fixed to in-column absolute on 2026-05-10 (user-approved layout change):
// the anchor now sits at the top-right of the centered breathing column instead of
// the viewport edge. Parent MUST provide `position: relative`.
// D-03: disabled (not hidden) during lead-in and running — aria-disabled="true",
// no-op click handler at the JSX layer (defense in depth alongside App's onLearnClick
// early-return).
// D-04: 44×44 hit-area floor via padding, NOT by enlarging text. Visible text stays text-sm.
// D-21 carry-forward: focus-visible ring chain on every interactive element.

export interface LearnAnchorProps {
  disabled: boolean
  onClick(): void
}

export function LearnAnchor({ disabled, onClick }: LearnAnchorProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      aria-label={disabled ? 'Learn (unavailable during session)' : 'Learn'}
      onClick={disabled ? undefined : onClick}
      className={`absolute right-0 top-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 ${
        disabled
          ? 'cursor-not-allowed text-[var(--color-breathing-muted)]'
          : 'text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)]'
      }`}
    >Learn</button>
  )
}
