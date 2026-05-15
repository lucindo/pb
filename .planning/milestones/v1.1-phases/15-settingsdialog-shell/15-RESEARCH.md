# Phase 15: SettingsDialog Shell — Research

**Researched:** 2026-05-12
**Domain:** React native `<dialog>` UI shell, JSDOM testing patterns, App.tsx wiring
**Confidence:** HIGH — all findings verified against live codebase at HEAD (`70968fc`)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Four separate picker files — ThemePicker, VariantPicker, TimbrePicker, LanguagePicker
- D-02: Picker prop = `{ disabled: boolean }` only; pickers self-read `loadPrefs()`
- D-03: Flat `src/components/` location
- D-04: Stub renders label + current value as read-only text (`Theme: system`)
- D-05: Only new App state = `settingsDialogOpen: boolean`
- D-06: Zero `savePrefs()` calls at Phase 15
- D-07: Gear top-left, symmetric with LearnAnchor top-right; same `absolute left-0 top-0` positioning
- D-08: Disabled in place during session — `aria-disabled`, no-op click handler, App-level open-guard
- D-09: Component name = `SettingsAnchor`
- D-10: Single-column 4-section stack: Theme → Variant → Timbre → Language; no group headers
- D-11: Close affordance = explicit Close button + native Esc + backdrop-click cancel
- D-12: Auto-close when `inSessionView` flips true (useEffect on `[inSessionView]`)
- D-13: Native focus-return; no explicit focus management
- D-14: Per-commit green-gate: `npx tsc --noEmit && npm run lint && npm run build && npm test` exits 0
- D-15: Zero new npm dependencies
- D-16: Phase 14 file-split preserved — do NOT edit `src/domain/settings.ts` or `src/storage/prefs.ts`
- D-17: WR-09 auto-close carry-forward (App.tsx:264-271 template)
- D-18: Five locked strings — `Settings`, `Settings (unavailable during session)`, `Close`, section labels `Theme / Variant / Timbre / Language`, stub format `Theme: system`

### Claude's Discretion
- Dialog `max-w` value — CONTEXT.md notes `max-w-md` or `max-w-lg` (planner decides)
- Exact Tailwind class string for SettingsDialog (must match backdrop class pattern)

### Deferred Ideas (OUT OF SCOPE)
- Section headers / dialog grouping (Appearance / Sound & Language)
- Top-right X icon close
- Tabbed dialog layout
- Snapshot tests for picker stubs
- `savePrefs()` defensive seed on mount
- lucide-react / heroicons for gear icon
- Phase 19 pt_BR vs pt-BR reconciliation (Phase 19 owns)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-04 | A new `SettingsDialog` opens from a gear control in the idle/stopped view, follows the native `<dialog>` + locked-copy pattern of `ResetStatsDialog` / `LearnDialog`, and hosts the four customization pickers (theme, timbre, variant, language). | Full pattern templates verified in §Pattern Templates; App.tsx edit sites documented in §App.tsx Integration Anchors; test patterns documented in §Native Dialog Test Setup. |
</phase_requirements>

---

## Summary

Phase 15 is a high-confidence, low-mystery implementation. The project already has three working native `<dialog>` components that serve as verified templates, a working JSDOM polyfill in `vitest.setup.ts`, and a clear LearnAnchor template for the SettingsAnchor. All JSDOM limitations are already worked around by the existing `vitest.setup.ts` polyfill — Phase 15 does not introduce any new testing infrastructure.

The primary execution risks are: (1) the `aria-disabled` pattern on `<button>` does NOT use `tabIndex={-1}` — it keeps the element in tab order but with a no-op handler, which is the established project pattern; (2) the `cancel` event double-fire pitfall (Pitfall-5) is already mitigated by `preventDefault()` in all three existing dialogs; (3) `loadPrefs()` in each picker is safe to call on every render since it is a synchronous localStorage read that only runs when the dialog is open; (4) JSDOM does not implement native focus-return on dialog close — tests should not assert focus return, only assert that focus lands correctly on open.

**Primary recommendation:** Copy-paste ResetStatsDialog.tsx as the SettingsDialog shell template, copy-paste LearnAnchor.tsx as the SettingsAnchor template with `left-0` instead of `right-0` and the gear SVG inline. Wire App.tsx following the exact line-number guide in §App.tsx Integration Anchors.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Gear trigger button (SettingsAnchor) | Frontend / React component | — | Pure UI control; reads `disabled` prop from App |
| Settings dialog shell (SettingsDialog) | Frontend / React component | — | Native `<dialog>` with imperative showModal/close |
| Picker stub display (4 picker files) | Frontend / React component | Storage layer (read-only) | Each picker self-reads `loadPrefs()` synchronously |
| Dialog open state | App.tsx state | — | `settingsDialogOpen` boolean mirrors `resetDialogOpen` / `learnDialogOpen` |
| inSessionView disable contract | App.tsx derived state | React effect | `appPhase !== 'idle'` at line 142; effect at 264-271 template |
| Prefs read (loadPrefs) | Storage layer | — | Phase 14 D-10 just-in-time read; no caching needed |

