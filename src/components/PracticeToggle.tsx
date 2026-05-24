// Phase 30 PRACTICE-01 + PRACTICE-03
// Presentational segmented-control practice switcher.
// Extended to 3 pills (resonant, stretch, naviKriya). The app view model owns
// feature-flag lookup and passes showIcons as a plain presentation prop.

import type { ReactElement } from 'react'

import type { PracticeId } from '../storage'

export interface PracticeToggleProps {
  active: PracticeId
  disabled: boolean
  showIcons: boolean
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
export function PracticeGlyph({ id }: { id: PracticeId }): ReactElement {
  if (id === 'resonant') {
    // Orb = circle (breathing)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (id === 'stretch') {
    // S-curve ramp matching the spike 007 harness (M2 13 Q5.5 2 9 9 T16 5.5 on 18×18)
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M2 13 Q5.5 2 9 9 T16 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  showIcons,
  onSwitch,
  strings,
}: PracticeToggleProps): ReactElement {
  // The border-soft bound is what distinguishes the switcher container from
  // bg-soft on the dark theme (where bg-soft === surface — see
  // [[dark-theme-token-collapse]]).
  const containerClass = [
    'flex rounded-full border border-[var(--color-border-soft)] bg-[var(--color-breathing-bg-soft)] p-1',
    disabled ? 'opacity-[0.55] cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div role="group" aria-label={strings.toggleLabel} className={containerClass}>
      {PRACTICE_IDS.map((id) => {
        const isActive = active === id
        // Active pill = accent fill + on-accent text (spike 010 verbatim,
        // index.html L544-552: bg accent, color onAccent, weight 600/500, 14px,
        // px-3 py-2, no pill border, no shadow). flex + items-center +
        // justify-center + gap-1 keep the optional glyph + label inline.
        const pillClass = [
          'flex-1 flex items-center justify-center gap-1 rounded-full px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2',
          isActive
            ? 'bg-[var(--color-breathing-accent)] font-semibold text-[var(--color-breathing-on-accent)]'
            : 'font-medium text-[var(--color-breathing-text-soft)]',
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
            {showIcons && <PracticeGlyph id={id} />}
            {/* Label wrapped in <span> so it is a single flex child alongside the glyph */}
            <span>{strings.practiceNames[id]}</span>
          </button>
        )
      })}
    </div>
  )
}
