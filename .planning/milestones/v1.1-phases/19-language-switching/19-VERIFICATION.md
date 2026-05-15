---
phase: 19-language-switching
verified: 2026-05-14T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "PT-BR translation quality review (I18N-07 carry-forward)"
    expected: "All 76 // TODO: native-speaker review markers in strings.ts and learnContent.ts are validated by a native PT-BR speaker; machine-translated strings that do not accurately convey the EN meaning are corrected."
    why_human: "Machine translation quality cannot be verified programmatically. The 76 TODO markers are intentional I18N-07 carry-forward items. Native-speaker review is deferred to v1.x per REQUIREMENTS.md. A human PT-BR speaker must sign off before the markers can be removed."
---

# Phase 19: Language Switching — Verification Report

**Phase Goal:** Users can switch between English and PT-BR; the language switch is instant, does not interrupt a running session, and locked claim-safe copy is guarded against silent weakening by future locale contributions.
**Verified:** 2026-05-14T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
|-----|-------|--------|----------|
| 1 | Selecting PT-BR from SettingsDialog immediately re-renders all UI labels in Portuguese without a page reload; the running breath loop is unaffected | ✓ VERIFIED | `useLocale` 3-effect hook in `src/hooks/useLocale.ts`; `UI_STRINGS` typed catalog in `src/content/strings.ts`; `App.locale.test.tsx` tests 3 (picker click) and 4 (cross-tab storage event); UAT-1 PASS |
| 2 | The language picker is disabled while `inSessionView` is true; EN is the default and existing behavior is unchanged for users who never open the picker | ✓ VERIFIED | `LanguagePicker disabled={inSessionView}` at `src/components/SettingsDialog.tsx:87`; `aria-disabled={disabled}` + `disabled={disabled}` on each button in `src/components/LanguagePicker.tsx:38,54`; UAT-4 PASS; App.locale.test.tsx Test 5 |
| 3 | Selected language persists across reloads via `Envelope.prefs.locale`; coerce-on-read falls back to `'en'` for unknown stored values | ✓ VERIFIED | `coerceLocale` in `src/storage/prefs.ts:50-52`; `loadPrefs()` / `savePrefs()` envelope merge; `useLocaleChoice` writes via `savePrefs`; UAT-3 PASS; `useLocaleChoice.test.ts` envelope-merge test |
| 4 | The Forrest claim-safe copy is routed through the PT-BR translation pipeline; a guardrail mechanism is present so future locale contributions cannot silently alter D-12 positioning | ✓ VERIFIED (with warning — see WR-03) | `src/content/lockedCopy.ts` physical separation; `lockedCopy.test.ts` frozen-EN `.toBe()` byte-equality on all 3 EN entries; substring-absence guard; `LOCKED_COPY[locale]` prop-drilled via `LearnDialog` and `App.tsx`. PT-BR side guarded by non-empty + em-dash only (WR-03 — no byte-equality lock on PT-BR) |
| 5 | PT-BR translations are present for v1.1 ship with `// TODO: native-speaker review` flags marking machine-translated strings; `tsc && lint && build && test` exit 0 | ✓ VERIFIED (PARTIAL — native-speaker review deferred) | 66 TODO markers in `strings.ts` + 10 in `learnContent.ts` = 76 total; all PT-BR strings render real non-empty content; green-gate: tsc + lint + build + 712/712 tests per SUMMARY final green-gate. I18N-07 carry-forward per REQUIREMENTS.md |

