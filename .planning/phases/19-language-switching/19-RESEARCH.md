# Phase 19: Language Switching — Research

**Researched:** 2026-05-14
**Domain:** i18n (EN + PT-BR locale switching) — UI string catalog + locked-copy guardrail + locale-keyed content
**Confidence:** HIGH (codebase directly inspected; CONTEXT.md decisions D-01..D-25 prescriptive; mirror targets useTheme.ts / useTimbreChoice.ts verbatim)

## Summary

Phase 19 is the last v1.1 feature phase and the widest-surface change of the milestone — it threads typed UI string slices through ~15 user-facing components and converts `learnContent.ts` from EN-only to a `Record<LocaleId, LearnContent>`. The architectural decisions are entirely locked in `19-CONTEXT.md` D-01..D-25: roll-your-own typed catalog (zero new deps), `useLocale` + `useLocaleChoice` hook split mirroring Phases 16/18, prop-drill `uiStrings.*` slices from App.tsx (no Context), and a frozen-EN-snapshot guardrail on a NEW `lockedCopy.ts` module that physically separates 3 claim-safe entries from the translatable catalog.

The interesting research questions are not "what stack" (decided) but "what fails silently": (1) function-typed catalog entries for interpolation (D-15) — TypeScript's structural matching is permissive about function signatures, so a missing parameter in a PT-BR variant will compile; (2) the EN-snapshot test must use `toBe` (byte-equality) not `toMatchInlineSnapshot` (auto-updates on diff), and assert the locked phrase is ABSENT from `learnContent[locale].forrest.body` as a substring; (3) the `document.documentElement.lang` write happens via `useEffect([locale])` only (D-07 — no FOUC inline script), which is sound because lang has no visual FOUC, only screen-reader voice + `:lang()` CSS impact; (4) test-fixture cost — the prescribed pattern `const EN_FIXTURE = UI_STRINGS.en.<slice>` works because there is no circular dependency (fixture is data, components are consumers).

**Primary recommendation:** Execute the CONTEXT.md decisions verbatim. The biggest invisible risk is the ~15-component prop-drill explosion combined with template-function entries (D-15) — recommend Wave 0 establishes `UiStrings` interface + a frozen `LOCKED_COPY` snapshot test as the type-and-contract floor BEFORE any component edit, so a missing slice or a drifted locked-copy byte triggers a tsc/test failure at the lowest layer rather than as a runtime miss inside a half-migrated component.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stored locale preference | Storage (`prefs.ts`) | — | Already shipped Phase 14 — `Envelope.prefs.locale` + `coerceLocale` locked |
| Locale enum (`LocaleId`, `LOCALE_OPTIONS`) | Domain (`domain/settings.ts`) | — | Already shipped Phase 14 D-01 — D-09 file-split invariant forbids edit |
| UI string catalog (`UI_STRINGS`) | Content (`src/content/strings.ts`) | — | Pure data, no React imports — same tier as `learnContent.ts` |
| Locked claim-safe copy (`LOCKED_COPY`) | Content (`src/content/lockedCopy.ts`) | — | Physical separation from translatable catalog enforces D-01 lock semantics |
| Locale-keyed learn content | Content (`src/content/learnContent.ts`) | — | Existing module mutated from EN-singleton to `Record<LocaleId, LearnContent>` |
| App-side orchestrator (`useLocale`) | Hook (`src/hooks/useLocale.ts`) | App | Returns `{locale, uiStrings}`; writes `documentElement.lang`; cross-tab + same-tab listeners |
| Picker setter (`useLocaleChoice`) | Hook (`src/hooks/useLocaleChoice.ts`) | LanguagePicker | Owns `savePrefs` write + `'hrv:prefs-changed'` dispatch |
| Picker UI (radiogroup) | Component (`LanguagePicker.tsx`) | — | Self-reads via `useLocaleChoice`; receives only `{disabled}` prop per Phase 15 D-02 |
| String slice prop-drill | Component (App.tsx) | All user-facing components | Each consumer receives a typed `strings` slice; no React Context per D-09 |
| `<html lang>` write | DOM (App-side hook effect) | — | `useEffect([locale])` only — no FOUC inline script (D-07) |
| Locale fallback on unknown stored value | Storage (`coerceLocale`) | — | Already shipped Phase 14 D-17 — falls back to `'en'` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.5 (installed) | Component framework + state | [VERIFIED: package.json] Already shipped — no change |
| TypeScript | 6.0.x (installed) | Strict types — `Record<LocaleId, UiStrings>` exhaustiveness check | [VERIFIED: package.json] Already shipped |
| Vitest | 4.1.5 (installed) | Test runner | [VERIFIED: package.json] Existing test infrastructure |
| @testing-library/react | 16.3.2 (installed) | Component rendering tests | [VERIFIED: package.json] Existing pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| *(no new packages)* | — | — | Roll-your-own typed catalog per STACK.md §4 + D-17 zero-net-new-deps |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Roll-your-own `Record<LocaleId, UiStrings>` | `react-i18next` + `i18next` | [CITED: STACK.md §4] ~22 kB gzip — 31% bundle increase for 2-locale app; needs async init, hits `react-hooks/exhaustive-deps` issues; rejected by D-17 zero-deps |
| Roll-your-own | `@lingui/react` 6.0.1 | [CITED: STACK.md §4] Smaller runtime (~3 kB) but requires build-time macro + catalog compilation; Vite integration friction; v6.0 very new; revisit at 5+ locales |
| Prop-drill `uiStrings` slices | `LocaleContext` + `useUiStrings()` hook | [CITED: CONTEXT.md D-09] Smaller prop surface but adds provider wrapper + test helper; not justified at ~15-component scale |
| Function-typed template entries (D-15) | Placeholder strings + `.replace()` | [CITED: PITFALLS.md D-15] Placeholder approach is error-prone + misses TypeScript signature parity check |
| FOUC inline script for `<html lang>` | `useEffect([locale])` write only | [CITED: CONTEXT.md D-07] `lang` has no visual FOUC — only screen-reader voice + `:lang()` CSS impact; brief mismatch on first paint acceptable |

**Installation:** No new packages — Phase 19 is pure source-code addition + edits.

**Version verification:** Skipped — zero new dependencies per D-17. All existing dependencies are locked and unchanged.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  index.html                                                      │
│  <html lang="en"> (static default — no FOUC script per D-07)    │
│  Existing Phase 16 theme FOUC script stays (only writes data-th) │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ (React hydration)
┌─────────────────────────────────────────────────────────────────┐
│  App.tsx (orchestrator)                                          │
│                                                                  │
│  const {locale, uiStrings} = useLocale()    ──┐                  │
│  const learnContent = LEARN_CONTENT[locale]   │ Effects:         │
│  const lockedCopy  = LOCKED_COPY[locale]      │ - storage listen │
│                                               │ - prefs-changed  │
│                                               │ - documentEl.lang │
│                                               └→ <html lang=...> │
│                                                                  │
│  Drills slices to ~15 children:                                 │
│  ┌───────────────────────────────┬───────────────────────────┐  │
│  │ <SessionControls              │ <SettingsDialog           │  │
│  │   strings={uiStrings.controls}│   strings={uiStrings.set} │  │
│  │   .../>                       │   ...>                    │  │
│  │ <SettingsForm                 │   <ThemePicker            │  │
│  │   strings={uiStrings.sFm}.../>│     strings={ui.themes}.../>│ │
│  │   └─<SettingsStepper          │   <VariantPicker          │  │
│  │       strings={...stepper}.../>│     strings={ui.variants}/>│  │
│  │ <BreathingShape               │   <TimbrePicker           │  │
│  │   strings={ui.breathing}.../> │     strings={ui.timbres}/> │  │
│  │ <SessionReadout               │   <LanguagePicker.../>    │  │
│  │   strings={ui.readout}.../>   │                           │  │
│  │ <StatsFooter                  │ </SettingsDialog>         │  │
│  │   strings={ui.stats}.../>     │                           │  │
│  │ <SettingsAnchor               │ <LearnDialog              │  │
│  │   strings={ui.anchors}.../>   │   learnContent={LC[loc]}  │  │
│  │ <LearnAnchor                  │   lockedCopy={LK[loc]}    │  │
│  │   strings={ui.anchors}.../>   │   strings={ui.learn}.../> │  │
│  │ <MuteToggle                   │                           │  │
│  │   strings={ui.mute}.../>      │ <EndSessionDialog         │  │
│  │                               │   strings={ui.endSess}.../>│ │
│  │ <p>{lockedCopy.medicalAdvice}│ <ResetStatsDialog         │  │
│  └───────────────────────────────┴───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
       ▲                                          ▲
       │ optimistic state                         │ cross-tab read
       │                                          │
┌──────┴─────────────────────┐                   │
│ LanguagePicker.tsx          │                   │
│ (inside SettingsDialog)     │                   │
│                             │                   │
│ const {locale, setLocale} = │                   │
│   useLocaleChoice()         │                   │
│                             │                   │
│ Renders 2 buttons w/ native │                   │
│ endonyms (English / Port.)  │                   │
│ on click:                   │                   │
│   savePrefs({...locale})    │ ──── 'storage' ──→│ window event
│   dispatch                  │                   │ (cross-tab) →
│   'hrv:prefs-changed'       │ ──── same-tab ───→│ useLocale picks
│   {detail:{key:'locale'}}   │                   │ up + setLocale
└─────────────────────────────┘                   │
                                                  ▼
                                          re-render with new
                                          UI_STRINGS[locale]
                                          + write <html lang>
