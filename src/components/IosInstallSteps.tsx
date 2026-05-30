// One source of truth for the iOS Share → Add to Home Screen step list used by
// both the banner and the Settings install row. The `id` prop is required so
// each consumer can set a unique DOM id — no hardcoded id literal here.

import type { UiStrings } from '../content/strings'

export interface IosInstallStepsProps {
  /** Unique DOM id for the steps container — set by each consumer (no hardcoded literal here). */
  id: string
  strings: UiStrings['install']
}

export function IosInstallSteps({ id, strings }: IosInstallStepsProps) {
  return (
    <div id={id} aria-live="polite" className="pt-4 text-sm leading-6">
      {/* Ordered list conveys the sequential step relationship both visually
          (numbering) and to assistive tech. */}
      {/* All three steps carry explicit theme-aware breathing color tokens:
          step 1 = accent-strong (first-step highlight);
          steps 2 & 3 = muted (clears WCAG AA 4.5 on all themes). */}
      <ol className="list-decimal pl-5">
        <li className="text-[var(--color-breathing-accent-strong)]">
          {strings.iosStep1}
          {' '}
          <IOsShareIcon />
        </li>
        <li className="text-[var(--color-breathing-muted)]">{strings.iosStep2}</li>
        <li className="text-[var(--color-breathing-muted)]">{strings.iosStep3}</li>
      </ol>
    </div>
  )
}

// iOS Share glyph — inline SVG per project convention (MuteToggle.tsx, LearnAnchor.tsx)
// Paths from 28-RESEARCH.md Code Examples
function IOsShareIcon() {
  return (
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
      className="inline align-middle"
    >
      {/* Upward arrow */}
      <line x1="12" y1="17" x2="12" y2="3" />
      <polyline points="6 9 12 3 18 9" />
      {/* Box / share container */}
      <path d="M9 17H5a2 2 0 0 0-2 2v2h18v-2a2 2 0 0 0-2-2h-4" />
    </svg>
  )
}