**Score:** 5/5 truths verified (Truth 4 carries warning WR-03; Truth 5 is partial by design per I18N-07)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/content/strings.ts` | Typed `Record<LocaleId, UiStrings>` catalog — all UI labels EN + PT-BR | ✓ VERIFIED | 322-line file; `UI_STRINGS` constant typed as `Readonly<Record<LocaleId, UiStrings>>`; `satisfies` constraint enforced by tsc; EN + PT-BR entries present for all 13 interface keys including post-CR `mute.audioPausedAnnouncement` |
| `src/content/lockedCopy.ts` | LOCKED_COPY module with 3 entries × 2 locales | ✓ VERIFIED | 3 entries (inspiredByForrest, medicalAdviceLine, affiliationLine) × EN + PT-BR; `LockedCopy` interface enforced; `as const satisfies` type guard |
| `src/content/lockedCopy.test.ts` | Frozen-EN byte-equality guard | ✓ VERIFIED (warning) | 3 `.toBe()` frozen-EN guards pass; PT-BR has only non-empty + em-dash guard (WR-03 — no byte-equality lock) |
| `src/hooks/useLocaleChoice.ts` | Picker-side hook: locale state + savePrefs + hrv:prefs-changed dispatch | ✓ VERIFIED | 49-line file; `savePrefs` call at line 38; `CustomEvent('hrv:prefs-changed', { detail: { key: 'locale', value: next } })` at line 43 |
| `src/hooks/useLocale.ts` | Orchestrator hook: 3-effect structure (lang write + cross-tab + same-tab) | ✓ VERIFIED | 71-line file; Effect 1: `document.documentElement.lang = locale`; Effect 2: `window.addEventListener('storage', onStorage)`; Effect 3: `window.addEventListener('hrv:prefs-changed', onPrefsChanged)`; returns `{ locale, uiStrings: UI_STRINGS[locale] }` |
| `src/components/LanguagePicker.tsx` | Radiogroup body with native endonyms; disabled during session | ✓ VERIFIED | 65-line file; `useLocaleChoice()` consumer; `LOCALE_DISPLAY_NAMES[id]` for native endonyms; `aria-disabled={disabled}` on radiogroup + `disabled={disabled}` on buttons; 44×44 min hit area |
| `src/app/App.locale.test.tsx` | Integration smoke tests for locale switch | ✓ VERIFIED | 156-line file; Test 1: EN seed; Test 2: PT-BR seed + lang attribute; Test 3: picker click switches strings; Test 4: cross-tab storage event; Test 5: in-session picker disabled |
| `src/content/learnContent.ts` | `LEARN_CONTENT: Record<LocaleId, LearnContent>` locale-keyed map | ✓ VERIFIED | Top-level shape is `Readonly<Record<LocaleId, LearnContent>>`; EN + PT-BR sections present; `inspiredByForrest` removed from `forrest.body` (substring-absence guard passes) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.tsx` | `useLocale()` | import + call at line 146 | ✓ WIRED | `const { locale, uiStrings } = useLocale()` |
| `App.tsx` | `LEARN_CONTENT[locale]` | per-render resolution at line 147 | ✓ WIRED | `const learnContent = LEARN_CONTENT[locale]` |
| `App.tsx` | `LOCKED_COPY[locale]` | per-render resolution at line 148 | ✓ WIRED | `const lockedCopy = LOCKED_COPY[locale]` |
| `App.tsx` → `SessionReadout` | `strings={uiStrings.readout}` + `showCompletionHeadline` | prop at line 657–658 | ✓ WIRED | CR-01 fix (commit 86c6543): `showCompletionHeadline={state.status === 'complete' && !inSessionView}` replaces hardcoded EN literal; `SessionReadout` renders `strings.sessionComplete` |
| `App.tsx` → aria-live region | `uiStrings.mute.audioPausedAnnouncement` | line 689 | ✓ WIRED | CR-02 fix (commit 86c6543): `{audio.audioStatus === 'needs-resume' ? uiStrings.mute.audioPausedAnnouncement : ''}` |
| `App.tsx` → `StatsFooter` | `locale={locale}` | prop at line 701 | ✓ WIRED | `<StatsFooter stats={stats} onResetClick={onResetClick} strings={uiStrings.stats} locale={locale} />` |
| `App.tsx` → `LearnDialog` | `learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn}` | prop at line 718 | ✓ WIRED | All three locale-sensitive props drilled to LearnDialog |
| `App.tsx` → `SessionControls` | `muteStrings={uiStrings.mute}` | prop at line 676 | ✓ WIRED | Always provided; `SessionControls` EN fallback (`?? UI_STRINGS.en.mute`) is unreachable in production (WR-01 warning) |
| `SettingsDialog` → `LanguagePicker` | `disabled={inSessionView} sectionLabel={strings.settings.languageLabel}` | prop at line 87 | ✓ WIRED | `inSessionView` threads the in-session disable; section label is locale-aware |
| `useLocaleChoice` → `useLocale` | `hrv:prefs-changed` CustomEvent | same-tab sync | ✓ WIRED | `useLocaleChoice` dispatches; `useLocale` Effect 3 listens and re-reads `loadPrefs().locale` |
| `LearnDialog` | `lockedCopy.inspiredByForrest` + `lockedCopy.affiliationLine` | render at lines 101, 179 | ✓ WIRED | Both locked phrases rendered from the locale-resolved `lockedCopy` prop |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SessionReadout.tsx` | `strings.sessionComplete` | `UI_STRINGS[locale].readout.sessionComplete` via `uiStrings` from `useLocale()` | Yes — "Session complete" / "Sessão concluída" | ✓ FLOWING |
| `LanguagePicker.tsx` | `locale` / `label` | `useLocaleChoice()` reads `loadPrefs().locale`; `LOCALE_DISPLAY_NAMES[id]` for label | Yes — real locale string + native endonym | ✓ FLOWING |
| `LearnDialog.tsx` | `lockedCopy.inspiredByForrest` | `LOCKED_COPY[locale]` resolved in App.tsx from `useLocale()` locale | Yes — "inspired by Forrest's teachings" / PT-BR equivalent | ✓ FLOWING |
| `StatsFooter.tsx` | formatted date string | `formatLastSessionDate(atMs, Date.now, locale)` with locale from `useLocale()` | Yes — locale-aware `Intl.DateTimeFormat` | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for non-runnable checks (no server to start). Static code verification substituted; see Key Link Verification above. Module-level checks:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `useLocale` returns both locale and uiStrings | `grep "return { locale, uiStrings: UI_STRINGS\[locale\] }"` | Found at `useLocale.ts:70` | ✓ PASS |
| `UI_STRINGS` covers both locales | `satisfies Readonly<Record<LocaleId, UiStrings>>` at line 322 | tsc enforces exhaustiveness | ✓ PASS |
| `LOCKED_COPY` frozen-EN guard | lockedCopy.test.ts 3 `.toBe()` assertions | 6/6 tests pass (SUMMARY green-gate) | ✓ PASS |
| `LanguagePicker` disabled in session | `disabled={inSessionView}` at SettingsDialog:87 → LanguagePicker:54 | Both `disabled` and `aria-disabled` threaded | ✓ PASS |
| CR-01 sessionComplete uses catalog | `SessionReadout.tsx:78` renders `{strings.sessionComplete}` | No `state.message` forwarded in App.tsx | ✓ PASS |
| CR-02 aria-live uses catalog | `App.tsx:689` references `uiStrings.mute.audioPausedAnnouncement` | No hardcoded EN string | ✓ PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| I18N-01 | User can choose between EN and PT-BR from SettingsDialog | ✓ SATISFIED | `LanguagePicker` radiogroup with `LOCALE_OPTIONS`; wired via `SettingsDialog`; `useLocaleChoice` + `useLocale` |
| I18N-02 | Language switch is instant (React state swap, no reload); picker disabled while `inSessionView` | ✓ SATISFIED | `useLocale` returns `UI_STRINGS[locale]` directly; no reload; `LanguagePicker disabled={inSessionView}`; UAT-1 + UAT-4 PASS |
| I18N-03 | Selected language persists across reloads via `Envelope.prefs.locale` | ✓ SATISFIED | `savePrefs` in `useLocaleChoice`; `coerceLocale` fallback to `'en'`; `loadPrefs().locale` seed in `useLocale`; UAT-3 PASS |
| I18N-04 | Typed `Record<LocaleId, UiStrings>` catalog covering all UI labels (no framework dependency) | ✓ SATISFIED | `UI_STRINGS: Readonly<Record<LocaleId, UiStrings>>` in `strings.ts`; zero new runtime deps (D-17); 13 interface keys covering all visible surfaces |
| I18N-05 | `learnContent.ts` exposes a locale-keyed map sharing the existing section-keyed shape | ✓ SATISFIED | `LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>>` in `learnContent.ts`; EN + PT-BR sections; wired in App.tsx line 147 |
| I18N-06 | Forrest claim-safe copy routed through translation pipeline; guardrail mechanism present | ✓ SATISFIED (warning) | `lockedCopy.ts` physical separation; frozen-EN `.toBe()` guard; substring-absence guard; LOCKED_COPY[locale] drilled to LearnDialog + App.tsx. WR-03: PT-BR side lacks byte-equality lock (see Warnings) |
| I18N-07 | PT-BR translation supplied for v1.1 with `// TODO: native-speaker review` flags | ✓ SATISFIED (partial — native review deferred) | 76 TODO markers (66 in strings.ts + 10 in learnContent.ts); all strings render real content; machine translation acceptable per requirement; v1.x carry-forward tracked in REQUIREMENTS.md |

