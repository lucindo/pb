---
phase: 19-language-switching
reviewed: 2026-05-14T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/app/App.tsx
  - src/components/StatsFooter.tsx
  - src/components/LanguagePicker.tsx
  - src/components/LearnDialog.tsx
  - src/content/strings.ts
  - src/content/learnContent.ts
  - src/content/lockedCopy.ts
  - src/hooks/useLocale.ts
  - src/hooks/useLocaleChoice.ts
  - src/storage/format.ts
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-05-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 19 introduces a locale-keyed strings catalog (`UI_STRINGS`), `LEARN_CONTENT`, and `LOCKED_COPY`, plus the `useLocale` orchestrator hook, `useLocaleChoice` picker hook, and the `LanguagePicker` radiogroup. The strings drill is wired through most visible components and the cross-tab / same-tab sync (`storage` + `hrv:prefs-changed`) mirrors the proven theme/variant/timbre pattern. The frozen-EN snapshot test for `LOCKED_COPY` is correctly literal-equality and covers all three locked entries. Security-wise the new code adds no `dangerouslySetInnerHTML`, no `eval`, and the LearnDialog still routes every external URL through `target="_blank" rel="noopener noreferrer"`.

However, the strings drill is incomplete: two user-facing strings escape the catalog and render verbatim English under `pt-BR`. The largest gap is the "Session complete" headline (CR-01), which lives as a literal on `CompleteSessionState.message` in `domain/sessionController.ts`, is forwarded by App.tsx as `state.message`, and is rendered as-is by `SessionReadout` — never touching `strings.readout.sessionComplete`, which therefore is dead i18n metadata. The second is the aria-live "Audio paused, tap to resume" announcement hardcoded inline in App.tsx. The phase-19 plan explicitly lists "locale prop wiring gaps" as a review focus and both surfaces are missed.

A handful of warnings cover an EN fallback inside `SessionControls` that masks future locale-drop bugs, missing test coverage of the new `locale` arg on `formatLastSessionDate`, the absence of a frozen-PT-BR byte-equality lock symmetric to the EN one, a stale `SessionControls.muteStrings = UI_STRINGS.en.mute` fallback, and a stale comment in `LanguagePicker` that claims the section label is hardcoded when it now flows through props.

## Critical Issues

### CR-01: "Session complete" headline is hardcoded English, never reads from `strings.readout.sessionComplete`

**File:** `src/app/App.tsx:657` + `src/domain/sessionController.ts:30,115`
**Issue:** `state.message` is the string literal `'Session complete'` produced by the domain layer (`CompleteSessionState.message: 'Session complete'`) and forwarded verbatim to `SessionReadout`'s `message` prop. `SessionReadout` renders `{message}` directly. Phase 19 added `strings.readout.sessionComplete` (EN = `'Session complete'`, PT-BR = `'Sessão concluída'`) but no consumer ever reads it — it is dead i18n metadata. A PT-BR user who completes a timed session sees the EN headline. This is the highest-visibility post-session screen in the app and the very state PT-BR users will reach on first run.

The frontmatter focus list explicitly calls out "locale prop wiring gaps" — this is one. The component-layer `SessionReadout.tsx` even types `message?: 'Session complete'` as a literal, which structurally prevents passing the translated string today without a type change.

**Fix:** Stop threading the EN literal through state. Either (a) translate at the App boundary before passing into `SessionReadout`:
```tsx
// App.tsx around line 657
message={state.status === 'complete' && !inSessionView ? uiStrings.readout.sessionComplete : undefined}
```
and widen `SessionReadoutProps.message` from `'Session complete'` to `string`. Or (b) remove the `message` prop entirely and let `SessionReadout` resolve the headline from `strings.readout.sessionComplete` when `status === 'complete'`. Add a PT-BR app-level test that completes a timed session and asserts `screen.getByText(UI_STRINGS['pt-BR'].readout.sessionComplete)` is visible.

### CR-02: aria-live needs-resume announcement is hardcoded English

**File:** `src/app/App.tsx:683-690`
**Issue:** The aria-live region that announces the audio interruption is rendered with the literal English text:
```tsx
{audio.audioStatus === 'needs-resume' ? 'Audio paused, tap to resume' : ''}
```
This is the only text content of a `role="status"` / `aria-live="polite"` region — i.e. the exact phrase a PT-BR screen-reader user will hear when their session audio dies. There is no entry in `UI_STRINGS[locale].mute` for this hint string (the closest sibling is `mute.resume = 'Resume audio' / 'Retomar áudio'`, used for the button label but distinct from the announcement). The component-level `MuteToggle` cleanly threads `strings.resume` for its `aria-label`, but the live-region announcement bypasses the catalog.

