// Phase 30 PRACTICE-01 + PRACTICE-03
// Presentational segmented-control practice switcher.
// PracticeId is a local alias; plan 30-04 reconciles imports to the canonical
// PracticeId from src/storage/practices.ts once it is available.

export type PracticeId = 'resonant' | 'naviKriya'

export interface PracticeToggleProps {
  active: PracticeId
  disabled: boolean
  onSwitch(this: void, id: PracticeId): void
  strings: {
    toggleLabel: string
    practiceNames: Record<PracticeId, string>
  }
}

const PRACTICE_IDS: PracticeId[] = ['resonant', 'naviKriya']

export function PracticeToggle({
  active,
  disabled,
  onSwitch,
  strings,
}: PracticeToggleProps) {
  const containerClass = [
    'flex rounded-full bg-[var(--color-breathing-bg-soft)] p-1',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div role="group" aria-label={strings.toggleLabel} className={containerClass}>
      {PRACTICE_IDS.map((id) => {
        const isActive = active === id
        const pillClass = [
          'flex-1 rounded-full min-h-[44px] px-4 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2',
          isActive
            ? 'bg-[var(--color-breathing-surface)] shadow font-semibold text-[var(--color-breathing-accent-strong)]'
            : 'font-normal text-[var(--color-breathing-muted)]',
        ].join(' ')

        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => { onSwitch(id) }}
            className={pillClass}
          >
            {strings.practiceNames[id]}
          </button>
        )
      })}
    </div>
  )
}
