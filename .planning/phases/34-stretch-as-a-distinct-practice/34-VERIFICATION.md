---
phase: 34-stretch-as-a-distinct-practice
verified: 2026-05-18T16:00:00Z
status: gaps_found
score: 5/6 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Stretch is its own practice — its own session settings and its own stats — not a mode toggle inside HRV (STRETCH-02/03/04)"
    status: partial
    reason: "CR-01 (code review blocker): computeStretchTotalMs sums raw minute settings while buildStretchSegments snaps every segment to whole cycles. The 'Duration' read-only display shown to the user disagrees with the actual session completion time. With default settings (5.5→4.5 BPM, 5+5+5 min) the displayed total is 900,000 ms (15 min) but the session completes at 903,220 ms (~15.054 min) — a 3.2-second discrepancy. For non-default BPM combinations the drift compounds across more ramp steps. getStretchFrame uses the snapped segment table (correct); computeStretchTotalMs uses raw sums (wrong)."
    artifacts:
      - path: "src/domain/stretchRamp.ts"
        issue: "computeStretchTotalMs (lines 228-232) returns (warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60_000 — raw sum. Should instead call buildStretchSegments(settings) and return segments[segments.length - 1].endMs, which is the same source of truth as getStretchFrame's isComplete check."
      - path: "src/components/SettingsForm.tsx"
        issue: "Consumes computeStretchTotalMs at line 84 to produce the read-only Duration label. Will show the wrong value until CR-01 is fixed upstream."
    missing:
      - "Fix computeStretchTotalMs to derive from the snapped segment table: const segments = buildStretchSegments(settings); return segments[segments.length - 1]!.endMs"
      - "Add a regression test with a non-cycle-aligned BPM (e.g. initialBpm: 5.5, targetBpm: 4) asserting computeStretchTotalMs equals buildStretchSegments(...).at(-1).endMs"
---

# Phase 34: Stretch as a Distinct Practice — Verification Report

**Phase Goal:** Promote HRV's Stretch mode to a top-level practice — the switcher carries three (HRV · Stretch · Navi), each with its own settings and stats, returning users' data migrates cleanly, and the 3-practice switcher ships both label treatments behind a developer-only toggle.
**Verified:** 2026-05-18T16:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can switch between HRV, Stretch, and Navi using the top segmented control above the orb (STRETCH-01) | VERIFIED | `PracticeToggle.tsx:24` — `PRACTICE_IDS = ['resonant', 'stretch', 'naviKriya']`; `App.tsx:1082` — `onSwitch={onSwitchPractice}`, `App.tsx:1087` — `stretch: uiStrings.practice.stretchName`. PracticeToggle renders 3 pills in HRV·Stretch·Navi order. Tests: 3 pills in correct order confirmed by `PracticeToggle.test.tsx:28-41`. |
| 2 | Stretch is its own practice — its own session settings and its own stats — not a mode toggle inside HRV (STRETCH-03/04) | FAILED (BLOCKER) | Settings type split is correct (StretchSettings standalone, SessionSettings 3-field only). Stats isolation verified (`recordStretchSession` writes only `practices.stretch.stats`). However CR-01 blocker: the read-only Duration display (`computeStretchTotalMs`) is computed from raw minute sums, not from the snapped segment table that governs actual session completion. The displayed duration disagrees with the real session end time. |
| 3 | A returning user keeps all data: HRV and Navi settings/stats intact, and prior Stretch usage preserved under the new Stretch practice slice (STRETCH-05) | VERIFIED | `storage.ts:108-133` — v2→v3 migration ladder seeds `practices.stretch.settings` from the resonant blob (which carried ramp fields for pre-Phase-34 stretch-mode users) and zeros stretch stats; `practices.resonant` and `practices.naviKriya` are passed through untouched. Migration is lossless and idempotent (confirmed by `storage.test.ts` suite: 5 migration cases). Note: WR-05 (review) argues the resonant blob "never had ramp fields" — this misreads the historical data. Before Phase 34, `SessionSettings` DID include ramp fields; a returning stretch-mode user has them in their stored blob. The migration correctly seeds from that blob and `coerceStretchSettings` validates downstream. |
| 4 | The 3-practice switcher stays legible and tappable on mobile down to 320px, in English and PT-BR (STRETCH-02) | VERIFIED (partial — needs human for visual) | Structural check: pill classes are `flex-1 rounded-full min-h-[44px]` — the container is `flex` so 3 equal pills divide the space. EN label "Stretch" and PT-BR label "Alongar" are both short enough to fit (spike 007 pre-validated). The developer toggle (`__SWITCHER_TREATMENT__`) is build-time only via `vite.config.ts define` block — NOT present in Settings dialog (grep found no match in SettingsForm.tsx or App.tsx). See Human Verification items for visual confirmation at 320px. |
| 5 | A developer can switch the switcher between the two label treatments via a developer-only toggle NOT in the user Settings dialog (STRETCH-02 second half) | VERIFIED | `vite.config.ts:55-61` — `define.__SWITCHER_TREATMENT__` reads `process.env.VITE_SWITCHER_TREATMENT === 'B' ? 'B' : 'A'`. No match for `TREATMENT` or `VITE_SWITCHER_TREATMENT` in `SettingsForm.tsx` or `App.tsx`. `.env.example` file exists and documents the env var. Treatment B branch in `PracticeToggle.tsx:99` renders `PracticeGlyph` when `TREATMENT === 'B'`. |
| 6 | User can read all new Stretch UI copy in both English and native-quality PT-BR (STRETCH-06) | VERIFIED | `strings.ts:352-354` (EN): `stretchName: 'Stretch'`, `stretchHeading: 'Stretch'`, `stretchHeader: 'Stretch practice'`. `strings.ts:537-539` (PT-BR): `stretchName: 'Alongar'`, `stretchHeading: 'Alongar'`, `stretchHeader: 'Prática de Alongar'`. Interface `UiStrings.practice` declares all 3 as `readonly string`. Tests: 6 new tests in `strings.test.ts` confirm all values. |