```

**Data flow trace (user clicks PT-BR button):**
1. `LanguagePicker.tsx` button onClick → `setLocale('pt-BR')` from `useLocaleChoice`
2. `useLocaleChoice` writes `savePrefs({...loadPrefs(), locale: 'pt-BR'})` + sets local state + dispatches `'hrv:prefs-changed'` with `detail.key === 'locale'`
3. Same tab: `useLocale` event listener filters on key, re-reads `loadPrefs().locale`, calls `setLocale('pt-BR')` (React state)
4. `useLocale` apply effect runs: `document.documentElement.lang = 'pt-BR'`
5. App re-renders with `uiStrings = UI_STRINGS['pt-BR']` + `learnContent = LEARN_CONTENT['pt-BR']` + `lockedCopy = LOCKED_COPY['pt-BR']`
6. Children receive new typed slices via props; all visible text swaps atomically

### Recommended Project Structure

```
src/
├── content/
│   ├── strings.ts                 # NEW — UiStrings interface + UI_STRINGS catalog + LOCALE_DISPLAY_NAMES
│   ├── strings.test.ts            # NEW — exhaustiveness check (every locale has every key)
│   ├── lockedCopy.ts              # NEW — LOCKED_COPY: 3 claim-safe entries per locale
│   ├── lockedCopy.test.ts         # NEW — frozen-EN snapshot + substring-absent guard
│   ├── learnContent.ts            # EDIT — Record<LocaleId, LearnContent>; strip Forrest substring
│   └── learnContent.test.ts       # EXTEND — PT-BR shape parity + identical link URLs
├── hooks/
│   ├── useLocale.ts               # NEW — orchestrator: state + listeners + lang write
│   ├── useLocale.test.ts          # NEW — seed + listeners + documentElement.lang
│   ├── useLocaleChoice.ts         # NEW — picker setter (verbatim clone of useTimbreChoice)
│   └── useLocaleChoice.test.ts    # NEW — verbatim clone of useTimbreChoice.test.ts
├── components/
│   ├── LanguagePicker.tsx         # EDIT — radiogroup body (mirrors ThemePicker)
│   ├── LanguagePicker.test.tsx    # EXTEND — radiogroup posture + endonyms + dispatch
│   ├── SettingsDialog.tsx         # EDIT — accepts `strings` prop; drills to picker children
│   ├── ThemePicker.tsx            # EDIT — accepts `strings` prop for option names
│   ├── VariantPicker.tsx          # EDIT — accepts `strings` prop
│   ├── TimbrePicker.tsx           # EDIT — accepts `strings` prop
│   ├── SettingsForm.tsx           # EDIT — accepts `strings` prop; drills `strings.stepper` + per-field label
│   ├── SettingsStepper.tsx        # EDIT — accepts `strings` prop (decrease/increase/fieldAria functions)
│   ├── SessionControls.tsx        # EDIT — accepts `strings` prop (start/stop/endSession)
│   ├── SessionReadout.tsx         # EDIT — accepts `strings` prop (readout aria, announcement aria)
│   ├── StatsFooter.tsx            # EDIT — accepts `strings` prop (total sessions, total minutes, last)
│   ├── SettingsAnchor.tsx         # EDIT — accepts `strings` prop (settings, settings disabled)
│   ├── LearnAnchor.tsx            # EDIT — accepts `strings` prop (learn, learn disabled)
│   ├── MuteToggle.tsx             # EDIT — accepts `strings` prop (mute/unmute/resume/unavailable)
│   ├── BreathingShape.tsx         # EDIT — accepts `strings` prop (Inhale, Exhale, lead-in aria)
│   ├── OrbShape.tsx               # EDIT — receives strings through BreathingShape pass-through
│   ├── SquareShape.tsx            # EDIT — receives strings through pass-through
│   ├── DiamondShape.tsx           # EDIT — receives strings through pass-through
│   ├── EndSessionDialog.tsx       # EDIT — accepts `strings` prop (title, keep, end)
│   ├── ResetStatsDialog.tsx       # EDIT — accepts `strings` prop
│   └── LearnDialog.tsx            # EDIT — accepts learnContent + lockedCopy + strings props
└── app/
    ├── App.tsx                    # EDIT — invoke useLocale, resolve catalogs, drill slices
    └── App.test.tsx               # EXTEND — locale switch + documentElement.lang assertion
```

### Pattern 1: `useLocale` orchestrator (mirror of `useTheme.ts`)

**What:** App-side hook that owns the locale React state, writes `document.documentElement.lang` on change, and consumes cross-tab + same-tab sync events.

**When to use:** App.tsx invokes once near the existing `useTheme()` / `useVisualVariant()` call sites.

**Example pattern:**

```typescript
// src/hooks/useLocale.ts — Source: mirror of useTheme.ts (current shipped at HEAD)
import { useEffect, useState } from 'react'
import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { LocaleId } from '../domain/settings'
import { UI_STRINGS, type UiStrings } from '../content/strings'

export function useLocale(): { locale: LocaleId; uiStrings: UiStrings } {
  const [locale, setLocale] = useState<LocaleId>(() => loadPrefs().locale)

  // Effect 1: write document.documentElement.lang on locale change.
  // D-07: no FOUC inline script — lang has no visual FOUC.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  // Effect 2: cross-tab 'storage' listener (mirror of useTheme effect 3).
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setLocale(loadPrefs().locale)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('storage', onStorage) }
  }, [])

  // Effect 3: same-tab 'hrv:prefs-changed' listener (mirror of useTheme effect 4).
  // Filter on detail.key === 'locale' OR undefined (forward-compat per D-21).
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail = e.detail as { key?: string } | null
      if (!detail || detail.key === 'locale' || detail.key === undefined) {
        setLocale(loadPrefs().locale)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => { window.removeEventListener('hrv:prefs-changed', onPrefsChanged) }
  }, [])

  return { locale, uiStrings: UI_STRINGS[locale] }
}
```

**Differences from useTheme:**
- 3 useEffect blocks (theme has 4 — the matchMedia listener for 'system' theme has no locale equivalent).
- Returns `{locale, uiStrings}` not `{locale, setLocale}` — the picker owns the setter via `useLocaleChoice`.
- Writes `document.documentElement.lang` (locale) instead of `dataset.theme`.

### Pattern 2: `useLocaleChoice` picker setter (verbatim clone of `useTimbreChoice.ts`)

**What:** Picker-side companion hook that writes `savePrefs` + dispatches `'hrv:prefs-changed'` with `{key: 'locale', value: next}`. Optimistic local state mirror so the picker shows the new selection instantly without waiting for the listener round-trip.

**Example pattern (verbatim mirror):**

```typescript
// src/hooks/useLocaleChoice.ts — Source: verbatim clone of useTimbreChoice.ts with timbre → locale rename
import { useCallback, useState } from 'react'
import { loadPrefs, savePrefs } from '../storage/prefs'
import type { LocaleId } from '../domain/settings'

export function useLocaleChoice(): { locale: LocaleId; setLocale: (next: LocaleId) => void } {
  const [locale, setLocaleState] = useState<LocaleId>(() => loadPrefs().locale)

  const setLocale = useCallback((next: LocaleId): void => {
    const current = loadPrefs()
    savePrefs({ ...current, locale: next })
    setLocaleState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'locale', value: next } }),
    )
  }, [])

  return { locale, setLocale }
}
```

This is a 1:1 rename of `useTimbreChoice.ts` lines 24-48 with `timbre → locale`. Same `useCallback([])` stable-identity contract. Same envelope-merge pattern preserving other prefs fields.

### Pattern 3: `UiStrings` interface design (D-10 nested sub-objects)

**What:** Deeply-nested interface with sub-objects per component/feature. TypeScript enforces every locale provides every slice at compile time.

**Example shape:**

```typescript
// src/content/strings.ts — D-10 nested shape per CONTEXT.md
import type { LocaleId } from '../domain/settings'

