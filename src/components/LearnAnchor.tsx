// CONTEXT.md D-01: persistent page-level anchor labeled `Learn`, always visible
// across idle, lead-in, and running session states (never unmounted).
// D-03: disabled (not hidden) during lead-in and running — aria-disabled="true",
// no-op click handler at the JSX layer (defense in depth alongside App's onLearnClick
// early-return).
// D-04: 44×44 hit-area floor via padding, NOT by enlarging text (same technique as
// StatsFooter.tsx Reset button). Visible text stays text-sm.
// D-21 carry-forward: focus-visible ring chain on every interactive element.
// UI-SPEC §Layout Contract: safe-area-inset positioning for iOS notch/dynamic island.

export interface LearnAnchorProps {
  disabled: boolean
  onClick(): void
}

export function LearnAnchor({ disabled, onClick }: LearnAnchorProps) {
  return (
    <button
      type="button"
      // D-03: aria-disabled (NOT the `disabled` HTML attribute) keeps the button
      // focusable for screen-reader discovery while removing its click semantics.
      // Render the attribute only when disabled is true (clean DOM in enabled state).
      aria-disabled={disabled || undefined}
      // UI-SPEC §Copywriting Contract: distinct aria-labels for enabled vs disabled state.
      aria-label={disabled ? 'Learn (unavailable during session)' : 'Learn'}
      // JSX-layer gate: strip the handler when disabled so the DOM event never fires.
      // App's onLearnClick early-return provides the second layer (T-06-11 defense in depth).
      onClick={disabled ? undefined : onClick}
      className={`fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 ${
        disabled
          ? 'cursor-not-allowed text-[var(--color-breathing-muted)]'
          : 'text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)]'
      }`}
    >Learn</button>
  )
}
