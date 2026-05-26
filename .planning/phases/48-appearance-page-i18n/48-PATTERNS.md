# Phase 48: Appearance page + i18n - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 16 (8 new, 8 modified)
**Analogs found:** 16 / 16 (100% — composition-only phase with strong precedent for every touch)

> **Boring on purpose.** Every new file is a paste-and-rename of an existing analog. Every modified file is an additive extension of an established pattern. This pattern map is concrete (file path + line numbers + verbatim excerpts) so the planner can copy directly into PLAN action sections.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/pages/AppearancePage.tsx` (new) | new page surface | props in (`onBack`); hook bindings (4× choice hooks via children) | `src/app/pages/AppSettingsPage.tsx` | **exact** (page chrome + mount-focus) |
| `src/app/pages/AppearancePage.test.tsx` (new) | integration test | RTL mount + assert | `src/app/pages/AppSettingsPage.test.tsx` | **exact** (same `UiStringsProvider` harness) |
| `src/components/OrbPicker.tsx` (new) | new component (picker) | hook binding (`useBreathingShapeChoice`); props in (`disabled`, `sectionLabel`, `strings`) | `src/components/LanguagePicker.tsx` | **exact** (verbatim mirror per D-10) |
| `src/components/OrbPicker.test.tsx` (new) | per-picker test | RTL + userEvent + localStorage seed | `src/components/LanguagePicker.test.tsx` | **exact** |
| `src/components/RingCuePicker.tsx` (new) | new component (picker) | hook binding (`useRingCueChoice`); same props as Orb | `src/components/LanguagePicker.tsx` | **exact** (verbatim mirror per D-10) |
| `src/components/RingCuePicker.test.tsx` (new) | per-picker test | RTL + userEvent + localStorage seed | `src/components/LanguagePicker.test.tsx` | **exact** |
| `src/app/pages/AppSettingsPage.tsx` (modify) | existing page surface | props in (+2: `onAppearanceOpen`, `returningFromAppearance`); ref out (chevronButtonRef) | itself (additive — `trailing` slot + conditional `useEffect`) | self-extension |
| `src/app/pages/AppSettingsPage.test.tsx` (modify) | integration test | RTL mount + focus assertions | itself + `useAppNavigation.test.tsx` (for sentinel semantics) | self-extension |
| `src/app/useAppNavigation.ts` (modify) | router/view-model hook | hook state (in-memory `AppScreen`) | itself (symmetric paste-and-rename of `onLearnOpen`/`onBackToPractice`) | self-extension |
| `src/app/useAppNavigation.test.tsx` (modify) | hook test | `renderHook` + `act` | itself (mirror existing `appSettings → practice` transition test) | self-extension |
| `src/app/ScreenRouter.tsx` (modify) | router dispatch | discriminated switch | itself (additive 4th case mirrors existing 3) | self-extension |
| `src/app/ScreenRouter.test.tsx` (modify) | router test | RTL + mocked page components | itself (mirror existing per-case test) | self-extension |
| `src/app/appViewModel.ts` (modify) | view-model type | type extension | existing `AppDialogsViewModel` shape | self-extension |
| `src/app/appControllerAdapters.ts` (modify) | adapter | propagate fields from `AppNavigation` to `AppDialogsViewModel` | existing `createAppDialogsViewModel` (lines 209-223) | self-extension |
| `src/components/SettingsPanelBody.tsx` (modify) | existing component | one-line string-reference rename | itself (one consumer of `strings.appSettings.sections.appearance` at line 139) | self-extension |
| `src/content/strings.ts` (modify) | strings catalog | type extension + per-locale extension + key rename | existing `UiStrings.appSettings.sections.*` shape + locale-completeness `satisfies` guard | self-extension |
| `src/content/content.no-review-markers.test.ts` (modify) | drift-guard test (D-18) | fs-scan exclusion | `src/content/content.no-removed-keys.test.ts` (structural-pattern allowlist approach) | role-match |

---

## Pattern Assignments

### `src/app/pages/AppearancePage.tsx` (new — page surface)

**Analog:** `src/app/pages/AppSettingsPage.tsx`

**Imports pattern** (`AppSettingsPage.tsx:1-8`):
```typescript
import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../../components/icons'
import { SettingsPanelBody } from '../../components/SettingsPanelBody'
import { IconButton } from '../../components/primitives/IconButton'
import { PageShell } from '../../components/primitives/PageShell'
import { TopAppBar } from '../../components/primitives/TopAppBar'
import { useUiStrings } from '../../hooks/useUiStringsContext'
```

For `AppearancePage`: drop `SettingsPanelBody`; add `OrbPicker`, `RingCuePicker`, `SettingsToggleRow`, `SettingsSectionHeader`, `useOrbIdleChoice`, `useSwitcherIconChoice`.

**Props + page chrome pattern** (`AppSettingsPage.tsx:10-36`):
```typescript
export interface AppSettingsPageProps {
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onBack(this: void): void
}

