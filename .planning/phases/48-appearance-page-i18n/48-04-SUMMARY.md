---
phase: 48-appearance-page-i18n
plan: "04"
subsystem: ui
tags: [appearance-page, navigation, focus-restoration, pickers, toggles, i18n, dark-theme, uat]
dependency_graph:
  requires:
    - 48-01 (UiStrings.appearance namespace + theme rename — all strings consumed here)
    - 48-02 (AppNavigation hook + vm.dialogs.* callbacks + returningFromAppearance sentinel)
    - 48-03 (OrbPicker + RingCuePicker components)
    - src/hooks/useOrbIdleChoice.ts (Phase 47 — boolean adapter for orbIdle)
    - src/hooks/useSwitcherIconChoice.ts (Phase 47 — direct boolean binding)
  provides:
    - src/app/pages/AppearancePage.tsx
    - src/app/pages/AppearancePage.test.tsx
    - AppSettingsPage trailing right-chevron + conditional mount-focus (D-13)
    - AppSettingsPage.test.tsx D-17 focus-restoration assertions
    - ScreenRouter fourth case 'appearance' + new dialogs props forwarded to AppSettingsPage
    - ScreenRouter.test.tsx Pitfall-5 fixture cleanup + fourth-case test
  affects:
    - End-user flow: App Settings → Appearance → back with focus on source chevron
    - All Phase 47 choice hooks: live-updating via existing hrv:prefs-changed event contract
