---
phase: 34-stretch-as-a-distinct-practice
verified: 2026-05-18T17:00:00Z
status: gaps_found
score: 5/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "CR-01 (original): computeStretchTotalMs now derives from the snapped segment table (buildStretchSegments), not the raw minute sum — displayedDuration agrees with real session end."
    - "WR-01 (original): LearnDialog videos heading now tracks practiceContentKey (the resolved key), not raw activePractice — Stretch practice shows resonant content under the resonant heading."
    - "WR-03 (original): startStretchSession now accepts selectedSettings as a second parameter and stores it (not the synthetic lead-in) in selectedSettings — endSession returns the resonant config, not stretch-derived synthetic values."
  gaps_remaining:
    - "REVIEW CR-01 (new): coerceStretchSettings missing cross-field invariant targetBpm < initialBpm — a persisted or migrated slice with targetBpm >= initialBpm reaches buildStretchSegments and silently produces an inverted ramp (acceleration instead of deceleration)."
  regressions: []
gaps:
  - truth: "Stretch is its own practice — its own session settings and its own stats — not a mode toggle inside HRV (STRETCH-03/04)"
    status: failed
    reason: "REVIEW CR-01 (new): coerceStretchSettings validates initialBpm and targetBpm independently using isValidBpm (full BPM_OPTIONS set including 1) but never enforces the cross-field invariant targetBpm < initialBpm that validateStretchSettings mandates. A localStorage-tampered or migration-seeded slice with targetBpm >= initialBpm passes the coercer unchanged. It then flows directly to buildStretchSegments via App.tsx:147 → useSessionEngine → startStretchSession, where bpmSpan = initialBpm − targetBpm <= 0 collapses numSteps to 1. The engine produces a single-step 'ramp' running at initialBpm then a cool-down at the higher targetBpm — a silently inverted ramp the user never configured. validateStretchSettings exists (settings.ts:208) and rejects this state, but is dead code on the stretch start path (no call site in App.tsx, useSessionEngine.ts, or sessionController.ts). Additionally, a coerced initialBpm of 1 (valid per full BPM_OPTIONS) yields targetBpmOptions = [] in SettingsForm.tsx:82, causing updateInitialBpm to call onStretchSettingsChange with targetBpm: undefined."
    artifacts:
      - path: "src/storage/practices.ts"
        issue: "coerceStretchSettings (lines 89-99) validates initialBpm and targetBpm independently against full BPM_OPTIONS but does not check targetBpm < initialBpm. A coerced slice with equal or inverted BPMs is returned structurally valid."
      - path: "src/domain/stretchRamp.ts"
        issue: "buildStretchSegments (lines 76-137) does not throw when targetBpm >= initialBpm. Math.max(1, ...) guard produces a 1-step 'ramp' with a silently inverted cool-down — structurally valid segment table, logically wrong session."
      - path: "src/components/SettingsForm.tsx"
        issue: "targetBpmOptions (line 82) filters BPM_OPTIONS for v < stretchSettings.initialBpm. If initialBpm is 1 (valid per coercer, which uses full BPM_OPTIONS not STRETCH_INITIAL_BPM_OPTIONS), the result is an empty array and updateInitialBpm sets targetBpm: undefined."
    missing:
      - "Add cross-field invariant to coerceStretchSettings: after computing initialBpm and targetBpm independently, if targetBpm >= initialBpm, reset both to DEFAULT_STRETCH_SETTINGS values. Additionally, coerce initialBpm against STRETCH_INITIAL_BPM_OPTIONS (not full BPM_OPTIONS) to eliminate the empty-targetBpmOptions path."
      - "Add a defensive guard in buildStretchSegments: if !(targetBpm < initialBpm), throw new RangeError('targetBpm must be strictly below initialBpm') — matching the existing rampDurationMinutes guard at line 82."
      - "Add regression tests for coerceStretchSettings: (a) persisted targetBpm >= initialBpm falls back to defaults; (b) persisted initialBpm = 1 falls back to default."