export function AppSettingsPage({ ... onBack, }: AppSettingsPageProps): ReactElement {
  const allStrings = useUiStrings()
  const strings = { appSettings: allStrings.appSettings, install: allStrings.install }
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true })
  }, [])
  // ...
}
```

For `AppearancePage`: `Props = { onBack(this: void): void }`. Slice `useUiStrings().appearance` (or use full strings + scope, planner discretion). Mount-focus pattern is **verbatim** — same one-liner `useEffect` (D-13 says back-chevron is the always-focused target on `AppearancePage`; the sentinel only governs `AppSettingsPage`'s mount-focus).

**Page chrome return** (`AppSettingsPage.tsx:38-62`):
```typescript
return (
  <PageShell>
    <TopAppBar
      title={strings.appSettings.title}
      leading={
        <IconButton
          icon={<ChevronBackIcon />}
          label={strings.appSettings.close}
          onClick={onBack}
          buttonRef={backButtonRef}
        />
      }
    />
    <div className="w-full text-left">
      <SettingsPanelBody ... />
    </div>
  </PageShell>
)
```

For `AppearancePage`: title `strings.appearance.title`, back ARIA `strings.appearance.backChevron`. Body is two `SettingsSectionHeader` + `SectionCard` blocks (see Shared Pattern: SectionCard below).

**Body composition** (per `48-UI-SPEC.md` §Layout Contract B):
```typescript
<div className="w-full text-left">
  <SettingsSectionHeader label={strings.appearance.sections.orbStyle} />
  <SectionCard padding="16px">
    <div className="grid gap-4">
      <OrbPicker
        disabled={false}
        sectionLabel={strings.appearance.orb.label}
        sectionLabelHidden={false}
        strings={strings.appearance.orb.options}
      />
      <RingCuePicker
        disabled={false}
        sectionLabel={strings.appearance.ringCue.label}
        sectionLabelHidden={false}
        strings={strings.appearance.ringCue.options}
      />
    </div>
  </SectionCard>

  <SettingsSectionHeader label={strings.appearance.sections.visual} />
  <SectionCard padding="16px">
    <SettingsToggleRow
      label={strings.appearance.breathingEffect.label}
      ariaLabel={strings.appearance.breathingEffect.label}
      checked={orbIdle === 'ambient'}
      onChange={(next) => { setOrbIdle(next ? 'ambient' : 'still') }}
    />
    <SettingsToggleRow
      label={strings.appearance.switcherIcons.label}
      ariaLabel={strings.appearance.switcherIcons.label}
      checked={switcherIcon}
      onChange={setSwitcherIcon}
    />
  </SectionCard>
</div>
```

---

### `src/components/OrbPicker.tsx` (new — picker component)

**Analog:** `src/components/LanguagePicker.tsx` (verbatim mirror per CONTEXT.md D-10)

**Full template** (`LanguagePicker.tsx:1-36`):
```typescript
import { LOCALE_OPTIONS, type LocaleId } from '../domain'
import { useLocaleChoice } from '../hooks/useLocaleChoice'
import { LOCALE_DISPLAY_NAMES } from '../content/strings'
import { SegmentedControl } from './primitives/SegmentedControl'

export interface LanguagePickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
}

export function LanguagePicker({ disabled, sectionLabel, sectionLabelHidden }: LanguagePickerProps) {
  const { locale, setLocale } = useLocaleChoice()
  const options = LOCALE_OPTIONS.map((id) => ({ id, label: LOCALE_DISPLAY_NAMES[id] }))
  return (
    <div>
      <p
        id="language-picker-label"
        className={
          sectionLabelHidden
            ? 'sr-only'
            : 'mb-2 text-sm font-semibold text-[var(--color-breathing-accent-strong)]'
        }
      >
        {sectionLabel}
      </p>
      <SegmentedControl<LocaleId>
        options={options}
        value={locale}
        onChange={setLocale}
        ariaLabel={sectionLabel}
        disabled={disabled}
      />
    </div>
  )
}
```

**For `OrbPicker.tsx`:**
```typescript
import type { BreathingShapeVariant } from '../featureFlags'
import { useBreathingShapeChoice } from '../hooks/useBreathingShapeChoice'
import { SegmentedControl } from './primitives/SegmentedControl'

const ORB_OPTIONS = ['orb-halo', 'minimal-rings', 'spiritual-eye'] as const satisfies readonly BreathingShapeVariant[]

export interface OrbPickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
  strings: { halo: string; minimal: string; kuthasta: string }
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

**Pitfall (RESEARCH §Pitfall 3):** the picker's `onChange` MUST call `setBreathingShape` directly — never an ad-hoc `dispatchEvent`. The Phase 47 hook already dispatches `hrv:prefs-changed` with the correct filtered `detail.key`.

---

### `src/components/RingCuePicker.tsx` (new — picker component)

**Analog:** `src/components/LanguagePicker.tsx` (verbatim mirror per CONTEXT.md D-10)