**Coverage:** 7/7 I18N requirements satisfied. REQUIREMENTS.md traceability table confirms I18N-01..07 all flipped to Done.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/content/strings.ts` | 66 `// TODO: native-speaker review` markers | ℹ️ Info | Intentional I18N-07 tracking markers per REQUIREMENTS.md. All strings render real content. Carry-forward to v1.x, not blocking. |
| `src/content/learnContent.ts` | 10 `// TODO: native-speaker review` markers | ℹ️ Info | Same as above — intentional I18N-07 markers. |
| `src/components/SessionControls.tsx:88` | `strings={muteStrings ?? UI_STRINGS.en.mute}` EN fallback | ⚠️ Warning | WR-01: Optional prop with EN fallback. Unreachable in production since App.tsx always passes `muteStrings={uiStrings.mute}`. No TypeScript safety net if caller drops prop. |
| `src/content/lockedCopy.test.ts:21-31` | PT-BR locked copy guarded only by non-empty + em-dash, not byte-equality | ⚠️ Warning | WR-03: A drive-by edit that softens PT-BR claim-safe copy would slip past CI undetected. EN lock is present and is the authoritative D-12 source; PT-BR symmetric lock recommended but not required by I18N-06 text. |
| `src/components/LanguagePicker.tsx:16-18` | Stale comment claims section label is hardcoded | ℹ️ Info | IN-01: Comment predates Plan 06 Task 7. The section label flows via `sectionLabel` prop from `strings.settings.languageLabel`. Misleading but harmless. |

