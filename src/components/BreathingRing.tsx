import type { ReactElement } from 'react'
import type { SessionFrame } from '../domain'
import type { UiStrings } from '../content/strings'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export interface BreathingRingProps {
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
  strings: UiStrings['practice']['breathing']
  // Completion state — static ring with a checkmark glyph centred inside.
  // Takes priority over the frame === null idle path.
  showCompletion?: boolean
}

const RING_OPACITY = 0.5

// In/Out label + checkmark read as primary ink; the lead-in digit is a quieter
// pre-state in the mid-slate accent (same hue as the ring).
const LABEL_COLOR = 'var(--color-breathing-accent-strong)'
const DIGIT_COLOR = 'var(--color-breathing-accent)'

// BreathingRing is the sole shape — a fixed-size ring (the progress arc overlays it
// while running). It owns the idle null-frame guard.
export function BreathingRing({
  frame,
  leadInDigit,
  strings,
  showCompletion = false,
}: BreathingRingProps): ReactElement {
  if (leadInDigit != null) {
    return <RingLeadIn digit={leadInDigit} strings={strings} />
  }
  if (showCompletion) {
    return (
      <RingContainer>
        <CheckmarkGlyph />
      </RingContainer>
    )
  }
  if (frame === null) {
    return <RingContainer />
  }
  return <RingBody frame={frame} strings={strings} />
}

// 32x32 check, 24 viewBox, 2.4-stroke polyline, centred in the ring.
function CheckmarkGlyph() {
  return (
    <span aria-hidden="true" className="relative z-10" style={{ color: LABEL_COLOR }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="5 13 10 18 19 7" />
      </svg>
    </span>
  )
}

interface RingBodyProps {
  frame: SessionFrame
  strings: UiStrings['practice']['breathing']
}

function phaseLabelFor(phase: SessionFrame['phase'], strings: UiStrings['practice']['breathing']): string {
  if (phase === 'inhale') return strings.inhale
  if (phase === 'exhale') return strings.exhale
  return strings.hold // both holds share the single Hold label
}

function RingBody({ frame, strings }: RingBodyProps) {
  const reducedMotion = usePrefersReducedMotion()
  const progress = Math.min(1, Math.max(0, frame.phaseProgress))
  const phaseLabel = phaseLabelFor(frame.phase, strings)

  return (
    <RingContainer
      role="img"
      ariaLabel={`${strings.breathingShapeAriaLabel}: ${phaseLabel}`}
      arc={
        <ProgressArcLayer
          phase={frame.phase}
          progress={progress}
          reducedMotion={reducedMotion}
        />
      }
    >
      <span
        className="relative z-10 text-5xl font-semibold tracking-tight sm:text-6xl"
        style={{ color: LABEL_COLOR }}
      >
        {phaseLabel}
      </span>
    </RingContainer>
  )
}

// Lead-in: neutral pre-state — the digit centred in the ring, no progress arc.
function RingLeadIn({
  digit,
  strings,
}: {
  digit: 1 | 2 | 3
  strings: UiStrings['practice']['breathing']
}) {
  return (
    <RingContainer ariaLabel={strings.leadInAriaLabel(digit)} role="img">
      <span
        className="relative z-10 text-7xl font-semibold tracking-tight sm:text-8xl"
        style={{ color: DIGIT_COLOR }}
      >
        {digit}
      </span>
    </RingContainer>
  )
}

// Fixed-size outer ring at --ring-size. The progress arc (when supplied) overlays
// it; centred children render above both. No scale transform — the ring never
// grows or shrinks.
interface RingContainerProps {
  role?: 'img' | undefined
  ariaLabel?: string | undefined
  arc?: React.ReactNode
  children?: React.ReactNode
}

function RingContainer({ role, ariaLabel, arc, children }: RingContainerProps) {
  const rootProps = {
    ...(role != null ? { role } : {}),
    ...(ariaLabel != null ? { 'aria-label': ariaLabel } : {}),
  }

  return (
    <div
      {...rootProps}
      className="relative mx-auto my-12 grid place-items-center"
      style={{ width: 'var(--ring-size)', height: 'var(--ring-size)' }}
    >
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          inset: 0,
          border: '1.5px solid var(--color-breathing-accent)',
          borderRadius: '50%',
          opacity: RING_OPACITY,
        }}
      />
      {arc}
      {children}
    </div>
  )
}

// Bidirectional progress arc. Locked geometry values: viewBox="0 0 100 100",
// r = 49.7, sweep-flag 0 on the right path / 1 on the left, arc paths via
// .toFixed(4), no stroke-dasharray + no pathLength (Chrome renders those as
// broken segments). Stroke width 2.5 is the locked product value.
// Outer track is NOT duplicated here — RingContainer renders the faint ring.
function ProgressArcLayer({
  phase,
  progress,
  reducedMotion,
}: {
  phase: SessionFrame['phase']
  progress: number
  reducedMotion: boolean
}) {
  const r = 49.7
  const south = 50 + r
  const north = 50 - r
  // The arc tracks inhale (fills) and exhale (empties). Holds show the label only —
  // their progress bar is a separate (deferred) treatment.
  if (phase !== 'inhale' && phase !== 'exhale') return null
  const t = phase === 'inhale' ? progress : 1 - progress
  const showArc = !reducedMotion && t > 0

  if (!showArc) return null

  let rightD: string
  let leftD: string
  if (t >= 1) {
    rightD = `M 50 ${String(south)} A ${String(r)} ${String(r)} 0 0 0 50 ${String(north)}`
    leftD = `M 50 ${String(south)} A ${String(r)} ${String(r)} 0 0 1 50 ${String(north)}`
  } else {
    const angleR = Math.PI / 2 - t * Math.PI
    const angleL = Math.PI / 2 + t * Math.PI
    const endXR = 50 + r * Math.cos(angleR)
    const endYR = 50 + r * Math.sin(angleR)
    const endXL = 50 + r * Math.cos(angleL)
    const endYL = 50 + r * Math.sin(angleL)
    rightD = `M 50 ${String(south)} A ${String(r)} ${String(r)} 0 0 0 ${endXR.toFixed(4)} ${endYR.toFixed(4)}`
    leftD = `M 50 ${String(south)} A ${String(r)} ${String(r)} 0 0 1 ${endXL.toFixed(4)} ${endYL.toFixed(4)}`
  }

  return (
    <svg
      aria-hidden="true"
      className="absolute pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ inset: 0, width: '100%', height: '100%' }}
    >
      <path
        d={rightD}
        stroke="var(--color-breathing-accent)"
        fill="none"
        strokeLinecap="round"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={leftD}
        stroke="var(--color-breathing-accent)"
        fill="none"
        strokeLinecap="round"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