---

## 1. Native `<dialog>` Test Setup (JSDOM Behavior and Polyfills)

### What JSDOM 29.1.1 Does NOT Implement

JSDOM 29.1.1 does not implement `showModal()`, `show()`, `close()`, native focus-trap, `::backdrop`, or the `cancel` event from Esc key. [VERIFIED: vitest.setup.ts comment line 87 + jsdom/issues/3294 reference]

### What the Project Polyfill Provides

`vitest.setup.ts` (lines 87-114) installs three methods on `HTMLDialogElement.prototype` via a guarded conditional:

```typescript
// vitest.setup.ts lines 90-113 (verified exact)
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true  // sets the .open property — dialog queries work
    }
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () { this.open = true }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (returnValue?: string) {
      this.open = false
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))  // fires 'close' event
    }
  }
}
```

**Consequences for test authors:**
- `dialog.open` is a reliable boolean — tests assert `expect(dialog.open).toBe(true/false)` [VERIFIED: ResetStatsDialog.test.tsx lines 23-25]
- `screen.getByRole('dialog', { name: '...' })` works because the polyfill sets `open = true` which makes the dialog "open" in ARIA terms [VERIFIED: ResetStatsDialog.test.tsx line 33]
- The `close` polyfill fires `Event('close')` but NOT `Event('cancel')` — Esc cancel testing requires `fireEvent(dialog, new Event('cancel', { cancelable: true }))` [VERIFIED: ResetStatsDialog.test.tsx line 64]
- `::backdrop` is not rendered — no backdrop CSS tests possible
- Native focus-trap is not simulated — focus behavior inside dialog is limited to what the component sets explicitly

### Testing Pattern for the `cancel` Event (Esc Key)

Do NOT use `userEvent.keyboard('{Escape}')` — it does not fire the native `cancel` event in JSDOM. Use `fireEvent` directly:

```typescript
// From ResetStatsDialog.test.tsx line 63-65 (verified exact)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const dialog = container.querySelector('dialog')!
fireEvent(dialog, new Event('cancel', { cancelable: true }))
expect(onClose).toHaveBeenCalledTimes(1)
```

### Testing Pattern for Backdrop Click

JSDOM does not render the backdrop as a separate DOM node. Backdrop click is simulated by clicking the `<dialog>` element itself (which is what `event.target === dialogRef.current` checks):

```typescript
// From ResetStatsDialog.test.tsx lines 68-74 (verified exact)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const dialog = container.querySelector('dialog')!
fireEvent.click(dialog, { target: dialog })
expect(onCancel).toHaveBeenCalledTimes(1)
```

For the "child click does NOT trigger backdrop close" test, `userEvent.click` on a child element correctly sets `event.target` to the child:

```typescript
// From ResetStatsDialog.test.tsx lines 77-83 (verified exact)
await user.click(screen.getByText('Reset practice stats?'))
expect(onCancel).not.toHaveBeenCalled()
```

### Focus Behavior in JSDOM

- On `showModal()` the polyfill sets `this.open = true` — it does NOT move focus. The component's explicit `cancelButtonRef.current?.focus()` call in `useEffect` does move focus, and `toHaveFocus()` assertions work [VERIFIED: ResetStatsDialog.test.tsx line 35].
- On `close()` the polyfill does NOT return focus to the trigger — JSDOM has no focus-return for `<dialog>`. Do NOT write a test asserting that focus returns to SettingsAnchor after close. D-13 (native focus-return) is a browser behavior — correct but untestable in JSDOM.
- SettingsDialog has no destructive default so D-13 says no explicit focus call on open. This means no `closeButtonRef.current?.focus()` call — unlike ResetStatsDialog and LearnDialog which both explicitly focus a button.

### Test Infrastructure Already in Place

No new setup required. The following are globally available via `vitest.setup.ts`:
- `@testing-library/jest-dom/vitest` matchers (line 1)
- `localStorage` polyfill for `loadPrefs()` calls in pickers (lines 17-85)
- `HTMLDialogElement` polyfill for showModal/close (lines 87-114)
- `matchMedia` polyfill (lines 116-136) — not needed for Phase 15 but available

