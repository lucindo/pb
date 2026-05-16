# Phase 29: Settings Install Entry & Localization - Pattern Map

**Mapped:** 2026-05-16
**Files analyzed:** 6 (2 new, 4 modified)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/IosInstallSteps.tsx` | component | request-response | `src/components/InstallBanner.tsx` | exact (extraction target) |
| `src/components/IosInstallSteps.test.tsx` | test | request-response | `src/components/InstallBanner.test.tsx` | exact |
| `src/components/InstallBanner.tsx` (edit) | component | request-response | itself (refactor: delegate to IosInstallSteps) | self |
| `src/components/SettingsDialog.tsx` (edit) | component | request-response | `src/components/LanguagePicker.tsx` (section label rhythm) | role-match |
| `src/components/SettingsDialog.test.tsx` (edit) | test | request-response | `src/components/InstallBanner.test.tsx` | role-match |
| `src/content/strings.ts` (edit) | config / i18n catalog | transform | itself (prior install block + `as const satisfies` pattern) | self |

---

## Pattern Assignments

### `src/components/IosInstallSteps.tsx` (component, new)

**Analog:** `src/components/InstallBanner.tsx` — the iOS steps block at lines 74-89 is the extraction target; `IOsShareIcon` at lines 96-117 moves alongside it.

**Imports pattern** — copy from `InstallBanner.tsx` lines 7-8:
```typescript
import type { UiStrings } from '../content/strings'
```
No `useState` needed in the shared component itself — the `iosExpanded` toggle lives in each consumer.

**Props interface** — derived from CONTEXT.md D-06 and RESEARCH.md Pattern 2:
```typescript
export interface IosInstallStepsProps {
  id: string                                      // unique per surface (Pitfall 3 mitigation)
  strings: UiStrings['install']
}
```

**Core render pattern** — extracted verbatim from `InstallBanner.tsx` lines 74-89:
```typescript
export function IosInstallSteps({ id, strings }: IosInstallStepsProps) {
  return (
    <div id={id} aria-live="polite" className="pt-4 text-sm leading-6">
      <ol className="list-decimal pl-5">
        <li className="text-[var(--color-breathing-accent-strong)]">
          {strings.iosStep1}
          {' '}
          <IOsShareIcon />
        </li>
        <li>{strings.iosStep2}</li>
        <li>{strings.iosStep3}</li>
      </ol>
    </div>
  )
}
```

**IOsShareIcon helper** — move verbatim from `InstallBanner.tsx` lines 96-117:
```typescript
// iOS Share glyph — inline SVG per project convention (MuteToggle.tsx, LearnAnchor.tsx)
function IOsShareIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle' }}
    >
      <line x1="12" y1="17" x2="12" y2="3" />
      <polyline points="6 9 12 3 18 9" />
      <path d="M9 17H5a2 2 0 0 0-2 2v2h18v-2a2 2 0 0 0-2-2h-4" />
    </svg>
  )
}
```

**No error handling needed** — pure presentational component.

---

### `src/components/IosInstallSteps.test.tsx` (test, new)

**Analog:** `src/components/InstallBanner.test.tsx` — same test structure and render-helper pattern.

**File header + imports pattern** — copy from `InstallBanner.test.tsx` lines 1-10:
```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IosInstallSteps } from './IosInstallSteps'
import { UI_STRINGS } from '../content/strings'
```

**Render helper pattern** — copy from `InstallBanner.test.tsx` lines 12-24 (adapted):
```typescript
function renderSteps(id = 'test-ios-steps') {
  return render(
    <IosInstallSteps id={id} strings={UI_STRINGS.en.install} />,
  )
}
```

**Test body pattern** — copy assertion style from `InstallBanner.test.tsx` lines 45-58:
```typescript
describe('IosInstallSteps', () => {
  it('renders all three step texts', () => {
    renderSteps()
    expect(screen.getByText(UI_STRINGS.en.install.iosStep1)).toBeInTheDocument()
    expect(screen.getByText(UI_STRINGS.en.install.iosStep2)).toBeInTheDocument()
    expect(screen.getByText(UI_STRINGS.en.install.iosStep3)).toBeInTheDocument()
  })

  it('the container div uses the provided id prop', () => {
    const { container } = renderSteps('settings-ios-steps')
    const div = container.querySelector('#settings-ios-steps')
    expect(div).not.toBeNull()
  })

  it('contains the iOS Share SVG (aria-hidden)', () => {
    const { container } = renderSteps()
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).not.toBeNull()
  })
})
```

---

### `src/components/InstallBanner.tsx` (edit — refactor to use IosInstallSteps)

**Analog:** itself; the edit is minimal. Replace the inline iOS steps block + IOsShareIcon with the shared component.

**Import addition** — add after line 8:
```typescript
import { IosInstallSteps } from './IosInstallSteps'
```

**Core pattern change** — replace lines 74-89 (the inline `{isIOS && iosExpanded && (...)}` block) with:
```typescript
{isIOS && iosExpanded && (
  <IosInstallSteps id="install-ios-steps" strings={strings} />
)}
```

**Remove** the `IOsShareIcon` function (lines 96-117) — it now lives in `IosInstallSteps.tsx`.

The existing `aria-controls="install-ios-steps"` on the iOS toggle button (line 49) stays unchanged — ID matches the prop passed above.

---

### `src/components/SettingsDialog.tsx` (edit — add install row + extend props)

**Analog (props interface):** `src/components/InstallBanner.tsx` lines 10-15 — same pattern of typed prop interface above the component function.

**Analog (section label rhythm):** `src/components/LanguagePicker.tsx` lines 33-35 — `<p>` section label + action below.

**Analog (inSessionView disabled threading):** `src/components/SettingsDialog.tsx` lines 92-96 — existing `disabled={inSessionView}` threading to all pickers.

**Props interface extension** — replace lines 29-34:
```typescript
export interface SettingsDialogProps {
  open: boolean
  onClose(this: void): void
  inSessionView: boolean
  strings: Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'cue' | 'timbres' | 'install'>
  // Phase 29 additions (D-01 through D-09):
  isIOS: boolean
  isStandalone: boolean
  installable: boolean          // = isIOS || deferredPrompt !== null, pre-computed in App.tsx
  onInstall(this: void): Promise<void>
}
```

**useState import** — add `useState` to the existing React import at line 1:
```typescript
import { useEffect, useRef, useState, type MouseEventHandler } from 'react'
```

**IosInstallSteps import** — add below the component imports:
```typescript
import { IosInstallSteps } from './IosInstallSteps'
```

**Local iosExpanded state** — add at the top of the component body (after dialogRef):
```typescript
const [iosExpanded, setIosExpanded] = useState<boolean>(false)
```

**Install row** — add between LanguagePicker and the Close button div (after line 96), matching `LanguagePicker.tsx` lines 33-35 for the section-label rhythm:
```typescript
{/* D-01/D-02: install row — last block before Close, below Language picker.
    D-04/D-08: shown only when installable AND not already standalone. */}
{installable && !isStandalone && (
  <div>
    <p className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">
      {strings.install.settingsLabel}
    </p>
    <div className="mt-2">
      {isIOS ? (
        <>
          <button
            type="button"
            aria-expanded={iosExpanded}
            aria-controls="settings-ios-steps"
            disabled={inSessionView}
            onClick={() => { setIosExpanded(prev => !prev) }}
            className="min-h-[44px] text-sm font-semibold text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {strings.install.iosStepsButton}
          </button>
          {iosExpanded && <IosInstallSteps id="settings-ios-steps" strings={strings.install} />}
        </>
      ) : (
        <button
          type="button"
          disabled={inSessionView}
          onClick={() => { void onInstall() }}
          className="min-h-[44px] text-sm font-semibold text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {strings.install.installButton}
        </button>
      )}
    </div>
  </div>
)}
```

**Key styling notes from analogs:**
- Button base classes from `InstallBanner.tsx` lines 51 and 57-59: `min-h-[44px] text-sm font-semibold text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2`
- Disabled classes from `LanguagePicker.tsx` line 46: `disabled:cursor-not-allowed disabled:opacity-45`
- Section label classes from `LanguagePicker.tsx` line 34: `text-sm font-semibold text-[var(--color-breathing-accent-strong)]`

---

### `src/components/SettingsDialog.test.tsx` (edit — add install-row tests)

**Analog:** existing file's own `renderDialog` helper + `InstallBanner.test.tsx` for install-specific assertions.

**Render helper extension** — replace the existing `renderDialog` function (lines 18-31) to accept and pass new props:
```typescript
function renderDialog(
  props: Partial<{
    open: boolean
    onClose: () => void
    inSessionView: boolean
    isIOS: boolean
    isStandalone: boolean
    installable: boolean
    onInstall: () => Promise<void>
  }> = {},
) {
  const onClose = props.onClose ?? vi.fn()
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  const utils = render(
    <SettingsDialog
      open={props.open ?? false}
      onClose={onClose}
      inSessionView={props.inSessionView ?? false}
      strings={EN_STRINGS_FIXTURE}
      isIOS={props.isIOS ?? false}
      isStandalone={props.isStandalone ?? false}
      installable={props.installable ?? false}
      onInstall={onInstall}
    />,
  )
  return { ...utils, onClose, onInstall }
}
```

**New describe block** — add after existing tests, following `InstallBanner.test.tsx` assertion style:
```typescript
describe('SettingsDialog — install row (Phase 29 INSTALL-06)', () => {
  it('install row absent when installable=false', () => {
    renderDialog({ open: true, installable: false })
    expect(screen.queryByText(EN_STRINGS_FIXTURE.install.settingsLabel)).not.toBeInTheDocument()
  })

  it('install row absent when isStandalone=true even if installable=true', () => {
    renderDialog({ open: true, installable: true, isStandalone: true })
    expect(screen.queryByText(EN_STRINGS_FIXTURE.install.settingsLabel)).not.toBeInTheDocument()
  })

  it('install row visible when installable=true and isStandalone=false', () => {
    renderDialog({ open: true, installable: true, isStandalone: false })
    expect(screen.getByText(EN_STRINGS_FIXTURE.install.settingsLabel)).toBeInTheDocument()
  })

  it('Android path: install button rendered and clicking calls onInstall', async () => {
    const user = userEvent.setup()
    const { onInstall } = renderDialog({ open: true, installable: true, isIOS: false })
    const btn = screen.getByRole('button', { name: EN_STRINGS_FIXTURE.install.installButton })
    await user.click(btn)
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('iOS path: steps-toggle button rendered, no native install button', () => {
    renderDialog({ open: true, installable: true, isIOS: true })
    expect(screen.getByRole('button', { name: EN_STRINGS_FIXTURE.install.iosStepsButton })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN_STRINGS_FIXTURE.install.installButton })).not.toBeInTheDocument()
  })

  it('iOS path: steps expand inline after clicking the toggle', async () => {
    const user = userEvent.setup()
    renderDialog({ open: true, installable: true, isIOS: true })
    expect(screen.queryByText(EN_STRINGS_FIXTURE.install.iosStep1)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: EN_STRINGS_FIXTURE.install.iosStepsButton }))
    expect(screen.getByText(EN_STRINGS_FIXTURE.install.iosStep1)).toBeInTheDocument()
  })
})
```

---

### `src/content/strings.ts` (edit — extend UiStrings.install + finalize PT-BR)

**Analog:** itself — the existing `install` block at lines 133-142 (interface) and lines 270-279 (EN values) and lines 407-416 (PT-BR values).

**Interface extension** — replace lines 133-142 with (add one key, Pitfall 4: add to interface AND both locales simultaneously):
```typescript
readonly install: {
  readonly regionLabel: string
  readonly bannerText: string
  readonly installButton: string
  readonly iosStepsButton: string
  readonly dismiss: string
  readonly iosStep1: string
  readonly iosStep2: string
  readonly iosStep3: string
  readonly settingsLabel: string    // Phase 29 D-03: "Install for offline use" style
}
```

**EN values extension** — add `settingsLabel` to the `en.install` block (after line 278):
```typescript
install: {
  regionLabel: 'Install app',
  bannerText: 'Add to your home screen for offline use',
  installButton: 'Install',
  iosStepsButton: 'How to install',
  dismiss: 'Dismiss install banner',
  iosStep1: "Tap the Share button in Safari's toolbar",
  iosStep2: 'Tap "Add to Home Screen"',
  iosStep3: 'Tap "Add" to confirm',
  settingsLabel: 'Install for offline use',
},
```

**PT-BR draft with review marker** — replace lines 406-416 with:
```typescript
// TODO: native-speaker review
install: {
  regionLabel: 'Instalar app',
  bannerText: 'Adicione à sua tela inicial para uso offline',
  installButton: 'Instalar',
  iosStepsButton: 'Como instalar',
  dismiss: 'Fechar banner de instalação',
  iosStep1: 'Toque no botão Compartilhar na barra do Safari',
  iosStep2: 'Toque em "Adicionar à Tela de Início"',
  iosStep3: 'Toque em "Adicionar" para confirmar',
  settingsLabel: 'Instalar para uso offline',
},
```

After operator review and approval, remove the `// TODO: native-speaker review` line. The drift-guard test (`content.no-review-markers.test.ts` line 36: `REVIEW_MARKER = 'TODO: native-speaker review'`) then passes.

