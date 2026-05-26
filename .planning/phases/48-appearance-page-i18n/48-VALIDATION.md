---
phase: 48
slug: appearance-page-i18n
status: locked
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-26
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 (jsdom env) |
| **Config file** | Integrated via Vite; `vitest.setup.ts` at repo root |
| **Quick run command** | `npm test -- src/app/pages/AppearancePage.test.tsx src/components/OrbPicker.test.tsx src/components/RingCuePicker.test.tsx --run` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~25 seconds (full suite); ~5 seconds (phase-scoped quick run) |

---

## Sampling Rate

- **After every task commit:** Run the focused test for the file being edited (e.g. `npm test -- src/components/OrbPicker.test.tsx --run`). All test runs use `--run` to disable watch mode.
- **After every plan wave:** Run the affected file group (e.g. all `src/components/*Picker.test.tsx` + `src/app/pages/Appearance*.test.tsx` + `src/app/useAppNavigation.test.tsx` + `src/app/ScreenRouter.test.tsx`).
- **Before `/gsd:verify-work`:** Full suite green: `npm run test:run` AND `npm run build` (typecheck) AND `npm run lint`.
- **Max feedback latency:** ~5 seconds for the per-task focused command.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 48-01-01 | 01 | 1 | I18N-01 / I18N-02 / I18N-03 | T-48-01-01 | Static i18n literals; React 19 auto-escapes JSX interpolations | unit | `npm run test:run -- src/content/strings.test.ts src/content/lockedCopy.test.ts` | ✅ (extends existing `strings.test.ts` + `lockedCopy.test.ts`) | ⬜ pending |
| 48-01-02 | 01 | 1 | I18N-01 | — | N/A (string-reference rename only) | typecheck | `npm run build` | ✅ (existing `SettingsPanelBody.tsx` consumer) | ⬜ pending |
| 48-01-03 | 01 | 1 | I18N-02 | T-48-01-03 | Allowlist is a fixed `RegExp[]` of explicit `appearance.*` shapes — no free-form wildcard | unit | `npm run test:run -- src/content/content.no-review-markers.test.ts src/content/lockedCopy.test.ts` | ✅ (modifies existing drift-guard) | ⬜ pending |
| 48-01-04 | 01 | 1 | I18N-01 / I18N-02 | — | N/A (assertion-only test addition) | unit | `npm run test:run -- src/content/strings.test.ts` | ✅ (extends existing per-phase describe-block convention) | ⬜ pending |
| 48-02-01 | 02 | 1 | APPEAR-01 / APPEAR-02 | — | N/A (in-memory router state machine; no input surface) | unit | `npm run test:run -- src/app/useAppNavigation.test.tsx` | ✅ (extends existing test file with 4 new transition tests per D-16) | ⬜ pending |
| 48-02-02 | 02 | 1 | APPEAR-01 / APPEAR-02 | — | N/A (interface extension only) | typecheck | `npm run build` | ✅ (existing `appViewModel.ts`) | ⬜ pending |
| 48-02-03 | 02 | 1 | APPEAR-01 / APPEAR-02 | — | N/A (propagation-only adapter) | typecheck | `npm run build` | ✅ (existing `appControllerAdapters.ts` at line 209-223) | ⬜ pending |
| 48-03-01 | 03 | 1 | APPEAR-03 | T-48-04-03 | Picker uses Phase 47 hook setter only; no ad-hoc `dispatchEvent` | unit | `npm run test:run -- src/components/OrbPicker.test.tsx` | ❌ Wave 0 (new file `src/components/OrbPicker.test.tsx`) | ⬜ pending |
| 48-03-02 | 03 | 1 | APPEAR-03 | T-48-04-03 | Picker uses Phase 47 hook setter only; no ad-hoc `dispatchEvent` | unit | `npm run test:run -- src/components/RingCuePicker.test.tsx` | ❌ Wave 0 (new file `src/components/RingCuePicker.test.tsx`) | ⬜ pending |
| 48-04-01 | 04 | 2 | APPEAR-02 / APPEAR-04 / APPEAR-06 | T-48-04-01 / T-48-04-03 | AppearancePage never calls `savePrefs`/`loadPrefs`/`dispatchEvent` (acceptance criterion grep = 0 hits) | typecheck | `npm run build` | ❌ Wave 0 (new file `src/app/pages/AppearancePage.tsx`) | ⬜ pending |
| 48-04-02 | 04 | 2 | APPEAR-02 / APPEAR-04 / APPEAR-05 | T-48-04-03 | Integration test uses real `localStorage`; no hook mocks (RESEARCH OQ#5) | integration | `npm run test:run -- src/app/pages/AppearancePage.test.tsx` | ❌ Wave 0 (new file `src/app/pages/AppearancePage.test.tsx`) | ⬜ pending |
| 48-04-03 | 04 | 2 | APPEAR-01 / APPEAR-02 | T-48-04-04 | `chevronButtonRef` is component-scoped; `useEffect` deps `[returningFromAppearance]` re-run focus logic on sentinel change | typecheck | `npm run build` | ✅ (existing `AppSettingsPage.tsx`) | ⬜ pending |
| 48-04-04 | 04 | 2 | APPEAR-01 / APPEAR-02 | T-48-04-04 | Sentinel-aware focus tested via `renderPage` helper with default + true branches | integration | `npm run test:run -- src/app/pages/AppSettingsPage.test.tsx` | ✅ (extends existing test file) | ⬜ pending |
| 48-04-05 | 04 | 2 | APPEAR-01 / APPEAR-02 | T-48-04-05 | Stale `install.showBanner` / `install.onDismiss` fixture fields removed per RESEARCH §Pitfall 5; J18.4 drift-guard stays green | unit | `npm run test:run -- src/app/ScreenRouter.test.tsx` | ✅ (extends existing test file) | ⬜ pending |
| 48-04-06 | 04 | 2 | APPEAR-06 | — | Visual chrome verification requires operator eyes (Light/Dark themes + mobile/desktop viewports + locale switch) | manual-only | (operator UAT — `npm run dev` + 14-step verification per PLAN.md Task 04-06) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/OrbPicker.test.tsx` — new file; covers APPEAR-03 orb picker behaviour (D-14 mirror of `LanguagePicker.test.tsx`).
- [ ] `src/components/RingCuePicker.test.tsx` — new file; covers APPEAR-03 ring cue picker behaviour (D-14).
- [ ] `src/app/pages/AppearancePage.test.tsx` — new file; covers APPEAR-02 + APPEAR-04 + APPEAR-05 page-level behaviour (D-15 integration test).
- [ ] Extension to `src/app/pages/AppSettingsPage.test.tsx` — adds right-chevron presence/click + sentinel-aware focus tests (APPEAR-01 + APPEAR-02 per D-17).
- [ ] Extension to `src/app/useAppNavigation.test.tsx` — adds 4 new transition tests (D-16: open, back-with-sentinel, sentinel-cleared on subsequent nav, `closeOnSessionView` resets sentinel).
- [ ] Extension to `src/app/ScreenRouter.test.tsx` — adds 4th case assertion + cleans up stale `install` fixture fields (RESEARCH §Pitfall 5).
- [ ] Extension to `src/content/strings.test.ts` — new `describe('Phase 48 appearance.* and theme rename', ...)` block mirroring the existing per-phase convention (analog at lines 219-251 for `Phase 32 new learn.* heading keys`).
- [ ] Modification to `src/content/content.no-review-markers.test.ts` — D-18 path (a): structural `ALLOWED_KEY_PATTERNS: RegExp[]` allowlist scoped to `appearance.*` value-line shapes.

**Framework install:** None — Vitest 4.1.5, `@testing-library/react` 16.3.2, `@testing-library/user-event` 14.6.1, and TypeScript ~6.0.2 are already devDependencies.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Appearance page renders the locked Mono Zen chrome (`PageShell` + `TopAppBar` + `SectionCard` borders + segmented controls + toggles) in both Light AND Dark themes | APPEAR-06 | Visual regression of spike-010 locked chrome has no automated assertion possible; `[[project_dark_theme_token_collapse]]` + `[[project_v16_visual_locks]]` require operator eyes on the rendered design | Plan 04 Task 04-06 — 14-step UAT script under `<how-to-verify>` (run `npm run dev`, walk Light/Dark themes, mobile/desktop viewports, EN/PT-BR locales) |
| Picker / toggle changes propagate live to the practice surface (orb variant changes, switcher labels swap, ring cue swaps, breathing-effect idle behaviour changes) | APPEAR-05 | The Phase 47 hook plumbing is automated-tested at the hook layer; cross-component live propagation observed in the rendered app is operator UAT | Plan 04 Task 04-06 steps 5-8 — change each control, observe the practice surface in a second tab |
| Focus restoration UX feels natural (back-from-Appearance lands on right-chevron; fresh entry lands on back-chevron) | APPEAR-01 / APPEAR-02 | Programmatic focus assertions in `AppSettingsPage.test.tsx` cover correctness; the felt-quality of the transition (delay, visibility of focus ring) is operator UAT | Plan 04 Task 04-06 steps 9-10 — exercise the back-from-Appearance flow + fresh-entry flow; Tab to confirm focus position if the visual indicator is subtle |
| PT-BR draft strings render correctly in the locale-switched flow | I18N-02 | Drafts are not byte-pinned (I18N-04 closes them via native-speaker pass); visual presence + non-truncation is operator UAT | Plan 04 Task 04-06 step 13 — switch locale to `Português` in App Settings → Language; re-enter Appearance; eyeball each label |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (only Task 04-06 is manual-only — APPEAR-06 has no automated assertion possible)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every code-producing task has a focused vitest command; 04-06 is the sole manual-only checkpoint at end-of-phase)
- [x] Wave 0 covers all MISSING references (8 Wave 0 items above cover every `❌ Wave 0` cell in the per-task map)
- [x] No watch-mode flags (`--run` used everywhere)
- [x] Feedback latency < 30s (full suite ~25s; per-task ~5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-26
