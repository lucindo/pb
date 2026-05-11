---
phase: 02-visual-guide-accessible-responsive-interface
plan: 02
subsystem: visual-guide-orb
tags:
  - react
  - tailwind-v4
  - css
  - animation
  - reduced-motion
  - orb
  - aria
dependency_graph:
  requires:
    - "02-01 (usePrefersReducedMotion hook)"
    - "Phase 1 SessionFrame contract (single rAF clock, phaseProgress 0..1)"
  provides:
    - "Refined orb component with stacked-gradient crossfade, two static reference rings, in-orb large phase label, fluid clamp() sizing"
    - "Phase 2 CSS token set (--orb-size, --orb-scale-{min,max,mid}, 6 gradient color tokens, 2 ring color tokens, --color-modal-backdrop)"
    - ".orb / .orb-layer--in / .orb-layer--out / .orb-ring--outer / .orb-ring--inner CSS classes"
    - "Reduced-motion CSS branch that kills .orb transform/transition while preserving the .orb-layer opacity crossfade (D-07)"
    - "App.session.test.tsx orb test contract (5 new tests + 1 rewritten test)"
  affects:
    - "Plan 03 (SessionReadout simplification): Plan 03 can remove the in-readout phase label without breaking the rewritten 'shows In phase via orb' test, because that test no longer asserts on readout text — it only asserts on the orb's aria-label."
    - "Plan 04 (modal): consumes --color-modal-backdrop token shipped here as a single source of truth."
tech-stack:
  added:
    - "None (pure React + Tailwind v4 + CSS)"
  patterns:
    - "Stacked-gradient opacity crossfade for binary phase indication (In = teal-leaning, Out = blue-leaning; 400ms ease-in-out triggered on [data-phase] attribute change only — never per-frame)"
    - "Aria-hidden static reference rings as fixed visual bounds (outer = MAX_SCALE boundary, inner = MIN_SCALE boundary)"
    - "Reduced-motion CSS branch that selectively kills transform animations while preserving opacity transitions (D-07: gradient crossfade + text label substitute for the scale animation)"
    - "Pure-derived component scale (orbScale = f(frame.phaseProgress, reducedMotion)) with no internal state and no parallel timers — preserves the SESS-05 single-clock invariant"
    - "CSS custom property (--orb-size: clamp(180px, 35vw, 360px)) bound to inline style for fluid responsive sizing without media-query breakpoints"
key-files:
  created: []
  modified:
    - "src/styles/theme.css (29 → 93 lines): added 13 Phase 2 tokens, .orb / .orb-layer--{in,out} / .orb-ring--{outer,inner} classes, refined reduced-motion guard"
    - "src/components/BreathingShape.tsx (29 → 79 lines): rewritten internals — preserves Phase 1 props/contract, adds usePrefersReducedMotion hook, two reference rings, two gradient layers, large in-orb label, MIN/MID/MAX_SCALE constants"
    - "src/app/App.session.test.tsx (217 → 248 lines): rewrote the 'shows In phase' test to assert via the orb's aria-label; added 5 new tests (reference rings, gradient layers, text-5xl label, normal-motion live scale, reduced-motion fixed scale); added afterEach vi.restoreAllMocks() to the running session display describe"
decisions:
  - "Kept the legacy .breathing-shape class in theme.css (unused at runtime now that BreathingShape switched to .orb) as a harmless safety net — avoids breaking any latent references and preserves diff minimalism."
  - "Rebound .breathing-shape's gradient and text colors to the new --color-orb-{in,out}-{from,to,text} tokens (instead of keeping its hardcoded Phase 1 hex literals) so the legacy class and the new orb stay visually coherent if anything still touches it."
  - "Crossfade duration pinned at 400ms (mid-band of D-07's 300–500ms window) — RESEARCH Pitfall 7 confirms this avoids stacking on rapid [data-phase] changes."
  - "MID_SCALE computed as (MIN_SCALE + MAX_SCALE)/2 = 0.79 (not a hardcoded 0.79) so the constant stays self-consistent if the bounds ever change."
  - "Reduced-motion branch lives in BOTH the @media CSS guard AND the motion-reduce: Tailwind utility on the .orb element (belt-and-braces per D-09)."
  - "PHRASED the rewritten test to ONLY positively assert orb-side behavior (Breathing shape: In aria-label is visible) and NOT to negate the readout — Plan 03 owns the readout simplification + its own queryByText('Current phase')-not-in-document assertion in App.settings.test.tsx. This keeps Plans 02 and 03 fully decoupled at suite level."
