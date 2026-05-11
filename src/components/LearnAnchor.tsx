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
      className={`absolute right-0 top-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border bg-white/70 px-2.5 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm transition sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${
        disabled
          ? 'cursor-not-allowed border-slate-200 text-[var(--color-breathing-muted)]'
          : 'border-teal-200 text-teal-800 hover:bg-teal-50 active:bg-teal-100'
      }`}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sm:h-4 sm:w-4"
      >
        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H10v15H5.5A2.5 2.5 0 0 1 3 15.5V5.5Z" />
        <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H14v15h4.5A2.5 2.5 0 0 0 21 15.5V5.5Z" />
      </svg>
      <span className="hidden sm:inline">Learn</span>
    </button>
  )
}
