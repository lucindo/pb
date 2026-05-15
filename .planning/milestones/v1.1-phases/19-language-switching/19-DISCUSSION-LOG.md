# Phase 19: Language Switching - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 19-language-switching
**Areas discussed:** I18N-06 locked-copy guardrail, Hook architecture + `<html lang>`, Strings consumption pattern, Translation surface + PT-BR provenance

---

## I18N-06 locked-copy guardrail

### Sub-decision 1 — Lock site (where locked claim-safe strings live)

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `lockedCopy.ts` module | New `src/content/lockedCopy.ts` exports `LOCKED_COPY: Record<LocaleId, LockedCopy>` alongside UiStrings. Physical separation makes locked strings obvious. Forrest phrase moves out of `learnContent.ts` body. | ✓ |
| Embedded in UiStrings with `LOCKED_` prefix | Locked entries live inside UI_STRINGS / LEARN_CONTENT with `LOCKED_` key prefix. Single catalog; lock semantics enforced by test + naming convention only. | |
| Locked module + barrel re-export | `lockedCopy.ts` holds locked strings; `strings.ts` barrel re-exports merged into UiStrings for consumer ergonomics. Lock site is one file; consumers see one unified strings tree. | |

**User's choice:** Separate `src/content/lockedCopy.ts` module.

### Sub-decision 2 — Guard mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Frozen EN snapshot + PT-BR back-translation comment | Vitest test asserts EN locked strings match exact baseline; PT-BR entries free to iterate but each carries `// LOCKED: back-translation = "..."` source comment. | ✓ |
| Frozen EN + PT-BR snapshots (strict) | Both locales snapshot-locked. Stronger guard; forces every PT-BR native-speaker review to update tests. | |
| Key-existence allowlist + EN snapshot only | Test asserts every locale has all locked keys present and non-empty + EN values match snapshot. PT-BR free to change. | |
| Snapshot + PR checklist markdown doc | Frozen EN snapshot PLUS `.planning/docs/LOCKED_COPY_REVIEW.md` listing locked keys + sign-off rows. Belt-and-suspenders. | |

**User's choice:** Frozen EN snapshot + PT-BR back-translation comment.

### Sub-decision 3 — Lock scope

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 6 D-12 minimum: 3 entries | inspiredByForrest + disclaimerLine1 + disclaimerLine2. Matches D-12 literally. | ✓ |
| Extended: 3 + LearnDialog title `About this practice` | Framing language that sets the non-medical tone. | |
| Maximal: 3 + title + Forrest section title + body framing | Entire LearnDialog claim-safe surface locked. ~7 entries × 2 locales = 14 frozen. | |

**User's choice:** Phase 6 D-12 minimum.

### Sub-decision 4 — Composition

| Option | Description | Selected |
|--------|-------------|----------|
| Extract phrase + disclaimer; LearnDialog renders both from lockedCopy | `learnContent.forrest.body` strips the `inspired by Forrest's teachings` phrase; LearnDialog renders body + separate locked phrase paragraph. Disclaimer comes from `lockedCopy.affiliationLine`. Test guard asserts body does NOT contain locked phrase substring. | ✓ |
| Keep phrase inline in learnContent; lockedCopy is parallel assertion source | `learnContent.forrest.body` retains phrase; lockedCopy holds canonical value; test asserts body contains lockedCopy phrase as substring. Two storage sites per locale. | |
| Move all 3 entries into learnContent locale map; lockedCopy.ts is marker module | learnContent locale-keyed; lockedCopy exports `LOCKED_KEYS` array of paths; test asserts each path non-empty + EN snapshot. | |

**User's choice:** Extract phrase + disclaimer; LearnDialog renders both from lockedCopy.

**Notes:** During execution, the EN strings will be pulled verbatim from current source (`learnContent.ts:46` for phrase, `App.tsx:686` for medical-advice line, `LearnDialog.tsx:171` for affiliation line). Preview text in AskUserQuestion was illustrative; the actual baseline is in CONTEXT.md "EN locked-copy baseline" table. The D-14/D-15 amendments (2026-05-10) had already split the disclaimer into 2 separate lines living in 2 separate files — the lockedCopy keys mirror that split: `medicalAdviceLine` (App.tsx) + `affiliationLine` (LearnDialog.tsx).

---

## Hook architecture + `<html lang>`

### Sub-decision 1 — Hook split