metrics:
  duration: "~12 minutes (single-shot, no rework)"
  tasks_completed: 2
  files_modified: 3
  files_created: 0
  tests_added: 5
  tests_rewritten: 1
  total_tests_passing: "54/54"
  completed: "2026-05-09"
---

# Phase 2 Plan 02: Refine BreathingShape (Orb + Rings + In-Orb Label + Reduced-Motion Branch) Summary

**One-liner:** Phase 1 placeholder orb upgraded to the polished Phase 2 visual centerpiece — stacked-gradient In/Out crossfade, two static aria-hidden reference rings at the breath-cycle boundaries, large in-orb phase label, fluid clamp() sizing, and a reduced-motion branch that holds the orb at the mid-scale while preserving the gradient crossfade as the substitute phase cue.

## What Shipped

### `src/styles/theme.css` — Phase 2 token + class set
- 13 new tokens added inside the `@theme` block: `--orb-size: clamp(180px, 35vw, 360px)`, `--orb-scale-{min,max,mid}` (0.58 / 1.0 / 0.79), 6 gradient color tokens (`--color-orb-{in,out}-{from,to,text}`), 2 reference-ring color tokens (`--color-ring-{outer,inner}`), and `--color-modal-backdrop` (consumed by Plan 04 as a single source of truth).
- 7 Phase 1 tokens preserved verbatim. The legacy `.breathing-shape` class is preserved (rebound to the new color tokens) as a harmless fallback.
- New `.orb` class: `transition: transform 200ms ease-out` — the scale-animation host.
- New `.orb-layer--in` / `.orb-layer--out` classes: stacked gradient layers with `transition: opacity 400ms ease-in-out`. The crossfade is triggered exclusively by `[data-phase='out']` attribute changes (NOT per-frame), so the GPU never thrashes at high BPM.
- New `.orb-ring--outer` / `.orb-ring--inner` classes: thin border-only rings using the new ring color tokens.
- Refined `@media (prefers-reduced-motion: reduce)` guard: kills `.orb` and `.breathing-shape` transform/transition with `!important`, but **deliberately omits `.orb-layer--*`** so the opacity crossfade survives — D-07 mandates the crossfade + text label as the substitute phase indicator under reduced motion.

### `src/components/BreathingShape.tsx` — refined orb component
- Phase 1 contract preserved: `BreathingShape({ frame })` props signature, returns `null` when `frame === null`, retains `role="img"`, `aria-label="Breathing shape: {phaseLabel}"`, `data-phase`, `data-progress` attributes.
- Imports `usePrefersReducedMotion` from `../hooks/usePrefersReducedMotion` (Plan 01 deliverable).
- New constants: `MIN_SCALE = 0.58`, `MAX_SCALE = 1.0`, `MID_SCALE = (MIN_SCALE + MAX_SCALE) / 2 = 0.79`.
- Outer wrapper sized via inline `style={{ width: 'var(--orb-size)', height: 'var(--orb-size)' }}` — fluid responsive without media queries.
- Children, in stack order:
  1. Outer reference ring (`<span aria-hidden="true" class="orb-ring--outer absolute inset-0 ...">`).
  2. Inner reference ring sized to `MIN_SCALE * 100%` (`<span aria-hidden="true" class="orb-ring--inner ...">`).
  3. The `.orb` host (`<div class="orb absolute inset-0 rounded-full motion-reduce:transition-none" style={{ transform: \`scale(${orbScale})\` }}>`) containing two stacked aria-hidden gradient layers (`.orb-layer--in` and `.orb-layer--out`).
  4. The phase-label `<span>` (`text-5xl font-semibold tracking-tight ... sm:text-6xl`) with text color bound to the matching `--color-orb-{in,out}-text` token.
- Scale formula: `liveScale = phase==='in' ? MIN + progress*(MAX-MIN) : MAX - progress*(MAX-MIN)`; `orbScale = reducedMotion ? MID_SCALE : liveScale`.
- **Single-frame invariant preserved**: zero new `setInterval` / `requestAnimationFrame` / `setTimeout` calls (verified by grep). The orb is purely derived from the existing `SessionFrame.phaseProgress`.

