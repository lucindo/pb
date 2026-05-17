---
phase: 30-multi-practice-architecture-switcher
verified: 2026-05-17T10:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "D-04: a control heading copy string naming the active practice exists (EN now); inline controls area shows a heading naming the active practice"
    reason: "Operator checkpoint feedback (Task 3, plan 30-04) overrode D-04. The inline <h3> was removed from SettingsForm. The active practice is named in the app header ('HRV practice'/'Navi practice') and page title ('HRV Breathing'/'Navi Kriya') instead. The intent — the user can see which practice is active — is satisfied by the header/title naming. Documented in 30-04-SUMMARY.md key-decisions."
    accepted_by: "operator (human UAT checkpoint)"
    accepted_at: "2026-05-17T00:00:00Z"
re_verification: null
gaps: []
human_verification:
  - test: "Switcher end-to-end — segmented control above the orb"
    expected: "A 'Resonant Breathing | Navi Kriya' segmented control appears above the orb with 'Resonant Breathing' active by default. Clicking 'Navi Kriya' shows the NK scaffold (placeholder text, disabled Start) and the header changes to 'Navi practice'. Clicking back restores resonant knobs and 'HRV practice' header."
    why_human: "Visual layout, practice heading rendering, and header/title swap cannot be asserted from grep. Human UAT was completed by the operator during plan 30-04 Task 3, but the verifier cannot re-run that interaction."
  - test: "In-session lock — switcher disabled during a session"
    expected: "While a Resonant session is in progress, the switcher pills are dimmed (~50% opacity) and clicking either pill produces no layout change. After the session ends, the switcher becomes active again."
    why_human: "Requires starting a live session and observing the disabled interaction — not exercisable by code inspection alone. The operator confirmed this in the Task 3 checkpoint."
  - test: "Returning-user persistence (PRACTICE-04) — first real page load after upgrade"
    expected: "A user whose localStorage has a v1-shaped envelope (flat settings/stats) loads the app and sees their existing Resonant Breathing settings and session stats intact. Nothing is zeroed or lost."
    why_human: "The migration logic and its unit tests are VERIFIED, but the end-to-end experience (actual localStorage migration visible to a real user in a browser) was confirmed by the operator at the Task 3 checkpoint and cannot be repeated here without a real browser environment."
---

# Phase 30: Multi-Practice Architecture Switcher — Verification Report

**Phase Goal:** One app hosts two practices — a returning user keeps everything, switches with a top control, and shared vs. per-practice settings are cleanly separated.
**Verified:** 2026-05-17T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can switch between Resonant Breathing and Navi Kriya using a top segmented control above the orb | VERIFIED | `PracticeToggle` rendered at `App.tsx:778-789` as the first child of the main card div, above the orb section. `active={activePractice}`, `onSwitch={onSwitchPractice}`. Component maps over `['resonant','naviKriya']` with ARIA-correct `aria-pressed` pills. |
| 2 | User's last-used practice and each practice's own session settings persist across reloads | VERIFIED | `activePractice` state seeded from `loadActivePractice()` at mount (`App.tsx:91,100`); persisted via `saveActivePractice(next)` in `onSwitchPractice` (`App.tsx:343`). Resonant settings load from `loadSettings()` flat path and save via `saveSettings()` (flat path — CR-01 latent concern documented for Phase 31, functionally correct in Phase 30 per operator instructions). Per-practice stats seeded from `loadPractices()` at mount (`App.tsx:90,101-102`). |
| 3 | User cannot operate the switcher while a session is in progress — it is disabled until the session ends | VERIFIED | `PracticeToggle` receives `disabled={inSessionView}` (`App.tsx:780`). Each `<button>` in `PracticeToggle.tsx:58` carries `disabled={disabled}`. `onSwitchPractice` has a defense-in-depth `if (inSessionView) return` guard (`App.tsx:341`). Unit-tested in `PracticeToggle.test.tsx`. |
| 4 | A returning user with existing saved Resonant Breathing settings and stats sees them intact after the upgrade | VERIFIED | `migrateEnvelope` in `storage.ts:90-107` implements the v1→v2 ladder: when `fromVersion < 2`, folds flat `settings`/`stats` into `practices.resonant`. Lossless (flat fields not deleted) and idempotent (`fromVersion < 2` guard). Tested by `storage.test.ts:154-203` (lossless, idempotent, and readback tests) and `practices.test.ts:241-258` (full load path for v1 envelope). |
| 5 | User adjusts shared app-wide settings (theme, language, visual variant, cue style) from one settings screen, and sees only the active practice's practice-specific controls | VERIFIED | `SettingsDialog` is not modified by Phase 30 (`App.tsx:899` — the shared shell unchanged). `SettingsForm` dispatches on `activePractice` (`SettingsForm.tsx:96-221`): resonant branch renders all resonant knobs; naviKriya branch renders the NK structural scaffold (empty controls slot + disabled Start stub, no resonant knobs). |

