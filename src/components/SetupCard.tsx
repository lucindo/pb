import type { ReactElement } from 'react'

// Grid SetupCard — locked layout. Pure presentation primitive: caller
// supplies pre-formatted items + onTap + ariaLabel. Data derivation (current
// settings → summary items) lives at the wiring site, not here.

export interface SetupCardItem {
  // Stable identifier used as the React key (independent of locale/label).
  id: string
  // Short uppercase label, e.g. "PACE". Caller passes already-localized strings.
  label: string
  // Pre-formatted value, e.g. "5.5 bpm" / "1 : 1" / "5 min".
  value: string
}

export interface SetupCardProps {
  items: readonly SetupCardItem[]
  onTap(this: void): void
  ariaLabel: string
  disabled?: boolean
}

export function SetupCard({
  items,
  onTap,
  ariaLabel,
  disabled = false,
}: SetupCardProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex w-full items-center justify-between gap-3 rounded-3xl text-left transition-colors disabled:opacity-50"
      style={{
        background: 'var(--color-breathing-surface)',
        border: '1px solid var(--color-border-soft)',
        padding: '14px 18px',
        color: 'var(--color-breathing-text)',
      }}
    >
      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '10px 18px',
        }}
      >
        {items.map((it) => (
          <SettingCell key={it.id} label={it.label} value={it.value} />
        ))}
      </div>
      <ChevronRight />
    </button>
  )
}

function SettingCell({ label, value }: Pick<SetupCardItem, 'label' | 'value'>): ReactElement {
  return (
    <div className="flex flex-col">
      <span
        className="uppercase"
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.16em',
          color: 'var(--color-breathing-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-breathing-text)',
          marginTop: 2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function ChevronRight(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'var(--color-breathing-text-soft)', flexShrink: 0 }}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  )
}