human_verification:
  - test: "Open the app at 320px viewport width (EN) and observe the practice switcher"
    expected: "All three pills (HRV, Stretch, Navi) are fully legible with no text truncation, each pill is at least 44px tall, layout does not overflow the viewport"
    why_human: "No automated pixel-accuracy viewport test — visual judgment required. Spike 007 pre-validated the layout; this confirms it in the live build."
  - test: "Switch language to PT-BR, open at 320px viewport width, observe switcher"
    expected: "'Alongar' fits the pill without truncation; all three pills remain legible and tappable"
    why_human: "Locale-specific visual check."
  - test: "Build with VITE_SWITCHER_TREATMENT=B npx vite build, inspect the switcher"
    expected: "Each pill shows an inline SVG glyph (circle for HRV, descending diagonal for Stretch, three dots for Navi). Glyphs are visually distinct, no hardcoded colors, glyphs inherit theme tokens via currentColor."
    why_human: "Visual quality judgment of SVG motifs."
---

# Phase 34: Stretch as a Distinct Practice — Verification Report

**Phase Goal:** Promote HRV's Stretch mode to a top-level practice — the switcher carries three (HRV · Stretch · Navi), each with its own settings and stats, returning users' data migrates cleanly, and the 3-practice switcher ships both label treatments behind a developer-only toggle.
**Verified:** 2026-05-18T17:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plan 34-06 (CR-01/WR-01/WR-03 from original verification). New blocking gap: REVIEW CR-01 (coerceStretchSettings missing cross-field BPM invariant).

## Re-verification Summary

### Gaps from Previous Verification

| Gap | Resolution | Evidence |
|-----|-----------|----------|
| CR-01 (original): computeStretchTotalMs raw minute sum | CLOSED | `stretchRamp.ts:230-234` derives from `segments[segments.length-1]!.endMs`; commit fce4f24; 2 regression tests |
| WR-01 (original): LearnDialog videos heading used raw activePractice | CLOSED | `LearnDialog.tsx:95` uses `practiceContentKey === 'resonant'`; commit 2d537d6; 3 regression tests |
| WR-03 (original): stretch session clobbered resonant selectedSettings | CLOSED | `sessionController.ts:67-92` accepts `selectedSettings` as 2nd param, passes through; commit 89140f5; 4 regression tests |

### New Gap Introduced by Fresh Code Review

