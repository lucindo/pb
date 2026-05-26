# Phase 48: Appearance page + i18n — Research

**Researched:** 2026-05-26
**Domain:** React UI page + routing extension + i18n catalog extension (composition-only, zero new design system, zero new data layer)
**Confidence:** HIGH

## Summary

Phase 48 is a **composition-only** UI surface phase that ships the user-facing end of the v2.1 settings-switches story. Phase 47 already shipped the data layer — the four persisted-prefs choice hooks (`useBreathingShapeChoice`, `useRingCueChoice`, `useOrbIdleChoice`, `useSwitcherIconChoice`), the resolver, the live-update event flow, and full test coverage. Phase 46 shipped the third orb variant (`spiritual-eye`/Kuthasta). Phase 48 binds those persistent setters to UI primitives that already exist (`SegmentedControl`, `SettingsToggleRow`, `PageShell`, `TopAppBar`, `IconButton`, `ChevronRightIcon`, `ChevronBackIcon`).

All inputs are in place:
- Choice hooks exposing `{ <field>, set<Field> }` — bind directly to `SegmentedControl.value/onChange` and `Toggle.checked/onChange`.
- The `useFeatureFlags` orchestrator already listens for `hrv:prefs-changed` and filters on the four-key set; it re-resolves on every setter call. **Live-update is a "free" property of Phase 47's plumbing — Phase 48 ships zero new sync logic.**
- `TopAppBar` already has a `trailing` slot — adding the right-chevron is a one-prop wire-up, no primitive change.
- `IconButton` already has a `buttonRef` prop used elsewhere for mount-focus — usable verbatim for focus restoration.
- `LanguagePicker` is the canonical template for the two new picker components; mirroring its file structure produces a clean diff.
- `UiStrings` interface + `UI_STRINGS` Record + frozen-EN `LOCKED_COPY` test + type-completeness `Record<LocaleId, UiStrings>` constraint — well-established surface; Phase 48 extends `UiStrings` under a new `appearance.*` namespace, leaves `LOCKED_COPY` untouched, and reintroduces `// TODO: native-speaker review` markers (the `content.no-review-markers.test.ts` guard must be adapted — D-18 lists three viable paths).

**Primary recommendation:** Treat this as **boring on purpose**. Two new picker components are paste-and-rename of `LanguagePicker.tsx`. `AppearancePage.tsx` is paste-and-rename of `AppSettingsPage.tsx` with a different body. The `useAppNavigation` extension is symmetric paste-and-rename of `onLearnOpen`/`onBackToPractice`. The riskiest sub-task is the i18n drift-guard adaptation — pick a path early and execute.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Appearance page chrome (TopAppBar, PageShell, IconButton, back/right chevron) | Browser / Client (React UI) | — | Pure UI render layer; uses existing primitives. |
| Picker components (OrbPicker, RingCuePicker) | Browser / Client | — | Stateless React components delegating to choice hooks. |
| Toggle wiring (Breathing effect, Switcher icons) | Browser / Client | — | Inline `SettingsToggleRow` usage; bound to `useOrbIdleChoice` / `useSwitcherIconChoice`. |
| Routing state (`AppScreen` union + `'appearance'` case) | Browser / Client (in-memory state machine) | — | `useAppNavigation` hook state — no URL, no history; matches today's `learn`/`appSettings` pattern. |
| Focus restoration on back-nav | Browser / Client | — | Sentinel field in `useAppNavigation` + conditional `useEffect`-on-mount in `AppSettingsPage`; no new infrastructure. |
| Live update propagation | Browser / Client (event listener already in `useFeatureFlags`) | Browser localStorage | Phase 47 already wired this; Phase 48 is a downstream consumer. **Not Phase 48's responsibility.** |
| Persistence (writes to disk) | Browser localStorage (envelope) | — | Owned by Phase 47's `savePrefs` + choice hooks. **Not Phase 48's responsibility.** |
| i18n string catalog | Browser / Client (compile-time `UI_STRINGS` const) | — | Pure data; consumed via `useUiStrings()` context. |

## User Constraints (from CONTEXT.md)

### Locked Decisions (Phase 48 D-01 through D-18)

**Naming collisions**
- **D-01:** Rename App Settings section header `Appearance` → `Theme` (EN + PT-BR). Rename key `appSettings.sections.appearance` → `appSettings.sections.theme`. Update single consumer in `SettingsPanelBody.tsx`. PT-BR: `Aparência` → `Tema`.
- **D-02:** New picker is labeled **`Ring cue`** (not `Cue`) — disambiguates from existing `Cue style` (inhale/exhale text/arrow/nose) under App Settings → Feedback.

**EN copy**
- **D-03:** Orb picker — label `Orb`; options `Halo` (`orb-halo`, default), `Minimal` (`minimal-rings`), `Kuthasta` (`spiritual-eye`).
- **D-04:** Ring cue picker — label `Ring cue`; options `Arc` (`progress-arc`, default), `Rings` (`outer-inner`).
- **D-05:** Breathing effect toggle — label `Breathing effect`. Off = `orbIdle: 'still'`, on = `orbIdle: 'ambient'`. No sub-text; uses `SettingsToggleRow` as-is.
- **D-06:** Switcher icons toggle — label `Switcher icons`. Off = `switcherIcon: false`, on = `switcherIcon: true`. No sub-text.
- **D-07:** Page chrome — title `Appearance`; back-chevron ARIA `Back to Settings`; right-chevron ARIA on App Settings `Appearance settings`.
- **D-08:** Section headers — `Orb Style` and `Visual`.
- **D-09:** PT-BR drafts — page title `Aparência`; back-chevron ARIA `Voltar para Configurações`; right-chevron ARIA `Configurações de aparência`; sections `Estilo do orbe` / `Visual`; orb picker `Orbe` / `Halo` / `Mínimo` / `Kuthasta`; ring cue `Sinal do anel` / `Arco` / `Anéis`; toggles `Efeito de respiração` / `Ícones do alternador`; App Settings section rename `Aparência` → `Tema`. All new PT-BR strings carry `// TODO: native-speaker review` markers.

**Componentization**
- **D-10:** Extract two dedicated picker components (`OrbPicker.tsx`, `RingCuePicker.tsx`) mirroring `LanguagePicker.tsx` verbatim. **Toggles stay inline** on `AppearancePage` (two `SettingsToggleRow` instances).
- **D-11:** File location — `src/components/OrbPicker.tsx`, `src/components/OrbPicker.test.tsx`, `src/components/RingCuePicker.tsx`, `src/components/RingCuePicker.test.tsx`. Alongside `LanguagePicker`.

**Routing + focus restoration**
- **D-12:** Extend `AppScreen` union with `'appearance'`. Add two callbacks: `onAppearanceOpen()` (gated by `controlsDisabled`) and `onBackToAppSettings()` (sets screen to `'appSettings'` AND the focus sentinel). `ScreenRouter` gains fourth `case 'appearance':` rendering `<AppearancePage onBack={vm.dialogs.onBackToAppSettings} />`. The existing `closeOnSessionView` effect covers `'appearance'` for free.
- **D-13:** Focus restoration sentinel — `useAppNavigation` exposes `returningFromAppearance: boolean`. `onBackToAppSettings` sets it `true`; `onAppearanceOpen` (and any other navigation) resets it `false`. `AppSettingsPage`'s mount `useEffect` reads it: if `true`, focus the right-chevron `buttonRef`; otherwise focus the back-chevron (current behavior).

**Test coverage**
- **D-14:** Per-picker tests (`OrbPicker.test.tsx`, `RingCuePicker.test.tsx`) mirror `LanguagePicker.test.tsx`.
- **D-15:** `AppearancePage.test.tsx` integration test — mounts full page, asserts title, back-chevron, both pickers, both toggles.
- **D-16:** Extend `useAppNavigation.test.tsx` and `ScreenRouter.test.tsx` with the new transitions and case.
- **D-17:** `AppSettingsPage.test.tsx` extended for focus-restoration assertions (sentinel = true → right-chevron focused; sentinel = false → back-chevron focused).
- **D-18:** I18N drift-guard — Phase 48 reintroduces `// TODO: native-speaker review` markers under `appearance.*`. Planner picks between (a) extend drift-guard allowlist by file/path, (b) add namespace exception, or (c) flip guard to advisory until I18N-04. LOCKED_COPY stays intact (new copy outside that surface).