**Debt marker gate:** All `// TODO:` markers in strings.ts and learnContent.ts are `// TODO: native-speaker review` — these are explicitly sanctioned I18N-07 carry-forward markers, not unresolvable debt. No bare `FIXME`, `XXX`, or `TBD` markers found in any phase-19 modified file. Gate: PASS.

### Human Verification Required

#### 1. PT-BR Translation Quality (I18N-07 Carry-Forward)

**Test:** Open the app in a browser, switch to Português (Brasil) via SettingsDialog, and review every visible string surface: Start/End session buttons, SettingsDialog labels (all four picker sections), mute toggle, settings anchor, learn anchor, stats footer (session count, date, total time, reset), EndSessionDialog, ResetStatsDialog, LearnDialog (all headings, body text, locked-copy phrases, affiliation line), BreathingShape phase labels (Puxa / Solta), lead-in countdown aria-labels, date formatting in StatsFooter, and the "Sessão concluída" completion headline.

**Expected:** Every PT-BR string is natural, grammatically correct, and accurately conveys the English meaning. The `// TODO: native-speaker review` markers can be removed for any string that passes review.

**Why human:** Machine translation quality cannot be verified programmatically. 76 `// TODO: native-speaker review` markers remain in strings.ts and learnContent.ts. This is an intentional I18N-07 carry-forward per REQUIREMENTS.md; native-speaker review is v1.x work. The 4 YouTube video titles that have no PT-BR equivalents correctly display their English originals — confirm this is acceptable.

