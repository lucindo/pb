// Persistent icon anchor for the Settings page, trailing slot of TopAppBar.
// D-03: disabled (not hidden) during lead-in and running — aria-disabled +
// no-op click handler.

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
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border bg-[var(--color-breathing-surface)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${
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
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  )
}
