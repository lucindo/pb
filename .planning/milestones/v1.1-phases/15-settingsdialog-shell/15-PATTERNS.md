# Phase 15: SettingsDialog Shell - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 13 (6 production new + 6 test new + 1 modified)
**Analogs found:** 9 / 13 (4 picker tests have no close analog — GAP documented)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/SettingsAnchor.tsx` | component | request-response | `src/components/LearnAnchor.tsx` | exact |
| `src/components/SettingsAnchor.test.tsx` | test | request-response | `src/components/LearnAnchor.test.tsx` | exact |
| `src/components/SettingsDialog.tsx` | component | request-response | `src/components/ResetStatsDialog.tsx` | exact |
| `src/components/SettingsDialog.test.tsx` | test | request-response | `src/components/ResetStatsDialog.test.tsx` | exact |
| `src/components/ThemePicker.tsx` | component | request-response | `src/storage/prefs.ts` (API only) | no-analog — GAP |
| `src/components/ThemePicker.test.tsx` | test | request-response | none | no-analog — GAP |
| `src/components/VariantPicker.tsx` | component | request-response | `src/storage/prefs.ts` (API only) | no-analog — GAP |
| `src/components/VariantPicker.test.tsx` | test | request-response | none | no-analog — GAP |
| `src/components/TimbrePicker.tsx` | component | request-response | `src/storage/prefs.ts` (API only) | no-analog — GAP |
| `src/components/TimbrePicker.test.tsx` | test | request-response | none | no-analog — GAP |
| `src/components/LanguagePicker.tsx` | component | request-response | `src/storage/prefs.ts` (API only) | no-analog — GAP |
| `src/components/LanguagePicker.test.tsx` | test | request-response | none | no-analog — GAP |
| `src/app/App.tsx` | component | event-driven | `src/app/App.tsx` (internal patterns) | self-referential |

---

## Pattern Assignments

### `src/components/SettingsAnchor.tsx` (component, request-response)

**Analog:** `src/components/LearnAnchor.tsx` — literal template; three changes only.

**Full analog source** (lines 1-48, read in full):

```typescript
// LearnAnchor.tsx lines 12-48 — adapt for SettingsAnchor
export interface LearnAnchorProps {
  disabled: boolean
  onClick(this: void): void
}

