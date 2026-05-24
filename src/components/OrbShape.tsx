import type { ReactNode } from 'react'

import type { CueStyleId, SessionFrame } from '../domain'
import type { UiStrings } from '../content/strings'
import type { BreathingShapeVariant, OrbIdleBehavior } from '../featureFlags'
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
  children,
}: OrbShapeProps) {
  if (nkPhase != null) {
    return (
      <OrbLeadIn digit={null} nkPhase={nkPhase} strings={strings} variant={variant}>
        {children}
      </OrbLeadIn>
    )
  }
  if (leadInDigit != null) {
    return <OrbLeadIn digit={leadInDigit} strings={strings} variant={variant} />
  }
  if (frame === null) {
    if (idleMode != null) {
      return <OrbIdle idleMode={idleMode} variant={variant} />
    }
    return null
  }
  return <OrbBody frame={frame} strings={strings} cue={cue} showRings={showRings} variant={variant} />
}

interface OrbBodyProps {
  frame: SessionFrame
  strings: UiStrings['practice']['breathing']
  cue: CueStyleId
  showRings: boolean
  variant: BreathingShapeVariant
}

function OrbBody({ frame, strings, cue, showRings, variant }: OrbBodyProps) {
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
      variant={variant}
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
  variant,
}: {
  idleMode: OrbIdleBehavior
  variant: BreathingShapeVariant
}) {
  const ambientScale = useAmbientScale(idleMode === 'ambient')
  return (
    <OrbContainer
      showRings={false}
      reducedMotion={false}
      orbScale={ambientScale}
      discBg="var(--color-breathing-accent)"
      variant={variant}
    />
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
  children,
}: {
  digit: 1 | 2 | 3 | null
  strings: UiStrings['practice']['breathing']
  nkPhase?: 'front' | 'back'
  variant: BreathingShapeVariant
  children?: ReactNode
}) {
  const labelProps =
    digit != null ? { role: 'img' as const, 'aria-label': strings.leadInAriaLabel(digit) } : {}
  const dataPhase = nkPhase != null ? (nkPhase === 'back' ? 'out' : 'in') : undefined
  const discBg =
    nkPhase === 'back'
      ? 'var(--color-breathing-accent-strong)'
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
          {!reducedMotion && (
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
