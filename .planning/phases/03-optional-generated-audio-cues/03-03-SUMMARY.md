---
phase: 03-optional-generated-audio-cues
plan: 03
subsystem: ui-components
tags: [react, components, tdd, mute-toggle, session-controls, breathing-shape, lead-in, accessibility, optional-props]
type: execute
status: complete
wave: 3
dependency_graph:
  requires:
    - "src/components/SessionControls.tsx (Phase 1: original 3-prop signature, locked Start/End copy)"
    - "src/components/SettingsStepper.tsx (Phase 2 icon-button class baseline that MuteToggle copies)"
    - "src/components/BreathingShape.tsx (Phase 2: 99-line wrapper + body that gains a third leg)"
    - "src/domain/sessionMath.ts (SessionFrame interface used by tests)"
    - "src/hooks/usePrefersReducedMotion.ts (subscription only mounts in BreathingShapeBody, NOT LeadIn)"
  provides:
    - "MuteToggle component + MuteToggleProps interface (D-05/D-06/D-07/D-10/D-17)"
    - "SessionControls extended interface (3 OPTIONAL audio props for backwards-compat)"
    - "BreathingShape extended with optional leadInDigit prop (D-14)"
    - "BreathingShapeLeadIn sub-component (neutral pre-state orb at MID_SCALE)"
  affects:
    - "Phase 3 plan 04 (App.tsx wiring) — wires the three audio props on SessionControls and the leadInDigit prop on BreathingShape from useAudioCues hook state"
tech_stack:
  added: []
  patterns:
    - "Optional-prop dispatch gate (showMuteToggle = all-three-defined) for backwards-compat during multi-plan rollout"
    - "Inline SVG icon as bottom-of-file sub-component (no asset bundle, no icon-font dep)"
    - "WAI-ARIA aria-pressed pattern for stateful toggle button"
    - "Action-verb accessible names that describe what the click will do (D-06), not the current state"
    - "Disabled-icon affordance (disabled attr + cursor-not-allowed + opacity-45 + tooltip) per D-10"
    - "Wrapper-dispatch pattern (BreathingShape: 3-leg dispatch on leadInDigit / frame / null without violating Rules of Hooks)"
key_files:
  created:
    - "src/components/MuteToggle.tsx (88 lines)"
    - "src/components/MuteToggle.test.tsx (108 lines, 12 it() blocks)"
    - "src/components/SessionControls.test.tsx (147 lines, 9 it() blocks)"
    - "src/components/BreathingShape.test.tsx (80 lines, 9 it() blocks)"
  modified:
    - "src/components/SessionControls.tsx (21 → 70 lines: +49 — 3 OPTIONAL props, dispatch gate, new inline-mute branch)"
    - "src/components/BreathingShape.tsx (99 → 171 lines: +72 — leadInDigit prop, 3-leg dispatch, BreathingShapeLeadIn sub-component)"
decisions:
  - "Used the 'all-three-defined' gate (showMuteToggle = muted !== undefined && audioAvailable !== undefined && onMuteToggle !== undefined) per checker B3 — partial wiring during dev never produces a half-broken toggle; it must be all three or the legacy single-button layout."
  - "Class string for MuteToggle copies SettingsStepper's icon-button class baseline (lines 42-50 / 57-65 of SettingsStepper.tsx) verbatim except size-12 → size-11 (44 px exact match for Phase 2 D-17 hit-area floor) and dropped text-2xl + leading-none (icon, not glyph)."
  - "SVG icons are inline bottom-of-file sub-components (SpeakerIcon: 3 paths; SpeakerSlashIcon: 1 path + 2 lines for the X-style slash overlay). No asset bundle, no icon-font dependency, no extra HTTP request."
  - "BreathingShapeLeadIn does NOT call usePrefersReducedMotion. The lead-in is constant by design (locked at MID_SCALE for everyone, mirroring reduced-motion mode regardless of OS preference), so there is no animation to suppress. Hook is only mounted in BreathingShapeBody (the existing IN-04 wrapper rationale extends naturally to the new third leg)."
  - "Lead-in priority: when BOTH frame and leadInDigit are present, the lead-in wins. The frame may already be advancing in App.tsx (Plan 04 will start the session math at the lead-in begin so the audio + visual timelines stay aligned), but the user shouldn't see the In/Out label until the countdown ends."
  - "BreathingShapeLeadIn renders only the In gradient (no Out crossfade — neutral pre-state). The orb feels like a still pool of water awaiting the first breath."
  - "Lead-in digit class is text-7xl/text-8xl (one step larger than the In/Out label's text-5xl/text-6xl) so the countdown reads as dominant in the orb."
  - "Lead-in root has NO data-phase / data-progress attributes. Those are debug/test selectors for the active phase loop; the lead-in is pre-state and should not be confused with a phase. Tests assert their absence."