Same shape as `OrbPicker` with these substitutions:
- Type union: `RingCueStyle` (from `../featureFlags`)
- Hook: `useRingCueChoice` returns `{ ringCue, setRingCue }`
- Options const: `['progress-arc', 'outer-inner'] as const satisfies readonly RingCueStyle[]`
- Strings prop: `{ arc: string; rings: string }`
- Label id: `id="ring-cue-picker-label"`

---

### `src/components/OrbPicker.test.tsx` + `RingCuePicker.test.tsx` (new)

**Analog:** `src/components/LanguagePicker.test.tsx`

**Test harness pattern** (`LanguagePicker.test.tsx:1-30`):
```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LanguagePicker } from './LanguagePicker'
import { STATE_KEY } from '../storage'
import type { LocaleId } from '../domain'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

function seedLocale(locale: LocaleId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'bowl', locale },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
```

For OrbPicker tests: import `DEFAULT_PREFS` from `../storage/prefs` and seed via `{ version: 1, prefs: { ...DEFAULT_PREFS, breathingShape: '...' } }` (the seed-helper convention in `useBreathingShapeChoice.test.ts:8-12` is `seedPrefs(prefs: UserPrefs)`).

**Key assertion patterns** (`LanguagePicker.test.tsx:37-114`):
- Render expected number of radio buttons via `screen.getAllByRole('radio')` + `toHaveLength`.
- `aria-checked` reflects the seeded value: `expect(button).toHaveAttribute('aria-checked', 'true')`.
- Clicking writes to localStorage envelope: parse `STATE_KEY` and assert `prefs.<field>`.
- Clicking dispatches `hrv:prefs-changed` with `detail.key === '<fieldName>'`.
- `disabled=true` → buttons disabled, radiogroup `aria-disabled='true'`, click does NOT write.
- Selected option retains `aria-checked='true'` when disabled.

**For `OrbPicker.test.tsx`:** assert 3 radio buttons (`Halo`, `Minimal`, `Kuthasta`); detail.key `breathingShape`; detail.value e.g. `spiritual-eye`.

**For `RingCuePicker.test.tsx`:** assert 2 radio buttons (`Arc`, `Rings`); detail.key `ringCue`; detail.value e.g. `outer-inner`.

---

### `src/app/pages/AppearancePage.test.tsx` (new — integration test)

**Analog:** `src/app/pages/AppSettingsPage.test.tsx`

**Mount harness** (`AppSettingsPage.test.tsx:10-33`):
```typescript
import { UI_STRINGS } from '../../content/strings'
import { UiStringsProvider } from '../../hooks/useUiStringsContext'
import { AppSettingsPage } from './AppSettingsPage'

function renderPage(props: Partial<...> = {}) {
  const onBack = props.onBack ?? vi.fn()
  // ...
  const utils = render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <AppSettingsPage isIOS={...} onBack={onBack} ... />
    </UiStringsProvider>,
  )
  return { ...utils, onBack, onInstall }
}
```

**Test assertions to mirror for `AppearancePage.test.tsx`** (D-15):
```typescript
// Title
expect(screen.getByRole('heading', { level: 1, name: 'Appearance' })).toBeInTheDocument()

// Back chevron — uses strings.appearance.backChevron, NOT strings.appSettings.close
expect(screen.getByRole('button', { name: UI_STRINGS.en.appearance.backChevron })).toBeInTheDocument()

// onBack invocation
await user.click(screen.getByRole('button', { name: UI_STRINGS.en.appearance.backChevron }))
expect(onBack).toHaveBeenCalledTimes(1)

// Pickers — 2 radiogroups (Orb + Ring cue)
expect(screen.getAllByRole('radiogroup')).toHaveLength(2)

// Toggles — 2 switches (Breathing effect + Switcher icons)
expect(screen.getAllByRole('switch')).toHaveLength(2)

// Mount focus
expect(screen.getByRole('button', { name: UI_STRINGS.en.appearance.backChevron })).toHaveFocus()
```

**Live-update assertion** (APPEAR-05 — covers D-15 contract): seed a prefs envelope, click a picker option, parse `STATE_KEY`, assert the new value persisted. Or addEventListener `hrv:prefs-changed` and assert dispatch with the expected `detail.key`. Both styles already used in `LanguagePicker.test.tsx`.

---

### `src/app/useAppNavigation.ts` (modify — extend union + callbacks + sentinel)

**Analog:** itself (paste-and-rename of `onLearnOpen` / `onBackToPractice`)

**Current full file** (`useAppNavigation.ts:1-56`):
```typescript
import { useCallback, useEffect, useState } from 'react'

export type AppScreen = 'practice' | 'learn' | 'appSettings'

export interface AppNavigation {
  appScreen: AppScreen
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onBackToPractice(this: void): void
}

export interface UseAppNavigationArgs {
  controlsDisabled: boolean
  closeOnSessionView: boolean
}

export function useAppNavigation({ controlsDisabled, closeOnSessionView }: UseAppNavigationArgs): AppNavigation {
  const [appScreen, setAppScreen] = useState<AppScreen>('practice')

  useEffect(() => {
    if (!closeOnSessionView) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppScreen('practice')
  }, [closeOnSessionView])

  const onLearnOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('learn')
  }, [controlsDisabled])

  const onSettingsOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('appSettings')
  }, [controlsDisabled])

  const onBackToPractice = useCallback((): void => {
    setAppScreen('practice')
  }, [])

  return { appScreen, onLearnOpen, onSettingsOpen, onBackToPractice }
}
```