**Test file header template** (mirrors all existing test files exactly):

```typescript
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
```

---

## 2. Pattern Templates

### SettingsDialog Shell — Full Template from ResetStatsDialog.tsx

ResetStatsDialog.tsx (84 LOC, verified at HEAD) is the literal template. Key sections:

**Props interface** — SettingsDialog differs from ResetStatsDialog in having `inSessionView` prop and a single `onClose` (not `onConfirm`/`onCancel`):

```typescript
export interface SettingsDialogProps {
  open: boolean
  onClose(this: void): void
  inSessionView: boolean
}
```

**useEffect open/close** — copy verbatim from ResetStatsDialog.tsx lines 15-24, removing the `cancelButtonRef.current?.focus()` line (D-13: no explicit focus on open for SettingsDialog):

```typescript
// Source: ResetStatsDialog.tsx:15-24 (verified)
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  if (open && !dialog.open) {
    dialog.showModal()
    // NOTE: no explicit focus call — D-13 native focus-return contract
  } else if (!open && dialog.open) {
    dialog.close()
  }
}, [open])
```

**Cancel event handler** — copy verbatim from ResetStatsDialog.tsx lines 27-39 (Pitfall-5 mitigation is mandatory):

```typescript
// Source: ResetStatsDialog.tsx:27-39 (verified)
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  const handleCancel = (event: Event) => {
    event.preventDefault()  // Pitfall-5: prevent double-fire of close event
    onClose()
  }
  dialog.addEventListener('cancel', handleCancel)
  return () => {
    dialog.removeEventListener('cancel', handleCancel)
  }
}, [onClose])
```

**Backdrop click handler** — copy verbatim from ResetStatsDialog.tsx lines 42-47:

```typescript
// Source: ResetStatsDialog.tsx:42-47 (verified)
const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
  if (event.target === dialogRef.current) {
    onClose()
  }
}
```

**JSX `<dialog>` element** — copy class string from ResetStatsDialog.tsx line 54, planner adjusts `max-w-sm` → `max-w-md` or `max-w-lg`:

```typescript
// Source: ResetStatsDialog.tsx:49-54 (verified)
<dialog
  ref={dialogRef}
  aria-labelledby="settings-dialog-title"
  onClick={handleBackdropClick}
  className="modal-fade m-auto max-w-md rounded-3xl border border-teal-100 bg-white p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
>
```

**Close button** — copy from LearnDialog.tsx lines 176-183:

```typescript
// Source: LearnDialog.tsx:176-183 (verified)
<div className="flex justify-center">
  <button
    type="button"
    onClick={onClose}
    className="min-h-12 rounded-full border border-teal-200 bg-white px-5 py-2 text-base font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
  >Close</button>
</div>
```

---

### SettingsAnchor Template from LearnAnchor.tsx

LearnAnchor.tsx (49 LOC, verified at HEAD) is the literal template. SettingsAnchor differs in three ways only:
1. Icon SVG: gear (see §3 Gear Icon SVG)
2. Position class: `left-0` instead of `right-0`
3. aria-labels: `Settings` / `Settings (unavailable during session)`

**Full LearnAnchor source to adapt** (lines 17-48, verified):

```typescript
// Source: LearnAnchor.tsx:17-48 (verified — adapt for SettingsAnchor)
export function SettingsAnchor({ disabled, onClick }: SettingsAnchorProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      aria-label={disabled ? 'Settings (unavailable during session)' : 'Settings'}
      onClick={disabled ? undefined : onClick}
      className={`absolute left-0 top-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border bg-white/70 px-2.5 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm transition sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${
        disabled
          ? 'cursor-not-allowed border-slate-200 text-[var(--color-breathing-muted)]'
          : 'border-teal-200 text-teal-800 hover:bg-teal-50 active:bg-teal-100'
      }`}
    >
      {/* Gear SVG — see §3 */}
      <span className="hidden sm:inline">Settings</span>
    </button>
  )
}
```

**Key observations from LearnAnchor source** (verified):
- `aria-disabled={disabled || undefined}` — when disabled=false this renders NO aria-disabled attribute (not `"false"`), which is correct. When true, renders `aria-disabled="true"`.
- `onClick={disabled ? undefined : onClick}` — NOT `onClick={disabled ? () => {} : onClick}`. The handler is removed entirely. This is why `userEvent.click` on a disabled button does not call onClick — userEvent simulates the click event but there is no handler.
- NO `tabIndex={-1}` anywhere — the disabled button stays in tab order. Screen readers can reach it and hear "Settings (unavailable during session)". This is the project's intentional disable-not-hide pattern (D-08).
- `text-[var(--color-breathing-muted)]` for disabled palette — exact class to carry forward.

