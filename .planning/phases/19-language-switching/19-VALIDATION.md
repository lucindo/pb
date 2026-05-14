---
phase: 19
slug: language-switching
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-14
updated: 2026-05-14
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + @testing-library/react 16.3.2 + jsdom 29.1.1 |
| **Config file** | `vitest.config.ts` + `vitest.setup.ts` (FakeAudioContext + Storage + HTMLDialogElement polyfills) |
| **Quick run command** | `npx vitest run src/content src/hooks/useLocale src/hooks/useLocaleChoice src/components/LanguagePicker` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~5 sec quick / ~25 sec full (644 existing + ~30 new) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched files>` (~3-5 sec)
- **After every plan wave:** Run `npm test -- --run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green; `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` exits 0
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| I18N-04-T1 | 19-01 | 1 | I18N-04 | T-19-01,T-19-02 | UI_STRINGS catalog: every `LocaleId` has every `UiStrings` slice; LOCALE_DISPLAY_NAMES exports native endonyms (D-14) | unit | `npx vitest run src/content/strings.test.ts` | ❌ W0 (Plan 19-01 creates) | ⬜ pending |
| I18N-04-T2 | 19-01 | 1 | I18N-04 | T-19-01 | UI_STRINGS exhaustiveness + template-fn entries (D-15) + LOCALE_DISPLAY_NAMES byte-equality | unit | `npx vitest run src/content/strings.test.ts` | ❌ W0 (Plan 19-01 creates) | ⬜ pending |
| I18N-06-T2 | 19-03 | 1 | I18N-06 | T-19-06 | Frozen-EN locked copy snapshot (byte-equality `.toBe(...)` not snapshot) | unit | `npx vitest run src/content/lockedCopy.test.ts` | ❌ W0 (Plan 19-03 creates) | ⬜ pending |
| I18N-06-T3 | 19-03 | 1 | I18N-06 | T-19-07 | Substring-absent guard: `LEARN_CONTENT[locale].explainer.forrest.body.includes(LOCKED_COPY[locale].inspiredByForrest)` is false for every locale | unit | `npx vitest run src/content/lockedCopy.test.ts` | ❌ W0 (Plan 19-03 creates) | ⬜ pending |
| I18N-05-T1 | 19-03 | 1 | I18N-05 | T-19-09 | `LEARN_CONTENT['pt-BR']` shape parity + link URLs byte-identical to EN | unit | `npx vitest run src/content/learnContent.test.ts` | ✅ Phase 6 (Plan 19-03 extends) | ⬜ pending |
| I18N-05-T4 | 19-03 | 1 | I18N-05, I18N-06 | T-19-08 | PT-BR clinical-verbs negative guard parallels EN regex (`melhora|trata|cura|diagnostica|avalia`) | unit | `npx vitest run src/content/learnContent.test.ts` | ✅ Phase 6 (Plan 19-03 extends) | ⬜ pending |
| I18N-06-LD | 19-03 | 1 | I18N-06 (composition stop-gap) | — | LearnDialog.tsx stop-gap: `LEARN_CONTENT.en` + `LOCKED_COPY.en` direct access + locked-phrase paragraph composition + affiliation migration; 17 existing LearnDialog tests pass | unit | `npx vitest run src/components/LearnDialog.test.tsx` | ✅ Phase 6 (Plan 19-03 patches) | ⬜ pending |
| I18N-01-T1 | 19-04 | 2 | I18N-01 | T-19-10,T-19-11,T-19-12 | `useLocale` seed-from-loadPrefs + 3 effects (apply lang + cross-tab + same-tab) + `documentElement.lang` write effect | unit | `npx vitest run src/hooks/useLocale.test.ts` | ❌ W0 (Plan 19-04 creates) | ⬜ pending |
| I18N-01-T2 | 19-02 | 1 | I18N-01 | T-19-03,T-19-04,T-19-05 | `useLocaleChoice` verbatim clone of `useTimbreChoice`: loadPrefs read + savePrefs write + `'hrv:prefs-changed'` dispatch with `detail.key === 'locale'` | unit | `npx vitest run src/hooks/useLocaleChoice.test.ts` | ❌ W0 (Plan 19-02 creates) | ⬜ pending |
| I18N-01-T3 | 19-05 | 2 | I18N-01 | T-19-13,T-19-14,T-19-15 | LanguagePicker radiogroup posture, native endonyms in BOTH UI locales (D-14), selection writes + dispatches event, `disabled` gate | unit | `npx vitest run src/components/LanguagePicker.test.tsx` | ✅ Phase 15 (Plan 19-05 rewrites) | ⬜ pending |
| I18N-04-T3 | 19-06 | 3 | I18N-04 | T-19-16,T-19-17 | 9 components (3 dialogs + 2 anchors + 1 toggle + 3 pickers + LanguagePicker section-label widening) accept `strings` prop; EN_STRINGS_FIXTURE pattern | unit | `npx vitest run src/components/` | ✅ extend (Plan 19-06 mutates) | ⬜ pending |
| I18N-04-T3b | 19-06 | 3 | I18N-04 | — | App.tsx EN-fixture stop-gap drills `UI_STRINGS.en.<slice>` to 5 modified consumers; TS compile passes; tests pass | integration | `npx tsc --noEmit && npx vitest run src/app` | ✅ existing (Plan 19-06 patches) | ⬜ pending |
| I18N-04-T4 | 19-07 | 2 | I18N-04 | T-19-18,T-19-19 | 8 components (SettingsForm/Stepper/Controls/Footer/Readout/Breathing + 3 shapes) accept `strings` prop; D-15 template-fn aria-labels; Path A wedge for phase label | unit | `npx vitest run src/components/` | ✅ extend (Plan 19-07 mutates) | ⬜ pending |
| I18N-04-T4b | 19-07 | 2 | I18N-04 | — | App.tsx EN-fixture stop-gap drills `UI_STRINGS.en.<slice>` to 5 session-UI consumers; TS compile passes | integration | `npx tsc --noEmit && npx vitest run src/app` | ✅ existing (Plan 19-07 patches) | ⬜ pending |
| I18N-01-T5 | 19-08 | 4 | I18N-01, I18N-06 | T-19-20,T-19-21 | App.tsx invokes `useLocale()`, resolves `learnContent` + `lockedCopy` per render; medical-advice migration; LearnDialog accepts learnContent + lockedCopy + strings props; all Plan 03/06/07 stop-gaps removed | integration | `npx tsc --noEmit && npx vitest run src/app && npx vitest run src/components/LearnDialog.test.tsx` | ✅ extend (Plan 19-08 widens) | ⬜ pending |
| I18N-02-T1 | 19-09 | 5 | I18N-02 (instant) | — | Locale switch via picker re-renders idle UI without page reload; `document.documentElement.lang === 'pt-BR'` after switch | integration | `npx vitest run src/app/App.locale.test.tsx` | ❌ W0 (Plan 19-09 creates) | ⬜ pending |
| I18N-02-T2 | 19-09 | 5 | I18N-02 (loop unaffected) | — | Breath loop continues without timing disruption mid-session locale change (cross-tab path) | manual UAT | UAT-1 step in `.planning/phases/19-language-switching/19-UAT.md` | n/a (manual) | ⬜ pending |
| I18N-03-T1 | 19-09 | 5 | I18N-03 | — | `Envelope.prefs.locale` round-trip + coerce fallback to `'en'` | unit | `npx vitest run src/storage/prefs.test.ts` | ✅ Phase 14 (existing) | ⬜ pending |
| I18N-07-T1 | 19-09 | 5 | I18N-07 | — | All PT-BR entries non-empty; `// TODO: native-speaker review` markers grep count > 0 in strings.ts + learnContent.ts | unit + grep | `grep -c "TODO: native-speaker review" src/content/strings.ts src/content/learnContent.ts` | ✅ Plan 19-01 + Plan 19-03 outputs | ⬜ pending |
| SC5-T1 | 19-09 | 5 | SC5 (green-gate) | — | `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` exits 0 at every commit boundary (D-16) | smoke | `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` | ✅ existing scripts | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/content/strings.ts` — `UiStrings` interface + `UI_STRINGS: Readonly<Record<LocaleId, UiStrings>>` + `LOCALE_DISPLAY_NAMES` (Plan 19-01 Task 1)
- [x] `src/content/strings.test.ts` — exhaustiveness check (Plan 19-01 Task 2)
- [x] `src/content/lockedCopy.ts` — `LockedCopy` interface + `LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>>` (Plan 19-03 Task 2)
- [x] `src/content/lockedCopy.test.ts` — frozen-EN snapshot (byte-equality `.toBe(...)`) + substring-absent guard against `LEARN_CONTENT[locale].forrest.body` (Plan 19-03 Task 3)
- [x] `src/hooks/useLocale.ts` — orchestrator with 3 effects (mirror of `useTheme.ts` minus the system-mode branch; Plan 19-04 Task 1)
- [x] `src/hooks/useLocale.test.ts` — seed + cross-tab listener + same-tab listener + `documentElement.lang` effect (Plan 19-04 Task 2)
- [x] `src/hooks/useLocaleChoice.ts` — picker setter (verbatim clone of `useTimbreChoice.ts`; Plan 19-02 Task 1)
- [x] `src/hooks/useLocaleChoice.test.ts` — verbatim clone of `useTimbreChoice.test.ts` (Plan 19-02 Task 2)
- [x] `src/content/learnContent.ts` — convert `LEARN_CONTENT: LearnContent` → `Readonly<Record<LocaleId, LearnContent>>` + add `pt-BR` body (Plan 19-03 Task 1)
- [x] `src/content/learnContent.test.ts` — extend with per-locale loop + PT-BR shape parity + link URL identity + PT-BR clinical-verbs guard (Plan 19-03 Task 4)
- [x] `src/app/App.locale.test.tsx` — App-level integration smoke for locale switch + documentElement.lang write (Plan 19-09 Task 1)

All Wave 0 dependencies assigned to plans + tasks. Status flipped to `wave_0_complete: true`.

---

## Manual-Only Verifications

| Behavior | Requirement | Owner Plan | Why Manual | Test Instructions |
|----------|-------------|------------|------------|-------------------|
| Mid-session cross-tab locale swap does not interrupt breath loop timing | I18N-02 (loop unaffected) | Plan 19-09 Task 2 (UAT-1) | Cross-tab `'storage'` event is rare + requires two open tabs + active breath cycle; not reliably scriptable in jsdom | Open app in two tabs, start session in tab A, change locale in tab B's SettingsDialog, verify tab A's breath ring continues without phase glitch. Record PASS/FAIL/PARTIAL in `.planning/phases/19-language-switching/19-UAT.md`. |
| PT-BR translation correctness spot-check | I18N-07 | Plan 19-09 Task 2 (UAT-2) | Native-speaker review is explicit v1.x carry-forward; v1.1 ship accepts machine-translated quality | Operator reads PT-BR strings.ts + learnContent.ts pt-BR + lockedCopy.ts pt-BR entries; flags obvious mistranslations; remaining errors carry `// TODO: native-speaker review` marker. Record findings in `19-UAT.md`. |
| LanguagePicker visual chrome matches sibling pickers | D-22 token-binding + D-23 a11y floor | Plan 19-09 Task 2 (UAT optional) | Token-binding test guards CSS class usage but not visual parity with ThemePicker/TimbrePicker chrome | Operator opens SettingsDialog, switches between Theme/Variant/Timbre/Language pickers, confirms layout + button hit area + focus ring match siblings. Record findings in `19-UAT.md`. |
| `<html lang>` swap perceptible to screen reader (D-07 acceptable-FOUC assumption) | I18N-01 a11y | Plan 19-09 Task 2 (UAT optional) | Screen-reader voice change on first paint not automatable | (Optional) Operator with VoiceOver/NVDA toggles locale, confirms voice swap; first-paint mismatch acceptable per D-07. Record findings in `19-UAT.md`. |
| Persistence across reload | I18N-03 | Plan 19-09 Task 2 (UAT-3) | Hard-refresh path easier to verify manually than to script in jsdom | Switch to PT-BR, hard-refresh, verify labels + `document.documentElement.lang === 'pt-BR'` persist. Record PASS/FAIL in `19-UAT.md`. |
| In-session disable | I18N-02 (Phase 15 D-02 carry-forward) | Plan 19-09 Task 2 (UAT-4) | Visual confirmation of disabled state + click-no-op simpler manually | Start a session, open SettingsDialog, confirm LanguagePicker buttons disabled. Record PASS/FAIL in `19-UAT.md`. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (every W0 file assigned to a Plan + Task above)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` set in frontmatter (W0 assignment audit complete post-checker revision 2026-05-14)

**Approval:** ready