**Extension shape** (D-12 + D-13 — reference implementation from RESEARCH.md Pattern 5):
- `AppScreen` += `'appearance'`.
- Add `returningFromAppearance: boolean` state + same `closeOnSessionView` effect clears it.
- Add `onAppearanceOpen` callback (mirrors `onSettingsOpen` shape: `controlsDisabled` early-return, sets `'appearance'`, clears sentinel).
- Add `onBackToAppSettings` callback: sets `'appSettings'` AND sets sentinel `true`.
- Clear sentinel inside every other transition (`onLearnOpen`, `onSettingsOpen`, `onAppearanceOpen`, `onBackToPractice`) per RESEARCH §Pitfall 4.

**Pitfall (RESEARCH §Pitfall 4 — focus sentinel "stickiness"):** the sentinel MUST be cleared in every non-`onBackToAppSettings` transition; if only the `useEffect` consumer clears it, the user can re-enter Settings via a non-back path and still get chevron focus.

---

### `src/app/useAppNavigation.test.tsx` (modify — add 3 new transition tests)

**Analog:** itself (lines 38-86 for the existing `appSettings ↔ practice` and `closeOnSessionView` pattern)

**Existing pattern** (`useAppNavigation.test.tsx:38-53`):
```typescript
it('navigates to appSettings and back to practice', () => {
  const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })

  act(() => { result.current.onSettingsOpen() })
  expect(result.current.appScreen).toBe('appSettings')

  act(() => { result.current.onBackToPractice() })
  expect(result.current.appScreen).toBe('practice')
})
```

**For Phase 48 (D-16)** — three new assertions to add verbatim:

1. `onAppearanceOpen` transitions `'appSettings' → 'appearance'`:
```typescript
it('navigates from appSettings to appearance via onAppearanceOpen', () => {
  const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })
  act(() => { result.current.onSettingsOpen() })
  act(() => { result.current.onAppearanceOpen() })
  expect(result.current.appScreen).toBe('appearance')
})
```

2. `onBackToAppSettings` transitions `'appearance' → 'appSettings'` AND sets sentinel:
```typescript
it('onBackToAppSettings returns to appSettings with returningFromAppearance=true', () => {
  const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })
  act(() => { result.current.onSettingsOpen() })
  act(() => { result.current.onAppearanceOpen() })
  act(() => { result.current.onBackToAppSettings() })
  expect(result.current.appScreen).toBe('appSettings')
  expect(result.current.returningFromAppearance).toBe(true)
})
```

3. Subsequent navigation clears sentinel + `closeOnSessionView` resets `'appearance' → 'practice'`:
```typescript
it('subsequent navigation clears returningFromAppearance', () => {
  // ... onBackToAppSettings sets it true, then onBackToPractice clears it
  expect(result.current.returningFromAppearance).toBe(false)
})

it('closeOnSessionView forces appearance → practice and clears sentinel', () => {
  // rerender({ closeOnSessionView: true }) from initial 'appearance' state
  expect(result.current.appScreen).toBe('practice')
})
```

---

### `src/app/ScreenRouter.tsx` (modify — 4th case)

**Analog:** itself (`ScreenRouter.tsx:19-42`)

**Current switch** (`ScreenRouter.tsx:18-42`):
```typescript
export function ScreenRouter({ vm }: ScreenRouterProps): ReactElement {
  switch (vm.dialogs.appScreen) {
    case 'learn':
      return (
        <LearnPage
          learnContent={vm.learnContent}
          lockedCopy={vm.lockedCopy}
          activePractice={vm.activePractice}
          onBack={vm.dialogs.onBackToPractice}
        />
      )
    case 'appSettings':
      return (
        <AppSettingsPage
          isIOS={vm.install.isIOS}
          isStandalone={vm.install.isStandalone}
          installable={vm.install.installable}
          onInstall={vm.install.onInstall}
          onBack={vm.dialogs.onBackToPractice}
        />
      )
    case 'practice':
    default:
      return <PracticeScreen vm={vm} />
  }
}
```

**Add 4th case** (D-12):
```typescript
case 'appearance':
  return <AppearancePage onBack={vm.dialogs.onBackToAppSettings} />
```

**AND** extend `AppSettingsPage` invocation in `case 'appSettings'` to pass the two new props:
```typescript
<AppSettingsPage
  isIOS={vm.install.isIOS}
  isStandalone={vm.install.isStandalone}
  installable={vm.install.installable}
  onInstall={vm.install.onInstall}
  onBack={vm.dialogs.onBackToPractice}
  onAppearanceOpen={vm.dialogs.onAppearanceOpen}             // NEW
  returningFromAppearance={vm.dialogs.returningFromAppearance} // NEW
/>
```

