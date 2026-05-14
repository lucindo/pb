---
phase: 17-visual-variants
plan: phase-close
subsystem: ui
tags:
  - phase-close
  - visual-variants
  - shape-marker
  - orb
  - square
  - diamond
  - dispatcher
  - prefs-sync
  - phase-17

# Dependency graph
requires:
  - phase: 15-settingsdialog-shell
    provides: VariantPicker stub + disabled-in-session contract
  - phase: 16.1-ui-token-migration
    provides: THEME-UI-01 token-binding contract (all TSX color refs via var(--color-*))
  - phase: 16.3-thorough-theme-revision
    provides: stable 5-palette token surface that variant shapes inherit via D-13 token reuse
provides:
  - src/components/OrbShape.tsx
  - src/components/SquareShape.tsx
  - src/components/DiamondShape.tsx
  - src/components/shapeConstants.ts
  - src/hooks/useVisualVariant.ts
  - src/hooks/useVariantChoice.ts
  - BreathingShape 3-way dispatcher
  - VariantPicker full radiogroup UI
  - App.tsx sessionVariantRef capture-at-Start integration
affects:
  - Phase 18 (Audio Timbres) — same picker pattern; TIMBRE-01..05
  - Phase 19 (Language Switching) — same picker pattern; I18N-01..07

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-sibling shape files + thin dispatcher (D-01): OrbShape / SquareShape / DiamondShape each export { frame, leadInDigit } + Body/LeadIn subtrees"
    - "CSS-only per-variant geometry: [data-variant] attribute selectors in theme.css; zero new color tokens (D-13)"
    - "Render-local data-variant attribute: co-located on shape root div, never on <html> (D-16)"
    - "D-22 CustomEvent reuse: hrv:prefs-changed with detail.key filter per dimension"
    - "sessionVariantRef snapshot at Start: belt-and-suspenders against cross-tab storage events (D-09/D-10)"
    - "TDD RED/GREEN cadence honored in Plans 04 + 05"

key-files:
  created:
    - src/components/OrbShape.tsx
    - src/components/OrbShape.test.tsx
    - src/components/SquareShape.tsx
    - src/components/SquareShape.test.tsx
    - src/components/DiamondShape.tsx
    - src/components/DiamondShape.test.tsx
    - src/components/shapeConstants.ts
    - src/hooks/useVisualVariant.ts
    - src/hooks/useVisualVariant.test.ts
    - src/hooks/useVariantChoice.ts
    - src/hooks/useVariantChoice.test.ts
  modified:
    - src/components/BreathingShape.tsx
    - src/components/BreathingShape.test.tsx
    - src/components/VariantPicker.tsx
    - src/components/VariantPicker.test.tsx
    - src/components/SettingsDialog.test.tsx
    - src/app/App.tsx
    - src/app/App.session.test.tsx
    - src/styles/theme.css
  not_touched:
    - src/domain/settings.ts (D-19 — VisualVariantId/VARIANT_OPTIONS locked Phase 14; updated by UAT deviation commit c6ae41f)
    - src/storage/prefs.ts (D-19 — loadPrefs/savePrefs/coerceVariant locked Phase 14)
    - src/components/SettingsDialog.tsx (D-20 — picker phases never re-edit the dialog)

key-decisions:
  - "D-01: sibling shape files + thin dispatcher pattern — 3 shape components + BreathingShape dispatcher"
  - "D-09/D-10: sessionVariantRef snapshot at session Start; cleared on session end; belt-and-suspenders vs cross-tab events"
  - "D-11: audio reconstruction does NOT re-snapshot — orthogonal subsystems"
  - "D-13: zero new color tokens — all variants reuse --color-orb-in/out-* verbatim"
  - "D-15: .shape-marker--{outer,inner} rename; per-variant geometry via [data-variant] attribute selectors"
  - "D-16: data-variant render-local (not global) — only shape root div"
  - "D-18: zero net-new runtime npm dependencies"
  - "D-22: hrv:prefs-changed CustomEvent reused with detail.key='variant' filter"
  - "D-24: VARIANT-06 a11y floor — 44x44 hit area + focus-visible ring"

# Metrics
duration: "~1 day (2026-05-14)"
completed: 2026-05-14
---

# Phase 17: Visual Variants — Phase Summary

**Phase closed:** 2026-05-14 | **Milestone:** v1.1 Customization

