---
phase: 18-audio-timbres
plan: 05
subsystem: components
tags: [ui, picker, radiogroup, timbre, a11y]

# Dependency graph
requires:
  - phase: 18-audio-timbres
    plan: 02
    provides: "useTimbreChoice picker-side hook returning { timbre, setTimbre }; dispatches 'hrv:prefs-changed' with detail.key === 'timbre'"
  - phase: 14-prefs-foundation
    provides: "TimbreId / TIMBRE_OPTIONS / DEFAULT_TIMBRE locked (D-01/D-04)"
  - phase: 15-settingsdialog-shell
    provides: "TimbrePicker stub file + { disabled: boolean } prop contract (D-02/D-17); SettingsDialog already wires <TimbrePicker disabled={inSessionView} />"
  - phase: 16-themes
    provides: "ThemePicker.tsx — the verbatim mirror template (D-06)"
  - phase: 16.1-ui-token-migration
    provides: "var(--color-breathing-*) token cascade + theme.no-hardcoded-classes.test.ts guard (D-19)"
provides:
  - "TimbrePicker.tsx — real 4-option radiogroup (Bowl / Bell / Sine / Chime) bound to useTimbreChoice; user-facing selection surface for TIMBRE-01"
  - "TimbrePicker.test.tsx — full radiogroup coverage at parity with ThemePicker.test.tsx (8 it-blocks)"
affects:
  - "18-06 (App integration): the picker now writes to localStorage; Plan 06 wires `loadPrefs().timbre` into `audio.start(plan, prefs.timbre)` at session start to close TIMBRE-03"

# Tech tracking
tech-stack:
  added: []  # zero net-new deps (D-14)
  patterns:
    - "Picker component verbatim mirror of ThemePicker (D-06 name-only radiogroup)"
    - "loadPrefs read removed — useTimbreChoice owns both read + write paths"
    - "grid-cols-2 (2x2) for 4-option pickers (variation on ThemePicker grid-cols-3 for 6 options)"

key-files:
  created: []
  modified:
    - "src/components/TimbrePicker.tsx"
    - "src/components/TimbrePicker.test.tsx"
    - "src/components/SettingsDialog.test.tsx"

key-decisions:
  - "grid-cols-2 (2x2) for the 4 timbres — chosen over grid-cols-4 (1x4) per the plan's D-06 starting point. The 2x2 layout matches the native dialog mobile width comfortably; no smoke-test-driven swap to grid-cols-4 needed."
  - "Phase 15 stub assertion in SettingsDialog.test.tsx (`Timbre: bowl` text) updated to assert the picker section label `Timbre` instead — verbatim mirror of the Phase 17 fix at lines 108-109 for the variant picker stub. The production SettingsDialog.tsx is untouched (D-16); only its sibling test file is updated to reflect the picker behavior change Plan 05 introduces."
  - "Capitalize formula `id.charAt(0).toUpperCase() + id.slice(1)` copied verbatim from ThemePicker.tsx:31 (D-06 mirror). Labels render as Bowl / Bell / Sine / Chime."

requirements-completed:
  - TIMBRE-01
  - TIMBRE-04

# Metrics
duration: 10min
completed: 2026-05-14
---

# Phase 18 Plan 05: TimbrePicker Radiogroup Body Summary

**Fills the Phase 15 `TimbrePicker.tsx` read-only stub with a 4-option radiogroup (Bowl / Bell / Sine / Chime) — verbatim mirror of `ThemePicker.tsx` (D-06) bound to `useTimbreChoice` (Plan 02). User-facing selection surface for TIMBRE-01 lands; Plan 06 captures the chosen timbre at session start to close TIMBRE-03.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-14T16:00:00Z
- **Completed:** 2026-05-14T16:10:00Z
- **Tasks:** 3 (Task 1: TimbrePicker.tsx rewrite; Task 2: TimbrePicker.test.tsx rewrite; Task 3: global green-gate + single commit)
- **Files modified:** 3 (TimbrePicker.tsx, TimbrePicker.test.tsx, SettingsDialog.test.tsx — see deviations below)