**Fix:** Add a new key (e.g. `mute.resumeAnnouncement` or `mute.resumeHint`) to `UiStrings.mute` in `src/content/strings.ts` with EN/PT-BR values, then thread it via the existing `uiStrings.mute` slice in App.tsx:
```tsx
// strings.ts
mute: { ..., resumeAnnouncement: 'Audio paused, tap to resume' /* en */ }
mute: { ..., resumeAnnouncement: 'Áudio pausado, toque para retomar' /* pt-BR */ }

// App.tsx
{audio.audioStatus === 'needs-resume' ? uiStrings.mute.resumeAnnouncement : ''}
```
Also update `App.audio.test.tsx:489` which currently asserts `screen.getByText('Audio paused, tap to resume')` and would still pass under EN but documents the literal, blocking the translation. Confirm the new key with the `strings.test.ts` exhaustiveness loop (every locale exposes a non-empty value).

## Warnings

### WR-01: `SessionControls` falls back to `UI_STRINGS.en.mute` when `muteStrings` is absent

**File:** `src/components/SessionControls.tsx:88`
**Issue:** The runtime default `strings={muteStrings ?? UI_STRINGS.en.mute}` keeps Phase-1 legacy callers compatible, but in a Phase-19 world it silently degrades a PT-BR session to English mute labels if `App.tsx` ever stops passing `muteStrings`. Because the prop is `optional`, TypeScript will not flag the regression, and there is no test that fails when the prop is missing in a PT-BR context. This is exactly the kind of "locale prop wiring gap" the focus list calls out.
**Fix:** Either (a) make `muteStrings` required (`muteStrings: UiStrings['mute']`) and update legacy tests to pass it, or (b) drop the `?? UI_STRINGS.en.mute` fallback and rely on TS to fail compile when missing, or (c) accept the fallback and add a test that renders `SessionControls` without `muteStrings` and asserts the legacy single-button branch (where `MuteToggle` is not rendered) — confirming the fallback is unreachable in the inline-mute branch.

### WR-02: `formatLastSessionDate(locale)` is added but never exercised by tests

**File:** `src/storage/format.ts:22-27,55-60` + `src/storage/format.test.ts`
**Issue:** The new `locale` parameter on `formatLastSessionDate` (and the private `dateFormatterFor`) adds a runtime branch that allocates a fresh `Intl.DateTimeFormat` instance per call, bypassing the module-scope cache. `format.test.ts` contains zero assertions on the new branch — the same-year/other-year tests call `formatLastSessionDate(atMs, today)` with no `locale` arg. A future refactor that breaks the per-call allocator (e.g. swallows the `locale === undefined` short-circuit or returns the wrong formatter) will not be caught.
**Fix:** Add at least two tests:
```ts
it('uses the provided locale for the formatter (pt-BR yields Portuguese month abbreviation)', () => {
  const sameYearAtMs = new Date(2026, 4, 7).getTime()
  const today = () => new Date(2026, 4, 10).getTime()
  const out = formatLastSessionDate(sameYearAtMs, today, 'pt-BR')
  expect(out).toMatch(/mai/i)  // "mai" is the PT-BR May abbreviation; assert structurally
})
it('falls back to module-cached system formatter when locale is undefined', () => {
  // confirm no Portuguese leak when locale=undefined and CI is en-US
})
```
Also consider memoizing per-locale formatters at module scope (e.g. a `Map<string, Intl.DateTimeFormat>`) so PT-BR users do not allocate a new formatter on every render of `StatsFooter`.

### WR-03: PT-BR `LOCKED_COPY` has no byte-equality snapshot — only "non-empty" + "contains em-dash"

