---
phase: 19
slug: language-switching
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
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

Plan IDs are TBD until planner assigns wave/plan slots. Table below maps phase requirements → expected test files. Planner fills `Task ID` and `Plan` columns when PLAN.md files are written.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 1 | I18N-04 | — | Catalog exhaustiveness — every `LocaleId` has every `UiStrings` key | unit | `npx vitest run src/content/strings.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | I18N-06 | — | Frozen-EN locked copy snapshot (byte-equality `.toBe(...)` not snapshot) + substring-absent guard (`forrest.body` does not contain `inspiredByForrest`) | unit | `npx vitest run src/content/lockedCopy.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | I18N-05 | — | `LEARN_CONTENT['pt-BR']` shape parity + link URLs identical | unit | `npx vitest run src/content/learnContent.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | 1 | I18N-01 | — | `useLocale` seed-from-loadPrefs + cross-tab + same-tab listeners + `documentElement.lang` write effect | unit | `npx vitest run src/hooks/useLocale.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | I18N-01 | — | `useLocaleChoice` verbatim clone of `useTimbreChoice` (loadPrefs read + savePrefs write + `'hrv:prefs-changed'` dispatch with `detail.key === 'locale'`) | unit | `npx vitest run src/hooks/useLocaleChoice.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | I18N-01 | — | LanguagePicker radiogroup posture, native endonyms in BOTH UI locales, selection writes + dispatches event, `disabled` gate | unit | `npx vitest run src/components/LanguagePicker.test.tsx` | ❌ extend | ⬜ pending |
| TBD | TBD | 2-3 | I18N-04 | — | ~15 components accept `strings` prop typed against EN UI_STRINGS slice; fixture pattern `const EN_FIXTURE = UI_STRINGS.en` | unit | `npx vitest run src/components/` | ✅ extend | ⬜ pending |
| TBD | TBD | 4 | I18N-01, I18N-06 | — | App.tsx invokes `useLocale()`, resolves `learnContent` + `lockedCopy` per render, drills slices; `App.tsx:686` medical-advice migrates to `lockedCopy.medicalAdviceLine` | integration | `npx vitest run src/app/App.test.tsx` | ✅ extend | ⬜ pending |
| TBD | TBD | 4 | I18N-02 (instant) | — | Locale switch via picker re-renders idle UI without page reload; `document.documentElement.lang === 'pt-BR'` after switch | integration | `npx vitest run src/app/App.test.tsx` | ❌ new App.locale test | ⬜ pending |
| TBD | TBD | 5 | I18N-02 (loop unaffected) | — | Breath loop continues without timing disruption mid-session locale change (cross-tab path) | manual UAT | UAT step in phase-close | n/a | ⬜ pending |
| TBD | TBD | 5 | I18N-03 | — | `Envelope.prefs.locale` round-trip + coerce fallback to `'en'` | unit | `npx vitest run src/storage/prefs.test.ts` | ✅ Phase 14 | ⬜ pending |
| TBD | TBD | 5 | I18N-07 | — | All PT-BR entries non-empty; `// TODO: native-speaker review` markers grep count > 0 | unit + grep | `grep -c "TODO: native-speaker review" src/content/*.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 5 | SC5 (green-gate) | — | `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` exits 0 | smoke | `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` | ✅ existing scripts | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/content/strings.ts` — `UiStrings` interface + `UI_STRINGS: Readonly<Record<LocaleId, UiStrings>>` + `LOCALE_DISPLAY_NAMES` (NEW)
- [ ] `src/content/strings.test.ts` — exhaustiveness check (NEW)
- [ ] `src/content/lockedCopy.ts` — `LockedCopy` interface + `LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>>` (NEW)
- [ ] `src/content/lockedCopy.test.ts` — frozen-EN snapshot (byte-equality `.toBe(...)`) + substring-absent guard against `LEARN_CONTENT[locale].forrest.body` (NEW)
- [ ] `src/hooks/useLocale.ts` — orchestrator (NEW; mirror of `useTheme.ts` with 3 effects)
- [ ] `src/hooks/useLocale.test.ts` — seed + cross-tab listener + same-tab listener + `documentElement.lang` effect (NEW)
- [ ] `src/hooks/useLocaleChoice.ts` — picker setter (NEW; verbatim clone of `useTimbreChoice.ts`)
- [ ] `src/hooks/useLocaleChoice.test.ts` — verbatim clone of `useTimbreChoice.test.ts` (NEW)
- [ ] `src/content/learnContent.ts` — convert `LEARN_CONTENT: LearnContent` → `Record<LocaleId, LearnContent>` + add `pt-BR` body (EDIT)
- [ ] `src/content/learnContent.test.ts` — extend with PT-BR shape parity + link URL identity (EDIT)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mid-session cross-tab locale swap does not interrupt breath loop timing | I18N-02 (loop unaffected) | Cross-tab `'storage'` event is rare + requires two open tabs + active breath cycle; not reliably scriptable in jsdom | Open app in two tabs, start session in tab A, change locale in tab B's SettingsDialog, verify tab A's breath ring continues without phase glitch. UAT step in phase-close plan. |
| PT-BR translation correctness spot-check | I18N-07 | Native-speaker review is explicit v1.x carry-forward; v1.1 ship accepts machine-translated quality | Operator reads PT-BR strings.ts + learnContent.ts pt-BR + lockedCopy.ts pt-BR entries; flags obvious mistranslations; remaining errors carry `// TODO: native-speaker review` marker. |
| LanguagePicker visual chrome matches sibling pickers | D-22 token-binding + D-23 a11y floor | Token-binding test guards CSS class usage but not visual parity with ThemePicker/TimbrePicker chrome | Operator opens SettingsDialog, switches between Theme/Variant/Timbre/Language pickers, confirms layout + button hit area + focus ring match siblings. |
| `<html lang>` swap perceptible to screen reader (D-07 acceptable-FOUC assumption) | I18N-01 a11y | Screen-reader voice change on first paint not automatable | (Optional) Operator with VoiceOver/NVDA toggles locale, confirms voice swap; first-paint mismatch acceptable per D-07. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