## Accomplishments

- `src/components/TimbrePicker.tsx` (~52 LOC after rewrite, was 26 LOC stub) — Phase 15 read-only stub body replaced with the verbatim ThemePicker mirror. Four-option radiogroup over `TIMBRE_OPTIONS` bound to `useTimbreChoice` (Plan 02) for read + write. `grid-cols-2` 2x2 layout for the 4 timbres. All chrome via `var(--color-breathing-*)` tokens. `loadPrefs` import removed (useTimbreChoice owns the read).
- `src/components/TimbrePicker.test.tsx` (~109 LOC after rewrite, was 27 LOC stub) — Phase 15 stub test (3 cases asserting "Timbre: bowl" read-only text) replaced with 8 it-blocks at parity with `ThemePicker.test.tsx`: section label, 4 capitalized button labels in order (Bowl/Bell/Sine/Chime), aria-checked reflects stored timbre, click writes to disk via useTimbreChoice, click dispatches 'hrv:prefs-changed' with detail.key === 'timbre', disabled gates both DOM disabled + aria-disabled, disabled blocks the write path, selected aria-checked persists when disabled.
- `src/components/SettingsDialog.test.tsx` — single-line update at line 111 (deviation Rule 1, see below): replaced `getByText('Timbre: bowl')` (Phase 15 stub assertion) with `getByText('Timbre')` (real picker section label). Verbatim mirror of the Phase 17 fix at lines 108-109 for the variant picker stub. Production `SettingsDialog.tsx` is NOT edited (D-16 hard invariant held).
- Test count delta: TimbrePicker.test.tsx went from 3 → 8 it-blocks (+5 net). SettingsDialog.test.tsx unchanged it-block count (1 assertion replaced, not added). Worktree-level test count went from 637 (Plan 04 baseline) to 642 (+5).
- Zero touches to: production `SettingsDialog.tsx` (D-16); `domain/settings.ts` and `storage/prefs.ts` (D-15 / Phase 14 D-09 file-split); `App.tsx`, `useAudioCues.ts`, `cueSynth.ts`, `audioEngine.ts`, `audio/timbres.ts` (Plan 06 scope or Plan 03/04 scope).
- Zero new npm dependencies (D-14 invariant preserved).

## Final Grid Choice

**grid-cols-2 (2x2 layout).** The plan's D-06 starting point — the four timbres fit comfortably in a 2x2 grid at native dialog mobile width. No dev-server smoke-test-driven swap to grid-cols-4 (1x4) was needed; the 2x2 visually balances the 4 options and uses screen height efficiently in the same vertical space ThemePicker uses for its 3x2 (6-option) layout. Per the plan: "If smoke-test reveals 4 buttons too wide for the dialog max-w, the executor may swap to `grid-cols-4` (1×4) — record the choice in the SUMMARY." Smoke test of dialog dimensions was not required because grid-cols-2 is the same row-width as ThemePicker's grid-cols-3 (3 cols ≥ 2 cols on the same gap).

## D-19 THEME-UI-01 Guard

**Green confirmation:** `npm test -- src/styles/theme.no-hardcoded-classes.test.ts --run` exits 0; all 10 banned palette utilities (`text-slate-N`, `bg-slate-N`, `border-slate-N`, `text-teal-N`, `bg-teal-N`, `border-teal-N`, `text-white`, `bg-white`, `text-black`, `bg-black`) absent from production `.tsx` files including `TimbrePicker.tsx`. Every color reference in TimbrePicker.tsx goes through `var(--color-breathing-*)` tokens (accent / accent-strong / surface / bg-soft) — verbatim copy from ThemePicker.tsx:32-34.

## Task Commits