---

## Code Review Findings Closure

The phase-19 code review (`19-REVIEW.md`) identified 2 critical + 6 warning issues. Both criticals were closed in commit `86c6543` before this verification ran.

| Finding | Classification | Status | Evidence |
|---------|---------------|--------|----------|
| CR-01: "Session complete" headline hardcoded EN | Critical | ✓ CLOSED | `SessionReadout.tsx` now uses `showCompletionHeadline` prop + `strings.sessionComplete`; no `state.message` forwarded from App.tsx |
| CR-02: aria-live announcement hardcoded EN | Critical | ✓ CLOSED | `App.tsx:689` reads `uiStrings.mute.audioPausedAnnouncement`; `audioPausedAnnouncement` key added to `UiStrings.mute` in strings.ts |
| WR-01: SessionControls EN fallback | Warning | OPEN (unreachable) | `muteStrings ?? UI_STRINGS.en.mute` fallback at `SessionControls.tsx:88`; App.tsx always provides `muteStrings={uiStrings.mute}` so fallback is unreachable in production |
| WR-02: `formatLastSessionDate(locale)` untested | Warning | OPEN | No test covers the PT-BR locale branch of `dateFormatterFor`; format.test.ts only tests the undefined locale path |
| WR-03: PT-BR LOCKED_COPY no byte-equality snapshot | Warning | OPEN | `lockedCopy.test.ts` PT-BR block uses `.length > 0` + em-dash presence; no `.toBe()` byte-equality guard for PT-BR entries |
| WR-04: `useLocale` singleton assumption undocumented | Warning | OPEN (cosmetic) | `document.documentElement.lang` write assumes single mount; only one caller (App.tsx) but contract is implicit |
| WR-05: Unsafe CustomEvent detail cast | Warning | OPEN (latent) | `e.detail as { key?: string } | null` in `useLocale.ts:59`; same pattern as theme/variant/timbre hooks; functionally correct under current dispatch shape |
| WR-06: StrictMode double-mount lang attribute | Warning | OPEN (cosmetic) | StrictMode re-mount is idempotent; no functional impact in production |
| IN-01: Stale LanguagePicker comment | Info | OPEN | Comment at lines 16-18 claims section label is hardcoded; Plan 06 Task 7 already replaced it with a prop |
| IN-02: `aria-disabled="false"` emitted | Info | OPEN | Spec-valid but recommended pattern is to omit `aria-disabled` when false |
| IN-03: Per-call Intl formatter allocation | Info | OPEN | No per-locale cache; allocates fresh `Intl.DateTimeFormat` on each render when locale arg is provided |
| IN-04: learnContent computed each render | Info | OPEN | Reference-stable lookup; no functional issue |

---

## Phase Goal Verdict

**Goal:** Users can switch between English and PT-BR; the language switch is instant, does not interrupt a running session, and locked claim-safe copy is guarded against silent weakening by future locale contributions.

**Verdict:** Goal is structurally achieved in the codebase.

- Instant React-state language switch: VERIFIED (useLocale + UI_STRINGS catalog)
- Session non-interruption: VERIFIED (picker disabled in session; cross-tab storage path unaffected by picker disable)
- Locked copy guardrail: VERIFIED with warning (EN byte-equality guard active; PT-BR guard weaker than EN — WR-03)
- I18N-01..07 all satisfied: VERIFIED (requirements table 7/7 Done)

Status is `human_needed` because I18N-07 explicitly defers native-speaker review to v1.x, and that review cannot be verified programmatically. All automated checks (712/712 tests, tsc, lint, build) pass per phase green-gate.

---

_Verified: 2026-05-14T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
