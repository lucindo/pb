# Phase 2: Visual Guide & Accessible Responsive Interface - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 10 (8 modified, 2 new)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Status | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/components/BreathingShape.tsx` | modify | component (presentational) | derived-render (frame-driven) | self (current `BreathingShape.tsx`) | exact (refining itself) |
| `src/components/SessionReadout.tsx` | modify | component (presentational, live region) | derived-render | self (current `SessionReadout.tsx`) | exact |
| `src/components/SettingsForm.tsx` | modify | component (controlled form composition) | request-response (parent state) | self (current `SettingsForm.tsx`) | exact |
| `src/components/SettingsStepper.tsx` | modify | component (controlled fieldset) | request-response (callback-up) | self (current `SettingsStepper.tsx`) | exact |
| `src/components/SessionControls.tsx` | modify | component (button) | request-response | self (current `SessionControls.tsx`) | exact |
| `src/components/EndSessionDialog.tsx` | new | component (modal dialog) | request-response (open/cancel/confirm) | `src/components/SettingsStepper.tsx` (fieldset + a11y labelling) + `src/components/SessionReadout.tsx` (panel surface) | role-match (no existing modal) |
| `src/hooks/usePrefersReducedMotion.ts` | new | hook (external store subscription) | event-driven (matchMedia change events) | `src/hooks/useSessionEngine.ts` (useEffect subscribe + cleanup) | partial (different store, same `useEffect` lifecycle pattern) |
| `src/app/App.tsx` | modify | composition root | request-response (event handlers wire children) | self (current `App.tsx`) | exact |
| `src/styles/theme.css` | modify | config (design tokens + CSS) | declarative styling | self (current `theme.css`) | exact |
| `vitest.setup.ts` | modify | config (test polyfills) | declarative test setup | self (current `vitest.setup.ts`) | exact |
| `src/app/App.dialog.test.tsx` (or extend `App.session.test.tsx`) | new | test | event-driven (user-event interactions) | `src/app/App.session.test.tsx` "manual session ending" describe block | exact (same harness, same patterns) |

---

## Pattern Assignments

### `src/components/BreathingShape.tsx` (component, derived-render)

**Analog:** `src/components/BreathingShape.tsx` (self, lines 1-29). The component already binds to `SessionFrame.phaseProgress`, exposes `data-phase` and `data-progress`, has a `role="img"` accessible name, and is guarded by a `motion-reduce:transition-none` class. Phase 2 refines internals while preserving the data contract.

**Imports pattern** (current lines 1-3):
```tsx
import type { CSSProperties } from 'react'

import type { SessionFrame } from '../domain/sessionMath'
```
Add: `import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'`.

**Frame-null short-circuit** (current lines 9-12) — preserve verbatim:
```tsx
export function BreathingShape({ frame }: BreathingShapeProps) {
  if (frame === null) {
    return null
  }
```
This is the contract: orb returns `null` in idle/complete, `App.tsx` does not need to gate it.

**Progress + scale formula** (current lines 14-15) — preserve, then branch on reduced-motion:
```tsx
const progress = Math.min(1, Math.max(0, frame.phaseProgress))
const scale = frame.phase === 'in' ? 0.58 + progress * 0.42 : 1 - progress * 0.42
```
Keep the 0.58–1.0 bounds. Per UI-SPEC: in reduced-motion mode, use `(0.58 + 1.0) / 2 = 0.79` as a fixed mid-size (`--orb-scale-mid`). Per RESEARCH Pattern 3:
```tsx
const orbScale = reducedMotion ? (MIN_SCALE + MAX_SCALE) / 2 : liveScale
```

**Accessible name + data hooks** (current lines 17-25) — preserve attributes:
```tsx
<div
  role="img"
  aria-label={`Breathing shape: ${frame.phaseLabel}`}
  data-phase={frame.phase}
  data-progress={progress.toFixed(3)}
  className="..."
  style={{ '--breathing-scale': scale } as CSSProperties}
>
```
The `data-phase` attribute is the CSS hook for the In/Out gradient layer crossfade (theme.css selector `[data-phase='out'] .orb-layer--out`). The `data-progress` attribute is asserted in `App.session.test.tsx:64` — preserve.