**One-liner:** Three visual variants (Orb default + Square 18% rounded-square + Diamond rotated-square clip-path) via sibling-shape dispatcher with sessionVariantRef capture-at-Start, per-palette token reuse, and operator UAT-driven Ring → Diamond deviation applied in-phase.

## Goal Achieved

Phase 17 delivered a complete visual variant rendering system on top of the Phase 15 settings shell and Phase 16 token-bound theme cascade:

- Users can choose between **Orb** (default), **Square**, and **Diamond** from the SettingsDialog VariantPicker
- The chosen variant persists across reloads via `Envelope.prefs.variant`
- The picker is disabled while `inSessionView`; the active variant is captured at session start and does not change mid-session (D-09/D-10 capture-at-Start invariant)
- All variants honor `prefers-reduced-motion: reduce` (D-14 class reuse — no per-variant @media blocks)
- All variants render the 3-2-1 lead-in countdown digit correctly (VARIANT-05)
- All variants apply the existing 44×44 hit-area + focus-visible a11y floor (VARIANT-06/D-24)
- `VisualVariantId` is `'orb' | 'square' | 'diamond'`; `DEFAULT_VARIANT = 'orb'` (D-05 invariant held)

**All 7 VARIANT requirements (VARIANT-01..07) met and marked Done.**

## Plans Delivered

| Plan | Description | Key Commits | Notes |
|------|-------------|-------------|-------|
| 17-01 | CSS + TSX + test-selector rename `.orb-ring--*` → `.shape-marker--*` (D-15 atlas) | `76a4067` (feat), `e28a330` (docs) | Atomic rename across theme.css + BreathingShape.tsx + 2 test files |
| 17-02 | OrbShape extraction from BreathingShape (verbatim Body + LeadIn + `data-variant='orb'` + shapeConstants.ts) | `dd7228a`, `2d124b4`, `acd6e06` (feat); `76d67b6` (docs) | VARIANT-02 zero-regression provable via git diff |
| 17-03 | SquareShape + RingShape\* components + 6 `[data-variant]` CSS overrides | `c2ca951`, `6c0e561`, `a2d7e8b` (feat); `8858fc2` (docs) | \*RingShape later refactored to DiamondShape in Plan 06 UAT deviation (see below) |
| 17-04 | useVisualVariant orchestrator hook + useVariantChoice picker setter hook (TDD RED/GREEN) | `082b914`, `c89ce40`, `23516aa`, `bf9c312` (hooks); `66377a2` (docs) | D-16 no global attribute write; D-22 CustomEvent key filter |
| 17-05 | BreathingShape 3-way dispatcher (optional `variant?` prop) + VariantPicker full radiogroup (TDD RED/GREEN) | `bf43a0d`, `a8e50b7`, `0cfa0ab`, `04f15f5` (feat+test); `ca67838` (docs) | SettingsDialog.test.tsx updated for dual radiogroup |
| 17-06 | App.tsx integration (sessionVariantRef + BreathingShape variant prop) + VARIANT-03 tests + Ring → Diamond UAT deviation + phase close | `972d8c6` (feat), `c6ae41f`..`9bf5b90` (deviation), `3c1c1ea` (docs) | 6 deviation commits + 1 marker fix; UAT approved iteration 3 |

## Operator UAT Deviation Log

### Initial Context

Task 1 of Plan 06 landed App.tsx integration with Ring as variant 3. At the UAT checkpoint, the operator approved the overall UX but requested a shape change:

> "approved, but I want to switch the ring to different shape"

### Operator Choice: Diamond

The operator selected **Diamond** (rotated square) as the replacement for Ring. This was an in-phase deviation — no new plan required.

### Deviation Commits

| Commit | Type | Description |
|--------|------|-------------|
| `c6ae41f` | refactor | Rename VisualVariantId `'ring'` → `'diamond'` across domain + tests (settings.ts, prefs tests, domain tests, BreathingShape tests, VariantPicker tests, App.session tests) |
| `cac9680` | refactor | Swap RingShape → DiamondShape (rotated-square geometry via `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` on body + layers) |
| `78d5f69` | refactor | Update VariantPicker swatch from Ring SVG circle to Diamond polygon SVG |
| `3d4f97f` | refactor | Update theme.css `[data-variant]` overrides for Diamond geometry (clip-path rules replacing radial-gradient hollow-center rules) |
| `4c8846e` | test | Align all test fixtures with `'diamond'` variant ID (parameter arrays, `it.each` tables, expected `data-variant` values) |
| `9bf5b90` | fix | Render diamond markers as inscribed rotated squares (Rule 1 bug — clip-path on `shape-marker--outer/inner` renders specks; switched to `transform: rotate(45deg)` inscribed squares) |