### `src/app/App.session.test.tsx` — orb test contract
- Rewrote the existing "immediately shows the current In phase after starting a session" test to assert the In phase label via `screen.getByRole('img', { name: 'Breathing shape: In' })` (the orb is now the single visible source of the phase label per D-03). Removed the `within(readout).getByText('Current phase')` assertion to keep this plan decoupled from Plan 03's readout simplification.
- Added 5 new tests inside the `running session display` describe:
  1. **`renders the orb with two static aria-hidden reference rings`** — verifies `.orb-ring--outer` and `.orb-ring--inner` exist as `aria-hidden="true"` children.
  2. **`renders two stacked gradient layers (In and Out) and a single in-orb phase label`** — verifies `.orb-layer--in`/`.orb-layer--out` aria-hidden children and visible `'In'` text.
  3. **`renders the in-orb phase label at large display size (text-5xl semibold) per D-03`** — verifies the visible (non-aria-hidden) child has `text-5xl` and `font-semibold` classes.
  4. **`binds the orb scale to phaseProgress in normal motion mode`** — under default `matches: false` matchMedia, asserts the `.orb` host's inline transform contains `scale(0.58…)` (MIN_SCALE at progress 0).
  5. **`holds the orb at fixed mid-scale (0.79) when reduced-motion is preferred (D-06)`** — `vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, ... })`, then asserts the `.orb` host's inline transform is exactly `scale(0.79)`.
- Added `afterEach(() => vi.restoreAllMocks())` to the `running session display` describe so the reduced-motion `matchMedia` spy doesn't leak into sibling tests.

## Requirements Addressed

- **GUID-01 — User can follow a polished synchronized breathing animation:** orb scale derives from `frame.phaseProgress` (single SessionFrame source), gradient crossfade triggered by `[data-phase]` changes — visuals stay locked to the engine clock.
- **GUID-02 — In-orb phase label:** `text-5xl font-semibold` (`sm:text-6xl`) `'In'` / `'Out'` label rendered as the centered child of the orb wrapper.
- **GUID-03 — Reduced-motion fixed-size variant:** `usePrefersReducedMotion()` branch sets `orbScale = MID_SCALE = 0.79`; gradient crossfade and text label remain (D-07).

## Decisions Implemented

