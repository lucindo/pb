import type { SessionFrame } from '../domain/sessionMath'
import type { CueStyleId } from '../domain/settings'
import type { UiStrings } from '../content/strings'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MIN_SCALE, MAX_SCALE, MID_SCALE } from './shapeConstants'
import { CueGlyph } from './CueGlyph'

export interface OrbShapeProps {
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
  strings: UiStrings['breathing']
  // Phase 25 Plan 03: OPTIONAL, default 'labels' — zero-regression for callers
  // that pre-date Phase 25. OrbLeadIn does NOT receive cue (D-07).
  cue?: CueStyleId
  // Phase 31: when set, NKShape is rendering its locked MID_SCALE shell beneath
  // its own live OM count. The shell carries NO countdown numeral, and the value
  // ('front' | 'back') drives the In/Out gradient the same way frame.phase does
  // for the live breathing body — Front shows the In color, Back the Out.
  nkPhase?: 'front' | 'back'
}

// D-04: OrbShape does NOT own the idle null-return — the BreathingShape
// dispatcher (Plan 05) guards that and never invokes OrbShape with both
// frame=null AND leadInDigit=null.
export function OrbShape({ frame, leadInDigit, strings, cue = 'labels', nkPhase }: OrbShapeProps) {
  if (nkPhase != null) {
    // Phase 31: locked shell, no numeral — NKShape overlays the OM count.
    return <OrbLeadIn digit={null} nkPhase={nkPhase} strings={strings} />
  }
  if (leadInDigit != null) {
    // OrbLeadIn does NOT receive cue — D-07: lead-in countdown digit is unchanged
    return <OrbLeadIn digit={leadInDigit} strings={strings} />
  }
  // OrbShape's caller (BreathingShape dispatcher) guarantees frame !== null
  // when leadInDigit is null (D-04 — dispatcher owns the idle null-return guard).
  // Reason: BreathingShape dispatcher asserts frame !== null before delegating to OrbShape when leadInDigit is null.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return <OrbBody frame={frame!} strings={strings} cue={cue} />
}

function OrbBody({ frame, strings, cue }: { frame: SessionFrame; strings: UiStrings['breathing']; cue: CueStyleId }) {
  const reducedMotion = usePrefersReducedMotion()

  const progress = Math.min(1, Math.max(0, frame.phaseProgress))
  const liveScale =
    frame.phase === 'in'
      ? MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE)
      : MAX_SCALE - progress * (MAX_SCALE - MIN_SCALE)
  const orbScale = reducedMotion ? MID_SCALE : liveScale

  // Phase 19 Path A wedge: translate at JSX layer (D-18 file-split invariant).
  // frame.phaseLabel is 'In'/'Out' from domain; strings.inhale/strings.exhale carry
  // the locale-appropriate translation. domain/sessionMath.ts is NOT edited.
  const phaseLabel = frame.phase === 'in' ? strings.inhale : strings.exhale

  return (
    <div
      role="img"
      aria-label={`${strings.breathingShapeAriaLabel}: ${phaseLabel}`}
      data-phase={frame.phase}
      data-progress={progress.toFixed(3)}
      data-variant="orb"
      className="relative mx-auto my-12 grid place-items-center"
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
      }}
    >
      {/* D-04 + Phase 5.1 D-10/D-12: outer reference ring at MAX_SCALE boundary.
          The 1.5px border (theme.css `.shape-marker--outer { border-width: 1.5px }`) lives
          INSIDE the box under the global `border-box` sizing. With `inset-0` the border's
          outer edge sat 1.5px inside the 100% container; the orb at scale(MAX_SCALE = 1.0)
          fills the 100% container exactly, leaving a Safari-visible gap at peak inhale.
          `inset: -1.5px` shifts the border-box outward by exactly the border width so the
          border's outer edge meets the orb at scale(1.0) on Safari + Chromium + Firefox.
          Mirror in OrbLeadIn below — both render sites must match (D-12). */}
      <span
        aria-hidden="true"
        className="shape-marker--outer absolute rounded-full border-solid"
        style={{ left: '-1.5px', top: '-1.5px', right: '-1.5px', bottom: '-1.5px' }}
      />
      {/* The orb itself: scaled host with two stacked gradient layers (D-01, D-02, D-07).
          Phase 5.1 Plan 04 D-20 + post-UAT hotfix: drop `inset-0` and use explicit
          four-edge anchoring (left/right/top/bottom) so Safari Desktop sizes the
          abs-pos `.orb` against the container's padding-box rather than collapsing
          to the inner-ring's implicit grid auto-track (which made `.orb` 58% of
          parent — see 05.1-UAT.md Task 3 pre-fix inspector data: 209 px instead
          of 360 px). Initial Plan 04 fix used `width:100%; height:100%` (percent
          dims) which sized correctly but FROZE the `transition: transform 200ms`
          interpolation on Safari (post-fix UAT showed scale stuck at 0.58
          despite React inline transform updating to scale(0.99) — Safari layer
          interpolation never advanced beyond the initial value). Four-edge
          anchoring matches the working outer-ring pattern and preserves the
          transition. Mirrored in OrbLeadIn below (D-22). */}
      <div
        className="orb absolute rounded-full motion-reduce:transition-none"
        style={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          // `translate3d(0,0,0)` forces GPU compositor promotion (Firefox
          // Desktop flickers without this; Safari/Chromium auto-promote).
          // Order matters: translate3d first so it establishes the 3D
          // context, scale applies inside it.
          transform: `translate3d(0,0,0) scale(${String(orbScale)})`,
        }}
      >
        <span
          aria-hidden="true"
          className="orb-layer--in absolute inset-0 rounded-full"
        />
        <span
          aria-hidden="true"
          className="orb-layer--out absolute inset-0 rounded-full"
        />
      </div>
      {/* D-04 + 260510-tc9 Bug 1: inner reference ring at MIN_SCALE boundary.
          Rendered AFTER the orb so it sits on top of the opaque gradient fill
          rather than behind it — the previous DOM order placed the ring below
          the orb body, where it was occluded at every scale (no visible cue for
          Out-phase arrival). With the ring on top, orb-edge approaches a fixed
          visible inner ring as Out progresses (mirroring the outer-ring cue on
          In) and coincides at MIN_SCALE = phase boundary.
          WR-03: position explicitly with left/top + translate centering rather
          than relying on implicit grid auto-positioning of an absolutely-positioned
          child, which is genuinely ambiguous in the spec for absolutely-positioned
          grid items and is rendered inconsistently by older Safari. */}
      <span
        aria-hidden="true"
        className="shape-marker--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid"
        style={{
          width: `${(MIN_SCALE * 100).toFixed(2)}%`,
          height: `${(MIN_SCALE * 100).toFixed(2)}%`,
        }}
      />
      {/* D-03: phase label centered inside the orb at large display size.
          Phase 25 Plan 03: replaced with CueGlyph — branches on `cue` prop.
          labels mode: byte-identical to the original span (zero regression).
          arrow/nose modes: aria-hidden SVG + sr-only phaseLabel (CUE-03 / D-09). */}
      <CueGlyph cue={cue} phase={frame.phase} phaseLabel={phaseLabel} />
    </div>
  )
}

