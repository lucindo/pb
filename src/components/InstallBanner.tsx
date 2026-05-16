// Phase 28 Plan 03: Slim install banner UI component.
// Desktop exclusion is handled upstream by the App.tsx phone gate
// (isPhone check in showBanner), not by this component.
// This is a pure presentational component — the only local state is
// `iosExpanded` for the inline iOS step-expand toggle.

import { useState } from 'react'
import type { UiStrings } from '../content/strings'

export interface InstallBannerProps {
  isIOS: boolean
  onInstall(this: void): Promise<void>
  onDismiss(this: void): void
  strings: UiStrings['install']
}

export function InstallBanner({ isIOS, onInstall, onDismiss, strings }: InstallBannerProps) {
  const [iosExpanded, setIosExpanded] = useState<boolean>(false)

  return (
    <div
      role="region"
      aria-label={strings.regionLabel}
      className="mt-6 border-t border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] px-4 py-2"
    >
      {/* Banner row: icon + text + action + dismiss — D-03 */}
      <div className="flex items-center gap-2">
        <img
          src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
          alt="HRV app icon"
          className="size-8 rounded-lg"
          // WR-02: if the icon asset is missing/mis-pathed/blocked, hide the
          // element rather than render the browser's broken-image glyph in a
          // polished banner. bannerText already conveys the meaning.
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        {/* WR-05: allow the install message to wrap rather than truncate —
            clipping the banner's single most important sentence (especially the
            longer PT-BR copy) defeats its purpose. The banner grows vertically. */}
        <span className="flex-1 break-words text-sm text-[var(--color-breathing-muted)]">
          {strings.bannerText}
        </span>
        {isIOS ? (
          <button
            type="button"
            // WR-03: disclosure pattern — expose open/closed state and point at
            // the steps container so assistive tech announces it as a toggle.
            aria-expanded={iosExpanded}
            aria-controls="install-ios-steps"
            onClick={() => { setIosExpanded(prev => !prev) }}
            className="min-h-[44px] text-sm font-semibold text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {strings.iosStepsButton}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { void onInstall() }}
            className="min-h-[44px] text-sm font-semibold text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {strings.installButton}
          </button>
        )}
        {/* Dismiss control D-04 — rightmost, 44×44 hit area */}
        <button
          type="button"
          aria-label={strings.dismiss}
          onClick={onDismiss}
          className="min-h-[44px] min-w-[44px] text-[var(--color-breathing-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        >
          <DismissIcon />
        </button>
      </div>
      {/* iOS expanded steps D-05/D-06 — shown inline below the banner row */}
      {isIOS && iosExpanded && (
        <div id="install-ios-steps" aria-live="polite" className="pt-4 text-sm leading-6">
          {/* WR-04: ordered list conveys the sequential step relationship both
              visually (numbering) and to assistive tech. */}
          <ol className="list-decimal pl-5">
            <li className="text-[var(--color-breathing-accent-strong)]">
              {strings.iosStep1}
              {' '}
              <IOsShareIcon />
            </li>
            <li>{strings.iosStep2}</li>
            <li>{strings.iosStep3}</li>
          </ol>
        </div>
      )}
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
      style={{ display: 'inline', verticalAlign: 'middle' }}
    >
      {/* Upward arrow */}
      <line x1="12" y1="17" x2="12" y2="3" />
      <polyline points="6 9 12 3 18 9" />
      {/* Box / share container */}
      <path d="M9 17H5a2 2 0 0 0-2 2v2h18v-2a2 2 0 0 0-2-2h-4" />
    </svg>
  )
}

// Dismiss × glyph — two crossing lines, 16×16, strokeWidth 2.5
function DismissIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