### Implementation Technique

- **Body**: `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` on the `.orb` host + `.orb-layer--in/--out` gradient layers — produces a rotated-square (diamond) silhouette
- **Markers**: `transform: rotate(45deg)` inscribed squares on `.shape-marker--outer/--inner` via `[data-variant='diamond']` CSS rule (clip-path was tried and produced render specks at small sizes — Rule 1 auto-fix applied)

### Invariants Held Through Deviation

| Invariant | Status |
|-----------|--------|
| D-05: `DEFAULT_VARIANT = 'orb'` | Held — default unchanged |
| D-13: Zero new color tokens | Held — diamond reuses `--color-orb-in/out-*` verbatim |
| D-09/D-10: sessionVariantRef capture-at-Start | Held — snapshot fires at Start click before lead-in |
| D-17: Per-commit green-gate | Held — all 6 deviation commits + fix exit 0 |
| D-18: Zero net-new runtime deps | Held — pure CSS + SVG polygon; no new packages |
| D-23: THEME-UI-01 token-binding | Held — no hardcoded color classes in DiamondShape |

### Forward-Compat

Old `'ring'` localStorage values coerce to `DEFAULT_VARIANT = 'orb'` via `coerceVariant()` in `src/storage/prefs.ts` (the `isValidVariant()` predicate rejects `'ring'` as it is no longer in `VARIANT_OPTIONS`).

### UAT Iteration Log

- **Iteration 1**: Initial UAT — approved UX, operator requested Ring → Diamond swap
- **Iteration 2**: Diamond implemented (body clip-path) — operator identified marker rendering issue (specks at small sizes)
- **Iteration 3**: Marker fix applied (`transform: rotate(45deg)` inscribed squares) — **APPROVED**

## Requirements Traceability

| Requirement | Description (abbreviated) | Plans | Status |
|-------------|---------------------------|-------|--------|
| VARIANT-01 | Orb (default) + Square + Diamond picker | 17-03, 17-05 | Done |
| VARIANT-02 | Orb zero-regression default | 17-01, 17-02, 17-05 | Done |
| VARIANT-03 | Picker disabled in-session; capture-at-Start | 17-06 (App.tsx + tests) | Done |
| VARIANT-04 | Every variant honors prefers-reduced-motion | 17-03, 17-05 (class reuse D-14) | Done |
| VARIANT-05 | Lead-in countdown digit renders in every variant | 17-03, 17-05, 17-06 (test 5) | Done |
| VARIANT-06 | 44×44 hit area + focus-visible in VariantPicker | 17-05 (VariantPicker radiogroup, D-24) | Done |
| VARIANT-07 | Selection persists across reloads | 17-04 (useVariantChoice round-trip) | Done |

## Test Count Delta

| Milestone | Test Count |
|-----------|------------|
| Phase 16.3 baseline (pre-Phase-17) | 509 |
| After Plan 17-01 (rename only) | 509 |
| After Plan 17-02 (OrbShape extraction + shapeConstants) | 519 (+10) |
| After Plan 17-03 (SquareShape + DiamondShape/RingShape) | 558 (+39) |
| After Plan 17-04 (useVisualVariant + useVariantChoice TDD) | 572 (+14) |
| After Plan 17-05 (dispatcher + VariantPicker) | 582 (+10) |
| After Plan 17-06 Task 1 + UAT deviation + phase close | **588 (+6)** |

**Final test count: 588 tests across 46 test files** (all passing, `tsc + lint + build` green).

Note: Plan 03 SUMMARY records "567/567 tests pass" — that was the count at Plan 03 commit time before Plans 04/05/06 tests were added. The baseline delta (509 → 588 = +79 net new tests) is the Phase 17 contribution.

## Build Artifacts

Final `npm run build` output (2026-05-14):

```
dist/index.html                   1.00 kB │ gzip:  0.61 kB
dist/assets/index-CobBgcff.css   41.39 kB │ gzip:  7.78 kB
dist/assets/index-kaLfCMKh.js   248.32 kB │ gzip: 72.58 kB
```

**Total JS gzip:** 72.58 kB | **Total CSS gzip:** 7.78 kB

Zero new npm dependencies added (D-18). All new shape components are pure React + CSS.