Import: `import { AppearancePage } from './pages/AppearancePage'`.

---

### `src/app/ScreenRouter.test.tsx` (modify — 4th case + Pitfall 5 cleanup)

**Analog:** itself (`ScreenRouter.test.tsx:40-61`)

**Existing per-case pattern** (`ScreenRouter.test.tsx:55-60`):
```typescript
it('renders AppSettingsPage when appScreen=appSettings', () => {
  render(<ScreenRouter vm={makeVmForScreen('appSettings')} />)
  expect(screen.getByTestId('app-settings-page')).toBeInTheDocument()
  expect(screen.queryByTestId('practice-screen')).not.toBeInTheDocument()
  expect(screen.queryByTestId('learn-page')).not.toBeInTheDocument()
})
```

**Add for Phase 48:**
```typescript
vi.mock('./pages/AppearancePage', () => ({
  AppearancePage: () => <div data-testid="appearance-page" />,
}))

it('renders AppearancePage when appScreen=appearance', () => {
  render(<ScreenRouter vm={makeVmForScreen('appearance')} />)
  expect(screen.getByTestId('appearance-page')).toBeInTheDocument()
  // assert other testids absent
})
```

**Also fix the stale fake (RESEARCH §Pitfall 5)** — `ScreenRouter.test.tsx:31-32` currently has:
```typescript
install: { ..., showBanner: false, onInstall: ..., onDismiss: () => {} },
```
`showBanner` and `onDismiss` were removed in J18.4 (verified in `content.no-removed-keys.test.ts:73`). Remove them from the fake when extending — the cast through `as unknown as AppViewModel` masks the drift today.

**Also extend `makeVmForScreen`** to include the three new `dialogs` fields:
```typescript
dialogs: {
  appScreen,
  endSessionDialogs: [],
  onLearnOpen: () => {},
  onSettingsOpen: () => {},
  onAppearanceOpen: () => {},          // NEW
  onBackToPractice: () => {},
  onBackToAppSettings: () => {},        // NEW
  returningFromAppearance: false,       // NEW
},
```

---

### `src/app/appViewModel.ts` (modify — extend `AppDialogsViewModel`)

**Analog:** itself (`appViewModel.ts:46-52`)

**Current shape** (`appViewModel.ts:46-52`):
```typescript
export interface AppDialogsViewModel {
  appScreen: AppScreen
  endSessionDialogs: readonly AppEndSessionDialogViewModel[]
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onBackToPractice(this: void): void
}
```

**Extend with 3 new fields** (D-12, D-13):
```typescript
export interface AppDialogsViewModel {
  appScreen: AppScreen
  endSessionDialogs: readonly AppEndSessionDialogViewModel[]
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onAppearanceOpen(this: void): void           // NEW
  onBackToPractice(this: void): void
  onBackToAppSettings(this: void): void         // NEW
  returningFromAppearance: boolean              // NEW
}
```

---

### `src/app/appControllerAdapters.ts` (modify — propagate via `createAppDialogsViewModel`)

**Analog:** itself (`appControllerAdapters.ts:209-223`)

**Current adapter** (`appControllerAdapters.ts:209-223`):
```typescript
export function createAppDialogsViewModel({
  navigation,
  endSessionDialogs,
}: {
  navigation: AppNavigation
  endSessionDialogs: readonly AppEndSessionDialogViewModel[]
}): AppDialogsViewModel {
  return {
    appScreen: navigation.appScreen,
    endSessionDialogs,
    onLearnOpen: navigation.onLearnOpen,
    onSettingsOpen: navigation.onSettingsOpen,
    onBackToPractice: navigation.onBackToPractice,
  }
}
```

**Extend return object** verbatim:
```typescript
return {
  appScreen: navigation.appScreen,
  endSessionDialogs,
  onLearnOpen: navigation.onLearnOpen,
  onSettingsOpen: navigation.onSettingsOpen,
  onAppearanceOpen: navigation.onAppearanceOpen,             // NEW
  onBackToPractice: navigation.onBackToPractice,
  onBackToAppSettings: navigation.onBackToAppSettings,       // NEW
  returningFromAppearance: navigation.returningFromAppearance, // NEW
}
```

(All three new fields already exist on the extended `AppNavigation` from the `useAppNavigation.ts` change.)

---

### `src/app/pages/AppSettingsPage.tsx` (modify — trailing slot + conditional focus)

**Analog:** itself + the `TopAppBar.trailing` slot (`TopAppBar.tsx:23-28`)

**Current mount-focus** (`AppSettingsPage.tsx:32-36`):
```typescript
const backButtonRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  backButtonRef.current?.focus({ preventScroll: true })
}, [])
```