### Claude's Discretion
- Exact `appearance.*` shape inside `UiStrings` (suggested: `appearance: { title, backChevron, sections: { orbStyle, visual }, orb: { label, options: { halo, minimal, kuthasta } }, ringCue: { label, options: { arc, rings } }, breathingEffect: { label }, switcherIcons: { label } }`).
- Right-chevron ARIA may shorten from `Appearance settings` to `Appearance` after context review.
- `onBackToAppSettings` vs reusing `onSettingsOpen` — D-12 prefers dedicated callback; planner may collapse if focus-sentinel write site stays clean.
- Sentinel storage — `useState<boolean>` vs `useRef<boolean>` (contract: set on back, cleared after consumption).
- AppearancePage section card chrome — inline duplication vs extracting a tiny `SectionCard` helper from `SettingsPanelBody`.
- PT-BR draft refinements during plan/execute (markers lock the I18N-02 contract, not specific draft phrases).

### Deferred Ideas (OUT OF SCOPE)
- PT-BR native-speaker review (I18N-04 Future Requirement — separate operator pass).
- `SettingsToggleRow` sub-description slot (declined; honors compose-existing-primitives rule).
- URL hash / browser history integration (`ScreenRouter` stays in-memory).
- Per-practice flag overrides (flags remain app-wide; reaffirms Phase 47 D-12).
- Live preview affordance beyond actual app (Phase 47 satisfies APPEAR-05).
- DevTools / `?devPrefs=1` operator helpers (declined in Phase 47 D-12).
- Section divider chrome / illustrations / preview thumbnails (inherits spike-010 SegmentedControl).
- Surfacing existing Feedback section on Appearance page (App Settings → Feedback stays put).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APPEAR-01 | Right-chevron `>` in App Settings header trailing slot navigates to Appearance page | `TopAppBar.trailing` slot exists; `IconButton` + `ChevronRightIcon` exist; `onAppearanceOpen` callback added to `useAppNavigation`. See "Header right-chevron pattern" below. |
| APPEAR-02 | Appearance page is full-page surface with `[<  Appearance]` header; back returns to App Settings with focus restored to right-chevron | `PageShell` + `TopAppBar` + `IconButton` chrome verbatim from `AppSettingsPage`/`LearnPage`; `returningFromAppearance` sentinel + conditional `useEffect` in `AppSettingsPage` mount. See "Focus restoration pattern" below. |
| APPEAR-03 | Orb Style section: Orb segmented picker (Halo/Minimal/Kuthasta) + Ring cue segmented picker (Arc/Rings) using `SegmentedControl` | `OrbPicker.tsx` + `RingCuePicker.tsx` mirror `LanguagePicker.tsx`; bind to `useBreathingShapeChoice` and `useRingCueChoice` respectively. |
| APPEAR-04 | Visual section: Breathing effect toggle + Switcher icons toggle using `SettingsToggleRow` | Two inline `SettingsToggleRow` instances on `AppearancePage`; bind to `useOrbIdleChoice` (`'ambient'` ↔ `'still'`) and `useSwitcherIconChoice`. |
| APPEAR-05 | Picker/toggle changes apply live on next render — no reload, no nav-back | **Already guaranteed by Phase 47's `useFeatureFlags` event listener** — every choice-hook setter dispatches `hrv:prefs-changed`, listener re-reads `loadPrefs()`, returns updated `FeatureFlags`, `PracticeScreen` re-renders with new props. Verified at `src/app/PracticeScreen.tsx:64-75` and `src/hooks/useFeatureFlags.ts:73-92`. |
| APPEAR-06 | Mono Zen chrome (`bg-soft`, `borderSoft`, `accent-strong`, mobile-bottom-sheet/desktop-modal) preserved | Inherited from `PageShell` + `TopAppBar` + `SectionCard` inline pattern + `SegmentedControl`/`Toggle` primitives. No new tokens, no chrome touches. |
| I18N-01 | New strings added to EN catalog under `appearance.*` | Extend `UiStrings` interface in `src/content/strings.ts:22-187`; add EN entries to `UI_STRINGS.en` (around line 302-355). |
| I18N-02 | PT-BR catalog has parallel entries with `// TODO: native-speaker review` markers | Add PT-BR entries to `UI_STRINGS['pt-BR']` (around line 468-521) with marker comments inline next to each key. |
| I18N-03 | LOCKED_COPY byte-equality guard + `Record<LocaleId, UiStrings>` type-completeness intact | New strings live in `UiStrings` (typed completeness automatically enforced via `satisfies Readonly<Record<LocaleId, UiStrings>>` at line 522); `LOCKED_COPY` (3 keys) is untouched. |

## Project Constraints (from project rules)

- **`[[feedback_design_logic_separation]]`** — Design changes must not touch state machines, audio, persistence, business logic. Phase 48 is mostly a UI surface; the only logic touches are the navigation extension (D-12 + D-13), which is scoped to navigation only — no engine/audio/persistence changes.
- **`[[project_v16_visual_locks]]`** — v2.0 visual system is closed; rejected alternates do not get re-proposed. Phase 48 strictly composes existing primitives.
- **`[[project_dark_theme_token_collapse]]`** — Dark themes collapse `bg-soft === surface`; new controls need explicit `border-soft` borders to read. Reused `SegmentedControl`/`SettingsToggleRow`/`SectionCard` chrome already encodes this; planner should verify Appearance page renders in dark theme during execution.
- **`[[feedback_no_design_locking]]`** — Don't anchor downstream-modifiable values. Phase 48 imports flag option ordering from the type union order; defaults are not re-anchored.
- **`[[project_breathing_label_width]]`** — N/A — segmented pill labels (`Halo`/`Minimal`/`Kuthasta`, `Arc`/`Rings`) fit in spike-010 SegmentedControl width (existing `LanguagePicker` handles `English`/`Português (Brasil)`).
- **`[[feedback_spike_implementation_fidelity]]`** + **`[[feedback_spike_is_design_not_features]]`** — Spike-locked design must be implemented verbatim; spikes lock visuals/controls/colors only. Phase 48 inherits spike-010 chrome verbatim and does not add features beyond the four locked flags.

## Standard Stack

**Single-app codebase — no new dependencies.** All work is composition of existing in-tree primitives.

### Core (in-tree)
| Primitive | File | Purpose | Why Standard |
|-----------|------|---------|--------------|
| `PageShell` | `src/components/primitives/PageShell.tsx` | Page-level wrapper with radial-gradient bg + centered `<section>` | Encodes spike-010 11th-pass mobile/desktop width (`width="page"` = 600px cap) and safe-area inset; used by `AppSettingsPage`, `LearnPage`. |
| `TopAppBar` | `src/components/primitives/TopAppBar.tsx` | Page-level header with `leading`/`trailing` slots + centered `h1` title | Already has `trailing` slot for Phase 48's right-chevron. |
| `IconButton` | `src/components/primitives/IconButton.tsx` | 32/40px round button with `buttonRef` for imperative focus | Already supports `buttonRef` — the exact affordance Phase 48 needs for focus restoration. |
| `SegmentedControl<T>` | `src/components/primitives/SegmentedControl.tsx` | Generic-over-string radiogroup-style pill picker | Used by `LanguagePicker`, `ThemePicker`, `CuePicker`, `TimbrePicker`. Spike-010 locked chrome. |
| `Toggle` | `src/components/primitives/Toggle.tsx` | iOS-style switch with `role="switch"` + 180ms slide | Spike-010 locked chrome. |
| `SettingsToggleRow` | `src/components/SettingsToggleRow.tsx` | Label-left/switch-right row composing `Toggle` + `SettingsRow` | Composes correctly with `SettingsRow`'s `fieldset` + border-t pattern. |
| `SettingsSectionHeader` | `src/components/SettingsSectionHeader.tsx` | Uppercase tracked label above each section card | Used by `SettingsPanelBody` for 4 sections; Phase 48 uses 2. |
| `ChevronRightIcon` | `src/components/icons/ChevronRightIcon.tsx` | 24×24 svg, stroke=currentColor, width 1.5 | Already exists; imports as `import { ChevronRightIcon } from '../../components/icons'`. |
| `ChevronBackIcon` | `src/components/icons/ChevronBackIcon.tsx` | 24×24 svg back chevron | Used by `AppSettingsPage` and `LearnPage` for back nav. |

### Choice hooks (Phase 47 — direct consumers)
| Hook | File | Returns | Phase 48 Consumer |
|------|------|---------|-------------------|
| `useBreathingShapeChoice` | `src/hooks/useBreathingShapeChoice.ts` | `{ breathingShape, setBreathingShape }` typed `BreathingShapeVariant` | `OrbPicker` |
| `useRingCueChoice` | `src/hooks/useRingCueChoice.ts` | `{ ringCue, setRingCue }` typed `RingCueStyle` | `RingCuePicker` |
| `useOrbIdleChoice` | `src/hooks/useOrbIdleChoice.ts` | `{ orbIdle, setOrbIdle }` typed `OrbIdleBehavior` (`'still'` \| `'ambient'`) | Inline `SettingsToggleRow` on `AppearancePage` (label-to-boolean adapter) |
| `useSwitcherIconChoice` | `src/hooks/useSwitcherIconChoice.ts` | `{ switcherIcon, setSwitcherIcon }` typed `boolean` | Inline `SettingsToggleRow` on `AppearancePage` (direct boolean) |