- **D-01** Single abstract orb (no concentric rings of varying scale, no figure silhouette).
- **D-02** Teal-leaning In palette + blue-leaning Out palette via stacked gradient layers.
- **D-03** Phase label hosted by the orb (orb side; readout-side simplification is Plan 03's responsibility).
- **D-04** Two static reference rings at the inhale/exhale extremes; both `aria-hidden="true"` so they're decoration only.
- **D-05** No in-app reduced-motion override; the OS media query is the only switch.
- **D-06** Fixed mid-scale (0.79) under reduced motion.
- **D-07** Gradient crossfade preserved under reduced motion as the substitute phase cue (300–500ms band, pinned at 400ms).
- **D-08** Persistent text phase label means the visual cue is never color-only.
- **D-09** Reduced-motion guard with belt-and-braces (CSS `@media` + Tailwind `motion-reduce:`).
- **D-18** Fluid clamp() sizing via `--orb-size: clamp(180px, 35vw, 360px)`.
- **D-20** Light pastel-teal palette only — no dark-mode variant introduced.

## Did NOT Implement (out of plan scope)

- **D-03 readout side** — `SessionReadout.tsx` simplification (removing the in-readout phase label) is owned by Plan 03.
- **D-09 button/stepper transitions** — Plan 03.
- **D-10–D-14 modal** — Plan 04.
- **D-15–D-17 layout/hit-areas** — Plan 03.
- **D-21 focus rings** — Plan 03.

## Patterns Established

1. **Stacked-gradient opacity crossfade for binary phase indication.** Two absolutely-positioned full-bleed gradient layers (`.orb-layer--in`, `.orb-layer--out`) inside the same scale host; `[data-phase='out']` attribute selectors flip their opacities. The transition is on the *attribute change*, not on the per-frame `phaseProgress` update — RESEARCH Pitfall 7's anti-stacking pattern. Reusable for any future binary-state visual where color-only cueing is forbidden by D-08.
2. **Aria-hidden static reference rings as fixed visual bounds.** Decorative bounds rendered as `<span aria-hidden="true">` children sized via inline `width`/`height` percentages tied to the scale-formula constants — assistive tech sees only the `role="img"` wrapper with the human-readable phase label.
3. **Reduced-motion CSS branch that selectively kills transforms while preserving opacity.** Within `@media (prefers-reduced-motion: reduce)`, scope the disabling rule to the transform host only (`.orb`, `.breathing-shape`) — do NOT include `.orb-layer--*` so the opacity crossfade keeps the substitute phase indicator alive.
4. **Pure-derived scaled component.** `orbScale = reducedMotion ? MID_SCALE : f(frame.phaseProgress, frame.phase)` — zero internal state, zero parallel timers. Preserves the SESS-05 single-clock invariant from PROJECT.md.
5. **`vi.spyOn(window, 'matchMedia').mockReturnValue(...)` for reduced-motion test branches.** Combined with the `vitest.setup.ts` global polyfill (default `matches: false`) and an `afterEach(vi.restoreAllMocks())`, this is the canonical pattern for unit-testing the reduced-motion code path without contaminating sibling tests.

## Threat Model — Mitigations Applied

- **T-02-06 Tampering (independent timer in BreathingShape):** mitigated. `grep -cE "setInterval|requestAnimationFrame|setTimeout" src/components/BreathingShape.tsx` returns `0`. Orb purely derives `orbScale` from `frame.phaseProgress`.
- **T-02-07 Spoofing (decorative rings exposed to AT):** mitigated. Both rings use `aria-hidden="true"`. The wrapper has `role="img"` + a single human-readable `aria-label`. Two gradient layers also `aria-hidden="true"` (4 aria-hidden elements total — verified by grep).
- **T-02-09 DoS (excessive paints from per-frame crossfade):** mitigated. The opacity transition is bound to `[data-phase]` attribute changes — at 7 BPM (worst case) that's at most 14 transitions per minute, far below paint-budget concern. Duration pinned at 400ms inside D-07's 300–500ms band.
- **T-02-10 Repudiation (reduced-motion bypass):** mitigated. `usePrefersReducedMotion()` is the only signal source; no in-app override exists per D-05.

## Threat Flags

None — Plan 02 introduces no new network endpoints, auth surface, file-access patterns, or schema changes. All trust boundaries are unchanged from Phase 1 (OS reduced-motion preference flowing in via `matchMedia` is a read-only signal, already in scope of the threat model).

## Known Stubs

None — every visible piece of the orb is wired to live data:
- The phase label text comes from `frame.phaseLabel` (live from SessionFrame).
- Orb scale comes from `frame.phaseProgress` (live, or `MID_SCALE` under reduced motion).
- Gradient crossfade is driven by `data-phase={frame.phase}` (live).
- Reference rings are intentionally static decoration (they represent the breath-cycle bounds and never change shape) — not a stub, by design (D-04).

## Verification

- `npm run test -- --run` — **54/54 passed** (Phase 1: 32 tests + Plan 01: 17 tests + Plan 02: 5 new tests = 54).
- `npx tsc --noEmit` — exit 0, no errors.
- `npm run build` (`tsc -b && vite build`) — exit 0; CSS bundle 25.60 kB / 5.42 kB gz; JS bundle 200.54 kB / 63.26 kB gz.
- All Task 1 grep acceptance criteria satisfied.
- All Task 2 grep acceptance criteria satisfied (including `grep -v '^[[:space:]]*//' src/app/App.session.test.tsx | grep -c "Current phase"` → `0`, confirming the in-readout 'Current phase' assertion was removed).
- Single-SessionFrame invariant preserved: `grep -cE "setInterval|requestAnimationFrame|setTimeout" src/components/BreathingShape.tsx` → `0`.

## Deviations from Plan

**None** — plan executed exactly as written.

The plan included a self-correction note (lines 331–333) about a transient red-state risk if the rewritten test asserted the absence of `Current phase` before Plan 03 ships. The plan resolved this by REPHRASING the test to ONLY positively assert orb-side behavior — that is the version actually written. Plan 03 will own the negative assertion in `App.settings.test.tsx`. This is plan-as-written compliance, not a deviation.

## Self-Check: PASSED

**Files claimed created/modified — all present:**
- `src/styles/theme.css` — FOUND (modified, 93 lines)
- `src/components/BreathingShape.tsx` — FOUND (modified, 79 lines)
- `src/app/App.session.test.tsx` — FOUND (modified, 248 lines)

**Commits claimed — all present in history:**
- `558803f` `feat(02-02): extend theme.css with Phase 2 orb tokens and layer classes` — FOUND
- `896bb38` `feat(02-02): refine BreathingShape into orb with rings, layers, in-orb label, reduced-motion branch` — FOUND

**Acceptance verified:**
- All Task 1 grep checks pass.
- All Task 2 grep checks pass.
- Full vitest suite: 54/54 passing.
- `tsc --noEmit`: clean.
- `vite build`: succeeds.
