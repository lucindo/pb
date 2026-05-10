# Phase 4: Local Memory & Practice Stats — Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 13 new + 1 modified
**Analogs found:** 13 / 13 (one match per new file; App.tsx is the modified file)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/storage/storage.ts` | utility (silent-fallback envelope wrapper) | request-response (sync I/O) | `src/audio/audioEngine.ts` | role-match (function-export module + try/catch silent fallback for D-10/D-16/D-17 parity) |
| `src/storage/settings.ts` | utility (per-field coercion + persistence) | request-response | `src/domain/settings.ts` | role-match (sibling of the existing OPTIONS arrays + validateSettings; non-throwing coerce-not-throw cousin) |
| `src/storage/stats.ts` | service (pure aggregator + threshold gate) | CRUD (load/record/reset) | `src/domain/sessionController.ts` | role-match (pure function-export module; injectable clock — the D-18 mirror of `nowMs` in `startSession(_, nowMs)`) |
| `src/storage/format.ts` | utility (pure presentation formatters) | transform | `src/domain/sessionMath.ts` | role-match (pure transform module sibling to `getSessionFrame`; no I/O, single-purpose helpers) |
| `src/storage/index.ts` | barrel re-export | n/a | (no analog — first barrel in repo) | n/a — adopt simple `export * from` aggregation |
| `src/storage/storage.test.ts` | unit test (failure-path) | test | `src/audio/audioEngine.test.ts` | exact (`vi.stubGlobal` + `afterEach restoreAllMocks` + per-test re-mocking is the established failure-path idiom) |
| `src/storage/settings.test.ts` | unit test | test | `src/domain/sessionController.test.ts` | exact (pure-module unit-test idiom — describe + per-decision `it`, no React, no fixtures) |
| `src/storage/stats.test.ts` | unit test | test | `src/domain/sessionController.test.ts` | exact (same pure-module idiom; uses an injected clock the way controller tests pass `nowMs`) |
| `src/storage/format.test.ts` | unit test | test | `src/audio/cueSynth.test.ts` | role-match (pure-function describe-per-fn idiom, `expect.toBeCloseTo`/exact-string assertions) |
| `src/components/StatsFooter.tsx` | component (presentational) | request-response (props in, callback out) | `src/components/MuteToggle.tsx` | exact (pure presentational component, no hooks, 44×44 hit-area-floor button, theme-token classes — same constraint set as D-13 inline Reset link) |
| `src/components/StatsFooter.test.tsx` | component test | test | `src/components/MuteToggle.test.tsx` | exact (renderToggle factory pattern + role queries + className-regex hit-area assertions) |
| `src/components/ResetStatsDialog.tsx` | component (modal) | event-driven (open / confirm / cancel) | `src/components/EndSessionDialog.tsx` | exact (clone target per R-06 — same `<dialog>` + `useEffect(showModal/close)` + cancel-listener + backdrop-click idiom; locked copy is the only delta) |
| `src/components/ResetStatsDialog.test.tsx` | component test | test | `src/app/App.dialog.test.tsx` (component-level block lines 36-95) | exact (same `renderDialog` factory + role/name queries + default-focus assertion) |
| `src/app/App.tsx` | composition (modified) | event-driven | (self — modify in place) | n/a — additive wiring per R-04/R-05/R-06 |
| `src/app/App.persistence.test.tsx` | integration test | test | `src/app/App.dialog.test.tsx` | exact (full `<App />` render + fake-timers lead-in helper + role-query interactions; pre-seed `localStorage` before `render(<App />)`) |

---

## Pattern Assignments

### `src/storage/storage.ts` (utility, silent-fallback envelope)

**Analog:** `src/audio/audioEngine.ts`
**Why this one:** It is the closest existing example of a "create-or-fall-back-silently" pattern in the repo (D-10 audio failure → D-16/D-17 storage failure are deliberate twins per CONTEXT.md). It is a function-export module (not a class, not a hook) — the same shape R-01 prescribes for `src/storage/`. The factory's reject-on-throw posture maps directly to the read/write try/catch swallow.

**Imports pattern** (audioEngine.ts:22-23) — module-relative imports, type-only when possible:
```typescript
import type { BreathingPlan } from '../domain/breathingPlan'
import { scheduleInCue, scheduleOutCue, scheduleTick, type CueHandle } from './cueSynth'
```
Apply: storage.ts imports nothing from outside `src/storage/`; settings.ts imports types from `../domain/settings` the same way.

**Silent-fallback pattern** (audioEngine.ts:78-80, 18-20 doc, useAudioCues.ts:106-113 caller) — try wraps the whole risky op, catch is comment-only, no logging in production:
```typescript
//   - createAudioEngine throws (rejects) when `new AudioContext()` throws. The caller
//     (useAudioCues) catches and falls back to visuals-only mode.
// useAudioCues.ts:106-113:
} catch {
  // D-10: visuals-only fallback. App.tsx (Plan 04) still drives the visual countdown
  // via setTimeout/RAF chain. The error is intentionally swallowed (T-03-06: no raw
  // stack to user-facing surfaces).
  setAudioAvailable(false)
  setStatus('failed')
  return null
}
```
Apply: `readEnvelope`/`writeEnvelope` swallow ALL throws inside the try block. D-17 explicitly notes `console.warn` is "acceptable but not required" — match Phase 3's posture (silent in production). Optional `import.meta.env.DEV` gate per Open Question 1.

**Module-level constants pattern** (audioEngine.ts:46-57) — `SCREAMING_SNAKE_CASE` exported when needed by callers; module-private `const` otherwise:
```typescript
const MUTE_FADE_TIME_CONSTANT = 0.05
const MIN_GAIN_VALUE = 0.0001
export const LEAD_IN_TICK_INTERVAL_SEC = 1.0
```
Apply: `const KEY = 'hrv:state:v1'` is module-private; if the version literal is reused across files, extract `export const STATE_KEY` / `export const STATE_VERSION` here.

---

### `src/storage/settings.ts` (utility, per-field coerce + load/save)

**Analog:** `src/domain/settings.ts`
**Why this one:** It owns the OPTIONS arrays that R-03 reuses verbatim, and its `validateSettings` is the throwing cousin of the new non-throwing `coerceSettings`. Locating the new file as a sibling-by-name (`storage/settings.ts` vs `domain/settings.ts`) preserves the discoverable mapping a planner expects.

**Imports pattern** (settings.ts has no imports — type definitions only):
```typescript
// New storage/settings.ts must import from domain/settings via relative path:
import {
  BPM_OPTIONS,
  RATIO_OPTIONS,
  DURATION_OPTIONS,
  DEFAULT_SETTINGS,
  type SessionSettings,
  type RatioLabel,
  type DurationOption,
} from '../domain/settings'
```

**Validation pattern to AVOID** (settings.ts:51-65) — the throwing whole-object validator:
```typescript
export function validateSettings(settings: SessionSettings): SessionSettings {
  if (!(BPM_OPTIONS as readonly number[]).includes(settings.bpm)) {
    throw new RangeError(`Unsupported BPM: ${settings.bpm}`)
  }
  // ...
  return { ...settings }
}
```
Apply: D-15 requires per-field fallback — write a separate `coerceSettings(raw: unknown): SessionSettings` that returns `DEFAULT_SETTINGS[field]` on failure rather than throwing. Pitfall 3 calls this out directly. RESEARCH.md R-03 has the literal coerce skeleton (lines 169-204).

**OPTIONS-array casting pattern** (settings.ts:52, 60) — readonly tuple cast for `.includes` on `unknown`:
```typescript
if (!(BPM_OPTIONS as readonly number[]).includes(settings.bpm)) { ... }
if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(settings.durationMinutes)) { ... }
```
Apply: same exact cast in the per-field type guards (`isValidBpm`, `isValidRatio`, `isValidDuration`).

**Default literal reuse pattern** (settings.ts:45-49):
```typescript
export const DEFAULT_SETTINGS: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}
```
Apply: `coerceSettings` returns `DEFAULT_SETTINGS.<field>` for missing/invalid fields — never re-declare the literals (D-15 explicit).

---

### `src/storage/stats.ts` (service, CRUD aggregator)

**Analog:** `src/domain/sessionController.ts`
**Why this one:** Pure function-export module, injectable timestamp param (`nowMs`), state-transition functions (`startSession` / `endSession` / `extendTimedSession` / `completeIfNeeded`) — the exact shape the stats aggregator follows (`loadStats` / `recordSession` / `resetStats`). It is also the existing testability pattern D-18 explicitly mirrors.

**Imports pattern** (sessionController.ts:1-5) — type-only imports for non-runtime values, named imports for runtime:
```typescript
import type { BreathingPlan } from './breathingPlan'
import { createBreathingPlan } from './breathingPlan'
import type { SessionFrame } from './sessionMath'
import { getSessionFrame } from './sessionMath'
import type { SessionSettings } from './settings'
```
Apply: stats.ts imports `type { PersistedStats, StorageDeps }` from `./storage` and runtime helpers (`readEnvelope`, `writeEnvelope`) from the same module.

**Injectable-clock pattern** (sessionController.ts:38, 90-93) — `nowMs: number` as the second param, no `Date.now` ambient access:
```typescript
export function startSession(selectedSettings: SessionSettings, nowMs: number): RunningSessionState {
  // ...
  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),
    lockedSettings,
    plan,
    startedAtMs: nowMs,
    lastFrame: getSessionFrame(plan, 0),
  }
}