**Extension** (D-13 — reference impl in RESEARCH.md Pattern 4):
```typescript
export interface AppSettingsPageProps {
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onBack(this: void): void
  onAppearanceOpen(this: void): void          // NEW
  returningFromAppearance: boolean            // NEW
}

// ...
const backButtonRef = useRef<HTMLButtonElement>(null)
const chevronButtonRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  if (returningFromAppearance) {
    chevronButtonRef.current?.focus({ preventScroll: true })
  } else {
    backButtonRef.current?.focus({ preventScroll: true })
  }
}, [returningFromAppearance])
```

**TopAppBar trailing slot** (`TopAppBar.tsx:17-29` — `trailing` already accepted, with empty-slot placeholder for title centering):
```typescript
// Add inside the existing <TopAppBar> in AppSettingsPage.tsx:
trailing={
  <IconButton
    icon={<ChevronRightIcon />}
    label={strings.appearance.rightChevronAriaOnSettings}
    onClick={onAppearanceOpen}
    buttonRef={chevronButtonRef}
  />
}
```

Imports to add: `ChevronRightIcon` from `'../../components/icons'`. Strings slice expands to include `appearance`: `const strings = { appSettings: allStrings.appSettings, install: allStrings.install, appearance: allStrings.appearance }`.

---

### `src/app/pages/AppSettingsPage.test.tsx` (modify — focus-restoration assertions D-17)

**Analog:** itself (`AppSettingsPage.test.tsx:77-80`)

**Existing focus test** (`AppSettingsPage.test.tsx:77-80`):
```typescript
it('focuses the back button on mount', () => {
  renderPage()
  expect(screen.getByRole('button', { name: UI_STRINGS.en.appSettings.close })).toHaveFocus()
})
```

**Extend (D-17):**

```typescript
it('focuses the back button on mount when returningFromAppearance=false', () => {
  renderPage({ returningFromAppearance: false })
  expect(screen.getByRole('button', { name: UI_STRINGS.en.appSettings.close })).toHaveFocus()
})

it('focuses the right-chevron on mount when returningFromAppearance=true', () => {
  renderPage({ returningFromAppearance: true })
  expect(
    screen.getByRole('button', { name: UI_STRINGS.en.appearance.rightChevronAriaOnSettings }),
  ).toHaveFocus()
})
```

`renderPage` harness extends with `onAppearanceOpen` (`vi.fn()`) and `returningFromAppearance` (default `false`) props.

---

### `src/components/SettingsPanelBody.tsx` (modify — single-string rename)

**Analog:** itself (line 139 — single consumer of `strings.appSettings.sections.appearance`)

**Change exactly one line** (`SettingsPanelBody.tsx:139`):
```typescript
// before
<SettingsSectionHeader label={strings.appSettings.sections.appearance} />
// after
<SettingsSectionHeader label={strings.appSettings.sections.theme} />
```

**Pitfall (RESEARCH §Pitfall 6):** if `SettingsPanelBody.test.tsx` (if it exists) asserts on the text `'Appearance'`, update to `'Theme'`. Per current scan there is no `SettingsPanelBody.test.tsx`. `AppSettingsPage.test.tsx:53-57` queries pickers via `getAllByRole('radiogroup')` — not by section header text — so it does not break on the rename.

**Pitfall (memory `[[feedback_use_lsp_for_renames]]`):** do NOT use sed/perl/regex for the rename. There are exactly two consumer sites: (1) `SettingsPanelBody.tsx:139` and (2) the catalog interface + entries in `strings.ts`. Edit manually.

---

### `src/content/strings.ts` (modify — extend `UiStrings` + 2 locale entries + rename)

**Analog:** itself — existing `UiStrings.appSettings.sections.*` shape (lines 141-146) and the per-locale entries (EN: 309-314, PT-BR: 475-480)

**Current `UiStrings.appSettings.sections`** (`strings.ts:141-146`):
```typescript
readonly sections: {
  readonly appearance: string
  readonly language: string
  readonly audio: string
  readonly about: string
}
```

**Rename to** (D-01):
```typescript
readonly sections: {
  readonly theme: string         // RENAMED from 'appearance'
  readonly language: string
  readonly audio: string
  readonly about: string
}
```