1. **Tasks 1-3 (collapsed per plan Task 3 instruction)** — `54dc107` (`feat(18-05): fill TimbrePicker radiogroup body (TIMBRE-01/04)`)

The plan explicitly directs a single commit at Task 3 covering both the picker file (Task 1) and the test file (Task 2). The plan's Task 3 action: "Stage `src/components/TimbrePicker.tsx` + `src/components/TimbrePicker.test.tsx` and commit with message `feat(18-05): fill TimbrePicker radiogroup body (TIMBRE-01/04)`." Plus the deviation-driven `SettingsDialog.test.tsx` single-line fix (see Deviations).

## Files Created/Modified

- **`src/components/TimbrePicker.tsx`** (modified) — Phase 15 stub body replaced with the ThemePicker-mirror radiogroup. `loadPrefs` import removed; `useTimbreChoice` + `TIMBRE_OPTIONS` + `TimbreId` imported. Component signature unchanged.
- **`src/components/TimbrePicker.test.tsx`** (modified) — Phase 15 stub test replaced with the full 8-case radiogroup coverage at parity with ThemePicker.test.tsx.
- **`src/components/SettingsDialog.test.tsx`** (modified — deviation Rule 1) — line 111 stub assertion updated to reflect the real picker section label. Mirror of the Phase 17 line-108-109 fix for the variant picker stub.

## Green Gate Verification

All four gates exit 0 at the commit boundary (D-13):

- `npx tsc --noEmit` — clean (zero diagnostics)
- `npm run lint` — eslint clean (zero violations)
- `npm run build` — built 60 modules, 250.36 kB JS / 41.55 kB CSS, 153ms (no new asset)
- `npm test --run` — 48 test files, 642 tests passed (delta +5 vs. Plan 04 baseline of 637)

`theme.no-hardcoded-classes.test.ts` (D-19 THEME-UI-01 guard) explicitly re-verified post-edit: 10/10 tests green.

## Decisions Made