**Phase label centered inside orb (D-03)** — replaces current line 26:
Current: `<span className="rounded-full bg-white/75 px-4 py-2 shadow-sm">{frame.phaseLabel}</span>`
Replace with a single large centered label per UI-SPEC Typography (`text-5xl sm:text-6xl font-semibold tracking-tight`), color from `--color-orb-{in,out}-text`. Keep `frame.phaseLabel` as the single source of truth.

**Static reference rings (D-04)** — new structure, two `aria-hidden="true"` siblings positioned absolutely. Per RESEARCH Pattern 3 sketch, both rings are `<span aria-hidden="true">` elements; outer = 100%, inner = `MIN_SCALE * 100%` (58%). Use `border` utility classes; the existing `border-4` shadow pattern from current line 23 (`shadow-lg shadow-teal-900/10`) is the reference for ring stroke styling.

**Tailwind reduced-motion guard** (current line 23) — preserve and extend:
```tsx
className="... transition-transform duration-200 motion-reduce:transition-none"
```
The `motion-reduce:transition-none` utility is already established here — extend it to all newly added decorative transitions per D-09.

---

### `src/components/SessionReadout.tsx` (component, derived-render)

**Analog:** `src/components/SessionReadout.tsx` (self, lines 1-46). Already a `role="status" aria-live="polite" aria-atomic="true"` live region with the clock pill. Phase 2 trims the redundant in-readout phase label (since the orb hosts it now per D-03) but keeps the section, ARIA attributes, and clock pill intact.

**Imports + null short-circuit** (current lines 1-14) — preserve:
```tsx
import type { SessionFrame } from '../domain/sessionMath'
import { formatDuration } from '../domain/sessionMath'
import type { SessionStatus } from '../domain/sessionController'

export interface SessionReadoutProps {
  frame: SessionFrame | null
  status: SessionStatus
  message?: 'Session complete'
}

export function SessionReadout({ frame, status, message }: SessionReadoutProps) {
  if (status === 'idle' && frame === null && message === undefined) {
    return null
  }
```

**Time-label derivation** (current lines 16-17) — preserve verbatim:
```tsx
const timeLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'
const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'
```
This is asserted in `App.session.test.tsx:36-54`. Do not refactor.

**Section ARIA contract** (current lines 19-24) — preserve:
```tsx
<section
  aria-label="Session readout"
  className="..."
>
  <div role="status" aria-label="Session readout" aria-live="polite" aria-atomic="true">
```
Tests query via `screen.getByRole('region', { name: 'Session readout' })` (`App.session.test.tsx:14`) and `screen.getByRole('status', { name: 'Session readout' })` (`App.session.test.tsx:184`). Both selectors must continue to pass.

**Clock pill structure** (current lines 38-43) — preserve. The "Remaining" / "Elapsed" copy and the `font-mono` time format are locked.