export function completeIfNeeded(
  state: RunningSessionState,
  nowMs: number,
): RunningSessionState | CompleteSessionState { ... }
```
Apply: `recordSession(elapsedMs, isComplete, deps?: StorageDeps)` reads the timestamp via `deps.now ?? Date.now`. RESEARCH R-04 (lines 287-307) has the literal aggregator skeleton including the threshold gate.

**Pure-function + immutable-return pattern** (sessionController.ts:34-36, 38-50) — never mutate input, always clone-on-output:
```typescript
function cloneSettings(settings: SessionSettings): SessionSettings {
  return { ...settings }
}
export function startSession(selectedSettings: SessionSettings, nowMs: number): RunningSessionState {
  const lockedSettings = cloneSettings(selectedSettings)
  // ...
}
```
Apply: `recordSession` reads existing stats via `loadStats(deps)`, builds a new object literal, writes the updated envelope, and returns the new `PersistedStats` (no in-place mutation of the previous value).

**Threshold-as-named-constant pattern** (sessionController.ts has no analog; align with audioEngine.ts:54-57 instead):
```typescript
export const LEAD_IN_DURATION_SEC = 3.0  // SCREAMING_SNAKE for module-level constants
```
Apply: `const COUNT_THRESHOLD_MS = 30_000` at module top with a comment citing D-01.

---

### `src/storage/format.ts` (utility, pure formatters)

**Analog:** `src/domain/sessionMath.ts` (function-export pure-transform module — same shape: input → derived display value, no side effects)

**Why this one:** The most-similar repo example of a "render-time format helper" module is sessionMath's `getSessionFrame` — same pattern: pure function in, formatted/derived value out, no I/O. Format.ts is even simpler (one line per fn), but the module-shape precedent (no class, no hook, just exports) is identical.

**Module shape** (sessionMath.ts: ~70 lines of pure helpers):
```typescript
// One file = many small pure exports. Each fn is independently testable.
export function getSessionFrame(plan: BreathingPlan, elapsedMs: number): SessionFrame { ... }
```
Apply: `formatTotalMinutes`, `formatSessionCount`, `formatLastSessionDate`, `formatLastSessionDuration`, `formatLastSession` are all top-level exports in one file. RESEARCH lines 676-719 have the literal implementations.

**`Intl.DateTimeFormat` cached at module scope:** No existing analog in repo (this phase introduces the pattern). RESEARCH lines 678-686 specify caching the formatter at module scope (one allocation per app load, not per render):
```typescript
const DATE_FMT_SAME_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})
```

---

### `src/storage/index.ts` (barrel re-export)

**Analog:** No existing barrel in repo — adopt the simplest possible form.
```typescript
export * from './storage'
export * from './settings'
export * from './stats'
export * from './format'
```
Justification: keeps consumer imports terse (`from '../storage'`) and centralises the public surface for the App.tsx wiring step.

---

### `src/storage/storage.test.ts` (unit test, failure-path)

**Analog:** `src/audio/audioEngine.test.ts`
**Why this one:** Same failure-path pattern: `vi.stubGlobal('AudioContext', class { constructor() { throw … } })` is the exact analog of `vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw … })`. Both prove the silent-absorb contract.

**Imports + setup pattern** (audioEngine.test.ts:1-9, 56-59):
```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BreathingPlan } from '../domain/breathingPlan'
import { createAudioEngine } from './audioEngine'

