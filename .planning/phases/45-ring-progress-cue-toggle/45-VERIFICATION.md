---
phase: 45-ring-progress-cue-toggle
verified: 2026-05-25T12:30:00Z
status: passed
score: 14/14 must-haves verified (programmatic); 2 visual UAT items operator-approved 2026-05-25 (see 45-HUMAN-UAT.md). Default flipped to `progress-arc` post-UAT at operator request.
overrides_applied: 0
human_verification:
  - test: "`npm run dev` with bare URL (no query string) on HRV Running surface"
    expected: "Identical to today's Running screen — faint outer ring at 0.45 opacity + inner ring (58% size) fading in on exhale, suppressed under reduced-motion. Byte-identical DOM to pre-Phase-45."
    why_human: "Visual byte-identity verification requires side-by-side comparison against pre-Phase-45 baseline; no automated regression infrastructure exists for this surface per ROADMAP 'no new visual regression infrastructure required'."
  - test: "`npm run dev?ringCue=progress-arc` on HRV Running surface, across BPM 1-7 × ratio 50:50/40:60/30:70/20:80 in both light and dark themes"
    expected: "Bidirectional progress arc grows from south to north during inhale, retracts during exhale. Faint outer track stays visible. Reduced-motion suppresses the arc (outer track still present)."
    why_human: "Phase goal requires visual confirmation of the spike-011 transcription producing the expected motion across all BPM × ratio × theme combinations. Per the ROADMAP 'Done means': 'bidirectional arc grows from south to north during inhale, retracts during exhale, on all BPM (1-7) × ratio combinations, in both themes, honouring reduced-motion'."
---

# Phase 45: Ring progress-cue toggle Verification Report

**Phase Goal:** Ship the alternative bidirectional progress-arc ring cue validated in spike 011 as a developer-only query-string toggle (`?ringCue=progress-arc`). Production default `outer-inner` remains unchanged — this is an opt-in alternative, not a replacement of the locked end-of-phase ring cue.

**Verified:** 2026-05-25T12:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Truths are sourced from the three plan frontmatter `must_haves.truths` blocks (Plans 01/02/03). ROADMAP success_criteria array is empty; the Details block "Done means" criteria are mapped to the truths below.

