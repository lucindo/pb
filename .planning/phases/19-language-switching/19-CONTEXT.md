---
phase: 19-language-switching
created: 2026-05-14
milestone: v1.1
requirements:
  - I18N-01
  - I18N-02
  - I18N-03
  - I18N-04
  - I18N-05
  - I18N-06
  - I18N-07
---

# Phase 19: Language Switching - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 19 lands **EN + PT-BR locale switching** on top of the Phase 14 typed prefs foundation + Phase 15 settings shell + Phase 16–18 picker hook patterns. The picker re-renders all UI string surfaces instantly on locale change (no page reload); the picker is **disabled while `inSessionView`** so the in-session string surface never re-renders mid-breath. The Forrest claim-safe locked copy (3 entries — D-12 minimum) routes through the PT-BR translation pipeline with a **frozen-EN-snapshot + PT-BR-back-translation-comment** guardrail (I18N-06 — explicit override of research Pitfall 5's "keep locked copy as TS constants" recommendation).

Deliverables:

1. **NEW** `src/content/strings.ts` — typed UI catalog. Exports:
   - `interface UiStrings { ... }` — namespaced sub-objects per component/feature (e.g. `controls.{start,stop,endSession}`, `endSessionDialog.{title,confirm,cancel}`, `settings.{title,themeLabel,variantLabel,timbreLabel,languageLabel,...}`, `themes.{light,dark,system,moss,slate,dusk}`, `variants.{orb,square,diamond}`, `timbres.{bowl,bell,sine,chime}`, `learn.{title,sectionTitles,...}`, `stats.{...}`, `mute.{...}`, `anchors.{settings,settingsDisabled,learn,learnDisabled}`, `stepper.{decreaseLabel,increaseLabel}`, etc.).
   - `UI_STRINGS: Readonly<Record<LocaleId, UiStrings>>` — `en` + `pt-BR` entries.
   - Template-interpolated entries are functions: `stepper.decreaseLabel: (fieldLabel: string) => string`. EN: `` (l) => `Decrease ${l}` ``. PT-BR: `` (l) => `Diminuir ${l}` ``.
2. **NEW** `src/content/lockedCopy.ts` — claim-safe locked copy module. Exports:
   - `interface LockedCopy { readonly inspiredByForrest: string; readonly medicalAdviceLine: string; readonly affiliationLine: string }`.
   - `LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>>`.
   - EN values frozen (current shipped strings — see "EN locked-copy baseline" below).
   - PT-BR values machine-translated with inline `// LOCKED: back-translation = "..."` comments per entry per I18N-07.
3. **EDIT** `src/content/learnContent.ts`:
   - Convert top-level export to locale-keyed shape per I18N-05: `export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>>` (replaces the current `LEARN_CONTENT: LearnContent` singleton).
   - Existing EN content moves under `LEARN_CONTENT.en`.
   - **EN `forrest.body` mutates:** strip the substring `"inspired by Forrest's teachings"` from the second paragraph. The substring becomes a separate render-time concat in `LearnDialog`. The second paragraph now reads (EN): `"This is an independent web app made so anyone can follow a calm paced breath from a browser. The links below point to his channel, his site, and hand-picked starting videos."` — followed in the rendered output by a separate paragraph containing `LOCKED_COPY[locale].inspiredByForrest`. (Planner picks the exact paragraph break; the strip mechanism is the invariant — locked phrase MUST NOT appear inside `learnContent[locale].forrest.body` per the substring test guard.)
   - Add `LEARN_CONTENT['pt-BR']` — machine-translated `forrest.body` + `hrv.body` + `timing.body` + section titles + link labels, each line carrying `// TODO: native-speaker review` markers per I18N-07.
   - **`links` URLs are NOT translated** — book Amazon URL, YouTube channel URL, etc. remain literal across locales. Only the `label` field of each `LearnLink` is translated.
4. **NEW** `src/hooks/useLocale.ts` — App-side orchestrator hook. Mirror of `useTheme.ts`. Returns `{ locale: LocaleId, uiStrings: UiStrings }`. Internally:
   - Seeds `useState<LocaleId>` from `loadPrefs().locale` (Phase 14 D-17 coerce guarantees a valid LocaleId).
   - `useEffect([locale])`: writes `document.documentElement.lang = locale`.
   - `useEffect([])`: cross-tab `'storage'` listener — re-reads `loadPrefs().locale` on `STATE_KEY` writes (A-04 mirror).
   - `useEffect([])`: same-tab `'hrv:prefs-changed'` listener — re-reads `loadPrefs().locale` when `detail.key === 'locale'` (or `detail.key === undefined` for forward-compat).
   - Returns `{ locale, uiStrings: UI_STRINGS[locale] }`.
   - Does NOT call `savePrefs` — the picker-side `useLocaleChoice` owns that path (A-01/A-02 mirror).