describe('audioEngine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
  // ...
})
```
Apply: `beforeEach(() => window.localStorage.clear())` + `afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })`. RESEARCH R-07 lines 414-426.

**Failure-path injection pattern** (audioEngine.test.ts:72-79):
```typescript
it('createAudioEngine rejects when AudioContext construction throws (D-10 anchor)', async () => {
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        throw new Error('blocked')
      }
    },
  )
  // assert reject behavior
})
```
Apply with `Storage.prototype` shim:
```typescript
vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
  const e = new Error('quota')
  e.name = 'QuotaExceededError'
  throw e
})
expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
```
RESEARCH R-07 lines 429-457 have the four required failure-path tests (quota write, corrupt JSON read, getItem throw, getItem returns garbage).

---

### `src/storage/settings.test.ts` and `src/storage/stats.test.ts` (unit tests)

**Analog:** `src/domain/sessionController.test.ts`
**Why this one:** Pure-module unit-test idiom — no React, no rendering, no fake timers, no Storage shim beyond per-test `localStorage.clear()`. Each `it(...)` exercises one branch (D-01 threshold, D-02 aggregation, D-15 per-field fallback, etc).

**Test-data factory pattern** (sessionController.test.ts:11-15):
```typescript
const baseSettings: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}
```
Apply: `const baseStats: PersistedStats = { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null }` at the top of stats.test.ts; `const validRaw = { bpm: 4, ratio: '40:60', durationMinutes: 10 }` etc in settings.test.ts.

**Decision-tagged test names pattern** (sessionController.test.ts:18, 33, 43) — each `it` cites the requirement/decision it covers:
```typescript
it('locks BPM and ratio when starting so later selected settings cannot mutate the running plan', () => { ... })
it('completes timed sessions with the required message when total duration is reached', () => { ... })
```
Apply: `it('records a session below 30 s as no-op (D-01)', ...)`, `it('counts a sub-30 s completion bypass (D-01 second clause)', ...)`, etc — see RESEARCH "Phase Requirements → Test Map" lines 798-816 for the full list.

**Injected-clock pattern** (no current direct analog — all sessionController tests pass `nowMs` literally):
```typescript
const running = startSession(baseSettings, 1_000)
const complete = completeIfNeeded(running, 2_000 + completionMs)
```
Apply (D-18): pass `{ now: () => 1_700_000_000_000 }` as the deps argument:
```typescript
recordSession(60_000, false, { now: () => 1_700_000_000_000 })
expect(loadStats().lastSessionAtMs).toBe(1_700_000_000_000)
```
RESEARCH R-07 lines 460-466.

---

### `src/storage/format.test.ts` (unit test, pure formatters)

**Analog:** `src/audio/cueSynth.test.ts`
**Why this one:** Pure-function describe-per-fn idiom — each formatter has a small section in `describe('formatter-name', ...)` with `it(...)` per branch (the < 60 / ≥ 60 split, the same-year / other-year split, the singular/plural split).

**Pattern** (cueSynth.test.ts:15-52):
```typescript
describe('cueSynth', () => {
  it('scheduleInCue creates 3 oscillator partials', () => { ... })
  it('scheduleInCue uses fundamental 440 Hz and partial ratios 2.76 and 5.40', () => { ... })
})
```
Apply:
```typescript
describe('formatTotalMinutes', () => {
  it('renders < 60 minutes as "47 min" (D-06)', () => {
    expect(formatTotalMinutes(47 * 60)).toBe('47 min')
  })
  it('renders ≥ 60 minutes as "2.1 hours" with one decimal (D-06)', () => {
    expect(formatTotalMinutes(126 * 60)).toBe('2.1 hours')
  })
})
```

---

### `src/components/StatsFooter.tsx` (component, presentational)

**Analog:** `src/components/MuteToggle.tsx`
**Why this one:** Identical constraint set: pure presentational component, no hooks, props in / callback out, theme-token Tailwind classes, 44×44 hit-area floor (Phase 2 D-17 — Phase 4 D-13 cites this exact constraint), focus-visible ring matching the Phase 2/3 baseline.

**File header + props pattern** (MuteToggle.tsx:1-14):
```typescript
// Phase 3 D-05/D-06/D-07/D-10/D-17: inline icon-button toggle for the audio cues.
// Pure presentational layer — receives props from App.tsx (Plan 04) and emits a
// click callback. No hook calls, no AudioContext access.