Each setter writes through `savePrefs` + dispatches `hrv:prefs-changed` with the per-flag `detail.key` — verified verbatim across all four hook implementations.

### String catalog
| File | Purpose |
|------|---------|
| `src/content/strings.ts` | `UiStrings` interface + `UI_STRINGS: Record<LocaleId, UiStrings>` const. The type-completeness invariant is enforced by `as const satisfies Readonly<Record<LocaleId, UiStrings>>` at line 522. |
| `src/content/lockedCopy.ts` | `LOCKED_COPY` (3 frozen-EN keys: `inspiredByForrest`, `medicalAdviceLine`, `affiliationLine`). Phase 48 does NOT touch this. |
| `src/content/content.no-review-markers.test.ts` | fs-scan guard that fails if `// TODO: native-speaker review` appears anywhere in `src/content/*.ts` (excluding `.test.ts`). **Phase 48 must adapt per D-18.** |
| `src/hooks/useUiStringsContext.tsx` | `UiStringsProvider` + `useUiStrings()` — single subscription point for the locale-aware catalog. |

### Alternatives Considered
| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| `SegmentedControl` for Orb (3 options) | `PickerCardGrid` (used by `ThemePicker`/`CuePicker`) | APPEAR-03 explicitly requires `SegmentedControl`; matches `LanguagePicker` convention. |
| Extracting two toggle wrappers | Inline `SettingsToggleRow` on `AppearancePage` | D-10 locked: toggle wrappers would be near-empty paste-and-renames. |
| Reusing `onSettingsOpen` for back-nav | Dedicated `onBackToAppSettings` callback | D-12 prefers dedicated for symmetry with `onBackToPractice`; planner discretion. |
| URL hash routing | In-memory `AppScreen` state | Out of scope; `ScreenRouter` is in-memory today, not bumping that scope. |

**No package install. No version verification needed — phase adds zero dependencies.**

## Package Legitimacy Audit

**N/A — Phase 48 adds zero npm packages.** All work uses in-tree files already verified by 600+ existing tests in the repository.

## Architecture Patterns

### System Architecture Diagram

```
User clicks `>` right-chevron in App Settings header
                │
                ▼
   AppSettingsPage trailing IconButton onClick
                │
                ▼
   vm.dialogs.onAppearanceOpen()  ───►  useAppNavigation: setAppScreen('appearance')
                                                                    + clear returningFromAppearance
                │
                ▼
   ScreenRouter re-renders: case 'appearance': <AppearancePage>
                │
                ▼
   AppearancePage:
     ┌─────────────────────────────────────────────────┐
     │ TopAppBar(leading: back-chevron, title: 'Appearance') │
     ├─────────────────────────────────────────────────┤
     │ SectionHeader: 'Orb Style'                       │
     │ SectionCard:                                     │
     │   OrbPicker      → useBreathingShapeChoice      │
     │   RingCuePicker  → useRingCueChoice             │
     ├─────────────────────────────────────────────────┤
     │ SectionHeader: 'Visual'                          │
     │ SectionCard:                                     │
     │   SettingsToggleRow 'Breathing effect' → useOrbIdleChoice  (boolean ↔ 'ambient'/'still')│
     │   SettingsToggleRow 'Switcher icons'   → useSwitcherIconChoice (direct boolean)│
     └─────────────────────────────────────────────────┘

User clicks any picker option / toggle
                │
                ▼
   Choice-hook setter:
     1. savePrefs({ ...current, <field>: next })    [writes envelope to localStorage]
     2. setState(next)                              [optimistic UI for the picker itself]
     3. dispatchEvent('hrv:prefs-changed', { detail: { key, value } })
                │
                ▼
   useFeatureFlags listener (already wired in Phase 47):
     - filters detail.key ∈ { breathingShape, ringCue, orbIdle, switcherIcon } | undefined
     - setPersisted(loadPrefs())
     - returns readFeatureFlags(search, slim-projection)
                │
                ▼
   PracticeScreen re-renders with new vm.featureFlags
     ├── PracticeToggle showIcons={vm.featureFlags.switcherIcon}
     └── PracticeSessionView variant=… idleMode=… ringCue=…

User clicks back-chevron on AppearancePage
                │
                ▼
   onBack → vm.dialogs.onBackToAppSettings()
                │
                ▼
   useAppNavigation: setAppScreen('appSettings'); setReturningFromAppearance(true)
                │
                ▼
   ScreenRouter renders AppSettingsPage; AppSettingsPage useEffect:
     if (returningFromAppearance) → focus right-chevron buttonRef
     else                          → focus back-chevron buttonRef (current default)
```

### Component Responsibilities

| Component / File | Responsibility |
|------------------|----------------|
| `src/app/pages/AppearancePage.tsx` (NEW) | Page chrome (`PageShell` + `TopAppBar` with back-chevron); two `SettingsSectionHeader`+`SectionCard` blocks containing the two pickers and two toggles. |
| `src/components/OrbPicker.tsx` (NEW) | Calls `useBreathingShapeChoice()`; renders `SegmentedControl<BreathingShapeVariant>` with three options. |
| `src/components/RingCuePicker.tsx` (NEW) | Calls `useRingCueChoice()`; renders `SegmentedControl<RingCueStyle>` with two options. |
| `src/app/useAppNavigation.ts` (EXTEND) | Add `'appearance'` to `AppScreen`; add `onAppearanceOpen`, `onBackToAppSettings`, `returningFromAppearance` field. |
| `src/app/ScreenRouter.tsx` (EXTEND) | Add fourth `case 'appearance':` rendering `<AppearancePage onBack={vm.dialogs.onBackToAppSettings} />`. |
| `src/app/appViewModel.ts` (EXTEND) | Add `onAppearanceOpen`, `onBackToAppSettings`, `returningFromAppearance` to `AppDialogsViewModel`. |
| `src/app/appControllerAdapters.ts` (EXTEND) | Propagate the three new fields from `AppNavigation` into `AppDialogsViewModel` (in `createAppDialogsViewModel` at line 209-223). |
| `src/app/pages/AppSettingsPage.tsx` (EXTEND) | Add `trailing` slot to `TopAppBar` with right-chevron `IconButton` + `chevronButtonRef`; accept new props `onAppearanceOpen` + `returningFromAppearance`; modify mount `useEffect` to conditionally focus chevron vs back-button. |
| `src/components/SettingsPanelBody.tsx` (EDIT) | Change ONE string reference from `strings.appSettings.sections.appearance` → `strings.appSettings.sections.theme` (line 139). |
| `src/content/strings.ts` (EXTEND) | Extend `UiStrings` with `appearance.*` namespace; add EN catalog; add PT-BR catalog with `// TODO: native-speaker review` markers; rename `appSettings.sections.appearance` → `appSettings.sections.theme` (EN: `Theme`, PT-BR: `Tema`). |
| `src/content/content.no-review-markers.test.ts` (ADAPT per D-18) | Allowlist `appearance.*` keys OR allowlist by file/path pattern OR flip to advisory until I18N-04. |

### Recommended Project Structure

No new directories. Files land in their conventional locations:

```
src/
├── app/
│   ├── pages/
│   │   ├── AppearancePage.tsx              # NEW
│   │   ├── AppearancePage.test.tsx         # NEW
│   │   ├── AppSettingsPage.tsx             # EXTEND (trailing slot + focus sentinel)
│   │   ├── AppSettingsPage.test.tsx        # EXTEND (focus-restoration assertions)
│   │   └── LearnPage.tsx                   # unchanged
│   ├── appControllerAdapters.ts            # EXTEND (propagate 3 new fields)
│   ├── appViewModel.ts                     # EXTEND (AppDialogsViewModel +3 fields)
│   ├── ScreenRouter.tsx                    # EXTEND (4th case)
│   ├── ScreenRouter.test.tsx               # EXTEND (4th case assertion)
│   ├── useAppNavigation.ts                 # EXTEND (union +1, callbacks +2, sentinel +1)
│   └── useAppNavigation.test.tsx           # EXTEND (3 new transition tests)
├── components/
│   ├── OrbPicker.tsx                       # NEW
│   ├── OrbPicker.test.tsx                  # NEW
│   ├── RingCuePicker.tsx                   # NEW
│   ├── RingCuePicker.test.tsx              # NEW
│   └── SettingsPanelBody.tsx               # EDIT (one string reference)
└── content/
    ├── strings.ts                          # EXTEND (UiStrings + 2 locale entries + rename)
    └── content.no-review-markers.test.ts   # ADAPT (per D-18)
```

