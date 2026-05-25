---
spike: 011
name: ring-progress-cue
type: comparison
validates: "Given the production orb + phase driver (BPM × ratio), when the alternative south-anchored bidirectional progress arc replaces the current outer + inner ring pair, then the user can still gauge time-to-flip from velocity + distance and the cue reads as calm/meditative — at least as well as the production cue"
verdict: VALIDATED — ships behind a dev query-string toggle (?ringCue=progress-arc) alongside the production outer+inner cue; default unchanged
related: []
tags: [ui, orb, ring, pacing-cue, breathing-visual, comparison]
---

# Spike 011: Ring Progress Cue

## What This Validates

**Given** the production orb (3 halos + accent disc + In/Out label + scale-on-breath `0.58 → 1.0` driven by `phaseProgress`) running at real BPM × ratio tempos,
**when** the alternative south-anchored bidirectional progress arc replaces the current outer + inner ring pair on the Running screen,
**then** the user can still pace by sight (gauge time-to-flip from velocity + distance) at least as well as the production cue, and the alternative reads as calm/meditative — not gamified.

The orb body, the phase driver, the BPM and ratio choices, the accent color tokens, and the size clamp are all transcribed verbatim from the live app (no spike-010 references — this spike is grounded in the current `src/` only).

## How to Run

```bash
open .planning/spikes/011-ring-progress-cue/index.html
```

Network required on first open (CDN imports: react@19.0.0, react-dom@19.0.0, htm@3.1.1, tailwind).

## What to Expect

- Harness bar at the top (dark, labelled NOT product) with:
  - Variant toggle: **A · Production** ⇄ **B · Progress arc**
  - Theme toggle: light / dark
  - Reduced-motion override (mirrors `prefers-reduced-motion`)
  - Desktop-size toggle (320 px instead of the clamped mobile 180–280 px)
  - Stroke width picker (B only): 1.5 / 2 / 2.5 / 3 / 4 px
- A production-faithful orb stage in the middle. **Toggling A ⇄ B mid-cycle keeps the clock running** — you see the same breath at the same instant under both ring approaches.
- Tempo controls below the orb: BPM picker (1…7), Ratio picker (50:50 / 40:60 / 30:70 / 20:80), Start/Pause, Reset.
- Four preset depth-probe tempos: Default (5.5 @ 40:60), Fastest (7 @ 50:50), Slow asym (3 @ 30:70), Very slow (2 @ 50:50).
- Readout strip showing cycle / inhale / exhale seconds, current phase, current phaseProgress, current cycle index.

### Variant A — Production (current app)

Transcribed verbatim from `src/components/OrbShape.tsx::OrbContainer`:
- Outer ring: `inset:0`, `1.5px solid var(--color-breathing-accent)`, `border-radius:50%`, opacity `0.45`, always visible.
- Inner ring: `58%` (= `MIN_SCALE × 100`) of container, centered, same border, opacity `0` during inhale and `0.45` during exhale, `transition: opacity 600ms ease`. Suppressed under reduced-motion.

### Variant B — Progress arc (the alternative)