---

### App.tsx Auto-Close useEffect Template

The WR-09 auto-close block at App.tsx lines 264-271 (verified) is the exact template for SettingsDialog auto-close:

```typescript
// Source: App.tsx:264-271 (verified exact — copy and add setSettingsDialogOpen)
useEffect(() => {
  if (inSessionView) {
    // Reason: subscribe-and-reflect — dialog visibility mirrors external inSessionView; setting local state from this trigger effect is the documented React pattern, identical posture to the EndSessionDialog auto-close at App.tsx:247-253 (WR-01).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLearnDialogOpen(false)
    setResetDialogOpen(false)
    // ADD: setSettingsDialogOpen(false)
  }
}, [inSessionView])
```

Phase 15 adds `setSettingsDialogOpen(false)` to the SAME existing effect body — does NOT create a second useEffect. This keeps the auto-close behavior consolidated.

---

### App.tsx onSettingsClick Template (from onLearnClick)

```typescript
// Source: App.tsx:414-417 (verified exact — mirror for onSettingsClick)
const onLearnClick = useCallback(() => {
  if (inSessionView) return
  setLearnDialogOpen(true)
}, [inSessionView])
```

SettingsAnchor equivalent:

```typescript
const onSettingsClick = useCallback(() => {
  if (inSessionView) return
  setSettingsDialogOpen(true)
}, [inSessionView])

const onSettingsClose = useCallback(() => {
  setSettingsDialogOpen(false)
}, [])
```

---

### Picker Stub Template (all four pickers share this shape)

```typescript
// ThemePicker.tsx — other pickers identical with field name swap
import { loadPrefs } from '../storage/prefs'

export interface ThemePickerProps {
  disabled: boolean
}

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

The four field accesses: `prefs.theme`, `prefs.variant`, `prefs.timbre`, `prefs.locale`. Section labels from D-18: `Theme`, `Variant`, `Timbre`, `Language`. Stub display format from D-18: `Theme: system`, `Variant: orb`, `Timbre: bowl`, `Language: en`.

---

## 3. Gear Icon SVG

Hand-coded inline SVG matching LearnAnchor's book SVG style exactly:
- `aria-hidden="true"` (decorative — label on `<button>`)
- `width="18" height="18"` (same as book icon)
- `viewBox="0 0 24 24"` (same)
- `fill="none"` (same)
- `stroke="currentColor"` (inherits text color — works with disabled palette)
- `strokeWidth="1.8"` (same)
- `strokeLinecap="round" strokeLinejoin="round"` (same)
- `className="sm:h-4 sm:w-4"` (same responsive sizing)

```tsx
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
  <circle cx="12" cy="12" r="3" />
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
</svg>
```

This is a standard settings-cog (gear) path — circle center + outer path with 8 spokes forming the gear. Stroke-only, no fill, `currentColor` so it inherits the button's text color (teal-800 enabled, muted disabled). [ASSUMED — path geometry is training knowledge; verify renders correctly by visual inspection before committing]

---

## 4. App.tsx Integration Anchors (Exact Line Numbers at HEAD `70968fc`)

App.tsx is 656 lines. All line numbers verified by `grep -n` against HEAD.

| Edit | Location | Line(s) | Action |
|------|----------|---------|--------|
| Import SettingsAnchor | Top of imports block | After line 11 | `import { SettingsAnchor } from '../components/SettingsAnchor'` |
| Import SettingsDialog | Top of imports block | After SettingsAnchor import | `import { SettingsDialog } from '../components/SettingsDialog'` |
| Add `settingsDialogOpen` state | After line 55 | Line 56 (new) | `const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false)` |
| Extend WR-09 auto-close effect | Line 269 (after setResetDialogOpen) | Insert in existing effect body | `setSettingsDialogOpen(false)` — one line, same `if (inSessionView)` block, same `// eslint-disable` comment block already covers it |
| Add `onSettingsClick` callback | After line 420 (`onLearnClose`) | New block | `useCallback` with `inSessionView` guard + `setSettingsDialogOpen(true)` |
| Add `onSettingsClose` callback | After `onSettingsClick` | New block | `useCallback` returning `setSettingsDialogOpen(false)` |
| Render `<SettingsAnchor>` | Line 586 (LearnAnchor render) | Same `<div className="relative w-full">` block (line 579) | Add `<SettingsAnchor disabled={inSessionView} onClick={onSettingsClick} />` adjacent to `<LearnAnchor>` (line 586 stays, new sibling added before or after) |
| Render `<SettingsDialog>` | After line 653 (`<LearnDialog>`) | New line before `</main>` (line 654) | `<SettingsDialog open={settingsDialogOpen} onClose={onSettingsClose} inSessionView={inSessionView} />` |