export interface UiStrings {
  readonly controls: {
    readonly start: string
    readonly stop: string
    readonly endSession: string
  }
  readonly settings: {
    readonly title: string                    // "Settings" / "Configurações"
    readonly close: string                    // "Close" / "Fechar"
    readonly themeLabel: string               // "Theme" / "Tema"
    readonly variantLabel: string             // "Variant" / "Variante"
    readonly timbreLabel: string              // "Timbre" / "Timbre"
    readonly languageLabel: string            // "Language" / "Idioma"
  }
  readonly themes: {
    readonly light: string                    // "Light" / "Claro"
    readonly dark: string                     // "Dark" / "Escuro"
    readonly system: string                   // "System" / "Sistema"
    readonly moss: string                     // "Moss" / "Musgo"
    readonly slate: string                    // "Slate" / "Ardósia"
    readonly dusk: string                     // "Dusk" / "Crepúsculo"
  }
  readonly variants: {
    readonly orb: string                      // "Orb" / "Esfera"
    readonly square: string                   // "Square" / "Quadrado"
    readonly diamond: string                  // "Diamond" / "Losango"
  }
  readonly timbres: {
    readonly bowl: string                     // "Bowl" / "Tigela"
    readonly bell: string                     // "Bell" / "Sino"
    readonly sine: string                     // "Sine" / "Senoidal"
    readonly chime: string                    // "Chime" / "Carrilhão"
  }
  readonly stepper: {
    // D-15 template functions — interpolation via function args
    readonly fieldAriaLabel: (fieldLabel: string) => string  // (l) => `Decrease ${l}` etc.
    readonly decreaseLabel: (fieldLabel: string) => string
    readonly increaseLabel: (fieldLabel: string) => string
  }
  readonly settingsForm: {
    readonly ariaLabel: string                // "Session settings" / "Configurações da sessão"
  }
  readonly mute: {
    readonly mute: string
    readonly unmute: string
    readonly resume: string
    readonly unavailable: string
  }
  readonly readout: {
    readonly readoutAriaLabel: string
    readonly announcementAriaLabel: string
    readonly remainingLabel: string
    readonly elapsedLabel: string
    readonly sessionComplete: string
  }
  readonly stats: {
    readonly reset: string
    // …formatter-keys per StatsFooter (sessions, totalMin, lastLine — see formatters in src/storage/format.ts)
  }
  readonly anchors: {
    readonly settings: string                 // "Settings" / "Configurações"
    readonly settingsDisabled: string         // "Settings (unavailable during session)" / …
    readonly learn: string                    // "Learn" / "Aprender"
    readonly learnDisabled: string
  }
  readonly breathing: {
    readonly inhale: string                   // "In" / "Inspirar" (or "Inspire")
    readonly exhale: string                   // "Out" / "Expirar"
    readonly breathingShapeAriaLabel: (phaseLabel: string) => string  // (p) => `Breathing shape: ${p}`
    readonly leadInAriaLabel: (digit: string) => string               // (d) => `Lead-in: ${d}`
  }
  readonly learn: {
    readonly title: string                    // "About this practice" / "Sobre esta prática"
    readonly forrestResourcesHeading: string
    readonly selectedVideosHeading: string
    readonly close: string
  }
  readonly endSessionDialog: {
    readonly title: string                    // "End this session?" / "Encerrar esta sessão?"
    readonly keepGoing: string                // "Keep going" / "Continuar"
    readonly end: string                      // "End" / "Encerrar"
  }
  readonly resetStatsDialog: {
    readonly title: string
    readonly confirm: string
    readonly cancel: string
  }
}

export const UI_STRINGS: Readonly<Record<LocaleId, UiStrings>> = {
  en: { /* ... */ },
  'pt-BR': { /* ... — each translatable entry carries // TODO: native-speaker review per D-13 */ },
} as const

export const LOCALE_DISPLAY_NAMES: Readonly<Record<LocaleId, string>> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
}
```

**Key TypeScript guarantees:**
- `Readonly<Record<LocaleId, UiStrings>>` forces every `LocaleId` member to be present (compile error if missing).
- Each function-typed entry (D-15 interpolation) has its signature locked — a PT-BR entry with a different parameter shape will fail strict TS check.
- Adding a new field to `UiStrings` requires updating both locales simultaneously (compile error otherwise).

### Pattern 4: `LOCKED_COPY` module + frozen-EN snapshot test (D-01..D-04)

**What:** Physically separate module exporting 3 claim-safe locked entries per locale. EN values are byte-locked via `expect(...).toBe(...)`; PT-BR is free to update.

**Example:**

```typescript
// src/content/lockedCopy.ts — D-01 physical separation
import type { LocaleId } from '../domain/settings'

export interface LockedCopy {
  readonly inspiredByForrest: string
  readonly medicalAdviceLine: string
  readonly affiliationLine: string
}

export const LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>> = {
  en: {
    inspiredByForrest: "inspired by Forrest's teachings",
    medicalAdviceLine: 'Guided breathing practice — not medical advice.',  // em-dash U+2014
    affiliationLine: 'Independent project. Not affiliated with Forrest Knutson.',
  },
  'pt-BR': {
    // LOCKED: back-translation = "inspired by Forrest's teachings"
    inspiredByForrest: 'inspirado nos ensinamentos do Forrest',  // TODO: native-speaker review
    // LOCKED: back-translation = "Guided breathing practice — not medical advice."
    medicalAdviceLine: 'Prática de respiração guiada — não é conselho médico.',  // TODO: native-speaker review
    // LOCKED: back-translation = "Independent project. Not affiliated with Forrest Knutson."
    affiliationLine: 'Projeto independente. Sem vínculo com Forrest Knutson.',  // TODO: native-speaker review
  },
} as const
```

```typescript
// src/content/lockedCopy.test.ts — D-02 frozen-EN snapshot
import { describe, expect, it } from 'vitest'
import { LOCKED_COPY } from './lockedCopy'
import { LEARN_CONTENT } from './learnContent'
import { LOCALE_OPTIONS } from '../domain/settings'

describe('LOCKED_COPY — frozen EN snapshot (D-02)', () => {
  it('EN inspiredByForrest is byte-identical to v1.0 Phase 6 D-12 locked phrase', () => {
    expect(LOCKED_COPY.en.inspiredByForrest).toBe("inspired by Forrest's teachings")
  })
  it('EN medicalAdviceLine is byte-identical (em-dash U+2014)', () => {
    expect(LOCKED_COPY.en.medicalAdviceLine).toBe('Guided breathing practice — not medical advice.')
  })
  it('EN affiliationLine is byte-identical', () => {
    expect(LOCKED_COPY.en.affiliationLine).toBe('Independent project. Not affiliated with Forrest Knutson.')
  })
})

describe('LOCKED_COPY — PT-BR present + non-empty', () => {
  it('all 3 PT-BR locked entries are non-empty strings', () => {
    expect(LOCKED_COPY['pt-BR'].inspiredByForrest.length).toBeGreaterThan(0)
    expect(LOCKED_COPY['pt-BR'].medicalAdviceLine.length).toBeGreaterThan(0)
    expect(LOCKED_COPY['pt-BR'].affiliationLine.length).toBeGreaterThan(0)
  })
})

describe('Locked phrase substring-absence guard (D-04)', () => {
  // Iterate locales so adding a third locale auto-extends coverage.
  for (const locale of LOCALE_OPTIONS) {
    it(`learnContent[${locale}].forrest.body does NOT contain lockedCopy[${locale}].inspiredByForrest`, () => {
      const body = LEARN_CONTENT[locale].explainer.forrest.body
      const phrase = LOCKED_COPY[locale].inspiredByForrest
      expect(body.includes(phrase)).toBe(false)
    })
  }
})
```

**Why `toBe(string)` not `toMatchInlineSnapshot()`:**
- `toBe` requires the test author to deliberately edit the expected literal to match a new EN value — that edit is part of the commit and is reviewable.
- `toMatchInlineSnapshot` auto-updates on `--update` runs, so a drift can land in a commit without explicit review.
- The D-02 contract is that EN locked copy changes are **deliberate human decisions recorded in commit messages** — `toBe` enforces that loop.

### Anti-Patterns to Avoid

- **`UI_STRINGS` Context provider:** Rejected by D-09. Prop-drill keeps TypeScript at the call site enforcing each component's slice contract; Context hides the dependency. At ~15 consumers the prop verbosity is tolerable — at 50+ Context becomes warranted, not yet.
- **Lazy-loaded locale bundles:** Catalog is tiny (~30 keys × 2 locales + 3 LearnContent sections); dynamic imports add complexity for zero size win. STACK.md §4 + CONTEXT.md "Not in scope" lock this out.
- **Storing the locale in a separate localStorage key:** Forbidden by Phase 14 — locale lives in `Envelope.prefs.locale`. Bypassing the envelope breaks STORAGE-01/02 forward-compat + STORAGE-03 cross-tab listener.
- **Mutating `coerceLocale` to accept a third locale silently:** Phase 14 D-09 file-split invariant — `domain/settings.ts` + `storage/prefs.ts` are LOCKED. Adding a third locale is a planned future extension that widens `LocaleId` and requires a separate phase (see Deferred Items in CONTEXT.md).
- **Translation key `t('learn.forrest.body')` for the locked phrase:** Defeats the I18N-06 guardrail. The frozen-EN snapshot test catches this — but the architectural shape (separate `lockedCopy.ts` module + `LearnDialog` renders `lockedCopy.inspiredByForrest` directly, not `learnContent.forrest.body`) makes this anti-pattern structurally impossible.
- **Mid-session locale swap from picker:** Blocked by Phase 15 D-02 picker-disable-in-session contract. The only remaining mid-session path is a cross-tab `'storage'` event (D-11a — acceptable; labels swap atomically on next render).
- **Hardcoded `text-slate-*` / `bg-teal-*` / `text-white` Tailwind classes in new LanguagePicker body:** Phase 16.1 THEME-UI-01 guard (`theme.no-hardcoded-classes.test.ts`) rejects these. Mirror `ThemePicker.tsx` / `TimbrePicker.tsx` chrome verbatim — they use `var(--color-breathing-*)` tokens exclusively.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale persistence | Custom `localStorage.setItem('locale', …)` | Existing `savePrefs({...current, locale})` via `useLocaleChoice` | Phase 14 D-09 file-split invariant — bypassing prefs breaks Envelope round-trip + cross-tab listener |
| Locale validation | New `isValidLocale` predicate | Existing `isValidLocale` in `domain/settings.ts` (Phase 14) | Already locked; D-18 forbids editing the file |
| Locale coercion | New fallback logic | Existing `coerceLocale` in `storage/prefs.ts` (Phase 14) | Already locked; D-18 forbids editing |
| Cross-tab locale sync | Manual `'storage'` listener everywhere | `useLocale` effect 2 + `useLocaleChoice` cross-tab read | Mirror of established Phase 16/17/18 pattern |
| Same-tab sync between sibling pickers | Polling / context provider | `'hrv:prefs-changed'` CustomEvent with `detail.key === 'locale'` | Established Phase 16 D-21 + Phase 18 D-18 — same event name, different keys per dimension |
| `document.documentElement.lang` write timing | FOUC inline script in `index.html` | `useEffect([locale])` in `useLocale` | D-07 — `lang` has no visual FOUC; only screen-reader voice + `:lang()` CSS impact; brief mismatch on first paint acceptable |
| Locked-copy review checklist | Markdown PR checklist | Frozen-EN snapshot test (`toBe` byte-equality) + substring-absent guard | I18N-06 NOTE — checklists drift, automated tests don't |
| Template-string interpolation across locales | Placeholder + `.replace()` at use site | Function-typed catalog entries (D-15) — `decreaseLabel: (l) => \`Decrease ${l}\`` | TypeScript enforces signature parity across locales; refactor-friendly |
| LanguagePicker option labels | Translate `English` / `Português (Brasil)` per locale | `LOCALE_DISPLAY_NAMES` constant — native endonyms regardless of UI locale | Standard i18n convention — users picking a target locale must be able to identify it without already understanding the current UI language |