export interface MuteToggleProps {
  muted: boolean
  audioAvailable: boolean
  onToggle(): void
}
```
Apply:
```typescript
// Phase 4 D-08/D-09/D-10/D-13: footer strip below the main card. Pure presentational
// — receives stats + onResetClick from App.tsx; gating (inSessionView, totalSessions > 0)
// is the parent's responsibility.

export interface StatsFooterProps {
  stats: PersistedStats
  onResetClick(): void
}
```

**44×44 hit-area-floor button pattern** (MuteToggle.tsx:34) — `min-h-11 min-w-11` (44 px = 11×4) classes paired with `focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2`:
```typescript
className="grid size-11 min-h-11 min-w-11 place-items-center rounded-full border border-teal-200 bg-white text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
```
Apply (D-13 inline reset link — RESEARCH R-05 lines 350-358):
```tsx
<button
  type="button"
  onClick={onResetClick}
  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 underline underline-offset-2 text-[var(--color-breathing-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
>
  Reset
</button>
```
The padded hit area expands beyond the visible label without enlarging the visible "Reset" text.

**Theme-token import pattern** (theme.css exposes `--color-breathing-accent`, `--color-breathing-muted`):
```tsx
className="text-[var(--color-breathing-muted)]"
```
Apply: footer body uses `text-[var(--color-breathing-muted)]` for low-emphasis tone; the Reset link uses `text-[var(--color-breathing-accent)]`. No new tokens needed.

---

### `src/components/StatsFooter.test.tsx` (component test)

**Analog:** `src/components/MuteToggle.test.tsx`
**Why this one:** Exact mirror — pure presentational component, render with explicit props, query by role/name, assert classNames for layout / hit-area / focus tokens.

**Render-helper factory** (MuteToggle.test.tsx:8-18):
```typescript
function renderToggle(props: Partial<MuteToggleProps> = {}) {
  const onToggle = props.onToggle ?? vi.fn()
  const utils = render(
    <MuteToggle
      muted={props.muted ?? false}
      audioAvailable={props.audioAvailable ?? true}
      onToggle={onToggle}
    />,
  )
  return { ...utils, onToggle }
}
```
Apply: `function renderFooter(props: Partial<StatsFooterProps> = {}) { ... }` returning `{ onResetClick, ... }`.

**Hit-area assertion pattern** (MuteToggle.test.tsx:64-69):
```typescript
it('button has the 44 px hit-area floor classes (size-11 / min-h-11 / min-w-11)', () => {
  renderToggle()
  const button = screen.getByRole('button')
  expect(button.className).toMatch(/size-11/)
  expect(button.className).toMatch(/min-h-11/)
  expect(button.className).toMatch(/min-w-11/)
})
```
Apply: assert `min-h-\[44px\]` and `min-w-\[44px\]` regex matches on the Reset button (D-13).

**Click → callback pattern** (MuteToggle.test.tsx:50-55):
```typescript
it('clicking while audioAvailable=true invokes onToggle exactly once', async () => {
  const user = userEvent.setup()
  const { onToggle } = renderToggle({ muted: false, audioAvailable: true })
  await user.click(screen.getByRole('button', { name: 'Mute audio cues' }))
  expect(onToggle).toHaveBeenCalledTimes(1)
})
```
Apply: identical structure for `onResetClick` invocation when "Reset" is clicked.

---

### `src/components/ResetStatsDialog.tsx` (component, modal)

**Analog:** `src/components/EndSessionDialog.tsx`
**Why this one:** R-06 explicitly mandates "clone don't extract" — the new dialog is a near-byte-for-byte copy with the strings swapped. Cloning preserves the Phase 2 validated behavior of EndSessionDialog without extracting a generic `ConfirmDialog` (deferred until a third confirmation appears).

**Imports + props pattern** (EndSessionDialog.tsx:1-7):
```typescript
import { useEffect, useRef, type MouseEventHandler } from 'react'

export interface EndSessionDialogProps {
  open: boolean
  onConfirm(): void
  onCancel(): void
}
```
Apply (identical shape, renamed):
```typescript
export interface ResetStatsDialogProps {
  open: boolean
  onConfirm(): void
  onCancel(): void
}
```

**`<dialog>` open/close + default-focus pattern** (EndSessionDialog.tsx:15-24):
```typescript
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  if (open && !dialog.open) {
    dialog.showModal()
    cancelButtonRef.current?.focus()  // D-12: default focus on cancel
  } else if (!open && dialog.open) {
    dialog.close()
  }
}, [open])
```
Apply VERBATIM. D-12 default-focus-on-Keep is preserved (now Keep button reads "Keep", same default-focus-on-cancel safety stance).

**Cancel listener (Esc support) pattern** (EndSessionDialog.tsx:28-39):
```typescript
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  const handleCancel = (event: Event) => {
    event.preventDefault()
    onCancel()
  }
  dialog.addEventListener('cancel', handleCancel)
  return () => {
    dialog.removeEventListener('cancel', handleCancel)
  }
}, [onCancel])
```
Apply VERBATIM.

**Backdrop-click pattern** (EndSessionDialog.tsx:43-47):
```typescript
const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
  if (event.target === dialogRef.current) {
    onCancel()
  }
}
```
Apply VERBATIM.

**JSX structure** (EndSessionDialog.tsx:49-88) — copy then swap the three locked strings:
- title `End this session?` → `Reset practice stats?`
- primary button `End` → `Reset`
- cancel button `Keep going` → `Keep`
- `aria-labelledby="end-session-title"` and `id="end-session-title"` → `reset-stats-title`

Keep the same red destructive styling on the primary button (Reset is also irreversible per R-06).

---

### `src/components/ResetStatsDialog.test.tsx` (component test)

**Analog:** `src/app/App.dialog.test.tsx` (the component-level `describe` block lines 36-95, NOT the App-level integration block above it)

**Why this one:** That block is the existing `EndSessionDialog`-only test surface — `renderDialog` factory, role queries, default-focus assertion, locked-copy assertions. Phase 4 needs the same structure for `ResetStatsDialog`.

**Render-helper pattern** (App.dialog.test.tsx:25-34):
```typescript
function renderDialog(
  props: Partial<{ open: boolean; onConfirm: () => void; onCancel: () => void }> = {},
) {
  const onConfirm = props.onConfirm ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <EndSessionDialog open={props.open ?? false} onConfirm={onConfirm} onCancel={onCancel} />,
  )
  return { ...utils, onConfirm, onCancel }
}
```
Apply: same factory, swap `EndSessionDialog` → `ResetStatsDialog`.

**Default-focus assertion** (App.dialog.test.tsx:49-55):
```typescript
it('opens with focus on Keep going when open=true', () => {
  renderDialog({ open: true })
  const dialog = screen.getByRole('dialog', { name: 'End this session?' }) as HTMLDialogElement
  expect(dialog.open).toBe(true)
  expect(screen.getByRole('button', { name: 'Keep going' })).toHaveFocus()
})
```
Apply: assert `getByRole('button', { name: 'Keep' })` has focus when `<ResetStatsDialog open />` mounts (D-12).

**Closed-dialog assertion (anti-flake)** (App.dialog.test.tsx:36-47) — the IN-03 fix that proves the dialog is actually closed:
```typescript
it('does not show the modal when open=false', () => {
  const { container } = renderDialog({ open: false })
  const dialog = container.querySelector('dialog')
  expect(dialog).not.toBeNull()
  expect((dialog as HTMLDialogElement).open).toBe(false)
})
```
Apply VERBATIM — query the raw `<dialog>` rather than `getByRole` (closed dialogs have no role).

**Locked-copy assertions** (App.dialog.test.tsx:68-74):
```typescript
it('renders the End and Keep going buttons with locked copy', () => {
  renderDialog({ open: true })
  expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Keep going' })).toBeVisible()
  expect(screen.getByText('End this session?')).toBeVisible()
})
```
Apply: assert `Reset`, `Keep`, `Reset practice stats?` (D-12 locked copy).

---

### `src/app/App.tsx` (modified — composition)

**No analog — modify in place.** Treat this as additive wiring per RESEARCH R-04, R-05, R-06.

**Mount-time restore pattern** (insertion point: top of `App()` body, line ~22 before `useSessionEngine()` call):
```typescript
const initialSettings = useMemo(() => loadSettings(), [])
const initialMute = useMemo(() => loadMute(), [])

