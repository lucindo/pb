import type { UiStrings } from '../content/strings'

// D-03: NKSessionReadout is the compact strip below the NKShape, carrying
// phase (Front/Back), round (N / total), and phase target count.
// The shape itself holds the live OM count.

export interface NKSessionReadoutProps {
  phase: 'front' | 'back'
  round: number
  totalRounds: number
  target: number          // target OM count for the current phase
  strings: UiStrings['nkReadout']
}

export function NKSessionReadout({ phase, round, totalRounds, target, strings }: NKSessionReadoutProps) {
  return (
    // Byte-identical outer class to SessionReadout's <section> (D-03, UI-SPEC).
    // Explicit border satisfies the dark/dusk theme token-collapse constraint
    // (project memory: bg-soft === surface on dark/dusk; border makes it readable).
    <section
      aria-label={strings.readoutAriaLabel}
      aria-live="polite"
      className="mb-6 rounded-[1.75rem] border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-bg-soft)]/80 p-5 text-center shadow-inner shadow-teal-900/5"
    >
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

        {/* Cell 3: Count (target OM count for current phase) */}
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
            {strings.countLabel}
          </span>
          <span className="text-lg font-semibold leading-none">
            {String(target)}
          </span>
        </div>
      </div>
    </section>
  )
}