**Key insight:** Phases 14 + 15 + 16 + 17 + 18 already laid every piece of infrastructure Phase 19 needs. The phase is structurally a series of mechanical mirror-renames: `useTheme.ts` → `useLocale.ts`, `useTimbreChoice.ts` → `useLocaleChoice.ts`, `ThemePicker.tsx` → `LanguagePicker.tsx`. The new ground is the catalog + locked-copy guardrail, both of which are pure-data + Vitest-test-only surfaces.

## Runtime State Inventory

> Phase 19 is greenfield content addition + component edits. No rename/refactor of stored or live state. This section is included for completeness because the phase mutates `learnContent.ts` shape.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `Envelope.prefs.locale` already exists in localStorage from Phase 14. No data migration needed — `coerceLocale` already falls back to `'en'` for unknown values. Adding PT-BR widens the valid set; old `'en'` values continue to coerce cleanly. | None — Phase 14 D-17 coerce already covers forward-compat |
| Live service config | None — no external services. | None |
| OS-registered state | None — no OS-level state. | None |
| Secrets/env vars | None — no secrets touched. | None |
| Build artifacts / installed packages | None — zero new deps; no package rebuild. | None |

**Code shape change requiring care:** `LEARN_CONTENT` mutates from `LearnContent` to `Readonly<Record<LocaleId, LearnContent>>`. Every existing import site (`LearnDialog.tsx:3`, `LearnDialog.test.tsx:6`) shifts from `LEARN_CONTENT.explainer.…` to `LEARN_CONTENT[locale].explainer.…` (or receives the resolved per-locale value as a prop). This is a code edit, not a data migration.

**The canonical question:** *After this phase ships, what runtime systems still have the old EN-only shape cached?*
- Answer: None. The Envelope's `prefs.locale` field has been writable since Phase 14; no consumer reads `learnContent.explainer.…` anymore (App.tsx + LearnDialog.tsx update in lockstep with the shape change).

## Common Pitfalls

### Pitfall 1: Function-typed entries fail D-15 signature parity silently

**What goes wrong:** PT-BR contributor adds a `stepper.decreaseLabel` entry with a different parameter shape:
```typescript
en: { stepper: { decreaseLabel: (l: string) => `Decrease ${l}` } },
'pt-BR': { stepper: { decreaseLabel: () => 'Diminuir' } },  // dropped param — TypeScript may not catch
```
TypeScript is structurally typed and function compatibility is bivariant in some lib modes — a `() => string` may assign to `(l: string) => string` because the callee can ignore arguments. Result: PT-BR loses interpolation, screen reader announces "Diminuir" for all 3 stepper fields instead of "Diminuir BPM" / "Diminuir Ratio" / "Diminuir Duration".

**Why it happens:** The `UiStrings` interface declares signatures, but TS only flags assignments where the assigned function has MORE required parameters than the target, not fewer.

**How to avoid:**
- Strict mode with `strictFunctionTypes: true` (already enabled per Phase 7 — verify in `tsconfig.json`).
- The `strings.test.ts` exhaustiveness check should explicitly invoke function entries with realistic args and assert the output contains the arg (e.g., `expect(UI_STRINGS['pt-BR'].stepper.decreaseLabel('BPM')).toContain('BPM')`).
- Code review the PT-BR entries against EN for matching arg names/usage.

**Warning signs:**
- PT-BR template function body doesn't reference its parameter.
- Vitest log shows stepper aria-labels rendering identically across BPM/Ratio/Duration in a PT-BR render test.

### Pitfall 2: `coerceLocale` silently coerces old `'es'` placeholder to `'en'` if anyone seeded it during dev

**What goes wrong:** A developer experimenting with the catalog seeds `localStorage.setItem('hrv:state:v1', JSON.stringify({prefs: {locale: 'es'}}))` to try out a Spanish stub. Phase 14 D-17 `coerceLocale` rejects `'es'` (not in `LOCALE_OPTIONS = ['en', 'pt-BR']`) and silently returns `'en'`. The developer thinks the catalog has a bug; in reality the coercer is doing exactly what it should.

**Why it happens:** D-18 file-split invariant makes the `LOCALE_OPTIONS` allowlist locked in `domain/settings.ts`. Any test/dev that seeds an unsupported locale silently downgrades.

**How to avoid:**
- The `useLocale.test.ts` suite should include a coercion-fallback test: seed `'es'`, mount, assert `result.current.locale === 'en'`.
- During dev UAT, the operator can confirm the picker shows the correct locale in DevTools (Application → Local Storage → `hrv:state:v1`).

**Warning signs:**
- UAT report says "switched to PT-BR but UI shows EN" → check localStorage payload + verify the value matches `LOCALE_OPTIONS`.

### Pitfall 3: `BreathingShape` mid-session locale re-render churns React reconciliation

**What goes wrong:** Per D-11a, a cross-tab `'storage'` event mid-session updates the locale state; App re-renders; `<BreathingShape strings={uiStrings.breathing} …>` receives a NEW object reference for the strings slice on every parent render (because `uiStrings = UI_STRINGS[locale]` is a fresh reference on each App render *if memoization is missing*). If `BreathingShape` uses `React.memo` or its children are heavily memoized, the prop-reference change forces re-render — but in this case `uiStrings.breathing` is a stable reference (since `UI_STRINGS` is a module-level `as const` object). False alarm — no churn.

**Why it's worth flagging anyway:** CONTEXT.md D-11a explicitly says "Planner verifies the BreathingShape strings prop is stable-by-reference across non-locale-change renders." This is automatically true because `UI_STRINGS[locale]` is the same object reference for every render where `locale` is unchanged. NO `useMemo` wrap is needed — the catalog is module-level immutable data.

**How to avoid:** Confirm by adding a smoke test:
```typescript
it('uiStrings.breathing is reference-stable for a given locale', () => {
  const a = UI_STRINGS.en.breathing
  const b = UI_STRINGS.en.breathing
  expect(a).toBe(b) // same reference
})
```

**Warning signs:**
- Performance UAT shows extra renders during a session — investigate App-level memoization first, NOT the catalog.

### Pitfall 4: PT-BR `// TODO: native-speaker review` comments accumulate noise on grep

**What goes wrong:** Per D-13, every PT-BR entry carries `// TODO: native-speaker review`. With ~30 keys × 1 comment per key, the file has 30+ TODO lines. Some are next to single-line string literals; some are between multi-line function entries. A grep for "TODO" on the codebase suddenly explodes from N legacy TODOs to N + 30.

**Why it happens:** D-13 mandates per-entry markers so a native-speaker reviewer can audit each entry independently. Bulk header comments lose the per-key precision.

**How to avoid:**
- Use a consistent suffix like `// TODO(i18n-pt-br): native-speaker review` so existing `grep "TODO" -v "i18n-pt-br"` workflows can exclude these.
- Document the pattern in `strings.ts` file header.
- After the v1.x native-speaker review pass, these markers are removed in bulk.

**Warning signs:**
- A grep audit accidentally picks up the i18n TODOs as "open bugs."

### Pitfall 5: LearnDialog tests assume English content after Phase 19