## Architectural Patterns Established

### Three-Sibling Shape Files + Thin Dispatcher (D-01)

`OrbShape.tsx` / `SquareShape.tsx` / `DiamondShape.tsx` each export a standalone component with `{ frame, leadInDigit }` interface. `BreathingShape.tsx` is a ~40-LOC dispatcher that owns the idle null-return guard (D-04) and switches on `variant`. Clean extension path: adding a 4th variant requires one new `*Shape.tsx` + one new `case` in the dispatcher.

### Render-Local `data-variant` Attribute (D-16)

`data-variant` lives on the shape root div, not on `<html>`. CSS selectors `[data-variant='square'] .shape-marker--outer` resolve via DOM ancestry inside the shape root. This is intentionally different from `data-theme` (global, because every component reads it) — variant scope is render-only, so global is over-reach.

### Zero New Color Tokens (D-13)

All three variants reuse `--color-orb-in/out-*` custom properties verbatim. The visual distinction between variants is **geometric only** (border-radius, clip-path, stroke width) — not chromatic. This means Phase 16.3's curated palettes validate for all variants without per-variant re-tuning.

### sessionVariantRef Capture-at-Start (D-09/D-10)

`App.tsx` snapshots `sessionVariantRef.current = liveVariant` immediately before `setAppPhase('lead-in')`. During the session, `<BreathingShape variant={sessionVariantRef.current ?? liveVariant} />` uses the frozen snapshot value. The `useVisualVariant` hook still tracks cross-tab storage events (so the next Start picks up the new value), but the current session's shape is immutable once started.

## Key Decisions Honored (D-IDs from 17-CONTEXT.md)

| D-ID | Decision | How It Applied |
|------|----------|----------------|
| D-01 | Sibling shape files + dispatcher | OrbShape/SquareShape/DiamondShape + BreathingShape dispatcher |
| D-02 | Orb extracted verbatim | OrbShape = byte-identical body+leadin with only data-variant + class rename |
| D-03 | App passes `variant` prop to BreathingShape | sessionVariantRef.current ?? liveVariant prop wired in Plan 06 |
| D-04 | Dispatcher owns idle null-return guard | BreathingShape checks `frame===null && leadInDigit==null` before switching |
| D-05 | DEFAULT_VARIANT = 'orb' | Held throughout + forward-compat coercion of old 'ring' values |
| D-08 | Identical typography/centering across variants | All shapes reuse same phase label + lead-in digit overlay pattern |
| D-09 | sessionVariantRef snapshot | App.tsx useRef<VisualVariantId | null>(null) added |
| D-10 | Snapshot fires before lead-in begins | Set immediately before setAppPhase('lead-in') in onStartClick |
| D-11 | Audio reconstruction does NOT re-snapshot | onAudioReanchorRequired does not touch sessionVariantRef |
| D-12 | No live idle preview in BreathingShape | Picker inline swatches are the sole preview surface |
| D-13 | Zero new color tokens | --color-orb-in/out-* reused verbatim across all variants |
| D-14 | Reduced-motion via class reuse | @media (prefers-reduced-motion) applies uniformly via shared class hierarchy |
| D-15 | .shape-marker--{outer,inner} rename | Plan 01 atomic rename; Plan 03 extends via [data-variant] selectors |
| D-16 | data-variant render-local | Attribute on shape root div only; no document.documentElement write |
| D-17 | Per-commit green-gate | tsc + lint + build + test exit 0 at every commit boundary |
| D-18 | Zero net-new runtime deps | All shapes: pure CSS + React; no new packages |
| D-19 | Phase 14 file-split invariant | settings.ts + prefs.ts untouched (except UAT deviation commit c6ae41f which updated VisualVariantId in settings.ts) |
| D-20 | Phase 15 picker invariant | SettingsDialog.tsx untouched |
| D-21 | Phase 15 prop contract | VariantPicker accepts only `{ disabled: boolean }` |
| D-22 | hrv:prefs-changed CustomEvent reuse | useVariantChoice dispatches detail.key='variant'; useVisualVariant filters on same |
| D-23 | THEME-UI-01 token-binding guard | theme.no-hardcoded-classes.test.ts green; no new hardcoded color classes |
| D-24 | VARIANT-06 a11y floor | VariantPicker radiogroup: min-h-12 hit area + focus-visible:ring-breathing-accent |

## Carry-Forward / Open Items