The code review (34-REVIEW.md) flagged a NEW CR-01 that was present in the Phase 34 codebase all along (pre-dating gap-closure plan 34-06): `coerceStretchSettings` missing the cross-field `targetBpm < initialBpm` invariant. This gap was present at the time of the initial verification but was not detected then. It is blocking.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can switch between HRV, Stretch, and Navi using the top segmented control above the orb (STRETCH-01) | VERIFIED | `PracticeToggle.tsx:24` — `PRACTICE_IDS = ['resonant', 'stretch', 'naviKriya']`; `App.tsx:1082` — `onSwitch={onSwitchPractice}`, `App.tsx:1087` — `stretch: uiStrings.practice.stretchName`. Tests: 3 pills in correct order confirmed by `PracticeToggle.test.tsx:28-41`. |
| 2 | Stretch is its own practice — its own session settings and its own stats — not a mode toggle inside HRV (STRETCH-03/04) | FAILED (BLOCKER) | Settings type split and stats isolation are correct. Session start path (App→useSessionEngine→startStretchSession→buildStretchSegments) is correctly wired. HOWEVER: `coerceStretchSettings` (practices.ts:89-99) validates initialBpm and targetBpm independently but does NOT enforce `targetBpm < initialBpm`. A drifted persisted slice with `targetBpm >= initialBpm` passes coercion and reaches `buildStretchSegments`, which silently produces an inverted ramp (single step at initialBpm, then cool-down at the higher targetBpm). `validateStretchSettings` (settings.ts:208) rejects this state but is dead code on the start path. |
| 3 | A returning user keeps all data: HRV and Navi settings/stats intact, and prior Stretch usage preserved under the new Stretch practice slice (STRETCH-05) | VERIFIED | `storage.ts:108-133` — v2→v3 migration seeds `practices.stretch.settings` from the resonant blob and zeros stretch stats; `practices.resonant` and `practices.naviKriya` are passed through untouched. Migration is lossless and idempotent (5 migration cases in storage.test.ts). Note: REVIEW WR-02 observes the migration comment "carries ramp fields" is now inaccurate for post-Phase-34 builds (the resonant blob no longer has ramp fields), but behavior is correct — coerceStretchSettings falls back to defaults. |
| 4 | The 3-practice switcher stays legible and tappable on mobile down to 320px, in English and PT-BR (STRETCH-02) | VERIFIED (human needed for visual) | Structural: pill classes are `flex-1 rounded-full min-h-[44px]`; container is `flex`; EN label "Stretch" and PT-BR label "Alongar" pre-validated in spike 007. The developer toggle is build-time only via `vite.config.ts define` — NOT present in Settings dialog (confirmed by grep: no match for `TREATMENT` or `VITE_SWITCHER_TREATMENT` in SettingsForm.tsx or App.tsx). |
| 5 | A developer can switch the switcher between the two label treatments via a developer-only toggle NOT in the user Settings dialog (STRETCH-02 second half) | VERIFIED | `vite.config.ts:55-61` — `define.__SWITCHER_TREATMENT__` reads `process.env.VITE_SWITCHER_TREATMENT === 'B' ? 'B' : 'A'`. `PracticeToggle.tsx:11` — `const TREATMENT = __SWITCHER_TREATMENT__`. Treatment B branch at `PracticeToggle.tsx:99` renders `PracticeGlyph`. `.env.example` documents the env var. Zero matches for `TREATMENT` in SettingsForm.tsx (confirmed). |
| 6 | User can read all new Stretch UI copy in both English and native-quality PT-BR (STRETCH-06) | VERIFIED | `strings.ts:352-354` (EN): `stretchName: 'Stretch'`, `stretchHeading: 'Stretch'`, `stretchHeader: 'Stretch practice'`. `strings.ts:537-539` (PT-BR): `stretchName: 'Alongar'`, `stretchHeading: 'Alongar'`, `stretchHeader: 'Prática de Alongar'`. Interface `UiStrings.practice` declares all 3 as `readonly string`. 6 new tests in `strings.test.ts` confirm all values. |

