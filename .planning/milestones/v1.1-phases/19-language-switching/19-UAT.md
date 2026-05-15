# Phase 19: Language Switching — Manual UAT Log

**Date:** 2026-05-14
**Phase:** 19 — Language Switching (EN + PT-BR)
**Tester:** Operator (manual in-browser)
**Build:** post-Plan 08 integration (commit `ba1586a`) + post-UAT-2 fixes (commit `311a55e`)

---

## UAT-1: Cross-Tab Mid-Session Locale Swap (I18N-02 loop-unaffected)

**Status:** PASS

**Scenario:** Tab A running a breathing session; Tab B switches language to PT-BR via SettingsDialog.

**Steps executed:**
1. Tab A: clicked Start to begin a session at default BPM.
2. Tab B (same origin): opened SettingsDialog, switched language to Português (Brasil).
3. Returned to Tab A — observed breathing ring behavior.

**Observations:**
- In/Out phase labels swapped to PT-BR (`Puxa` / `Solta`) atomically.
- Breath timing continued without phase glitches, jumps, or stutters.
- The `storage` event listener in `useLocale` picked up the cross-tab change correctly.
- `inSessionView` guard in LanguagePicker remained active in Tab A (picker disabled mid-session as intended); the locale update arrived via `storage` event (not the picker), which is the correct and expected path per I18N-02.

**Result:** PASS — cross-tab locale swap updates labels without disrupting the breath loop.

---

## UAT-2: PT-BR Translation Spot-Check (I18N-07 carry-forward)

**Status:** PARTIAL

**Scenario:** Full idle-state UI review in PT-BR; LearnDialog + SettingsDialog inspected.

**Steps executed:**
1. Switched to Português (Brasil) via SettingsDialog in a fresh tab.
2. Reviewed all visible UI surfaces: Start button, mute toggle, gear/learn anchors, SettingsDialog (opened), all picker sections, stats footer, LearnDialog (opened — forrest section + locked-phrase paragraph + affiliation line + headings).

**Findings flagged by operator:**
- `bowl` rendered as `bowl` (English) instead of `Taça` (PT-BR) — fixed in `311a55e`.
- Mute/unmute labels overly verbose — simplified in `311a55e`.
- `Aprender` → `Aprenda` (imperative mood more natural) — fixed in `311a55e`.
- `Reiniciar` → `Zerar` for reset action — fixed in `311a55e`.
- `Entra` / `Sai` phase labels → `Puxa` / `Solta` (inhale/exhale more natural) — fixed in `311a55e`.
- `Recursos` → `Links` for resources heading — fixed in `311a55e`.
- `respiração HRV` → `respiração VFC` (Portuguese acronym for heart rate variability) — fixed in `311a55e`.
- `learnContent` PT-BR: `inalação`/`exalação` → `inspiração`/`expiração` — fixed in `311a55e`.
- 4 video titles: reverted to English originals (no PT-BR YouTube title available) — fixed in `311a55e`.
- App header/title: new `UiStrings.app` slice added (header: "PRÁTICA VFC", title: "Respiração VFC") — added in `311a55e`.
- `lockedCopy` affiliationLine PT-BR: `"Não afiliado a"` → `"Não afiliado ao"` — fixed in `311a55e`.
- `format.ts` D-25: optional locale arg added for locale-aware date formatting — added in `311a55e`.
- `StatsFooter` accepts `locale?: LocaleId` prop for locale-aware date display — added in `311a55e`.

**Carry-forward (intentional, not blocking):**
- PT-BR strings throughout `strings.ts` and `learnContent.ts` still carry `// TODO: native-speaker review` markers per I18N-07. Machine translation is acceptable for v1.1 ship; native-speaker review is a v1.x carry-forward tracked in REQUIREMENTS.md.

**Result:** PARTIAL — translation deviations flagged and fixed in commit `311a55e`; remaining markers are intentional I18N-07 carry-forward items, not defects.

---

## UAT-3: Persistence Across Reload (I18N-03)

**Status:** PASS

**Scenario:** Switched to PT-BR then hard-refreshed the page.

**Steps executed:**
1. Switched language to Português (Brasil).
2. Hard-refreshed the page (Cmd+Shift+R).
3. Verified PT-BR labels present on reload.
4. Confirmed `document.documentElement.lang === 'pt-BR'` via DevTools console.

**Observations:**
- All PT-BR labels intact after reload.
- `documentElement.lang` correctly set to `'pt-BR'` before first paint (via `useLocale` apply effect).
- `loadPrefs().locale === 'pt-BR'` confirmed in DevTools Storage.

**Result:** PASS — locale persists across reloads via `Envelope.prefs.locale`.

---

## UAT-4: In-Session Disable (I18N-02 in-session guard)

**Status:** PASS

**Scenario:** Started a session then attempted to change language via SettingsDialog.

**Steps executed:**
1. Started a session (clicked Start).
2. Opened SettingsDialog via gear control.
3. Observed LanguagePicker radio buttons.
4. Attempted to click a LanguagePicker option.

**Observations:**
- LanguagePicker radio buttons are visibly disabled (greyed out) while `inSessionView` is true.
- `aria-disabled="true"` on the radiogroup container (verified via DevTools).
- Clicking a disabled button did NOT change the locale mid-session.
- Breath loop continued uninterrupted throughout.

**Result:** PASS — LanguagePicker is disabled during active sessions; locale cannot be changed mid-session via the picker.

---

## Summary

| UAT Item | Description | Status | Commit |
|----------|-------------|--------|--------|
| UAT-1 | Cross-tab mid-session locale swap | PASS | `ba1586a` (integration) |
| UAT-2 | PT-BR translation spot-check | PARTIAL | `311a55e` (fixes applied) |
| UAT-3 | Persistence across reload | PASS | `ba1586a` (integration) |
| UAT-4 | In-session disable | PASS | `ba1586a` (integration) |

**Overall verdict:** APPROVED — deviations from UAT-2 were fixed inline; remaining PT-BR markers are intentional I18N-07 carry-forwards. Phase 19 is audit-ready for v1.1 milestone close.

---

*UAT approved: 2026-05-14*