**What goes wrong:** Existing `LearnDialog.test.tsx` (line 38, 43, 57) asserts on English strings: `'About this practice'`, `/inspired by Forrest's teachings/`, `'Independent project. Not affiliated with Forrest Knutson.'`. After Phase 19, `LearnDialog` accepts `learnContent` + `lockedCopy` + `strings` props instead of importing them directly. Default render (no props passed) is no longer a thing — tests must explicitly inject EN fixtures.

**Why it happens:** Phase 19 converts LearnDialog from a self-resolving component (imports `LEARN_CONTENT` directly) to a presentational one (receives resolved per-locale catalogs).

**How to avoid:**
- Establish the `EN_FIXTURE` import pattern in Wave 0:
  ```typescript
  // src/components/LearnDialog.test.tsx
  import { UI_STRINGS } from '../content/strings'
  import { LEARN_CONTENT } from '../content/learnContent'
  import { LOCKED_COPY } from '../content/lockedCopy'

  const EN_FIXTURE = {
    learnContent: LEARN_CONTENT.en,
    lockedCopy: LOCKED_COPY.en,
    strings: UI_STRINGS.en.learn,
  }
  // …
  render(<LearnDialog open={true} onClose={…} {...EN_FIXTURE} />)
  ```
- Add a PT-BR rendering smoke test that swaps the fixture and asserts PT-BR title appears + EN title is absent.

**Warning signs:**
- Test compile errors at the LearnDialog.test.tsx import / props sites — expected; that's the type system telling you to update the fixture.

### Pitfall 6: Phase 16 FOUC theme script collides with locale lookup

**What goes wrong:** The existing `index.html` inline script (line 8) reads `localStorage.getItem('hrv:state:v1')`, parses `JSON.parse(raw).prefs.theme`, and writes `data-theme`. A naive Phase 19 extension might add a parallel `prefs.locale` lookup to the same script and write `<html lang>`. But this would split the source-of-truth — `useLocale.useEffect` ALSO writes `lang`, and the two could race on hydration.

**Why it happens:** Theme has a FOUC script because data-theme drives visible color tokens. Locale does NOT have a visible FOUC (per D-07), so adding a lang FOUC script gains nothing and risks divergence.

**How to avoid:**
- D-07 explicitly REJECTS a FOUC inline script for `<html lang>`. The `index.html` script stays unchanged.
- `useLocale.useEffect([locale])` is the sole `lang` writer.
- Static default `<html lang="en">` in `index.html` is the first-paint value; the React effect updates it post-hydration.

**Warning signs:**
- A planner suggests "add `lang` to the existing theme FOUC script for symmetry" — reject; cite D-07.
- Test failure: `documentElement.lang` is `'en'` on first render of a PT-BR-seeded mount, then flips to `'pt-BR'` on first effect tick. This is correct behavior, not a bug.

### Pitfall 7: Picker option translation breaks Theme/Variant/Timbre test fixtures

**What goes wrong:** Per D-12, picker option names get translated. The current `ThemePicker.tsx:31` uses `const label = id.charAt(0).toUpperCase() + id.slice(1)` — a generic capitalization fallback. Phase 19 replaces this with `const label = strings[id]` (where `strings` is `uiStrings.themes`). Existing `ThemePicker.test.tsx` assertions like `getByRole('radio', { name: 'Light' })` will break because the component no longer renders `'Light'` automatically — it renders `strings.light`, which is undefined if no `strings` prop is passed.

**Why it happens:** The capitalization-from-id fallback was a self-contained mechanism; replacing it with a prop lookup introduces a required prop.

**How to avoid:**
- Decide on the contract: required prop (compile-error on missing) OR optional prop with id-fallback (`strings?.[id] ?? id.charAt(0).toUpperCase() + id.slice(1)`).
- CONTEXT.md D-12 implies required prop. Update all 3 picker test files (ThemePicker, VariantPicker, TimbrePicker) in lockstep to pass an EN fixture slice.
- Wave 0 should add a placeholder `strings` prop to each picker so the test files don't break before component edits land.

**Warning signs:**
- Initial Phase 19 commit lands 4 picker edits but only 1 test update — green-gate breaks at the next commit.

## Code Examples

### Example 1: `useLocale` test seeding (verbatim mirror of `useTheme.test.ts`)

```typescript
// src/hooks/useLocale.test.ts — Source: mirror of src/hooks/useTheme.test.ts lines 9-18
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocale } from './useLocale'
import { STATE_KEY } from '../storage'
import type { UserPrefs } from '../storage/prefs'

const DEFAULT_FULL_PREFS: UserPrefs = {
  theme: 'system', timbre: 'bowl', variant: 'orb', locale: 'en',
}

function seedPrefs(locale: string): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 1,
    prefs: { ...DEFAULT_FULL_PREFS, locale },
  }))
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('lang')
})

afterEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('lang')
  vi.restoreAllMocks()
})

describe('useLocale', () => {
  it('seeds state from loadPrefs().locale at mount', () => {
    seedPrefs('pt-BR')
    const { result } = renderHook(() => useLocale())
    expect(result.current.locale).toBe('pt-BR')
    expect(document.documentElement.lang).toBe('pt-BR')
  })

  it('falls back to "en" for unknown stored values (Phase 14 D-17 coerce)', () => {
    seedPrefs('es')  // not in LOCALE_OPTIONS
    const { result } = renderHook(() => useLocale())
    expect(result.current.locale).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('re-reads on cross-tab "storage" event for STATE_KEY', () => {
    seedPrefs('en')
    const { result } = renderHook(() => useLocale())
    seedPrefs('pt-BR')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY }))
    })
    expect(result.current.locale).toBe('pt-BR')
    expect(document.documentElement.lang).toBe('pt-BR')
  })

  it('re-reads on same-tab "hrv:prefs-changed" with detail.key === "locale"', () => {
    seedPrefs('en')
    const { result } = renderHook(() => useLocale())
    seedPrefs('pt-BR')
    act(() => {
      window.dispatchEvent(new CustomEvent('hrv:prefs-changed', {
        detail: { key: 'locale', value: 'pt-BR' },
      }))
    })
    expect(result.current.locale).toBe('pt-BR')
  })

  it('ignores "hrv:prefs-changed" events with detail.key !== "locale"', () => {
    seedPrefs('en')
    const { result } = renderHook(() => useLocale())
    seedPrefs('pt-BR')  // disk changed
    act(() => {
      window.dispatchEvent(new CustomEvent('hrv:prefs-changed', {
        detail: { key: 'theme', value: 'dark' },  // wrong key
      }))
    })
    // No re-read; state stays at the original mount value.
    expect(result.current.locale).toBe('en')
  })

  it('re-reads when detail.key is undefined (forward-compat per D-21)', () => {
    seedPrefs('en')
    const { result } = renderHook(() => useLocale())
    seedPrefs('pt-BR')
    act(() => {
      window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: {} }))
    })
    expect(result.current.locale).toBe('pt-BR')
  })
})
```

### Example 2: LanguagePicker radiogroup body (mirror of ThemePicker, with native endonyms)

```tsx
// src/components/LanguagePicker.tsx — Source: mirror of ThemePicker.tsx with locale-display-names lookup
import { LOCALE_OPTIONS, type LocaleId } from '../domain/settings'
import { useLocaleChoice } from '../hooks/useLocaleChoice'
import { LOCALE_DISPLAY_NAMES } from '../content/strings'

export interface LanguagePickerProps {
  disabled: boolean
  // No `strings` prop — D-14 native endonyms DO NOT flow through UI_STRINGS.
  // Picker section label "Language" / "Idioma" is rendered by SettingsDialog parent via strings.settings.languageLabel.
}

export function LanguagePicker({ disabled }: LanguagePickerProps) {
  const { locale, setLocale } = useLocaleChoice()

  return (
    <div>
      <p id="language-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">
        {/* TODO: section label comes from SettingsDialog parent prop; placeholder here is "Language" */}
        Language
      </p>
      <div
        role="radiogroup"
        aria-labelledby="language-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-2 gap-2"
      >
        {LOCALE_OPTIONS.map((id: LocaleId) => {
          const selected = locale === id
          const label = LOCALE_DISPLAY_NAMES[id]  // D-14: native endonym, never translated
          const selectedClasses = 'border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]'
          const unselectedClasses = 'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
          const baseClasses = 'min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => { setLocale(id) }}
              className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses}`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

### Example 3: App.tsx wire-up (concrete edits)

