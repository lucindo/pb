// Persistent gear-icon anchor for the Settings page, always visible across idle,
// lead-in, and running session states (never unmounted). Disabled in place during
// session (aria-disabled="true", no-op click handler). Mirrors LearnAnchor in
// structure with two differences: position class `left-0` (gear sits top-left of
// the breathing column, LearnAnchor at top-right) and a hand-coded inline gear
// SVG (circle + outer path) instead of the book SVG paths.
// Parent MUST provide `position: relative` (TopAppBar does).

import type { UiStrings } from '../content/strings'

export interface SettingsAnchorProps {
  disabled: boolean
  onClick(this: void): void
  strings: UiStrings['practice']['topBar']
}

export function SettingsAnchor({ disabled, onClick, strings }: SettingsAnchorProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      aria-label={disabled ? strings.settingsDisabled : strings.settings}
      onClick={disabled ? undefined : onClick}
      className={`absolute left-0 top-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border bg-[var(--color-breathing-surface)]/70 px-2.5 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm transition sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${
        disabled
          ? 'cursor-not-allowed border-[var(--color-breathing-muted)] text-[var(--color-breathing-muted)]'
          : 'border-[var(--color-breathing-accent)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
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
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
      <span className="hidden sm:inline">{strings.settings}</span>
    </button>
  )
}