tech_stack:
  added: []
  patterns:
    - AppearancePage mirrors AppSettingsPage page-chrome structure (paste-and-rename analog)
    - Inline private SectionCard helper copied verbatim from SettingsPanelBody.tsx:36-55 (D-10 RESEARCH OQ#4)
    - Boolean-to-union adapter for useOrbIdleChoice: orbIdle === 'ambient' ↔ checked boolean
    - D-13 conditional mount-focus: useEffect with [returningFromAppearance] dep array
    - AppSettingsPage.test.tsx D-17 assertions coupled into 04-03 commit (Rule 3 dependency ordering)
key_files:
  created:
    - src/app/pages/AppearancePage.tsx
    - src/app/pages/AppearancePage.test.tsx
  modified:
    - src/app/pages/AppSettingsPage.tsx
    - src/app/pages/AppSettingsPage.test.tsx
    - src/app/ScreenRouter.tsx
    - src/app/ScreenRouter.test.tsx
decisions:
  - "D-10: Both Visual-section toggles are inline SettingsToggleRow instances on AppearancePage (NOT extracted); only the two pickers from Plan 03 are dedicated components"
  - "D-13: AppSettingsPage mount useEffect reads returningFromAppearance prop; if true focuses chevronButtonRef, else focuses backButtonRef; dep array [returningFromAppearance]"
  - "D-15: AppearancePage.test.tsx integration test suite with 9+ cases covering title, back-chevron, onBack, two radiogroups, two switches, mount-focus, picker writes, toggle writes"
  - "D-17: AppSettingsPage.test.tsx focus-restoration assertions: sentinel=false focuses back-chevron, sentinel=true focuses right-chevron; plus renders-and-clicks-chevron test"
  - "Pitfall-5 fixture cleanup: removed stale install.showBanner + install.onDismiss from ScreenRouter.test.tsx makeVmForScreen helper (J18.4 drift-guard fields)"
  - "D-17 assertions landed in 04-03 commit (coupled with AppSettingsPage.tsx changes, Rule 3 ordering)"
  - "Pre-checkpoint lint cleanup committed separately as c2481f4 to resolve lint errors before gate"
  - "APPEAR-06 resolved via operator UAT on 2026-05-26 (approved) — no automated assertion possible for visual chrome in both themes + viewports"
metrics:
  completed_date: "2026-05-26"
  tasks_completed: 6
  tasks_total: 6
  files_created: 2
  files_modified: 4
---

# Phase 48 Plan 04: AppearancePage + Router Wiring Summary

End-to-end Appearance flow shipped: new AppearancePage with Orb Style section (two pickers) + Visual section (two toggles); AppSettingsPage extended with trailing right-chevron + conditional mount-focus sentinel (D-13); ScreenRouter fourth case for 'appearance'; operator UAT approved 2026-05-26 covering Light + Dark themes, mobile + desktop viewports, EN + PT-BR locales.

## Performance

- **Duration:** ~35 min (Tasks 04-01 through 04-05) + UAT gate
- **Started:** 2026-05-26
- **Completed:** 2026-05-26T (operator approved)
- **Tasks:** 6 (5 auto + 1 human-verify checkpoint, all complete)
- **Files created:** 2
- **Files modified:** 4

## Accomplishments

- **AppearancePage.tsx** — new page with full Mono Zen chrome: PageShell + TopAppBar + back-chevron (D-07 aria) + inline private SectionCard helper (D-10 RESEARCH OQ#4) + two sections (Orb Style / Visual). Section 1: OrbPicker + RingCuePicker inside a `grid gap-4` card. Section 2: two SettingsToggleRow instances bound to useOrbIdleChoice (boolean adapter: `orbIdle === 'ambient'`) and useSwitcherIconChoice (direct boolean). Mount-focus on backButtonRef.
- **AppearancePage.test.tsx** — 9+ integration test cases: title h1, back-chevron aria, onBack invocation, two radiogroups, two switches, mount-focus, picker click → localStorage breathingShape, Breathing effect toggle → orbIdle=ambient, Switcher icons toggle → switcherIcon=true. Uses real localStorage per RESEARCH OQ#5 convention. No hook mocks.
- **AppSettingsPage.tsx** — extended with `onAppearanceOpen` + `returningFromAppearance` props; second ref `chevronButtonRef`; conditional mount-focus useEffect with `[returningFromAppearance]` dep array (D-13); TopAppBar trailing slot holds ChevronRightIcon IconButton with locked aria-label `Appearance settings`.
- **AppSettingsPage.test.tsx** — renderPage helper extended with two new props + defaults; original single mount-focus test replaced by two scoped D-17 cases (sentinel=false focuses back, sentinel=true focuses chevron) plus renders-and-clicks-chevron APPEAR-01 case.
- **ScreenRouter.tsx** — fourth `case 'appearance':` dispatching `<AppearancePage onBack={vm.dialogs.onBackToAppSettings} />`; appSettings case forwards `onAppearanceOpen` + `returningFromAppearance`.
- **ScreenRouter.test.tsx** — AppearancePage mock added; makeVmForScreen fixture extended with three new dialogs fields; stale install.showBanner + install.onDismiss purged (Pitfall-5 cleanup); new appearance-case test green; content.no-removed-keys J18.4 drift-guard stays green.

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 04-01 | Create AppearancePage.tsx — chrome + sections + pickers + toggles | 1e2aeb8 | src/app/pages/AppearancePage.tsx |
| 04-02 | Add AppearancePage.test.tsx integration test (D-15) | dbd4c52 | src/app/pages/AppearancePage.test.tsx |
| 04-03 + 04-04 | Extend AppSettingsPage — right-chevron + conditional focus (D-13, D-17) | ccc9d5b | src/app/pages/AppSettingsPage.tsx, src/app/pages/AppSettingsPage.test.tsx |
| 04-05 | Add ScreenRouter fourth case + Pitfall-5 fixture cleanup | 6d4936b | src/app/ScreenRouter.tsx, src/app/ScreenRouter.test.tsx |
| (pre-checkpoint) | Resolve lint errors before checkpoint gate | c2481f4 | (lint cleanup) |
| 04-06 | Human visual verification — APPEAR-06 approved by operator | — | (verification-only, no files written) |

## Decisions Honored

- **D-10:** Both toggles inline on AppearancePage; inline private SectionCard helper not exported (RESEARCH OQ#4)
- **D-13:** Conditional mount-focus with `[returningFromAppearance]` dep; chevronButtonRef re-created on each mount; sentinel cleared by Plan 02 contract on every non-back transition
- **D-15:** 9+ integration test cases in AppearancePage.test.tsx covering all specified assertions
- **D-17:** renderPage helper extended; original single test replaced by two scoped focus-restoration cases; third chevron-click test added
- **Pitfall-5:** stale install.showBanner + install.onDismiss removed from ScreenRouter.test.tsx fixture; J18.4 drift-guard stays green
- **APPEAR-06:** Visual chrome in both Light + Dark themes, mobile + desktop viewports, EN + PT-BR locales verified by operator UAT (approved 2026-05-26)

## Phase 48 Memory Rules Honored

- `[[project_breathing_label_width]]` — breathing.inhale/exhale labels NOT touched anywhere in this plan
- `[[project_v16_visual_locks]]` / `[[feedback_spike_implementation_fidelity]]` — no new Tailwind classes, hex literals, or design tokens introduced; all primitives (PageShell, TopAppBar, SectionCard, SettingsSectionHeader, SettingsToggleRow) used by reference with locked values
- `[[feedback_no_design_locking]]` — no Tailwind classes, hex values, or deleted-code references appear in any test assertions; all assertions bind to typed `UI_STRINGS.en.*` catalog values
- Pickers constructed verbatim from LanguagePicker shape (D-10 — RESEARCH §Shared Pattern D)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] D-17 assertions (Task 04-04) subsumed into Task 04-03 commit**
- **Found during:** Task 04-03 execution
- **Issue:** AppSettingsPage.test.tsx required the new `onAppearanceOpen` and `returningFromAppearance` props immediately after AppSettingsPage.tsx was changed — the test file would not compile with the old renderPage signature against the new required props. Keeping them as two separate commits would leave the suite broken between 04-03 and 04-04.
- **Fix:** Both AppSettingsPage.tsx (D-13) and AppSettingsPage.test.tsx (D-17) changes were committed together in commit `ccc9d5b`.
- **Files modified:** src/app/pages/AppSettingsPage.tsx + src/app/pages/AppSettingsPage.test.tsx
- **Commit:** ccc9d5b

**2. [Rule 1 - Bug] Pre-checkpoint lint cleanup — separate commit c2481f4**
- **Found during:** Pre-checkpoint gate run (`npm run lint`)
- **Issue:** Lint errors surfaced after all five implementation tasks were committed; the plan did not include a lint-cleanup step.
- **Fix:** Resolved lint errors in a separate commit before presenting the checkpoint gate to the operator.
- **Files modified:** (lint cleanup across modified files)
- **Commit:** c2481f4

No other deviations — all five implementation tasks executed per plan specification.

## Human Verification (Task 04-06 — APPEAR-06)

**Type:** checkpoint:human-verify  
**Gate:** blocking (no automated assertion possible for visual chrome in both themes + viewports)  
**Verification coverage:**
- Light theme — desktop + mobile viewports
- Dark theme — desktop + mobile viewports (dark-theme token collapse check per `[[project_dark_theme_token_collapse]]`)
- EN locale — all copy strings rendered
- PT-BR locale — draft strings (`Aparência`, `Estilo do orbe`, `Visual`, etc.) rendered
- Navigation flow: App Settings → right-chevron → Appearance → back → focus on source chevron
- Focus restoration: fresh App Settings entry focuses back-chevron (sentinel=false)
- Live updates: picker clicks and toggle changes propagated to practice surface
- Persistence: orb variant persists across page reload

**Operator verdict:** `approved` on 2026-05-26  
**All 14 confirmation steps held.**

## Known Stubs

None. All four choice-hook bindings (OrbPicker, RingCuePicker, Breathing effect toggle, Switcher icons toggle) are wired to live Phase 47 hooks reading from real localStorage. No hardcoded empty values or placeholder text. PT-BR strings are draft values (non-empty) with `// TODO: native-speaker review` markers — intentional per D-09; I18N-04 governs the native-speaker pass.

## Threat Surface Scan

No new threat surface beyond the plan's registered threat model. Confirmed:
- `grep -n "savePrefs\|loadPrefs\|dispatchEvent" src/app/pages/AppearancePage.tsx` = 0 hits (T-48-04-01 + T-48-04-03 mitigated)
- `grep -n "showBanner\|onDismiss" src/app/ScreenRouter.test.tsx` = 0 hits (T-48-04-05 mitigated — Pitfall-5 cleanup)
- No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/app/pages/AppearancePage.tsx | FOUND |
| src/app/pages/AppearancePage.test.tsx | FOUND |
| src/app/pages/AppSettingsPage.tsx (modified) | FOUND |
| src/app/pages/AppSettingsPage.test.tsx (modified) | FOUND |
| src/app/ScreenRouter.tsx (modified) | FOUND |
| src/app/ScreenRouter.test.tsx (modified) | FOUND |
| .planning/phases/48-appearance-page-i18n/48-04-SUMMARY.md | FOUND |
| Commit 1e2aeb8 (AppearancePage.tsx) | FOUND |
| Commit dbd4c52 (AppearancePage.test.tsx) | FOUND |
| Commit ccc9d5b (AppSettingsPage D-13 + D-17) | FOUND |
| Commit 6d4936b (ScreenRouter fourth case + Pitfall-5) | FOUND |
| Commit c2481f4 (pre-checkpoint lint cleanup) | FOUND |
| Post-UAT gate: 1274/1274 tests | PASSED |
| Post-UAT gate: npm run build | PASSED |
| Post-UAT gate: npm run lint | PASSED |
| Operator UAT approval (APPEAR-06) | APPROVED 2026-05-26 |