```tsx
// src/app/App.tsx — additions at lines marked
import { useLocale } from '../hooks/useLocale'                               // NEW import
import { LEARN_CONTENT } from '../content/learnContent'                     // existing — re-shaped to locale-keyed
import { LOCKED_COPY } from '../content/lockedCopy'                         // NEW import

export default function App() {
  // … existing hooks (initialSettings, initialMute, stats, session, dialogs, useTheme, useVisualVariant) …
  const { locale, uiStrings } = useLocale()                                 // NEW invocation
  const learnContent = LEARN_CONTENT[locale]                                // NEW resolved per render
  const lockedCopy = LOCKED_COPY[locale]                                    // NEW resolved per render

  // … rest of effects/handlers unchanged …

  return (
    <main className="...">
      <section className="...">
        <div className="relative w-full">
          <p className="...">HRV practice</p>
          <h1 className="...">HRV Breathing</h1>
          <SettingsAnchor disabled={inSessionView} onClick={onSettingsClick}
            strings={uiStrings.anchors} />                                  {/* drilled slice */}
          <LearnAnchor disabled={inSessionView} onClick={onLearnClick}
            strings={uiStrings.anchors} />
        </div>
        <div className="...">
          <BreathingShape variant={sessionVariant ?? liveVariant}
            frame={appPhase === 'running' ? session.liveFrame : null}
            leadInDigit={appPhase === 'lead-in' ? leadInDigit : null}
            strings={uiStrings.breathing} />                                {/* drilled slice */}
          <SessionReadout frame={leadInPlaceholderFrame ?? session.liveFrame}
            status={state.status}
            isLeadInPlaceholder={appPhase === 'lead-in'}
            message={state.status === 'complete' && !inSessionView ? state.message : undefined}
            strings={uiStrings.readout} />
          <SettingsForm settings={state.selectedSettings}
            isRunning={inSessionView}
            onChange={persistedSetSettings}
            onExtendDuration={session.extendDuration}
            strings={uiStrings.settingsForm} />
          <SessionControls status={state.status}
            onStart={() => { void onStartClick() }}
            onEnd={requestEnd}
            muted={audio.muted}
            audioAvailable={audio.audioAvailable}
            needsResume={audio.audioStatus === 'needs-resume'}
            resumeHintId="mute-toggle-resume-hint"
            onMuteToggle={() => { void onMuteOrResumeClick() }}
            strings={uiStrings.controls}
            muteStrings={uiStrings.mute} />
          <div id="mute-toggle-resume-hint" role="status" aria-live="polite" className="sr-only">
            {audio.audioStatus === 'needs-resume' ? uiStrings.mute.resumeHint : ''}
          </div>
          {/* D-04: lockedCopy.medicalAdviceLine replaces the inline literal at App.tsx:686 */}
          <p className="mt-4 text-sm leading-6 text-[var(--color-breathing-muted)]">
            {lockedCopy.medicalAdviceLine}
          </p>
        </div>
        {!inSessionView && stats.totalSessions > 0 && (
          <StatsFooter stats={stats} onResetClick={onResetClick}
            strings={uiStrings.stats} />
        )}
      </section>
      <EndSessionDialog open={endDialogOpen} onConfirm={confirmEnd} onCancel={cancelEnd}
        strings={uiStrings.endSessionDialog} />
      <ResetStatsDialog open={resetDialogOpen} onConfirm={confirmReset} onCancel={cancelReset}
        strings={uiStrings.resetStatsDialog} />
      <LearnDialog open={learnDialogOpen} onClose={onLearnClose}
        learnContent={learnContent}                                         {/* per-locale resolved */}
        lockedCopy={lockedCopy}                                             {/* per-locale resolved */}
        strings={uiStrings.learn} />
      <SettingsDialog open={settingsDialogOpen} onClose={onSettingsClose}
        inSessionView={inSessionView}
        strings={uiStrings.settings}                                        {/* drilled — also internally drills to pickers */}
        themesStrings={uiStrings.themes}
        variantsStrings={uiStrings.variants}
        timbresStrings={uiStrings.timbres} />
    </main>
  )
}
```

**Note on SettingsDialog API:** CONTEXT.md D-09 + plan-discretion allows the planner to pick between:
- (a) Each picker gets its own slice via SettingsDialog props (`themesStrings`, `variantsStrings`, etc. — verbose but explicit), or
- (b) `SettingsDialog` accepts a single `strings={uiStrings.settings}` prop and reaches into a nested object containing all option names + picker labels (one prop, deeper nesting).

Recommendation: (a) — clearer at the call site; matches the existing prop posture; tests easier to fixture per picker.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `darkMode: 'class'` config + `class="theme-dark"` toggle | Tailwind v4 `@theme inline` + `[data-theme]` attribute overrides | Phase 16 (2026-05-13) | n/a Phase 19 — Phase 16 already shipped; Phase 19 inherits |
| EN-only inline string literals in components | Typed `Record<LocaleId, UiStrings>` catalog with prop-drill | Phase 19 (now) | All ~15 user-facing components accept a typed `strings` slice |
| `LEARN_CONTENT: LearnContent` singleton | `LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>>` | Phase 19 (now) | App.tsx resolves per-locale; LearnDialog receives resolved value as prop |
| Locked claim-safe phrase inline in `learnContent.ts:46` + 2 inline `<p>` literals | Physically separate `LOCKED_COPY` module + frozen-EN snapshot test guardrail | Phase 19 — I18N-06 overrides Pitfall 5 | Locked copy routes through translation pipeline but cannot silently drift; substring guard prevents accidental re-inlining |

**Deprecated/outdated:**
- **PITFALLS.md Pitfall 5 recommendation** (keep locked copy OUT of translation pipeline): SUPERSEDED by REQUIREMENTS.md I18N-06 explicit override. Phase 19 routes locked copy THROUGH the pipeline with D-02 frozen-EN snapshot guardrail. The supersede is well-documented in CONTEXT.md line 220-224 + REQUIREMENTS.md line 62 NOTE.
- **STACK.md §4 "shipping one additional locale (Spanish is the highest-value second language)"**: Phase 19 ships PT-BR, not Spanish. The decision was made at v1.1 scoping (operator preference); STACK.md was written before the locale was finalized. No impact on architecture — the pattern is locale-agnostic.
- **ARCHITECTURE.md §I18N-01 "src/content/uiStrings.ts"**: Renamed to `src/content/strings.ts` per planner discretion in CONTEXT.md (symmetry with `learnContent.ts` + `lockedCopy.ts` co-location under `src/content/`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PT-BR translations supplied by Claude during execution are quality-acceptable per D-13 with `// TODO: native-speaker review` markers | Translation surface | Operator UAT during execution catches obvious errors before commit; native-speaker review is explicit v1.x carry-forward per I18N-07. Low risk — already factored into plan. |
| A2 | TypeScript strict mode (`strictFunctionTypes: true`) is on in `tsconfig.json` so function-typed catalog signature parity is enforced for D-15 entries | Pitfall 1 | If strictFunctionTypes is off, signature mismatches across locales compile silently. **Verification step:** Wave 0 should `grep -n "strictFunctionTypes\|strict" tsconfig.json` and confirm. Phase 7 D-01 set strict baseline, so likely on, but verify. |
| A3 | `useEffect([locale])` writing `document.documentElement.lang` post-hydration is sufficient — no FOUC inline script needed (D-07) | Architecture | If screen-reader voice glitches on first paint of a PT-BR-seeded session, the workaround is to add a small FOUC script in a follow-up. Operator UAT can confirm. Low risk for self-contained breathing app. |
| A4 | `Readonly<Record<LocaleId, UiStrings>>` typing enforces exhaustiveness — every locale has every key at compile time | UiStrings interface | If any locale entry is cast with `as UiStrings`, missing keys go silent. `strings.test.ts` runtime exhaustiveness test (D-10 — iterates keys) is the backstop. |
| A5 | `LOCALE_DISPLAY_NAMES` lives in `src/content/strings.ts` (preferred) — planner picks final location | LanguagePicker | If planner picks "hardcoded in LanguagePicker.tsx" instead, the constant lives there. Either works; D-14 + D-18 forbid `src/domain/settings.ts`. |
| A6 | The `phaseLabel: 'In' \| 'Out'` SessionFrame property is the EN label rendered inside the orb — Phase 19 needs to translate via separate `uiStrings.breathing.inhale/exhale` lookup, NOT by changing `phaseLabel` | BreathingShape integration | If the planner edits `domain/sessionMath.ts` to localize phaseLabel, that violates Phase 14 D-09 file-split invariant. **Correct path:** OrbShape/SquareShape/DiamondShape receive `strings.breathing` and render `strings.inhale` / `strings.exhale` instead of `frame.phaseLabel`. Domain layer stays English-token-keyed. |
| A7 | Test fixture `const EN_FIXTURE = UI_STRINGS.en` import in component tests has no circular dependency | Test pattern | Components import nothing from strings.ts; strings.ts imports only `LocaleId` from `domain/settings`. No cycle possible. **Verification:** Wave 0 `tsc --noEmit` after strings.ts lands. |

**Risk assessment summary:** All assumptions are verifiable by Wave 0 preflight or have backstop tests planned. No high-risk blocking assumption.

## Open Questions

1. **What is the exact `BreathingShape.strings` prop shape — does it pass through to OrbShape/SquareShape/DiamondShape, or do they accept the same prop separately?**
   - What we know: `BreathingShape.tsx` is a thin dispatcher (40 LOC); each variant (Orb/Square/Diamond) has its own `phaseLabel` render site at the same line position.
   - What's unclear: Whether the planner prefers (a) single `strings` prop on `BreathingShape` that gets forwarded to whichever variant renders, or (b) each variant declares its own `strings` prop interface and `BreathingShape` forwards explicitly.
   - Recommendation: (a) — `BreathingShape` accepts `strings={uiStrings.breathing}` and forwards via `<OrbShape strings={strings} … />` / etc. One prop drill per variant, no shape divergence.

2. **Should `LearnDialog.test.tsx`'s existing assertions (`'About this practice'`, `'Independent project. Not affiliated…'`) be updated to use `UI_STRINGS.en.learn.title` + `LOCKED_COPY.en.affiliationLine`, or kept as string literals?**
   - What we know: Phase 19 mutates LearnDialog to receive props instead of importing content directly. Existing tests need to inject EN fixtures.
   - What's unclear: Whether assertions should hardcode the EN string (parallel to the lockedCopy snapshot guardrail) or reference the catalog value.
   - Recommendation: HARDCODE literals in `LearnDialog.test.tsx` (parallel to `lockedCopy.test.ts` — string equality detects accidental EN drift). The catalog can be the source of test FIXTURES (props passed to the component), but assertions on rendered output should match the literal expected.

3. **What's the test strategy for the `'hrv:prefs-changed'` event detail.key filter in `useLocale.test.ts`?**
   - What we know: Phase 18 `useTimbreChoice.test.ts` tests detail.key === 'timbre' dispatch. The complement test (consume side — does useLocale filter?) hasn't been written before because Phase 16 useTheme.test.ts is the only consumer test.
   - What's unclear: How to dispatch a `'hrv:prefs-changed'` event with an UNRELATED key (e.g. `'theme'`) and assert useLocale does NOT re-read.
   - Recommendation: Verbatim mirror of `useTheme.test.ts` lines 108-150 (key filter test). Already prescriptive in this RESEARCH.md Example 1.

4. **For the BreathingShape mid-session locale swap edge case (D-11a), is there a UAT step that validates the cross-tab path?**
   - What we know: D-11a accepts live re-render mid-session for the cross-tab `'storage'` edge case. Picker is disabled in-session so the only mid-session path is a sibling tab writing.
   - What's unclear: Whether a manual UAT step is needed (open two tabs, start session in tab A, switch language in tab B, verify tab A's inhale/exhale label swaps atomically without breath-clock interruption).
   - Recommendation: Add to phase UAT checklist. Mirror of Phase 16 cross-tab UAT + Phase 17 cross-tab UAT (both passed). Low risk — string swap is a React render only; no timing effect.