**File:** `src/content/lockedCopy.test.ts:21-31`
**Issue:** The frozen-EN block (`describe('LOCKED_COPY frozen-EN snapshot')`) asserts byte-equality for all three EN values with `.toBe()` (correct per D-02). The PT-BR block only checks `.length > 0` and that `medicalAdviceLine` contains `'—'`. A drive-by edit that softens the PT-BR `medicalAdviceLine` (e.g. drops "não é conselho médico", rewords away from the claim-safe stance) would slip past CI undetected — the very risk D-12 / D-02 is supposed to prevent. The English lock is half the lock; an i18n product needs both.
**Fix:** Add three byte-equality assertions for the PT-BR locked entries, matching the EN block's posture:
```ts
describe('LOCKED_COPY frozen-PT-BR snapshot', () => {
  it('inspiredByForrest matches PT-BR baseline byte-exact', () => {
    expect(LOCKED_COPY['pt-BR'].inspiredByForrest).toBe("inspirado nos ensinamentos do Forrest")
  })
  it('medicalAdviceLine matches PT-BR baseline byte-exact (em-dash U+2014)', () => {
    expect(LOCKED_COPY['pt-BR'].medicalAdviceLine).toBe("Prática de respiração guiada — não é conselho médico.")
  })
  it('affiliationLine matches PT-BR baseline byte-exact', () => {
    expect(LOCKED_COPY['pt-BR'].affiliationLine).toBe("Projeto independente. Não afiliado ao Forrest Knutson.")
  })
})
```
Until a native-speaker review hardens the literals, mark the PT-BR snapshot fixture as "v1 translation baseline" in a comment so reviewers know the lock is on the current translation, not the EN semantics.

### WR-04: `useLocale.Effect 1` mutates `document.documentElement.lang` from inside a setState-style effect with no SSR guard

**File:** `src/hooks/useLocale.ts:32-34`
**Issue:** `document.documentElement.lang = locale` runs unconditionally on every locale change. If this hook is ever rendered server-side (SSR / static prerender) the effect won't fire (good), but the same code path makes `document` access at module import safe only because it lives inside `useEffect`. The bigger latent risk is that `useLocale` is called multiple times in the tree (App.tsx + any future consumer) — each instance independently writes the same attribute. Today there is only one caller; the contract is not documented as singleton.
**Fix:** Either (a) add an inline comment `// SINGLETON: this hook is mounted exactly once at App.tsx — do not call from another component or the lang attribute will thrash` and add an assertion that detects double-mount (a module-level ref counter that warns in dev), or (b) accept multi-mount and document that the writes converge. Also confirm `document.documentElement` access is guarded for non-browser test environments — jsdom provides it, but a Vitest config that disables jsdom (e.g. node env) would crash. Phase 19 tests use jsdom so this is dormant, but the assumption is implicit.

### WR-05: `e.detail as { key?: string } | null` cast trusts a payload that can be any value

**File:** `src/hooks/useLocale.ts:57-62`
**Issue:** The CustomEvent handler does:
```ts
const detail = e.detail as { key?: string } | null
if (!detail || detail.key === 'locale' || detail.key === undefined) { ... }
```
If a different module dispatches `new CustomEvent('hrv:prefs-changed', { detail: 'locale' })` (a string), the cast lies — `detail` is the string `'locale'`, `!detail` is false, `detail.key` is `undefined` (strings coerce to objects but have no `key` property), so the third branch fires and `loadPrefs().locale` is re-read. That's accidentally correct under the current "undefined === broadcast-all" contract, but the cast invites future drift: an integer detail crashes `detail.key` access only when `key` is a method-bound primitive prototype. The same shape exists in `useTheme.ts` and `useVisualVariant.ts` so this is a project-wide pattern, but Phase 19 ships a new copy of it.
**Fix:** Replace the unsafe cast with a runtime type guard:
```ts
const onPrefsChanged = (e: Event): void => {
  if (!(e instanceof CustomEvent)) return
  const detail: unknown = e.detail
  if (detail === null || typeof detail !== 'object') {
    setLocale(loadPrefs().locale)  // broadcast-all
    return
  }
  const key = (detail as { key?: unknown }).key
  if (key === 'locale' || key === undefined) {
    setLocale(loadPrefs().locale)
  }
}
```
Defense in depth at no perf cost (one extra typeof check on a rare event).

### WR-06: `useLocale.Effect 1` may run on the same locale value and re-write the DOM attribute under React StrictMode

**File:** `src/hooks/useLocale.ts:32-34`
**Issue:** The apply effect declares `[locale]` as its dependency, but StrictMode mounts components twice in dev. The first mount sets `lang = 'en'`, unmounts, re-mounts, and re-sets `lang = 'en'`. That is functionally idempotent, but if a sibling effect ever clears `documentElement.lang` between the two StrictMode mounts (which the test setup `document.documentElement.lang = ''` in `beforeEach` does), the second StrictMode mount restores it. Tests pass because of the rerun. In production this is fine; in tests the rerun masks "did I correctly write on mount". Worth a one-line assertion in the test that the value is set within a `flushSync`-equivalent boundary.
**Fix:** Low priority — but consider whether the apply-effect could be a `useLayoutEffect` so the attribute is set synchronously before paint (avoids any FOUC of stale lang on a slow first render, especially when paired with screen readers that snapshot `lang` at render time). The cost is one synchronous DOM write — negligible.