**Score:** 5/6 truths verified (CR-01 makes truth 2 a BLOCKER)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/domain/settings.ts` | StretchSettings standalone type, SessionSettings 3-field | VERIFIED | `StretchSettings` exported at line 27 with `ratio + 5 ramp fields`. `SessionSettings` is `bpm + ratio + durationMinutes` only. `SessionMode`, `MODE_OPTIONS`, `isValidMode` absent. |
| `src/domain/stretchRamp.ts` | `buildStretchSegments(StretchSettings)`, `computeStretchTotalMs(StretchSettings)` | STUB (partial) | Both functions accept `StretchSettings` (correct signature). `buildStretchSegments` is fully correct. `computeStretchTotalMs` is substantively wrong: uses raw sum instead of snapped segment table (CR-01 blocker). |
| `src/domain/sessionController.ts` | `startStretchSession(StretchSettings, nowMs)` exported, no mode branches | VERIFIED | `startStretchSession` at line 62. `startSession` is standard-only (`stretchSegments: null`). `extendTimedSession` guard uses `stretchSegments !== null`. No `=== 'stretch'` comparisons remain. |
| `src/storage/storage.ts` | `STATE_VERSION=3`, `fromVersion < 3` migration step | VERIFIED | Line 40: `STATE_VERSION = 3 as const`. Line 108: `if (fromVersion < 3)` seeds stretch slice. Migration lossless and idempotent. |
| `src/storage/practices.ts` | `PracticeId` includes `'stretch'`, `coerceStretchSettings`, `saveStretchSettings`, `recordStretchSession` | VERIFIED | Line 37: `PracticeId = 'resonant' | 'stretch' | 'naviKriya'`. All three functions exported and implemented (lines 89, 158, 207). `coercePractices` includes stretch slot at line 120. `coerceActivePractice` allows `'stretch'` at line 62. |
| `src/components/PracticeToggle.tsx` | 3-pill switcher, A/B treatment branch, `PracticeGlyph` | VERIFIED | `PRACTICE_IDS = ['resonant', 'stretch', 'naviKriya']` (line 24). `TREATMENT` module constant at line 11. `PracticeGlyph` exported at line 29. Glyphs use `currentColor` only — no hardcoded hex. |
| `vite.config.ts` | `define.__SWITCHER_TREATMENT__` inject | VERIFIED | Lines 55-61. Only `process.env.VITE_SWITCHER_TREATMENT === 'B'` activates B. |
| `src/content/strings.ts` | `stretchName`, `stretchHeading`, `stretchHeader` in EN + PT-BR | VERIFIED | Lines 167-169 (interface), 352-354 (EN), 537-539 (PT-BR). |
| `src/components/BooleanToggle.tsx` | Renamed from ModeToggle | VERIFIED | File exists; `src/components/ModeToggle.tsx` does not exist. |
| `src/components/SettingsForm.tsx` | Stretch branch (`activePractice === 'stretch'`), resonant standard-only | VERIFIED | Line 186: `activePractice === 'stretch'` branch renders ramp steppers. No `settings.mode` references in production code. |
| `src/hooks/useSessionEngine.ts` | `startStretchSession` invoked when `stretchSettings` non-null | VERIFIED | Lines 209-227: `stretchSettingsRef` captures latest value; `start()` checks `stretchSettingsRef.current !== null` and calls `startStretchSession`. |
| `src/app/App.tsx` | `stretchSettings`, `stretchStats` state, 3-way selectors, session recording, settings handler | VERIFIED | `stretchSettings`/`stretchStats` state at lines 137-141. 3-way `activeStats`/`activePracticeName`/`appHeader`/`appTitle` selectors at lines 304-321. `onStretchSettingsChange` at line 446. `recordStretchSession` at line 800. `confirmReset` handles `'stretch'` at line 682. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.tsx` | `recordStretchSession` | session-end effect when `activePractice === 'stretch'` | WIRED | `App.tsx:799-801` — conditional dispatch on `activePractice === 'stretch'` calls `recordStretchSession(elapsedMs, isComplete)` and `setStretchStats(updated)`. |
| `App.tsx` | `saveStretchSettings` | `onStretchSettingsChange` handler | WIRED | `App.tsx:446-449` — `onStretchSettingsChange` calls `saveStretchSettings(next)` and `setStretchSettings(next)`. Passed to `SettingsForm` at line 1192. |
| `useSessionEngine.ts` | `startStretchSession` | `start()` picks stretch path when `stretchSettingsRef.current !== null` | WIRED | `useSessionEngine.ts:220-223`. `App.tsx:147-148` passes `activeStretchSettings` (null for non-stretch practices) as second arg to `useSessionEngine`. |
| `vite.config.ts define` | `PracticeToggle.tsx` | `__SWITCHER_TREATMENT__` compile-time constant | WIRED | `vite.config.ts:55-61` defines the constant. `PracticeToggle.tsx:10-11` declares and reads it. `TREATMENT === 'B'` gates `PracticeGlyph` render at line 99. |
| `src/storage/practices.ts` coercer | `coerceStretchSettings` | `coercePractices` stretch slot | WIRED | `practices.ts:120` — `coercePracticeSlice(r.stretch, coerceStretchSettings)`. |
| `storage.ts migrateEnvelope` | `practices.stretch` | v2→v3 step seeds the slice | WIRED | `storage.ts:108-133` — `fromVersion < 3` block spreads stretch slice. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `SettingsForm.tsx` stretch branch | `stretchSettings` | `App.tsx` state seeded from `initialPractices.stretch.settings` (localStorage via `loadPractices()`) | Yes — reads persisted data, coerced by `coerceStretchSettings` | FLOWING |
| `SettingsForm.tsx` duration display | `stretchTotalMs` from `computeStretchTotalMs(stretchSettings)` | `stretchRamp.ts:228-232` | **No — raw sum, not snapped segment table** | STATIC (CR-01) |
| `App.tsx` `stretchStats` | `stretchStats` state | `initialPractices.stretch.stats` + `recordStretchSession` at session end | Yes — real incrementing stats | FLOWING |
| `PracticeToggle.tsx` | `strings.practiceNames[id]` | `App.tsx:1087` — `{ resonant: ..., stretch: uiStrings.practice.stretchName, naviKriya: ... }` | Yes — real i18n strings | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 5 plan test suites pass | `npx vitest run src/domain/stretchRamp.test.ts src/domain/sessionController.test.ts src/storage/practices.test.ts src/components/PracticeToggle.test.tsx src/content/strings.test.ts` | 143/143 tests pass | PASS |
| App integration tests pass | `npx vitest run src/app/App.persistence.test.tsx src/app/App.session.test.tsx src/app/App.settings.test.tsx` | 67/67 tests pass | PASS |
| Full test suite | `npx vitest run` | 1202/1202 tests pass (78 files) | PASS |
| `computeStretchTotalMs` disagrees with segment table | Node simulation with default settings (5.5→4.5 BPM, 5+5+5 min) | Displayed: 900,000 ms; Actual: 903,220 ms; Drift: +3,220 ms (~3.2 sec) | FAIL — CR-01 confirmed |