### Pattern 1: Page chrome (paste-and-rename of `AppSettingsPage`/`LearnPage`)

**What:** Every full-page surface in this app follows the same chrome composition.
**When to use:** Any new sibling page reached via in-memory router.

**Verified template (from `src/app/pages/AppSettingsPage.tsx`):**
```typescript
import { useEffect, useRef, type ReactElement } from 'react'
import { ChevronBackIcon } from '../../components/icons'
import { IconButton } from '../../components/primitives/IconButton'
import { PageShell } from '../../components/primitives/PageShell'
import { TopAppBar } from '../../components/primitives/TopAppBar'
import { useUiStrings } from '../../hooks/useUiStringsContext'

export interface AppearancePageProps {
  onBack(this: void): void
}

export function AppearancePage({ onBack }: AppearancePageProps): ReactElement {
  const strings = useUiStrings().appearance  // ← Pick<UiStrings, 'appearance'>
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <PageShell>
      <TopAppBar
        title={strings.title}
        leading={
          <IconButton
            icon={<ChevronBackIcon />}
            label={strings.backChevron}        // 'Back to Settings'
            onClick={onBack}
            buttonRef={backButtonRef}
          />
        }
      />
      <div className="w-full text-left">
        {/* Section headers + SectionCard chrome go here */}
      </div>
    </PageShell>
  )
}
```

### Pattern 2: Picker component (paste-and-rename of `LanguagePicker`)

**Verified template (from `src/components/LanguagePicker.tsx`):**
```typescript
import type { BreathingShapeVariant } from '../featureFlags'
import { useBreathingShapeChoice } from '../hooks/useBreathingShapeChoice'
import { SegmentedControl } from './primitives/SegmentedControl'

const ORB_OPTIONS = ['orb-halo', 'minimal-rings', 'spiritual-eye'] as const satisfies readonly BreathingShapeVariant[]

export interface OrbPickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
  strings: { halo: string; minimal: string; kuthasta: string }   // injected by AppearancePage
}

export function OrbPicker({ disabled, sectionLabel, sectionLabelHidden, strings }: OrbPickerProps) {
  const { breathingShape, setBreathingShape } = useBreathingShapeChoice()
  const options = [
    { id: 'orb-halo' as const, label: strings.halo },
    { id: 'minimal-rings' as const, label: strings.minimal },
    { id: 'spiritual-eye' as const, label: strings.kuthasta },
  ]
  return (
    <div>
      <p
        id="orb-picker-label"
        className={
          sectionLabelHidden
            ? 'sr-only'
            : 'mb-2 text-sm font-semibold text-[var(--color-breathing-accent-strong)]'
        }
      >
        {sectionLabel}
      </p>
      <SegmentedControl<BreathingShapeVariant>
        options={options}
        value={breathingShape}
        onChange={setBreathingShape}
        ariaLabel={sectionLabel}
        disabled={disabled}
      />
    </div>
  )
}
```

`RingCuePicker.tsx` follows identical shape against `useRingCueChoice` + `RingCueStyle`.

### Pattern 3: Toggle binding for `useOrbIdleChoice` (boolean adapter)

`useOrbIdleChoice` returns `{ orbIdle: 'still' | 'ambient', setOrbIdle }`. `SettingsToggleRow` expects `checked: boolean, onChange(next: boolean)`. Inline adapter on `AppearancePage`:
```typescript
const { orbIdle, setOrbIdle } = useOrbIdleChoice()
// ...
<SettingsToggleRow
  label={strings.breathingEffect.label}
  ariaLabel={strings.breathingEffect.label}
  checked={orbIdle === 'ambient'}
  onChange={(next) => { setOrbIdle(next ? 'ambient' : 'still') }}
/>
```

For `useSwitcherIconChoice`, no adapter — the hook returns `boolean` directly:
```typescript
const { switcherIcon, setSwitcherIcon } = useSwitcherIconChoice()
// ...
<SettingsToggleRow
  label={strings.switcherIcons.label}
  ariaLabel={strings.switcherIcons.label}
  checked={switcherIcon}
  onChange={setSwitcherIcon}
/>
```

### Pattern 4: Right-chevron addition to `AppSettingsPage.tsx`

The current implementation has only `leading`. Phase 48 adds `trailing` and a second `useRef`:
```typescript
export interface AppSettingsPageProps {
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onBack(this: void): void
  onAppearanceOpen(this: void): void          // NEW
  returningFromAppearance: boolean             // NEW
}

export function AppSettingsPage({
  isIOS, isStandalone, installable, onInstall, onBack,
  onAppearanceOpen, returningFromAppearance,
}: AppSettingsPageProps): ReactElement {
  const allStrings = useUiStrings()
  const strings = { appSettings: allStrings.appSettings, install: allStrings.install, appearance: allStrings.appearance }
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const chevronButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (returningFromAppearance) {
      chevronButtonRef.current?.focus({ preventScroll: true })
    } else {
      backButtonRef.current?.focus({ preventScroll: true })
    }
  }, [returningFromAppearance])

  return (
    <PageShell>
      <TopAppBar
        title={strings.appSettings.title}
        leading={
          <IconButton icon={<ChevronBackIcon />} label={strings.appSettings.close}
            onClick={onBack} buttonRef={backButtonRef} />
        }
        trailing={
          <IconButton icon={<ChevronRightIcon />} label={strings.appearance.rightChevronAriaOnSettings}
            onClick={onAppearanceOpen} buttonRef={chevronButtonRef} />
        }
      />
      {/* rest unchanged */}
    </PageShell>
  )
}
```

### Pattern 5: Routing extension in `useAppNavigation.ts`

Current file (verbatim) is 56 lines. Phase 48 adds:
- `'appearance'` to the `AppScreen` union type.
- `onAppearanceOpen()` callback (mirrors `onSettingsOpen`/`onLearnOpen`).
- `onBackToAppSettings()` callback that sets `appScreen` to `'appSettings'` AND sets `returningFromAppearance: true`.
- `returningFromAppearance: boolean` state field.
- `returningFromAppearance` gets cleared by `onAppearanceOpen` (and ideally any non-back-to-AppSettings transition).

Sketch:
```typescript
export type AppScreen = 'practice' | 'learn' | 'appSettings' | 'appearance'

export interface AppNavigation {
  appScreen: AppScreen
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onAppearanceOpen(this: void): void
  onBackToPractice(this: void): void
  onBackToAppSettings(this: void): void
  returningFromAppearance: boolean
}

export function useAppNavigation({ controlsDisabled, closeOnSessionView }: UseAppNavigationArgs): AppNavigation {
  const [appScreen, setAppScreen] = useState<AppScreen>('practice')
  const [returningFromAppearance, setReturningFromAppearance] = useState<boolean>(false)

  useEffect(() => {
    if (!closeOnSessionView) return
    setAppScreen('practice')
    setReturningFromAppearance(false)
  }, [closeOnSessionView])

  const onLearnOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('learn')
    setReturningFromAppearance(false)
  }, [controlsDisabled])

  const onSettingsOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('appSettings')
    setReturningFromAppearance(false)
  }, [controlsDisabled])

  const onAppearanceOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('appearance')
    setReturningFromAppearance(false)
  }, [controlsDisabled])

  const onBackToPractice = useCallback((): void => {
    setAppScreen('practice')
    setReturningFromAppearance(false)
  }, [])

  const onBackToAppSettings = useCallback((): void => {
    setAppScreen('appSettings')
    setReturningFromAppearance(true)
  }, [])

  return {
    appScreen, returningFromAppearance,
    onLearnOpen, onSettingsOpen, onAppearanceOpen,
    onBackToPractice, onBackToAppSettings,
  }
}
```

**Note for planner:** Sentinel-clearing strategy is Claude's discretion (D-13). Alternatives:
- Clear in the same `useEffect` that consumed it in `AppSettingsPage` (clean read-then-clear).
- Use `useRef<boolean>` with explicit `.current = false` after read (avoids the re-render the sentinel write triggers).
- Use `useState` and accept the extra render (chosen above for simplicity).