**Render-site detail for SettingsAnchor:** The parent `<div className="relative w-full">` (line 579) already provides `position: relative` for LearnAnchor's `absolute right-0 top-0`. SettingsAnchor uses `absolute left-0 top-0` in the same parent — no new wrapper div needed.

**WR-09 effect extension detail:** The existing effect at lines 264-271 has a single `eslint-disable-next-line` comment covering only `setLearnDialogOpen`. After adding `setSettingsDialogOpen`, the disable comment must cover all three setters OR move to a single `// eslint-disable-next-line react-hooks/set-state-in-effect` before the entire `if (inSessionView)` block. Pattern: one disable comment for all setters inside the block. Check that the existing `react-hooks/exhaustive-deps` annotation on the `[inSessionView]` dep array is still valid (it is — `setSettingsDialogOpen` is a stable setter ref, does not need to be in the dep array).

**`onSettingsClick` exhaustive-deps:** The callback depends on `[inSessionView]` exactly like `onLearnClick` (line 417). No additional deps.

---

## 5. Test Commands and Green-Gate

### Green-Gate Command (D-14 exact)

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run test:run
```

Note: `npm test` launches Vitest in watch mode. For CI / commit gates, `npm run test:run` runs once and exits. Both invoke the same test suite.

### Package.json Scripts (verified)

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest",
  "test:run": "vitest run",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

**`npm run build`** internally runs `tsc -b` — so `npx tsc --noEmit` is a fast pre-check; `npm run build` is the full verification. D-14 calls both explicitly.

### Baseline (HEAD `70968fc`)

- Tests: **438 passed** across **30 test files** [VERIFIED: `npm run test:run` output]
- TypeScript: exits 0 [VERIFIED: `npx tsc --noEmit`]
- Test runtime: ~7.4s

Phase 15 target: 438 + new tests (minimum 12 new: 6 new component files × ~2 tests each). Exact count is planner's decision — all must exit 0.

---

## 6. Execution-Risk Landmines

### Landmine 1: Cancel event double-fire (Pitfall-5)

**Risk:** If `onClose` is called from the `cancel` event handler AND the browser/JSDOM also fires a `close` event afterward (without `preventDefault()`), the component's state update runs twice, potentially causing a no-op double-close or a flash.

**Mitigation:** `event.preventDefault()` in the `cancel` handler prevents the browser from firing the default `close` sequence after `cancel`. The polyfill's `close()` implementation fires `Event('close')` but the test fires `Event('cancel', { cancelable: true })` directly — `preventDefault()` works correctly because `cancelable: true` is set. [VERIFIED: all three existing dialogs use this pattern — ResetStatsDialog.tsx:31-32, LearnDialog.tsx:49-50, EndSessionDialog.tsx:31-32]

**Mirror file:** `src/components/ResetStatsDialog.tsx` lines 27-39

---

### Landmine 2: JSDOM close() polyfill does NOT dispatch 'cancel' event

**Risk:** When the component calls `dialog.close()` (on `open` prop flip to false), the polyfill fires `Event('close')` but NOT `Event('cancel')`. If SettingsDialog had a `close` event listener expecting to call `onClose`, it would work. But if code conflates `cancel` and `close`, it will miss cases.

**Mitigation:** Follow the exact three-path pattern: (a) Esc → `cancel` event → `handleCancel` calls `onClose`, (b) backdrop/button click → `onClose` called directly, (c) `open` prop → `dialog.close()` called imperatively. The `close` event is never listened to. [VERIFIED: all three existing dialogs follow this exact pattern]

**Mirror file:** `src/components/ResetStatsDialog.tsx` (no `close` event listener anywhere)

---

### Landmine 3: inSessionView auto-close race — lead-in timer fires while dialog is open

**Risk:** User opens SettingsDialog (sets `settingsDialogOpen = true`). User clicks "Start session" (`appPhase` → `'lead-in'`, `inSessionView` → `true`). The WR-09 `useEffect([inSessionView])` fires and calls `setSettingsDialogOpen(false)`. React batches the state updates. The dialog's `useEffect([open])` then runs with `open = false` and calls `dialog.close()`. This is the intended behavior. The risk is if the sequence causes a double-close attempt: `setSettingsDialogOpen(false)` → `open` prop → `useEffect([open])` guard `!open && dialog.open` prevents double-close because by the time the effect runs, `dialog.open` is already false (JSDOM polyfill sets `this.open = true` synchronously on `showModal()`, so the guard reads correctly).

**Actual sequence (safe):** React batches all state updates inside an event handler. `useEffect` fires after render. The `if (!open && dialog.open)` guard in the open/close effect ensures `dialog.close()` is called only once — if `dialog.open` is already false (because another code path closed it), the call is skipped.

**Mirror file:** `src/app/App.tsx:264-271` (WR-09 effect) + `src/components/ResetStatsDialog.tsx:15-24` (open/close guard)

---

### Landmine 4: `aria-disabled` on `<button>` vs `disabled` attribute — behavior difference

**Risk:** The project uses `aria-disabled` (not the `disabled` HTML attribute) on LearnAnchor/SettingsAnchor. HTML `disabled` on a `<button>` removes it from tab order and prevents all events. `aria-disabled` does NOT prevent events — the component removes the handler (`onClick={disabled ? undefined : onClick}`) to create the no-op. If a test uses `userEvent.click` and expects no call, this works because userEvent finds no handler. But if the implementation accidentally uses `disabled` (HTML attribute), it would change tab order — a WCAG regression.

**Mitigation:** SettingsAnchor MUST use `aria-disabled={disabled || undefined}` (not `disabled={disabled}`). Tests assert `toHaveAttribute('aria-disabled', 'true')` and NOT `toBeDisabled()`. [VERIFIED: LearnAnchor.tsx line 21 uses `aria-disabled`, LearnAnchor.test.tsx line 44 asserts `aria-disabled` attribute]

**Mirror file:** `src/components/LearnAnchor.tsx` line 21; `src/components/LearnAnchor.test.tsx` line 44

---

### Landmine 5: `loadPrefs()` on every picker render — performance concern

**Risk:** Each picker calls `loadPrefs()` (which calls `readEnvelope()` → `JSON.parse(localStorage.getItem(...))`) on every render. If dialog re-renders frequently, this could be expensive.

**Reality at Phase 15 scale:** The picker components only mount when the dialog is open (`open={settingsDialogOpen}` → `showModal()` triggered). While the dialog is open, re-renders are unlikely (no state changes inside the read-only stub). Each `loadPrefs()` call is a synchronous `localStorage.getItem` + `JSON.parse` — negligible cost for a 4-field object. `useMemo` would add complexity for zero observable benefit at this scale.

**Decision (confirmed D-16):** No `useMemo` at Phase 15. Phase 16+ adds whatever read-path optimization it needs inside its picker file. [VERIFIED: prefs.ts:68-70 shows `loadPrefs()` is two synchronous operations]

**Mirror file:** `src/storage/prefs.ts` lines 68-70

---

### Landmine 6: `react-hooks/set-state-in-effect` ESLint rule on new `setSettingsDialogOpen` in WR-09 effect

**Risk:** The WR-09 effect at App.tsx:264-271 already has an `// eslint-disable-next-line react-hooks/set-state-in-effect` comment. Adding `setSettingsDialogOpen(false)` to the same block needs the disable comment to cover ALL set-state calls in the block.