5. **NEW** `src/hooks/useLocaleChoice.ts` — picker-side companion hook. Verbatim mirror of `useTimbreChoice.ts` with `timbre → locale` rename. `loadPrefs` read + `savePrefs` write + `'hrv:prefs-changed'` dispatch with `detail.key === 'locale'`. Optimistic local React state mirror so picker reflects the new selection instantly. `useCallback` empty-deps for stable identity.
6. **EDIT** `src/components/LanguagePicker.tsx` — Phase 15 stub body (read-only `Language: {prefs.locale}` text) becomes a real radiogroup over `LOCALE_OPTIONS`:
   - Renders 2 buttons with native endonym labels (`English`, `Português (Brasil)`) — same labels in BOTH EN and PT-BR UI (standard i18n convention). Labels do NOT flow through `UI_STRINGS`. Source: planner picks either (a) a new `LOCALE_DISPLAY_NAMES: Record<LocaleId, string>` constant in `src/content/strings.ts` (NOT in `src/domain/settings.ts` per Phase 14 D-09 file-split invariant) or (b) hardcoded literals inside `LanguagePicker.tsx`.
   - `disabled` gated by Phase 15 D-02 contract.
   - 44×44 hit area + `focus-visible` ring per Phase 2 carry-forward a11y floor.
   - Uses `useLocaleChoice()` for `{ locale, setLocale }`.
   - Mirror radiogroup posture of `ThemePicker.tsx` + `TimbrePicker.tsx`.
   - Section label `Language` becomes `uiStrings.settings.languageLabel` (EN: `Language`, PT-BR: `Idioma` // TODO: native-speaker review).
7. **EDIT** `src/app/App.tsx`:
   - Invoke `const { locale, uiStrings } = useLocale()` near other prefs hooks (similar position to `useTheme()` / `useVisualVariant()`).
   - Resolve sibling catalogs once per render: `const learnContent = LEARN_CONTENT[locale]` + `const lockedCopy = LOCKED_COPY[locale]`.
   - Pass `uiStrings.*` slices to every user-facing child component:
     - `<SessionControls strings={uiStrings.controls} ... />`
     - `<SettingsForm strings={uiStrings.settingsForm} ... />` (+ `<SettingsStepper>` deeper inside; SettingsForm prop-drills its slice further to its 3 SettingsStepper instances).
     - `<MuteToggle strings={uiStrings.mute} ... />`
     - `<SessionReadout strings={uiStrings.readout} ... />`
     - `<StatsFooter strings={uiStrings.stats} ... />`
     - `<SettingsAnchor strings={uiStrings.anchors} ... />`
     - `<LearnAnchor strings={uiStrings.anchors} ... />`
     - `<SettingsDialog strings={uiStrings.settings} ... />` (which prop-drills further to `<ThemePicker strings={uiStrings.themes} ... />`, `<VariantPicker strings={uiStrings.variants} ... />`, `<TimbrePicker strings={uiStrings.timbres} ... />`, `<LanguagePicker ... />`).
     - `<LearnDialog learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn} ... />`
     - `<EndSessionDialog strings={uiStrings.endSessionDialog} ... />`
     - `<ResetStatsDialog strings={uiStrings.resetStatsDialog} ... />`
     - `<BreathingShape strings={uiStrings.breathing} ... />` (for `Inhale` / `Exhale` / lead-in text — if the active session re-renders mid-breath when locale changes is acceptable; see D-11 below).
   - In-line `<p>Guided breathing practice — not medical advice.</p>` (App.tsx:686) becomes `<p>{lockedCopy.medicalAdviceLine}</p>`.
   - SettingsDialog title's existing `<h2>Settings</h2>` and similar inline strings get migrated to `uiStrings.*` slices.
8. **EDIT** ~15 user-facing components — accept a `strings` prop typed as their relevant slice; replace inline English literals with `strings.*` lookups. Tests update to pass a strings fixture (mirror EN UI_STRINGS slice).
9. **EDIT** `index.html` — NO change. `<html lang="en">` static default stays; useLocale rewrites at runtime via useEffect. No FOUC inline script (no visual FOUC for `lang` attribute; only screen-reader/`:lang()` impact).
10. **NEW + EDIT** Vitest coverage:
    - `src/content/strings.test.ts` (NEW) — exhaustiveness check that every `LocaleId` has all `UiStrings` keys (TypeScript already enforces at compile time, but a runtime test catches accidental `as UiStrings` casts).
    - `src/content/lockedCopy.test.ts` (NEW) — **FROZEN-EN guardrail.** Asserts `LOCKED_COPY.en.inspiredByForrest === "inspired by Forrest's teachings"`, `LOCKED_COPY.en.medicalAdviceLine === "Guided breathing practice — not medical advice."`, `LOCKED_COPY.en.affiliationLine === "Independent project. Not affiliated with Forrest Knutson."`. Asserts `LOCKED_COPY['pt-BR'].*` are non-empty. Asserts `LEARN_CONTENT[locale].forrest.body` does NOT contain `LOCKED_COPY[locale].inspiredByForrest` as substring (prevents accidental re-inlining).
    - `src/content/learnContent.test.ts` (EXTENDED) — existing EN content tests stay green; add PT-BR coverage (section shape parity, link URLs identical to EN).
    - `src/hooks/useLocale.test.ts` (NEW) — seed-from-loadPrefs, cross-tab `'storage'` listener re-reads, same-tab `'hrv:prefs-changed'` listener (filtered on `detail.key === 'locale'`), `document.documentElement.lang` write on change.
    - `src/hooks/useLocaleChoice.test.ts` (NEW) — verbatim mirror of `useTimbreChoice.test.ts` with `timbre → locale` rename.
    - `src/components/LanguagePicker.test.tsx` (EXTENDED) — radiogroup posture, native endonyms in both UI locales, selection writes to `loadPrefs` + dispatches `'hrv:prefs-changed'` with `detail.key === 'locale'`, `disabled` prop gates aria-checked + click handler.
    - Component-level test fixtures across ~15 components updated to pass a `strings` prop (typed against EN UI_STRINGS slice).
    - `src/components/LearnDialog.test.tsx` — existing "does NOT render medical-advice sentence" guard at line 48 stays green (D-14 amendment 2026-05-10 already moved the medical-advice line to App.tsx; locked copy lookup preserves that). Add PT-BR rendering test (render with `locale='pt-BR'`, assert PT-BR forrest title + lockedCopy.inspiredByForrest present, English baseline absent).
    - `src/app/App.test.tsx` (or wherever the App-level smoke lives) — switching locale via `useLocaleChoice` re-renders the UI in PT-BR for idle-state surfaces; assert `document.documentElement.lang === 'pt-BR'` after switch.
11. **NO** edits to `src/domain/settings.ts` — `LocaleId` / `LOCALE_OPTIONS` / `isValidLocale` / `DEFAULT_LOCALE = 'en'` locked Phase 14 D-01/D-04 (file-split invariant D-09).
12. **NO** edits to `src/storage/prefs.ts` — `loadPrefs` / `savePrefs` / `coerceLocale` locked Phase 14.
13. **NO** edits to `src/components/SettingsDialog.tsx` BEYOND prop-drilling `strings` slices to children + replacing the `<h2>Settings</h2>` literal — the Phase 15 D-01 "picker phases don't re-edit SettingsDialog body" invariant is reinterpreted here as: Phase 19 adds the `strings` prop and slice-drills but doesn't restructure the picker layout. Planner verifies the diff stays minimal.

**EN locked-copy baseline (verbatim from current shipped source):**

| Key | EN value | Current source location |
|-----|----------|-------------------------|
| `inspiredByForrest` | `"inspired by Forrest's teachings"` | `src/content/learnContent.ts:46` (embedded substring inside `forrest.body` second paragraph) |
| `medicalAdviceLine` | `"Guided breathing practice — not medical advice."` (em-dash U+2014) | `src/app/App.tsx:686` (inline literal) |
| `affiliationLine` | `"Independent project. Not affiliated with Forrest Knutson."` | `src/components/LearnDialog.tsx:171` (inline literal) |

These 3 values are the frozen EN baseline. The test asserts byte-equality. Any future change to these strings requires updating the test snapshot, which is a deliberate human decision recorded in the commit message and reviewed against D-12 claim-safe semantics.

**Not in scope (other phases / deferred):**
- Mid-session locale swap (`inSessionView` disable contract already shipped Phase 15).
- Additional locales beyond EN + PT-BR (REQUIREMENTS.md "Out of Scope" — add only on validated demand).
- RTL layout / `dir` attribute switching (no v1.1 locale needs RTL).
- Pluralization, ICU MessageFormat, gender, date/number formatting (catalog is static; v1.x carry-forward if needed).
- Native-speaker review of PT-BR translations (I18N-07 — v1.x carry-forward already in REQUIREMENTS.md).
- Lazy-loaded locale bundles / dynamic import per locale (catalog is tiny; static import keeps tree-shaking simple).
- `LOCKED_DISPLAY_NAMES` for the LanguagePicker — covered by either a new `src/content/strings.ts` constant OR hardcoded literals; planner picks. Does NOT belong in `src/domain/settings.ts` (Phase 14 D-09 file-split invariant).
- FOUC-prevention inline script for `<html lang>` — no visual FOUC, useLocale.useEffect handles all writes.
- Capture-at-Start locale snapshot — picker is disabled in-session, so mid-session locale swap is impossible from the UI; no sessionLocaleRef needed. (If a cross-tab `'storage'` event arrives mid-session, the locale state DOES update mid-session — see D-11 for the live-render policy.)

</domain>

<decisions>
## Implementation Decisions

### I18N-06 locked-copy guardrail

- **D-01:** **Separate `src/content/lockedCopy.ts` module exporting `LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>>`.** Physical separation from `UI_STRINGS` makes locked entries obvious in code review and grep. The Forrest phrase moves OUT of `learnContent.ts` body into this module; `learnContent.ts` `forrest.body` is mutated to no longer contain the substring. Chosen over (b) LOCKED_-prefixed keys embedded inside `UI_STRINGS` (single import but lock semantics enforced only by naming convention) and (c) lockedCopy + barrel re-export merged into UI_STRINGS (consumer-side unified but write-side lock site doubles).

- **D-02:** **Frozen-EN snapshot test + PT-BR back-translation comments in source.** `lockedCopy.test.ts` hardcodes the 3 EN baseline values and asserts byte-equality against `LOCKED_COPY.en.*`. PT-BR is NOT snapshot-locked (machine-translated initially; v1.x native-speaker review per I18N-07). Each PT-BR locked entry carries an inline `// LOCKED: back-translation = "..."` comment so reviewers can verify intent without re-translating. Test ALSO asserts `LEARN_CONTENT[locale].forrest.body` does NOT contain `LOCKED_COPY[locale].inspiredByForrest` as substring (prevents accidental re-inlining of the phrase into the body for either locale). Chosen over (b) frozen EN + frozen PT-BR snapshots (forces every native-speaker review pass to also update tests — friction tax on the v1.x carry-forward) and (c) key-existence allowlist + EN snapshot only (weaker — PT-BR free to drift to anything) and (d) snapshot + PR-checklist markdown doc (belt-and-suspenders, but no automation enforces the checklist).

- **D-03:** **Lock scope = 3 D-12 minimum entries: `inspiredByForrest` + `medicalAdviceLine` + `affiliationLine`.** Matches Phase 6 D-12 literally. Clearest contract; smallest blast radius. Chosen over (b) extended (3 + LearnDialog title `About this practice`) and (c) maximal (3 + dialog title + Forrest section title + framing first paragraph) — both widen the lock surface without a clear claim-safe gain; both create review friction for legitimate copy iteration of non-D-12 framing.

- **D-04:** **Composition: LearnDialog + App.tsx render locked copy directly from `LOCKED_COPY[locale]`; `learnContent.forrest.body` is stripped of the substring.** Specifically:
  - `LearnDialog.tsx` `forrest` section renders `{learnContent.forrest.body}` (without the phrase) followed by a separate `<p>` rendering `{lockedCopy.inspiredByForrest}`. Planner picks the exact JSX shape (italicized closing line vs same-paragraph close).
  - `LearnDialog.tsx:171` `<p>Independent project. Not affiliated with Forrest Knutson.</p>` becomes `<p>{lockedCopy.affiliationLine}</p>`.
  - `App.tsx:686` `<p>Guided breathing practice — not medical advice.</p>` becomes `<p>{lockedCopy.medicalAdviceLine}</p>`.
  - Test guard: `learnContent[locale].forrest.body` does NOT contain `lockedCopy[locale].inspiredByForrest` as substring.

  Chosen over (b) keep phrase inline in learnContent + parallel substring assertion (redundant storage, two places per locale to keep in sync) and (c) marker-only LOCKED_KEYS array naming paths (weaker — no snapshot lock on values).

### Hook architecture

- **D-05:** **`useLocale` orchestrator + `useLocaleChoice` picker setter.** Mirror Phase 16 theme pattern verbatim with `theme → locale` rename. `useLocale` lives in App.tsx; `useLocaleChoice` lives in LanguagePicker.tsx. Capture-at-Start is NOT needed (picker disabled in-session per I18N-02 + Phase 15 D-02), unlike Phase 17 (variant) or Phase 18 (timbre) which need engine/render snapshots. Chosen over (b) single combined `useLocale` hook (collapses the read/write split that Phase 16 carefully separated; setter co-located with App-state hook means picker re-renders App-state-bearing hook on every click) and (c) picker-only `useLocaleChoice` + App-side listener+state (works mechanically but diverges from Phase 16 pattern; concentrates listener logic in App.tsx which is already busy).

- **D-06:** **`useLocale` returns `{ locale: LocaleId, uiStrings: UiStrings }`.** Hook resolves `UI_STRINGS[locale]` lookup once per locale change; App drills `uiStrings.*` slices via props. `learnContent` + `lockedCopy` are NOT in the hook return — App resolves them inline (`const learnContent = LEARN_CONTENT[locale]; const lockedCopy = LOCKED_COPY[locale]`). Chosen over (b) `{ locale }` only with App-side lookup (one extra import in App; trivial) and (c) `{ locale, uiStrings, learnContent, lockedCopy }` all-resolved (largest hook surface; encapsulates more but couples the hook to every translatable catalog).

- **D-07:** **`document.documentElement.lang` write via `useEffect([locale])` only — no FOUC inline script in `index.html`.** Mirror useTheme's `dataset.theme` write pattern but for the `lang` attribute. `<html lang="en">` static default stays in `index.html`. Rationale: there is no visual FOUC for `lang` (it only affects screen-reader voice selection + `:lang()` CSS selectors, both of which gracefully handle a brief mismatch on first paint). Smaller index.html diff; less load-time JS in `<head>`. Chosen over (b) mirror Phase 16 FOUC inline script for `<html lang>` (symmetric with theme but pays head JS cost for mostly invisible benefit) and (c) no `<html lang>` write at all (violates accessibility — screen reader stays in EN voice for PT-BR UI).

- **D-08:** **`useLocaleChoice` is a verbatim clone of `useTimbreChoice.ts` with `timbre → locale` rename.** Same `useCallback` empty-deps stable identity, same `'hrv:prefs-changed'` dispatch with `{ detail: { key: 'locale', value: next } }`, same optimistic local state mirror. The optimistic mirror is preserved (not strictly needed because `useLocale` re-reads via the same-tab listener, but mirrors the pattern and removes a one-frame lag if the listener-dispatch round-trip is delayed by React batching).

### Strings consumption pattern

- **D-09:** **Prop-drill `uiStrings` slices from App.tsx into each consumer.** App passes typed sub-slices (e.g. `<SessionControls strings={uiStrings.controls} />`). No React Context provider, no `useUiStrings()` consumer hook. Mirrors how `learnContent` is already passed today + how `prefs` flows. TypeScript flags missing slices at the call site. Chosen over (b) `LocaleContext` + `useUiStrings()` hook (smaller prop surface but adds a provider wrapper + hook + tests need provider helper) and (c) hybrid (mixed prop-drill + context — extra cognitive overhead).

- **D-10:** **`UiStrings` is a deeply-nested interface with sub-objects per component/feature.** TypeScript surface enforces every locale provides every slice. Sub-objects are scoped exactly to their consumer (`uiStrings.endSessionDialog` → `EndSessionDialog`'s slice). Slicing into props is a single `.foo` away. Chosen over (b) flat dotted keys `Record<'controls.start' | ..., string>` (smaller type, weaker tooling, error-prone lookup) and (c) component-keyed top-level with flat values within (cosmetic difference; nested wins on ergonomics for nested groups like `themes` / `variants` / `timbres`).

- **D-11:** **App.tsx resolves `learnContent` + `lockedCopy` once per render and prop-drills.** `<LearnDialog learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn} />`. LearnDialog is locale-agnostic at runtime; it receives resolved catalogs. Chosen over (b) LearnDialog calls `useLocale()` directly (couples component to hook; harder to test in isolation) and (c) `useLocale` returns all 3 catalogs (overrules D-06 — wider hook surface).

- **D-11a:** **In-session string-surface live re-render policy = `BreathingShape` (Inhale/Exhale phase labels + lead-in countdown text) re-renders on locale change.** Because the picker is disabled while `inSessionView`, the ONLY path for a mid-session locale change is a cross-tab `'storage'` event from a sibling tab. This is rare; when it happens, the next render passes the new `uiStrings.breathing.{inhale,exhale}` slice to `<BreathingShape>` and labels swap atomically. No `sessionLocaleRef` capture-at-Start; no mid-render-mid-phase guarding. Acceptable per I18N-02 ("does not interrupt the running breath loop" — the breath TIMING is unaffected; the label TEXT swaps, which is a string render, not a timing event). Planner verifies the BreathingShape strings prop is stable-by-reference across non-locale-change renders to avoid React reconciliation churn (memoize slice or pass primitives).

### Translation surface + PT-BR provenance

- **D-12:** **Translate everything user-visible.** UI chrome (buttons, labels, aria-labels, dialog copy), section labels (Theme / Variant / Timbre / Language), AND option names: Theme palette names (`light → Claro`, `dark → Escuro`, `system → Sistema`, `moss → Musgo`, `slate → Ardósia`, `dusk → Crepúsculo`), Variant names (`orb → Esfera`, `square → Quadrado`, `diamond → Losango`), Timbre names (`bowl → Tigela`, `bell → Sino`, `sine → Senoidal`, `chime → Carrilhão`). Picker option buttons render the translated name via `uiStrings.{themes,variants,timbres}[id]` lookup, not the raw id. Chosen over (b) chrome translated, option names stay English identifiers (mixed feel — English options inside Portuguese dialog) and (c) chrome translated + LocaleId endonym convention only (compromise that does not fully translate other dimensions' picker bodies).

- **D-13:** **PT-BR sourcing = machine-translated during execution + `// TODO: native-speaker review` flag per entry, per I18N-07.** Planner/executor generates PT-BR strings using best-effort knowledge during execution. Every PT-BR translatable entry carries an inline `// TODO: native-speaker review` comment. Native-speaker review is a v1.x carry-forward already tracked in `REQUIREMENTS.md` "Per-locale `learnContent.ts` native-speaker review" row. Plan task count stays manageable; ships v1.1 on time. Operator spot-checks during UAT and flags any obvious errors before commit. Chosen over (b) operator hand-translates upfront (highest quality but requires operator availability + slows plan-phase) and (c) hybrid (chrome hand-translated, learnContent machine-translated — splits the review surface awkwardly).

- **D-14:** **LanguagePicker option labels = native endonyms regardless of current UI locale.** English option always shows `English`; PT-BR option always shows `Português (Brasil)`. Same labels in BOTH EN UI and PT-BR UI. Standard i18n convention — users picking a language they don't yet understand can still identify their target. Labels do NOT flow through `UI_STRINGS`. Source: `LOCALE_DISPLAY_NAMES: Record<LocaleId, string>` constant exported from `src/content/strings.ts` (NOT `src/domain/settings.ts` per Phase 14 D-09 file-split invariant) or hardcoded inside `LanguagePicker.tsx`. Planner picks final location.

- **D-15:** **Template-interpolated strings are functions inside `UiStrings`.** `UiStrings.stepper.decreaseLabel: (fieldLabel: string) => string`. EN: `` (l) => `Decrease ${l}` ``. PT-BR: `` (l) => `Diminuir ${l}` ``. TypeScript enforces function-signature parity across locales. Consumer call: `aria-label={strings.decreaseLabel(label)}`. Same pattern for any other interpolated entries (e.g. `Increase ${label}`, `Settings (unavailable during session)` — though the latter has no interpolation and is a plain string). Chosen over (b) placeholder strings + `.replace()` at use site (error-prone; misses lint) and (c) per-field aria-labels (catalog bloat — 3 fields × 2 dirs × 2 locales = 12 strings instead of 4).

### Carry-forward invariants (load-bearing for Phase 19)

- **D-16:** **Per-commit green-gate** (Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15 / Phase 13 D-10 / Phase 14 D-14 / Phase 15 D-14 / Phase 16 / Phase 16.1 / Phase 16.2 / Phase 16.3 / Phase 17 D-17 / Phase 18 D-13). `npx tsc --noEmit && npm run lint && npm run build && npm test` exits 0 at every commit boundary.

- **D-17:** **Zero new npm dependencies** (PROJECT.md v1.1 "Zero net-new runtime deps" invariant). No `i18next`, no `react-i18next`, no `@lingui/*` — STACK.md §4 chose roll-your-own for v1.1. Pure typed `Record<LocaleId, UiStrings>` + module-level catalog. Re-evaluate framework only at 5+ locales (STACK.md "When to revisit").

- **D-18:** **Phase 14 D-09 file-split invariant preserved.** `src/domain/settings.ts` is NOT edited in Phase 19 — `LocaleId` / `LOCALE_OPTIONS` / `isValidLocale` / `DEFAULT_LOCALE = 'en'` already locked. `src/storage/prefs.ts` is NOT edited — `loadPrefs` / `savePrefs` / `coerceLocale` already locked.

- **D-19:** **Phase 15 D-01 picker invariant preserved (reinterpreted).** `src/components/SettingsDialog.tsx` body structure is NOT restructured. The exception is that Phase 19 adds a `strings` prop and drills slices to picker children (replacing inline `<h2>Settings</h2>` literal). Planner verifies the diff stays minimal — no new layout, no new sections, no new state.

- **D-20:** **Phase 15 D-02 picker prop contract preserved.** `LanguagePicker` accepts exactly `{ disabled: boolean }`. No new value prop. Picker self-reads `loadPrefs()` and owns its own `savePrefs()` write path via `useLocaleChoice` (mirror of `useThemeChoice` / `useVariantChoice` / `useTimbreChoice`).

- **D-21:** **`'hrv:prefs-changed'` CustomEvent contract reuse** (Phase 16 forward-decl at `useTheme.ts:76`; Phase 17 D-22; Phase 18 D-18). Phase 19 dispatches `new CustomEvent('hrv:prefs-changed', { detail: { key: 'locale', value: next } })` from `useLocaleChoice.setLocale`. The App-side `useLocale` consumes the event by filtering on `detail.key === 'locale'` (and `detail.key === undefined` for forward-compat). Cross-tab `'storage'` event re-reads `loadPrefs().locale` on `STATE_KEY` writes.

- **D-22:** **THEME-UI-01 token-binding guard remains green.** No hardcoded `text-{slate,teal}-*` / `bg-{slate,teal}-*` / `text-white` / `bg-white` Tailwind utilities in any new or modified `.tsx` file. `LanguagePicker` chrome uses `var(--color-breathing-*)` tokens verbatim from `ThemePicker` / `TimbrePicker`. `theme.no-hardcoded-classes.test.ts` continues to exit 0.

- **D-23:** **A11y floor** (Phase 2 D-15/D-17/D-21 carry-forward + Phase 17 D-24 + Phase 18 D-20). LanguagePicker buttons honor 44×44 hit area + `focus-visible` ring contracts. Mirror `ThemePicker` / `TimbrePicker` radiogroup `aria-checked` + `aria-labelledby` posture verbatim.

- **D-24:** **Strict TS + `strictTypeChecked` + `react-hooks/exhaustive-deps: error`** (Phase 7 baseline). All new code passes the lint/type floor with NO new `// eslint-disable` lines unless annotated with `// Reason:` per Phase 7 D-04.

- **D-25:** **`FakeAudioContext` polyfill is unaffected.** Phase 19 touches strings only; no audio surface. Existing 644/644 Vitest tests stay green; new tests use the same Vitest + jsdom setup.

### Claude's Discretion

- **Planner picks file naming** — `src/content/strings.ts` (research recommendation) vs `src/content/uiStrings.ts` (architecture recommendation). Both work. Recommendation: `strings.ts` for symmetry with `learnContent.ts` + `lockedCopy.ts` (all under `src/content/`).
- **Planner picks `LOCALE_DISPLAY_NAMES` location** — either `src/content/strings.ts` exported alongside `UI_STRINGS` (preferred — keeps i18n surface co-located) or hardcoded in `LanguagePicker.tsx`. NOT in `src/domain/settings.ts` (Phase 14 D-09).
- **Planner picks JSX shape for the extracted Forrest phrase** in `LearnDialog.tsx` — italicized closing paragraph vs same-paragraph close. The invariant is that `learnContent.forrest.body` no longer contains the phrase substring.
- **Planner picks how to split Phase 19 into plan files** — recommendations from this CONTEXT: 6–8 plans, parallelizable along (a) catalog + locked-copy module + tests (Wave 1), (b) useLocale + useLocaleChoice + tests (Wave 1, parallel), (c) LanguagePicker body + native endonyms + tests (Wave 2), (d) ~15 component edits to accept `strings` prop + replace inline literals (Wave 2 + Wave 3, parallelizable by component group), (e) App.tsx integration + catalog resolution + medical-advice line lockedCopy migration (Wave 4), (f) E2E + phase close (Wave 5).
- **Planner picks SettingsForm prop-drill shape** — SettingsForm receives `strings={uiStrings.settingsForm}` then internally drills to its 3 SettingsStepper instances. Either SettingsForm passes `strings.stepper` + 3 distinct field labels, or each stepper instance receives its own `strings={uiStrings.settingsForm.bpmStepper}` slice. Recommendation: pass `strings.stepper` (template fns) + per-field `label` string. Smaller catalog surface, function interpolates.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher + planner) MUST read these before planning or implementing.**

### Phase requirements + roadmap

- `.planning/ROADMAP.md` §"Phase 19: Language Switching" — Goal + 5 Success Criteria. SC1 instant re-render no reload + breath loop unaffected, SC2 picker disabled in-session + EN default unchanged, SC3 persistence + coerce fallback to 'en', SC4 locked claim-safe copy routed through PT-BR pipeline + guardrail mechanism present, SC5 PT-BR shipped with `TODO: native-speaker review` flags + green-gate.
- `.planning/REQUIREMENTS.md` §"Language Switching (I18N-01)" I18N-01..07 — full requirement text. **I18N-06 explicitly overrides** STACK.md / PITFALLS.md Pitfall 5 recommendation that locked copy stays as TS constants — Planning MUST add a guardrail mechanism per I18N-06 NOTE.
- `.planning/PROJECT.md` Key Decisions — "English first while keeping multilingual support possible later" v1.0 D-12 + "Locked claim-safe phrase + 2-line disclaimer (Phase 6 D-12)" + "Per-commit green-gate" + "Zero net-new runtime deps" v1.1 invariants.

### Locked prior-phase contracts (read in full — agents must respect these)

- `.planning/phases/14-prefs-foundation/14-CONTEXT.md` — D-01 (`LocaleId = 'en' | 'pt-BR'` locked) + D-04 (`DEFAULT_LOCALE = 'en'`) + D-09 (file-split invariant: `domain/settings.ts` and `storage/prefs.ts` NOT edited downstream) + D-10 (coercer API surface) + D-17 (coerceLocale fallback semantics).
- `.planning/phases/15-settingsdialog-shell/15-CONTEXT.md` — D-01..04 (picker contract + naming + stub) + D-08 (gear / picker disabled-in-session) + D-15 (zero new deps). **D-18** (Phase 15 hardcoded `Language` section label — Phase 19 reinterprets this as `uiStrings.settings.languageLabel` lookup).
- `.planning/phases/16-themes/16-CONTEXT.md` — `useTheme` + `useThemeChoice` orchestrator/picker hook pair + `'hrv:prefs-changed'` CustomEvent contract forward-decl at `useTheme.ts:76`. **The Phase 19 `useLocale` + `useLocaleChoice` split is a verbatim mirror of this pattern with `theme → locale` rename.**
- `.planning/phases/17-visual-variants/17-CONTEXT.md` — D-22 (`'hrv:prefs-changed'` reuse) + D-23 (THEME-UI-01 guard) + D-24 (a11y floor). Variant option names (Orb / Square / Diamond) are translated in Phase 19 per D-12 above.
- `.planning/phases/18-audio-timbres/18-CONTEXT.md` — `useTimbreChoice.ts` (picker-side hook pattern; verbatim clone target for `useLocaleChoice`) + D-18 (`'hrv:prefs-changed'` contract reuse, `detail.key` filter). Timbre option names (Bowl / Bell / Sine / Chime) are translated in Phase 19 per D-12. Phase 18 D-06 "name-only" decision is honored — Phase 19 translates the names but does NOT add descriptors.

### Phase 6 claim-safe locked copy origin

- `.planning/phases/` — Phase 6 D-12 source (locked `inspired by Forrest's teachings` phrase + 2-line disclaimer). The exact strings + amendments (D-14 moved one disclaimer line to App.tsx; D-15 moved another) live in current shipped source — see "EN locked-copy baseline" table above.

### Research (provides catalog pattern; this CONTEXT extends with I18N-06 override + guardrail)

- `.planning/research/STACK.md` §4 "Language Switching (I18N-01)" — Roll-your-own typed `Record<LocaleKey, UiStrings>` decision. Why not react-i18next (~22 kB), Lingui (Vite friction + macro compile), or React-intl. **NOTE:** Pitfall 5 recommendation that locked copy stay as TS constants is SUPERSEDED by REQUIREMENTS.md I18N-06 — Phase 19 routes locked copy through the translation pipeline with the D-01..D-04 guardrail.
- `.planning/research/ARCHITECTURE.md` §"I18N-01: Language Switching" — `src/content/uiStrings.ts` (renamed to `strings.ts` per planner discretion) + locale-keyed `learnContent.ts` + prop-drill from App.tsx (≤3-deep tree).
- `.planning/research/FEATURES.md` "Language switching without a page reload" — instant React state swap framing.
- `.planning/research/PITFALLS.md` Pitfall 5 "i18n string IDs that collide with the locked-copy contract" — original Pitfall recommends keeping locked copy OUT of the translation pipeline. **SUPERSEDED by I18N-06** — Phase 19 routes locked copy THROUGH the pipeline with frozen-EN snapshot guardrail (D-02).
- `.planning/research/PITFALLS.md` Pitfall 6 "i18n lazy-loaded locale bundles + Vitest determinism" — N/A for Phase 19 (synchronous static catalog; no lazy loading; no i18n library).

### Source files Phase 19 directly touches or extracts from

- `src/content/learnContent.ts` (94 LOC) — current EN-only `LEARN_CONTENT` singleton; Phase 19 converts to `Readonly<Record<LocaleId, LearnContent>>` and strips `"inspired by Forrest's teachings"` substring from `forrest.body` second paragraph (line 46).
- `src/content/learnContent.test.ts` — existing EN content tests; Phase 19 extends with PT-BR coverage.
- `src/components/LearnDialog.tsx` (~180 LOC) — existing inline literals `<h2>About this practice</h2>` (line 81) + `<p>Independent project. Not affiliated with Forrest Knutson.</p>` (line 171) become `strings.learn.title` + `lockedCopy.affiliationLine`. New `<p>` renders `lockedCopy.inspiredByForrest` after `forrest` section body.
- `src/components/LearnDialog.test.tsx:48` — existing "does NOT render medical-advice sentence inside the modal (D-14 amendment 2026-05-10)" guard stays green. New PT-BR rendering test added.
- `src/app/App.tsx` (~700 LOC) — invoke `useLocale()`; resolve `learnContent` + `lockedCopy` per render; prop-drill `uiStrings.*` slices to ~15 components; line 686 inline `<p>Guided breathing practice — not medical advice.</p>` becomes `<p>{lockedCopy.medicalAdviceLine}</p>`.
- `src/components/LanguagePicker.tsx` (29 LOC) — Phase 15 stub body. Phase 19 fills with radiogroup mirror of `ThemePicker.tsx`. Native endonym labels per D-14.
- `src/components/SettingsDialog.tsx` — existing inline `<h2>Settings</h2>` (line 80) becomes `strings.title`. New `strings` prop drilled to 4 picker children.
- `src/components/SettingsForm.tsx` — existing inline `aria-label="Session settings"` (line 52) becomes `strings.ariaLabel`. Drills `strings.stepper` + per-field `label` to 3 `<SettingsStepper>` instances.
- `src/components/SettingsStepper.tsx:35,44,59` — `aria-label={label}` + `aria-label={`Decrease ${label}`}` + `aria-label={`Increase ${label}`}` become `aria-label={strings.fieldAriaLabel(label)}` + `aria-label={strings.decreaseLabel(label)}` + `aria-label={strings.increaseLabel(label)}`.
- `src/components/MuteToggle.tsx:45,46` — `aria-label={label}` + `title={label}` — label is derived from internal state; Phase 19 plumbs `strings.{mute,unmute,resume}` per state.
- `src/components/SessionReadout.tsx:28,33,63,68` — aria-labels `Session readout` + `Session announcement` become `strings.{readoutAriaLabel,announcementAriaLabel}`.
- `src/components/SettingsAnchor.tsx:21,44` — `aria-label={disabled ? 'Settings (unavailable during session)' : 'Settings'}` + inline `Settings` span become `strings.{anchor.settings,anchorDisabled.settings}` lookups.
- `src/components/LearnAnchor.tsx:22,45` — same pattern as SettingsAnchor for Learn labels.
- `src/components/ResetStatsDialog.tsx:52` — `aria-labelledby="reset-stats-title"` stays as id; the title text inside becomes `strings.title`.
- `src/components/EndSessionDialog.tsx:52` — same as ResetStats.
- `src/components/StatsFooter.tsx` — all visible stats labels (e.g. "Total sessions", "Total minutes", "Last session") become `strings.*`.
- `src/components/SessionControls.tsx` — Start / Stop / End session button labels become `strings.{start,stop,endSession}`.
- `src/components/BreathingShape.tsx` — Inhale / Exhale phase labels + lead-in countdown text become `strings.{inhale,exhale,leadIn}`.
- `src/components/ThemePicker.tsx`, `VariantPicker.tsx`, `TimbrePicker.tsx` — each accepts `strings.{themes,variants,timbres}` slice; option button labels render translated names per D-12. Mirror of how `id.charAt(0).toUpperCase() + id.slice(1)` is replaced by `strings[id]`.
- `src/hooks/useTheme.ts` (~100 LOC) — verbatim mirror target for `useLocale.ts`. Read the seed + 4 useEffect blocks; clone with `theme → locale` rename and `dataset.theme → documentElement.lang`.
- `src/hooks/useTimbreChoice.ts` (~50 LOC) — verbatim mirror target for `useLocaleChoice.ts`. Read the `useCallback` setter + `'hrv:prefs-changed'` dispatch; clone with `timbre → locale` rename.

### Test files Phase 19 extends or creates

- `src/content/strings.test.ts` (NEW) — `UI_STRINGS` exhaustiveness check (every LocaleId has every UiStrings sub-tree).
- `src/content/lockedCopy.test.ts` (NEW) — **FROZEN-EN snapshot guardrail** (D-02). Asserts EN locked-copy byte-equality + PT-BR non-empty + `learnContent[locale].forrest.body` does NOT contain `lockedCopy[locale].inspiredByForrest` as substring.
- `src/content/learnContent.test.ts` (EXTENDED) — existing EN tests stay green; PT-BR shape parity + link URL identity.
- `src/hooks/useLocale.test.ts` (NEW) — seed-from-loadPrefs, cross-tab + same-tab listeners, `documentElement.lang` write effect.
- `src/hooks/useLocaleChoice.test.ts` (NEW) — verbatim mirror of `useTimbreChoice.test.ts`.
- `src/components/LanguagePicker.test.tsx` (EXTENDED) — radiogroup posture, native endonyms in both UI locales, savePrefs write + custom-event dispatch with `detail.key === 'locale'`, disabled gate.
- `src/components/LearnDialog.test.tsx` (EXTENDED) — existing medical-advice modal-absence guard stays green; PT-BR rendering smoke test.
- ~15 component test files (EXTENDED) — fixtures pass `strings` prop typed against EN UI_STRINGS slice.
- `src/app/App.test.tsx` (or wherever App-level smoke lives) — locale-switch + `documentElement.lang` write + PT-BR idle-state strings present after switch.

### Carry-forward test guards

- `src/styles/theme.no-hardcoded-classes.test.ts` (Phase 16.1-07) — THEME-UI-01 token-binding guard. Must stay green after LanguagePicker body fill (D-22).
- `vitest.setup.ts` — `FakeAudioContext` polyfill. Phase 19 touches strings only; audio surface unaffected.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useTheme.ts` (~100 LOC)** — orchestrator hook with seed-from-loadPrefs + 4 useEffect blocks (apply-effect, gated-mql-effect, cross-tab 'storage' listener, same-tab 'hrv:prefs-changed' listener). Mirror target for `useLocale.ts` with `theme → locale` rename; the gated-mql-effect collapses to nothing (locale has no system-mode counterpart) so useLocale has 3 effects instead of 4.
- **`useTimbreChoice.ts` (~50 LOC)** — verbatim clone target for `useLocaleChoice.ts`. `useCallback` empty-deps setter; loadPrefs read + savePrefs write + CustomEvent dispatch + optimistic local state mirror.
- **`useThemeChoice.ts`** + **`useVariantChoice.ts`** — additional mirror references for the picker hook pattern.
- **`ThemePicker.tsx`** + **`TimbrePicker.tsx`** + **`VariantPicker.tsx`** — radiogroup body patterns. Each renders `LOCALE_OPTIONS.map(id => <button aria-checked={prefs.locale === id}>...)` with selected/unselected token-bound chrome. LanguagePicker mirrors this with 2 options in `grid-cols-1` or `grid-cols-2` — planner picks (TimbrePicker uses grid-cols-2 for 4; LanguagePicker likely grid-cols-1 vertical or grid-cols-2 horizontal for 2 — both fit dialog width).
- **`LEARN_CONTENT` section-keyed shape (`learnContent.ts`)** — already structured for locale swap per v1.0 D-12 (comment at `learnContent.ts:3`: "Section keys (`hrv`, `timing`, `forrest`) are i18n-stable identifiers for future locale swap"). Phase 19 extends to `Record<LocaleId, LearnContent>` — the shape under each locale stays identical.
- **`'hrv:prefs-changed'` CustomEvent contract** (Phase 16 forward-decl, Phase 17/18 reuse) — `{ detail: { key, value } }` shape; consumers filter on `detail.key`. Phase 19 adds `key === 'locale'` to the set of dispatched/consumed keys.

### Established Patterns

- **Phase 14 D-09 file-split invariant** — `src/domain/settings.ts` and `src/storage/prefs.ts` are NOT edited downstream. `LocaleId` / `LOCALE_OPTIONS` / `isValidLocale` / `DEFAULT_LOCALE` / `loadPrefs` / `savePrefs` / `coerceLocale` already locked.
- **Phase 15 D-02 picker prop contract** — every picker accepts exactly `{ disabled: boolean }`, self-reads `loadPrefs()`, owns its own write path via a picker-side hook. LanguagePicker mirrors this.
- **Phase 16 useTheme orchestrator + useThemeChoice picker setter** — the split pattern Phase 19 mirrors verbatim. useTheme writes `dataset.theme`, listens cross-tab + same-tab. useLocale writes `documentElement.lang`, listens the same way.
- **Phase 16 FOUC inline script (`index.html`)** — pre-paint `data-theme` attribute write. Phase 19 explicitly does NOT mirror this for `<html lang>` per D-07.
- **Phase 16.1 THEME-UI-01 token-binding guard** — `theme.no-hardcoded-classes.test.ts`. New LanguagePicker chrome uses `var(--color-breathing-*)` tokens only.
- **Phase 17 / Phase 18 picker option rendering** — `id.charAt(0).toUpperCase() + id.slice(1)` capitalization fallback. Phase 19 REPLACES this with `strings.{themes,variants,timbres}[id]` lookup so option names get translated per D-12.
- **Phase 6 D-12 locked claim-safe copy** — `"inspired by Forrest's teachings"` + 2-line disclaimer. Phase 19 routes through `LOCKED_COPY` with frozen-EN snapshot guardrail per D-01..D-04.
- **D-14 / D-15 amendments (2026-05-10)** — disclaimer line split: medical-advice line lives in `App.tsx:686`, affiliation line lives in `LearnDialog.tsx:171`. Phase 19 honors this split via separate `lockedCopy.medicalAdviceLine` + `lockedCopy.affiliationLine` keys.
- **`react-hooks/exhaustive-deps: error` + `// Reason:` annotation policy** (Phase 7 D-04) — `useLocale` effects use empty deps for the listeners (mirror of useTheme effects 3+4); empty-deps are correct because `setLocale` from `useState` is stable + `loadPrefs` / `STATE_KEY` are module-level.

### Integration Points

- **App.tsx mount/render** — `const { locale, uiStrings } = useLocale()` invoked near other prefs hooks. `const learnContent = LEARN_CONTENT[locale]` + `const lockedCopy = LOCKED_COPY[locale]` resolved once per render. Slices drilled to ~15 components.
- **App.tsx onStartClick** — NO change. Locale is not captured at session start (D-11a — in-session live re-render is acceptable for the cross-tab edge case).
- **LanguagePicker stub at `LanguagePicker.tsx`** — body replaced with radiogroup using `useLocaleChoice` hook.
- **SettingsDialog.tsx** — minimal restructure; adds `strings` prop, replaces inline `<h2>Settings</h2>` literal, drills slices to 4 picker children.
- **LearnDialog.tsx** — adds `strings` + `learnContent` + `lockedCopy` props (replacing hardcoded `LEARN_CONTENT` import). Renders `lockedCopy.inspiredByForrest` as a separate paragraph in the forrest section. Renders `lockedCopy.affiliationLine` in place of the inline literal at line 171.
- **App.tsx:686** — `<p>Guided breathing practice — not medical advice.</p>` becomes `<p>{lockedCopy.medicalAdviceLine}</p>`.
- **index.html** — `<html lang="en">` static default stays. No inline script edit.

</code_context>

<specifics>
## Specific Ideas

- **EN locked-copy baseline (verbatim, byte-exact, with em-dash U+2014 in medical-advice):**
  - `inspiredByForrest = "inspired by Forrest's teachings"` (source: `learnContent.ts:46`, embedded substring inside forrest.body second paragraph; uses straight ASCII apostrophe U+0027)
  - `medicalAdviceLine = "Guided breathing practice — not medical advice."` (source: `App.tsx:686`; em-dash U+2014)
  - `affiliationLine = "Independent project. Not affiliated with Forrest Knutson."` (source: `LearnDialog.tsx:171`)
- **PT-BR locked-copy initial values (machine-translated; planner/executor finalizes during execution; each carries `// LOCKED: back-translation = "..."` comment):**
  - `inspiredByForrest`: candidates "inspirado nos ensinamentos do Forrest" / "inspirado pelos ensinamentos do Forrest" — planner picks based on context fit with surrounding `forrest.body`.
  - `medicalAdviceLine`: candidates "Prática de respiração guiada — não é conselho médico." / "Prática guiada de respiração — não é conselho médico."
  - `affiliationLine`: candidates "Projeto independente. Sem vínculo com Forrest Knutson." / "Projeto independente. Não afiliado a Forrest Knutson."
- **PT-BR LanguagePicker section label** — `Language → Idioma` // TODO: native-speaker review.
- **LOCALE_DISPLAY_NAMES** — `{ en: 'English', 'pt-BR': 'Português (Brasil)' }`. Same labels in both UI locales (native endonym convention).
- **`UiStrings.themes.system`** must exist even though it's a Theme-only key (no per-locale variation in the underlying ThemeId enum) — translates to `Sistema` / `System`.
- **Test fixture pattern** — every component test that now takes `strings` prop should have a top-of-file `const EN_STRINGS_FIXTURE = UI_STRINGS.en` import and pass `strings={EN_STRINGS_FIXTURE.controls}` (or relevant slice). Avoids duplicating string literals in tests.
- **`LEARN_CONTENT_BY_LOCALE` vs `LEARN_CONTENT`** — planner picks the export name. Recommendation: rename the existing `LEARN_CONTENT: LearnContent` singleton to `LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>>` (keep the name, change the shape) — minimizes import churn at LearnDialog call sites. The existing `learnContent.ts:5-7` header comments need updating to reflect locale-keyed shape.
- **Locale-keyed `learnContent.ts` `forrest.body` second paragraph** — EN stripped of `"inspired by Forrest's teachings"` substring. The rendered output composes body + locked phrase as adjacent paragraphs (or italicized closing line — planner picks JSX).
- **Vitest test for `documentElement.lang` write** — `render(<App />); expect(document.documentElement.lang).toBe('en'); act(() => fireEvent.click(ptBrButton)); expect(document.documentElement.lang).toBe('pt-BR')`.

</specifics>

<deferred>
## Deferred Ideas

- **Capture-at-Start `sessionLocaleRef`** — not needed because picker is disabled in-session (I18N-02 + Phase 15 D-02). The only mid-session locale change path is a cross-tab `'storage'` event, which is rare and acceptable per D-11a. Re-evaluate only if user UAT shows the mid-session string swap is jarring.
- **Native-speaker PT-BR review** — explicit v1.x carry-forward per I18N-07 + REQUIREMENTS.md. Triggered when a native PT-BR reviewer is available; updates strings.ts + learnContent.ts pt-BR entries; removes `// TODO: native-speaker review` markers; updates `lockedCopy.ts` PT-BR back-translation comments if any value changes; re-runs lockedCopy.test.ts (only EN is snapshot-locked, PT-BR is free to update).
- **Third locale onboarding** — currently the LOCKED_COPY snapshot is EN-only. Adding a third locale (e.g. `'es'`) requires:
  1. Extend `LocaleId` in `src/domain/settings.ts` (Phase 14 file-split invariant exception — only the type widens).
  2. Add full `UI_STRINGS.es` + `LEARN_CONTENT.es` + `LOCKED_COPY.es` entries.
  3. PT-BR pattern repeats: machine-translate, flag with TODO, snapshot stays EN-only.
  4. `lockedCopy.test.ts` substring guard auto-covers the new locale (assertion already iterates locales).
- **Lazy-loaded locale bundles** — STACK.md §4 explicitly defers. Current catalog is small enough to ship statically. Re-evaluate at 5+ locales.
- **Pluralization / ICU MessageFormat / date-time formatting** — current copy has no plurals or date formatting needs (Phase 4 `formatLastSessionDate` is a pure date format that may need localization; revisit when adding a locale that needs different date order). Defer to v1.x.
- **`<html dir>` RTL support** — neither EN nor PT-BR is RTL. Defer until an RTL locale ships.
- **i18n library migration** — STACK.md §4 explicitly defers framework adoption until 5+ locales. Roll-your-own catalog migrates mechanically to `t('key.path')` if/when needed.
- **`LOCALE_DISPLAY_NAMES` in `src/domain/settings.ts`** — REJECTED by Phase 14 D-09 file-split invariant. Lives in `src/content/strings.ts` (preferred) or hardcoded in `LanguagePicker.tsx`.
- **FOUC-prevention inline script for `<html lang>`** — explicitly rejected per D-07. Revisit only if accessibility audit shows the brief lang mismatch on first paint causes screen-reader voice glitches.
- **`<head>` `<title>` translation** — current `<title>HRV Breathing</title>` in index.html is English. Translating `<title>` requires a `useEffect` write to `document.title` from useLocale OR an inline script in index.html. Defer to v1.x; current title is brand-like and acceptable in both locales.
- **Per-component string defaulting** — components could accept `strings?: ...` and fall back to EN defaults if undefined. Phase 19 chose strict required prop (TypeScript enforces every call site passes it). Defer optional defaulting unless tests show it's needed.
- **Snapshot lock on PT-BR locked copy** — D-02 explicitly chose EN-only snapshot. Re-evaluate after native-speaker review pass — once PT-BR is finalized, a second snapshot can be added to lock that final version.

### Reviewed Todos (not folded)

None — no todos cross-referenced into Phase 19.

</deferred>

---

*Phase: 19-language-switching*
*Context gathered: 2026-05-14 via /gsd-discuss-phase*