**`as const satisfies` pattern** — line 418 is unchanged: `} as const satisfies Readonly<Record<LocaleId, UiStrings>>` — TypeScript enforces exhaustive key coverage, so both locale entries must have `settingsLabel`.

---

### `src/app/App.tsx` (edit — prop-drill install state into SettingsDialog)

**Analog:** `src/app/App.tsx` line 818 (existing SettingsDialog call) + lines 794-800 (InstallBanner call showing prop-drill pattern).

**SettingsDialog call site** — replace line 818:
```typescript
// Before (line 818):
<SettingsDialog open={settingsDialogOpen} onClose={onSettingsClose} inSessionView={inSessionView} strings={uiStrings} />

// After:
<SettingsDialog
  open={settingsDialogOpen}
  onClose={onSettingsClose}
  inSessionView={inSessionView}
  strings={uiStrings}
  isIOS={isIOS}
  isStandalone={isStandalone}
  installable={isIOS || deferredPrompt !== null}
  onInstall={triggerInstall}
/>
```

All four new props are already available in App.tsx from existing hook calls at lines 179-180. No new hooks, no new state — pure prop-drill matching the InstallBanner pattern at lines 794-800.

---

## Shared Patterns

### Section Label Rhythm
**Source:** `src/components/LanguagePicker.tsx` lines 33-35
**Apply to:** Install row inside `SettingsDialog.tsx`
```typescript
<p id="language-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">{sectionLabel}</p>
```
The install row uses the same `<p>` tag with the same CSS variable classes. Note: the install row's `<p>` does not need `id` + `aria-labelledby` because it labels the block visually, not a radiogroup.