**Mitigation:** The existing disable comment at line 266-267 says `// eslint-disable-next-line` — it covers only the NEXT line. After adding the third setter, restructure as either: (a) one `// eslint-disable-next-line react-hooks/set-state-in-effect` per setter call, or (b) wrap the entire block in `/* eslint-disable */` / `/* eslint-enable */`. Option (a) matches the existing file style. Phase 7 D-04 annotation policy requires a `// Reason:` comment alongside any new `// Reason:` annotation: "subscribe-and-reflect — settingsDialogOpen mirrors external inSessionView; same pattern as WR-09." [VERIFIED: App.tsx:266-267 shows the existing pattern]

**Mirror file:** `src/app/App.tsx:264-271` (existing pattern to replicate)

---

### Landmine 7: `SettingsDialog` receives `inSessionView` prop — unused at Phase 15 for pickers

**Risk:** SettingsDialog receives `inSessionView: boolean` and passes it as `disabled` to each picker. The dialog itself doesn't use `inSessionView` for its own open/close (that's managed in App.tsx). Forgetting to thread `inSessionView` through to pickers means they all render as enabled, which contradicts INFRA-04 and SC3.

**Mitigation:** SettingsDialog prop interface includes `inSessionView: boolean`. Each picker renders: `<ThemePicker disabled={inSessionView} />`. The D-05 scope constraint (only `settingsDialogOpen` added to App) means `inSessionView` is NOT new — it's already computed at App.tsx:142. It's just threaded as a prop. [VERIFIED: CONTEXT.md code_context section]

**Mirror file:** `src/app/App.tsx:142` (`inSessionView` derivation); `src/components/ResetStatsDialog.tsx` (prop threading pattern)