**Phase label changes (D-03)** — current lines 28-35 render `Current phase` + a 6xl `In`/`Out` label. With D-03 moving the phase label inside the orb, this block can be reduced. Recommended: drop the "Current phase" eyebrow + giant phase text (now redundant with the orb's in-orb label), keep the `Session complete` branch (current lines 25-27) and the clock pill. Update `App.session.test.tsx:25-27` accordingly (those tests assert `In` and `Current phase` inside the readout — they need to assert via the orb instead, which is also tested at `App.session.test.tsx:62-66`).

---

### `src/components/SettingsForm.tsx` (component, controlled form)

**Analog:** `src/components/SettingsForm.tsx` (self, lines 1-79). Already accepts `isRunning` (line 13) and threads it down as `disabled` to BPM/Ratio steppers (lines 59, 66) and as `disableDecrease`/`disableIncrease` to Duration (lines 74-75). Phase 2 changes the BPM and Ratio steppers from "rendered + disabled" to "not rendered" while running (D-16).

**Conditional render pattern (D-16)** — per RESEARCH Pattern 6 sketch:
```tsx
return (
  <div className="grid w-full gap-4" aria-label="Session settings">
    {!isRunning && (
      <>
        <SettingsStepper label="BPM" ... disabled={isRunning} />
        <SettingsStepper<RatioLabel> label="Ratio" ... disabled={isRunning} />
      </>
    )}
    <SettingsStepper<DurationOption> label="Duration" ... />
  </div>
)
```

**Critical contract: tests assert presence/absence by role group** — `App.settings.test.tsx:21-23` looks up groups via `screen.getByRole('group', { name: 'BPM' })` and `App.session.test.tsx:9-11` uses the same helper. Conditional render (vs. CSS hide) ensures `queryByRole` returns `null` when running, which the new running-state tests in this phase will assert.

**Test that breaks and must update** — `App.settings.test.tsx:123-133` ("does not allow BPM or ratio edits while a session is running") currently asserts the steppers are present and `toBeDisabled()`. After D-16, this test must be updated to assert the groups are NOT in the document while running:
```tsx
expect(screen.queryByRole('group', { name: 'BPM' })).not.toBeInTheDocument()
expect(screen.queryByRole('group', { name: 'Ratio' })).not.toBeInTheDocument()
```

**Duration extension callback** (current lines 40-49) — preserve verbatim. The existing `onExtendDuration(durationMinutes)` path used while running is unchanged; the Duration stepper stays visible during running per D-16.

---

### `src/components/SettingsStepper.tsx` (component, controlled fieldset)

**Analog:** `src/components/SettingsStepper.tsx` (self, lines 1-69). Already implements: 48px tap target via `size-12` (line 45, 60) — already meets D-17's 44×44 floor. ARIA labels via `aria-label="Decrease ${label}"` / `aria-label="Increase ${label}"` (lines 44, 59). `<output>` with `aria-live="polite"` (lines 51-56) for announced value changes.

**Imports** — none currently; pure component.

**Fieldset + legend pattern** (current lines 33-40) — preserve verbatim:
```tsx
<fieldset
  aria-label={label}
  className="rounded-3xl border border-teal-100 bg-white/80 p-4 shadow-sm shadow-teal-900/5"
>
  <legend className="px-1 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
    {label}
  </legend>
```

**Stepper button pattern** (current lines 42-50) — Phase 2 replaces only the focus ring utilities:
```tsx
// CURRENT (Phase 1) — REMOVE these utilities:
className="grid size-12 place-items-center rounded-full border border-teal-200 bg-white text-2xl leading-none text-teal-800 shadow-sm transition hover:bg-teal-50 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-45"
```
**Phase 2 replacement (D-21)** — per UI-SPEC Focus Ring Contract:
```tsx
// Replace: focus:outline-none focus:ring-4 focus:ring-teal-200
// With:    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2
// Add:     motion-reduce:transition-none (D-09)
className="grid size-12 place-items-center rounded-full border border-teal-200 bg-white text-2xl leading-none text-teal-800 shadow-sm transition hover:bg-teal-50 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
```

**Disabled non-color cue** (current lines 45-46, 60-61) — preserve. `disabled` attribute + `disabled:opacity-45` is the established non-color-only disabled cue (UI-SPEC: "Disabled stepper buttons: `disabled` attribute + `opacity-45` visual cue"). Do not remove.

**Output value pattern** (current lines 51-56) — preserve verbatim. Tests rely on `getByText('5.5 BPM')` etc. (`App.settings.test.tsx:53-55`).

---

### `src/components/SessionControls.tsx` (component, button)

**Analog:** `src/components/SessionControls.tsx` (self, lines 1-22). Single `<button>` toggling `Start session` / `End session` copy on `isRunning`. Phase 2 changes only the focus-ring utilities and confirms `min-h-11` (44px).

**Current button** (lines 12-19) — full reference:
```tsx
<button
  type="button"
  className="mt-6 w-full rounded-full bg-teal-700 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-200"
  onClick={isRunning ? onEnd : onStart}
>
  {isRunning ? 'End session' : 'Start session'}
</button>
```

**Phase 2 changes** — replace `focus:` utilities with the `focus-visible:` pattern (D-21), add `motion-reduce:transition-none` (D-09), confirm `min-h-11` (the existing `py-4` + `text-lg` already exceeds 44px but make the floor explicit per UI-SPEC):
```tsx
className="mt-6 w-full min-h-11 rounded-full bg-teal-700 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
```

**Copy is locked** — `'Start session'` / `'End session'` strings cannot change (Phase 1 D-11, D-15). Tests select by these names: `App.session.test.tsx:22, 158, 180-183, 195`.

---

### `src/components/EndSessionDialog.tsx` (component, modal dialog) — NEW

**Closest analog (no existing modal):**
- For a11y labelling pattern: `src/components/SettingsStepper.tsx` lines 33-40 (`<fieldset aria-label={label}>` + `<legend>` shows the project's "use a single labelling element with a stable id" approach).
- For panel surface styling: `src/components/SessionReadout.tsx` line 22 (`rounded-[1.75rem] border border-teal-100 bg-teal-50/80 p-5 ... shadow-inner`).
- For button styling: `src/components/SessionControls.tsx` lines 12-19 (primary teal-700 button with focus ring).
- For event-driven lifecycle: `src/hooks/useSessionEngine.ts` lines 29-57 (`useEffect` with `addEventListener` + cleanup; mirror this for `dialog.addEventListener('cancel', ...)` cleanup).

**Authoritative pattern source:** RESEARCH Pattern 1 (`02-RESEARCH.md` lines 211-292). Use the native `<dialog>` element, drive open/close via refs and `useEffect`, attach `cancel` event listener with `event.preventDefault()` to prevent the double-fire pitfall (RESEARCH Pitfall 5).

**Imports pattern** — match Phase 1 React 19 style (no default React import, hooks named):
```tsx
import { useEffect, useRef } from 'react'
```

**Props contract (UI-SPEC Component Inventory + RESEARCH Pattern 1):**
```tsx
export interface EndSessionDialogProps {
  open: boolean
  onConfirm(): void
  onCancel(): void
}
```

**Imperative open/close** — RESEARCH Pattern 1 lines 231-242:
```tsx
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  if (open && !dialog.open) {
    dialog.showModal()
    cancelButtonRef.current?.focus()  // D-12: default focus on Keep going
  } else if (!open && dialog.open) {
    dialog.close()
  }
}, [open])
```

**Cancel-event interception** — RESEARCH Pattern 1 lines 245-254 (avoids the `cancel`+`close` double-fire from Pitfall 5):
```tsx
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  const handleCancel = (event: Event) => {
    event.preventDefault()
    onCancel()
  }
  dialog.addEventListener('cancel', handleCancel)
  return () => dialog.removeEventListener('cancel', handleCancel)
}, [onCancel])
```
The `useEffect` + cleanup mirrors `useSessionEngine.ts:29-57` ("subscribe with addEventListener, return cleanup").

**Backdrop click** — RESEARCH Pattern 1 lines 257-259:
```tsx
const handleBackdropClick: React.MouseEventHandler<HTMLDialogElement> = (event) => {
  if (event.target === dialogRef.current) onCancel()
}
```

**Markup contract (UI-SPEC Copywriting + ARIA Roles):**
```tsx
<dialog
  ref={dialogRef}
  aria-labelledby="end-session-title"
  onClick={handleBackdropClick}
  className="rounded-3xl p-0 backdrop:bg-slate-900/30"
>
  <div className="grid gap-5 p-6 sm:p-7">
    <h2 id="end-session-title" className="text-2xl font-semibold">End this session?</h2>
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button ref={cancelButtonRef} type="button" onClick={onCancel}
        className="min-h-12 rounded-full px-5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2">
        Keep going
      </button>
      <button type="button" onClick={onConfirm}
        className="min-h-12 rounded-full bg-teal-700 px-5 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2">
        End
      </button>
    </div>
  </div>
</dialog>
```

**Critical anti-patterns to avoid (RESEARCH Anti-Patterns + Pitfalls):**
- Do NOT add `role="dialog"` (native `<dialog>` already has it; APG forbids redundant attributes).
- Do NOT add `tabindex` to the dialog element.
- Do NOT install or use `focus-trap-react` — native `<dialog>.showModal()` traps via `inert`.
- Do NOT pause `useSessionEngine` while modal is open (D-13, SESS-05).

---

### `src/hooks/usePrefersReducedMotion.ts` (hook, event-driven) — NEW

**Closest analog:** `src/hooks/useSessionEngine.ts` lines 29-57 — the project's established `useEffect` + subscribe + cleanup pattern. The hook below is a thin specialization.

**Imports pattern** — match `useSessionEngine.ts:1`:
```ts
import { useEffect, useState } from 'react'
```

**Authoritative pattern source:** RESEARCH Pattern 2 (`02-RESEARCH.md` lines 312-331).

**Full hook (preserve as-is from RESEARCH Pattern 2):**
```ts
const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
```

**Subscribe + cleanup pattern matches `useSessionEngine.ts:29-57`** — both:
1. Set up the subscription inside `useEffect`.
2. Return a cleanup function that tears it down.
3. Use `addEventListener` / `removeEventListener` (not the deprecated `addListener`/`removeListener`).

**Test polyfill required** — RESEARCH Pitfall 2: jsdom does not implement `matchMedia`. Polyfill goes in `vitest.setup.ts` (see "vitest.setup.ts" section below). Per-test override pattern:
```ts
vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, /* ... */ } as MediaQueryList)
```

---

### `src/app/App.tsx` (composition root)

**Analog:** `src/app/App.tsx` (self, lines 1-56). The composition seam where the orb, readout, settings form, and controls are wired. Phase 2 changes only `endSession` and adds modal state + `EndSessionDialog`.

**Imports pattern** (current lines 1-5) — add `EndSessionDialog`:
```tsx
import { BreathingShape } from '../components/BreathingShape'
import { SettingsForm } from '../components/SettingsForm'
import { SessionReadout } from '../components/SessionReadout'
import { SessionControls } from '../components/SessionControls'
import { EndSessionDialog } from '../components/EndSessionDialog'   // NEW
import { useState } from 'react'                                     // NEW (for dialog open state)
import { useSessionEngine } from '../hooks/useSessionEngine'
```

**Current `endSession` to remove** (lines 11-19) — this is the integration seam for D-10:
```tsx
const endSession = () => {
  if (state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended') {
    if (!window.confirm('End this timed session?')) {
      return
    }
  }
  session.end()
}
```

**Replacement state machine (D-10, D-13, D-14):**
```tsx
const [endDialogOpen, setEndDialogOpen] = useState(false)

const requestEnd = () => {
  if (state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended') {
    setEndDialogOpen(true)
    return
  }
  session.end()  // open-ended ends directly (D-14)
}

const confirmEnd = () => {
  setEndDialogOpen(false)
  session.end()
}

const cancelEnd = () => {
  setEndDialogOpen(false)
  // session continues — clock keeps running (D-13). Nothing else to do.
}
```

**Composition wiring** (current lines 34-52) — preserve as-is (orb, readout, settings, controls, footer); add `<EndSessionDialog>` below `<SessionControls>`:
```tsx
<SessionControls status={state.status} onStart={session.start} onEnd={requestEnd} />
<EndSessionDialog open={endDialogOpen} onConfirm={confirmEnd} onCancel={cancelEnd} />
```

**Container layout** (current lines 22-23) — preserve, this is the Phase 1 single-column responsive container that D-15 builds on:
```tsx
<main className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-breathing-bg-soft),_var(--color-breathing-bg)_48%,_#f8fffc)] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
  <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-center text-center sm:min-h-[calc(100vh-4rem)]">
```
The `max-w-3xl mx-auto` cap is what UI-SPEC Layout Contract preserves at the `lg` breakpoint.

---

### `src/styles/theme.css` (config, design tokens)

**Analog:** `src/styles/theme.css` (self, lines 1-29). Already exposes the `--color-breathing-*` token set in the `@theme` block (lines 1-9), the `.breathing-shape` class with `transform: scale(var(--breathing-scale, 1))` (line 15), the `[data-phase='out']` swap (lines 18-22), and a baseline `prefers-reduced-motion` guard (lines 24-29).

**Existing `@theme` block** (current lines 1-9) — extend with new tokens per UI-SPEC Token Inventory:
```css
@theme {
  --color-breathing-bg: #f2fbf7;
  --color-breathing-bg-soft: #e4f6ef;
  --color-breathing-surface: #ffffff;
  --color-breathing-accent: #0f766e;
  --color-breathing-accent-strong: #115e59;
  --color-breathing-muted: #64748b;
  --shadow-breathing-card: 0 24px 80px rgb(15 118 110 / 0.12);

  /* NEW Phase 2 tokens (UI-SPEC) */
  --orb-size: clamp(180px, 35vw, 360px);
  --orb-scale-min: 0.58;
  --orb-scale-max: 1.0;
  --orb-scale-mid: 0.79;
  --color-orb-in-from: #ccfbf1;
  --color-orb-in-to: #ecfdf5;
  --color-orb-out-from: #dbeafe;
  --color-orb-out-to: #eef2ff;
  --color-orb-in-text: #134e4a;
  --color-orb-out-text: #1e3a8a;
  --color-ring-outer: rgb(153 246 228 / 0.6);
  --color-ring-inner: rgb(191 219 254 / 0.45);
  --color-modal-backdrop: rgb(15 23 42 / 0.30);
  --color-focus-ring: var(--color-breathing-accent);
}
```

**Critical Tailwind v4 contract** — RESEARCH Pitfall 4: `--color-breathing-accent` auto-generates `bg-breathing-accent`, `ring-breathing-accent`, etc. Do NOT write `ring-color-breathing-accent` (silent failure). Always strip `--color-` prefix.

**Existing `.breathing-shape` class** (current lines 11-22) — replace internals with the orb-layer pattern from RESEARCH Pattern 3:
```css
.orb-layer--in  { background: linear-gradient(135deg, var(--color-orb-in-from), var(--color-orb-in-to)); opacity: 1; transition: opacity 400ms ease-in-out; }
.orb-layer--out { background: linear-gradient(135deg, var(--color-orb-out-from), var(--color-orb-out-to)); opacity: 0; transition: opacity 400ms ease-in-out; }

[data-phase='out'] .orb-layer--in  { opacity: 0; }
[data-phase='out'] .orb-layer--out { opacity: 1; }
```

**Existing reduced-motion guard** (current lines 24-29) — extend to preserve gradient crossfade per D-07 (UI-SPEC Reduced-Motion Contract: "Crossfade timing in the 300-500ms band per D-07 still applies to gradient layers"):
```css
@media (prefers-reduced-motion: reduce) {
  .breathing-shape,
  .orb { transform: none !important; transition: none !important; }
  /* Only the .orb-layer--out opacity crossfade is preserved — it is the phase indicator in reduced-motion (D-07). */
}
```

---

### `vitest.setup.ts` (config, test polyfills)

**Analog:** `vitest.setup.ts` (self, line 1) — currently a single line: `import '@testing-library/jest-dom/vitest'`. Phase 2 extends with two polyfills.

**Authoritative source:** RESEARCH Pitfall 1 + Pitfall 2 + Code Examples ("Polyfill `HTMLDialogElement` In Vitest Setup", lines 583-620 of RESEARCH).

**Add HTMLDialogElement polyfill** (jsdom 29.1.1 gap):
```ts
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () { this.open = true }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (returnValue?: string) {
      this.open = false
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))
    }
  }
}
```

**Add `window.matchMedia` polyfill** (jsdom gap, blocks `usePrefersReducedMotion` tests):
```ts
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,           // default = motion ALLOWED
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
```

---

### `src/app/App.dialog.test.tsx` (test) — NEW (or extend `App.session.test.tsx`)

**Analog:** `src/app/App.session.test.tsx` lines 164-217 — the existing "manual session ending" describe block. It is the closest pattern to what the modal tests must do (start a session, click End session, assert outcome).

**Imports pattern** — match `App.session.test.tsx:1-7` exactly:
```tsx
import '@testing-library/jest-dom/vitest'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'
```
(Drop `act, fireEvent` if not needed; drop `beforeEach/afterEach/vi` if not using fake timers.)

**Helper functions** — match `App.session.test.tsx:9-15`:
```tsx
function settingGroup(name: string) {
  return screen.getByRole('group', { name })
}
```

**Open-end-modal flow pattern** — RESEARCH Code Examples lines 634-644 (matches existing test style):
```tsx
it('opens with focus on Keep going when ending a timed session', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Start session' }))
  await user.click(screen.getByRole('button', { name: 'End session' }))

  const dialog = await screen.findByRole('dialog', { name: 'End this session?' })
  expect(dialog).toBeVisible()
  expect(within(dialog).getByRole('button', { name: 'Keep going' })).toHaveFocus()
})
```

**Open-ended flow pattern** — match `App.session.test.tsx:201-216` (loop to advance Duration to `Open-ended`):
```tsx
const duration = settingGroup('Duration')
const increase = within(duration).getByRole('button', { name: /increase duration/i })
for (let i = 0; i < 11; i += 1) await user.click(increase)
await user.click(screen.getByRole('button', { name: 'Start session' }))
await user.click(screen.getByRole('button', { name: 'End session' }))
expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
```

**Tests that need updating in this phase (not new):**
- `App.session.test.tsx:175-185` — currently spies on `window.confirm` to keep a running session; rewrite to assert the dialog opens, click Keep going, assert session readout still visible.
- `App.session.test.tsx:187-199` — currently spies on `window.confirm` to confirm end; rewrite to click `End` button inside the dialog.
- `App.settings.test.tsx:97-107, 109-121` — currently use `vi.spyOn(window, 'confirm').mockReturnValueOnce(true)` to confirm end; rewrite to click `End` button inside the dialog.
- `App.settings.test.tsx:123-133` — currently asserts BPM/Ratio steppers are present and disabled while running; rewrite to assert they are NOT in the document while running (D-16).
- `App.session.test.tsx:25-27` — currently asserts `In` and `Current phase` inside the readout; if the in-readout phase label is removed (D-03 moves it into the orb), rewrite to assert via the orb (`screen.getByRole('img', { name: 'Breathing shape: In' })` already covered at line 62).

---

## Shared Patterns

### Single-Frame Data Flow (project invariant)
**Source:** `src/hooks/useSessionEngine.ts:23-123`, consumed in `src/app/App.tsx:35-40` (`session.currentFrame` → both `BreathingShape` and `SessionReadout`).
**Apply to:** All Phase 2 visual surfaces (orb, readout, in-orb phase label, gradient crossfade).
**Rule:** `SessionFrame` is the SOLE timing source. The modal does not pause it (D-13, SESS-05). Reduced-motion does not branch the timer — only how the same frame is presented (CSS branch only). No `setInterval`, no parallel `requestAnimationFrame`, no local timer state in `BreathingShape` or `EndSessionDialog`.

### Focus-Visible Ring (D-21)
**Source:** UI-SPEC Focus Ring Contract; replaces the Phase 1 `focus:outline-none focus:ring-4 focus:ring-teal-200` pattern present at:
- `src/components/SettingsStepper.tsx:45, 60`
- `src/components/SessionControls.tsx:15`

**Apply to:** All keyboard-focusable buttons across BreathingShape (none), SettingsStepper (+/− buttons), SessionControls (Start/End), EndSessionDialog (Keep going, End).

**Concrete utility composition (same on every interactive control):**
```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-breathing-accent
focus-visible:ring-offset-2
motion-reduce:transition-none
```
Tailwind v4 generates `ring-breathing-accent` from `--color-breathing-accent` automatically. Fallback: `focus-visible:ring-[var(--color-breathing-accent)]` (RESEARCH Pattern 4 + Pitfall 4).

### Reduced-Motion Guard (D-09)
**Source:** Existing `src/styles/theme.css:24-29` baseline guard; existing `motion-reduce:transition-none` utility on `src/components/BreathingShape.tsx:23`.
**Apply to:** All decorative transitions on buttons (SettingsStepper, SessionControls, EndSessionDialog) and the orb scale transform.
**Rule:** Add `motion-reduce:transition-none` next to every `transition` / `transition-transform` / `transition-colors` utility. The CSS-level guard in `theme.css` adds `transform: none !important; transition: none !important;` to the orb. The gradient crossfade (`.orb-layer--out` opacity) is INTENTIONALLY preserved in reduced-motion (D-07).

### Accessible-Name-First Test Selectors
**Source:** `src/app/App.session.test.tsx` (uses `getByRole('group'/'button'/'region'/'status'/'img', { name: ... })` throughout).
**Apply to:** All new and updated tests (modal, reduced-motion, hide-BPM/ratio, focus-ring).
**Rule:** Query by accessible role + name, not by class names or test IDs. Examples already in repo:
- `screen.getByRole('group', { name: 'BPM' })` (`App.session.test.tsx:9-11`)
- `screen.getByRole('region', { name: 'Session readout' })` (`App.session.test.tsx:14`)
- `screen.getByRole('img', { name: 'Breathing shape: In' })` (`App.session.test.tsx:62`)
- `screen.getByRole('button', { name: 'Start session' })` (`App.session.test.tsx:22`)

For the new modal: `screen.getByRole('dialog', { name: 'End this session?' })` — the `aria-labelledby="end-session-title"` on `<dialog>` makes this work.

### Subscribe + Cleanup `useEffect` Pattern
**Source:** `src/hooks/useSessionEngine.ts:29-57` (rAF subscribe + cleanup); applied to `usePrefersReducedMotion` (matchMedia subscribe + cleanup) and `EndSessionDialog`'s `cancel` event listener.
**Rule:** Set up the subscription inside `useEffect`, return a cleanup function. Use `addEventListener` / `removeEventListener` (modern API), never `addListener` / `removeListener`.

### Conditional Render Over CSS Hide
**Source:** `src/components/BreathingShape.tsx:10-12` (`return null` for idle state); `src/components/SessionReadout.tsx:12-14` (same).
**Apply to:** Hiding BPM/Ratio steppers while running (D-16) — use `{!isRunning && <>...</>}`, NOT `display: none` or `visibility: hidden`.
**Rule (RESEARCH Anti-Patterns):** Conditional render keeps elements out of the accessibility tree and tab order; CSS hide leaves them inconsistently exposed to assistive tech.

### Locked Copy Strings
**Source:** Phase 1 CONTEXT decisions D-11, D-13, D-15, D-16, D-17 + Phase 2 D-11.
**Apply to:** All component text and test selectors.
**Rule (UI-SPEC Copywriting Contract):** Do not change `Start session`, `End session`, `Session complete`, `In`, `Out`, `Open-ended`, `Remaining`, `Elapsed`. New strings: `End this session?`, `End`, `Keep going` (modal). The orb's `aria-label` template is `Breathing shape: ${frame.phaseLabel}` and is asserted in tests — do not change.

---

## No Analog Found

All Phase 2 files have a usable analog in this codebase. The two new files (`EndSessionDialog.tsx`, `usePrefersReducedMotion.ts`) lean on:
- RESEARCH.md authoritative patterns (Pattern 1 for the dialog, Pattern 2 for the hook).
- Adjacent in-repo patterns for styling (SessionReadout panel surface, SessionControls primary button), a11y labelling (SettingsStepper fieldset/legend), and useEffect lifecycle (useSessionEngine).

There is no in-repo modal, no in-repo `matchMedia` consumer, no in-repo SVG/canvas animation. RESEARCH.md fills those gaps with citation-backed patterns.

---

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`, `src/app/`, `src/styles/`, `src/domain/`, `src/index.css`, `vitest.setup.ts`, `vite.config.ts`.
**Files scanned:** 14 source/config + 3 phase artifacts (CONTEXT, RESEARCH, UI-SPEC).
**Pattern extraction date:** 2026-05-09.
**Project skills directory checked:** none present (`.claude/skills/`, `.agents/skills/`).
**Project CLAUDE.md checked:** none at repo root; user-level instructions (RTK proxy) noted but not relevant to pattern mapping.