**Score:** 5/6 truths verified (REVIEW CR-01 makes truth 2 a BLOCKER)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/domain/settings.ts` | StretchSettings standalone type, SessionSettings 3-field | VERIFIED | `StretchSettings` exported with `ratio + 5 ramp fields`. `SessionSettings` is `bpm + ratio + durationMinutes` only. |
| `src/domain/stretchRamp.ts` | `buildStretchSegments(StretchSettings)`, `computeStretchTotalMs(StretchSettings)` | VERIFIED (partial) | Both functions correct after gap-closure CR-01 fix. `computeStretchTotalMs` now derives from `segments[segments.length-1]!.endMs`. `buildStretchSegments` does NOT guard `targetBpm < initialBpm` — this is the REVIEW CR-01 issue. |
| `src/domain/sessionController.ts` | `startStretchSession(StretchSettings, SessionSettings, nowMs)` — 3-arg signature after WR-03 fix | VERIFIED | Confirmed: 3-arg signature, `selectedSettings` passes through unchanged, synthetic lead-in in `lockedSettings` only. Commit 89140f5. |
| `src/storage/storage.ts` | `STATE_VERSION=3`, v2→v3 migration | VERIFIED | Line 40: `STATE_VERSION = 3`. Line 108: v2→v3 migration seeds stretch slice losslessly. |
| `src/storage/practices.ts` | `PracticeId` includes `'stretch'`, `coerceStretchSettings`, `saveStretchSettings`, `recordStretchSession` | VERIFIED (partial) | All three functions exported and implemented. However `coerceStretchSettings` is missing the cross-field invariant (REVIEW CR-01 blocker). |
| `src/components/PracticeToggle.tsx` | 3-pill switcher, A/B treatment branch, `PracticeGlyph` | VERIFIED | `PRACTICE_IDS = ['resonant', 'stretch', 'naviKriya']`. `TREATMENT` constant at line 11. `PracticeGlyph` exported. |
| `vite.config.ts` | `define.__SWITCHER_TREATMENT__` inject | VERIFIED | Lines 55-61. Only `VITE_SWITCHER_TREATMENT === 'B'` activates treatment B. |
| `src/content/strings.ts` | `stretchName`, `stretchHeading`, `stretchHeader` in EN + PT-BR | VERIFIED | Lines 167-169 (interface), 352-354 (EN), 537-539 (PT-BR). |
| `src/components/BooleanToggle.tsx` | Renamed from ModeToggle | VERIFIED | File exists; `src/components/ModeToggle.tsx` does not exist. |
| `src/components/SettingsForm.tsx` | Stretch branch, resonant standard-only | VERIFIED (partial) | `activePractice === 'stretch'` branch renders ramp steppers. Duration display now correct (CR-01 closed). HOWEVER: if coerced `initialBpm = 1` reaches the component, `targetBpmOptions = []` and `updateInitialBpm` writes `targetBpm: undefined` (REVIEW WR-01). |
| `src/hooks/useSessionEngine.ts` | `startStretchSession` invoked with 3 args when stretch | VERIFIED | Lines 220-225: `startStretchSession(sSettings, currentState.selectedSettings, performance.now())`. WR-03 fix confirmed. |
| `src/app/App.tsx` | `stretchSettings`, `stretchStats` state, 3-way selectors, session recording | VERIFIED | State at lines 137-141. 3-way selectors at lines 304-321. `onStretchSettingsChange` at line 446. `recordStretchSession` at line 800. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.tsx` | `recordStretchSession` | session-end effect `activePractice === 'stretch'` | WIRED | `App.tsx:799-801` |
| `App.tsx` | `saveStretchSettings` | `onStretchSettingsChange` handler | WIRED | `App.tsx:446-449` |
| `useSessionEngine.ts` | `startStretchSession` (3-arg) | `start()` picks stretch path when `stretchSettingsRef.current !== null` | WIRED | `useSessionEngine.ts:220-225`. WR-03 fix verified. |
| `vite.config.ts define` | `PracticeToggle.tsx` | `__SWITCHER_TREATMENT__` compile-time constant | WIRED | `vite.config.ts:55-61`; `PracticeToggle.tsx:10-11` |
| `coerceStretchSettings` | `coercePractices` stretch slot | `practices.ts:120` | WIRED — but coercer missing cross-field guard | PARTIAL |
| `storage.ts migrateEnvelope` | `practices.stretch` | v2→v3 step seeds the slice | WIRED | `storage.ts:108-133` |
| `computeStretchTotalMs` | `SettingsForm.tsx` Duration display | `stretchTotalMs` at line 84 | WIRED — now correct after CR-01 fix | VERIFIED |
| `LearnDialog.tsx` | `videosHeading` | `practiceContentKey === 'resonant'` after WR-01 fix | WIRED | `LearnDialog.tsx:95` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `SettingsForm.tsx` stretch branch | `stretchSettings` | `App.tsx` state seeded from `loadPractices().stretch.settings` (localStorage via coercer) | Yes — reads persisted data; HOWEVER coercer misses cross-field invariant | FLOWING (partially unsafe) |
| `SettingsForm.tsx` Duration display | `stretchTotalMs` from `computeStretchTotalMs(stretchSettings)` | `stretchRamp.ts:230-234` — now derives from snapped segment table | Yes — CR-01 closed; displayed value matches actual session end | FLOWING |
| `App.tsx` `stretchStats` | `stretchStats` state | `initialPractices.stretch.stats` + `recordStretchSession` at session end | Yes — real incrementing stats | FLOWING |
| `PracticeToggle.tsx` | `strings.practiceNames[id]` | `App.tsx:1087` — i18n string map | Yes — real i18n strings | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Gap-closure suites (4 files) | `npx vitest run src/domain/stretchRamp.test.ts src/components/LearnDialog.test.tsx src/domain/sessionController.test.ts src/hooks/useSessionEngine.test.tsx` | 101/101 tests pass | PASS |
| Full test suite | `npx vitest run` | 1211/1211 tests pass (78 files) | PASS |
| TypeScript typecheck | `npx tsc -b` | exits 0, no errors | PASS |
| CR-01 original: computeStretchTotalMs drift | `grep -n "warmUpMinutes + rampDurationMinutes + coolDownMinutes" stretchRamp.ts` | no matches | PASS |
| WR-01 original: LearnDialog heading uses practiceContentKey | `grep -n "videosHeading = " LearnDialog.tsx` | `practiceContentKey === 'resonant' ? strings.videosHeading : ...` | PASS |
| WR-03 original: startStretchSession 3-arg signature | `grep -n "selectedSettings: cloneSettings(selectedSettings)" sessionController.ts` | line 86 confirms | PASS |
| REVIEW CR-01 new: coerceStretchSettings cross-field guard | `grep -n "targetBpm.*>=.*initialBpm\|targetBpm.*<.*initialBpm" practices.ts` | no cross-field check found | FAIL |