---

### Landmine 8: `no-null-assertion` lint rule on `container.querySelector('dialog')!`

**Risk:** ESLint `@typescript-eslint/no-non-null-assertion` is active. ResetStatsDialog.test.tsx uses `container.querySelector('dialog')!` and wraps it with a `// Reason:` comment + `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion`. Missing this annotation on new test files will cause lint failures.

**Mitigation:** Copy the disable comment pattern exactly from ResetStatsDialog.test.tsx lines 62-63 and 69-70:

```typescript
// Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const dialog = container.querySelector('dialog')!
```

[VERIFIED: ResetStatsDialog.test.tsx lines 61-63]

---

### Landmine 9: `getByRole('dialog', { name: '...' })` requires `aria-labelledby` on `<dialog>`

**Risk:** `screen.getByRole('dialog', { name: 'Settings' })` looks for an element with role `dialog` whose accessible name is `Settings`. The name comes from `aria-labelledby="settings-dialog-title"` pointing to `<h2 id="settings-dialog-title">Settings</h2>`. If `aria-labelledby` is missing or the `id` doesn't match, the query fails.

**Mitigation:** SettingsDialog `<dialog>` element MUST carry `aria-labelledby="settings-dialog-title"` and the `<h2>` MUST carry `id="settings-dialog-title"`. [VERIFIED: ResetStatsDialog.tsx line 52 + test line 33]

---

## 7. Standard Stack

No new dependencies. All patterns use the project's existing stack:

| Library | Version | Role in Phase 15 |
|---------|---------|-----------------|
| React 18 | `^18` | useEffect, useRef, useState, useCallback |
| TypeScript | strict + strictTypeChecked | Component prop types, `MouseEventHandler<HTMLDialogElement>` |
| Tailwind CSS | v4 (@tailwindcss/vite) | All class strings — copy from existing dialogs |
| Vitest | `^4.1.5` | Test runner |
| @testing-library/react | `^16.3.2` | render, screen, fireEvent |
| @testing-library/user-event | `^14.6.1` | userEvent.click for button tests |
| @testing-library/jest-dom | `^6.9.1` | toBeVisible, toHaveAttribute, toHaveFocus |

[VERIFIED: package.json devDependencies]

---

## 8. New Files Checklist

Six production files + six test files = twelve new files total.

**Production:**
- `src/components/SettingsAnchor.tsx`
- `src/components/SettingsDialog.tsx`
- `src/components/ThemePicker.tsx`
- `src/components/VariantPicker.tsx`
- `src/components/TimbrePicker.tsx`
- `src/components/LanguagePicker.tsx`

**Test:**
- `src/components/SettingsAnchor.test.tsx`
- `src/components/SettingsDialog.test.tsx`
- `src/components/ThemePicker.test.tsx`
- `src/components/VariantPicker.test.tsx`
- `src/components/TimbrePicker.test.tsx`
- `src/components/LanguagePicker.test.tsx`

**Modified:**
- `src/app/App.tsx` (imports + state + effect + callbacks + JSX)

