import type { ReactNode } from 'react'

export interface IconAnchorProps {
  disabled: boolean
  onClick(this: void): void
  label: string
  disabledLabel: string
  children: ReactNode
}

// Shared chrome for the persistent TopAppBar icon anchors (LearnAnchor leading
// slot, SettingsAnchor trailing slot). Disabled (not hidden) during lead-in and
// running — aria-disabled + no-op click keep the element in tab order and
// announced, rather than vanishing mid-session.
export function IconAnchor({ disabled, onClick, label, disabledLabel, children }: IconAnchorProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      aria-label={disabled ? disabledLabel : label}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border bg-[var(--color-breathing-surface)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${
        disabled
          ? 'cursor-not-allowed border-[var(--color-breathing-muted)] text-[var(--color-breathing-muted)]'
          : 'border-[var(--color-border-soft)] text-[var(--color-breathing-text-soft)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
      }`}
    >
      {children}
    </button>
  )
}