### Probe Execution

No conventional probe scripts found. Step 7c: SKIPPED (no probe-*.sh files in scripts/).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STRETCH-01 | Plans 03, 05 | 3-practice switcher HRV·Stretch·Navi | SATISFIED | `PracticeToggle.tsx:24` PRACTICE_IDS; `App.tsx:1082` wiring |
| STRETCH-02 | Plan 03 | Switcher legible at 320px, both locales, A/B treatment dev-only toggle | SATISFIED (human needed for visual) | `PracticeToggle.tsx` flex-1 layout; `vite.config.ts define`; toggle absent from Settings |
| STRETCH-03 | Plans 01, 02, 05 | Stretch own per-practice settings persisted separately | PARTIALLY BLOCKED | Settings type split correct; storage wiring correct; REVIEW CR-01 means a drifted persisted slice can bypass the intended type contract and produce a corrupt ramp |
| STRETCH-04 | Plans 01, 02, 05 | Stretch own per-practice stats separate from HRV and NK | SATISFIED | `recordStretchSession` slice-isolated write; `stretchStats` state in App |
| STRETCH-05 | Plan 02 | Returning user HRV/Navi data intact; prior Stretch usage preserved | SATISFIED | v2→v3 migration lossless; resonant/naviKriya untouched |
| STRETCH-06 | Plan 04 | All new Stretch copy in EN and PT-BR | SATISFIED | `strings.ts` stretchName/stretchHeading/stretchHeader in both locales; tested |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/storage/practices.ts` | 89-99 | `coerceStretchSettings` validates initialBpm and targetBpm independently but no cross-field `targetBpm < initialBpm` check | BLOCKER | REVIEW CR-01: drifted/tampered persisted slice with targetBpm >= initialBpm reaches engine and produces a silently inverted ramp |
| `src/domain/stretchRamp.ts` | 123-126 | `buildStretchSegments` uses `Math.max(1, ...)` guard for `bpmSpan <= 0` instead of throwing — silent corruption | BLOCKER | Compounds REVIEW CR-01: engine never rejects the invalid input, produces structurally valid but logically wrong segment table |
| `src/components/SettingsForm.tsx` | 82, 113-114 | `targetBpmOptions` can be empty if `initialBpm = 1` (valid per full BPM_OPTIONS); `updateInitialBpm` writes `targetBpm: undefined` | WARNING | REVIEW WR-01 (new): secondary consequence of coercer using full BPM_OPTIONS; UI renders stepper with no options |
| `src/storage/storage.ts` | 122 | Migration comment "carries ramp fields" is inaccurate for post-Phase-34 resonant blobs (3-field only); misleads future maintainers | WARNING | REVIEW WR-02: comment-only issue; behavior is correct (coercer falls back to defaults) |
| `src/domain/sessionController.ts` | 102-124 | `extendTimedSession` stretch-rejection guard ordering is load-bearing but undocumented | WARNING | REVIEW WR-05: wrong ordering would silently route stretch state into open-ended branch (swallowed by useSessionEngine) |
| `src/domain/settings.ts` | 60-63 | TEMPORARY 1-minute duration option shipped with "Remove before release" comment | INFO | Pre-existing; unrelated to Phase 34 |
| `src/storage/practices.ts` | 171-236 | `recordStretchSession` duplicates `recordResonantSession` verbatim | INFO | REVIEW IN-02: three copies of session-recording logic invite drift |
| `src/content/strings.ts` | 272, 352-354 | `settingsForm.rampDurationLabel = 'Stretch'` collides with `practice.stretchName = 'Stretch'` | INFO | REVIEW IN-03: maintainability hazard for text-based assertions or screen-reader audit |

### Human Verification Required

#### 1. 3-practice switcher at 320px viewport — English

**Test:** Open the app in a browser, set viewport to 320px wide. Observe the practice switcher (HRV · Stretch · Navi pills).
**Expected:** All three pills are fully legible (no text truncation), each pill is at least 44px tall and tappable, the layout does not overflow the viewport.
**Why human:** No automated pixel-accuracy viewport test — visual judgment required. Spike 007 pre-validated the layout; this confirms it in the live build.

#### 2. 3-practice switcher at 320px viewport — PT-BR

**Test:** Switch language to PT-BR (via Settings), set viewport to 320px. Observe the switcher (HRV · Alongar · Navi pills).
**Expected:** "Alongar" fits the pill without truncation; all three pills remain legible and tappable.
**Why human:** Locale-specific visual check.

#### 3. Treatment B glyphs — visual quality

**Test:** Build with `VITE_SWITCHER_TREATMENT=B npx vite build`, inspect the switcher. Each pill should show an inline SVG glyph: circle (HRV), descending diagonal (Stretch), three dots (Navi).
**Expected:** Glyphs are visually distinct, each matches its practice motif, no hardcoded colors (glyphs inherit theme tokens via `currentColor`).
**Why human:** Visual quality judgment of SVG motifs.

---

## Gaps Summary

### BLOCKER — REVIEW CR-01: coerceStretchSettings missing cross-field invariant

`coerceStretchSettings` in `src/storage/practices.ts:89-99` validates `initialBpm` and `targetBpm` independently using `isValidBpm` (which accepts the full `BPM_OPTIONS` set including `1`) but never enforces the cross-field constraint `targetBpm < initialBpm` that `validateStretchSettings` (settings.ts:218) treats as mandatory. A persisted stretch slice with `targetBpm >= initialBpm` — produced by localStorage tampering, a v2→v3 migration seeding a pre-trim resonant blob with orphaned ramp fields in that relationship, or any future schema drift — passes the coercer unchanged and reaches `buildStretchSegments`. The engine's `Math.max(1, ...)` guard silently collapses the ramp to a single segment running at `initialBpm`, followed by a cool-down at the higher `targetBpm`. The session silently accelerates instead of decelerating. `validateStretchSettings` is dead code on the start path.

**Secondary consequence (REVIEW WR-01 new):** A coerced `initialBpm = 1` (valid per full `BPM_OPTIONS`) causes `targetBpmOptions = []` in SettingsForm, and `updateInitialBpm` then writes `targetBpm: undefined`. This is eliminated by coercing `initialBpm` against `STRETCH_INITIAL_BPM_OPTIONS` (already used by the UI picker for exactly this reason).

**Fix (two changes):**

1. `src/storage/practices.ts` — add cross-field invariant to `coerceStretchSettings`, and coerce `initialBpm` against `STRETCH_INITIAL_BPM_OPTIONS`:
```typescript
export function coerceStretchSettings(raw: unknown): StretchSettings {
  const r = asRecord(raw)
  let initialBpm = isValidBpm(r.initialBpm) && STRETCH_INITIAL_BPM_OPTIONS.includes(r.initialBpm as number)
    ? r.initialBpm as number
    : DEFAULT_STRETCH_SETTINGS.initialBpm
  let targetBpm = isValidBpm(r.targetBpm) ? r.targetBpm as number : DEFAULT_STRETCH_SETTINGS.targetBpm
  if (targetBpm >= initialBpm) {
    initialBpm = DEFAULT_STRETCH_SETTINGS.initialBpm
    targetBpm  = DEFAULT_STRETCH_SETTINGS.targetBpm
  }
  return {
    ratio:               isValidRatio(r.ratio)                       ? r.ratio as RatioLabel     : DEFAULT_STRETCH_SETTINGS.ratio,
    initialBpm,
    targetBpm,
    warmUpMinutes:       isValidWarmUp(r.warmUpMinutes)              ? r.warmUpMinutes as WarmUpMinutes : DEFAULT_STRETCH_SETTINGS.warmUpMinutes,
    rampDurationMinutes: isValidRampDuration(r.rampDurationMinutes)  ? r.rampDurationMinutes as number  : DEFAULT_STRETCH_SETTINGS.rampDurationMinutes,
    coolDownMinutes:     isValidCoolDown(r.coolDownMinutes)          ? r.coolDownMinutes as CoolDownMinutes : DEFAULT_STRETCH_SETTINGS.coolDownMinutes,
  }
}
```

2. `src/domain/stretchRamp.ts` — add a defensive guard mirroring the `rampDurationMinutes` guard:
```typescript
if (!(targetBpm < initialBpm)) {
  throw new RangeError('targetBpm must be strictly below initialBpm')
}
```

3. `src/storage/practices.test.ts` — add regression tests: (a) persisted `targetBpm >= initialBpm` resets both to defaults; (b) persisted `initialBpm = 1` resets to default.

**All original gap-closure deliverables are confirmed complete:**
- CR-01 original (computeStretchTotalMs): CLOSED — derives from snapped segment table; commit fce4f24; 2 regression tests pass.
- WR-01 original (LearnDialog heading): CLOSED — `practiceContentKey === 'resonant'`; commit 2d537d6; 3 regression tests pass.
- WR-03 original (resonant selectedSettings clobbered): CLOSED — 3-arg `startStretchSession`; commit 89140f5; 4 regression tests pass.
- Full suite: 1211/1211 tests pass; `tsc -b` exits 0.

**Warnings (not blocking phase gate, should be addressed before shipping):**
- REVIEW WR-02: v2→v3 migration comment "carries ramp fields" is inaccurate for post-Phase-34 resonant blobs — behavior correct, comment misleads.
- REVIEW WR-04: `extendTimedSession` stretch-rejection guard ordering is load-bearing but undocumented; `useSessionEngine` swallows the RangeError so wrong ordering fails silently.
- REVIEW WR-03 (new): Early-ended stretch sessions lack App-level integration test coverage.

---

_Verified: 2026-05-18T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification after gap-closure plan 34-06_