**Score:** 5/5 truths verified (1 PASSED via documented operator override)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/domain/naviKriyaSettings.ts` | NaviKriyaSettings type, DEFAULT_NK_SETTINGS, OM_LENGTH_OPTIONS, isValid* predicates | VERIFIED | Exists. Exports `OmLength`, `OM_LENGTH_OPTIONS`, `NaviKriyaSettings`, `DEFAULT_NK_SETTINGS`, `isValidFrontCount`, `isValidOmLength`, `isValidRounds`. Zero imports. `v % 4 === 0` guard present at line 27. |
| `src/domain/naviKriyaSettings.test.ts` | Validator + defaults unit tests | VERIFIED | Exists. 16 tests across 4 describe blocks. Pitfall 5 regression case `isValidFrontCount(102) → false` present. All pass. |
| `src/components/PracticeToggle.tsx` | Top segmented-control practice switcher | VERIFIED | Exists. Exports `PracticeToggle` and `PracticeToggleProps`. Two pills with `aria-pressed`, `disabled={disabled}`, `onClick={() => { onSwitch(id) }}`. No raw hex colors (grep -c '#' = 0). |
| `src/components/PracticeToggle.test.tsx` | Unit coverage for PRACTICE-01 and PRACTICE-03 | VERIFIED | Exists. 8 tests. Covers two-pill render, aria-pressed, click-fires-onSwitch, and disabled-does-not-fire-onSwitch. |
| `src/content/strings.ts` | Practice copy strings (names, heading, toggle label, reset title fn) | VERIFIED | `UiStrings.practice` sub-object exists with 9 members including `resetStatsTitle` function. EN and pt-BR both populated. `resetStatsDialog.title` unchanged. |
| `src/storage/storage.ts` | STATE_VERSION=2, Envelope.practices/activePractice, v1→v2 ladder | VERIFIED | `STATE_VERSION = 2 as const` at line 38. `STATE_KEY = 'hrv:state:v1'` unchanged at line 37. `Envelope` has `practices?: unknown` and `activePractice?: unknown`. `migrateEnvelope` implements `fromVersion < 2` ladder at lines 90-107. |
| `src/storage/practices.ts` | PracticeId, PracticeMap, coercers, load/save/record/reset API | VERIFIED | Exists. Exports all required symbols: `PracticeId`, `PracticeMap`, `PracticeSlice`, `coercePractices`, `coerceActivePractice`, `coerceNaviKriyaSettings`, `loadPractices`, `loadActivePractice`, `saveActivePractice`, `saveResonantSettings`, `saveNaviKriyaSettings`, `recordResonantSession`, `resetPracticeStats`. Prototype-pollution-safe `asRecord` guard. |
| `src/storage/practices.test.ts` | Unit coverage for PRACTICE-02/04 | VERIFIED | Exists. 23+ tests including coercers, round-trips, practice-scoped record/reset, and v1 migration path. `coerceNaviKriyaSettings({ frontCount: 90 }) → frontCount: 88` case present. |
| `src/storage/index.ts` | Barrel re-export of practices.ts | VERIFIED | Line 10: `export * from './practices'`. |
| `src/components/SettingsForm.tsx` | Practice-aware inline controls host | VERIFIED | `SettingsFormProps.activePractice: PracticeId` added. Dispatches on `activePractice === 'resonant'` at line 96. NK branch at lines 201-221: placeholder + disabled Start stub. D-04 inline `<h3>` removed per operator override. |
| `src/components/ResetStatsDialog.tsx` | Optional practice-named title prop | VERIFIED | `title?: string` prop added. Renders `{title ?? strings.title}` at line 76. App.tsx passes `uiStrings.practice.resetStatsTitle(activePracticeName)`. |
| `src/app/App.tsx` | activePractice state, PracticeToggle, practice-scoped stats/record/reset | VERIFIED | `activePractice` state at line 100. `PracticeToggle` wired at lines 778-789. `recordResonantSession` at line 667. `resetPracticeStats(activePractice)` at line 556. `activeStats` selects per-practice slice at line 216. `StatsFooter` receives `activeStats` at line 866. Cross-tab listener calls `loadPractices()` at line 174. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.tsx PracticeToggle` | `onSwitchPractice → saveActivePractice` | switch handler persists activePractice | WIRED | `onSwitchPractice` at App.tsx:340-344 calls `setActivePractice(next)` and `saveActivePractice(next)`. |
| `App.tsx StatsFooter` | activePractice-scoped stats slice | `activePractice === 'resonant'` selection | WIRED | `activeStats = activePractice === 'resonant' ? resonantStats : naviKriyaStats` at App.tsx:216. Passed to `StatsFooter stats={activeStats}` at line 866. |
| `App.tsx onSwitchPractice` | in-session guard | `if (inSessionView) return` | WIRED | App.tsx:341: early return when in-session. PracticeToggle also carries `disabled={inSessionView}` (App.tsx:780). |
| `storage.ts migrateEnvelope` | `Envelope.practices.resonant` | v1→v2 ladder | WIRED | `fromVersion < 2` block at storage.ts:93-104 assigns `practices: { resonant: { settings: out.settings, stats: out.stats } }`. |
| `practices.ts` | `naviKriyaSettings.ts` | `coerceNaviKriyaSettings` imports validators | WIRED | `import { DEFAULT_NK_SETTINGS, isValidOmLength, isValidRounds, type NaviKriyaSettings } from '../domain/naviKriyaSettings'` at practices.ts:17-21. |
| `App.tsx` | `resetPracticeStats(activePractice)` | confirmReset wipes only active practice | WIRED | App.tsx:556: `resetPracticeStats(activePractice)`. Sets only active practice state (resonant or naviKriya) at lines 557-558. |
| `App.tsx ResetStatsDialog` | practice-named title | `uiStrings.practice.resetStatsTitle(activePracticeName)` | WIRED | App.tsx:891: `title={uiStrings.practice.resetStatsTitle(activePracticeName)}`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `App.tsx StatsFooter` | `activeStats` | `activePractice === 'resonant' ? resonantStats : naviKriyaStats`; `resonantStats` seeded from `loadPractices().resonant.stats` | Yes — `loadPractices()` reads `readEnvelope()` → `coercePractices()` → real localStorage data | FLOWING |
| `App.tsx PracticeToggle` | `activePractice` | `useState<PracticeId>(initialActivePractice)` seeded from `loadActivePractice()` at mount | Yes — reads `readEnvelope().activePractice` from localStorage | FLOWING |
| `SettingsForm.tsx` | `activePractice` prop | Passed from App.tsx `activePractice` state | Yes — practice-aware dispatch on real state | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All phase tests pass | `npm run test:run -- src/domain/naviKriyaSettings.test.ts src/storage/practices.test.ts src/storage/storage.test.ts src/components/PracticeToggle.test.tsx src/content/strings.test.ts` | 84/84 pass | PASS |
| Full test suite (no regression) | `npm run test:run` | 1057/1057 pass | PASS |
| TypeScript build | `npm run build` | Build succeeded (288 kB, PWA precache 17 entries) | PASS |
| `isValidFrontCount` multiple-of-4 guard | `grep -c "v % 4 === 0" src/domain/naviKriyaSettings.ts` | 1 (confirmed in non-comment code) | PASS |
| `STATE_KEY` unchanged | `grep -c "'hrv:state:v1'" src/storage/storage.ts` | 1+ (STATE_KEY = 'hrv:state:v1') | PASS |
| PracticeToggle no raw hex | `grep -c '#' src/components/PracticeToggle.tsx` | 0 | PASS |
| practices.ts barrel export | `grep "export \* from './practices'" src/storage/index.ts` | Found at line 10 | PASS |