| Item | Reason | Target |
|------|--------|--------|
| `.orb-layer--in/--out` → `.shape-layer--in/--out` rename | Class name `.orb-layer` is used by non-orb variants (D-13 acknowledged naming inconsistency); rename deferred to minimize Phase 17 diff | v1.2 ergonomics pass |
| Per-variant token sets (`--color-diamond-in-*` etc.) | Effectively reopens Phase 16.3 curated-palette work per variant; shape-only distinctness (D-13) chosen for v1.1 | v1.2+ if validated demand |
| Live idle preview of selected variant in BreathingShape | D-12 deferred — picker swatches chosen as sole preview surface; BreathingShape stays null at idle | v1.2+ |
| Additional shape variants (hexagon, waveform, etc.) | VARIANT_OPTIONS locked at 3 by Phase 14 D-01; adding a 4th requires settings.ts edit | v1.2+ |
| Variant-specific accessible names ("Breathing diamond shape" etc.) | Generic "Breathing shape" label chosen for v1.1 consistency; variant-specific labels deferred | v1.x |
| Global `<html data-variant>` attribute for chrome-level variant theming | YAGNI per D-16; revisit only if non-BreathingShape component genuinely needs variant awareness | v2+ if needed |
| Square 45° rotation or border-radius morph kinematics | Rejected at D-05 for kinematic complexity | v1.2+ if user demand |

## Deviations from Plan

### Operator UAT-Driven Deviation (in-phase, no new plan required)

**Ring → Diamond swap** — Variant 3 changed from Ring (annulus via `radial-gradient()` hollow center) to Diamond (rotated-square via `clip-path: polygon(...)`) during Plan 06 UAT iteration.

- **Found during:** Task 2 (Operator UAT checkpoint)
- **Nature:** Operator-directed shape change — not a correctness bug, not a new requirement; cosmetic architectural deviation within Phase 17 scope
- **Resolution:** 5 refactor commits + 1 bug-fix commit (`c6ae41f`..`9bf5b90`)
- **Impact:** `VisualVariantId` updated from `'orb' | 'square' | 'ring'` to `'orb' | 'square' | 'diamond'`; `RingShape.tsx` replaced by `DiamondShape.tsx`; theme.css rules updated; VariantPicker swatch updated; all tests updated
- **Forward-compat note:** Plan 03 SUMMARY.md still references RingShape (it was written before the deviation) — this is intentional; plan SUMMARYs are not retroactively edited. The deviation is documented here and in the individual 17-06 commits.

### Rule 1 Auto-Fix (marker rendering bug)

**1. [Rule 1 - Bug] Diamond marker clip-path produced render specks at small sizes**
- **Found during:** UAT iteration 2 marker review
- **Issue:** `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` on `.shape-marker--outer/--inner` (which are `inset: -1.5px` positioned small spans) rendered as near-invisible specks due to the stacking context interaction with the parent clip-path
- **Fix:** Switched to `transform: rotate(45deg)` inscribed rotated squares for markers (9bf5b90)
- **Files modified:** `src/styles/theme.css`

## Known Stubs

None. All Phase 17 deliverables are fully implemented:
- OrbShape, SquareShape, DiamondShape render with real kinematics + reduced-motion + lead-in digit
- VariantPicker is a fully functional radiogroup with real savePrefs + CustomEvent dispatch
- App.tsx sessionVariantRef snapshot is wired at the real Start click handler
- TimbrePicker + LanguagePicker remain as Phase 15 stubs — they are Phase 18/19 scope

## Self-Check: PASSED

Files created/confirmed:
- `.planning/phases/17-visual-variants/17-SUMMARY.md` — this file
- `.planning/REQUIREMENTS.md` — VARIANT-01..07 flipped to Done (checkboxes + traceability table)
- `.planning/ROADMAP.md` — Phase 17 checkbox [x] + Progress table 6/6 Complete + detail block updated
- `.planning/STATE.md` — completed_phases: 7, completed_plans: 28, percent: 87; Phase 17 close documented

Commits verified:
- `3c1c1ea` (docs(17-06): flip VARIANT-01..07 Done; mark Phase 17 complete) — FOUND
- `972d8c6` (feat(17-06): wire useVisualVariant + sessionVariantRef into App.tsx) — FOUND
- All 6 deviation commits (`c6ae41f`..`9bf5b90`) — FOUND

---
*Phase: 17-visual-variants*
*Completed: 2026-05-14*
*Operator: Renato Lucindo (lucindo@gmail.com)*
