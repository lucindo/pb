# Phase 19: Language Switching — Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 8 NEW + ~21 EDIT = 29 files
**Analogs found:** 29 / 29 (every new/edited file has a strong codebase analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| **NEW** `src/content/strings.ts` | content/data-module | static | `src/content/learnContent.ts` | exact (same tier, pure data, `as const satisfies` typed catalog) |
| **NEW** `src/content/strings.test.ts` | test (data) | static-assert | `src/content/learnContent.test.ts` | exact |
| **NEW** `src/content/lockedCopy.ts` | content/data-module (locked) | static | `src/content/learnContent.ts` (struct) | role-match (same module shape; semantics differ — snapshot-locked) |
| **NEW** `src/content/lockedCopy.test.ts` | test (frozen-snapshot guardrail) | static-assert | `src/content/learnContent.test.ts` (locked copy guard at lines 26-31) | role-match (extends substring-presence guard into a substring-absence guard + byte-equality snapshot) |
| **NEW** `src/hooks/useLocale.ts` | hook (orchestrator) | event-driven | `src/hooks/useVisualVariant.ts` + `src/hooks/useTheme.ts` | **exact** — useVisualVariant is the structural mirror (2 listener effects); useLocale adds a 3rd `documentElement.lang` write effect (mirrors useTheme Effect 1 minus the `system` branch) |
| **NEW** `src/hooks/useLocale.test.ts` | test (hook) | event-driven | `src/hooks/useTheme.test.ts` (effects 3+4 sections lines 118-200) | exact (cross-tab + same-tab listener tests are 1:1; drop system-mql blocks) |
| **NEW** `src/hooks/useLocaleChoice.ts` | hook (picker setter) | request-response | `src/hooks/useTimbreChoice.ts` | **verbatim clone target** (timbre→locale rename per D-08) |
| **NEW** `src/hooks/useLocaleChoice.test.ts` | test (hook) | request-response | `src/hooks/useTimbreChoice.test.ts` | **verbatim clone target** (112-line mirror) |
| **EDIT** `src/content/learnContent.ts` | content/data-module | static | self (extend shape to `Record<LocaleId, LearnContent>`) | self (in-place mutation; existing structure preserved per locale) |
| **EDIT** `src/content/learnContent.test.ts` | test (data) | static-assert | self (extend with PT-BR parity) | self |
| **EDIT** `src/components/LanguagePicker.tsx` | component (picker) | request-response | `src/components/TimbrePicker.tsx` | **exact** (TimbrePicker uses 2-row grid-cols-2; LanguagePicker has 2 options → grid-cols-1 vertical OR grid-cols-2 horizontal per planner) |
| **EDIT** `src/components/LanguagePicker.test.tsx` | test (component) | request-response | `src/components/ThemePicker.test.tsx` | exact (replace 6 options with 2 endonyms; same save/dispatch assertions) |
| **EDIT** `src/components/LearnDialog.tsx` | component (dialog) | request-response | self (add `strings` + `learnContent` + `lockedCopy` props; render `lockedCopy.inspiredByForrest` as separate paragraph after forrest body; replace `Independent project...` literal at line 171) | self |
| **EDIT** `src/components/LearnDialog.test.tsx` | test (component) | request-response | self (existing medical-advice modal-absence guard at line 48 stays green; add PT-BR rendering smoke) | self |
| **EDIT** `src/components/SettingsDialog.tsx` | component (dialog) | request-response | self (add `strings` prop; replace `<h2>Settings</h2>` line 80 with `{strings.title}`; drill slices to 4 picker children) | self (minimal restructure per D-19) |
| **EDIT** `src/components/SettingsForm.tsx` | component (form) | request-response | self (add `strings` prop; drill `strings.stepper` + per-field `label` to 3 SettingsStepper children) | self |
| **EDIT** `src/components/SettingsStepper.tsx` | component (form-stepper) | request-response | self (replace `aria-label={label}` / `Decrease ${label}` / `Increase ${label}` at lines 35,44,59 with template-fn lookups) | self |
| **EDIT** `src/components/MuteToggle.tsx` | component (button) | request-response | self (replace internal `label` derivation at lines 32-38 with `strings.{unavailable,resume,mute,unmute}` lookups) | self |
| **EDIT** `src/components/SessionReadout.tsx` | component (readout) | request-response | self (replace `aria-label="Session readout"` lines 28,63 and `aria-label="Session announcement"` lines 33,68 with strings lookups) | self |
| **EDIT** `src/components/SettingsAnchor.tsx` | component (anchor button) | request-response | self (mirror `src/components/LearnAnchor.tsx` for label replacement — both share an identical aria-label/label pattern at lines 21,22,44,45) | self + sibling |
| **EDIT** `src/components/LearnAnchor.tsx` | component (anchor button) | request-response | self (same pattern as SettingsAnchor) | self + sibling |
| **EDIT** `src/components/ResetStatsDialog.tsx` | component (dialog) | request-response | self (replace `Reset practice stats?` at line 61 + `Keep`/`Reset` at lines 71,78 with strings lookups) | self |
| **EDIT** `src/components/EndSessionDialog.tsx` | component (dialog) | request-response | self (replace `End this session?` line 61 + `Keep going`/`End` lines 76,83 with strings lookups) | self |
| **EDIT** `src/components/StatsFooter.tsx` | component (footer) | static-render | self (formatter functions in `src/storage/format.ts` produce English strings — need parallel translation OR pass formatted-with-strings); plan picks delegation site |
| **EDIT** `src/components/SessionControls.tsx` | component (button) | request-response | self (replace `Start session` / `End session` literals lines 55,72 with strings lookups; preserve legacy branch) | self |
| **EDIT** `src/components/BreathingShape.tsx` | component (dispatcher) | request-response | self (pass `strings` slice to child shape components; phase label currently comes from `frame.phaseLabel` — see Shared Patterns: Phase Label Source) | self (NOTE: phase-label string is currently derived inside `domain/sessionMath.ts:34`; Phase 19 needs a JSX-side label override OR a domain-side label change) |
| **EDIT** `src/components/ThemePicker.tsx` | component (picker) | request-response | self (replace `id.charAt(0).toUpperCase() + id.slice(1)` line 31 with `strings[id]` lookup; accept `strings.themes` slice) | self |
| **EDIT** `src/components/VariantPicker.tsx` | component (picker) | request-response | self (same id-capitalization → strings lookup at line 33) | self |
| **EDIT** `src/components/TimbrePicker.tsx` | component (picker) | request-response | self (same id-capitalization → strings lookup at line 40) | self |
| **EDIT** `src/app/App.tsx` | app-orchestrator | event-driven | self (invoke `useLocale()` near line 141 where `useTheme()` + `useVisualVariant()` already sit; resolve `learnContent` + `lockedCopy`; prop-drill to ~15 components; replace line 686 medical-advice literal with `{lockedCopy.medicalAdviceLine}`) | self |
| **EDIT** App-level smoke test | test (integration) | event-driven | `src/app/App.settings.test.tsx` | role-match (existing App.*.test.tsx files use `render(<App />)` + helpers; planner picks file location) |

---

## Pattern Assignments

### NEW `src/content/strings.ts` (content/data-module, static)

**Analog:** `src/content/learnContent.ts`

**Module header + interface pattern** (lines 1-32 of learnContent.ts):
```typescript
// Source file authority: CONTEXT.md D-10.
// Section keys (`hrv`, `timing`, `forrest`) are i18n-stable identifiers ...
// Disclaimer copy is intentionally inlined in `LearnDialog.tsx` ...

export interface ExplainerSection {
  readonly title: string
  readonly body: string
}

export interface LearnContent {
  readonly explainer: { readonly hrv: ExplainerSection; ... }
  readonly links: { ... }
}
```

**Locale-keyed catalog typing — apply this shape for `UI_STRINGS`** (mirror the `as const satisfies` pattern at lines 85 of learnContent.ts):
```typescript
export const LEARN_CONTENT: LearnContent = {
  explainer: { hrv: { title: '...', body: '...' }, ... },
  links: { ... },
} as const satisfies LearnContent
```

**Phase 19 adaptation:**
- Replace single `LearnContent` typing with `Readonly<Record<LocaleId, UiStrings>>`.
- Each locale entry is `as const satisfies UiStrings` so TypeScript exhaustiveness-checks every slice.
- `LOCALE_DISPLAY_NAMES: Record<LocaleId, string>` exported as a sibling constant (per D-14 + Claude's Discretion §"Planner picks `LOCALE_DISPLAY_NAMES` location").

**Template-fn entries (D-15)** — typed as functions inside the catalog:
```typescript
// In UiStrings interface:
readonly stepper: {
  readonly fieldAriaLabel: (fieldLabel: string) => string
  readonly decreaseLabel: (fieldLabel: string) => string
  readonly increaseLabel: (fieldLabel: string) => string
}
// In UI_STRINGS.en:
stepper: {
  fieldAriaLabel: (l) => l,
  decreaseLabel: (l) => `Decrease ${l}`,
  increaseLabel: (l) => `Increase ${l}`,
}
// In UI_STRINGS['pt-BR']:
stepper: {
  fieldAriaLabel: (l) => l,
  decreaseLabel: (l) => `Diminuir ${l}`, // TODO: native-speaker review
  increaseLabel: (l) => `Aumentar ${l}`, // TODO: native-speaker review
}
```

---

### NEW `src/content/strings.test.ts` (test, static-assert)

**Analog:** `src/content/learnContent.test.ts`

**Structural-contract test pattern** (lines 5-23 of learnContent.test.ts):
```typescript
import { describe, expect, it } from 'vitest'
import { LEARN_CONTENT } from './learnContent'

describe('LEARN_CONTENT structural contract', () => {
  it('explainer has exactly three keys in fixed order: hrv, timing, forrest (D-08)', () => {
    expect(Object.keys(LEARN_CONTENT.explainer)).toEqual(['hrv', 'timing', 'forrest'])
  })

  it('hrv section has non-empty title and body', () => {
    expect(LEARN_CONTENT.explainer.hrv.title.length).toBeGreaterThan(0)
    expect(LEARN_CONTENT.explainer.hrv.body.length).toBeGreaterThan(0)
  })
})
```

**Phase 19 exhaustiveness check pattern:**
```typescript
import { LOCALE_OPTIONS } from '../domain/settings'
import { UI_STRINGS } from './strings'

describe('UI_STRINGS exhaustiveness', () => {
  it('every LocaleId has a UI_STRINGS entry', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale]).toBeDefined()
    }
  })
  // + per-slice non-empty assertions, mirror of "non-empty title/body" pattern above
})
```

---

### NEW `src/content/lockedCopy.ts` (content/data-module, locked-snapshot)

**Analog:** `src/content/learnContent.ts` (structural shape)

**Module shape pattern** — same `as const satisfies` typing as learnContent.ts:85:
```typescript
export interface LockedCopy {
  readonly inspiredByForrest: string
  readonly medicalAdviceLine: string
  readonly affiliationLine: string
}

export const LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>> = {
  en: {
    inspiredByForrest: "inspired by Forrest's teachings",
    medicalAdviceLine: "Guided breathing practice — not medical advice.",
    affiliationLine: "Independent project. Not affiliated with Forrest Knutson.",
  },
  'pt-BR': {
    // LOCKED: back-translation = "inspired by Forrest's teachings"
    inspiredByForrest: "inspirado nos ensinamentos do Forrest",
    // LOCKED: back-translation = "Guided breathing practice — not medical advice."
    medicalAdviceLine: "Prática de respiração guiada — não é conselho médico.",
    // LOCKED: back-translation = "Independent project. Not affiliated with Forrest Knutson."
    affiliationLine: "Projeto independente. Não afiliado a Forrest Knutson.",
  },
} as const satisfies Record<LocaleId, LockedCopy>
```

**EN baseline byte-exact values** (per CONTEXT.md "EN locked-copy baseline" table — DO NOT alter):
- `inspiredByForrest = "inspired by Forrest's teachings"` (ASCII apostrophe U+0027)
- `medicalAdviceLine = "Guided breathing practice — not medical advice."` (em-dash U+2014)
- `affiliationLine = "Independent project. Not affiliated with Forrest Knutson."`

---

### NEW `src/content/lockedCopy.test.ts` (test, frozen-snapshot guardrail)

**Analog:** `src/content/learnContent.test.ts` (locked copy guard at lines 27-31)

**Existing pattern in learnContent.test.ts:27-31** (presence assertion):
```typescript
it('forrest body contains verbatim phrase "inspired by Forrest\'s teachings" (D-11)', () => {
  expect(LEARN_CONTENT.explainer.forrest.body.includes("inspired by Forrest's teachings")).toBe(
    true,
  )
})
```

**Phase 19 frozen-EN guardrail (D-02 — INVERTS the existing presence guard to an absence guard + byte-equality snapshot):**
```typescript
import { describe, expect, it } from 'vitest'
import { LOCKED_COPY } from './lockedCopy'
import { LEARN_CONTENT } from './learnContent'
import { LOCALE_OPTIONS } from '../domain/settings'

describe('LOCKED_COPY frozen-EN snapshot (D-02)', () => {
  it('inspiredByForrest matches EN baseline byte-exact', () => {
    expect(LOCKED_COPY.en.inspiredByForrest).toBe("inspired by Forrest's teachings")
  })
  it('medicalAdviceLine matches EN baseline byte-exact (em-dash U+2014)', () => {
    expect(LOCKED_COPY.en.medicalAdviceLine).toBe("Guided breathing practice — not medical advice.")
  })
  it('affiliationLine matches EN baseline byte-exact', () => {
    expect(LOCKED_COPY.en.affiliationLine).toBe("Independent project. Not affiliated with Forrest Knutson.")
  })
})

describe('LOCKED_COPY PT-BR non-empty', () => {
  it('every PT-BR locked entry is non-empty', () => {
    expect(LOCKED_COPY['pt-BR'].inspiredByForrest.length).toBeGreaterThan(0)
    expect(LOCKED_COPY['pt-BR'].medicalAdviceLine.length).toBeGreaterThan(0)
    expect(LOCKED_COPY['pt-BR'].affiliationLine.length).toBeGreaterThan(0)
  })
})

describe('LOCKED_COPY substring-absence guard (D-02 + D-04)', () => {
  it('learnContent[locale].forrest.body does NOT contain inspiredByForrest as substring', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(
        LEARN_CONTENT[locale].explainer.forrest.body.includes(LOCKED_COPY[locale].inspiredByForrest),
      ).toBe(false)
    }
  })
})
```

**Note:** Use `toBe` (byte-equality), NOT `toMatchInlineSnapshot` (auto-updates on diff — defeats the lock per RESEARCH.md line 11).

---

### NEW `src/hooks/useLocale.ts` (hook, event-driven)

**Primary analog:** `src/hooks/useVisualVariant.ts` (closest structural mirror — 2 listener effects, no system-mode branch)
**Secondary analog:** `src/hooks/useTheme.ts` (for the apply effect — write `documentElement.lang` mirroring how useTheme writes `documentElement.dataset.theme`)

**Imports pattern** (useVisualVariant.ts:10-14):
```typescript
import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { VisualVariantId } from '../domain/settings'
```

**Seed + return pattern** (useVisualVariant.ts:16-17,48):
```typescript
export function useVisualVariant(): { variant: VisualVariantId; setVariant: (next: VisualVariantId) => void } {
  const [variant, setVariant] = useState<VisualVariantId>(() => loadPrefs().variant)
  // ...
  return { variant, setVariant }
}
```

**Phase 19 useLocale signature (per D-06):**
```typescript
export function useLocale(): { locale: LocaleId; uiStrings: UiStrings } {
  const [locale, setLocale] = useState<LocaleId>(() => loadPrefs().locale)
  // 3 effects below
  return { locale, uiStrings: UI_STRINGS[locale] }
}
```

**Effect 1 — apply `documentElement.lang` write** (mirror useTheme.ts:31-34, simplified — no `system` branch per D-07):
```typescript
// Effect 1: Apply effect — write documentElement.lang (dep [locale]).
useEffect(() => {
  document.documentElement.lang = locale
}, [locale])
```

**Effect 2 — cross-tab 'storage' listener** (verbatim from useVisualVariant.ts:20-30):
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setLocale(loadPrefs().locale)
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

**Effect 3 — same-tab 'hrv:prefs-changed' listener** (verbatim from useVisualVariant.ts:34-46, with `key === 'locale'` filter):
```typescript
useEffect(() => {
  const onPrefsChanged = (e: Event): void => {
    if (!(e instanceof CustomEvent)) return
    const detail = e.detail as { key?: string } | null
    if (!detail || detail.key === 'locale' || detail.key === undefined) {
      setLocale(loadPrefs().locale)
    }
  }
  window.addEventListener('hrv:prefs-changed', onPrefsChanged)
  return () => {
    window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
  }
}, [])
```

**Important:** D-25 `react-hooks/exhaustive-deps: error` is satisfied — `setLocale` (useState) is stable, `loadPrefs` and `STATE_KEY` are module-level; empty `[]` deps are correct.

---

### NEW `src/hooks/useLocale.test.ts` (test, event-driven)

**Analog:** `src/hooks/useTheme.test.ts` (specifically the cross-tab + same-tab listener test blocks at lines 118-200)

**Seed helper pattern** (useTheme.test.ts:10-18):
```typescript
function seedPrefs(theme: string): void {
  window.localStorage.setItem(
    STATE_KEY,
    JSON.stringify({
      version: 1,
      prefs: { theme, timbre: 'bowl', variant: 'orb', locale: 'en' },
    }),
  )
}
```

**Cross-tab 'storage' test pattern** (useTheme.test.ts:118-144 — adapt for locale):
```typescript
it('updates state via cross-tab storage event with key === STATE_KEY', async () => {
  seedPrefs({ ..., locale: 'en' })
  const { result } = renderHook(() => useLocale())
  expect(result.current.locale).toBe('en')

  const newEnvelope = JSON.stringify({
    version: 1, prefs: { ..., locale: 'pt-BR' },
  })
  window.localStorage.setItem(STATE_KEY, newEnvelope)

  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: newEnvelope, oldValue: null }))
  })

  expect(result.current.locale).toBe('pt-BR')
  expect(document.documentElement.lang).toBe('pt-BR')
})
```

**Same-tab CustomEvent test** (useTheme.test.ts:166-200 mirror — filter on `detail.key === 'locale'`).

**documentElement.lang reset** (mirror useTheme.test.ts:44-49 `dataset.theme` pattern):
```typescript
beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.lang = '' // reset for test isolation
})
afterEach(() => {
  document.documentElement.lang = ''
})
```

---

### NEW `src/hooks/useLocaleChoice.ts` (hook, request-response)

**Analog:** `src/hooks/useTimbreChoice.ts` — **VERBATIM clone target** per D-08

**Full pattern** (useTimbreChoice.ts:24-49):
```typescript
import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { TimbreId } from '../domain/settings'

export function useTimbreChoice(): { timbre: TimbreId; setTimbre: (next: TimbreId) => void } {
  const [timbre, setTimbreState] = useState<TimbreId>(() => loadPrefs().timbre)

  const setTimbre = useCallback((next: TimbreId): void => {
    const current = loadPrefs()
    savePrefs({ ...current, timbre: next })
    setTimbreState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: next } }),
    )
  }, [])

  return { timbre, setTimbre }
}
```

**Phase 19 rename only — `timbre` → `locale`, `TimbreId` → `LocaleId`, `'timbre'` → `'locale'`:**
```typescript
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

---

### NEW `src/hooks/useLocaleChoice.test.ts` (test, request-response)

**Analog:** `src/hooks/useTimbreChoice.test.ts` — **VERBATIM clone target** (112 lines)

**Six test cases** (useTimbreChoice.test.ts:30-111, each maps 1:1 with `timbre→locale`, `'bell'→'pt-BR'`, `'bowl'→'en'`, `'sine'→'pt-BR'`):
1. `initial state matches loadPrefs().locale when localStorage is pre-seeded`
2. `setLocale("pt-BR") updates local state optimistically`
3. `setLocale("pt-BR") writes the new locale to disk via savePrefs`
4. `setLocale("pt-BR") preserves other prefs fields — envelope merge contract` (seed with `theme: 'dark', timbre: 'bowl', variant: 'square', locale: 'en'`, set locale to `'pt-BR'`, assert theme/timbre/variant unchanged)
5. `setLocale("pt-BR") dispatches hrv:prefs-changed CustomEvent with correct detail shape` — assert `detail.key === 'locale'` and `detail.value === 'pt-BR'`
6. `setLocale identity is stable across re-renders (useCallback empty deps contract)`

**Helper to keep** (useTimbreChoice.test.ts:10-19):
```typescript
function seedPrefs(prefs: UserPrefs): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs }))
}