### Probe Execution

Step 7c skipped — no `scripts/*/tests/probe-*.sh` probes exist for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PRACTICE-01 | 30-02, 30-04 | User can switch practices via top segmented control above orb | SATISFIED | `PracticeToggle` component built (30-02) and wired into `App.tsx` (30-04). Clicking a pill fires `onSwitchPractice`. |
| PRACTICE-02 | 30-01, 30-03 | User's last-used practice and per-practice settings persist across reloads | SATISFIED | `activePractice` persisted via `saveActivePractice`; resonant settings via flat path (functional); per-practice stats via `practices` subtree. `loadPractices()` reloads on mount. |
| PRACTICE-03 | 30-02, 30-04 | Switcher disabled during an in-progress session | SATISFIED | `disabled={inSessionView}` on PracticeToggle + `if (inSessionView) return` guard in handler. Unit-tested. |
| PRACTICE-04 | 30-03 | Returning user's Resonant settings and stats survive upgrade | SATISFIED | `migrateEnvelope` v1→v2 ladder losslessly migrates flat `settings`/`stats` into `practices.resonant`. Idempotent. Tested in both `storage.test.ts` and `practices.test.ts`. |
| PRACTICE-05 | 30-04 | Shared settings (theme, language, visual variant, cue style) from one screen | SATISFIED | `SettingsDialog` component not modified in Phase 30 — confirmed by file diff (App.tsx only adds props pass-through; SettingsDialog.tsx not in 30-SUMMARY.md modified files). |
| PRACTICE-06 | 30-04 | Active practice's practice-specific controls are shown | SATISFIED | `SettingsForm` dispatches on `activePractice` at line 96: resonant branch renders BPM/ratio/duration knobs; naviKriya branch renders NK structural scaffold. |