- Faint outer track kept (identical to A's outer ring) so the variant is "add a layer", not "swap out the chrome".
- Two SVG semicircle paths, each `pathLength="100"`, `vector-effect="non-scaling-stroke"`:
  - **Right half:** `M 50 99.7 A 49.7 49.7 0 0 1 50 0.3` — south → east → north (CW).
  - **Left half:** `M 50 99.7 A 49.7 49.7 0 0 0 50 0.3` — south → west → north (CCW).
- `fillPct = (phase === 'in' ? phaseProgress : 1 - phaseProgress) * 100`
- `strokeDasharray = "${fillPct} ${100 - fillPct}"` — drawn portion grows from the path start (south) for both halves, closing at north when `fillPct=100`.
- During inhale: arcs grow `0% → 100%` (closure at north when progress = 1).
- During exhale: arcs retract `100% → 0%` symmetrically (dot at south when progress = 1).
- No inner ring.
- Suppressed under reduced-motion (same as A's inner ring).

The arc's stroke center sits at `r = 49.7` in viewBox-100 units — approximately coincident with the production faint-ring border locus at orb-size 240 px (`(240 − 1.5) / 2 / 240 × 100 ≈ 49.69`).

## Depth probes to walk through

Before declaring a verdict, audition both variants at:
1. **Default tempo** (5.5 BPM @ 40:60) — the everyday case.
2. **Fastest** (7 BPM @ 50:50) — does the arc look frantic vs. the rings?
3. **Slow asym** (3 BPM @ 30:70) — exhale runs at 1/3 the inhale speed; does the arc's slow exhale-retraction still convey "time-to-flip"?
4. **Very slow** (2 BPM @ 50:50) — 15 s per phase; does the arc stay engaging or read as dead time?

Toggle A ⇄ B mid-cycle at each tempo. Watch for:
- **Closure-moment legibility** — does the "arcs meet at north" instant land as a real flip-cue at progress = 1?
- **Pacing affordance** — can you predict the flip from the arc's velocity + remaining distance, the way the current outer + inner ring pair lets you?
- **Symmetry read** — does the bidirectional south-anchored growth read as one motion (a closing/opening ring) or two competing motions?
- **Calm vs. gamified** — does the arc feel "meditation app" or "fitness tracker"?
- **Reduced motion** — with the override on, both A and B fall back to the faint outer ring + static MID-scale orb. Does either feel acceptable?
- **Theme parity** — does the arc work in both light and dark? (Dark accent is `#b4bac4`, lighter than the disc — keep an eye on contrast.)

## Investigation Trail

- 2026-05-25 — Built initial harness with both variants side-swappable, four preset tempos, theme + reduced-motion + desktop-size + stroke-width controls. Orb body transcribed verbatim from `OrbShape.tsx`; phase math transcribed verbatim from `sessionMath.ts`; settings space (BPM 1-7, four ratios) transcribed from `settings.ts`. Default stroke 2.5 px so the progress arc reads as a layer ON the faint 1.5 px track.

- 2026-05-25 — **Blank page on first open.** Console: `InvalidCharacterError: Failed to execute 'createElement' on 'Document': The tag name provided ('') is not a valid name.` Root cause: htm's `<>...</>` fragment shorthand calls `h('', ...)` (empty-string type, *not* null), and a bare `htm.bind(React.createElement)` rejects that. Fix: wrap the bind in `(type, props, ...children) => React.createElement(type || React.Fragment, props, ...children)`. First attempt used `type == null` — missed the empty-string case; second attempt used `type ||` and caught all falsies.

- 2026-05-25 — **Variant B rendered as ~4 dashed arc segments distributed around the ring.** Root cause: `pathLength="100"` combined with `vector-effect="non-scaling-stroke"` interacts unpredictably with `stroke-dasharray` in Chrome — the dash pattern ended up repeating multiple times around each half-arc instead of producing one continuous segment. Computed lengths (no pathLength) didn't fix it either. Fix: drop dasharray entirely and emit **dynamic-endpoint arc paths** per frame — at parameter `t`, compute the exact arc endpoint and emit `M start A r r 0 0 sweep end`, producing one continuous stroke. More CPU per frame (a couple of trig ops + a string template) but visually deterministic.

- 2026-05-25 — **Operator: "I want one arc, not 5."** Briefly switched to a single semicircle (right side only) before the operator corrected: bidirectional was the intent all along — the screenshot showed segments, not "5 separate arcs". Reverted to two arcs with the dynamic-endpoint approach. Lesson recorded: distinguish rendering-bug screenshots from design feedback early.

- 2026-05-25 — **Arcs rendered as a heart/petal shape curving through the orb center.** Root cause: SVG `sweep-flag` for an arc starting at south does NOT follow naive "CW-from-clockface" intuition — `sweep-flag=1` from south picked the arc on the *inside* of the chord (passing through the orb's interior) rather than along the outer ring. Fix: invert both flags — right half uses `sweep-flag=0`, left half uses `sweep-flag=1`. Confirmed empirically (the spike is also the source-of-truth for this in the build phase; see Phase 45).

- 2026-05-25 — **Operator audition at default tempo (5.5 BPM @ 40:60) confirmed the bidirectional arc reads as one continuous closing/opening motion**, with the closure-at-north moment aligning with the orb peaking at MAX_SCALE. Verdict: ship behind a dev toggle alongside the production cue (the locked end-of-phase ring cue Requirement is preserved as default).

## Results

- **Verdict: VALIDATED** — alternative ring cue is calm, legible, and a credible companion to the production outer+inner cue. Ships behind the developer-only query-string toggle `?ringCue=progress-arc`; production default remains `outer-inner` (the locked Spike-010 Requirement still applies to the default).
- **Evidence:** harness audition at 5.5 BPM @ 40:60 (default); operator confirmed continuous motion, closure-at-north legibility, and pacing affordance. No regressions noted at desktop size or in dark theme.
- **Surprises (folded into Phase 45's implementation notes):**
  1. htm `<>...</>` fragment shorthand calls `h('', ...)`, not `h(null, ...)` — bind wrappers must use `||`, not `== null`.
  2. SVG `pathLength` + `vector-effect="non-scaling-stroke"` + `stroke-dasharray` is a fragile combination in Chrome; dynamic-endpoint arcs are the reliable path for partial-arc rendering.
  3. SVG `sweep-flag` from south for an arc-along-outer-ring is **inverted** vs. intuition — `sweep-flag=0` is the right-side (through east), `sweep-flag=1` is the left-side (through west).
- **Implementation guidance for the real build (Phase 45):**
  - Transcribe `RingsB` verbatim — the rendering decisions above are spike-locked, not negotiable.
  - Wire as a query-string flag (`?ringCue=progress-arc`) following the established `breathingShape` / `orbIdle` pattern in `src/featureFlags.ts`.
  - Reduced-motion suppresses the arc layer (mirrors the production inner-ring suppression).
  - Faint outer track stays in both variants — it's the "background" the progress arc is laid on.