**NOT modified (D-16):**
- `src/domain/settings.ts`
- `src/storage/prefs.ts`

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.5` |
| Config file | `vite.config.ts` (test section — jsdom, globals: true, setupFiles: `./vitest.setup.ts`) |
| Quick run command | `npm run test:run -- --reporter=verbose` |
| Full suite command | `npm run test:run` |

### Phase 15 Success Criteria → Test Map

| SC | Behavior | Test Type | Automated Command | File |
|----|----------|-----------|-------------------|------|
| SC1 | Gear control visible + reachable in idle; absent/disabled in session | unit | `npm run test:run -- src/components/SettingsAnchor.test.tsx` | Wave 0 |
| SC1 | `aria-disabled="true"` when `inSessionView=true` | unit | same | Wave 0 |
| SC1 | `disabled` button does NOT invoke onClick (JSX-layer no-op) | unit | same | Wave 0 |
| SC2 | Activating gear opens dialog (dialog.open = true) | unit | `npm run test:run -- src/components/SettingsDialog.test.tsx` | Wave 0 |
| SC2 | Esc (`cancel` event) calls onClose | unit | same | Wave 0 |
| SC2 | Backdrop click calls onClose | unit | same | Wave 0 |
| SC2 | Close button click calls onClose | unit | same | Wave 0 |
| SC2 | Dialog closes when open flips false (dialog.open = false) | unit | same | Wave 0 |
| SC3 | ThemePicker renders `Theme: system` text (loadPrefs default) | unit | `npm run test:run -- src/components/ThemePicker.test.tsx` | Wave 0 |
| SC3 | VariantPicker renders `Variant: orb` text | unit | `npm run test:run -- src/components/VariantPicker.test.tsx` | Wave 0 |
| SC3 | TimbrePicker renders `Timbre: bowl` text | unit | `npm run test:run -- src/components/TimbrePicker.test.tsx` | Wave 0 |
| SC3 | LanguagePicker renders `Language: en` text | unit | `npm run test:run -- src/components/LanguagePicker.test.tsx` | Wave 0 |
| SC3 | All four pickers receive `disabled={true}` from SettingsDialog when `inSessionView=true` | unit | `npm run test:run -- src/components/SettingsDialog.test.tsx` | Wave 0 |
| SC4 | SettingsDialog: native `<dialog>` element present in DOM | unit | same | Wave 0 |
| SC4 | No new imports from external libraries (tsc verifies zero new deps) | static | `npx tsc --noEmit` | always |
| SC5 | Full green gate | static | `npx tsc --noEmit && npm run lint && npm run build && npm run test:run` | per commit |

**SC1 note:** "absent or hidden during session" — the project convention is "disabled in place" (D-08), not absent. SC1's "absent or hidden" language from ROADMAP.md is satisfied by `aria-disabled="true"` + no-op handler. Tests should assert `aria-disabled="true"` is present (not absence of the button from DOM).

**SC2 focus-return note:** "returns focus to the trigger" is native browser behavior not testable in JSDOM (polyfill doesn't implement it). Write a comment in the test file acknowledging this and skip the assertion. SC2's focus-trap assertion is also not testable in JSDOM (no native focus-trap). Test what IS testable: dialog.open, onClose called, no double-fire.

**SC3 disabled-during-session in dialog:** Pass `inSessionView={true}` to SettingsDialog and assert each picker renders with its disabled styling or verify they receive `disabled={true}` prop (requires rendering the full dialog + checking child content).

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit && npm run lint`
- **Per wave merge:** `npx tsc --noEmit && npm run lint && npm run build && npm run test:run`
- **Phase gate:** Full suite (438 + new tests) green before `/gsd-verify-work`

### Wave 0 Gaps (Files to Create Before Implementation)

- [ ] `src/components/SettingsAnchor.test.tsx` — covers SC1
- [ ] `src/components/SettingsDialog.test.tsx` — covers SC2, SC3, SC4
- [ ] `src/components/ThemePicker.test.tsx` — covers SC3 (theme)
- [ ] `src/components/VariantPicker.test.tsx` — covers SC3 (variant)
- [ ] `src/components/TimbrePicker.test.tsx` — covers SC3 (timbre)
- [ ] `src/components/LanguagePicker.test.tsx` — covers SC3 (language)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Gear SVG path geometry renders a recognizable settings cog at 18×18 | §3 Gear Icon SVG | Visual defect only — no functional risk. Fix by adjusting path before final commit. |

All other claims in this research were verified against live source files at HEAD `70968fc` or the running test suite.

---

## Sources

### Primary (HIGH confidence — verified against live codebase)

- `src/components/ResetStatsDialog.tsx` — dialog ref, showModal/close, cancel handler, backdrop click, Pitfall-5 mitigation
- `src/components/ResetStatsDialog.test.tsx` — cancel event, backdrop click, focus, open/close test patterns
- `src/components/LearnAnchor.tsx` — aria-disabled pattern, no tabIndex, onClick no-op, disabled palette
- `src/components/LearnAnchor.test.tsx` — aria-disabled assertion, click no-op, no-remount test
- `src/components/LearnDialog.tsx` — Close button pattern, scrollTop reset on open
- `src/components/EndSessionDialog.tsx` — backdrop class verification (`backdrop:bg-[var(--color-modal-backdrop)]`)
- `src/app/App.tsx` — inSessionView at line 142, WR-09 effect at 264-271, onLearnClick at 414-417, LearnAnchor at 586, dialog renders at 641-653
- `src/storage/prefs.ts` — loadPrefs() API (two synchronous ops)
- `src/domain/settings.ts` — DEFAULT_* values, type exports pickers use
- `vitest.setup.ts` — HTMLDialogElement polyfill (showModal/close/show), localStorage polyfill
- `vite.config.ts` — jsdom environment, setupFiles, globals:true
- `package.json` — script aliases, testing library versions
- `npm run test:run` output — 438 tests, 30 files, baseline confirmed

### Secondary (MEDIUM confidence)

- JSDOM issue tracker references in `vitest.setup.ts` comments — jsdom/issues/3294 (dialog), jsdom/issues/2900 (AudioContext) — not independently fetched but cited in project source