| Option | Description | Selected |
|--------|-------------|----------|
| `useLocale` orchestrator + `useLocaleChoice` picker setter | Mirror Phase 16 theme pattern. useLocale writes `<html lang>`, listens cross-tab + same-tab. useLocaleChoice picker-side write+dispatch. | ✓ |
| Single `useLocale` hook (combined) | One hook does read+write+dispatch+listen+side-effect. Collapses the read/write split Phase 16 carefully separated. | |
| Picker-only `useLocaleChoice` + side-effect inside App.tsx | App.tsx writes `<html lang>` in useEffect; holds its own useState + listeners. Mirror Phase 18 timbre pattern. | |

**User's choice:** `useLocale` orchestrator + `useLocaleChoice` picker setter.

### Sub-decision 2 — `useLocale` return shape

| Option | Description | Selected |
|--------|-------------|----------|
| `{ locale, uiStrings }` — hook resolves the lookup | useLocale returns LocaleId + already-resolved UiStrings record. App passes uiStrings.* slices down. Hook encapsulates UI_STRINGS lookup. | ✓ |
| `{ locale }` only — App resolves the lookup | useLocale returns just LocaleId. App does `const uiStrings = UI_STRINGS[locale]`. Minimal hook surface. | |
| `{ locale, uiStrings, learnContent }` — resolve both catalogs | useLocale returns locale + both resolved catalogs. LearnDialog props receive resolved slice. Largest hook surface. | |

**User's choice:** `{ locale, uiStrings }`.

### Sub-decision 3 — `<html lang>` write source

| Option | Description | Selected |
|--------|-------------|----------|
| useLocale useEffect only — no FOUC inline script | useLocale writes `document.documentElement.lang = locale`. `<html lang="en">` static default. No inline script. Rationale: no visual FOUC for lang. | ✓ |
| Mirror Phase 16 FOUC inline script for `<html lang>` | Sibling inline `<script>` reads localStorage + writes lang attribute before React hydrates. Higher symmetry; slightly more JS in `<head>`. | |
| No `<html lang>` write at all | Leave index.html as `<html lang="en">` permanently. Screen-reader voice may not switch. | |

**User's choice:** useLocale useEffect only — no FOUC inline script.

---

## Strings consumption pattern

### Sub-decision 1 — Consumption mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Prop-drill uiStrings slices from App.tsx | App passes typed sub-slices to each consumer. Mirrors how learnContent + prefs flow today. TypeScript flags missing slices. | ✓ |
| LocaleContext + useUiStrings() hook | `<LocaleProvider>` wraps app; consumers call `useUiStrings()` for their slice. Smaller prop surface; one new file. | |
| Hybrid: prop-drill for in-session components, context for dialogs | Mixed pattern — small components stay simple, dialogs avoid prop noise. | |

**User's choice:** Prop-drill uiStrings slices from App.tsx.

### Sub-decision 2 — UiStrings shape

| Option | Description | Selected |
|--------|-------------|----------|
| Namespaced sub-objects per component/feature | UiStrings is deeply-typed interface with nested groups (e.g. `controls.start`, `endSessionDialog.title`). Slicing into props trivial. | ✓ |
| Flat dotted keys | UiStrings is `Record<string, string>` with `'controls.start'`, `'endSessionDialog.title'`. Looked up via `strings['controls.start']`. | |
| Component-name keyed top-level with flat values within each | Hybrid: `UiStrings.controls` is `Record<'start' \| 'stop' \| 'endSession', string>`. | |

**User's choice:** Namespaced sub-objects per component/feature.

### Sub-decision 3 — LearnDialog catalog resolution

| Option | Description | Selected |
|--------|-------------|----------|
| App.tsx resolves and prop-drills | App computes `learnContent = LEARN_CONTENT[locale]` + `lockedCopy = LOCKED_COPY[locale]` once; passes as props. LearnDialog locale-agnostic. | ✓ |
| LearnDialog imports useLocale() directly | LearnDialog calls useLocale() itself + looks up. Reduces App prop count; couples LearnDialog to hook. | |
| useLocale returns all three resolved catalogs | useLocale extends to return `{ locale, uiStrings, learnContent, lockedCopy }`. App drills each slice. | |

**User's choice:** App.tsx resolves and prop-drills.

---

## Translation surface + PT-BR provenance

### Sub-decision 1 — What gets translated