export function LearnAnchor({ disabled, onClick }: LearnAnchorProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      aria-label={disabled ? 'Learn (unavailable during session)' : 'Learn'}
      onClick={disabled ? undefined : onClick}
      className={`absolute right-0 top-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border bg-white/70 px-2.5 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm transition sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${
        disabled
          ? 'cursor-not-allowed border-slate-200 text-[var(--color-breathing-muted)]'
          : 'border-teal-200 text-teal-800 hover:bg-teal-50 active:bg-teal-100'
      }`}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sm:h-4 sm:w-4"
      >
        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H10v15H5.5A2.5 2.5 0 0 1 3 15.5V5.5Z" />
        <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H14v15h4.5A2.5 2.5 0 0 0 21 15.5V5.5Z" />
      </svg>
      <span className="hidden sm:inline">Learn</span>
    </button>
  )
}
```

**Three changes from analog:**

1. Position class: `absolute right-0 top-0` → `absolute left-0 top-0`
2. aria-labels: `'Learn (unavailable during session)'` / `'Learn'` → `'Settings (unavailable during session)'` / `'Settings'`
3. Icon SVG (replace book paths with gear SVG — see RESEARCH.md §3):

```tsx
// Gear SVG — replace the two book <path> elements with:
<circle cx="12" cy="12" r="3" />
<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
```

**Critical pattern — `aria-disabled` NOT `disabled` attribute** (LearnAnchor.tsx line 21):
```typescript
aria-disabled={disabled || undefined}   // renders NO attribute when false — correct
onClick={disabled ? undefined : onClick} // handler removed entirely, NOT () => {}
// NO tabIndex={-1} — button stays in tab order (project disable-not-hide pattern)
```

**Span label to adapt** (LearnAnchor.tsx line 45):
```typescript
<span className="hidden sm:inline">Settings</span>
```

---

### `src/components/SettingsAnchor.test.tsx` (test, request-response)

**Analog:** `src/components/LearnAnchor.test.tsx` — literal template; three label-string changes.

**File header pattern** (lines 1-6 — copy verbatim):
```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsAnchor } from './SettingsAnchor'
```

**Enabled-state describe block** (LearnAnchor.test.tsx lines 13-33 — adapt labels):
```typescript
describe('SettingsAnchor — enabled state', () => {
  it('renders a button with accessible name Settings', () => {
    render(<SettingsAnchor disabled={false} onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('does NOT carry aria-disabled="true" when enabled', () => {
    render(<SettingsAnchor disabled={false} onClick={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Settings' })
    expect(button).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('clicking the button invokes onClick exactly once', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<SettingsAnchor disabled={false} onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

**Disabled-state describe block** (LearnAnchor.test.tsx lines 35-57 — adapt labels):
```typescript
describe('SettingsAnchor — disabled state (inSessionView=true)', () => {
  it('renders with accessible name "Settings (unavailable during session)"', () => {
    render(<SettingsAnchor disabled={true} onClick={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: 'Settings (unavailable during session)' })
    ).toBeInTheDocument()
  })

  it('carries aria-disabled="true" when disabled', () => {
    render(<SettingsAnchor disabled={true} onClick={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Settings (unavailable during session)' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('clicking the disabled button does NOT invoke onClick (JSX-layer no-op)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<SettingsAnchor disabled={true} onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Settings (unavailable during session)' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
```

**No-remount describe block** (LearnAnchor.test.tsx lines 59-73 — adapt labels):
```typescript
describe('SettingsAnchor — no remount across enabled/disabled transition', () => {
  it('the same DOM node persists across enabled→disabled rerender', () => {
    const onClick = vi.fn()
    const { rerender } = render(<SettingsAnchor disabled={false} onClick={onClick} />)
    const before = screen.getByRole('button', { name: 'Settings' })
    rerender(<SettingsAnchor disabled={true} onClick={onClick} />)
    const after = screen.getByRole('button', { name: 'Settings (unavailable during session)' })
    expect(after).toBe(before)
  })
})
```

---

### `src/components/SettingsDialog.tsx` (component, request-response)

**Analog:** `src/components/ResetStatsDialog.tsx` — literal template; key structural changes.

**Props interface** (differs from ResetStatsDialog — single `onClose`, adds `inSessionView`):
```typescript
import { useEffect, useRef, type MouseEventHandler } from 'react'

export interface SettingsDialogProps {
  open: boolean
  onClose(this: void): void
  inSessionView: boolean
}
```

**Open/close useEffect** (ResetStatsDialog.tsx lines 15-24 — remove the `cancelButtonRef.current?.focus()` line per D-13):
```typescript
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  if (open && !dialog.open) {
    dialog.showModal()
    // D-13: no explicit focus on open — native focus-return contract; no destructive default
  } else if (!open && dialog.open) {
    dialog.close()
  }
}, [open])
```

**Cancel event useEffect** (ResetStatsDialog.tsx lines 28-39 — copy verbatim, `onCancel` → `onClose`):
```typescript
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  const handleCancel = (event: Event) => {
    event.preventDefault()  // Pitfall-5: prevents double-fire of close sequence
    onClose()
  }
  dialog.addEventListener('cancel', handleCancel)
  return () => {
    dialog.removeEventListener('cancel', handleCancel)
  }
}, [onClose])
```

**Backdrop click handler** (ResetStatsDialog.tsx lines 43-47 — copy verbatim, `onCancel` → `onClose`):
```typescript
const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
  if (event.target === dialogRef.current) {
    onClose()
  }
}
```

**`<dialog>` element** (ResetStatsDialog.tsx line 50-54 — change id, change max-w-sm to max-w-md):
```typescript
<dialog
  ref={dialogRef}
  aria-labelledby="settings-dialog-title"
  onClick={handleBackdropClick}
  className="modal-fade m-auto max-w-md rounded-3xl border border-teal-100 bg-white p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
>
```

**Inner content structure** (new — single-column stacked pickers):
```tsx
<div className="grid gap-5 p-6 sm:p-7">
  <h2
    id="settings-dialog-title"
    className="text-2xl font-semibold tracking-tight text-slate-950"
  >
    Settings
  </h2>
  {/* D-10: Theme → Variant → Timbre → Language */}
  <ThemePicker disabled={inSessionView} />
  <VariantPicker disabled={inSessionView} />
  <TimbrePicker disabled={inSessionView} />
  <LanguagePicker disabled={inSessionView} />
  {/* D-11 + D-18: explicit Close button — primary mobile dismiss path */}
  <div className="flex justify-center">
    <button
      type="button"
      onClick={onClose}
      className="min-h-12 rounded-full border border-teal-200 bg-white px-5 py-2 text-base font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
    >Close</button>
  </div>
</div>
```

**Close button pattern source:** `src/components/LearnDialog.tsx` lines 176-183 (exact class string to copy).

---

### `src/components/SettingsDialog.test.tsx` (test, request-response)

**Analog:** `src/components/ResetStatsDialog.test.tsx` — literal template; adapt for single `onClose` prop.

**Test helper function** (ResetStatsDialog.test.tsx lines 8-17 — adapt props):
```typescript
function renderDialog(
  props: Partial<{ open: boolean; onClose: () => void; inSessionView: boolean }> = {},
) {
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <SettingsDialog
      open={props.open ?? false}
      onClose={onClose}
      inSessionView={props.inSessionView ?? false}
    />,
  )
  return { ...utils, onClose }
}
```

**Closed-state test** (ResetStatsDialog.test.tsx lines 19-26 — adapt dialog name):
```typescript
describe('SettingsDialog — closed state', () => {
  it('does not show the modal when open=false', () => {
    const { container } = renderDialog({ open: false })
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect((dialog as HTMLDialogElement).open).toBe(false)
  })
})
```

**Open-state tests** (ResetStatsDialog.test.tsx lines 28-83 — adapt; NO focus assertion on open per D-13):
```typescript
describe('SettingsDialog — open state', () => {
  it('opens the native dialog when open=true', () => {
    renderDialog({ open: true })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const dialog = screen.getByRole('dialog', { name: 'Settings' }) as HTMLDialogElement
    expect(dialog.open).toBe(true)
    // D-13: no focus assertion — SettingsDialog has no destructive default; native focus-return only
  })

  it('renders Close button and Settings title with locked copy (D-18)', () => {
    renderDialog({ open: true })
    expect(screen.getByRole('button', { name: 'Close' })).toBeVisible()
    expect(screen.getByText('Settings')).toBeVisible()
  })

  it('clicking Close invokes onClose exactly once', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog({ open: true })
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Esc (dialog cancel event) invokes onClose via preventDefault path', () => {
    const { onClose, container } = renderDialog({ open: true })
    // Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the backdrop invokes onClose', () => {
    const { onClose, container } = renderDialog({ open: true })
    // Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent.click(dialog, { target: dialog })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the inner panel does NOT invoke onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog({ open: true })
    await user.click(screen.getByText('Settings'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
```

**Open→close transition test** (ResetStatsDialog.test.tsx lines 87-94 — copy structure):
```typescript
describe('SettingsDialog — open→close transition', () => {
  it('closes the dialog when open transitions from true to false', () => {
    const { container, rerender } = renderDialog({ open: true })
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    rerender(<SettingsDialog open={false} onClose={vi.fn()} inSessionView={false} />)
    expect(dialog.open).toBe(false)
  })
})
```

**Additional tests specific to SettingsDialog (no analog — new):**
```typescript
describe('SettingsDialog — inSessionView picker disable threading', () => {
  it('passes disabled={true} to all pickers when inSessionView=true', () => {
    renderDialog({ open: true, inSessionView: true })
    // All four pickers render with disabled styling — assert text is present
    // (picker components self-render their labels; disabled state is a prop)
    expect(screen.getByText(/Theme:/)).toBeInTheDocument()
    expect(screen.getByText(/Variant:/)).toBeInTheDocument()
    expect(screen.getByText(/Timbre:/)).toBeInTheDocument()
    expect(screen.getByText(/Language:/)).toBeInTheDocument()
  })
})
```

**JSDOM focus-return note to include as comment:**
```typescript
// NOTE: D-13 — focus return to SettingsAnchor trigger after dialog close is native
// browser behavior not implemented by the JSDOM polyfill. Do NOT write a test
// asserting focus returns to the trigger. SC2 focus-return is verified in-browser only.
```

---

### `src/components/ThemePicker.tsx` (component, request-response)

**GAP: No exact analog in codebase.** No standalone component reads `loadPrefs()`. This is a new file class introduced at Phase 15. Closest API reference: `src/storage/prefs.ts` lines 68-70 (`loadPrefs()` signature).

**Template structure (from RESEARCH.md §2 — Picker Stub Template):**
```typescript
import { loadPrefs } from '../storage/prefs'

export interface ThemePickerProps {
  disabled: boolean
}

// D-04: stub renders label + current stored value as read-only text.
// D-02: self-reads loadPrefs() — no value prop threaded from parent.
// D-06: zero savePrefs() calls at Phase 15 — read-only stub.
// Phase 16 fills this file body (ThemePicker.tsx only — SettingsDialog.tsx is NOT edited).
export function ThemePicker({ disabled }: ThemePickerProps) {
  const prefs = loadPrefs()
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">Theme</p>
      <p className={`text-sm ${disabled ? 'text-[var(--color-breathing-muted)]' : 'text-slate-700'}`}>
        Theme: {prefs.theme}
      </p>
    </div>
  )
}
```

**`loadPrefs()` API** (`src/storage/prefs.ts` line 68):
```typescript
export function loadPrefs(deps: StorageDeps = {}): UserPrefs
// UserPrefs = { theme: ThemeId, timbre: TimbreId, variant: VisualVariantId, locale: LocaleId }
// Call with no args: loadPrefs() — Phase 15 D-02 pattern
```

**The four field accesses and D-18 locked display format:**
- `ThemePicker`: `prefs.theme` → label `Theme`, display `Theme: system`
- `VariantPicker`: `prefs.variant` → label `Variant`, display `Variant: orb`
- `TimbrePicker`: `prefs.timbre` → label `Timbre`, display `Timbre: bowl`
- `LanguagePicker`: `prefs.locale` → label `Language`, display `Language: en`

**Import path for all four pickers:** `import { loadPrefs } from '../storage/prefs'`

---

### `src/components/VariantPicker.tsx`, `TimbrePicker.tsx`, `LanguagePicker.tsx`

**GAP: Same as ThemePicker — no analog.** Apply the identical template, substituting:
- `VariantPicker`: `variant` → `prefs.variant`, label `Variant`, display `Variant: {prefs.variant}`
- `TimbrePicker`: `timbre` → `prefs.timbre`, label `Timbre`, display `Timbre: {prefs.timbre}`
- `LanguagePicker`: `locale` → `prefs.locale`, label `Language`, display `Language: {prefs.locale}`

---

### `src/components/ThemePicker.test.tsx` (and Variant/Timbre/Language)

**GAP: No picker test analog.** Minimal template for all four pickers:

```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemePicker } from './ThemePicker'

// SC3: picker renders label + current stored value as read-only text.
// localStorage polyfill in vitest.setup.ts provides a clean store per test.
// loadPrefs() returns DEFAULT_THEME ('system') when no prior write exists.

describe('ThemePicker — read-only stub (Phase 15 D-04)', () => {
  it('renders "Theme: system" when no prefs are stored (default fallback)', () => {
    render(<ThemePicker disabled={false} />)
    expect(screen.getByText('Theme: system')).toBeInTheDocument()
  })

  it('renders the picker in enabled visual state when disabled=false', () => {
    render(<ThemePicker disabled={false} />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  it('renders the picker in disabled visual state when disabled=true', () => {
    render(<ThemePicker disabled={true} />)
    // Stub still renders text — disabled only changes styling (text color class)
    expect(screen.getByText('Theme: system')).toBeInTheDocument()
  })
})
```

**Substitute per picker:**
- `VariantPicker.test.tsx`: import `VariantPicker`, assert `'Variant: orb'`
- `TimbrePicker.test.tsx`: import `TimbrePicker`, assert `'Timbre: bowl'`
- `LanguagePicker.test.tsx`: import `LanguagePicker`, assert `'Language: en'`

**vitest.setup.ts localStorage polyfill** ensures `loadPrefs()` reads the in-memory store. Default values come from `DEFAULT_THEME = 'system'`, `DEFAULT_VARIANT = 'orb'`, `DEFAULT_TIMBRE = 'bowl'`, `DEFAULT_LOCALE = 'en'` in `src/domain/settings.ts`. Tests do not need to write to localStorage — calling `loadPrefs()` with empty storage returns coerced defaults.

---

### `src/app/App.tsx` (component, event-driven — modifications)

**Analog:** Existing patterns within the same file.

**1. Import additions** (after line 11 — mirror existing import block at lines 3-11):
```typescript
import { SettingsAnchor } from '../components/SettingsAnchor'
import { SettingsDialog } from '../components/SettingsDialog'
```

**2. State addition** (after line 55 — mirrors `learnDialogOpen` at line 55):
```typescript
// Source: App.tsx line 55 pattern
const [learnDialogOpen, setLearnDialogOpen] = useState<boolean>(false)
// New — mirror:
const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false)
```

**3. WR-09 useEffect extension** (App.tsx lines 264-271 — add ONE line to EXISTING effect body):
```typescript
// Source: App.tsx lines 264-271 (verified exact)
useEffect(() => {
  if (inSessionView) {
    // Reason: subscribe-and-reflect — dialog visibility mirrors external inSessionView; setting local state from this trigger effect is the documented React pattern, identical posture to the EndSessionDialog auto-close at App.tsx:247-253 (WR-01).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLearnDialogOpen(false)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResetDialogOpen(false)
    // ADD the following line with its own disable comment:
    // Reason: subscribe-and-reflect — settingsDialogOpen mirrors external inSessionView; same WR-09 pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsDialogOpen(false)
  }
}, [inSessionView])
// IMPORTANT: Do NOT create a second useEffect — add to existing effect body only.
```

**4. Callback additions** (after line 420 `onLearnClose` — mirror `onLearnClick` / `onLearnClose` at lines 414-421):
```typescript
// Source: App.tsx lines 414-421 (verified exact)
const onLearnClick = useCallback(() => {
  if (inSessionView) return
  setLearnDialogOpen(true)
}, [inSessionView])

const onLearnClose = useCallback(() => {
  setLearnDialogOpen(false)
}, [])

// New — mirror verbatim substituting Learn→Settings:
const onSettingsClick = useCallback(() => {
  if (inSessionView) return
  setSettingsDialogOpen(true)
}, [inSessionView])

const onSettingsClose = useCallback(() => {
  setSettingsDialogOpen(false)
}, [])
```

**5. JSX — SettingsAnchor render** (App.tsx line 586 — add sibling to `<LearnAnchor>`):
```tsx
// Source: App.tsx lines 579-587 (verified)
<div className="relative w-full">
  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-teal-700">
    HRV practice
  </p>
  <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
    HRV Breathing
  </h1>
  {/* ADD before LearnAnchor — symmetric left-0 pair */}
  <SettingsAnchor disabled={inSessionView} onClick={onSettingsClick} />
  <LearnAnchor disabled={inSessionView} onClick={onLearnClick} />
</div>
```

**6. JSX — SettingsDialog render** (after line 653 `<LearnDialog>` — add before `</main>`):
```tsx
// Source: App.tsx lines 651-654 (verified)
{/* Phase 6 LEARN-01..LEARN-04: Learn modal */}
<LearnDialog open={learnDialogOpen} onClose={onLearnClose} />
{/* Phase 15 INFRA-04: Settings dialog */}
<SettingsDialog open={settingsDialogOpen} onClose={onSettingsClose} inSessionView={inSessionView} />
```

---

## Shared Patterns

### `aria-disabled` on `<button>` (not HTML `disabled` attribute)

**Source:** `src/components/LearnAnchor.tsx` line 21
**Apply to:** `SettingsAnchor.tsx`

```typescript
aria-disabled={disabled || undefined}   // undefined = attribute absent (not "false")
onClick={disabled ? undefined : onClick} // handler removed, NOT () => {}
// NO tabIndex={-1} — button stays in tab order (WCAG: disable-not-hide pattern)
```

Tests MUST assert `toHaveAttribute('aria-disabled', 'true')` NOT `toBeDisabled()`.

---

### Native `<dialog>` imperative pattern + Pitfall-5 mitigation

**Source:** `src/components/ResetStatsDialog.tsx` lines 15-47
**Apply to:** `SettingsDialog.tsx`

Three required effects/handlers:
1. `useEffect([open])` — calls `showModal()` / `close()` imperatively via ref
2. `useEffect([onClose])` — `cancel` event listener with `event.preventDefault()` (Pitfall-5)
3. `handleBackdropClick` — `event.target === dialogRef.current` check

The `close` event is NEVER listened to — only `cancel`. This is the entire project's dialog pattern.

---

### ESLint disable comment for `react-hooks/set-state-in-effect`

**Source:** `src/app/App.tsx` lines 266-267
**Apply to:** Each `set*DialogOpen(false)` call inside the WR-09 effect

```typescript
// Reason: subscribe-and-reflect — [dialog]Open mirrors external inSessionView; setting local state from this trigger effect is the documented React pattern, identical posture to WR-01.
// eslint-disable-next-line react-hooks/set-state-in-effect
setSettingsDialogOpen(false)
```

One `// eslint-disable-next-line` comment per set-state call (matches existing file style — not a block disable).

---

### ESLint disable comment for `no-non-null-assertion` in tests

**Source:** `src/components/ResetStatsDialog.test.tsx` lines 62-63
**Apply to:** All `container.querySelector('dialog')!` calls in `SettingsDialog.test.tsx`

```typescript
// Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const dialog = container.querySelector('dialog')!
```

---

### `loadPrefs()` no-args call pattern

**Source:** `src/storage/prefs.ts` line 68
**Apply to:** All four picker `.tsx` files

```typescript
import { loadPrefs } from '../storage/prefs'
// Inside component body — no useMemo, no caching (D-16):
const prefs = loadPrefs()
```

Safe to call on every render: two synchronous ops (`localStorage.getItem` + `JSON.parse`). Picker mounts only when dialog is open so re-render frequency is negligible.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/ThemePicker.tsx` | component | request-response | First standalone component that self-reads `loadPrefs()`. No existing component in `src/components/` calls storage directly. Phase 15 establishes the picker contract. |
| `src/components/VariantPicker.tsx` | component | request-response | Same — new file class |
| `src/components/TimbrePicker.tsx` | component | request-response | Same — new file class |
| `src/components/LanguagePicker.tsx` | component | request-response | Same — new file class |
| `src/components/ThemePicker.test.tsx` | test | request-response | No test for a stub picker that reads `loadPrefs()` defaults exists. vitest.setup.ts localStorage polyfill supplies the infrastructure; the template is simple (assert default text renders). |
| `src/components/VariantPicker.test.tsx` | test | request-response | Same — new test class |
| `src/components/TimbrePicker.test.tsx` | test | request-response | Same — new test class |
| `src/components/LanguagePicker.test.tsx` | test | request-response | Same — new test class |

**Planner guidance for GAP files:** Use the Picker Stub Template in the Pattern Assignments section above. The template is self-contained and complete for Phase 15's read-only scope.

---

## Metadata

**Analog search scope:** `src/components/`, `src/app/App.tsx`, `src/storage/prefs.ts`
**Files read:** `LearnAnchor.tsx`, `LearnAnchor.test.tsx`, `ResetStatsDialog.tsx`, `ResetStatsDialog.test.tsx`, `LearnDialog.tsx` (lines 165-187), `App.tsx` (lines 1-70, 138-145, 245-295, 388-422, 575-656), `prefs.ts` (lines 1-76)
**Pattern extraction date:** 2026-05-12
