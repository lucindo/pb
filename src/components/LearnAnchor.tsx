// Persistent icon anchor labeled `Learn`, top-left of the breathing column.
// D-03: disabled (not hidden) during lead-in and running — aria-disabled +
// no-op click handler. Parent MUST provide `position: relative` (TopAppBar).

import type { UiStrings } from '../content/strings'

export interface LearnAnchorProps {
  disabled: boolean
  onClick(this: void): void
  strings: UiStrings['practice']['topBar']
}

export function LearnAnchor({ disabled, onClick, strings }: LearnAnchorProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      aria-label={disabled ? strings.learnDisabled : strings.learn}
      onClick={disabled ? undefined : onClick}
      className={`absolute left-0 top-0 inline-flex size-9 items-center justify-center rounded-full border bg-[var(--color-breathing-surface)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${
        disabled
          ? 'cursor-not-allowed border-[var(--color-breathing-muted)] text-[var(--color-breathing-muted)]'
          : 'border-[var(--color-border-soft)] text-[var(--color-breathing-text-soft)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
      }`}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </button>
  )
}