## Environment Availability

> Phase 19 is pure code/config addition + edits. No external dependencies beyond the existing dev environment.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + test | ✓ | 25+ (per `vitest.setup.ts` Node 25 notes) | — |
| npm (existing deps) | Build | ✓ | All locked per `package.json` | — |
| TypeScript | tsc green-gate | ✓ | 6.0.x | — |
| Vitest + jsdom | Test suite | ✓ | 4.1.5 + 29.1.1 | — |
| React 19 | Component framework | ✓ | 19.2.5 | — |
| Tailwind v4 | LanguagePicker chrome | ✓ | 4.3.0 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

> Phase 19 is included in `workflow.nyquist_validation: true` (config.json verified).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 + jsdom 29.1.1 |
| Config file | `vitest.config.ts` (or `vite.config.ts` `test:` block) + `vitest.setup.ts` (Storage polyfill + HTMLDialogElement polyfill) |
| Quick run command | `npx vitest run src/content src/hooks/useLocale src/hooks/useLocaleChoice src/components/LanguagePicker` |
| Full suite command | `npm test -- --run` or `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | User can pick EN/PT-BR from SettingsDialog → live picker exists with 2 native endonym options | unit | `npx vitest run src/components/LanguagePicker.test.tsx` | ❌ Wave 0 (stub exists; extend in plan) |
| I18N-02 (instant) | Selecting PT-BR re-renders UI without page reload | integration | `npx vitest run src/app/App.test.tsx` (or wherever App-level smoke lives — need to verify) | ❌ Wave 0 — extend existing App.session.test.tsx or create new App.locale.test.tsx |
| I18N-02 (disabled in-session) | Picker `disabled={inSessionView}` carry-forward | unit | `npx vitest run src/components/SettingsDialog.test.tsx` | ✅ existing (extend if needed) |
| I18N-02 (loop unaffected) | Breath loop continues without timing disruption when locale changes mid-session via cross-tab event | manual UAT | UAT step in phase-close plan | n/a — manual only |
| I18N-03 (persists) | After page reload, locale persists via `Envelope.prefs.locale` | unit | `npx vitest run src/storage/prefs.test.ts` | ✅ existing (Phase 14) — extend coverage if needed |
| I18N-03 (coerce fallback) | Unknown stored locale coerces to `'en'` | unit | `npx vitest run src/storage/prefs.test.ts` | ✅ existing (Phase 14 already covers this; verify) |
| I18N-04 (typed catalog) | Every `LocaleId` has every `UiStrings` key | unit | `npx vitest run src/content/strings.test.ts` | ❌ Wave 0 |
| I18N-05 (locale-keyed learn) | `LEARN_CONTENT['pt-BR']` exists with shape parity to `LEARN_CONTENT.en` | unit | `npx vitest run src/content/learnContent.test.ts` | ✅ existing (extend with PT-BR coverage) |
| I18N-06 (locked-copy guardrail) | Frozen-EN snapshot + substring-absent guard | unit | `npx vitest run src/content/lockedCopy.test.ts` | ❌ Wave 0 |
| I18N-07 (PT-BR present + flagged) | PT-BR strings non-empty + `// TODO: native-speaker review` markers present | unit + grep audit | `npx vitest run src/content/strings.test.ts` + `grep -c "TODO: native-speaker review" src/content/*.ts` | ❌ Wave 0 |
| SC1 (instant + loop intact) | locale switch via picker re-renders idle UI; breath loop unaffected | integration + UAT | Vitest App test + manual UAT | partial — extend |
| SC2 (picker disabled + EN default) | Phase 15 D-02 carry-forward + Phase 14 D-04 `DEFAULT_LOCALE = 'en'` | unit | `npx vitest run src/components/SettingsDialog.test.tsx src/storage/prefs.test.ts` | ✅ existing |
| SC3 (persists + coerce) | `Envelope.prefs.locale` round-trip + coerce fallback | unit | `npx vitest run src/storage/prefs.test.ts` | ✅ existing |
| SC4 (locked copy guardrail) | I18N-06 — separate module + frozen snapshot + substring-absent | unit | `npx vitest run src/content/lockedCopy.test.ts` | ❌ Wave 0 |
| SC5 (PT-BR ship + green-gate) | All PT-BR entries present, all TODOs flagged, `tsc && lint && build && test` exit 0 | unit + script | `npm run lint && npx tsc --noEmit && npm run build && npm test -- --run` | partial — phase close |

### Sampling Rate