## Info

### IN-01: Stale comment in `LanguagePicker.tsx` claims section label is hardcoded

**File:** `src/components/LanguagePicker.tsx:16-18`
**Issue:** The header comment says:
```
// NOTE: Section label 'Language' stays hardcoded for this plan.
// Plan 06 Task 7 (LanguagePicker sectionLabel widening + SettingsDialog drill)
// will replace it with a translatable prop driven by strings.settings.languageLabel.
```
But the current code already takes `sectionLabel: string` in `LanguagePickerProps` and renders `{sectionLabel}`. The Plan 06 Task 7 work landed; the comment did not. A reader landing on this file will assume the section label is hardcoded and may write code based on that false premise.
**Fix:** Delete the three-line NOTE or replace with a one-liner: `// sectionLabel flows in from SettingsDialog via strings.settings.languageLabel (Plan 06 Task 7).`

### IN-02: `aria-disabled={disabled}` emits `aria-disabled="false"` rather than omitting the attribute

**File:** `src/components/LanguagePicker.tsx:38`
**Issue:** When `disabled` is `false`, React renders `aria-disabled="false"`. The WAI-ARIA spec accepts this, but the recommended pattern is to omit `aria-disabled` entirely when not disabled (the default value is `"false"`). This matches the existing TimbrePicker / ThemePicker / VariantPicker pattern in the codebase — not a regression, but worth flagging for a project-wide cleanup pass: `aria-disabled={disabled || undefined}`.
**Fix:** Optional. If the project wants ARIA cleanliness across all four pickers, change all four to `aria-disabled={disabled || undefined}` in one pass. Tests already assert `'true'` when disabled, which would still pass.

### IN-03: Module-scope formatter cache in `format.ts` defeats the per-call `locale` arg's intent

**File:** `src/storage/format.ts:8-16,22-27`
**Issue:** `DATE_FMT_SAME_YEAR` and `DATE_FMT_OTHER_YEAR` are constructed once with `new Intl.DateTimeFormat(undefined, ...)`. This uses the browser's runtime-default locale, which is what most v1 users see. Phase 19's per-call allocator allocates a NEW `Intl.DateTimeFormat` every render when a locale is passed, since there is no per-locale cache. With StatsFooter re-rendering on every cross-tab `storage` event + on every locale toggle, this is wasteful. The user-visible impact is negligible (Intl is cheap), but the comment says "one allocation per app load" — that comment is now misleading.
**Fix:** Add a `Map<string, { sameYear: Intl.DateTimeFormat; otherYear: Intl.DateTimeFormat }>` cached at module scope:
```ts
const localizedCache = new Map<string, { sameYear: Intl.DateTimeFormat; otherYear: Intl.DateTimeFormat }>()
function dateFormatterFor(locale: string | undefined, sameYear: boolean): Intl.DateTimeFormat {
  if (locale === undefined) return sameYear ? DATE_FMT_SAME_YEAR : DATE_FMT_OTHER_YEAR
  let entry = localizedCache.get(locale)
  if (!entry) {
    entry = {
      sameYear: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
      otherYear: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
    }
    localizedCache.set(locale, entry)
  }
  return sameYear ? entry.sameYear : entry.otherYear
}
```
Also fix the file-header comment to read "one allocation per locale per app load".

### IN-04: `App.tsx` recomputes `learnContent` and `lockedCopy` on every render

**File:** `src/app/App.tsx:147-148`
**Issue:** `const learnContent = LEARN_CONTENT[locale]` and `const lockedCopy = LOCKED_COPY[locale]` run on every App render (which happens at rAF rate during a running session). Both are stable object-literal references inside `LEARN_CONTENT` / `LOCKED_COPY` — the index access yields the same reference each render, so no allocations and no downstream re-renders. The comment says "per-render catalog resolution" intentionally. Worth a brief note that the lookup is reference-stable so `LearnDialog`'s prop identity is preserved across App renders.
**Fix:** Optional. Add a one-line comment: `// LEARN_CONTENT[locale] is reference-stable (frozen const) — no useMemo needed; LearnDialog props identity is preserved across renders.` Or wrap in `useMemo([locale])` if there is any doubt about future memoization regressions in downstream consumers (`React.memo`-wrapped `LearnDialog` would benefit).

---

_Reviewed: 2026-05-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