### Probe Execution

No conventional probe scripts found. Step 7c: SKIPPED (no probe-*.sh files in scripts/).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STRETCH-01 | Plans 03, 05 | 3-practice switcher HRV·Stretch·Navi | SATISFIED | `PracticeToggle.tsx:24` PRACTICE_IDS; `App.tsx:1082` wiring |
| STRETCH-02 | Plan 03 | Switcher legible at 320px, both locales, A/B treatment dev-only toggle | SATISFIED (human needed for visual) | `PracticeToggle.tsx` flex-1 layout; `vite.config.ts define`; toggle absent from Settings |
| STRETCH-03 | Plans 01, 02, 05 | Stretch own per-practice settings persisted separately | SATISFIED | `StretchSettings` type; `coerceStretchSettings`; `saveStretchSettings`; `PracticeMap.stretch` slot |
| STRETCH-04 | Plans 01, 02, 05 | Stretch own per-practice stats separate from HRV and NK | SATISFIED | `recordStretchSession` slice-isolated write; `stretchStats` state in App |
| STRETCH-05 | Plan 02 | Returning user HRV/Navi data intact; prior Stretch usage preserved | SATISFIED | v2→v3 migration seeds stretch from resonant blob (which held old ramp fields); resonant/naviKriya untouched |
| STRETCH-06 | Plan 04 | All new Stretch copy in EN and PT-BR | SATISFIED | `strings.ts` stretchName/stretchHeading/stretchHeader in both locales; tested |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/domain/stretchRamp.ts` | 228-232 | `computeStretchTotalMs` sums raw minutes instead of deriving from snapped segment table | BLOCKER | Duration display disagrees with actual session completion time (CR-01) |
| `src/components/LearnDialog.tsx` | 93 | `videosHeading` uses raw `activePractice` instead of resolved `practiceContentKey` — shows "Selected Navi Kriya Videos" heading for resonant content when stretch is active | WARNING | Wrong heading shown in Learn dialog when Stretch practice is active (WR-01) |
| `src/domain/sessionController.ts` | 62-87 | `startStretchSession` stores lead-in `SessionSettings` as `selectedSettings` — `endSession` returns those synthetic settings, potentially clobbering resonant `selectedSettings` after a stretch session ends | WARNING | WR-03: resonant selectedSettings clobbered by stretch session end if user switches back without reloading (low likelihood but data-integrity bug) |
| `src/storage/storage.ts` | 121-122 | v2→v3 migration comment "carries ramp fields" is misleading for users who never used stretch mode — their resonant blob has no ramp fields; `coerceStretchSettings` falls back to defaults (which is the correct behavior but the comment is inaccurate) | INFO | WR-05: comment-only issue; behavior is correct |
| `src/domain/settings.ts` | 60-77 | TEMPORARY 1-minute duration option present with "Remove before release" comment | INFO | IN-01: pre-existing tech debt, unrelated to Phase 34 |
| `src/components/SettingsForm.tsx` | 43 | `practiceStrings` prop declared and passed but never read in the component body | INFO | IN-02: dead prop from Phase 30 NK placeholder |

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

#### 4. LearnDialog when Stretch is active (WR-01 cosmetic impact)

**Test:** Switch to Stretch practice, open the Learn dialog.
**Expected (documented behavior):** Shows resonant HRV content with the heading "Selected Navi Kriya Videos" (cosmetic mismatch — WR-01). The dialog should not crash.
**Why human:** The crash prevention was confirmed in code, but the heading mismatch is a visible UX defect that may or may not be acceptable. Human decision needed on WR-01 severity.

---

## Gaps Summary

**One BLOCKER prevents phase goal achievement:**

**CR-01 — Stretch Duration display disagrees with actual session end.** `computeStretchTotalMs` in `src/domain/stretchRamp.ts` returns the sum of raw minute settings (`warmUpMinutes + rampDurationMinutes + coolDownMinutes`) multiplied by 60,000. The actual session completion is governed by `buildStretchSegments`, which snaps every segment to a whole number of cycles. For default settings (5.5→4.5 BPM, 5+5+5 min) the computed discrepancy is 3,220 ms (~3.2 seconds). The gap compounds for multi-step ramps or non-integer BPM configurations.

The fix is a two-line change: derive `computeStretchTotalMs` from the segment table instead of the raw sums:

```typescript
export function computeStretchTotalMs(settings: StretchSettings): number | null {
  if (settings.coolDownMinutes === 'open-ended') return null
  const segments = buildStretchSegments(settings)
  return segments[segments.length - 1]!.endMs
}
```

A companion test asserting `computeStretchTotalMs(settings) === buildStretchSegments(settings).at(-1)!.endMs` for a non-cycle-aligned BPM should be added.

**All other phase deliverables are complete and tested:**
- StretchSettings domain type split (SessionMode retired everywhere)
- Storage v2→v3 migration (lossless, idempotent, resonant/naviKriya untouched)
- 3-pill PracticeToggle with A/B treatment
- Full stretch copy in EN and PT-BR
- SettingsForm stretch branch (ramp knobs, read-only computed duration)
- useSessionEngine stretch start path (startStretchSession)
- App.tsx full wiring (state, selectors, session recording, settings handler)
- 1202/1202 tests pass

**Warnings (not blocking, but should be addressed before shipping):**
- WR-01: LearnDialog shows "Navi Kriya Videos" heading for resonant content when Stretch is active
- WR-03: `endSession` after a stretch session clobbering resonant `selectedSettings` in the engine

---

_Verified: 2026-05-18T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