All 6 requirement IDs are claimed by plans 30-01 through 30-04 and all are satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/SettingsForm.tsx` | 208 | `aria-label="Practice controls — coming soon"` | Info | Intentional D-01 structural scaffold — the NK controls placeholder is by design; Phase 31 replaces it with real NK controls. Not a stub. |
| `src/components/PracticeToggle.tsx` | 6 | Local `PracticeId` type alias duplicates canonical from `practices.ts` | Info | IN-02 from 30-REVIEW.md — structural duplicate, not a functional bug. Acknowledged as planned technical debt for Phase 31 reconciliation. |

No TBD, FIXME, or XXX markers found in any phase-30-modified files.

**CR-01 (from 30-REVIEW.md) — Resonant settings split-brain:**
`App.tsx` still loads resonant settings via `loadSettings()` (flat path) and persists via `saveSettings()` (flat path). The `saveResonantSettings` function in `practices.ts` is dead code in Phase 30. Per the operator-provided context: "Resonant settings DO persist and reload correctly in Phase 30 via the flat path — this is a latent Phase 31 concern, not a Phase 30 functional gap." SC-2 is verified against this flat-path behavior. CR-01 is deferred to Phase 31.

### Human Verification Required

The following three items require human testing. The operator completed these at the plan 30-04 Task 3 checkpoint, but they cannot be programmatically re-asserted by the verifier.

#### 1. Switcher visual rendering and practice swap

**Test:** Run `npm run dev`. Confirm a "Resonant Breathing | Navi Kriya" segmented control appears above the orb, with "Resonant Breathing" active. Click "Navi Kriya". Confirm: the header changes to "Navi practice", the page title changes to "Navi Kriya", the resonant knobs are replaced by "Controls coming soon" placeholder and a disabled (greyed, unclickable) Start button.
**Expected:** Practice swap is instantaneous with no layout shift. Switching back to Resonant restores the header "HRV practice", title "HRV Breathing", and all resonant knobs.
**Why human:** Visual layout, CSS token rendering, header/title swap, and NK scaffold appearance cannot be asserted by code inspection alone.

#### 2. In-session switcher lock

**Test:** Start a Resonant session. Observe the switcher. Try clicking either practice pill.
**Expected:** The switcher is dimmed (~50% opacity). Clicking either pill does nothing — no practice change, no layout shift. After the session ends, the switcher returns to full opacity and responds to clicks.
**Why human:** Requires a running browser session to test interactive state under a live `inSessionView=true` condition.

#### 3. Returning-user persistence (PRACTICE-04) in a live browser

**Test:** If localStorage contains a v1-shaped envelope (or simulate one via DevTools), reload the app.
**Expected:** The last-used practice is selected and the user's existing Resonant Breathing settings and stats are intact. Nothing is zeroed or lost.
**Why human:** The migration ladder is unit-tested, but the end-to-end browser experience (actual localStorage upgrade visible to a user) requires a browser environment to confirm.

### Gaps Summary

No gaps. All 5 must-have truths are VERIFIED. One truth (D-04 inline heading) carries a documented operator override from the plan 30-04 checkpoint, replacing the inline `<h3>` with app-header/title naming — the user can clearly see which practice is active, satisfying the intent.

The CR-01 split-brain concern (resonant settings on flat path vs. stats on practices subtree) is a latent Phase 31 concern explicitly documented in the operator context for this verification. It does not affect Phase 30 functional correctness.

---

_Verified: 2026-05-17T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
