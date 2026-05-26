import type { ReactNode } from 'react'

import type { CueStyleId, SessionFrame } from '../domain'
import type { UiStrings } from '../content/strings'
import type { BreathingShapeVariant, OrbIdleBehavior, RingCueStyle } from '../featureFlags'
import { useAmbientScale } from '../hooks/useAmbientScale'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MIN_SCALE, MAX_SCALE, MID_SCALE } from './shapeConstants'
import { CueGlyph } from './CueGlyph'

export interface OrbShapeProps {
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
  strings: UiStrings['practice']['breathing']
  // Phase 25 Plan 03: OPTIONAL, default 'labels' — zero-regression for callers
  // that pre-date Phase 25. OrbLeadIn does NOT receive cue (D-07).
  cue?: CueStyleId
  // Phase 31: NKShape passes 'front' | 'back' to render its locked MID_SCALE
  // shell with a phase-aware centre-disc bg (front=accent, back=accent-strong).
  // NKShape overlays the live OM count, so the shell carries no label/digit.
  nkPhase?: 'front' | 'back'
  // J7 wires this off at Idle + Complete call sites. Default true matches the
  // spike (rings show during Running). OrbLeadIn never shows rings — its prop
  // default is hard-set to false inside the component.
  showRings?: boolean
  // J5: query-string-gated variant. 'orb-halo' (V1, default) = 3-layered
  // organic-puddle halos + disc with soft shadow + rings at 0.45 opacity.
  // 'minimal-rings' (V2) = single full-bleed accent halo at 0.16 opacity +
  // disc with no shadow + rings at 0.5 opacity.
  variant?: BreathingShapeVariant
  // J6: when set AND no frame/leadIn/nkPhase, render the idle orb (empty
  // centre disc; scale = MID_SCALE for 'still', breath-clock scale for
  // 'ambient'). showRings is hard-set to false on the idle path per spike
  // 010 IdleScreen line 1979 + CompleteScreen line 2026.
  idleMode?: OrbIdleBehavior | null
  // Phase 45: query-string-gated ring-cue style. Default 'progress-arc'
  // renders the spike-011 bidirectional progress arc (south-anchored,
  // suppressed under reduced-motion; faint outer track always present).
  // 'outer-inner' preserves the prior outer + inner ring rendering.
  ringCue?: RingCueStyle
  // J16: completion state — static halo orb (showRings false, scale MID)
  // with a checkmark glyph centred on the accent disc. Spike 010 L2026 +
  // CheckMarker L1006-1014. Takes priority over the frame === null idle path.
  showCompletion?: boolean
  // Rendered inside the centre disc — currently only consumed by the nkPhase
  // branch, where NKShape passes the live OM count so it inherits the disc's
  // on-accent text color (instead of overlaying as a sibling with default
  // body color, which read as washed-out grey on Mono Zen).
  children?: ReactNode
}

// V1 3-layer halo geometry — transcribed verbatim from spike 010/index.html
// lines 617-619 (the VariantOrbHalo body). Asymmetric border-radii give
// the organic puddle feel; small px shifts layer the halos with offset.
const V1_HALOS = [
  { token: '--color-orb-halo-1', pct: 1.0, radius: '48% 52% 51% 49% / 50% 49% 51% 50%', shift: [-4, 2] },
  { token: '--color-orb-halo-2', pct: 0.86, radius: '52% 48% 49% 51% / 49% 52% 48% 51%', shift: [3, -2] },
  { token: '--color-orb-halo-3', pct: 0.74, radius: '50% 50% 53% 47% / 51% 49% 51% 49%', shift: [-1, 3] },
] as const

// Spike 012 V5 Halo Flame: same geometry as V1_HALOS — only the halo-1
// and halo-2 tokens differ (gold rgba per spike lock); halo-3 reuses the
// existing --color-orb-halo-3 (cool slate, intentionally unchanged per
// spike README L168-169).
const SPIRITUAL_EYE_HALOS = [
  { token: '--color-orb-halo-1-spiritual-eye', pct: 1.0, radius: '48% 52% 51% 49% / 50% 49% 51% 50%', shift: [-4, 2] },
  { token: '--color-orb-halo-2-spiritual-eye', pct: 0.86, radius: '52% 48% 49% 51% / 49% 52% 48% 51%', shift: [3, -2] },
  { token: '--color-orb-halo-3', pct: 0.74, radius: '50% 50% 53% 47% / 51% 49% 51% 49%', shift: [-1, 3] },
] as const

