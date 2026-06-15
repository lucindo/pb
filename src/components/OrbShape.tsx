import { useMemo } from 'react'

import { createWallSessionClock } from '../audio/sessionClock'
import type { CueStyleId, SessionFrame } from '../domain'
import type { UiStrings } from '../content/strings'
import type { OrbIdleBehavior, RingCueStyle } from '../featureFlags'
import { useAmbientScale } from '../hooks/useAmbientScale'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MIN_SCALE, MAX_SCALE, MID_SCALE } from './shapeConstants'
import { CueGlyph } from './CueGlyph'

export interface OrbShapeProps {
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
  strings: UiStrings['practice']['breathing']
  // OPTIONAL, default 'labels' — zero-regression for callers that don't supply a cue.
  // OrbLeadIn does NOT receive cue.
  cue?: CueStyleId
  // Wired off at Idle + Complete call sites; default true = rings show during Running.
  // OrbLeadIn's prop default is hard-set to false inside the component.
  showRings?: boolean
  // When set AND no frame/leadIn, renders the idle orb (empty centre disc;
  // scale = MID_SCALE for 'still', breath-clock-driven for 'ambient').
  // showRings is hard-set to false on the idle path.
  idleMode?: OrbIdleBehavior | null
  // Ring-cue style. Default 'progress-arc' renders the bidirectional progress arc
  // (south-anchored, suppressed under reduced-motion; faint outer track always present).
  // 'outer-inner' preserves the prior outer + inner ring rendering.
  ringCue?: RingCueStyle
  // Completion state — static halo orb (showRings false, scale MID) with a checkmark
  // glyph centred on the accent disc. Takes priority over the frame === null idle path.
  showCompletion?: boolean
}

const DISC_PCT = 0.62
// 600 ms ease is the locked ring transition duration.
const RING_TRANSITION = 'opacity 600ms ease'
const DISC_BG_TRANSITION = 'background 400ms ease-in-out'

const RING_OPACITY = 0.5
const HALO_OPACITY = 0.16

// OrbShape is the sole shape — it owns the idle null-return guard.
export function OrbShape({
  frame,
  leadInDigit,
  strings,
  cue = 'labels',
  showRings = true,
  idleMode,
  showCompletion = false,
  ringCue = 'progress-arc',
}: OrbShapeProps) {
  if (leadInDigit != null) {
    return <OrbLeadIn digit={leadInDigit} strings={strings} ringCue={ringCue} />
  }
  if (showCompletion) {
    return (
      <OrbContainer
        showRings={false}
        reducedMotion={false}
        orbScale={MID_SCALE}
        discBg="var(--color-breathing-accent)"
        ringCue={ringCue}
      >
        <CheckmarkGlyph />
      </OrbContainer>
    )
  }
  if (frame === null) {
    if (idleMode != null) {
      return <OrbIdle idleMode={idleMode} ringCue={ringCue} />
    }
    return null
  }
  return (
    <OrbBody
      frame={frame}
      strings={strings}
      cue={cue}
      showRings={showRings}
      ringCue={ringCue}
    />
  )
}