metrics:
  duration: "6.6 min"
  completed: 2026-05-09
  tasks_planned: 3
  tasks_completed: 3
  files_changed: 6
  test_count_baseline: 125
  test_count_after: 155
  test_delta: 30
  test_files_baseline: 12
  test_files_after: 15
  commits: 6
---

# Phase 3 Plan 03: MuteToggle + SessionControls inline-mute + BreathingShape lead-in Summary

**One-liner:** Shipped the three Phase-3 presentational layers (MuteToggle icon button with WAI-ARIA aria-pressed pattern, SessionControls inline-mute layout behind an all-three-defined dispatch gate that keeps Phase 1/2 App tests green, and BreathingShape leadInDigit dispatch with neutral-pre-state orb) so Plan 04 only needs to wire props from useAudioCues to App.tsx.

## What Was Built

| Artifact                                   | Purpose                                                                                                                                                                                                                                  | Used By                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/components/MuteToggle.tsx`             | `MuteToggle` icon-button + `MuteToggleProps` interface. Pure presentational layer — receives `muted`, `audioAvailable`, `onToggle` and emits the click. No hooks, no AudioContext access. Inline `SpeakerIcon` / `SpeakerSlashIcon` SVGs. | Plan 04 App.tsx (via SessionControls), Plan 05 UI review. |
| `src/components/MuteToggle.test.tsx`        | 12 it() blocks — aria-pressed reflects muted, three accessible-name states (Mute/Unmute/Audio unavailable), disabled-on-AC-failure, click handler fires only when enabled, 44 px hit-area floor, focus-ring tokens, motion-reduce + disabled-opacity guards, distinct SVG shapes. | Verification only.                                       |
| `src/components/SessionControls.tsx` (mod) | Extended with three OPTIONAL audio props. `showMuteToggle = all-three-defined` gate dispatches between the new inline-mute layout (D-05) and the verbatim legacy Phase-1 single-button layout. Locked copy preserved on both branches.    | Plan 04 App.tsx wiring.                                  |
| `src/components/SessionControls.test.tsx`   | 9 it() blocks — copy preservation on both branches, inline composition (D-05 always visible in idle and running), prop forwarding (muted/audioAvailable), click routing (mute vs primary), backwards-compat for omitted props, partial-props guard, flex-1 layout transformation. | Verification only.                                       |
| `src/components/BreathingShape.tsx` (mod)  | Wrapper now dispatches three legs: `leadInDigit != null` → `BreathingShapeLeadIn`, `frame === null` → null, else existing Body. New `BreathingShapeLeadIn` sub-component (neutral pre-state orb at MID_SCALE, In gradient only, text-7xl digit, aria-label="Lead-in: N").                | Plan 04 App.tsx (renders during the 3-2-1 countdown).    |
| `src/components/BreathingShape.test.tsx`    | 9 it() blocks — null/null returns null, frame-only renders Body (existing behavior preserved), leadInDigit 3/2/1 each render the digit, lead-in priority over frame (D-14), orb locked at MID_SCALE, no data-phase/data-progress on lead-in root, text-7xl digit class. | Verification only.                                       |

## Final SVG Icon Shapes Chosen

Per the plan output spec.

| Icon                | Element counts                                  | Rationale                                                                                                                                  |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `SpeakerIcon` (sound on)    | **3 paths**, 0 lines (1 speaker body + 2 sound-wave arcs)  | Standard "speaker with two curved waves" silhouette — instantly readable as audio. Sound waves emphasize positive state.                  |
| `SpeakerSlashIcon` (muted) | **1 path** (speaker body), **2 lines** (X-shaped slash) | Same speaker body for visual continuity; the X-style slash (two crossed lines from `(22,9)→(16,15)` and `(16,9)→(22,15)`) overlays where the sound waves were. Reads as "audio off" without ambiguity. |

Both SVGs use `viewBox="0 0 24 24"`, `width="20" height="20"`, `currentColor` stroke, `strokeWidth="2"`, `aria-hidden="true"` so the button's `aria-label` carries the semantic content.

The element-count distinction (`3 paths` vs `2 lines`) is not just cosmetic — Test 12 uses these counts to assert that the correct SVG renders for each `muted` state without depending on visual snapshots that would be brittle in jsdom.

## Phase 1 + Phase 2 Locked Strings: Verbatim Verification

| Locked string         | Phase    | Source decision  | Locations in this plan                                                                                                          |
| --------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `'Start session'`      | Phase 1  | D-11             | `SessionControls.tsx:42` (legacy branch), `SessionControls.tsx:60` (Phase 3 inline-mute branch). Both branches verbatim.       |
| `'End session'`        | Phase 1  | D-15             | `SessionControls.tsx:42` (legacy branch), `SessionControls.tsx:60` (Phase 3 inline-mute branch). Both branches verbatim.       |
| `'Breathing shape: ${phaseLabel}'` | Phase 2 | D-03   | `BreathingShape.tsx:57` (Body — unchanged from Phase 2). LeadIn uses a different aria-label `Lead-in: ${digit}` because it is a NEW component, not a phase-label rename. |
| Orb in/out gradient `.orb-layer--in` / `.orb-layer--out` | Phase 2 | D-07 | Body unchanged; LeadIn renders ONLY `.orb-layer--in` (no Out crossfade — neutral pre-state by design, not a phase-label change).                                                  |

All Phase 1 + Phase 2 App tests in `src/app/App.session.test.tsx` (15 tests) and `src/app/App.dialog.test.tsx` (5 tests) continue to pass — App.tsx still calls `<SessionControls status onStart onEnd />` (the legacy 3-prop signature), which now hits the `!showMuteToggle` branch and renders the original Phase-1 button verbatim.

## Test Count Delta

- **Baseline before this plan:** 125 tests in 12 test files.
- **After this plan:** 155 tests in 15 test files.
- **Delta:** +30 tests, +3 test files.

| Subset                                                | Tests | Status   |
| ----------------------------------------------------- | ----- | -------- |
| `MuteToggle.test.tsx`                                  | 12    | pass     |
| `SessionControls.test.tsx`                             | 9     | pass     |
| `BreathingShape.test.tsx`                              | 9     | pass     |
| Phase 1 + Phase 2 App tests (App.session + App.dialog) | 35    | pass (no regression) |
| All pre-existing tests (Phase 1+2 + Plan 03-01 + Plan 03-02) | 125   | pass     |
| **Full suite (`npm run test:run`)**                   | **155** | **pass** |
| Phase-3-Plan-03 focused subset (`-- src/components/MuteToggle src/components/SessionControls src/components/BreathingShape`) | 30    | pass |

## SessionControls Optional-Prop Fallback: Wave 3 Backwards-Compat Confirmed

Per checker B3, the SessionControls dispatch gate is `all-three-defined`:

```typescript
const showMuteToggle =
  muted !== undefined && audioAvailable !== undefined && onMuteToggle !== undefined