- **Per task commit:** `npx vitest run src/content src/hooks/useLocale src/hooks/useLocaleChoice src/components/LanguagePicker` (~5 sec, covers changed files)
- **Per wave merge:** `npm test -- --run` (full suite — currently 644 tests, +~30 new from Phase 19)
- **Phase gate:** `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` exits 0 before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/content/strings.ts` — UiStrings interface + UI_STRINGS catalog (NEW)
- [ ] `src/content/strings.test.ts` — exhaustiveness check (NEW)
- [ ] `src/content/lockedCopy.ts` — LOCKED_COPY: 3 entries × 2 locales (NEW)
- [ ] `src/content/lockedCopy.test.ts` — frozen-EN snapshot + substring-absent guard (NEW)
- [ ] `src/hooks/useLocale.ts` — orchestrator hook (NEW)
- [ ] `src/hooks/useLocale.test.ts` — coverage of all 3 effects (NEW)
- [ ] `src/hooks/useLocaleChoice.ts` — picker setter (NEW, verbatim clone of useTimbreChoice)
- [ ] `src/hooks/useLocaleChoice.test.ts` — verbatim clone of useTimbreChoice.test.ts (NEW)
- [ ] `src/content/learnContent.ts` — convert to `Record<LocaleId, LearnContent>` (EDIT)
- [ ] `src/content/learnContent.test.ts` — extend with PT-BR coverage (EDIT)
- [ ] `src/components/LanguagePicker.tsx` — fill radiogroup body (EDIT)
- [ ] `src/components/LanguagePicker.test.tsx` — extend with native endonyms + dispatch (EDIT)
- [ ] ~15 component test files — extend with `strings` prop fixture (EDIT, parallelizable by component group)
- [ ] `src/app/App.tsx` — invoke useLocale, resolve catalogs, drill slices (EDIT)
- [ ] Phase 14 / Phase 15 / Phase 16 / Phase 17 / Phase 18 test files — possibly NO change (existing tests use EN fixtures; need verification per file)

**No framework install** — existing test infrastructure covers all phase requirements.

## Security Domain

> `security_enforcement` is not explicitly set in config.json — treating as enabled (default). Phase 19 has minimal security surface (no auth, no input from untrusted sources, no eval/innerHTML).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no auth in v1 |
| V3 Session Management | no | N/A — no sessions |
| V4 Access Control | no | N/A — local-only app |
| V5 Input Validation | yes | `isValidLocale` + `coerceLocale` (Phase 14) — already enforced; allowlist `LOCALE_OPTIONS = ['en', 'pt-BR']` |
| V6 Cryptography | no | N/A — no crypto |
| V7 Error Handling | yes | `coerceLocale` non-throwing fallback to `'en'`; `coercePrefs` prototype-pollution guard (Phase 14 D-12 — already shipped) |
| V13 API & Web Service | no | N/A — local-only |
| V14 Configuration | yes | localStorage envelope refuse-downgrade write (Phase 8 STORAGE-02) — already shipped |

### Known Threat Patterns for React + localStorage + Tailwind v4 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Locale code injection via URL query/hash (e.g., `?locale=<script>`) | Tampering | N/A — Phase 19 doesn't read locale from URL; `LOCALE_OPTIONS` allowlist + `coerceLocale` reject anything not in the literal set |
| XSS via translated strings rendered as `dangerouslySetInnerHTML` | Tampering | All PT-BR + EN strings rendered as React text children (auto-escaped); no `dangerouslySetInnerHTML` anywhere in Phase 19 |
| Prototype pollution via spread of `Envelope.prefs` raw object | Tampering | Phase 14 D-12 already mitigates — `coercePrefs` reads only known keys from `raw as Record<string, unknown>`; no spread into prototype-accessible object |
| Attribute injection via `documentElement.lang = userInput` | Tampering | `useLocale` always writes a validated `LocaleId` from `loadPrefs()` (passes through `coerceLocale`); cannot escape the allowlist |
| Locale flooding via `'hrv:prefs-changed'` event | DoS | Custom event dispatch is rate-limited by user gesture (radio button click); listeners are idempotent reads — no exponential effect |

**Net new security surface:** Negligible. Phase 19 adds string data + prop drilling. The locale value itself is already validated by Phase 14 infrastructure.

## Project Constraints (from CLAUDE.md)

> The user's `~/.claude/CLAUDE.md` enforces the use of `rtk` (Rust Token Killer) CLI proxy. This is a meta-tool for token savings on shell commands and does not affect Phase 19 code architecture. All bash commands in plan execution should flow through the hook-rewriting layer automatically.

No project-local `./CLAUDE.md` exists in the repo. Phase 19 adheres to:

- **D-16 per-commit green-gate** (Phase 7 D-09 baseline): `npx tsc --noEmit && npm run lint && npm run build && npm test` exits 0 at every commit boundary.
- **D-17 zero net-new runtime deps** (PROJECT.md v1.1 invariant): No `npm install` for i18n libraries.
- **D-18 file-split invariant** (Phase 14 D-09): `src/domain/settings.ts` + `src/storage/prefs.ts` NOT edited in Phase 19.
- **D-19 picker invariant** (Phase 15 D-01 reinterpreted): SettingsDialog body structure unchanged beyond strings prop addition + inline `<h2>Settings</h2>` → `strings.title` swap.
- **D-22 THEME-UI-01 token-binding guard** (Phase 16.1): zero hardcoded `text-{slate,teal}-*` / `bg-{slate,teal}-*` / `text-white` / `bg-white` in new LanguagePicker body; mirror ThemePicker chrome verbatim.
- **D-23 a11y floor** (Phase 2 carry-forward): 44×44 hit area + `focus-visible:ring-*` on LanguagePicker buttons.
- **D-24 strict TS + `strictTypeChecked` + `react-hooks/exhaustive-deps: error`** (Phase 7 D-04): no new `// eslint-disable` without `// Reason:` annotation.

## Sources

### Primary (HIGH confidence)

- **`19-CONTEXT.md`** — Source of all D-01..D-25 decisions; prescriptive; locked. Read in full.
- **`REQUIREMENTS.md` §"Language Switching (I18N-01)"** — I18N-01..07 requirement text; I18N-06 NOTE override of PITFALLS.md Pitfall 5.
- **`PROJECT.md` Key Decisions** — v1.0 D-12 multilingual readiness + v1.1 zero-net-new-deps + per-commit green-gate.
- **`STATE.md`** — Phase 19 status (Not started; ready to plan); v1.1 phase ordering rationale.
- **`ROADMAP.md` §"Phase 19: Language Switching"** — Goal + 5 Success Criteria (SC1..SC5).
- **`src/content/learnContent.ts`** (HEAD, 86 LOC) — current EN-only `LEARN_CONTENT` singleton; line 46 embedded Forrest substring.
- **`src/hooks/useTheme.ts`** (HEAD, 92 LOC) — verbatim mirror target for `useLocale.ts`; 4 effects; cross-tab + same-tab listener pattern.
- **`src/hooks/useTimbreChoice.ts`** (HEAD, 49 LOC) — verbatim clone target for `useLocaleChoice.ts`.
- **`src/components/ThemePicker.tsx`** (HEAD, 53 LOC) — radiogroup body mirror target.
- **`src/components/TimbrePicker.tsx`** (HEAD, 62 LOC) — radiogroup body mirror target (2-column grid layout closer to LanguagePicker's 2-option case).
- **`src/components/VariantPicker.tsx`** (HEAD, 71 LOC) — additional radiogroup mirror reference.
- **`src/components/LanguagePicker.tsx`** (HEAD, 28 LOC) — Phase 15 stub body; Phase 19 fills.
- **`src/components/LearnDialog.tsx`** (HEAD, 187 LOC) — receives `learnContent` + `lockedCopy` props in Phase 19; affiliation line at line 171.
- **`src/components/SettingsDialog.tsx`** (HEAD, 97 LOC) — minimal edit; drills `strings` to 4 picker children.
- **`src/app/App.tsx`** (HEAD, 710 LOC) — orchestrator; invokes `useLocale` near other prefs hooks; resolves catalogs; drills slices to ~15 components.
- **`src/domain/settings.ts`** (HEAD, 128 LOC) — LocaleId / LOCALE_OPTIONS / DEFAULT_LOCALE locked Phase 14; NOT edited.
- **`src/storage/prefs.ts`** (HEAD, 76 LOC) — loadPrefs / savePrefs / coerceLocale locked Phase 14; NOT edited.
- **`src/hooks/useTimbreChoice.test.ts`** (HEAD, 112 LOC) — verbatim clone target for `useLocaleChoice.test.ts`.
- **`src/hooks/useTheme.test.ts`** (HEAD) — mirror target for `useLocale.test.ts`.
- **`index.html`** (HEAD, 16 LOC) — line 8 inline FOUC theme script; line 2 `<html lang="en">` static default kept verbatim per D-07.
- **`vitest.setup.ts`** — Storage + HTMLDialogElement polyfills; FakeAudioContext not relevant to Phase 19.
- **`package.json`** — locked dependency versions; zero new deps confirmed.
- **`.planning/config.json`** — `workflow.nyquist_validation: true` (Validation Architecture required); `commit_docs: true`.

### Secondary (MEDIUM confidence — research docs, verified against codebase)

- **`.planning/research/STACK.md` §4** — Roll-your-own typed catalog decision; bundle-size comparison with react-i18next + Lingui; "When to revisit" trigger.
- **`.planning/research/ARCHITECTURE.md` §"I18N-01"** — prop-drill from App; locale-keyed `learnContent.ts`; no React Context.
- **`.planning/research/FEATURES.md` "Language switching without a page reload"** — instant React state swap framing; UX rationale.
- **`.planning/research/PITFALLS.md` Pitfall 5** (i18n string IDs colliding with locked copy) — SUPERSEDED by I18N-06 explicit override.
- **`.planning/research/PITFALLS.md` Pitfall 6** (i18n lazy-loaded locale bundles + Vitest determinism) — N/A for Phase 19 (synchronous static catalog, no i18n library).
- **Phase 14 CONTEXT.md** (D-01 LocaleId, D-04 default 'en', D-09 file-split invariant, D-10/D-17 coerce).
- **Phase 15 CONTEXT.md** (D-01..D-04 picker contract, D-02 disabled prop, D-08 in-session disabled, D-18 Language label).
- **Phase 16 CONTEXT.md** (`useTheme` + `useThemeChoice` split — verbatim mirror target).
- **Phase 17 CONTEXT.md** (D-22 'hrv:prefs-changed' reuse, D-23 token-binding, D-24 a11y floor).
- **Phase 18 CONTEXT.md** (D-08 timbre capture-at-Start — NOT needed for locale since picker is disabled in-session; D-18 CustomEvent detail.key).

### Tertiary (LOW confidence — assumptions for verification during execution)

- **PT-BR translation choices** (D-13 machine-translated initial values): Operator UAT spot-checks during phase execution catches obvious errors; native-speaker review is v1.x carry-forward.
- **`LOCALE_DISPLAY_NAMES` placement** (D-14 + planner discretion): `src/content/strings.ts` recommended; planner may choose hardcoded in `LanguagePicker.tsx` — either works, both compile.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; all libraries already shipped and locked
- Architecture: HIGH — verbatim mirror of Phase 16/18 hook pattern; CONTEXT.md prescriptive
- Pitfalls: HIGH for codebase-inspected concerns (function signature parity, test fixture pattern, cross-tab edge case); MEDIUM for the locked-copy snapshot strategy (industry standard but not previously tested in this codebase)
- Validation Architecture: HIGH — existing Vitest + jsdom infrastructure covers all requirements

**Research date:** 2026-05-14
**Valid until:** 2026-06-13 (30 days for stable; mirror patterns are well-established; only re-validate if a v1.2 or Phase 19+ work alters the Envelope schema or introduces a third locale)
