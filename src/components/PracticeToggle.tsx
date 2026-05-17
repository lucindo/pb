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
  // The muted border bounds the control on every theme — on dark/dusk the
  // bg-soft container fill is identical to surface, so without a border the
  // switcher dissolves into the card (matches the SESSION MODE fieldset).
  const containerClass = [
    'flex rounded-full border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-bg-soft)] p-1',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div role="group" aria-label={strings.toggleLabel} className={containerClass}>
      {PRACTICE_IDS.map((id) => {
        const isActive = active === id
        // The active pill carries an accent border (the codebase's raised-
        // interactive convention — stepper buttons, the mode-toggle track);
        // inactive pills keep a transparent border so there is no layout
        // shift between states. On dark/dusk this accent outline is what
        // distinguishes the selected pill, since its surface fill matches
        // the bg-soft container.
        const pillClass = [
          'flex-1 rounded-full min-h-[44px] border px-4 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2',
          isActive
            ? 'border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] shadow font-semibold text-[var(--color-breathing-accent-strong)]'
            : 'border-transparent font-normal text-[var(--color-breathing-muted)]',
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