```

This means:

- **Plan 03 (this plan)**: App.tsx still passes only `status`/`onStart`/`onEnd` (the legacy Phase 1 call sites in `src/app/App.tsx`). `showMuteToggle` is false. SessionControls renders the legacy single-button layout verbatim. Phase 1 + Phase 2 App tests pass unchanged.
- **Plan 04 (next)**: App.tsx will be wired to call `<SessionControls status onStart onEnd muted={audio.muted} audioAvailable={audio.audioAvailable} onMuteToggle={() => audio.setMuted(!audio.muted)} />`. All three props become defined. `showMuteToggle` flips to true. The inline-mute layout activates.
- **Partial wiring during Plan 04 dev (regression guard)**: if a dev only wires one of the three props (e.g. `muted` but forgets `onMuteToggle`), `showMuteToggle` is still false. SessionControls falls back to the legacy layout — no half-broken toggle ships. Test 8 (`PARTIAL-PROPS GUARD`) asserts this explicitly with `<SessionControls status="idle" onStart={vi.fn()} onEnd={vi.fn()} muted={true} />` (only `muted` defined): the MuteToggle is NOT in the DOM, the primary button retains the legacy `mt-6 w-full` className.

The full project suite ran 155/155 green throughout this plan. No Phase 1/2 App test was modified.

## Decisions Made

1. **'all-three-defined' dispatch gate.** Per checker B3. Prevents partial-wiring regressions during multi-plan rollout. Verified by Test 8 (PARTIAL-PROPS GUARD).
2. **MuteToggle class string copies SettingsStepper's icon-button baseline verbatim.** Only two changes: `size-12` → `size-11` (Phase 2 D-17 floor) and dropped `text-2xl leading-none` (icon, not glyph). Reuses the Phase 2 focus-ring + reduced-motion + disabled-opacity tokens without re-litigation.
3. **Inline SVG icons as bottom-of-file sub-components.** No asset bundle, no icon-font dependency, no extra HTTP request, no naming collision with future Lucide/Heroicons addition.
4. **`SpeakerSlashIcon` uses an X-style slash (two `<line>` elements).** Crossed lines `(22,9)→(16,15)` and `(16,9)→(22,15)` overlay where the speaker waves were. More legible at 20×20 px than a single diagonal slash, and Test 12 can assert `querySelectorAll('svg line').length === 2`.
5. **BreathingShapeLeadIn does NOT call `usePrefersReducedMotion`.** The lead-in is constant by design — orb locked at MID_SCALE for everyone, regardless of OS preference. No animation to suppress.
6. **Lead-in priority: lead-in always wins over frame.** When both `frame` and `leadInDigit` are present, the user sees the lead-in. The frame may already be advancing in App.tsx (Plan 04 will start session math at the lead-in begin so audio + visual timelines stay aligned), but the user shouldn't see In/Out until the countdown ends. Verified by Test 6.
7. **BreathingShapeLeadIn renders only `.orb-layer--in` (no Out crossfade).** Neutral pre-state — the orb feels like a still pool of water awaiting the first breath.
8. **Lead-in digit class is `text-7xl sm:text-8xl`.** One step larger than the In/Out label's `text-5xl sm:text-6xl` so the countdown reads as dominant in the orb without crowding it.
9. **Lead-in root has NO `data-phase` / `data-progress` attributes.** Those are debug/test selectors for the active phase loop; the lead-in is pre-state and should not be confused with a phase. Test 8 asserts their absence.
10. **Sample SessionFrame in BreathingShape.test.tsx includes `remainingMs: null`.** The plan's skeleton fixture omitted `remainingMs`, but the SessionFrame contract (src/domain/sessionMath.ts) requires it. Without it, TypeScript would reject the cast — Rule 3 (blocking issue) auto-fix per the deviation rules.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan-supplied SessionFrame fixture in BreathingShape.test.tsx omitted the `remainingMs` field.**

- **Found during:** Task 3 RED-gate test authoring.
- **Issue:** The plan's `<action>` block for Task 3 (lines 626-633) provided a `sampleFrame: SessionFrame = { phase, phaseLabel, phaseProgress, cycleIndex, elapsedMs, isComplete }` literal — but the `SessionFrame` interface in `src/domain/sessionMath.ts` requires a `remainingMs: number | null` field. Casting the literal to `SessionFrame` would fail TypeScript strict checks at the test boundary.
- **Fix:** Added `remainingMs: null` to the fixture (open-ended-session value; `BreathingShapeBody` only reads phase/phaseLabel/phaseProgress so the value is inert).
- **Files modified:** `src/components/BreathingShape.test.tsx` (test fixture only)
- **Commit:** Folded into the Task 3 RED commit (`e7eaa0b`). The fix is at test-authoring time, not source code, so it does not deserve a separate refactor commit.

### Plan-vs-Reality Notes (informational, not deviations from intent)

- **Acceptance criterion `grep -c "data-phase" src/components/BreathingShape.tsx == 1` reports 2.** Both matches are in `BreathingShape.tsx`: line 59 (the JSX attribute on Body — the load-bearing one) and line 123 (a doc-comment on LeadIn explaining "No data-phase / data-progress on the root"). The plan's `<verification>` intent was "JSX attribute appears only on Body, NOT on LeadIn" — semantically met (the only JSX attribute is on Body, line 59). The doc-comment on line 123 documents the contract for the next reader and removing it would degrade the file's self-documentation. Same pattern applies to `data-progress` (count 2 = JSX line 60 + comment line 123) and `text-7xl` (count 2 = JSX line 166 + comment line 164).
- **Acceptance criterion `grep -c "flex-1" src/components/SessionControls.tsx == 1` reports 3.** Two matches are doc-comments (lines 50, 53) explaining the layout transformation; one is the actual className on line 58. Same plan-vs-reality pattern as above: semantic intent met (one className occurrence), comment hits document the contract. The criterion `grep -c "w-full" == 1` reports 2 for the same reason (line 41 actual className, line 52 doc-comment).
- **No source-code defects discovered.** Each task's RED gate failed exactly as predicted by its `<behavior>` block; each task's GREEN gate passed on the first implementation attempt. No Rule 1 / Rule 2 / Rule 4 deviations.
- **Transient single-test-flake observed once during initial post-Task-2 full-suite run** (145/146, 13/14 files). Three subsequent reruns of the same `npm run test:run` command immediately after were 146/146 and 155/155. Could not reproduce or identify the failing test from the output (no failure detail surfaced in the truncated tail). Likely an existing fake-timer flake unrelated to this plan's changes — none of this plan's 30 new tests use fake timers, fetch mocks, or async race conditions. Logged here for visibility but not blocking; if the same flake recurs in Plan 04 the failure message can be captured for triage.

## Authentication Gates

None — Phase 3 components are pure presentational layers with no network/auth/PII surface.

## Known Stubs

None — every component renders real DOM with real props, every test has real assertions against the rendered output. No placeholder text, no `TODO` markers, no commented-out branches, no "coming soon" copy. The MuteToggle's "Audio unavailable in this browser" label is the actual D-10 disabled-state copy, not a placeholder.

## Threat Flags

None — files created/modified (`MuteToggle.tsx` + tests, `SessionControls.tsx` + tests, `BreathingShape.tsx` + tests) introduce no new trust boundaries, no network surface, no auth/file/schema changes. The plan's `<threat_model>` mitigations remain in place:

- **T-03-07 (Spoofing user intent — MuteToggle disabled bypass):** accepted per the plan. Disabled attribute is browser-enforced; userEvent.click respects it (Test 7 verifies). No security boundary involved.
- **T-03-08 (Tampering — leadInDigit prop value out of range):** mitigated by TypeScript narrowing to `3 | 2 | 1 | null`. React text rendering escapes any runtime out-of-range value; no XSS risk. No runtime guard added (TypeScript is the gate).
- **T-03-14 (Tampering — partial-prop wiring):** mitigated by the `showMuteToggle = all-three-defined` gate. Verified by Test 8 (`PARTIAL-PROPS GUARD`). Prevents a half-broken toggle from shipping if a dev wires only one prop during a Plan 04 refactor.

## TDD Gate Compliance

| Task | RED commit | GREEN commit | REFACTOR commit |
| ---- | ---------- | ------------ | --------------- |
| 1: MuteToggle | `0e1ce88` test(03-03): add failing tests for MuteToggle component | `bc5ee37` feat(03-03): implement MuteToggle component | none needed (clean on first pass) |
| 2: SessionControls extension | `f42f5ad` test(03-03): add failing tests for SessionControls inline-mute layout | `a07816b` feat(03-03): extend SessionControls for inline mute toggle (D-05) | none needed |
| 3: BreathingShape lead-in | `e7eaa0b` test(03-03): add failing tests for BreathingShape lead-in dispatch | `68ecc1d` feat(03-03): extend BreathingShape with leadInDigit dispatch (D-14) | none needed |

All three required gates (test-then-feat ordering on each task) are present and the test commit precedes the feat commit in each pair. The RED gate's failing-test count was correct for each task (12/12 fail for Task 1 because the module doesn't exist; 5/9 fail for Task 2 because the legacy-branch tests pass against the existing implementation; 7/9 fail for Task 3 because the existing-behavior tests pass against today's BreathingShape). No "test passes unexpectedly during RED" red flag.

## Self-Check: PASSED

**Files claimed:**
- `src/components/MuteToggle.tsx` — FOUND (88 lines)
- `src/components/MuteToggle.test.tsx` — FOUND (108 lines, 12 it() blocks)
- `src/components/SessionControls.tsx` — FOUND (modified, 21 → 70 lines)
- `src/components/SessionControls.test.tsx` — FOUND (147 lines, 9 it() blocks)
- `src/components/BreathingShape.tsx` — FOUND (modified, 99 → 171 lines)
- `src/components/BreathingShape.test.tsx` — FOUND (80 lines, 9 it() blocks)

**Commits claimed (verified via `git log --oneline 0e1ce88^..HEAD`):**
- `0e1ce88` — FOUND `test(03-03): add failing tests for MuteToggle component`
- `bc5ee37` — FOUND `feat(03-03): implement MuteToggle component`
- `f42f5ad` — FOUND `test(03-03): add failing tests for SessionControls inline-mute layout`
- `a07816b` — FOUND `feat(03-03): extend SessionControls for inline mute toggle (D-05)`
- `e7eaa0b` — FOUND `test(03-03): add failing tests for BreathingShape lead-in dispatch`
- `68ecc1d` — FOUND `feat(03-03): extend BreathingShape with leadInDigit dispatch (D-14)`

**Acceptance gates verified:**

MuteToggle.tsx grep gates:
- `export function MuteToggle` = 1 ✓
- `export interface MuteToggleProps` = 1 ✓
- `aria-pressed={muted}` = 1 ✓
- `Mute audio cues` = 1 ✓
- `Unmute audio cues` = 1 ✓
- `Audio unavailable in this browser` = 1 ✓
- `disabled={!audioAvailable}` = 1 ✓
- `size-11|min-h-11` ≥ 1 → got 2 ✓
- `focus-visible:ring-breathing-accent` = 1 ✓
- `motion-reduce:transition-none` = 1 ✓
- `disabled:opacity-45` = 1 ✓
- `<svg` ≥ 2 → got 2 ✓
- `function SpeakerIcon|SpeakerSlashIcon` ≥ 2 → got 2 ✓

MuteToggle.test.tsx: 12 it() blocks ✓

SessionControls.tsx grep gates:
- `MuteToggle` ≥ 2 → got 9 (1 import + 1 JSX + 7 in comments) ✓
- `muted?: boolean` ≥ 1 → got 1 ✓
- `audioAvailable?: boolean` ≥ 1 → got 1 ✓
- `onMuteToggle` ≥ 2 → got 4 (interface + JSX + 2 destructure) ✓
- `'Start session'` ≥ 1 → got 2 (one per branch — verbatim, see Locked Strings table above) ✓
- `'End session'` ≥ 1 → got 2 ✓
- `flex items-center gap-3` = 1 ✓
- `flex-1` = 1 (className) — grep counts 3 because of 2 doc-comment mentions; semantic intent met. See Plan-vs-Reality Notes.
- `showMuteToggle` ≥ 1 → got 2 (declaration + use) ✓
- `w-full` = 1 (className on legacy branch) — grep counts 2 because of 1 doc-comment mention; semantic intent met.

SessionControls.test.tsx: 9 it() blocks ✓

BreathingShape.tsx grep gates:
- `leadInDigit` ≥ 4 → got 6 (interface + 2 wrapper dispatch + 1 sub-component prop type + 2 JSX prop) ✓
- `BreathingShapeLeadIn` ≥ 2 → got 3 (function declaration + wrapper invocation + comment) ✓
- `Lead-in:` ≥ 1 → got 2 (aria-label + doc-comment) ✓
- `MID_SCALE` ≥ 3 → got 6 (declaration + 2 existing Body usages + 1 new LeadIn transform + 2 doc-comments) ✓
- `text-7xl` = 1 (className) — grep counts 2 because of 1 doc-comment mention; semantic intent met.
- `data-phase` = 1 (JSX) — grep counts 2 because of 1 doc-comment mention; semantic intent met.
- `data-progress` = 1 (JSX) — grep counts 2 because of 1 doc-comment mention; semantic intent met.

BreathingShape.test.tsx: 9 it() blocks ✓

**Verification gates verified:**
- `npm run test:run -- src/components/MuteToggle.test.tsx` exits 0 with 12/12 pass.
- `npm run test:run -- src/components/SessionControls.test.tsx src/app/App.session.test.tsx src/app/App.dialog.test.tsx` exits 0 with 44/44 pass (Phase 1/2 App tests + new SessionControls tests).
- `npm run test:run -- src/components/BreathingShape` exits 0 with 9/9 pass.
- `npm run test:run -- src/components/MuteToggle src/components/SessionControls src/components/BreathingShape` exits 0 with 30/30 pass.
- `npm run test:run` exits 0 with 155/155 pass in 15 test files.
- Lint clean on all 6 changed files (`npx eslint` exits 0).

## Next Steps for Plan 04

The three presentational layers are stable. Plan 04 (App.tsx wiring) will:

1. `import { useAudioCues } from '../hooks/useAudioCues'` and call it at the top of App: `const audio = useAudioCues()`.
2. Wire SessionControls' three new props: `<SessionControls status onStart={handleStart} onEnd={handleEnd} muted={audio.muted} audioAvailable={audio.audioAvailable} onMuteToggle={() => audio.setMuted(!audio.muted)} />`. The dispatch gate flips to the inline-mute layout once these props become defined.
3. Drive the lead-in: in `handleStart`, call `audio.start(plan)` (returns `firstInCueTime` for dual-clock alignment), set `leadInDigit` state to 3, schedule setState(2) at +1 s, setState(1) at +2 s, setState(null) + start the session math at +3 s. Pass `leadInDigit` through to `<BreathingShape frame={...} leadInDigit={leadInDigit} />`.
4. The `audio.audioAvailable === false` path (D-10 — Web Audio Context construction failed) will display a small "audio unavailable, visuals only" badge per Plan 04's UI brief; the MuteToggle is already configured to render disabled in that state.
5. App.tsx tests in `App.session.test.tsx` and `App.dialog.test.tsx` will need updates to assert the inline-mute layout AND the lead-in countdown (currently they assert the Phase 2 immediate-In behavior). The Phase 1/2 ASSERTIONS about the legacy single-button layout SHOULD start failing once Plan 04 wires the audio props — at that point the SessionControls dispatch gate flips and the legacy branch is no longer reachable from App. Plan 04 will need to update those tests as part of its acceptance.

No further changes required to MuteToggle, the inline-mute branch of SessionControls, or BreathingShapeLeadIn for Plan 04. The contracts shipped here are the ones App.tsx will consume.