const DISC_PCT = 0.62
// J5: 600 ms ease per spike V1 line 635 + V2 line 746 (corrected from J4's
// erroneous 400 ms ease-in-out, which was copied from the deleted
// .shape-marker--inner CSS rule instead of transcribed from the spike).
const RING_TRANSITION = 'opacity 600ms ease'
const DISC_BG_TRANSITION = 'background 400ms ease-in-out'

const V1_RING_OPACITY = 0.45
const V2_RING_OPACITY = 0.5
const V1_DISC_SHADOW = '0 6px 24px var(--color-border-soft)'
const V2_DISC_SHADOW = 'none'
const V2_HALO_OPACITY = 0.16

// Phase 38 D-03: OrbShape is the sole shape — it now owns the idle null-return
// guard that BreathingShape's dispatcher used to own (pre-Phase-38 D-04).
export function OrbShape({
  frame,
  leadInDigit,
  strings,
  cue = 'labels',
  nkPhase,
  showRings = true,
  variant = 'orb-halo',
  idleMode,
  showCompletion = false,
  ringCue = 'progress-arc',
  children,
}: OrbShapeProps) {
  if (process.env.NODE_ENV !== 'production' && nkPhase != null && frame != null) {
    console.warn('OrbShape: nkPhase + frame both provided; frame ignored')
  }
  if (nkPhase != null) {
    return (
      <OrbLeadIn digit={null} nkPhase={nkPhase} strings={strings} variant={variant} ringCue={ringCue}>
        {children}
      </OrbLeadIn>
    )
  }
  if (leadInDigit != null) {
    return <OrbLeadIn digit={leadInDigit} strings={strings} variant={variant} ringCue={ringCue} />
  }
  if (showCompletion) {
    return (
      <OrbContainer
        showRings={false}
        reducedMotion={false}
        orbScale={MID_SCALE}
        discBg="var(--color-breathing-accent)"
        variant={variant}
        ringCue={ringCue}
      >
        <CheckmarkGlyph />
      </OrbContainer>
    )
  }
  if (frame === null) {
    if (idleMode != null) {
      return <OrbIdle idleMode={idleMode} variant={variant} ringCue={ringCue} />
    }
    return null
  }
  return (
    <OrbBody
      frame={frame}
      strings={strings}
      cue={cue}
      showRings={showRings}
      variant={variant}
      ringCue={ringCue}
    />
  )
}

// Spike 010 CheckMarker (index.html L1006-1014): 32x32 / 24-viewBox /
// 2.4-stroke check polyline. Inherits on-accent text color from the centre
// disc — renders as white on the accent slate.
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

// Spike 012 V5 Halo Flame: 5-point polygon, outer:inner ratio 2.5, point
// straight up. Geometry locked at spike README L172-176; fill / stroke
// tokens defined in theme.css per-theme. Reads tokens directly via inline
// style (NOT currentColor) — the on-accent token would give #1a1d24 in
// dark, which the spike explicitly rejects (Locked V5 values row "Star
// fill" is #fafafe in dark). Star size = 20% of the centre disc per
// spike L175; sized via width/height "20%" relative to the disc.
function StarGlyph() {
  return (
    <span
      aria-hidden="true"
      className="relative z-10 flex items-center justify-center"
      style={{ width: '20%', height: '20%' }}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{
          fill: 'var(--color-orb-star-fill-spiritual-eye)',
          stroke: 'var(--color-orb-star-stroke-spiritual-eye)',
          strokeWidth: 0.5,
          strokeLinejoin: 'round',
        }}
      >
        <polygon points="50,10 57.05,33.78 81.02,33.78 61.99,48.22 69.04,72.00 50,57.55 30.96,72.00 38.01,48.22 18.98,33.78 42.95,33.78" />
      </svg>
    </span>
  )
}