### inSessionView Disabled Threading
**Source:** `src/components/SettingsDialog.tsx` lines 92-96
**Apply to:** Install row button(s) inside the Settings dialog
```typescript
<ThemePicker disabled={inSessionView} ... />
<VariantPicker disabled={inSessionView} ... />
<CuePicker disabled={inSessionView} ... />
<TimbrePicker disabled={inSessionView} ... />
<LanguagePicker disabled={inSessionView} ... />
```
Pattern: thread `inSessionView` as `disabled` prop. The install button(s) follow the same contract: `disabled={inSessionView}`.

### Button Focus-Visible Ring Pattern
**Source:** `src/components/InstallBanner.tsx` lines 51, 57-59
**Apply to:** All buttons in `IosInstallSteps.tsx` parent consumers and the Settings install row
```typescript
className="min-h-[44px] text-sm font-semibold text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
```

### PT-BR Review Marker Drift Guard
**Source:** `src/content/content.no-review-markers.test.ts` lines 36-46
**Apply to:** `src/content/strings.ts` PT-BR install block (draft → marker → operator approval → remove marker)
```typescript
const REVIEW_MARKER = 'TODO: native-speaker review'
// Test fails if any non-test .ts file in src/content/ contains this string
```
The marker comment goes on its own line immediately before the `install:` key in the `'pt-BR'` object. It is removed after operator sign-off.

### Component Test Render Helper
**Source:** `src/components/InstallBanner.test.tsx` lines 12-24 and `src/components/SettingsDialog.test.tsx` lines 18-31
**Apply to:** `IosInstallSteps.test.tsx` and the extended `SettingsDialog.test.tsx` render helper
```typescript
// Pattern: vi.fn() default mocks for callbacks, UI_STRINGS.en fixture for strings
const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
```

### Inline SVG Convention
**Source:** `src/components/InstallBanner.tsx` lines 96-117 (comment: "inline SVG per project convention")
**Apply to:** `IosInstallSteps.tsx` — `IOsShareIcon` moves here
```typescript
// iOS Share glyph — inline SVG per project convention (MuteToggle.tsx, LearnAnchor.tsx)
function IOsShareIcon() { ... }
```

---

## No Analog Found

All files have close analogs. No new infrastructure patterns required.

---

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`, `src/content/`, `src/app/`
**Files scanned:** 9 source files read directly
**Pattern extraction date:** 2026-05-16