- **grid-cols-2 vs grid-cols-4:** Selected grid-cols-2 (2x2) per the plan's D-06 starting point. The 4 buttons fit comfortably without a dev-server smoke test because ThemePicker.tsx's grid-cols-3 (3-wide) is the established mobile-comfortable upper bound; grid-cols-2 is narrower and inherits the same `gap-2` + `min-h-12 px-3 py-2 text-sm` button shape. No swap to grid-cols-4 needed.
- **SettingsDialog.test.tsx single-line fix:** Treated as a Rule 1 auto-fix (bug — stale assertion broken by Plan 05's intentional picker behavior change). The fix is the exact mirror of how Phase 17 handled the same situation for the variant picker. The production `SettingsDialog.tsx` is untouched — D-16 invariant references the production file, not its test file. Documented as a deviation below for transparency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale Phase 15 stub assertion in SettingsDialog.test.tsx**

- **Found during:** Task 3 (global green-gate)
- **Issue:** `src/components/SettingsDialog.test.tsx:111` asserts `screen.getByText('Timbre: bowl')` — the Phase 15 stub's "Timbre: bowl" read-only text that no longer renders after Plan 05 replaces the stub with the real radiogroup. The global `npm test --run` reported 1 failed test against this assertion ("Tests  1 failed | 641 passed").
- **Fix:** Updated line 111 from `expect(screen.getByText('Timbre: bowl')).toBeInTheDocument()` to `expect(screen.getByText('Timbre')).toBeInTheDocument()` (asserting the real picker's section label paragraph). Verbatim mirror of the Phase 17 fix at lines 108-109 of the same file, which made the equivalent transition for the variant picker stub (`Variant: orb` → `Variant`). The comment block (lines 108-110) was updated in tandem to reflect that Phase 18 has now replaced its stub too, leaving only the Language picker stub for Phase 19.
- **Why this is in scope:** The broken assertion is *directly caused* by Plan 05's intentional behavior change (the picker no longer renders `Timbre: bowl` text). Per the deviation rules, this is exactly the kind of "fix issues DIRECTLY caused by the current task's changes" Rule 1 covers. The production `SettingsDialog.tsx` is untouched — D-16 invariant preserved.
- **Files modified:** `src/components/SettingsDialog.test.tsx` (single-line update at line 111; companion comment update at lines 108-110).
- **Commit:** `54dc107` (rolled into the single plan commit per Task 3 directive).
- **Plan verify-grep note:** The plan's Task 3 verify command `! git show --stat HEAD | grep -E "(SettingsDialog|App\.tsx|...)"` would *literally* match the staged `SettingsDialog.test.tsx`. Interpreted in spirit: the verify is guarding against editing the *production* `SettingsDialog.tsx` (per D-16 / D-17), not its sibling test file. The test-file rename is forced by Plan 05's behavior change — exact parallel to Phase 17 Plan 06, which also updated this test file when the variant picker landed (as evidenced by the surviving comment block at lines 99-109 documenting that prior fix).

## Issues Encountered

None besides the deviation documented above. The verbatim-mirror posture meant zero design choices; mechanical substitution of theme→timbre tokens across the picker file and the test file (mirror of ThemePicker.test.tsx).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 06 (App integration):** This is the final Phase 18 plan. It wires `loadPrefs().timbre` into `audio.start(plan, prefs.timbre)` at session start inside `App.tsx`'s `onStartClick`, captured-at-Start per D-09/D-10. The picker now writes the user's selection to localStorage (Plan 05 closed); Plan 06 closes the read-and-forward path. After Plan 06, all 5 TIMBRE requirements (TIMBRE-01..05) are satisfied.
- **No blockers** for Plan 06. The picker is functional in SettingsDialog now: opening Settings → Timbre section shows 4 buttons; selecting one writes to storage; the change takes effect on the next session Start.
- **Forward-decl:** Phase 19 (Language Switching) — the picker label "Timbre" + 4 button labels (Bowl/Bell/Sine/Chime) will need translation routing via the `UiStrings` map. D-06's name-only choice keeps this surface to exactly 5 strings × locale.
- **Parallel-execution note:** This plan ran in parallel with Plan 06. Plan 06 modifies `App.tsx` to add the `loadPrefs().timbre` read site; Plan 05 only touched `TimbrePicker.tsx` + `TimbrePicker.test.tsx` (and as documented above, a one-line update in `SettingsDialog.test.tsx`). No file conflicts with Plan 06's stated scope.

## Self-Check: PASSED

- `[FOUND]` `src/components/TimbrePicker.tsx` (verified `[ -f ... ]`)
- `[FOUND]` `src/components/TimbrePicker.test.tsx`
- `[FOUND]` `src/components/SettingsDialog.test.tsx`
- `[FOUND]` commit `54dc107` (`feat(18-05): fill TimbrePicker radiogroup body (TIMBRE-01/04)`) via `git log --oneline -1`
- `[FOUND]` All four green-gate commands (tsc / lint / build / test) exit 0 at the commit boundary
- `[FOUND]` Theme guard `theme.no-hardcoded-classes.test.ts` green (10/10 patterns)
- `[FOUND]` 8 it-blocks in TimbrePicker.test.tsx (parity with ThemePicker.test.tsx)
- `[FOUND]` `aria-checked`, `'hrv:prefs-changed'`, and `disabled` assertions present; `Timbre: bowl` Phase 15 stub assertion absent from test file
- `[FOUND]` Production `src/components/SettingsDialog.tsx` NOT in `git show --stat HEAD` (D-16 preserved)
- `[FOUND]` Production `src/domain/settings.ts`, `src/storage/prefs.ts`, `src/app/App.tsx`, `src/hooks/useAudioCues.ts`, `src/audio/*.ts` NOT in `git show --stat HEAD` (D-15 + Plan 03/04/06 scope preserved)

---
*Phase: 18-audio-timbres*
*Completed: 2026-05-14*