**Add new `appearance` top-level namespace** (suggested shape per CONTEXT.md Claude's Discretion + UI-SPEC §Suggested):
```typescript
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

**EN catalog entries** (after line 313 — `appearance: 'Appearance' → 'Theme'`; add `appearance: { ... }` top-level after `appSettings`):

Existing EN section (`strings.ts:309-314`):
```typescript
sections: {
  appearance: 'Appearance',
  language: 'Language',
  audio: 'Feedback',
  about: 'About',
},
```

Becomes:
```typescript
sections: {
  theme: 'Theme',                                          // RENAMED — D-01
  language: 'Language',
  audio: 'Feedback',
  about: 'About',
},
```

Plus add new top-level after `appSettings`:
```typescript
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
```

**PT-BR catalog entries** (with `// TODO: native-speaker review` markers per D-09 + D-18 — markers inline next to each string):

Existing PT-BR section (`strings.ts:475-480`):
```typescript
sections: {
  appearance: 'Aparência',
  language: 'Idioma',
  audio: 'Feedback',
  about: 'Sobre',
},
```

Becomes:
```typescript
sections: {
  // TODO: native-speaker review
  theme: 'Tema',                                            // RENAMED
  language: 'Idioma',
  audio: 'Feedback',
  about: 'Sobre',
},
```

Plus add new top-level after `appSettings`:
```typescript
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
  orb: {
    // TODO: native-speaker review
    label: 'Orbe',
    options: {
      // TODO: native-speaker review
      halo: 'Halo',
      // TODO: native-speaker review
      minimal: 'Mínimo',
      // TODO: native-speaker review
      kuthasta: 'Kuthasta',
    },
  },
  ringCue: {
    // TODO: native-speaker review
    label: 'Sinal do anel',
    options: {
      // TODO: native-speaker review
      arc: 'Arco',
      // TODO: native-speaker review
      rings: 'Anéis',
    },
  },
  breathingEffect: {
    // TODO: native-speaker review
    label: 'Efeito de respiração',
  },
  switcherIcons: {
    // TODO: native-speaker review
    label: 'Ícones do alternador',
  },
},
```

**Type-completeness guard** (`strings.ts:522`): `as const satisfies Readonly<Record<LocaleId, UiStrings>>` — surfaces missing keys per locale at compile time. RESEARCH §Pitfall 2: extend interface AND both locale entries in one atomic edit; do NOT split into "EN first, PT-BR later" tasks.

**Pitfall (RESEARCH §Renaming sed):** there is exactly one production consumer of the renamed key (`SettingsPanelBody.tsx:139`); rename manually, not via sed.

---

### `src/content/content.no-review-markers.test.ts` (modify — adapt per D-18)

**Analog:** `src/content/content.no-removed-keys.test.ts` (structural-pattern allowlist precedent at lines 59-79) — **preferred path (a) per D-18**.

**Current guard** (`content.no-review-markers.test.ts:38-46`):
```typescript
describe('src/content marker-guard (Phase 26 D-12 / I18N-07)', () => {
  it('no "// TODO: native-speaker review" marker remains in src/content/', () => {
    const hits: string[] = []
    for (const file of CONTENT_FILES) {
      const text = readFileSync(file, 'utf-8')
      if (text.includes(REVIEW_MARKER)) hits.push(file)
    }
    expect(hits, `Unresolved native-speaker review markers in:\n${hits.join('\n')}`).toEqual([])
  })
})
```

**Allowlist-pattern analog from `content.no-removed-keys.test.ts:59-107`** — a `FORBIDDEN_KEYS` array of `{ label, pattern: RegExp }` rows scanned per file. For markers: invert — an `ALLOWLISTED_REGIONS` list that scopes the marker check to NOT trip on `appearance.*` keys in `strings.ts`.

**Three D-18 paths — planner picks one:**

(a) **Path-allowlist (preferred — mirrors `content.no-removed-keys`):** scope the scan to either ignore lines that appear inside the `appearance: { ... }` block in `strings.ts`, OR change the check to a per-line scan that excludes lines preceded by the `appearance` namespace context.

(b) **Namespace allowlist:** check that any `// TODO: native-speaker review` marker appears within ~5 lines above an `appearance.` key path; treat non-`appearance` markers as the failure mode.

(c) **Advisory flip:** convert the strict `it` to `it.skip` with a TODO referencing I18N-04 as the close-out gate. Lowest-cost; weakest guard.

**Hard constraint** (CONTEXT.md D-18): **`LOCKED_COPY` byte-equality guard stays intact** — Phase 48 copy lives outside `LOCKED_COPY`. Do not touch `src/content/lockedCopy.ts` or `lockedCopy.test.ts`.

---

## Shared Patterns

### Shared Pattern A — `SectionCard` chrome

**Source:** `src/components/SettingsPanelBody.tsx:36-55` (inline helper, not exported)

```typescript
function SectionCard({ padding, children }: { padding: string; children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        background: 'var(--color-breathing-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 20,
        padding,
      }}
    >
      {children}
    </div>
  )
}
```

**Apply to:** `AppearancePage.tsx` for both the "Orb Style" and "Visual" cards (CONTEXT.md Claude's Discretion bullet). The helper is **not exported** from `SettingsPanelBody.tsx`; planner picks between:
- Duplicate the 14-line helper at the top of `AppearancePage.tsx` (CONTEXT.md tolerates two-line duplication).
- Extract a shared module (e.g. `src/components/SectionCard.tsx`) and import in both files. **If extracting, also update `SettingsPanelBody.tsx` to import it** — do not leave the duplication.

Padding: `"16px"` for both cards (matches `SettingsPanelBody.tsx:140`, `:151`, `:161`).

### Shared Pattern B — Phase 47 choice-hook contract

**Source:** `src/hooks/useBreathingShapeChoice.ts:1-21` (and the three siblings)

```typescript
export function useBreathingShapeChoice(): { breathingShape: BreathingShapeVariant; setBreathingShape: (next: BreathingShapeVariant) => void } {
  const [breathingShape, setBreathingShapeState] = useState<BreathingShapeVariant>(() => loadPrefs().breathingShape)

  const setBreathingShape = useCallback((next: BreathingShapeVariant): void => {
    const current = loadPrefs()
    savePrefs({ ...current, breathingShape: next })
    setBreathingShapeState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'breathingShape', value: next } }),
    )
  }, [])

  return { breathingShape, setBreathingShape }
}
```

**Apply to:** all four new bindings — `OrbPicker` uses `useBreathingShapeChoice`, `RingCuePicker` uses `useRingCueChoice`, `AppearancePage` inline uses `useOrbIdleChoice` + `useSwitcherIconChoice`. The picker `onChange` / toggle `onChange` MUST pass through the hook setter directly — no ad-hoc `dispatchEvent` (RESEARCH §Pitfall 3).

### Shared Pattern C — `Pick<UiStrings, '...'>` strings prop slice

**Source:** `src/components/SettingsPanelBody.tsx:26`

```typescript
strings: Pick<UiStrings, 'appSettings' | 'install'>
```

**Apply to:** the picker components and pages that take a strings prop. For `AppearancePage`, the parent calls `useUiStrings()` and reads `.appearance` directly (the page is the single consumer of that namespace). For `OrbPicker` / `RingCuePicker`, pass only the small `options` slice (`strings: { halo, minimal, kuthasta }`) per the existing `ThemePicker` / `CuePicker` / `TimbrePicker` convention — see `SettingsPanelBody.tsx:142-143` where `ThemePicker` receives `strings={strings.appSettings.themes}`.

### Shared Pattern D — Mount-focus via `useRef<HTMLButtonElement>` + `useEffect`

**Source:** `src/app/pages/AppSettingsPage.tsx:32-36` and `src/app/pages/LearnPage.tsx:30-34` (identical)

```typescript
const backButtonRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  backButtonRef.current?.focus({ preventScroll: true })
}, [])
```

**Apply to:**
- `AppearancePage.tsx` — verbatim (always focuses back chevron on mount; the sentinel governs `AppSettingsPage`, not `AppearancePage`).
- `AppSettingsPage.tsx` — extended with conditional branch on `returningFromAppearance` per D-13.

`IconButton` accepts the ref via its `buttonRef` prop (`IconButton.tsx:18`, `:38`). The pattern is plumbed end-to-end.

### Shared Pattern E — Vitest + RTL + jsdom test harness

**Source:** `src/components/LanguagePicker.test.tsx:1-30` (per-component) and `src/app/pages/AppSettingsPage.test.tsx:1-33` (per-page)

Per-component (no provider needed when component reads its own choice hook and seed envelope):
```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { window.localStorage.clear() })
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })
```

Per-page (needs `UiStringsProvider` to feed the `useUiStrings()` hook):
```typescript
import { UI_STRINGS } from '../../content/strings'
import { UiStringsProvider } from '../../hooks/useUiStringsContext'

render(
  <UiStringsProvider value={UI_STRINGS.en}>
    <AppearancePage onBack={onBack} />
  </UiStringsProvider>,
)
```

**Apply to:**
- `OrbPicker.test.tsx`, `RingCuePicker.test.tsx` — per-component harness.
- `AppearancePage.test.tsx` — per-page harness with `UiStringsProvider`.

### Shared Pattern F — `useUiStrings()` hook + slice

**Source:** `src/app/pages/AppSettingsPage.tsx:30-31` and `src/app/pages/LearnPage.tsx:29`

```typescript
// AppSettingsPage style — slice the whole catalog
const allStrings = useUiStrings()
const strings = { appSettings: allStrings.appSettings, install: allStrings.install }
```
or
```typescript
// LearnPage style — slice once
const strings = useUiStrings().learn
```

**Apply to:** `AppearancePage.tsx` — single subscription point; `LearnPage` style is cleaner for one-namespace pages:
```typescript
const strings = useUiStrings().appearance
```

`AppSettingsPage.tsx` will need to switch to multi-key form since it adds `appearance.rightChevronAriaOnSettings` for the right chevron:
```typescript
const allStrings = useUiStrings()
const strings = { appSettings: allStrings.appSettings, install: allStrings.install, appearance: allStrings.appearance }
```

---

## No Analog Found

None. **All 16 files have a strong (exact or self-extension) analog.** This phase is composition-only, by design.

---

## Metadata

**Analog search scope:**
- `src/app/pages/` (4 files)
- `src/app/` (router + view-model + adapters + nav hook)
- `src/components/` (pickers, settings primitives, section header, panel body)
- `src/components/primitives/` (PageShell, TopAppBar, IconButton, SegmentedControl, Toggle)
- `src/components/icons/` (ChevronRightIcon, ChevronBackIcon)
- `src/hooks/` (4 Phase 47 choice hooks + tests)
- `src/content/` (strings, drift-guards, locked-copy guard)

**Files scanned (Read):** 23 in-tree files (no re-reads; each large file scoped to relevant ranges via offset/limit or read whole when ≤ 70 lines).

**Pattern extraction date:** 2026-05-26