const session = useSessionEngine(initialSettings)  // CHANGED: was useSessionEngine() with default
```
RESEARCH Pattern 2 lines 583-599. Note `useSessionEngine.ts:23` already accepts `initialSettings` defaulting to `DEFAULT_SETTINGS` — no hook signature change needed.

**Mute restore via mount-only effect** (App.tsx:90-95 already has the pattern of one-shot effects keyed on a state predicate — adapt for `[]`):
```typescript
useEffect(() => {
  if (initialMute) audio.setMuted(true)
}, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount-only restore
```

**Wrapped persisted setters** (App.tsx:174 already has the `useCallback` deps shape — `[appPhase, state.selectedSettings, audioStart, audioStop, session, clearLeadInTimeouts]`):
```typescript
const persistedSetSettings = useCallback((next: SessionSettings) => {
  session.setSelectedSettings(next)
  saveSettings(next)
}, [session.setSelectedSettings])

const persistedSetMuted = useCallback((next: boolean) => {
  audio.setMuted(next)
  saveMute(next)
}, [audio.setMuted])
```
Replace `onChange={session.setSelectedSettings}` (App.tsx:326) with `onChange={persistedSetSettings}` and `onMuteToggle={() => audio.setMuted(!audio.muted)}` (App.tsx:335) with `onMuteToggle={() => persistedSetMuted(!audio.muted)}`.

**Single-write-site stats pattern** (modify the existing cleanup effect at App.tsx:217-232) — add the snapshot ref + recorded-key guard from RESEARCH R-04 (lines 256-280):
```typescript
const recordedSessionKeyRef = useRef<string | null>(null)
const runningSnapshotRef = useRef<{ key: string; startedAtMs: number; lastElapsedMs: number } | null>(null)

// Update the snapshot every render WHILE running (use a separate effect so the
// cleanup effect's read happens FIRST):
useEffect(() => {
  if (state.status === 'running') {
    runningSnapshotRef.current = {
      key: String(state.startedAtMs),
      startedAtMs: state.startedAtMs,
      lastElapsedMs: state.lastFrame.elapsedMs,
    }
  }
}, [state])

// Augment the EXISTING cleanup effect at line 217-232:
useEffect(() => {
  if (state.status !== 'running') {
    void audioStop()
    setAppPhase('idle')
    clearLeadInTimeouts()
    audioAnchorRef.current = null
    planRef.current = null
    lastBoundaryKeyRef.current = null

    // NEW Phase 4 stats write — single site (Pitfall 1).
    const snap = runningSnapshotRef.current
    if (snap && recordedSessionKeyRef.current !== snap.key) {
      const elapsedMs = state.status === 'complete'
        ? state.completedAtMs - snap.startedAtMs
        : snap.lastElapsedMs
      const updated = recordSession(elapsedMs, state.status === 'complete')
      setStats(updated)
      recordedSessionKeyRef.current = snap.key
    }
    runningSnapshotRef.current = null
  }
}, [state.status, audioStop, clearLeadInTimeouts])
```
**Critical:** stats are written ONLY in the cleanup effect — NEVER in `requestEnd` (line 182) or `confirmEnd` (line 200). Pitfall 1 (RESEARCH lines 639-643) explicitly warns against the double-write.

**Cancel-during-lead-in NO-WRITE pattern** — the existing branch at App.tsx:111-123 already does the right thing because `state.status` is still `'idle'` during lead-in (not `'running'`), so `runningSnapshotRef` was never populated and the cleanup effect's snap-null guard skips the write. D-03 is satisfied without new code. Pitfall 2 (RESEARCH lines 644-648).

**Stats-footer + reset-dialog wiring** — render below the main card div at App.tsx:307-341, sibling to `<EndSessionDialog>` at line 343:
```tsx
<div className="...rounded-[2rem]...">{/* existing main card */}</div>

{/* NEW Phase 4 footer */}
{!inSessionView && stats.totalSessions > 0 && (
  <StatsFooter stats={stats} onResetClick={() => setResetDialogOpen(true)} />
)}

{/* ... existing </section>, </main>, EndSessionDialog ... */}
<ResetStatsDialog
  open={resetDialogOpen}
  onConfirm={confirmReset}
  onCancel={cancelReset}
/>
```
RESEARCH R-05 lines 322-339 + R-06 lines 382-401.

---

### `src/app/App.persistence.test.tsx` (integration test)

**Analog:** `src/app/App.dialog.test.tsx`
**Why this one:** Same shape — full `<App />` render, `vi.useFakeTimers()` + lead-in helper, role-query interactions. Phase 4 layers in `localStorage` pre-seeding before render.

**Imports + lead-in helper pattern** (App.dialog.test.tsx:1-23):
```typescript
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const LEAD_IN_MS = 3000

async function startAndAdvancePastLeadIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(LEAD_IN_MS)
  })
}
```
Apply VERBATIM.

**Pre-seed `localStorage` BEFORE render** (no current analog — RESEARCH R-07 lines 471-474):
```typescript
beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  window.localStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('restores persisted settings on mount (LOCL-01)', () => {
  window.localStorage.setItem('hrv:state:v1', JSON.stringify({
    version: 1,
    settings: { bpm: 4, ratio: '50:50', durationMinutes: 5 },
    mute: true,
    stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null },
  }))
  render(<App />)
  expect(screen.getByRole('button', { name: 'Unmute audio cues' })).toBeInTheDocument()
  // ...assert restored stepper values
})
```

**Required test cases** (RESEARCH "Phase Requirements → Test Map" lines 798-816 + R-07 line 471-474):
1. Restore on mount: settings + mute (LOCL-01)
2. Stats record on completion (LOCL-02 — fake timers driven through to complete)
3. Stats record on manual End mid-session (D-04, D-01)
4. Stats DO NOT record on cancel-during-lead-in (D-03)
5. No double-write between cleanup effect and confirmEnd (Pitfall 1)
6. Stats footer hidden during inSessionView (D-10)
7. Stats footer hidden when totalSessions=0 (D-09)
8. Reset clears stats and re-hides footer (LOCL-03)

---

## Shared Patterns

### Silent Failure Absorption (D-16, D-17)
**Source pattern:** `src/audio/audioEngine.ts:18-20` (doc), `src/hooks/useAudioCues.ts:106-113` (catch site)
**Apply to:** All `src/storage/*.ts` modules (`storage.ts` read/write, `settings.ts` load/save, `stats.ts` load/record/reset)
```typescript
// Phase 3 D-10 / Phase 4 D-16/D-17 — silent fallback in catch:
} catch {
  // Intentional swallow. Caller must continue with in-memory defaults.
  return DEFAULT_STATE
}
```

### Injected Clock for Determinism (D-18)
**Source:** `src/domain/sessionController.ts:38, 90-93` (`nowMs: number` second param)
**Apply to:** `src/storage/stats.ts` (`recordSession(elapsedMs, isComplete, deps?: StorageDeps)` where `deps.now` defaults to `Date.now`); `src/storage/format.ts` (`formatLastSessionDate(atMs, now = Date.now)`)
```typescript
export interface StorageDeps {
  now?: () => number       // D-18
  storage?: Storage        // optional fake (rare — jsdom Storage is enough)
}
```

### 44×44 Hit-Area Floor (Phase 2 D-17 → Phase 4 D-13)
**Source:** `src/components/MuteToggle.tsx:34` (`min-h-11 min-w-11` Tailwind classes)
**Apply to:** Reset link in `src/components/StatsFooter.tsx`. Use `min-h-[44px] min-w-[44px]` (the existing `min-h-11`/`min-w-11` are equivalent — both yield 44 px since Tailwind's spacing scale is 4 px per unit). Hit-area floor must be enforced via padded tap-target around the visible inline label, NOT by enlarging the visible text (D-13).

### Theme Token Usage
**Source:** `src/styles/theme.css:7-9` (`--color-breathing-accent`, `--color-breathing-muted`)
**Apply to:** `src/components/StatsFooter.tsx` body uses `text-[var(--color-breathing-muted)]` for low-emphasis copy; the Reset link uses `text-[var(--color-breathing-accent)]`. NO new theme tokens required (verified — RESEARCH line 39).

### `<dialog>` Modal Pattern with Default-Focus Safety
**Source:** `src/components/EndSessionDialog.tsx:1-89` (entire file)
**Apply to:** `src/components/ResetStatsDialog.tsx` — clone the entire pattern verbatim, swap only the three locked strings (title, primary, cancel) and the `aria-labelledby` id.

### Per-test `localStorage.clear()` (jsdom built-in)
**Source:** No existing analog — added by Phase 4. `vitest.setup.ts` is intentionally untouched (RESEARCH line 469: "Adding a global localStorage stub would *reduce* fidelity vs. the real jsdom Storage").
**Apply to:** Every storage-touching `*.test.ts(x)` file:
```typescript
beforeEach(() => window.localStorage.clear())
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })
```

### Decision-tagged Test Names
**Source:** `src/domain/sessionController.test.ts` (per-it test names cite the decision/requirement)
**Apply to:** All Phase 4 unit + integration tests. Format: `it('records a session below 30 s as no-op (D-01)', ...)`.

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `src/storage/index.ts` | barrel re-export | No barrel exists in repo today — adopt simple `export *` form (4 lines). |
| `Intl.DateTimeFormat` cached at module scope (in `src/storage/format.ts`) | utility detail | First use of `Intl.*` in codebase. Pattern is straightforward and self-evident from RESEARCH lines 678-686. |

Both gaps are mechanical and fully specified by RESEARCH; planner can use the literal code blocks in 04-RESEARCH.md (R-01 module layout for the barrel; "Code Examples — Date formatting" lines 676-719 for the formatter file) as the reference instead of a codebase analog.

---

## Metadata

**Analog search scope:**
- `src/audio/` (audioEngine, cueSynth + tests — silent-failure + factory + pure-builder patterns)
- `src/components/` (MuteToggle, EndSessionDialog, SettingsForm + their tests — presentational + dialog + form patterns)
- `src/domain/` (settings, sessionController, sessionMath + tests — pure-module + injectable-clock + OPTIONS-array patterns)
- `src/hooks/` (useSessionEngine, useAudioCues — composition seams referenced by App.tsx)
- `src/app/` (App.tsx + dialog/session/audio/settings test files — integration test patterns, App-level event handler shapes)
- `src/styles/theme.css` (token availability)
- `vitest.setup.ts` (polyfill scope verification)

**Files scanned:** 23
**Pattern extraction date:** 2026-05-10