// 32x32 check disc, 24 viewBox, 2.4-stroke check polyline.
// Inherits on-accent text color from the centre disc.
function CheckmarkGlyph() {
  return (
    <span
      aria-hidden="true"
      className="relative z-10"
      style={{ color: 'var(--color-breathing-on-accent)' }}
    >
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

interface OrbBodyProps {
  frame: SessionFrame
  strings: UiStrings['practice']['breathing']
  cue: CueStyleId
  showRings: boolean
  ringCue: RingCueStyle
}

function OrbBody({ frame, strings, cue, showRings, ringCue }: OrbBodyProps) {
  const reducedMotion = usePrefersReducedMotion()

  const progress = Math.min(1, Math.max(0, frame.phaseProgress))
  const liveScale =
    frame.phase === 'in'
      ? MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE)
      : MAX_SCALE - progress * (MAX_SCALE - MIN_SCALE)
  const orbScale = reducedMotion ? MID_SCALE : liveScale

  const phaseLabel = frame.phase === 'in' ? strings.inhale : strings.exhale

  return (
    <OrbContainer
      role="img"
      ariaLabel={`${strings.breathingShapeAriaLabel}: ${phaseLabel}`}
      dataPhase={frame.phase}
      dataProgress={progress.toFixed(3)}
      showRings={showRings}
      innerRingPhase={frame.phase}
      reducedMotion={reducedMotion}
      orbScale={orbScale}
      discBg="var(--color-breathing-accent)"
      ringCue={ringCue}
      arcProgress={progress}
    >
      <CueGlyph cue={cue} phase={frame.phase} phaseLabel={phaseLabel} />
    </OrbContainer>
  )
}

// J6: idle orb — empty centre disc, no rings, scale = MID_SCALE for 'still'
// or breath-clock-driven for 'ambient' (gated by ?orbIdle=ambient via
// vm.featureFlags.orbIdle). useAmbientScale handles the reduced-motion case
// internally (returns MID_SCALE static), so the OrbContainer can leave its
// reducedMotion gate at false — moot when showRings=false anyway.
function OrbIdle({
  idleMode,
  ringCue,
}: {
  idleMode: OrbIdleBehavior
  ringCue: RingCueStyle
}) {
  // Stable WallSessionClock for useAmbientScale's rAF loop initial start capture.
  // Constructed once per component instance via useMemo so the hook's dep array
  // sees a stable identity. Per-tick time comes from the rAF DOMHighResTimeStamp,
  // not from this clock — this clock is for the initial start anchor only.
  const ambientWallClock = useMemo(() => createWallSessionClock(), [])
  const ambientScale = useAmbientScale(idleMode === 'ambient', ambientWallClock)
  return (
    <OrbContainer
      showRings={false}
      reducedMotion={false}
      orbScale={ambientScale}
      discBg="var(--color-breathing-accent)"
      ringCue={ringCue}
    />
  )
}

// Lead-in: neutral pre-state — orb locked at MID_SCALE regardless of OS
// reduced-motion preference. No data-phase/data-progress: those belong to
// the active breath loop.
function OrbLeadIn({
  digit,
  strings,
  ringCue,
}: {
  digit: 1 | 2 | 3
  strings: UiStrings['practice']['breathing']
  ringCue: RingCueStyle
}) {
  return (
    <OrbContainer
      ariaLabel={strings.leadInAriaLabel(digit)}
      role="img"
      showRings={false}
      reducedMotion={false}
      orbScale={MID_SCALE}
      discBg="var(--color-breathing-accent)"
      ringCue={ringCue}
    >
      <span className="relative z-10 text-7xl font-semibold tracking-tight sm:text-8xl">
        {digit}
      </span>
    </OrbContainer>
  )
}

// Shared layout: outer container at --orb-size, optional ring layers, then
// the breathing-scale wrapper (`.orb` class kept for `will-change: transform`
// GPU promotion — see theme.css comment) containing a single full-bleed accent
// halo + centre disc.
interface OrbContainerProps {
  role?: 'img' | undefined
  ariaLabel?: string | undefined
  dataPhase?: 'in' | 'out' | undefined
  dataProgress?: string
  showRings: boolean
  innerRingPhase?: 'in' | 'out'
  reducedMotion: boolean
  orbScale: number
  discBg: string
  // Ring-cue style threaded from OrbShape. Only the inner-ring slot in the
  // showRings block branches on this value; the faint outer track is shared.
  ringCue: RingCueStyle
  // Clamped phaseProgress (0..1) — only consumed when ringCue === 'progress-arc'.
  // Defaults to 0 for non-Running call sites (Idle / LeadIn / Complete)
  // that pass showRings={false} and therefore never reach the arc branch.
  arcProgress?: number
  children?: React.ReactNode
}

function OrbContainer({
  role,
  ariaLabel,
  dataPhase,
  dataProgress,
  showRings,
  innerRingPhase,
  reducedMotion,
  orbScale,
  discBg,
  ringCue,
  arcProgress = 0,
  children,
}: OrbContainerProps) {
  const rootProps = {
    ...(role != null ? { role } : {}),
    ...(ariaLabel != null ? { 'aria-label': ariaLabel } : {}),
    ...(dataPhase != null ? { 'data-phase': dataPhase } : {}),
    ...(dataProgress != null ? { 'data-progress': dataProgress } : {}),
  }

  const innerVisible = innerRingPhase === 'out' ? 1 : 0
  const innerSizePct = `${(MIN_SCALE * 100).toFixed(2)}%`

  return (
    <div
      {...rootProps}
      data-variant="orb"
      className="relative mx-auto my-12 grid place-items-center"
      style={{ width: 'var(--orb-size)', height: 'var(--orb-size)' }}
    >
      {showRings && (
        <>
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
          {ringCue === 'progress-arc' ? (
            <ProgressArcLayer
              phase={innerRingPhase ?? 'in'}
              progress={arcProgress}
              reducedMotion={reducedMotion}
            />
          ) : (
            !reducedMotion && (
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  width: innerSizePct,
                  height: innerSizePct,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  border: '1.5px solid var(--color-breathing-accent)',
                  borderRadius: '50%',
                  opacity: innerVisible * RING_OPACITY,
                  transition: RING_TRANSITION,
                }}
              />
            )
          )}
        </>
      )}
      <div
        className="orb absolute inset-0 flex items-center justify-center motion-reduce:transition-none"
        style={{
          // `translate3d(0,0,0)` forces GPU compositor promotion (Firefox flickers
          // without it; Safari/Chromium auto-promote). Order: translate3d first to
          // establish the 3D context, then scale applies inside it.
          transform: `translate3d(0,0,0) scale(${String(orbScale)})`,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            inset: 0,
            borderRadius: '50%',
            background: 'var(--color-breathing-accent)',
            opacity: HALO_OPACITY,
          }}
        />
        <div
          className="absolute flex items-center justify-center"
          style={{
            width: `${String(DISC_PCT * 100)}%`,
            height: `${String(DISC_PCT * 100)}%`,
            borderRadius: '50%',
            background: discBg,
            color: 'var(--color-breathing-on-accent)',
            transition: DISC_BG_TRANSITION,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Bidirectional progress arc. Locked geometry values: viewBox="0 0 100 100",
// r = 49.7, sweep-flag 0 on the right path / 1 on the left, arc paths via
// .toFixed(4), no stroke-dasharray + no pathLength (Chrome renders those as
// broken segments). Stroke width 2.5 is the locked product value.
// Outer track is NOT duplicated here — OrbContainer already renders the
// faint outer <span> shared across both ring cues and both reduced-motion states.
function ProgressArcLayer({
  phase,
  progress,
  reducedMotion,
}: {
  phase: 'in' | 'out'
  progress: number
  reducedMotion: boolean
}) {
  const r = 49.7
  const south = 50 + r
  const north = 50 - r
  const t = phase === 'in' ? progress : 1 - progress
  const showArc = !reducedMotion && t > 0

  if (!showArc) return null

  // The original harness used `let rightD = ''` + `let leftD = ''` as empty
  // initializers, with the `t === 0` case implicitly skipping the if/else
  // and emitting empty paths. Since the `showArc = !reducedMotion && t > 0`
  // guard above now short-circuits t === 0, both branches always assign —
  // we declare without the dead empty-string init to satisfy lint while
  // preserving the branch shape verbatim.
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