interface OrbBodyProps {
  frame: SessionFrame
  strings: UiStrings['practice']['breathing']
  cue: CueStyleId
  showRings: boolean
  variant: BreathingShapeVariant
  ringCue: RingCueStyle
}

function OrbBody({ frame, strings, cue, showRings, variant, ringCue }: OrbBodyProps) {
  const reducedMotion = usePrefersReducedMotion()

  const progress = Math.min(1, Math.max(0, frame.phaseProgress))
  const liveScale =
    frame.phase === 'in'
      ? MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE)
      : MAX_SCALE - progress * (MAX_SCALE - MIN_SCALE)
  const orbScale = reducedMotion ? MID_SCALE : liveScale

  const phaseLabel = frame.phase === 'in' ? strings.inhale : strings.exhale

  const discBg =
    variant === 'spiritual-eye'
      ? 'var(--color-orb-disc-spiritual-eye)'
      : 'var(--color-breathing-accent)'

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
      discBg={discBg}
      variant={variant}
      ringCue={ringCue}
      arcProgress={progress}
    >
      {variant === 'spiritual-eye' ? (
        <StarGlyph />
      ) : (
        <CueGlyph cue={cue} phase={frame.phase} phaseLabel={phaseLabel} />
      )}
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
  variant,
  ringCue,
}: {
  idleMode: OrbIdleBehavior
  variant: BreathingShapeVariant
  ringCue: RingCueStyle
}) {
  const ambientScale = useAmbientScale(idleMode === 'ambient')
  const discBg =
    variant === 'spiritual-eye'
      ? 'var(--color-orb-disc-spiritual-eye)'
      : 'var(--color-breathing-accent)'
  return (
    <OrbContainer
      showRings={false}
      reducedMotion={false}
      orbScale={ambientScale}
      discBg={discBg}
      variant={variant}
      ringCue={ringCue}
    >
      {variant === 'spiritual-eye' ? <StarGlyph /> : null}
    </OrbContainer>
  )
}

// Phase 3 D-14: the lead-in is a neutral pre-state — orb locked at MID_SCALE
// (mirrors reduced-motion regardless of OS preference), digit rendered inside
// the centre disc. No data-phase/data-progress: those belong to the active
// breath loop. digit === null: Phase 31 NK locked shell — disc carries no
// numeral (NKShape overlays the OM count); nkPhase drives the disc bg
// (front=accent / back=accent-strong) to preserve the front/back distinction
// previously carried by the in/out gradient crossfade.
function OrbLeadIn({
  digit,
  strings,
  nkPhase,
  variant,
  ringCue,
  children,
}: {
  digit: 1 | 2 | 3 | null
  strings: UiStrings['practice']['breathing']
  nkPhase?: 'front' | 'back'
  variant: BreathingShapeVariant
  ringCue: RingCueStyle
  children?: ReactNode
}) {
  const labelProps =
    digit != null ? { role: 'img' as const, 'aria-label': strings.leadInAriaLabel(digit) } : {}
  const dataPhase = nkPhase != null ? (nkPhase === 'back' ? 'out' : 'in') : undefined
  const discBg =
    nkPhase === 'back'
      ? variant === 'spiritual-eye'
        ? 'var(--color-orb-disc-spiritual-eye-strong)'
        : 'var(--color-breathing-accent-strong)'
      : nkPhase === 'front' && variant === 'spiritual-eye'
        ? 'var(--color-orb-disc-spiritual-eye)'
        : 'var(--color-breathing-accent)'

  return (
    <OrbContainer
      ariaLabel={labelProps['aria-label']}
      role={labelProps.role}
      dataPhase={dataPhase}
      showRings={false}
      reducedMotion={false}
      orbScale={MID_SCALE}
      discBg={discBg}
      variant={variant}
      ringCue={ringCue}
    >
      {digit != null && (
        <span className="relative z-10 text-7xl font-semibold tracking-tight sm:text-8xl">
          {digit}
        </span>
      )}
      {children}
    </OrbContainer>
  )
}

