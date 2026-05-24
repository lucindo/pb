// CueGlyph.tsx — in-orb phase-indicator renderer for all 3 cue modes.
//
// Design source: .planning/phases/25-labels-vs-icons-cue-toggle/25-cue-icon-mockup.html
//   • Arrow mode: candidate F — soft solid filled chevron (up = In, down = Out, per D-03)
//   • Nose mode:  candidate D2 — nose outline + straight up/down arrows (per D-05)
//
// D-08: SVG sized to the text-5xl/sm:text-6xl footprint; static glyph — no animation,
//       no reduced-motion branch.
// D-09 / CUE-03: arrow and nose modes render aria-hidden SVG + visually-hidden sr-only
//                span so screen readers still announce the localized In/Out word.
// J4: in-orb glyph uses currentColor — the parent centre disc sets
//     color: var(--color-breathing-on-accent), which cascades into all 3 cue modes.
//     Preview swatches (CuePicker) use var(--color-breathing-accent) so the glyph
//     reads against the picker's surface bg.

import type { CueStyleId } from '../domain'

export interface CueGlyphProps {
  cue: CueStyleId
  phase: 'in' | 'out'
  phaseLabel: string
  // preview: picker-swatch rendering. Uses --color-breathing-accent so the glyph
  // stays visible on the picker's surface bg, and renders the first character of
  // phaseLabel for labels mode instead of the full phase word (which overflows
  // the swatch). Preview glyphs are purely decorative — the arrow/nose branches
  // skip the sr-only span entirely so the picker swatch emits no a11y node.
  preview?: boolean
}

// ── Arrow SVG path data (candidate F — soft solid chevron) ───────────────────
// viewBox 0 0 100 100 (sourced from 25-cue-icon-mockup.html)
const ARROW_IN_PATH =
  'M50 28 Q54 28 57 32 L82 64 Q84 68 80 70 Q76 72 73 68 L50 44 L27 68 Q24 72 20 70 Q16 68 18 64 L43 32 Q46 28 50 28 Z'
const ARROW_OUT_PATH =
  'M50 72 Q46 72 43 68 L18 36 Q16 32 20 30 Q24 28 27 32 L50 56 L73 32 Q76 28 80 30 Q84 32 82 36 L57 68 Q54 72 50 72 Z'

// ── Nose SVG elements (candidate D2 — nose outline + straight arrows) ────────
// Nose paths are identical for In and Out — only the arrows differ.
// Sourced from 25-cue-icon-mockup.html D2 section.
const NOSE_PATHS = [
  'M44 16 Q38 40 34 55',
  'M56 16 Q62 40 66 55',
  'M34 55 Q35 66 44 64 Q48 63 50 66 Q52 63 56 64 Q65 66 66 55',
]

// D2 In: straight arrows pointing up (In = inhale = up per D-03)
// line + polyline arrowhead
const NOSE_IN_ARROWS = {
  lines: [
    { x1: 37, y1: 92, x2: 37, y2: 76 },
    { x1: 63, y1: 92, x2: 63, y2: 76 },
  ],
  arrowheads: ['31,82 37,75 43,82', '57,82 63,75 69,82'],
}

// D2 Out: straight arrows pointing down (Out = exhale = down per D-03)
const NOSE_OUT_ARROWS = {
  lines: [
    { x1: 37, y1: 74, x2: 37, y2: 90 },
    { x1: 63, y1: 74, x2: 63, y2: 90 },
  ],
  arrowheads: ['31,84 37,91 43,84', '57,84 63,91 69,84'],
}

export function CueGlyph({ cue, phase, phaseLabel, preview = false }: CueGlyphProps): React.ReactElement {
  // J4: in-orb glyph inherits currentColor from the centre disc (which sets
  // color: var(--color-breathing-on-accent)). Picker swatch uses the accent
  // token directly so the glyph reads against the surface bg.
  const colorClass = preview ? 'text-[var(--color-breathing-accent)]' : ''

  // ── labels mode ─────────────────────────────────────────────────────────────
  if (cue === 'labels') {
    return (
      <span className={`relative z-10 text-5xl font-semibold tracking-tight sm:text-6xl ${colorClass}`}>
        {preview ? phaseLabel.charAt(0) : phaseLabel}
      </span>
    )
  }

  // ── arrow mode: candidate-F filled chevron ──────────────────────────────────
  if (cue === 'arrow') {
    const pathD = phase === 'in' ? ARROW_IN_PATH : ARROW_OUT_PATH
    return (
      <span className={`relative z-10 ${colorClass}`}>
        {/* D-08: sized to match the text-5xl/sm:text-6xl word footprint */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 100 100"
          className="h-12 w-12 sm:h-16 sm:w-16"
          fill="currentColor"
        >
          <path d={pathD} />
        </svg>
        {/* CUE-03: visually-hidden localized In/Out word for screen readers.
            Skipped in preview mode — picker swatches are decorative (CuePicker
            wraps them in aria-hidden) and should emit no accessibility node. */}
        {!preview && <span className="sr-only">{phaseLabel}</span>}
      </span>
    )
  }

  // ── nose mode: candidate-D2 nose outline + straight up/down arrows ──────────
  const arrowData = phase === 'in' ? NOSE_IN_ARROWS : NOSE_OUT_ARROWS
  return (
    <span className={`relative z-10 ${colorClass}`}>
      {/* D-08: sized to match the text-5xl/sm:text-6xl word footprint */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 100"
        className="h-12 w-12 sm:h-16 sm:w-16"
        fill="none"
        stroke="currentColor"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Nose outline — identical for In and Out */}
        {NOSE_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        {/* Direction arrows — up for In, down for Out */}
        {arrowData.lines.map((l) => (
          <line key={`${String(l.x1)}-${String(l.y1)}-${String(l.x2)}-${String(l.y2)}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
        {arrowData.arrowheads.map((pts) => (
          <polyline key={pts} points={pts} />
        ))}
      </svg>
      {/* CUE-03: visually-hidden localized In/Out word for screen readers.
          Skipped in preview mode — picker swatches are decorative (CuePicker
          wraps them in aria-hidden) and should emit no accessibility node. */}
      {!preview && <span className="sr-only">{phaseLabel}</span>}
    </span>
  )
}
