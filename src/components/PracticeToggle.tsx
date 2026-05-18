// Phase 30 PRACTICE-01 + PRACTICE-03
// Presentational segmented-control practice switcher.
// Phase 34 34-03: Extended to 3 pills (resonant, stretch, naviKriya) with
// A/B treatment branch driven by build-time __SWITCHER_TREATMENT__ (D-06/D-07/D-11).

import type { PracticeId } from '../storage/practices'

// D-06: build-time only — compile-time constant injected by vite.config.ts `define`
// D-07: invalid or missing value falls back to 'A' (smallest-surprise default)
declare const __SWITCHER_TREATMENT__: string
const TREATMENT: 'A' | 'B' = __SWITCHER_TREATMENT__ === 'B' ? 'B' : 'A'

export interface PracticeToggleProps {
  active: PracticeId
  disabled: boolean
  onSwitch(this: void, id: PracticeId): void
  strings: {
    toggleLabel: string
    practiceNames: Record<PracticeId, string>
  }
}

// D-11: switcher order HRV · Stretch · Navi
const PRACTICE_IDS: PracticeId[] = ['resonant', 'stretch', 'naviKriya']

// D-08: inline SVGs styled with theme tokens; currentColor follows theme tokens.
// Exported for direct unit testing (treatment B glyph coverage without requiring
// a separate build — see PracticeToggle.test.tsx PracticeGlyph describe block).
export function PracticeGlyph({ id }: { id: PracticeId }) {
  if (id === 'resonant') {
    // Orb = circle (breathing)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (id === 'stretch') {
    // Ramp = descending diagonal line (BPM walk-down)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <polyline points="2,4 14,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  // naviKriya: counting dots (OM counting)
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="4" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
    </svg>
  )
}

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
            {TREATMENT === 'B' && <PracticeGlyph id={id} />}
            {strings.practiceNames[id]}
          </button>
        )
      })}
    </div>
  )
}