### Anti-Patterns to Avoid
- **Extending `SettingsToggleRow` with a sub-text/description slot.** Declined in D-05/D-06 (compose-existing-primitives rule). If user testing later reveals confusion, that's a separate spike — not Phase 48 scope.
- **Bypassing the choice hooks and writing directly to `savePrefs`** in the new pickers. The hooks own the optimistic-state + event-dispatch contract; bypass would skip the live-update event.
- **Adding URL hash or browser-history integration** for the new screen. `ScreenRouter` is in-memory by design; not bumping that scope.
- **Touching `LOCKED_COPY`.** All new strings are added to `UiStrings`/`UI_STRINGS` only; the byte-equality test must stay green.
- **Renaming `appSettings.sections.appearance` everywhere via sed/regex.** Use LSP rename ([[feedback_use_lsp_for_renames]]); there's only one consumer (`SettingsPanelBody.tsx` line 139) plus the string-catalog definition site, so a manual edit is safer here than a project-wide rename.
- **Hardcoding option labels in the picker components.** Labels flow through `UiStrings` (D-12 cue/timbre/theme convention). Picker components accept `strings` prop and map by union member.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page chrome with header + back affordance | New page-level layout helper | `PageShell` + `TopAppBar` + `IconButton(ChevronBackIcon)` | Encodes spike-010 safe-area inset, width caps, mobile/desktop responsive behavior. |
| Segmented option picker | New radiogroup component | `SegmentedControl<T>` | Spike-010 chrome locked; `LanguagePicker` is the canonical template. |
| iOS-style toggle | New switch component | `Toggle` (or composed `SettingsToggleRow`) | Spike-010 chrome locked (44×24 pill, 20×20 knob, 180ms slide). |
| Section header above a card | New header component | `SettingsSectionHeader` | Spike-010 sixth-pass header style (11px / 0.16em tracking / uppercase / muted). |
| Section card chrome | New card component | Inline `SectionCard` pattern from `SettingsPanelBody.tsx:36-55` (or extract a tiny helper) | `border-soft` 1px + `surface` bg + 20px radius — three CSS lines. |
| Right chevron icon | Custom SVG | `ChevronRightIcon` | Already exists in `src/components/icons/`. |
| Focus management on mount | Custom focus orchestration | `useRef` + `useEffect(() => buttonRef.current?.focus({preventScroll: true}), [])` on the target button | Established pattern; `IconButton.buttonRef` exists for this exact purpose. |
| Same-tab event propagation | Custom event bus | `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', {detail: {key, value}}))` | Already wired in all four choice hooks; already consumed by `useFeatureFlags`. |
| String catalog completeness | Runtime check | TypeScript `as const satisfies Readonly<Record<LocaleId, UiStrings>>` at end of `UI_STRINGS` | Compile-time guarantee that every locale has every key. |

**Key insight:** Phase 48 ships **zero new abstractions**. Every primitive, hook, icon, and event channel already exists from Phases 16–47.

## Runtime State Inventory

> Phase 48 has minor refactor character (renaming `appSettings.sections.appearance` → `appSettings.sections.theme`). The grep audit + LSP rename above covers all code paths, but the runtime-state categories deserve explicit answers.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — the renamed key (`appSettings.sections.appearance`) is a compile-time constant in `UiStrings`/`UI_STRINGS`. localStorage envelope stores no string-catalog keys; `UserPrefs` does not reference the old name. | None — code rename only. |
| **Live service config** | None — no external services. | None. |
| **OS-registered state** | None — browser-only app. | None. |
| **Secrets/env vars** | None — no secrets reference `appearance`/`Appearance`/`Theme` strings. `VITE_SWITCHER_TREATMENT` env var was already retired in Phase 47 per requirements. | None. |
| **Build artifacts / installed packages** | None — Vite rebuilds from source; no compiled artifacts cache the string outside Vite's standard hash-invalidation. | None — `npm run build` regenerates. |

The rename surface is exactly: (1) `src/content/strings.ts` (`UiStrings` interface + EN + PT-BR entries), (2) `src/components/SettingsPanelBody.tsx` line 139 (one consumer), (3) `src/content/content.no-removed-keys.test.ts` may need a `removed-but-renamed` allowlist if it explicitly pins the old key as forbidden (verified at line 59-79 — no entry for `appSettings.sections.appearance`, so no drift-guard hit).

## Common Pitfalls