| Option | Description | Selected |
|--------|-------------|----------|
| Translate everything user-visible | Theme names (Claro/Escuro/Musgo/Ardósia/Crepúsculo), Variant names (Esfera/Quadrado/Losango), Timbre names (Tigela/Sino/Senoidal/Carrilhão) all translated alongside chrome + dialog text. | ✓ |
| Translate chrome + dialog text; option names stay English identifiers | Section labels (Theme/Variant/Timbre/Language) translated; option button labels stay English brand-identifiers. Honors Phase 18 D-06 spirit literally. | |
| Translate chrome + section labels; option names stay English; LanguagePicker shows native endonyms | LocaleId picker uses endonym convention; other pickers stay English option names. | |

**User's choice:** Translate everything user-visible.

### Sub-decision 2 — PT-BR sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Machine-translated during execution + TODO flag per I18N-07 | Planner/executor generates PT-BR strings; every entry carries `// TODO: native-speaker review` comment. Native-speaker review is v1.x carry-forward. | ✓ |
| Operator supplies translations upfront (hand-translated) | Operator is native PT-BR speaker; provides translations as part of CONTEXT.md. Highest quality ship; no carry-forward review needed. | |
| Hybrid: chrome hand-translated; learnContent machine-translated | Short UI chrome operator-supplied; long-form explainer machine-translated + flagged. | |

**User's choice:** Machine-translated during execution + TODO flag.

### Sub-decision 3 — LanguagePicker option labels

| Option | Description | Selected |
|--------|-------------|----------|
| Native endonyms regardless of current locale | English option always `English`; PT-BR option always `Português (Brasil)`. Standard i18n convention. | ✓ |
| Locale-aware: labels follow current locale | EN UI shows `English` / `Brazilian Portuguese`; PT-BR UI shows `Inglês` / `Português (Brasil)`. | |
| Endonym + parenthetical exonym | Always show both: `English (Inglês)` / `Português (Brazilian Portuguese)`. | |

**User's choice:** Native endonyms regardless of current locale.

### Sub-decision 4 — Template interpolation

| Option | Description | Selected |
|--------|-------------|----------|
| String-template fns inside UiStrings | `stepper.decreaseLabel: (label: string) => string`. EN: `` (l) => `Decrease ${l}` ``. PT-BR: `` (l) => `Diminuir ${l}` ``. Function-signature parity enforced by TypeScript. | ✓ |
| Static placeholder strings + JS-side replace at use site | `decreaseLabel = 'Decrease {label}'`; consumer does `.replace('{label}', fieldLabel)`. Simpler types; error-prone. | |
| Per-field aria-labels (no interpolation) | Expand `stepper.bpm.decrease` / `stepper.ratio.decrease` etc. as separate strings. Catalog bloat. | |

**User's choice:** String-template fns inside UiStrings.

---

## Claude's Discretion

- **Final filenames** — `src/content/strings.ts` (vs `uiStrings.ts`) preferred for symmetry with `learnContent.ts` + `lockedCopy.ts` co-location.
- **`LOCALE_DISPLAY_NAMES` location** — `src/content/strings.ts` (preferred) or hardcoded in `LanguagePicker.tsx`. NOT `src/domain/settings.ts` (Phase 14 D-09).
- **JSX shape for extracted Forrest phrase** in LearnDialog — italicized closing paragraph vs same-paragraph close. Invariant is the substring strip.
- **Plan file split** — recommended ~6–8 plans across 5 waves (see CONTEXT.md "Claude's Discretion" for breakdown).
- **SettingsForm internal prop-drill** — pass `strings.stepper` + per-field `label` (preferred) vs per-stepper distinct slices.

## Deferred Ideas

- Capture-at-Start `sessionLocaleRef` (not needed — picker disabled in-session).
- Native-speaker PT-BR review pass (v1.x carry-forward per I18N-07).
- Third locale onboarding (e.g. `'es'`).
- Lazy-loaded locale bundles (defer until 5+ locales — STACK.md §4).
- Pluralization / ICU MessageFormat (no current need).
- `<html dir>` RTL support (neither EN nor PT-BR is RTL).
- i18n library migration (defer until 5+ locales).
- FOUC inline script for `<html lang>` (rejected per D-07).
- `<head>` `<title>` translation (brand-like, acceptable in both locales for v1.1).
- Per-component string defaulting (strict required prop enforced).
- Snapshot lock on PT-BR locked copy (revisit after native-speaker review pass).
