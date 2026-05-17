import type { UiStrings } from '../content/strings'
import { StatusPanel } from './StatusPanel'

// D-03: NKSessionReadout is the compact strip below the NKShape, carrying
// phase (Front/Back), round (N / total), and the live OM count (N / target).
// Phase 31: the Count cell tracks the live count the same way the Round cell
// tracks the round — it counts up through the phase and resets to 0 on each
// phase transition (the shape mirrors the same count).

export interface NKSessionReadoutProps {
  phase: 'front' | 'back'
  round: number
  totalRounds: number
  count: number           // live OM count for the current phase (0 during lead-in)
  target: number          // target OM count for the current phase
  strings: UiStrings['nkReadout']
}

export function NKSessionReadout({ phase, round, totalRounds, count, target, strings }: NKSessionReadoutProps) {
  return (
    // Shares the StatusPanel wrapper with SessionReadout — one bordered box
    // with the "Status" legend, consistent across both practices.
    <StatusPanel legend={strings.statusLabel} ariaLabel={strings.readoutAriaLabel} ariaLive="polite">
      {/* Three-cell stretch row — byte-identical container to SessionReadout stretch row */}
      <div
        aria-live="off"
        className="mt-4 flex items-stretch rounded-[1.25rem] bg-[var(--color-breathing-surface)]/80 px-2 py-3 text-[var(--color-breathing-accent-strong)]"
      >
        {/* Cell 1: Phase (Front / Back) */}
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
            {strings.phaseLabel}
          </span>
          <span className="text-lg font-semibold leading-none">
            {phase === 'front' ? strings.front : strings.back}
          </span>
        </div>

        <span className="w-px self-stretch bg-[var(--color-breathing-muted)]/40" />

        {/* Cell 2: Round (N / total) */}
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
            {strings.roundLabel}
          </span>
          <span className="text-lg font-semibold leading-none">
            {strings.roundOf(round, totalRounds)}
          </span>
        </div>

        <span className="w-px self-stretch bg-[var(--color-breathing-muted)]/40" />

        {/* Cell 3: Count (live OM count / phase target) */}
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
            {strings.countLabel}
          </span>
          <span className="text-lg font-semibold leading-none">
            {strings.countOf(count, target)}
          </span>
        </div>
      </div>
    </StatusPanel>
  )
}