const DEFAULT_FULL_PREFS: UserPrefs = {
  theme: 'system',
  timbre: 'bowl',
  variant: 'orb',
  locale: 'en',
}
```

---

### EDIT `src/components/LanguagePicker.tsx` (component, picker)

**Analog:** `src/components/TimbrePicker.tsx` (closest — TimbrePicker has 4 options in grid-cols-2; LanguagePicker has 2 options)

**Full picker pattern** (TimbrePicker.tsx:19-62):
```typescript
import { TIMBRE_OPTIONS, type TimbreId } from '../domain/settings'
import { useTimbreChoice } from '../hooks/useTimbreChoice'

export interface TimbrePickerProps {
  disabled: boolean
}

export function TimbrePicker({ disabled }: TimbrePickerProps) {
  const { timbre, setTimbre } = useTimbreChoice()

  return (
    <div>
      <p id="timbre-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">Timbre</p>
      <div
        role="radiogroup"
        aria-labelledby="timbre-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-2 gap-2"
      >
        {TIMBRE_OPTIONS.map((id: TimbreId) => {
          const selected = timbre === id
          const label = id.charAt(0).toUpperCase() + id.slice(1)
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
              onClick={() => { setTimbre(id) }}
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

**Phase 19 LanguagePicker adaptations:**
1. Replace `TIMBRE_OPTIONS` / `TimbreId` / `useTimbreChoice` → `LOCALE_OPTIONS` / `LocaleId` / `useLocaleChoice`.
2. Replace section header `"Timbre"` with `{strings.settings.languageLabel}` OR a hardcoded `"Language"` (CONTEXT.md says use `uiStrings.settings.languageLabel` for the section label — but per D-20 prop contract, LanguagePicker accepts ONLY `{ disabled }`; the section label MUST come from `useLocaleChoice` reading or from a hardcoded literal. **Resolution:** SettingsDialog drills `strings.languageLabel` as a separate prop OR the LanguagePicker hardcodes `"Language"` and translation happens elsewhere. Planner picks. The Phase 15 D-02 contract says `{ disabled }` only — adding a `strings` prop is acceptable since Phase 19 widens this contract for all pickers (per CONTEXT.md `Pass uiStrings.* slices to every user-facing child component` line 60).
3. Replace `const label = id.charAt(0).toUpperCase() + id.slice(1)` with native endonym lookup: `const label = LOCALE_DISPLAY_NAMES[id]` (D-14: native endonyms — same labels in both UI locales, NOT translated).
4. `grid-cols-2` works for 2 options OR `grid-cols-1` for vertical stacking — planner picks (CONTEXT.md line 277).
5. `id="language-picker-label"` for `aria-labelledby`.

**A11y floor (D-23)** — preserved verbatim from TimbrePicker:
- `min-h-12` (44px hit area)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2`
- `role="radiogroup"` + `aria-labelledby` on container; `role="radio"` + `aria-checked` + `disabled` per button
- `aria-disabled={disabled}` on container

**Token-binding guard (D-22)** — verbatim color tokens:
- `var(--color-breathing-accent-strong)` (text)
- `var(--color-breathing-accent)` (border)
- `var(--color-breathing-bg-soft)` (hover/active bg)
- `var(--color-breathing-surface)` (default bg)
- `ring-breathing-accent` (token-bound shorthand)
- **ZERO** hardcoded `text-slate-*` / `bg-teal-*` / `text-white` etc.

---

### EDIT `src/components/LanguagePicker.test.tsx` (test, component)

**Analog:** `src/components/ThemePicker.test.tsx`

**Test structure pattern** (ThemePicker.test.tsx:1-50):
```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemePicker } from './ThemePicker'
import { STATE_KEY } from '../storage'
import type { ThemeId } from '../domain/settings'

function seedTheme(theme: ThemeId): void {
  const envelope = {
    version: 1,
    prefs: { theme, timbre: 'bowl', variant: 'orb', locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

beforeEach(() => { window.localStorage.clear() })
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })

describe('ThemePicker — real radiogroup picker (Phase 16)', () => {
  it('renders the "Theme" section label', () => {
    render(<ThemePicker disabled={false} />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  it('renders all 6 options as radio buttons with correct labels in order', () => {
    render(<ThemePicker disabled={false} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(6)
    const labels = Array.from(radios).map((b) => b.textContent)
    expect(labels).toEqual(['Light', 'Dark', 'System', 'Moss', 'Slate', 'Dusk'])
  })
})
```

**Save + dispatch assertion pattern** (ThemePicker.test.tsx:55-82):
```typescript
it('clicking an option writes the new theme to disk (savePrefs via useThemeChoice)', async () => {
  seedTheme('light')
  const user = userEvent.setup()
  render(<ThemePicker disabled={false} />)
  const slateButton = screen.getByRole('radio', { name: 'Slate' })
  await user.click(slateButton)
  const stored = window.localStorage.getItem(STATE_KEY)
  const parsed = JSON.parse(stored!).prefs.theme as string
  expect(parsed).toBe('slate')
})

it('clicking an option dispatches hrv:prefs-changed with { key: "theme", value: id }', async () => {
  // ... spy on window.addEventListener('hrv:prefs-changed', spy) ...
  const event = spy.mock.calls[0]?.[0] as CustomEvent<{ key: string; value: string }>
  expect(event.detail.key).toBe('theme')
  expect(event.detail.value).toBe('dark')
})
```

**Phase 19 LanguagePicker test adaptations:**
- Replace 6 theme options with 2 native endonyms: `['English', 'Português (Brasil)']`.
- Save assertion: `expect(parsed).toBe('pt-BR')` (note: `'pt-BR'` is the LocaleId, NOT the display name).
- Dispatch assertion: `expect(event.detail.key).toBe('locale')`.
- Disabled-gate test: mirror ThemePicker.test.tsx:84-114 verbatim.
- **Native endonyms in BOTH UI locales** — separate test renders the picker with `locale: 'pt-BR'` seed and asserts the button labels are still `['English', 'Português (Brasil)']` (D-14).

---

### EDIT `src/content/learnContent.ts` (data-module, in-place mutation)

**Analog:** self

**Existing shape** (lines 34-85):
```typescript
export const LEARN_CONTENT: LearnContent = {
  explainer: { hrv: {...}, timing: {...}, forrest: {...} },
  links: { youtubeChannel: {...}, ..., keyVideos: [...] },
} as const satisfies LearnContent
```

**Phase 19 mutation** (per CONTEXT.md ##3):
```typescript
export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>> = {
  en: {
    explainer: {
      hrv: { /* existing EN content unchanged */ },
      timing: { /* existing EN content unchanged */ },
      forrest: {
        title: 'Who is Forrest Knutson',
        // STRIPPED: "inspired by Forrest's teachings" substring removed from 2nd paragraph
        body: "Forrest Knutson is a Kriya Yoga guru, ...\n\nThis is an independent web app made so anyone can follow a calm paced breath from a browser. The links below point to his channel, his site, and hand-picked starting videos.",
      },
    },
    links: { /* existing EN links unchanged — URLs literal across locales */ },
  },
  'pt-BR': {
    explainer: {
      hrv: { /* machine-translated, // TODO: native-speaker review */ },
      timing: { /* machine-translated, // TODO: native-speaker review */ },
      forrest: { /* machine-translated, MUST NOT contain inspiredByForrest substring */ },
    },
    links: {
      // URLs identical to EN; labels translated
      youtubeChannel: { label: 'Canal do YouTube', url: 'https://www.youtube.com/@ForrestKnutson' }, // TODO: native-speaker review
      // ... etc
    },
  },
} as const satisfies Record<LocaleId, LearnContent>
```

**Comment header mutation** (current lines 1-7 — update to reflect locale-keyed shape):
```typescript
// Source file authority: CONTEXT.md D-10 + Phase 19 I18N-01..07.
// Section keys (`hrv`, `timing`, `forrest`) are i18n-stable identifiers; Phase 19
// converted the top-level shape to Readonly<Record<LocaleId, LearnContent>>.
// The locked phrase "inspired by Forrest's teachings" no longer appears inside
// forrest.body — it lives in src/content/lockedCopy.ts and is composed at render
// time by LearnDialog.tsx (Phase 19 D-04).
```

---

### EDIT `src/content/learnContent.test.ts` (test, in-place mutation)

**Analog:** self

**Existing pattern to MUTATE** (lines 6-49):
```typescript
// BEFORE: assertions assume top-level LEARN_CONTENT is LearnContent
expect(Object.keys(LEARN_CONTENT.explainer)).toEqual(['hrv', 'timing', 'forrest'])
expect(LEARN_CONTENT.explainer.forrest.body.includes("inspired by Forrest's teachings")).toBe(true)
```

**Phase 19 — wrap existing assertions in a per-locale loop:**
```typescript
describe('LEARN_CONTENT per-locale structural contract', () => {
  for (const locale of LOCALE_OPTIONS) {
    it(`[${locale}] explainer has exactly three keys in fixed order`, () => {
      expect(Object.keys(LEARN_CONTENT[locale].explainer)).toEqual(['hrv', 'timing', 'forrest'])
    })
    // ... per-section non-empty assertions per locale
  }
})
```

**INVERT** the substring-presence guard (line 27-31) — Phase 19 D-04 moves this guard to `lockedCopy.test.ts` as a substring-ABSENCE check (already documented above).

**Add** PT-BR link URL identity assertion:
```typescript
it('PT-BR link URLs are byte-identical to EN (only label translated)', () => {
  expect(LEARN_CONTENT['pt-BR'].links.youtubeChannel.url).toBe(LEARN_CONTENT.en.links.youtubeChannel.url)
  // ... all other links
})
```

---

### EDIT `src/components/LearnDialog.tsx` (component, dialog)

**Analog:** self

**Existing imports + props** (lines 1-17):
```typescript
import { LEARN_CONTENT } from '../content/learnContent'

export interface LearnDialogProps {
  open: boolean
  onClose(this: void): void
}
```

**Phase 19 prop signature mutation:**
```typescript
import type { LearnContent } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'

export interface LearnDialogProps {
  open: boolean
  onClose(this: void): void
  learnContent: LearnContent
  lockedCopy: LockedCopy
  strings: UiStrings['learn']
}
```

**Hardcoded literal replacements (3 sites):**

Line 67 — destructure: `const { explainer, links } = LEARN_CONTENT` → `const { explainer, links } = learnContent` (from props).

Line 77 — title:
```typescript
// BEFORE:
<h2 id="learn-dialog-title" className="...">About this practice</h2>
// AFTER:
<h2 id="learn-dialog-title" className="...">{strings.title}</h2>
```

Lines 90-94 — forrest section — render `lockedCopy.inspiredByForrest` as a separate paragraph after the body (per D-04, JSX shape per planner discretion):
```typescript
// BEFORE:
<h3>{explainer.forrest.title}</h3>
{explainer.forrest.body.split('\n\n').map((paragraph, idx) => (
  <p key={idx} className="...">{paragraph}</p>
))}
// AFTER (option A — italicized closing paragraph):
<h3>{explainer.forrest.title}</h3>
{explainer.forrest.body.split('\n\n').map((paragraph, idx) => (
  <p key={idx} className="...">{paragraph}</p>
))}
<p className="text-base leading-6 italic text-[var(--color-breathing-muted)] [&:not(:first-of-type)]:mt-2">
  {lockedCopy.inspiredByForrest}
</p>
```

Line 171 — affiliation:
```typescript
// BEFORE:
<p className="text-center text-xs text-[var(--color-breathing-muted)]">
  Independent project. Not affiliated with Forrest Knutson.
</p>
// AFTER:
<p className="text-center text-xs text-[var(--color-breathing-muted)]">
  {lockedCopy.affiliationLine}
</p>
```

Line 182 — Close button label: `>Close<` → `>{strings.close}<` (slice per planner).

**Section labels** at lines 104, 143 — translate `Forrest Knutson Resources` and `Selected HRV Breathing Videos`:
```typescript
<h3>{strings.resourcesHeading}</h3>
<h3>{strings.videosHeading}</h3>
```

---

### EDIT `src/components/LearnDialog.test.tsx` (test, in-place mutation)

**Analog:** self

**EXISTING guard at line 48 stays green** (D-14 amendment — medical-advice absence from modal):
```typescript
it('does NOT render any medical-advice sentence inside the modal (D-14 amendment 2026-05-10)', () => {
  renderDialog({ open: true })
  expect(screen.queryByText(/not medical advice/i)).not.toBeInTheDocument()
})
```
This guard MUST still pass after Phase 19 because `medicalAdviceLine` lives in App.tsx, NOT in LearnDialog.

**Existing locked-phrase guard at line 43-46 stays green:**
```typescript
it('renders the locked phrase "inspired by Forrest\'s teachings" (D-11, D-19e)', () => {
  renderDialog({ open: true })
  expect(screen.getByText(/inspired by Forrest's teachings/)).toBeInTheDocument()
})
```
This guard still passes because LearnDialog now renders `lockedCopy.inspiredByForrest` as a separate paragraph (the phrase is still present in the modal — only moved out of `learnContent.forrest.body` into `lockedCopy.inspiredByForrest`).

**Render helper mutation** (lines 9-17):
```typescript
// BEFORE:
function renderDialog(props: Partial<{ open: boolean; onClose: () => void }> = {}) {
  return render(<LearnDialog open={props.open ?? false} onClose={onClose} />)
}
// AFTER — must inject learnContent + lockedCopy + strings fixtures:
import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import { UI_STRINGS } from '../content/strings'

function renderDialog(props: Partial<{ open: boolean; onClose: () => void; locale: LocaleId }> = {}) {
  const locale = props.locale ?? 'en'
  return render(
    <LearnDialog
      open={props.open ?? false}
      onClose={props.onClose ?? vi.fn()}
      learnContent={LEARN_CONTENT[locale]}
      lockedCopy={LOCKED_COPY[locale]}
      strings={UI_STRINGS[locale].learn}
    />,
  )
}
```

**New PT-BR smoke test:**
```typescript
it('renders PT-BR forrest title + lockedCopy.inspiredByForrest when locale="pt-BR"', () => {
  renderDialog({ open: true, locale: 'pt-BR' })
  expect(screen.getByText(UI_STRINGS['pt-BR'].learn.title)).toBeInTheDocument()
  expect(screen.getByText(LOCKED_COPY['pt-BR'].inspiredByForrest)).toBeInTheDocument()
  // English baseline absent
  expect(screen.queryByText('About this practice')).not.toBeInTheDocument()
})
```

---

### EDIT `src/components/SettingsDialog.tsx` (component, dialog)

**Analog:** self (minimal restructure per D-19)

**Existing literals to replace** (lines 80, 92):
```typescript
// BEFORE Line 80:
<h2 id="settings-dialog-title" className="...">Settings</h2>
// AFTER:
<h2 id="settings-dialog-title" className="...">{strings.title}</h2>

// BEFORE Line 92:
<button ... >Close</button>
// AFTER:
<button ... >{strings.close}</button>
```

**Prop signature mutation:**
```typescript
import type { UiStrings } from '../content/strings'

export interface SettingsDialogProps {
  open: boolean
  onClose(this: void): void
  inSessionView: boolean
  strings: UiStrings['settings']
}
```

**Drill slices to 4 picker children** (lines 82-85):
```typescript
// BEFORE:
<ThemePicker disabled={inSessionView} />
<VariantPicker disabled={inSessionView} />
<TimbrePicker disabled={inSessionView} />
<LanguagePicker disabled={inSessionView} />
// AFTER:
<ThemePicker disabled={inSessionView} strings={strings.themes} sectionLabel={strings.themeLabel} />
<VariantPicker disabled={inSessionView} strings={strings.variants} sectionLabel={strings.variantLabel} />
<TimbrePicker disabled={inSessionView} strings={strings.timbres} sectionLabel={strings.timbreLabel} />
<LanguagePicker disabled={inSessionView} sectionLabel={strings.languageLabel} />
```
(Pickers' exact prop shape for label + options is a planner-pick — see Shared Patterns: Picker Translation Wedge.)

**Existing imperative dialog primitives + a11y posture (D-13 — no explicit focus on open) are NOT changed.**

---

### EDIT `src/components/SettingsForm.tsx` (component, form)

**Analog:** self

**Existing literals to replace** (lines 18-24, 52, 56, 63, 71):
```typescript
// BEFORE:
function formatBpm(value: number): string {
  return `${String(value)} BPM`
}
function formatDuration(value: DurationOption): string {
  return value === 'open-ended' ? 'Open-ended' : `${String(value)} min`
}

// BEFORE Line 52:
<div className="grid w-full gap-4" aria-label="Session settings">

// BEFORE Lines 55-57:
<SettingsStepper label="BPM" ... />
<SettingsStepper<RatioLabel> label="Ratio" ... />
<SettingsStepper<DurationOption> label="Duration" ... />
```

**Phase 19 mutations:**
```typescript
export interface SettingsFormProps {
  // ... existing
  strings: UiStrings['settingsForm']
}

// formatters take strings:
function formatBpm(value: number, strings: UiStrings['settingsForm']): string {
  return strings.bpmFormat(value)  // (n) => `${n} BPM` or `${n} BPM` PT-BR translation
}
// or pass formatted strings directly to stepper

<div className="grid w-full gap-4" aria-label={strings.ariaLabel}>
  <SettingsStepper label={strings.bpmLabel} strings={strings.stepper} ... />
  <SettingsStepper<RatioLabel> label={strings.ratioLabel} strings={strings.stepper} ... />
  <SettingsStepper<DurationOption> label={strings.durationLabel} strings={strings.stepper} ... />
</div>
```

Per CONTEXT.md Claude's Discretion: `pass strings.stepper (template fns) + per-field label string. Smaller catalog surface, function interpolates.`

---

### EDIT `src/components/SettingsStepper.tsx` (component, form-stepper)

**Analog:** self

**Existing aria-label literals** (lines 35, 44, 59):
```typescript
// Line 35: <fieldset aria-label={label} ...>
// Line 44: aria-label={`Decrease ${label}`}
// Line 59: aria-label={`Increase ${label}`}
```

**Phase 19 mutation per D-15 (template-fn entries):**
```typescript
export interface SettingsStepperProps<T extends string | number> {
  // ... existing
  strings: {
    fieldAriaLabel: (l: string) => string
    decreaseLabel: (l: string) => string
    increaseLabel: (l: string) => string
  }
}

// Line 35:
<fieldset aria-label={strings.fieldAriaLabel(label)} ...>
// Line 44:
aria-label={strings.decreaseLabel(label)}
// Line 59:
aria-label={strings.increaseLabel(label)}
```

**Existing token-bound classes (44×44 hit area `size-12 min-h-11 min-w-11`, `focus-visible:ring-2 focus-visible:ring-breathing-accent`) are NOT changed.**

---

### EDIT `src/components/MuteToggle.tsx` (component, button)

**Analog:** self

**Existing label derivation** (lines 32-38):
```typescript
const label = !audioAvailable
  ? 'Audio unavailable in this browser'
  : needsResume
    ? 'Resume audio'
    : muted
      ? 'Unmute audio cues'
      : 'Mute audio cues'
```

**Phase 19 mutation:**
```typescript
export interface MuteToggleProps {
  // ... existing
  strings: UiStrings['mute']
}

const label = !audioAvailable
  ? strings.unavailable
  : needsResume
    ? strings.resume
    : muted
      ? strings.unmute
      : strings.mute
```

---

### EDIT `src/components/SessionReadout.tsx` (component, readout)

**Analog:** self

**Existing aria-labels + visible labels:**
- Line 22: `placeholderLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'`
- Line 28: `aria-label="Session readout"`
- Line 33: `aria-label="Session announcement"`
- Line 54: `timeLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'`
- Line 63: `aria-label="Session readout"`
- Line 68: `aria-label="Session announcement"`
- Line 73: `message` text (currently "Session complete" hardcoded by domain)

**Phase 19 mutation:**
```typescript
export interface SessionReadoutProps {
  // ... existing
  strings: UiStrings['readout']
}

const placeholderLabel = frame?.remainingMs === null ? strings.elapsed : strings.remaining
// aria-label={strings.readoutAriaLabel}
// aria-label={strings.announcementAriaLabel}
// timeLabel = frame?.remainingMs === null ? strings.elapsed : strings.remaining
```

**Note:** `message?: 'Session complete'` — the literal `'Session complete'` comes from upstream (App.tsx); CONTEXT.md does not require translating the `message` prop typing. Planner picks whether to widen this to `message?: string` and translate in App.tsx.

---

### EDIT `src/components/SettingsAnchor.tsx` + `src/components/LearnAnchor.tsx` (component, anchor button)

**Analogs:** self + sibling (SettingsAnchor mirrors LearnAnchor)

**Existing literals — SettingsAnchor.tsx:21,44:**
```typescript
aria-label={disabled ? 'Settings (unavailable during session)' : 'Settings'}
// ...
<span className="hidden sm:inline">Settings</span>
```

**Existing literals — LearnAnchor.tsx:22,45:**
```typescript
aria-label={disabled ? 'Learn (unavailable during session)' : 'Learn'}
// ...
<span className="hidden sm:inline">Learn</span>
```

**Phase 19 mutation:**
```typescript
export interface SettingsAnchorProps {
  // ... existing
  strings: UiStrings['anchors']  // OR strings: { default: string; disabled: string }
}

aria-label={disabled ? strings.settingsDisabled : strings.settings}
// ...
<span className="hidden sm:inline">{strings.settings}</span>
```
(Same shape for LearnAnchor with `strings.learn` / `strings.learnDisabled` keys.)

**Existing position classes (left-0 vs right-0), token-bound color vars, 44×44 hit area (`min-h-[44px] min-w-[44px]`), focus-visible ring — all NOT changed.**

---

### EDIT `src/components/ResetStatsDialog.tsx` + `src/components/EndSessionDialog.tsx` (component, dialog)

**Analogs:** self

**ResetStatsDialog.tsx:61,71,78:**
```typescript
// BEFORE:
<h2 id="reset-stats-title" ...>Reset practice stats?</h2>
<button ref={cancelButtonRef} ...>Keep</button>
<button ...>Reset</button>
// AFTER:
<h2 id="reset-stats-title" ...>{strings.title}</h2>
<button ref={cancelButtonRef} ...>{strings.cancel}</button>
<button ...>{strings.confirm}</button>
```

**EndSessionDialog.tsx:61,76,83 — same pattern** (`End this session?` / `Keep going` / `End` → strings slice).

**Imperative dialog primitives (showModal, cancel handler, focus on Keep) — NOT changed.**

---

### EDIT `src/components/StatsFooter.tsx` (component, footer)

**Analog:** self + `src/storage/format.ts`

**Existing pattern** (lines 32, 37-50):
```typescript
const lastLine = formatLastSession(stats)  // returns "Last: May 7 · 10 min"

<p>
  {formatSessionCount(stats.totalSessions)} · {formatTotalMinutes(stats.totalElapsedSeconds)}{' '}
  total
</p>
{lastLine && <span>{lastLine} ·</span>}
<button onClick={onResetClick} ...>Reset</button>
```

Source strings in `src/storage/format.ts:38,59`:
```typescript
return count === 1 ? '1 session' : `${String(count)} sessions`
// ...
return `Last: ${formatLastSessionDate(...)} · ${formatLastSessionDuration(...)}`
```

**Phase 19 mutation — two paths (planner picks):**

**Path A (translate at component layer):**
```typescript
export interface StatsFooterProps {
  // ... existing
  strings: UiStrings['stats']
}

<p>
  {strings.sessionsCount(stats.totalSessions)} · {strings.totalMinutes(stats.totalElapsedSeconds)} {strings.totalSuffix}
</p>
{lastLine && <span>{strings.lastSessionPrefix} ...{strings.middleDot} ...</span>}
<button onClick={onResetClick}>{strings.reset}</button>
```

**Path B (translate at format.ts layer):** wider blast radius (touches storage tier). Path A preferred for D-19 minimal-diff invariant.

---

### EDIT `src/components/SessionControls.tsx` (component, button)

**Analog:** self

**Existing literals** (lines 55, 72):
```typescript
// Legacy branch line 55:
{isRunning ? 'End session' : 'Start session'}
// New-props branch line 72:
{isRunning ? 'End session' : 'Start session'}
```

**Phase 19 mutation:**
```typescript
export interface SessionControlsProps {
  // ... existing
  strings: UiStrings['controls']
}

// Both branches:
{isRunning ? strings.endSession : strings.startSession}
```

**Preserve legacy branch fallback semantics** — Phase 14 D-09 compat means tests that don't pass new props should still compile (or use a default `strings={DEFAULT_EN_CONTROLS}`); planner picks.

---

### EDIT `src/components/BreathingShape.tsx` (component, dispatcher)

**Analog:** self

**Existing source of phase label** — NOT in BreathingShape.tsx itself. Phase label comes from `domain/sessionMath.ts:34`:
```typescript
phaseLabel: isInPhase ? 'In' : 'Out',
```

And is consumed in `OrbShape.tsx:37,125`:
```typescript
aria-label={`Breathing shape: ${frame.phaseLabel}`}
// ...
{frame.phaseLabel}
```

(Same in SquareShape and DiamondShape — verified via grep.)

**CONTEXT.md says (per ##8 line 75):** `BreathingShape strings prop replaces Inhale / Exhale phase labels + lead-in countdown text`.

**Phase 19 resolution (planner picks one of two paths):**

**Path A: Translate at JSX layer (preferred — preserves Phase 14 D-09 file-split invariant on `domain/`):**
```typescript
// In BreathingShape.tsx — pass strings through to shape children:
export interface BreathingShapeProps {
  variant?: VisualVariantId
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
  strings: UiStrings['breathing']  // { inhale: string; exhale: string; leadInAriaLabel: (n) => string }
}

// In OrbShape (and Square/Diamond):
const phaseLabel = frame.phase === 'in' ? strings.inhale : strings.exhale
aria-label={`${strings.breathingShapeAriaLabel}: ${phaseLabel}`}
// ... {phaseLabel} instead of {frame.phaseLabel}
```

**Path B: Translate at domain layer:** widens edit surface to `src/domain/sessionMath.ts` — discouraged by Phase 14 D-09 invariant; would require coupling domain to UiStrings.

**Stable-reference note (D-11a):** Memoize the slice or pass primitives so React reconciliation does not churn on non-locale-change renders:
```typescript
// In App.tsx:
const breathingStrings = uiStrings.breathing  // stable per-locale-render
// or:
<BreathingShape inhale={uiStrings.breathing.inhale} exhale={uiStrings.breathing.exhale} ... />
```

---

### EDIT `src/components/ThemePicker.tsx` / `VariantPicker.tsx` / `TimbrePicker.tsx` (component, picker)

**Analogs:** self (all three share the same id-capitalization pattern)

**Existing pattern** (ThemePicker.tsx:31, VariantPicker.tsx:33, TimbrePicker.tsx:40):
```typescript
const label = id.charAt(0).toUpperCase() + id.slice(1)
```

**Phase 19 mutation per D-12:**
```typescript
export interface ThemePickerProps {
  disabled: boolean
  strings: UiStrings['themes']  // { light: 'Light' | 'Claro', dark: 'Dark' | 'Escuro', ... }
  sectionLabel: string  // OR pass settings slice with sectionLabel inside
}

// Inside .map():
const label = strings[id]  // type-safe lookup; TypeScript enforces every option key
```

**Section header replacement** (ThemePicker.tsx:22, VariantPicker.tsx:24, TimbrePicker.tsx:31):
```typescript
// BEFORE:
<p id="theme-picker-label" className="...">Theme</p>
// AFTER:
<p id="theme-picker-label" className="...">{sectionLabel}</p>
```

**All other a11y posture, hit area, focus ring, token-bound colors — NOT changed.**

---

### EDIT `src/app/App.tsx` (app-orchestrator)

**Analog:** self

**Existing hook invocations** (lines 141-142):
```typescript
useTheme() // Phase 16 THEME-01..04
const { variant: liveVariant } = useVisualVariant() // Phase 17 VARIANT-01..07
```

**Phase 19 addition — near line 142:**
```typescript
const { locale, uiStrings } = useLocale() // Phase 19 I18N-01..07
const learnContent = LEARN_CONTENT[locale]
const lockedCopy = LOCKED_COPY[locale]
```

**Imports addition (near lines 16-17):**
```typescript
import { useLocale } from '../hooks/useLocale'
import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
```

**Line 686 medical-advice migration:**
```typescript
// BEFORE:
<p className="mt-4 text-sm leading-6 text-[var(--color-breathing-muted)]">
  Guided breathing practice — not medical advice.
</p>
// AFTER:
<p className="mt-4 text-sm leading-6 text-[var(--color-breathing-muted)]">
  {lockedCopy.medicalAdviceLine}
</p>
```

**Prop-drill at all ~15 child invocations** (see Pattern Assignments above for each component's exact slice).

**Existing cross-tab 'storage' listener at lines 119-129** — note useLocale registers its OWN listener; the existing App-level listener is for stats only and does NOT need a `locale` filter (the two listeners coexist; each filters on its own concerns).

---

### EDIT App-level smoke test (test, integration)

**Analog:** `src/app/App.settings.test.tsx` (closest — uses `render(<App />)` + helpers)

**Pattern to mirror** (App.settings.test.tsx:32-42):
```typescript
describe('main screen settings controls', () => {
  it('renders BPM, ratio, and duration controls in the locked order before the start action', () => {
    render(<App />)
    const bpm = settingGroup('BPM')
    // ...
  })
})
```

**Phase 19 new test cases:**
```typescript
describe('App locale switching (Phase 19)', () => {
  it('writes document.documentElement.lang on mount', () => {
    seedPrefs({ ..., locale: 'en' })
    render(<App />)
    expect(document.documentElement.lang).toBe('en')
  })

  it('switches UI strings + documentElement.lang when LanguagePicker is clicked', async () => {
    seedPrefs({ ..., locale: 'en' })
    const user = userEvent.setup()
    render(<App />)
    expect(document.documentElement.lang).toBe('en')

    // Open SettingsDialog
    await user.click(screen.getByLabelText('Settings'))
    // Click PT-BR option in LanguagePicker
    await user.click(screen.getByRole('radio', { name: 'Português (Brasil)' }))

    expect(document.documentElement.lang).toBe('pt-BR')
    // Assert PT-BR idle-state strings present:
    expect(screen.getByRole('button', { name: /Iniciar sessão|Start session/ })).toBeInTheDocument()
  })
})
```

---

## Shared Patterns

### Cross-cutting: `'hrv:prefs-changed'` CustomEvent contract

**Source:** Forward-declared at `src/hooks/useTheme.ts:76-89`; consumed identically in `useVisualVariant.ts:32-46`.

**Apply to:** `useLocale.ts` (consumer) + `useLocaleChoice.ts` (producer).

**Producer pattern** (useTimbreChoice.ts:43-45):
```typescript
window.dispatchEvent(
  new CustomEvent('hrv:prefs-changed', { detail: { key: 'locale', value: next } }),
)
```

**Consumer pattern** (useVisualVariant.ts:35-41):
```typescript
const onPrefsChanged = (e: Event): void => {
  if (!(e instanceof CustomEvent)) return
  const detail = e.detail as { key?: string } | null
  if (!detail || detail.key === 'locale' || detail.key === undefined) {
    setLocale(loadPrefs().locale)
  }
}
```

The `|| detail.key === undefined` branch preserves forward-compat with broadcast-all dispatches (per useTheme.ts:81 comment).

---

### Cross-cutting: Cross-tab `'storage'` listener

**Source:** `src/hooks/useTheme.ts:60-70`; `src/hooks/useVisualVariant.ts:20-30`; `src/app/App.tsx:119-129`.

**Apply to:** `useLocale.ts`.

**Pattern** (useVisualVariant.ts:20-30):
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setLocale(loadPrefs().locale)
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

Empty `[]` deps are correct (D-25 satisfied — `setLocale` is stable from useState; `loadPrefs` + `STATE_KEY` are module-level).

---

### Cross-cutting: Picker prop contract (Phase 15 D-02 — widened in Phase 19)

**Source:** ThemePicker.tsx:13-15, VariantPicker.tsx:15-17, TimbrePicker.tsx:22-24 — all use `{ disabled: boolean }` only.

**Apply to:** LanguagePicker.tsx (already declared at line 14-16 — just fill the body).

**Phase 19 widens the contract** for all 4 pickers to accept a typed `strings` slice (per CONTEXT.md ##8). The picker still self-reads via its picker-side hook (`useLocaleChoice`); the `strings` prop is data-only, not state.

---

### Cross-cutting: A11y floor (D-23)

**Source:** ThemePicker.tsx:34 (radiogroup buttons), SettingsStepper.tsx:45,60 (stepper buttons), SettingsAnchor.tsx:23 (anchor button).

**Apply to:** LanguagePicker.tsx (new picker body).

**Class fragment** (verbatim from ThemePicker.tsx:34):
```
min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45
```

- `min-h-12` = 48px (exceeds 44×44 floor)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2` = focus-visible ring chain
- `motion-reduce:transition-none` = reduced-motion compat (Phase 5 D-06 carry-forward)

---

### Cross-cutting: Token-binding (D-22 THEME-UI-01)

**Source:** `src/styles/theme.no-hardcoded-classes.test.ts` enforces the guard.

**Allowed tokens** (used everywhere in pickers + dialogs):
- `var(--color-breathing-accent)` / `var(--color-breathing-accent-strong)` (border + text)
- `var(--color-breathing-bg-soft)` (hover + active bg)
- `var(--color-breathing-surface)` (default bg)
- `var(--color-breathing-muted)` (subdued text)
- `var(--color-breathing-on-accent)` (text on accent bg)
- `var(--color-modal-backdrop)` (dialog backdrop)
- `text-breathing-accent` / `ring-breathing-accent` (token-bound Tailwind shorthand)

**Banned in all new/edited .tsx files** (Phase 19 D-22):
- `text-slate-*`, `bg-slate-*`, `text-teal-*`, `bg-teal-*`
- `text-white`, `bg-white`

LanguagePicker fill MUST copy chrome class strings verbatim from TimbrePicker — same tokens, zero hardcoded palette utilities.

---

### Cross-cutting: Phase Label Source (NEW for Phase 19 — domain edge)

**Source:** `src/domain/sessionMath.ts:34` — `phaseLabel: isInPhase ? 'In' : 'Out'`.

**Consumers:** `src/components/OrbShape.tsx:37,125`, `src/components/SquareShape.tsx` (analogous), `src/components/DiamondShape.tsx` (analogous).

**Phase 19 friction:** The string lives in `domain/` which Phase 14 D-09 + Phase 19 D-18 file-split invariant says NOT to edit.

**Recommended path (per Path A above):** Pass `strings.inhale` / `strings.exhale` through `BreathingShape` → `OrbShape`/`SquareShape`/`DiamondShape`. The shape components consume `strings.inhale`/`strings.exhale` instead of `frame.phaseLabel`. `frame.phaseLabel` becomes effectively unused at the JSX layer but stays in the domain frame for back-compat.

This is the same wedge pattern as how `id.charAt(0).toUpperCase() + id.slice(1)` is replaced by `strings[id]` in ThemePicker/VariantPicker/TimbrePicker (Phase 19 D-12) — the data-layer enum is preserved; the JSX-layer string lookup is swapped.

---

### Cross-cutting: Test Fixture Convention (CONTEXT.md Specific Ideas)

**Apply to:** Every component test that newly takes a `strings` prop.

**Pattern:**
```typescript
import { UI_STRINGS } from '../content/strings'
const EN_STRINGS_FIXTURE = UI_STRINGS.en

// In render helper:
render(<SessionControls strings={EN_STRINGS_FIXTURE.controls} ... />)
```

Avoids duplicating string literals across ~15 test files. No circular dependency (fixture is pure data; components are consumers).

---

### Cross-cutting: Imperative `<dialog>` shell (Phase 15 D-05)

**Source:** `src/components/SettingsDialog.tsx:38-70`, `src/components/LearnDialog.tsx:25-65`, `src/components/ResetStatsDialog.tsx:15-47`, `src/components/EndSessionDialog.tsx:15-47`.

**NOT changed in Phase 19** — Phase 19 only adds `strings` prop + replaces title/button literals. The `showModal()` / `cancel` event handler / backdrop-click detection logic is invariant across all 4 dialogs and stays untouched.

---

## No Analog Found

Every file in Phase 19 has a strong codebase analog. No "no analog found" entries.

The closest thing to "no analog" is the **frozen-EN snapshot guardrail** in `lockedCopy.test.ts` — the existing `learnContent.test.ts:27-31` is a presence-guard, Phase 19 inverts it to absence+byte-equality. RESEARCH.md line 11 captures the rationale (`toBe`, not `toMatchInlineSnapshot`). This is documented as a Phase-19-specific test pattern, not as "no analog."

---

## Metadata

**Analog search scope:**
- `src/hooks/` (8 hooks scanned)
- `src/components/` (37 .tsx files including .test.tsx scanned)
- `src/content/` (2 files scanned)
- `src/domain/` (settings.ts scanned for LocaleId surface)
- `src/storage/` (prefs.ts scanned for loadPrefs/savePrefs surface; format.ts scanned for stats labels)
- `src/app/App.tsx` (lines 1-130, 140-160, 680-710 scanned)

**Files scanned:** 24 source files + 5 test files = 29 distinct reads.

**Pattern extraction date:** 2026-05-14