// Shared layout: outer container at --orb-size, optional ring layers, then
// the breathing-scale wrapper (`.orb` class kept for `will-change: transform`
// GPU promotion — see theme.css comment) containing the halo region + centre
// disc. The halo region branches per variant: V1 renders 3 organic-puddle
// halos, V2 renders a single full-bleed accent halo.
interface OrbContainerProps {
  role?: 'img'
  ariaLabel?: string
  dataPhase?: 'in' | 'out'
  dataProgress?: string
  showRings: boolean
  innerRingPhase?: 'in' | 'out'
  reducedMotion: boolean
  orbScale: number
  discBg: string
  variant: BreathingShapeVariant
  // Phase 45 Plan 02: ring-cue style threaded from OrbShape. Only the
  // inner-ring slot in the showRings block branches on this value; the
  // faint outer track stays byte-identical across both cues.
  ringCue: RingCueStyle
  // Phase 45 Plan 02: clamped phaseProgress (0..1) — only consumed when
  // ringCue === 'progress-arc'. Defaults to 0 for non-Running call sites
  // (Idle / LeadIn / Complete) that pass showRings={false} and therefore
  // never reach the arc branch.
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
  variant,
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
  const ringOpacity = variant === 'minimal-rings' ? V2_RING_OPACITY : V1_RING_OPACITY
  const discShadow = variant === 'minimal-rings' ? V2_DISC_SHADOW : V1_DISC_SHADOW

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
              opacity: ringOpacity,
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
                  opacity: innerVisible * ringOpacity,
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
        {variant === 'minimal-rings' ? (
          <div
            aria-hidden="true"
            className="absolute"
            style={{
              inset: 0,
              borderRadius: '50%',
              background: 'var(--color-breathing-accent)',
              opacity: V2_HALO_OPACITY,
            }}
          />
        ) : variant === 'spiritual-eye' ? (
          SPIRITUAL_EYE_HALOS.map((h, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="absolute"
              style={{
                width: `${String(h.pct * 100)}%`,
                height: `${String(h.pct * 100)}%`,
                borderRadius: h.radius,
                background: `var(${h.token})`,
                transform: `translate(${String(h.shift[0])}px, ${String(h.shift[1])}px)`,
              }}
            />
          ))
        ) : (
          V1_HALOS.map((h, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="absolute"
              style={{
                width: `${String(h.pct * 100)}%`,
                height: `${String(h.pct * 100)}%`,
                borderRadius: h.radius,
                background: `var(${h.token})`,
                transform: `translate(${String(h.shift[0])}px, ${String(h.shift[1])}px)`,
              }}
            />
          ))
        )}
        <div
          className="absolute flex items-center justify-center"
          style={{
            width: `${String(DISC_PCT * 100)}%`,
            height: `${String(DISC_PCT * 100)}%`,
            borderRadius: '50%',
            background: discBg,
            color: 'var(--color-breathing-on-accent)',
            boxShadow: discShadow,
            transition: DISC_BG_TRANSITION,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Phase 45 Plan 02: bidirectional progress arc — verbatim TSX transcription
// of spike-011 RingsB (index.html lines 179–229). Spike-locked values must
// not be touched: viewBox="0 0 100 100", r = 49.7, sweep-flag 0 on the right
// path / 1 on the left, dynamic-endpoint arc paths via .toFixed(4), no
// stroke-dasharray + no pathLength (Chrome renders those as broken segments
// per spike README Surprise #2). Stroke 2.5 is the spike-locked product
// value (the spike's progressStrokeWidth runtime prop was a harness control).
// Outer track is NOT duplicated here — OrbContainer already renders the
// faint outer <span> above this branch (shared across both ring cues and
// both reduced-motion states).
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

  // Spike-011 RingsB used `let rightD = ''` + `let leftD = ''` as empty
  // initializers, with the `t === 0` case implicitly skipping the if/else
  // and emitting empty paths. Since the `showArc = !reducedMotion && t > 0`
  // guard above now short-circuits t === 0, both branches always assign —
  // we declare without the dead empty-string init to satisfy lint while
  // preserving the spike's branch shape verbatim.
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