### Pitfall 1: Drift-guard fails on `// TODO: native-speaker review` markers
**What goes wrong:** `src/content/content.no-review-markers.test.ts` (line 38-46) fs-scans `src/content/*.ts` (excluding `.test.ts`) for the literal marker `// TODO: native-speaker review`. Phase 48 reintroduces this marker on every new PT-BR string. The guard will fail immediately on first commit.
**Why it happens:** The guard was added in Phase 26 D-12 to lock the v1.3 done-state; it has no allowlist or namespace scoping.
**How to avoid:** D-18 lists three viable adaptations:
  - (a) **Extend the guard with a path/key allowlist** (preferred — mirrors `content.no-removed-keys.test.ts`'s structural-pattern approach). Allowlist by `appearance.*` key prefix or by line-range exception.
  - (b) **Add a namespace exception** that suppresses markers under `appearance.*` only.
  - (c) **Flip the guard to advisory** (e.g., `it.skip` with a TODO) until I18N-04 closes the markers.
**Warning signs:** First `npm run test:run` after touching `strings.ts` will fail in `content.no-review-markers.test.ts`. Picker tests pass independently.

### Pitfall 2: `Record<LocaleId, UiStrings>` type-completeness fails partway
**What goes wrong:** Adding `appearance: { ... }` to the `UiStrings` interface but only to `UI_STRINGS.en`, forgetting PT-BR, would yield a TypeScript error at the `satisfies` constraint (line 522 of `strings.ts`).
**Why it happens:** The `as const satisfies` pattern is precisely the type-completeness guard — it surfaces missing keys at compile time per locale. This is **a feature**, not a bug.
**How to avoid:** Plan a single Wave/task that updates the interface AND both locale entries atomically. Do not split into "EN first, PT-BR later" tasks.
**Warning signs:** `tsc -b` fails with "Property 'appearance' is missing in type 'UiStrings' but required in type". The error message is precise — fix in one diff.

### Pitfall 3: Live-update doesn't propagate because the new event dispatches with an unknown key
**What goes wrong:** If a Phase 48 picker dispatches `hrv:prefs-changed` with `detail.key === 'orb'` (or some other un-filtered key), `useFeatureFlags`'s listener (line 73-92) will silently ignore it.
**Why it happens:** The filter at line 78-83 explicitly allows only `breathingShape | ringCue | orbIdle | switcherIcon | undefined`. Anything else is dropped.
**How to avoid:** Phase 48 must NOT introduce new dispatch sites — bind directly to the Phase 47 choice hooks (`useBreathingShapeChoice`, etc.), which already dispatch with the correct keys. Picker `onChange` should call the hook's setter directly, never `dispatchEvent` ad hoc.
**Warning signs:** Picker UI updates optimistically (the segmented pill highlights the new option), but `PracticeScreen` doesn't reflect the change on the next render. Inspect the `hrv:prefs-changed` event's `detail.key`.

### Pitfall 4: Focus restoration sentinel "sticks" across navigation
**What goes wrong:** User clicks Settings → Appearance → Back to Settings (`returningFromAppearance = true`), then clicks back-to-Practice → Settings again. The sentinel is still `true`, so focus goes to the chevron instead of the back-button.
**Why it happens:** D-13 says "set on back, cleared after consumption" — the implementation must clear the sentinel in `onSettingsOpen`/`onLearnOpen`/`onBackToPractice`/`onAppearanceOpen`, not just after the `useEffect` reads it.
**How to avoid:** The reference implementation above clears `returningFromAppearance` in every `setAppScreen('not-appSettings')` transition. Alternative: clear it after consumption in the `useEffect` body via a dedicated callback exposed by `useAppNavigation` (`clearReturningFromAppearance`). Either is acceptable; the contract test should cover the "subsequent navigation clears the sentinel" case (D-16).
**Warning signs:** Manual UAT shows focus on chevron after Settings reached via a non-back-from-Appearance path.

### Pitfall 5: Test mocks for `ScreenRouter` go stale after Phase 47 changes to `install` viewmodel
**What goes wrong:** `src/app/ScreenRouter.test.tsx:32` constructs a fake `install` slice with fields `showBanner: false`, `onDismiss: () => {}` — both were removed in earlier phases (per `content.no-removed-keys.test.ts` J18.4 entries). The test still passes today because it casts through `as unknown as AppViewModel`.
**Why it happens:** The cast bypasses TypeScript strictness; future drift is invisible until a test query relies on the removed fields.
**How to avoid:** When extending `ScreenRouter.test.tsx` for the new `'appearance'` case, fix the stale fake-install fields too. Belt-and-suspenders: the drift-guard already flags re-introduction; this test fixture was grandfathered.
**Warning signs:** `tsc -b` does not catch this; runtime test passes vacuously.

### Pitfall 6: Renaming `appSettings.sections.appearance` breaks `SettingsPanelBody.test.tsx`
**What goes wrong:** If `SettingsPanelBody.test.tsx` asserts on the section header text `'Appearance'`, the rename to `'Theme'` will break the test.
**Why it happens:** Tests that hardcode user-visible strings break when copy changes. Locked-copy strings are intentionally locked; non-locked strings should generally be queried by role or by a string from `UI_STRINGS.en`.
**How to avoid:** Audit `SettingsPanelBody.test.tsx` for any string assertion containing `'Appearance'`. If found, update to `'Theme'` (or read from `UI_STRINGS.en.appSettings.sections.theme`).
**Warning signs:** Test failure naming the exact string.

## Code Examples

### Adding the right-chevron to `TopAppBar` via `trailing` prop
```typescript
// In AppSettingsPage.tsx — verified composition: TopAppBar already accepts trailing.
<TopAppBar
  title={strings.appSettings.title}
  leading={<IconButton icon={<ChevronBackIcon />} label={strings.appSettings.close}
                       onClick={onBack} buttonRef={backButtonRef} />}
  trailing={<IconButton icon={<ChevronRightIcon />} label={strings.appearance.rightChevronAriaOnSettings}
                        onClick={onAppearanceOpen} buttonRef={chevronButtonRef} />}
/>
```

### Suggested `UiStrings.appearance` shape
```typescript
// In strings.ts UiStrings interface
readonly appearance: {
  readonly title: string                                  // 'Appearance'
  readonly backChevron: string                            // 'Back to Settings'
  readonly rightChevronAriaOnSettings: string             // 'Appearance settings'
  readonly sections: {
    readonly orbStyle: string                             // 'Orb Style'
    readonly visual: string                               // 'Visual'
  }
  readonly orb: {
    readonly label: string                                // 'Orb'
    readonly options: {
      readonly halo: string                               // 'Halo'
      readonly minimal: string                            // 'Minimal'
      readonly kuthasta: string                           // 'Kuthasta'
    }
  }
  readonly ringCue: {
    readonly label: string                                // 'Ring cue'
    readonly options: {
      readonly arc: string                                // 'Arc'
      readonly rings: string                              // 'Rings'
    }
  }
  readonly breathingEffect: {
    readonly label: string                                // 'Breathing effect'
  }
  readonly switcherIcons: {
    readonly label: string                                // 'Switcher icons'
  }
}
```

PT-BR mirror with `// TODO: native-speaker review` next to each string per D-09 + D-18.

### EN/PT-BR catalog entry — note marker placement
```typescript
// In UI_STRINGS.en.appearance:
appearance: {
  title: 'Appearance',
  backChevron: 'Back to Settings',
  rightChevronAriaOnSettings: 'Appearance settings',
  sections: { orbStyle: 'Orb Style', visual: 'Visual' },
  orb: { label: 'Orb', options: { halo: 'Halo', minimal: 'Minimal', kuthasta: 'Kuthasta' } },
  ringCue: { label: 'Ring cue', options: { arc: 'Arc', rings: 'Rings' } },
  breathingEffect: { label: 'Breathing effect' },
  switcherIcons: { label: 'Switcher icons' },
},

// In UI_STRINGS['pt-BR'].appearance (markers inline):
appearance: {
  // TODO: native-speaker review
  title: 'Aparência',
  // TODO: native-speaker review
  backChevron: 'Voltar para Configurações',
  // TODO: native-speaker review
  rightChevronAriaOnSettings: 'Configurações de aparência',
  sections: {
    // TODO: native-speaker review
    orbStyle: 'Estilo do orbe',
    // TODO: native-speaker review
    visual: 'Visual',
  },
  // ... etc per D-09
},
```

The drift-guard adaptation chosen per D-18 (a/b/c) determines whether these markers stay green.

### `OrbPicker` end-to-end (full file)
Already shown above under "Pattern 2: Picker component". Mirrors `LanguagePicker.tsx` byte-for-byte except for the imports, type parameter, hook call, and option mapping.

### Sentinel-aware mount focus in `AppSettingsPage`
```typescript
useEffect(() => {
  if (returningFromAppearance) {
    chevronButtonRef.current?.focus({ preventScroll: true })
  } else {
    backButtonRef.current?.focus({ preventScroll: true })
  }
}, [returningFromAppearance])
```

The dep `[returningFromAppearance]` ensures the effect re-runs if the user opens AppSettings via different paths in succession.

## State of the Art

N/A — no external library state-of-the-art to discuss. All techniques used (`useSyncExternalStore` for popstate, `CustomEvent` for same-tab broadcast, `as const satisfies` for type-completeness) are established React 19 / TypeScript 6 patterns already in production use across this codebase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | All claims in this research are verified by direct read of the in-tree source files cited. | — | — |

**This table is empty:** All claims in this research were verified or cited from in-tree code, the operator-locked CONTEXT.md, REQUIREMENTS.md, or ROADMAP.md. No external/web knowledge was used. No user confirmation needed beyond the existing operator decisions.

## Open Questions

1. **Right-chevron ARIA wording — `Appearance settings` vs `Appearance` vs `Open appearance settings`**
   - What we know: D-07 picks `Appearance settings`. Discussion Q12 explicitly punted to Claude's discretion in PLAN.md.
   - What's unclear: Whether the surrounding ARIA context (the `IconButton` is inside a `TopAppBar` with `title='Settings'`) shortens to just `Appearance` without ambiguity.
   - Recommendation: Plan with `Appearance settings` per D-07. If a verifier/UI-review later prefers the shorter form, the cost of changing one string is trivial.

2. **Sentinel storage — `useState<boolean>` vs `useRef<boolean>`**
   - What we know: D-13 picks `useState`. CONTEXT.md "Claude's Discretion" allows `useRef` if it cleans up consumption.
   - What's unclear: `useRef` would avoid one render but requires manual `.current = false` after read; `useState` is simpler.
   - Recommendation: Plan with `useState`. Run the implementation. If the verifier flags the extra render as a concern, switch to `useRef`.

3. **`onBackToAppSettings` vs reusing `onSettingsOpen`**
   - What we know: D-12 prefers dedicated callback for symmetry. CONTEXT.md "Claude's Discretion" allows collapse if focus-sentinel write stays clean.
   - What's unclear: `onSettingsOpen` is `controlsDisabled`-gated; `onBackToAppSettings` is not (you can always navigate back, even mid-session — though `closeOnSessionView` would yank you to practice anyway).
   - Recommendation: Keep dedicated `onBackToAppSettings` per D-12. The symmetry with `onBackToPractice` is worth one extra method.

4. **`SectionCard` inline duplication vs extracted helper from `SettingsPanelBody`**
   - What we know: `SettingsPanelBody.tsx:36-55` defines `SectionCard` as a local helper (not exported). The duplication is three lines.
   - What's unclear: Whether to export from `SettingsPanelBody.tsx` and reuse, or duplicate inline on `AppearancePage`.
   - Recommendation: Inline duplicate on `AppearancePage` (matches D-10's "compose existing primitives, don't extract new shared ones unnecessarily"). If a third consumer arrives, extract to a shared component then.

5. **`AppearancePage.test.tsx` — mock the choice hooks or use real `loadPrefs`/`savePrefs`?**
   - What we know: `LanguagePicker.test.tsx` uses **real** `localStorage` with `seedLocale()` (line 13-20). Per-picker tests for Phase 47 hooks use the same convention.
   - What's unclear: Whether `AppearancePage.test.tsx` should mock the hooks (faster, isolated) or use real storage (matches existing convention).
   - Recommendation: Use real `localStorage` per existing convention. Sets up the full integration loop (picker click → savePrefs → re-render) without mocks.

## Environment Availability

Phase 48 has no external runtime dependencies beyond what the rest of the repo already requires (Node, npm, the in-tree `node_modules`).

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Vitest, Vite | (assumed available — repo already builds) | — | — |
| Vitest | Test runner | ✓ (already a devDep) | `^4.1.5` | — |
| `@testing-library/react` | Tests | ✓ (already a devDep) | `^16.3.2` | — |
| `@testing-library/user-event` | Click simulation | ✓ (already a devDep) | `^14.6.1` | — |
| TypeScript | `tsc -b` for type-completeness check | ✓ (already a devDep) | `~6.0.2` | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (jsdom env) |
| Config file | (Vitest config integrated via Vite; `vitest.setup.ts` at repo root for global setup) |
| Quick run command | `npm test -- src/app/pages/AppearancePage.test.tsx src/components/OrbPicker.test.tsx src/components/RingCuePicker.test.tsx --run` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APPEAR-01 | Right-chevron `>` is present in App Settings header trailing slot | integration | `npm test -- src/app/pages/AppSettingsPage.test.tsx --run` | ❌ Wave 0 (extend existing test) |
| APPEAR-01 | Clicking the right-chevron invokes `onAppearanceOpen` | integration | `npm test -- src/app/pages/AppSettingsPage.test.tsx --run` | ❌ Wave 0 |
| APPEAR-02 | AppearancePage renders title `Appearance` + back-chevron in leading slot | integration | `npm test -- src/app/pages/AppearancePage.test.tsx --run` | ❌ Wave 0 (new file) |
| APPEAR-02 | Back-chevron click invokes `onBack` | integration | `npm test -- src/app/pages/AppearancePage.test.tsx --run` | ❌ Wave 0 |
| APPEAR-02 | After back-nav, App Settings right-chevron receives focus (sentinel = true) | integration | `npm test -- src/app/pages/AppSettingsPage.test.tsx --run` | ❌ Wave 0 (extend) |
| APPEAR-02 | Default mount focus (sentinel = false) stays on back-chevron | integration | `npm test -- src/app/pages/AppSettingsPage.test.tsx --run` | ✅ (existing test for back-chevron focus; extend with sentinel=false case) |
| APPEAR-03 | OrbPicker renders 3 radio buttons (Halo/Minimal/Kuthasta) | unit | `npm test -- src/components/OrbPicker.test.tsx --run` | ❌ Wave 0 (new file) |
| APPEAR-03 | OrbPicker click writes correct `breathingShape` to `loadPrefs` | unit | `npm test -- src/components/OrbPicker.test.tsx --run` | ❌ Wave 0 |
| APPEAR-03 | OrbPicker click dispatches `hrv:prefs-changed` with `detail.key='breathingShape'` | unit | `npm test -- src/components/OrbPicker.test.tsx --run` | ❌ Wave 0 |
| APPEAR-03 | RingCuePicker renders 2 radio buttons (Arc/Rings) | unit | `npm test -- src/components/RingCuePicker.test.tsx --run` | ❌ Wave 0 (new file) |
| APPEAR-03 | RingCuePicker click writes correct `ringCue` to `loadPrefs` | unit | `npm test -- src/components/RingCuePicker.test.tsx --run` | ❌ Wave 0 |
| APPEAR-03 | RingCuePicker click dispatches `hrv:prefs-changed` with `detail.key='ringCue'` | unit | `npm test -- src/components/RingCuePicker.test.tsx --run` | ❌ Wave 0 |
| APPEAR-04 | Breathing effect toggle: `off` ↔ `orbIdle='still'`, `on` ↔ `orbIdle='ambient'` | integration | `npm test -- src/app/pages/AppearancePage.test.tsx --run` | ❌ Wave 0 |
| APPEAR-04 | Switcher icons toggle: `off` ↔ `switcherIcon=false`, `on` ↔ `switcherIcon=true` | integration | `npm test -- src/app/pages/AppearancePage.test.tsx --run` | ❌ Wave 0 |
| APPEAR-05 | Persisted-prefs setter writes envelope AND dispatches `hrv:prefs-changed` (covered by Phase 47 hook tests) | unit | `npm test -- src/hooks/useBreathingShapeChoice.test.ts src/hooks/useRingCueChoice.test.ts src/hooks/useOrbIdleChoice.test.ts src/hooks/useSwitcherIconChoice.test.ts --run` | ✅ (all 4 already exist, fully green from Phase 47) |
| APPEAR-05 | `useFeatureFlags` re-reads on `hrv:prefs-changed` for the 4-key set (covered by Phase 47 test) | unit | `npm test -- src/hooks/useFeatureFlags.test.ts --run` | ✅ (already exists from Phase 47) |
| APPEAR-06 | AppearancePage uses `PageShell` + `TopAppBar` + Mono Zen `SectionCard` chrome | manual-only (visual UAT) | (operator UAT — light + dark theme, mobile + desktop viewports) | — — visual regression, no automated assertion possible; operator runs `npm run dev` and inspects |
| I18N-01 | `appearance.*` keys exist in EN with correct copy per D-03..D-09 | unit | `npm test -- src/content/strings.test.ts --run` | ❌ Wave 0 (extend existing strings.test.ts with `Phase 48 appearance.*` describe block per the existing convention at lines 219-251 for `Phase 32 new learn.* heading keys`) |
| I18N-02 | `appearance.*` keys exist in PT-BR (non-empty) with `// TODO: native-speaker review` markers present | unit | `npm test -- src/content/strings.test.ts --run` | ❌ Wave 0 |
| I18N-02 | The drift-guard `content.no-review-markers.test.ts` is adapted per D-18 — green | unit | `npm test -- src/content/content.no-review-markers.test.ts --run` | ❌ Wave 0 (modify existing) |
| I18N-03 | `LOCKED_COPY` byte-equality guard green (untouched) | unit | `npm test -- src/content/lockedCopy.test.ts --run` | ✅ (already exists, must stay green) |
| I18N-03 | `as const satisfies Readonly<Record<LocaleId, UiStrings>>` compiles (type-completeness) | type-check | `npm run build` or `tsc -b` | ✅ (compile-time guarantee) |
| Routing | `useAppNavigation.onAppearanceOpen` transitions `'appSettings' → 'appearance'` | unit | `npm test -- src/app/useAppNavigation.test.tsx --run` | ✅ (extend existing — has 5 tests today; add 3+) |
| Routing | `useAppNavigation.onBackToAppSettings` transitions `'appearance' → 'appSettings'` AND sets `returningFromAppearance=true` | unit | `npm test -- src/app/useAppNavigation.test.tsx --run` | ❌ Wave 0 (new test) |
| Routing | Subsequent navigation (e.g., `onSettingsOpen`/`onLearnOpen`/`onBackToPractice`/`onAppearanceOpen`) clears `returningFromAppearance` | unit | `npm test -- src/app/useAppNavigation.test.tsx --run` | ❌ Wave 0 (new test) |
| Routing | `closeOnSessionView` resets `'appearance' → 'practice'` and clears sentinel | unit | `npm test -- src/app/useAppNavigation.test.tsx --run` | ❌ Wave 0 (new test) |
| Routing | `ScreenRouter` renders `<AppearancePage>` when `appScreen='appearance'` | unit | `npm test -- src/app/ScreenRouter.test.tsx --run` | ❌ Wave 0 (extend — add 4th case, also fix stale install fields) |

### Sampling Rate
- **Per task commit:** Run the focused test for the file being edited (e.g., `npm test -- src/components/OrbPicker.test.tsx --run`). All test runs use `--run` to disable watch mode.
- **Per wave merge:** Run the affected file group (e.g., all `src/components/*Picker.test.tsx` + `src/app/pages/Appearance*.test.tsx` + `src/app/useAppNavigation.test.tsx` + `src/app/ScreenRouter.test.tsx`).
- **Phase gate:** Full suite green: `npm run test:run` AND `npm run build` (typecheck) AND `npm run lint`.

### Wave 0 Gaps

- [ ] `src/components/OrbPicker.test.tsx` — covers APPEAR-03 orb picker behavior.
- [ ] `src/components/RingCuePicker.test.tsx` — covers APPEAR-03 ring cue picker behavior.
- [ ] `src/app/pages/AppearancePage.test.tsx` — covers APPEAR-02 + APPEAR-04 + APPEAR-05 page-level behavior.
- [ ] Extension to `src/app/pages/AppSettingsPage.test.tsx` — adds right-chevron presence/click + focus-restoration tests (APPEAR-01 + APPEAR-02).
- [ ] Extension to `src/app/useAppNavigation.test.tsx` — adds 4 new transition tests (Routing block above).
- [ ] Extension to `src/app/ScreenRouter.test.tsx` — adds 4th case assertion + fixes stale `install` fixture fields.
- [ ] Extension to `src/content/strings.test.ts` — adds `Phase 48 appearance.*` describe block per the existing per-phase convention (mirrors `Phase 32 new learn.* heading keys` at line 219-251).
- [ ] Modification to `src/content/content.no-review-markers.test.ts` per D-18 path (a/b/c).

**Framework install:** None — Vitest + Testing Library + jsdom are already devDependencies.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface — anonymous local-only browser app. |
| V3 Session Management | no | No session — all state is in localStorage envelope (no server). |
| V4 Access Control | no | All controls are user-owned local prefs. |
| V5 Input Validation | yes | Choice-hook setters are typed (`BreathingShapeVariant`/`RingCueStyle`/`OrbIdleBehavior`/`boolean`) — TS prevents invalid values at compile time. `loadPrefs()` already coerces unknown/corrupted envelope values to defaults (Phase 47 D-04 + Phase 8 D-01). Phase 48 adds no new input surface — only binds existing typed setters to UI. |
| V6 Cryptography | no | No crypto in scope — no secrets, no encryption. |

### Known Threat Patterns for React 19 SPA

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via injected i18n strings | Tampering / Information Disclosure | React 19 auto-escapes all string interpolations in JSX. New `appearance.*` strings are static literals in `strings.ts` — no user input flows into them. |
| Prototype pollution via `loadPrefs()` | Tampering | Already mitigated at the prefs layer (Phase 14 D-17 / Phase 47 D-04). Phase 48 does not touch `loadPrefs`/`savePrefs`. |
| Storage key collision / cross-origin reads | Information Disclosure | `STATE_KEY` is the established single key; localStorage is origin-scoped by browser. No new keys introduced. |

No security risks introduced by Phase 48 beyond the existing app surface. The new strings are static; the new pickers consume already-validated typed unions; the new routing state is in-memory.

## Sources

### Primary (HIGH confidence — direct in-tree code reads)
- `/Users/lucindo/Code/hrv/.planning/phases/48-appearance-page-i18n/48-CONTEXT.md` — operator-locked decisions D-01..D-18.
- `/Users/lucindo/Code/hrv/.planning/phases/48-appearance-page-i18n/48-DISCUSSION-LOG.md` — Q1..Q12 deliberation audit trail.
- `/Users/lucindo/Code/hrv/.planning/REQUIREMENTS.md` — APPEAR-01..06 + I18N-01..03 requirement IDs.
- `/Users/lucindo/Code/hrv/.planning/ROADMAP.md` §"Phase 48: Appearance page + i18n" — success criteria 1–5.
- `/Users/lucindo/Code/hrv/.planning/STATE.md` — current focus + locked decisions.
- `/Users/lucindo/Code/hrv/.planning/config.json` — confirms `nyquist_validation: true`.
- `/Users/lucindo/Code/hrv/package.json` — verified devDeps + test commands.
- `/Users/lucindo/Code/hrv/src/app/pages/AppSettingsPage.tsx` — page chrome template.
- `/Users/lucindo/Code/hrv/src/app/pages/LearnPage.tsx` — second page-chrome precedent.
- `/Users/lucindo/Code/hrv/src/app/pages/AppSettingsPage.test.tsx` — existing test patterns (focus-on-mount assertion at line 77-80).
- `/Users/lucindo/Code/hrv/src/app/useAppNavigation.ts` — existing routing state machine (56 lines).
- `/Users/lucindo/Code/hrv/src/app/useAppNavigation.test.tsx` — existing test conventions.
- `/Users/lucindo/Code/hrv/src/app/ScreenRouter.tsx` — existing 3-case switch.
- `/Users/lucindo/Code/hrv/src/app/ScreenRouter.test.tsx` — existing test conventions (note stale `install` fields).
- `/Users/lucindo/Code/hrv/src/app/appViewModel.ts` — `AppDialogsViewModel` shape.
- `/Users/lucindo/Code/hrv/src/app/appControllerAdapters.ts` — `createAppDialogsViewModel` propagation pattern (line 209-223).
- `/Users/lucindo/Code/hrv/src/app/PracticeScreen.tsx` — `vm.featureFlags` consumer (lines 64, 73-75).
- `/Users/lucindo/Code/hrv/src/components/LanguagePicker.tsx` — canonical picker template.
- `/Users/lucindo/Code/hrv/src/components/LanguagePicker.test.tsx` — canonical picker test template.
- `/Users/lucindo/Code/hrv/src/components/ThemePicker.tsx` — second picker precedent (uses `PickerCardGrid`, not `SegmentedControl`).
- `/Users/lucindo/Code/hrv/src/components/CuePicker.tsx` — third picker precedent.
- `/Users/lucindo/Code/hrv/src/components/SettingsPanelBody.tsx` — `SectionCard` inline pattern (lines 36-55); section-header rename consumer at line 139.
- `/Users/lucindo/Code/hrv/src/components/SettingsToggleRow.tsx` — toggle row composition.
- `/Users/lucindo/Code/hrv/src/components/SettingsRow.tsx` — `fieldset` wrapper with `role="group"`.
- `/Users/lucindo/Code/hrv/src/components/SettingsSectionHeader.tsx` — section header chrome.
- `/Users/lucindo/Code/hrv/src/components/primitives/PageShell.tsx` — page wrapper.
- `/Users/lucindo/Code/hrv/src/components/primitives/TopAppBar.tsx` — has existing `trailing` slot.
- `/Users/lucindo/Code/hrv/src/components/primitives/IconButton.tsx` — has existing `buttonRef` prop.
- `/Users/lucindo/Code/hrv/src/components/primitives/SegmentedControl.tsx` — picker primitive.
- `/Users/lucindo/Code/hrv/src/components/primitives/Toggle.tsx` — iOS-style switch primitive.
- `/Users/lucindo/Code/hrv/src/components/icons/ChevronRightIcon.tsx` — exists; usable as-is.
- `/Users/lucindo/Code/hrv/src/components/icons/ChevronBackIcon.tsx` — exists; used by AppSettingsPage.
- `/Users/lucindo/Code/hrv/src/components/icons/index.ts` — barrel export.
- `/Users/lucindo/Code/hrv/src/hooks/useBreathingShapeChoice.ts` — choice hook (verified).
- `/Users/lucindo/Code/hrv/src/hooks/useBreathingShapeChoice.test.ts` — test conventions.
- `/Users/lucindo/Code/hrv/src/hooks/useRingCueChoice.ts` — choice hook.
- `/Users/lucindo/Code/hrv/src/hooks/useOrbIdleChoice.ts` — choice hook.
- `/Users/lucindo/Code/hrv/src/hooks/useSwitcherIconChoice.ts` — choice hook.
- `/Users/lucindo/Code/hrv/src/hooks/useSwitcherIconChoice.test.ts` — test conventions (boolean variant).
- `/Users/lucindo/Code/hrv/src/hooks/useFeatureFlags.ts` — live-update listener with 4-key filter (lines 73-92).
- `/Users/lucindo/Code/hrv/src/hooks/useLocaleChoice.ts` — choice-hook pattern documentation.
- `/Users/lucindo/Code/hrv/src/hooks/useThemeChoice.ts` — original choice-hook precedent.
- `/Users/lucindo/Code/hrv/src/hooks/useUiStringsContext.tsx` — `UiStringsProvider` + `useUiStrings()`.
- `/Users/lucindo/Code/hrv/src/featureFlags.ts` — `BreathingShapeVariant` / `RingCueStyle` / `OrbIdleBehavior` types + per-field 4-way resolver.
- `/Users/lucindo/Code/hrv/src/content/strings.ts` — `UiStrings` interface + `UI_STRINGS` Record + `as const satisfies` type-completeness guard (line 522).
- `/Users/lucindo/Code/hrv/src/content/strings.test.ts` — per-phase describe-block convention.
- `/Users/lucindo/Code/hrv/src/content/lockedCopy.ts` — 3 frozen-EN keys; untouched by Phase 48.
- `/Users/lucindo/Code/hrv/src/content/lockedCopy.test.ts` — byte-equality assertions.
- `/Users/lucindo/Code/hrv/src/content/content.no-review-markers.test.ts` — fs-scan drift-guard that must be adapted per D-18.
- `/Users/lucindo/Code/hrv/src/content/content.no-removed-keys.test.ts` — verified the `appSettings.sections.appearance` key is NOT in the FORBIDDEN_KEYS list; rename is safe.

### Secondary (MEDIUM confidence)
- N/A — no external sources consulted.

### Tertiary (LOW confidence)
- N/A — no LOW-confidence findings.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every primitive verified by direct file read.
- Architecture: HIGH — paste-and-rename of well-established in-repo patterns.
- Pitfalls: HIGH — drift-guard scan, type-completeness guard, focus-sentinel staleness all verified against existing test files.
- i18n contracts: HIGH — `UiStrings` interface, `UI_STRINGS` record, `LOCKED_COPY` byte-equality test, marker-guard fs-scan all read verbatim.
- Live-update propagation: HIGH — verified end-to-end from choice-hook setter → CustomEvent dispatch → `useFeatureFlags` listener → `PracticeScreen` consumer.

**Research date:** 2026-05-26
**Valid until:** 2026-06-25 (30 days; codebase is the only source — no external library churn risk).