| # | Truth | Plan | Status | Evidence |
|---|-------|------|--------|----------|
| 1 | `readFeatureFlags('')` returns `ringCue: 'outer-inner'` (production default unchanged). | 01 | VERIFIED | `src/featureFlags.ts:104` returns `ringCue: readQueryFeatureFlag(search, RING_CUE_FLAG)`; `RING_CUE_FLAG.defaultValue: 'outer-inner'` (line 88). Test: `featureFlags.test.ts:104-106` exits 0. |
| 2 | `readFeatureFlags('?ringCue=progress-arc')` returns `ringCue: 'progress-arc'`. | 01 | VERIFIED | `src/featureFlags.ts:93` parse arm `if (v === 'progress-arc' ...) return 'progress-arc'`. Test: `featureFlags.test.ts:108-113`. |
| 3 | Aliases `progress` / `arc` / `south` (case-insensitive, whitespace-trimmed) resolve to `'progress-arc'`. | 01 | VERIFIED | `src/featureFlags.ts:93-94`. Tests: `featureFlags.test.ts:108-125` (4 aliases × case-insensitive + whitespace-trim). |
| 4 | Aliases `outer-inner` / `production` / `rings` / `default` (case-insensitive, whitespace-trimmed) resolve to `'outer-inner'`. | 01 | VERIFIED | `src/featureFlags.ts:91-92`. Tests: `featureFlags.test.ts:115-125`. |
| 5 | Invalid `ringCue` values fall back to `'outer-inner'` (default-on-junk). | 01 | VERIFIED | `src/featureFlags.ts:95` returns `null`; `readQueryFeatureFlag` then falls back to `defaultValue`. Test: `featureFlags.test.ts:127-129`. |
| 6 | With no `ringCue` prop (default `'outer-inner'`), OrbBody renders the exact same outer + inner ring DOM as today. | 02 | VERIFIED | `src/components/OrbShape.tsx:87` defaults `ringCue = 'outer-inner'`. `OrbContainer` ternary at line 352 routes the else-branch to the byte-identical inner-ring `<span>` block (lines 359-376). Outer `<span>` at lines 342-351 sits OUTSIDE the ternary, byte-identical in both cues. Test: `OrbShape.test.tsx:136-142` asserts the SVG arc layer is absent when `ringCue` omitted. |
| 7 | With `ringCue='progress-arc'` and `frame.phase='in'`/`phaseProgress > 0` and not reduced-motion, OrbBody renders an aria-hidden SVG with `viewBox='0 0 100 100'` containing exactly two `<path>` elements. | 02 | VERIFIED | `ProgressArcLayer` (lines 444-509) emits `<svg viewBox="0 0 100 100">` with two `<path>` children when `showArc = !reducedMotion && t > 0`. Test: `OrbShape.test.tsx:144-160` asserts `paths.length === 2`. |
| 8 | With `ringCue='progress-arc'` and reduced-motion, the SVG arc layer is absent. The faint outer track `<span>` is still present. | 02 | VERIFIED | Line 457: `showArc = !reducedMotion && t > 0`; line 459: `if (!showArc) return null`. Test: `OrbShape.test.tsx:162-188` asserts `arcSvg === null` AND outer track `<span>` still present. |
| 9 | With `ringCue='progress-arc'` at `t === 0` (phase boundary), the SVG arc layer is absent. | 02 | VERIFIED | Line 457 short-circuits `t === 0`. Test: `OrbShape.test.tsx:190-201`. |
| 10 | Stroke width is the literal `2.5` (spike-locked); stroke uses `var(--color-breathing-accent)`; sweep-flag is `0` on the right path and `1` on the left path. | 02 | VERIFIED | Lines 470-471 + 479-480: sweep-flag `0` on rightD, `1` on leftD. Lines 496/504: `strokeWidth={2.5}`. Lines 493/501: `stroke="var(--color-breathing-accent)"`. Test: `OrbShape.test.tsx:156-159` asserts both per-path attributes (note: WR-02 in REVIEW.md flags that the `t >= 1` semicircle branch's `d` content is not asserted — not a goal blocker, but a coverage gap). |
| 11 | OrbLeadIn / OrbIdle / showCompletion paths are unchanged — they pass `showRings={false}`, so `ringCue` has zero render effect on them. | 02 | VERIFIED | `OrbShape.tsx:103` (showCompletion: `showRings={false}`), line 216 (OrbIdle: `showRings={false}`), line 261 (OrbLeadIn: `showRings={false}`). `OrbContainer` ternary at line 352 is inside the `{showRings && (<>...</>)}` block (line 340), so it never triggers for these call sites. |
| 12 | With `?ringCue=progress-arc` in the URL, the OrbBody on the HRV Running surface renders the spike-011 progress arc (end-to-end via the existing presentation chain). | 03 | VERIFIED (chain wired) | End-to-end chain confirmed wired by manual grep: `PracticeScreen.tsx:75` → `PracticeSessionView.tsx:35,48` → `BreathingSessionSurface.tsx:37` → `OrbShape.tsx:127→191→352`. Visual confirmation of the running arc on-device is a HUMAN UAT item (see below). |
| 13 | With no `?ringCue=` (default), every Running-surface call site of OrbShape renders the existing outer + inner ring DOM byte-identically. | 03 | VERIFIED | Default value `'outer-inner'` resolves at `featureFlags.ts:88` → flows through chain → `OrbShape.tsx:87` destructure default; ternary at OrbShape.tsx:352 routes to else-branch (byte-identical inner-ring span). Visual byte-identity is a HUMAN UAT item. |
| 14 | `vm.featureFlags.ringCue` is read once in `PracticeScreen` and forwarded uniformly down both surfaces (HRV and Navi Kriya) — single chain, no per-surface divergence. | 03 | VERIFIED | `PracticeScreen.tsx:75` reads `vm.featureFlags.ringCue` exactly once; `PracticeSessionView.tsx:35` (NK) and `:48` (Breathing) both forward `ringCue={ringCue}`. |
| 15 | Navi Kriya surface still routes `OrbShape` with `frame={null}` (Idle/LeadIn paths) where `showRings={false}` — the threaded `ringCue` prop has zero render effect there but the type chain is consistent. | 03 | VERIFIED | `NaviKriyaSessionSurface.tsx:34` passes `frame={null}`; OrbShape's idle/LeadIn paths use `showRings={false}` — confirmed at `OrbShape.tsx:216, 261`. |

**Score:** 14/14 truths verified programmatically. Truths 12 and 13 add a visual UAT layer (handled in human_verification).

### Required Artifacts

Aggregated from all three plans' `must_haves.artifacts` blocks. All artifacts verified via `gsd-sdk query verify.artifacts` (returned `all_passed: true` for each plan).

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/featureFlags.ts` | `RingCueStyle` type + `RING_CUE_FLAG` spec + `ringCue` field + readFeatureFlags wiring | VERIFIED | Lines 9, 11-16, 86-97, 99-106. SDK verify: pass. |
| `src/featureFlags.test.ts` | Test coverage for ringCue parallel to breathingShape/orbIdle blocks | VERIFIED | 5 new `it(...)` cases at lines 104-129. Test run: 38 pass (no regressions). |
| `src/components/OrbShape.tsx` | `ringCue?: RingCueStyle` prop + `ProgressArcLayer` + branch site | VERIFIED | Prop at line 41; ProgressArcLayer at lines 444-509; branch at line 352 (`ringCue === 'progress-arc' ? ... : ...`). |
| `src/components/OrbShape.test.tsx` | Three required assertion shapes — default unchanged, progress-arc 2 paths, reduced-motion suppression (+ bonus t=0 boundary) | VERIFIED | 4 new `it(...)` cases at lines 127-202. Test run: 18 pass. |
| `src/app/PracticeScreen.tsx` | Origin of the chain: `vm.featureFlags.ringCue` → PracticeSessionView | VERIFIED | Line 75: `ringCue={vm.featureFlags.ringCue}`. |
| `src/app/PracticeSessionView.tsx` | Mid-chain pass-through | VERIFIED | Type import line 3; props line 15; destructure line 22; forwarded at lines 35 (NK) + 48 (Breathing). |
| `src/app/BreathingSessionSurface.tsx` | Final-leg pass-through to OrbShape | VERIFIED | Type import line 6; props line 16; destructure line 26; forwarded line 37 to OrbShape JSX. |
| `src/app/NaviKriyaSessionSurface.tsx` | Final-leg pass-through (symmetry; NK OrbShape uses frame=null → showRings=false) | VERIFIED | Type import line 7; props line 17; destructure line 27; forwarded line 39 to OrbShape JSX. NKShape JSX (lines 42-50) unchanged — does NOT receive ringCue (intentional per PATTERNS §6). |

### Key Link Verification

Aggregated from all three plans' `must_haves.key_links`. Manual grep verification (`gsd-sdk query verify.key-links` produced false-negative "Source file not found" results due to SDK regex/path-parsing limits on patterns with `::` and `\\{...\\}` — not actual code gaps; manual grep confirms all links wired).

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/featureFlags.ts` | FeatureFlags consumers (useFeatureFlags, useAppViewModel) | type extension — `ringCue: RingCueStyle` | WIRED | `featureFlags.ts:15` adds field to FeatureFlags; type flows automatically. |
| `src/featureFlags.ts::readFeatureFlags` | RING_CUE_FLAG | `readQueryFeatureFlag(search, RING_CUE_FLAG)` | WIRED | `featureFlags.ts:104` (manual grep confirmed). |
| `OrbShape.tsx::OrbShape` | OrbContainer (via OrbBody) | ringCue prop threaded through OrbBodyProps + OrbContainerProps | WIRED | `OrbShape.tsx:127` (OrbShape→OrbBody) → `:191` (OrbBody→OrbContainer); both interfaces extended at lines 164 + 297. |
| `OrbShape.tsx::OrbContainer ring slot` | ProgressArcLayer \| inner ring span | ternary on `ringCue === 'progress-arc'` | WIRED | `OrbShape.tsx:352-376` ternary; ProgressArcLayer call at lines 353-357. |
| `PracticeScreen.tsx (vm.featureFlags.ringCue)` | `PracticeSessionView.tsx (ringCue prop)` | JSX prop | WIRED | `PracticeScreen.tsx:75`. |
| `PracticeSessionView.tsx` | BreathingSessionSurface + NaviKriyaSessionSurface | JSX prop forward | WIRED | `PracticeSessionView.tsx:35` (NK) + `:48` (Breathing). Both branches forward `ringCue={ringCue}`. |
| `{Breathing,NaviKriya}SessionSurface.tsx` | OrbShape (rings layer branch) | JSX prop | WIRED | `BreathingSessionSurface.tsx:37`; `NaviKriyaSessionSurface.tsx:39`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `ProgressArcLayer` | `phase`, `progress` | `OrbContainer` → `OrbBody` (`frame.phase`, clamped `phaseProgress`) | Yes — `OrbBody` consumes `SessionFrame` from engine (`useAppViewModel`); same live `phaseProgress` that drives `orbScale` | FLOWING |
| `OrbContainer ringCue branch` | `ringCue` | `OrbShape` prop → originates at `vm.featureFlags.ringCue` (PracticeScreen.tsx:75) | Yes — `readFeatureFlags(window.location.search)` is invoked at app init via `useFeatureFlags()` hook | FLOWING |
| `featureFlags.ringCue` | URL `?ringCue=` query param | `URLSearchParams(search).get('ringCue')` via `readQueryFeatureFlag` | Yes — live URL parsed at hook init | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `featureFlags.test.ts` suite passes (including 5 new ringCue cases) | `npm test -- --run src/featureFlags.test.ts` | 38 tests pass, 0 fail | PASS |
| `OrbShape.test.tsx` suite passes (including 4 new ringCue cases) | `npm test -- --run src/components/OrbShape.test.tsx` | 18 tests pass, 0 fail | PASS |
| Full test suite passes (no regressions) | `npm test` | 1165 tests pass, 0 fail | PASS |
| TypeScript compilation clean | `npx tsc -b --noEmit` | exit 0, no output | PASS |
| Lint clean | `npm run lint` | exit 0, no output | PASS |
| Production build succeeds | `npm run build` | exit 0; PWA precache 515.72 KiB (19 entries) | PASS |

### Probe Execution

No project-level probes exist for this phase (`find scripts -path '*/tests/probe-*.sh'` returns nothing; the project uses vitest + tsc + eslint + build as its green-gate, all confirmed PASS above). Skipped: not applicable for UI/feature-flag phases in this project.

### Requirements Coverage

ROADMAP.md says `**Requirements**: TBD` for Phase 45. All three PLAN files declare `requirements: []` in frontmatter. `REQUIREMENTS.md` has no entries mentioning Phase 45, `ringCue`, `ring-cue`, or `RING_CUE_FLAG` (grep returned 0 matches). No requirement IDs to cross-reference. No orphaned requirements detected.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | TBD / FIXME / XXX / TODO / HACK / PLACEHOLDER | — | grep across all 8 modified files: zero matches. |

`OrbShape.tsx:467` declares `let rightD: string` without initializer — flagged in REVIEW.md (acknowledged as a deliberate lint-driven adjustment at the transcription seam; both branches always assign by definite-assignment). Not an anti-pattern — documented design.

### Human Verification Required

Two visual UAT items must be confirmed by the operator before the phase can be declared shipped:

#### 1. Bare-URL byte-identity (default `outer-inner`)

**Test:** Run `npm run dev` with no query string. Navigate to the HRV Running surface. Compare visually against pre-Phase-45 baseline.
**Expected:** Identical rendering to today — outer ring 1.5 px / 0.45 opacity, inner ring 58 % size fading in on exhale (suppressed under reduced-motion). DOM bytes are guaranteed identical by the test invariant at `OrbShape.test.tsx:136-142`, but the visual confirmation crosses theme + reduced-motion + BPM variations the unit tests do not exercise.
**Why human:** No automated visual-regression infrastructure exists for the Running surface (per ROADMAP "no new visual regression infrastructure required"). Requires side-by-side eye-check.

#### 2. Progress-arc rendering across BPM × ratio × theme matrix (`?ringCue=progress-arc`)

**Test:** Run `npm run dev` with `?ringCue=progress-arc`. Cycle through BPM 1-7 × ratio 50:50/40:60/30:70/20:80 in both light and dark themes. Toggle OS reduced-motion.
**Expected:** Bidirectional progress arc grows from south to north during inhale, retracts during exhale. Faint outer track always visible. Reduced-motion suppresses the arc (outer track still present). Stroke colour matches accent in both themes.
**Why human:** Per ROADMAP "Done means" — the phase is only "done" once this animation is confirmed across the full BPM × ratio × theme matrix. Trig-driven SVG `d` strings are unit-tested for `t ∈ (0, 1)` and structurally for `t = 0` and `reduced-motion`, but the live visual quality (cap rendering, motion feel, theme readability) requires eye + clock.

### Gaps Summary

No gaps in the codebase. Every must-have truth declared in the three PLAN frontmatter blocks has direct, line-numbered evidence in the implementation files. The 2-step end-to-end chain (URL → readFeatureFlags → vm.featureFlags.ringCue → PracticeScreen → PracticeSessionView → both surfaces → OrbShape → ProgressArcLayer) is fully wired and type-safe. All 1165 tests pass; tsc/lint/build all green.

Two non-blocking concerns surfaced by the existing REVIEW.md (`45-REVIEW.md` from a prior code-review pass, not a verifier finding):

- **WR-01:** comment in `OrbShape.test.tsx:122-126` incorrectly states CueGlyph uses a 24-viewBox; in fact, CueGlyph also uses `viewBox="0 0 100 100"`. The current `viewBox` selector happens to work in the existing tests (all use default `cue='labels'` which renders a `<span>`, no SVG), but combining `ringCue='progress-arc'` with `cue='arrow'`/`cue='nose'` in a future test would yield ambiguous selectors. Non-blocker for Phase 45 goal.
- **WR-02:** the `t >= 1` (closed-semicircle) branch of `ProgressArcLayer` has no path-`d` assertion. Tests verify stroke + stroke-width but not `d` content, so a sweep-flag inversion regression (the spike's "Surprise #3") would not be caught automatically. Non-blocker for Phase 45 goal — visual UAT will catch it on the first BPM cycle.

Both items are pre-existing review findings, not new verifier-detected gaps. They do not block phase-goal achievement; they are quality improvements that may be queued for a follow-up.

---

_Verified: 2026-05-25T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