// Phase 3 D-14 + Phase 2 D-06: the lead-in is a neutral pre-state. The orb is
// locked at MID_SCALE for everyone (mirrors reduced-motion mode regardless of
// OS preference), and only the In gradient is rendered (no Out crossfade) so
// the lead-in feels like a still pool of water awaiting the first breath.
//
// No usePrefersReducedMotion subscription here — the lead-in is constant by
// design, so there is no animation to suppress.
//
// No data-phase / data-progress on the root — those attributes belong to the
// active phase loop. The lead-in is pre-state and exposes only the aria-label
// "Lead-in: N" for assistive tech.
// digit === null: Phase 31 NK locked shell — renders the MID_SCALE geometry
// only, with no countdown numeral. NKShape supplies its own role/aria-label on
// the wrapper and overlays the live OM count, so this subtree stays decorative.
// nkPhase (NK shell only) drives data-phase so theme.css crossfades the orb to
// the Out gradient on Back, mirroring the live breathing body's In/Out cue.
function OrbLeadIn({
  digit,
  strings,
  nkPhase,
}: {
  digit: 1 | 2 | 3 | null
  strings: UiStrings['breathing']
  nkPhase?: 'front' | 'back'
}) {
  const labelProps =
    digit != null ? { role: 'img' as const, 'aria-label': strings.leadInAriaLabel(digit) } : {}
  const phaseProps = nkPhase != null ? { 'data-phase': nkPhase === 'back' ? 'out' : 'in' } : {}
  return (
    <div
      {...labelProps}
      {...phaseProps}
      data-variant="orb"
      // my-12 only on the standalone countdown lead-in; the NK locked shell
      // (digit === null) fills NKShape's box, which owns the margin itself —
      // a second my-12 here would shove the orb graphic down inside NKShape.
      className={`relative mx-auto grid place-items-center${digit != null ? ' my-12' : ''}`}
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
      }}
    >
      {/* Outer reference ring (Phase 2 D-04 + Phase 5.1 D-10/D-12).
          Mirrors OrbBody above — both render sites must match
          or the Safari outer-ring gap reappears during the 3-2-1 countdown. */}
      <span
        aria-hidden="true"
        className="shape-marker--outer absolute rounded-full border-solid"
        style={{ left: '-1.5px', top: '-1.5px', right: '-1.5px', bottom: '-1.5px' }}
      />
      {/* Orb host locked at MID_SCALE. Countdown lead-in: only the In gradient
          (still-pool pre-state). NK locked shell (nkPhase set): both gradient
          layers so data-phase='out' can crossfade to the Back color. Phase 5.1
          Plan 04 D-20 + D-22 + post-UAT hotfix: same four-edge anchoring as
          OrbBody. The lead-in is locked at MID_SCALE so the transition-freeze
          symptom doesn't show up here, but match the body for D-22 invariant. */}
      <div
        className="orb absolute rounded-full"
        style={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          // GPU promotion (see OrbBody comment above).
          transform: `translate3d(0,0,0) scale(${String(MID_SCALE)})`,
        }}
      >
        <span
          aria-hidden="true"
          className="orb-layer--in absolute inset-0 rounded-full"
        />
        {nkPhase != null && (
          <span
            aria-hidden="true"
            className="orb-layer--out absolute inset-0 rounded-full"
          />
        )}
      </div>
      {/* Inner reference ring (Phase 2 D-04 + 260510-tc9 Bug 1) — rendered AFTER
          the orb so it sits on top of the opaque gradient fill. D-22 mirror of
          OrbBody. */}
      <span
        aria-hidden="true"
        className="shape-marker--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid"
        style={{
          width: `${(MIN_SCALE * 100).toFixed(2)}%`,
          height: `${(MIN_SCALE * 100).toFixed(2)}%`,
        }}
      />
      {/* D-14: digit in the same large-display position as the In/Out label,
          one step larger (text-7xl/text-8xl vs the body's text-5xl/text-6xl)
          so the countdown reads as dominant. Omitted in the NK locked shell
          (digit === null) — NKShape draws the OM count instead. */}
      {digit != null && (
        <span
          className="relative z-10 text-7xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)] sm:text-8xl"
          style={{ color: 'var(--color-orb-in-text)' }}
        >
          {digit}
        </span>
      )}
    </div>
  )
}
