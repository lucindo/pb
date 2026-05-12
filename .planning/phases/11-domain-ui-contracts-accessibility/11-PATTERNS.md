# Phase 11: Domain, UI Contracts & Accessibility — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 10 (6 modified, 1 new, 3 test files)
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/sessionController.ts` | domain | request-response | `src/domain/settings.ts` (validateSettings) | exact — same allowlist throw pattern |
| `src/domain/sessionController.test.ts` | test | — | itself (lines 79-93 extendTimedSession block) | exact — extend existing describe |
| `src/components/SessionReadout.tsx` | component | request-response | itself + `src/components/MuteToggle.tsx` | exact — prop-flag conditional branch pattern |
| `src/components/SessionReadout.test.tsx` (NEW) | test | — | `src/components/MuteToggle.test.tsx` | role-match — same renderHelper + RTL assertion shape |
| `src/components/MuteToggle.tsx` | component | request-response | itself (line 37 ternary) | exact — conditional attribute pattern |
| `src/components/MuteToggle.test.tsx` | test | — | itself (lines 111-141 needsResume block) | exact — extend existing describe |
| `src/components/SessionControls.tsx` | component | request-response | itself (needsResume forwarding at lines 68-73) | exact — piggyback on existing prop-forwarding |
| `src/app/App.tsx` (UI-01 wiring) | app/controller | request-response | `src/app/App.tsx:583` (status override hack) | exact — replace hack with prop |
| `src/app/App.tsx` (UI-02 effect) | app/controller | event-driven | `src/app/App.tsx:247-253` (EndSessionDialog effect) | exact — subscribe-and-reflect mirror |
| `src/app/App.tsx` (A11Y-01 id) | app/controller | request-response | `src/app/App.tsx:605-611` (aria-live region) | exact — add id to existing element |
| `src/app/App.dialog.test.tsx` | test | — | itself (line 259, WR-01 auto-close case) | exact — mirror setup + assertion shape |

---

## Pattern Assignments

### `src/domain/sessionController.ts` — DOMAIN-01 allowlist throw

**Modification:** Add allowlist check inside `extendTimedSession` at line 67 (after the open-ended throw at line 63, before the `Number.isFinite` check at line 67).

**Analog:** `src/domain/settings.ts` — `validateSettings` function

**Import pattern to add** (widen existing import at line 5):
```typescript
// Current (line 5):
import type { SessionSettings } from './settings'
// Add DURATION_OPTIONS and DurationOption to the same import:
import type { DurationOption, SessionSettings } from './settings'
import { DURATION_OPTIONS } from './settings'
```

**Allowlist assertion pattern** (`src/domain/settings.ts` lines 59-61):
```typescript
if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(settings.durationMinutes)) {
  throw new RangeError(`Unsupported duration: ${String(settings.durationMinutes)}`)
}
```

**New throw to insert** between lines 65 and 67 of `sessionController.ts`:
```typescript
// After line 65 (open-ended throw):
if (state.lockedSettings.durationMinutes === 'open-ended') {
  throw new RangeError('Open-ended sessions cannot be converted while running')
}

// NEW — D-01/D-02: allowlist check fires BEFORE the numeric comparison
if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(durationMinutes)) {
  throw new RangeError('durationMinutes must be one of DURATION_OPTIONS')
}

// EXISTING — unchanged (was line 67, now line 70+):
if (!Number.isFinite(durationMinutes) || durationMinutes <= state.lockedSettings.durationMinutes) {
  throw new RangeError('Timed sessions can only be extended to a greater finite duration')
}
```

**Core pattern context** (`src/domain/sessionController.ts` lines 59-69 current):
```typescript
export function extendTimedSession(
  state: RunningSessionState,
  durationMinutes: number,
): RunningSessionState {
  if (state.lockedSettings.durationMinutes === 'open-ended') {
    throw new RangeError('Open-ended sessions cannot be converted while running')
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= state.lockedSettings.durationMinutes) {
    throw new RangeError('Timed sessions can only be extended to a greater finite duration')
  }
```

---

### `src/domain/sessionController.test.ts` — DOMAIN-01 new test case

**Modification:** Extend the `extendTimedSession` describe block at lines 79-94 with one new case for a non-allowlist finite numeric value.

**Existing block** (lines 79-94, current — preserve verbatim):
```typescript
it('extends only timed running sessions to greater finite durations', () => {
  const running = startSession({ ...baseSettings, durationMinutes: 10 }, 0)

  const extended = extendTimedSession(running, 15)

  expect(extended.selectedSettings.durationMinutes).toBe(15)
  expect(extended.lockedSettings.durationMinutes).toBe(15)
  expect(extended.plan.totalMs).toBe(15 * 60_000)

  expect(() => extendTimedSession(extended, 15)).toThrow(RangeError)
  expect(() => extendTimedSession(extended, 10)).toThrow(RangeError)
  expect(() => extendTimedSession(extended, Number.POSITIVE_INFINITY)).toThrow(RangeError)

  const openEnded = startSession({ ...baseSettings, durationMinutes: 'open-ended' }, 0)
  expect(() => extendTimedSession(openEnded, 60)).toThrow(RangeError)
})
```

**New case to append** (D-03 — non-allowlist finite numeric; mirrors `expect(() => ...).toThrow(RangeError)` shape above):
```typescript
it('throws RangeError for a finite durationMinutes not in DURATION_OPTIONS (D-01 allowlist boundary)', () => {
  const running = startSession({ ...baseSettings, durationMinutes: 10 }, 0)
  // 7 is finite but not in DURATION_OPTIONS (which contains 5,10,15,...,60,'open-ended')
  expect(() => extendTimedSession(running, 7)).toThrow(RangeError)
})
```

**Import pattern** (current line 1-9 — no change needed; DURATION_OPTIONS is not used in the test directly):
```typescript
import { describe, expect, it } from 'vitest'

import type { SessionSettings } from './settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
} from './sessionController'
```

---

### `src/components/SessionReadout.tsx` — UI-01 isLeadInPlaceholder prop

**Modification:** (1) Add `isLeadInPlaceholder?: boolean` to `SessionReadoutProps`; (2) add early-branch render before line 12's idle/null/undefined early-return.

**Current props interface** (lines 5-9):
```typescript
export interface SessionReadoutProps {
  frame: SessionFrame | null
  status: SessionStatus
  message?: 'Session complete'
}
```

**New props interface** (D-04):
```typescript
export interface SessionReadoutProps {
  frame: SessionFrame | null
  status: SessionStatus
  message?: 'Session complete'
  /** When true, component is rendering the pre-session lead-in placeholder.
   *  The caller commits to providing a non-null `frame`.
   *  The component renders the timer chip (label + formatted duration) ignoring
   *  `status` and `message`. See UI-01 / WR-08. */
  isLeadInPlaceholder?: boolean
}
```

**Current component head** (lines 11-21):
```typescript
export function SessionReadout({ frame, status, message }: SessionReadoutProps) {
  if (status === 'idle' && frame === null && message === undefined) {
    return null
  }

  const timeLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'
  const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'
  const showTimeChip = status !== 'complete' && frame !== null
```

**New component head** (D-05 — isLeadInPlaceholder branch lands FIRST):
```typescript
export function SessionReadout({ frame, status, message, isLeadInPlaceholder }: SessionReadoutProps) {
  // UI-01 / WR-08: lead-in placeholder — render timer chip unconditionally,
  // ignoring status and message. Caller commits to non-null frame when this is true.
  if (isLeadInPlaceholder) {
    const timeLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'
    const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'
    return (
      <section
        aria-label="Session readout"
        className="mb-6 rounded-[1.75rem] border border-teal-100 bg-teal-50/80 p-5 text-center shadow-inner shadow-teal-900/5"
      >
        <div role="status" aria-label="Session announcement" aria-live="polite" aria-atomic="true" />
        <div
          aria-live="off"
          className="mt-4 inline-flex items-baseline gap-3 rounded-full bg-white/80 px-5 py-3 text-slate-900"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
            {timeLabel}
          </span>
          <span className="font-mono text-2xl font-semibold">{timeValue}</span>
        </div>
      </section>
    )
  }

  if (status === 'idle' && frame === null && message === undefined) {
    return null
  }
  // ... rest unchanged
```

**Existing showTimeChip pattern** (lines 16-21 — unchanged; `isLeadInPlaceholder` branch returns early so this code is only reached when `isLeadInPlaceholder` is false/absent):
```typescript
  const timeLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'
  const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'
  const showTimeChip = status !== 'complete' && frame !== null
```

---

### `src/components/SessionReadout.test.tsx` (NEW) — UI-01 tests

**Analog:** `src/components/MuteToggle.test.tsx` — renderHelper + RTL assertion shape.

**Import block** (mirror MuteToggle.test.tsx lines 1-6):
```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SessionReadout, type SessionReadoutProps } from './SessionReadout'
```

**renderReadout helper** (mirrors `renderToggle` from MuteToggle.test.tsx lines 8-19):
```typescript
// Sample frame with a non-null remainingMs for timed session scenarios
const sampleFrame = {
  remainingMs: 600_000,   // 10:00 remaining
  elapsedMs: 0,
  phaseLabel: 'In' as const,
  phaseProgress: 0,
  cycleIndex: 0,
  isComplete: false,
}

function renderReadout(props: Partial<SessionReadoutProps> = {}) {
  return render(
    <SessionReadout
      frame={props.frame ?? null}
      status={props.status ?? 'idle'}
      message={props.message}
      isLeadInPlaceholder={props.isLeadInPlaceholder}
    />,
  )
}
```

**Four test cases** (D-06):
```typescript
describe('SessionReadout', () => {
  it('isLeadInPlaceholder=true + non-null frame → renders timer chip (label + formatted duration)', () => {
    renderReadout({ isLeadInPlaceholder: true, frame: sampleFrame, status: 'idle' })
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('isLeadInPlaceholder=true + status "complete" + non-null frame → timer chip still rendered (placeholder wins)', () => {
    renderReadout({ isLeadInPlaceholder: true, frame: sampleFrame, status: 'complete', message: 'Session complete' })
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.queryByText('Session complete')).not.toBeInTheDocument()
  })

  it('isLeadInPlaceholder=false + status "complete" + non-null frame → headline rendered, chip hidden', () => {
    renderReadout({ isLeadInPlaceholder: false, frame: sampleFrame, status: 'complete', message: 'Session complete' })
    expect(screen.getByText('Session complete')).toBeInTheDocument()
    expect(screen.queryByText('Remaining')).not.toBeInTheDocument()
  })

  it('isLeadInPlaceholder absent + status "idle" + null frame + no message → component returns null', () => {
    const { container } = renderReadout({ status: 'idle', frame: null })
    expect(container.firstChild).toBeNull()
  })
})
```

---

### `src/components/MuteToggle.tsx` — A11Y-01 resumeHintId prop + conditional aria-describedby

**Modification:** Add `resumeHintId: string` to `MuteToggleProps` (required); add `aria-describedby={needsResume ? resumeHintId : undefined}` adjacent to existing `aria-pressed` at line 37.

**Current props interface** (lines 10-18):
```typescript
export interface MuteToggleProps {
  muted: boolean
  audioAvailable: boolean
  /** Plan 06 D-32: when true, button morphs into a resume affordance — ... */
  needsResume?: boolean
  onToggle(this: void): void
}
```

**New props interface** (D-10/D-11):
```typescript
export interface MuteToggleProps {
  muted: boolean
  audioAvailable: boolean
  /** Plan 06 D-32: when true, button morphs into a resume affordance —
   *  refresh-arrow glyph + aria-label 'Resume audio'. Priority: audioAvailable=false
   *  outranks; muted is ignored in label and aria-pressed is undefined. */
  needsResume?: boolean
  /** A11Y-01: id of the App-level aria-live resume-hint region. When needsResume
   *  is true, aria-describedby is set to this id so screen readers announce the
   *  hint text. When needsResume is false, aria-describedby is omitted to avoid
   *  empty-content announcements. */
  resumeHintId: string
  onToggle(this: void): void
}
```

**Existing conditional-attribute pattern** (line 37 — the template):
```typescript
aria-pressed={needsResume ? undefined : muted}
```

**New attribute to add** adjacent to `aria-pressed` (D-10):
```typescript
aria-pressed={needsResume ? undefined : muted}
aria-describedby={needsResume ? resumeHintId : undefined}
```

**Destructuring update** (line 20):
```typescript
// Current:
export function MuteToggle({ muted, audioAvailable, needsResume, onToggle }: MuteToggleProps) {
// New:
export function MuteToggle({ muted, audioAvailable, needsResume, resumeHintId, onToggle }: MuteToggleProps) {
```

---

### `src/components/MuteToggle.test.tsx` — A11Y-01 conditional describedby cases

**Modification:** Extend existing `describe('MuteToggle')` with ~2 new cases (D-12). The existing `renderToggle` helper (lines 8-19) must be updated to pass `resumeHintId` (now required on MuteToggleProps).

**renderToggle helper update** (lines 8-19 — add resumeHintId to both the partial props type and the render call):
```typescript
function renderToggle(props: Partial<MuteToggleProps> = {}) {
  const onToggle = props.onToggle ?? vi.fn()
  const utils = render(
    <MuteToggle
      muted={props.muted ?? false}
      audioAvailable={props.audioAvailable ?? true}
      needsResume={props.needsResume}
      resumeHintId={props.resumeHintId ?? 'mute-toggle-resume-hint'}
      onToggle={onToggle}
    />,
  )
  return { ...utils, onToggle }
}
```

**Two new cases to append** (D-12 — mirror aria-pressed pattern from lines 111-115):
```typescript
  // A11Y-01 tests:
  it('needsResume=true → button has aria-describedby set to resumeHintId', () => {
    renderToggle({ needsResume: true, resumeHintId: 'x', audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Resume audio' })
    expect(button).toHaveAttribute('aria-describedby', 'x')
  })

  it('needsResume=false → button has NO aria-describedby attribute', () => {
    renderToggle({ needsResume: false, resumeHintId: 'x', muted: false, audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Mute audio cues' })
    expect(button).not.toHaveAttribute('aria-describedby')
  })
```

---

### `src/components/SessionControls.tsx` — A11Y-01 resumeHintId plumbing

**Modification:** Add `resumeHintId: string` to `SessionControlsProps`; add it to destructuring; forward to `<MuteToggle resumeHintId={resumeHintId} />`.

**Current props interface** (lines 4-21):
```typescript
export interface SessionControlsProps {
  status: SessionStatus
  onStart(this: void): void
  onEnd(this: void): void
  muted?: boolean
  audioAvailable?: boolean
  needsResume?: boolean
  onMuteToggle?(this: void): void
}
```

**New props interface** (D-11):
```typescript
export interface SessionControlsProps {
  status: SessionStatus
  onStart(this: void): void
  onEnd(this: void): void
  muted?: boolean
  audioAvailable?: boolean
  needsResume?: boolean
  /** A11Y-01: forwarded verbatim to MuteToggle.resumeHintId. App owns the id string. */
  resumeHintId?: string
  onMuteToggle?(this: void): void
}
```

**Existing MuteToggle render** (lines 68-73):
```typescript
      <MuteToggle
        muted={muted}
        audioAvailable={audioAvailable}
        needsResume={needsResume}
        onToggle={onMuteToggle}
      />
```

**Updated MuteToggle render** (D-11 — add resumeHintId forward):
```typescript
      <MuteToggle
        muted={muted}
        audioAvailable={audioAvailable}
        needsResume={needsResume}
        resumeHintId={resumeHintId ?? ''}
        onToggle={onMuteToggle}
      />
```

Note: `resumeHintId` is optional on `SessionControlsProps` to preserve backward compatibility with legacy-layout callers (the `!showMuteToggle` branch that never renders `MuteToggle`). The `?? ''` fallback is safe because `MuteToggle` only uses the value when `needsResume` is true, and `needsResume` is always passed from App alongside `resumeHintId`.

---

### `src/app/App.tsx` — UI-01 SessionReadout wiring (lines 576-585)

**Modification:** Drop the `status` override hack at line 583; add `isLeadInPlaceholder` prop.

**Current callsite** (lines 576-585):
```typescript
          <SessionReadout
            frame={leadInPlaceholderFrame ?? session.liveFrame}
            // During lead-in, the underlying state.status may still be 'complete'
            // from the prior session (session.start() doesn't fire until t3).
            // Override to 'idle' so SessionReadout renders the placeholder
            // Remaining chip instead of pinning the stale "Session complete"
            // headline + hiding the timer.
            status={appPhase === 'lead-in' ? 'idle' : state.status}
            message={state.status === 'complete' && !inSessionView ? state.message : undefined}
          />
```

**New callsite** (D-05):
```typescript
          <SessionReadout
            frame={leadInPlaceholderFrame ?? session.liveFrame}
            status={state.status}
            isLeadInPlaceholder={appPhase === 'lead-in'}
            message={state.status === 'complete' && !inSessionView ? state.message : undefined}
          />
```

---

### `src/app/App.tsx` — UI-02 new useEffect (add after line 253)

**Template to mirror verbatim** (lines 240-253):
```typescript
  // WR-01: Auto-close the confirmation modal when the session leaves the running
  // state on its own (e.g. timer reaches the end while the modal is open). Without
  // this, the modal would float over a "Session complete" readout for an arbitrary
  // window until the user dismissed it.
  // The setState below is intentional: status is owned by useSessionEngine (an
  // external system from this component's POV) so reacting to its change with a
  // local-state update is the documented React pattern for "subscribe + reflect".
  useEffect(() => {
    if (state.status !== 'running' && endDialogOpen) {
      // Reason: subscribe-and-reflect — endDialogOpen mirrors external session.status; setting local state from this trigger effect is the documented React pattern for "subscribe + reflect".
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndDialogOpen(false)
    }
  }, [state.status, endDialogOpen])
```

**New effect** (D-07 — add adjacent, after line 253):
```typescript
  // WR-09: Auto-close LearnDialog and ResetStatsDialog when the session view
  // becomes active. Without this, a dialog that was open during an appPhase
  // transition to 'lead-in' could float over the session view for an arbitrary
  // window. The onLearnClick open-guard (App.tsx:396-399) is the first line of
  // defense; this effect is the second for any race where the dialog is already
  // open when inSessionView flips.
  useEffect(() => {
    if (inSessionView) {
      // Reason: subscribe-and-reflect — dialog visibility mirrors external inSessionView; setting local state from this trigger effect is the documented React pattern, identical posture to the EndSessionDialog auto-close at App.tsx:247-253 (WR-01).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLearnDialogOpen(false)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResetDialogOpen(false)
    }
  }, [inSessionView])
```

---

### `src/app/App.tsx` — A11Y-01 sr-only region id (lines 605-611)

**Modification:** Add `id="mute-toggle-resume-hint"` to the existing `<div>`.

**Current element** (lines 605-611):
```typescript
          <div
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {audio.audioStatus === 'needs-resume' ? 'Audio paused, tap to resume' : ''}
          </div>
```

**New element** (D-10):
```typescript
          <div
            id="mute-toggle-resume-hint"
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {audio.audioStatus === 'needs-resume' ? 'Audio paused, tap to resume' : ''}
          </div>
```

---

### `src/app/App.tsx` — A11Y-01 SessionControls resumeHintId prop (line 592-600)

**Modification:** Add `resumeHintId="mute-toggle-resume-hint"` to the `<SessionControls>` JSX.

**Current callsite** (lines 592-600):
```typescript
          <SessionControls
            status={state.status}
            onStart={() => { void onStartClick() }}
            onEnd={requestEnd}
            muted={audio.muted}
            audioAvailable={audio.audioAvailable}
            needsResume={audio.audioStatus === 'needs-resume'}
            onMuteToggle={() => { void onMuteOrResumeClick() }}
          />
```

**New callsite** (D-11):
```typescript
          <SessionControls
            status={state.status}
            onStart={() => { void onStartClick() }}
            onEnd={requestEnd}
            muted={audio.muted}
            audioAvailable={audio.audioAvailable}
            needsResume={audio.audioStatus === 'needs-resume'}
            resumeHintId="mute-toggle-resume-hint"
            onMuteToggle={() => { void onMuteOrResumeClick() }}
          />
```

---

### `src/app/App.dialog.test.tsx` — UI-02 WR-09 auto-close cases

**Modification:** Add ~2 cases after the WR-01 case at line 259. Mirror `startAndAdvancePastLeadIn` setup and `queryByRole` / `not.toBeInTheDocument()` assertion shape.

**Template** (lines 259-287 — WR-01 case):
```typescript
    it('auto-closes the modal when the session completes underneath it (WR-01)', async () => {
      render(<App />)

      fireEvent.click(
        within(screen.getByRole('group', { name: 'Duration' })).getByRole('button', {
          name: /decrease duration/i,
        }),
      )
      await startAndAdvancePastLeadIn()
      fireEvent.click(screen.getByRole('button', { name: 'End session' }))

      expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()

      act(() => {
        vi.advanceTimersByTime(6 * 60_000)
      })

      expect(
        screen.queryByRole('dialog', { name: 'End this session?' }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
      expect(screen.getByText('Session complete')).toBeVisible()
    })
```

**New WR-09 describe block** (D-09 — append after the existing `describe` block ends at line 289):
```typescript
describe('WR-09 in-session dialog auto-close', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-closes LearnDialog when the session starts underneath it (WR-09)', async () => {
    render(<App />)

    // Open the Learn modal before starting
    fireEvent.click(screen.getByRole('button', { name: /learn/i }))
    expect(screen.getByRole('dialog')).toBeVisible()

    // Start the session — inSessionView flips to true
    await startAndAdvancePastLeadIn()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('auto-closes ResetStatsDialog when the session starts underneath it (WR-09)', async () => {
    render(<App />)

    // Open the Reset stats modal before starting
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(screen.getByRole('dialog')).toBeVisible()

    // Start the session — inSessionView flips to true
    await startAndAdvancePastLeadIn()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

Note: Planner should verify exact accessible names for the Learn/Reset trigger buttons by inspecting App.tsx JSX before finalizing test selectors. The `{ name: /learn/i }` and `{ name: /reset/i }` patterns are indicative — adjust to match actual button aria-labels.

---

## Shared Patterns

### Subscribe-and-reflect useEffect
**Source:** `src/app/App.tsx` lines 240-253
**Apply to:** UI-02 new effect (D-07)

Key elements to mirror verbatim:
1. Leading comment block explaining the "subscribe + reflect" rationale
2. Condition check inside the effect body (`if (condition)`) — not in the deps
3. `// Reason: subscribe-and-reflect — ...` inline annotation
4. `// eslint-disable-next-line react-hooks/set-state-in-effect` on the line before each setState call
5. Deps array lists only the external signal variables that trigger the check

### Allowlist throw pattern (RangeError)
**Source:** `src/domain/settings.ts` lines 50-63 (`validateSettings`)
**Apply to:** DOMAIN-01 new throw in `extendTimedSession`

Key elements:
1. `(ARRAY as readonly ElementType[]).includes(value)` — the `as readonly` cast enables `.includes()` on a `const satisfies` array
2. Same `RangeError` class — no new subclass
3. Negated: `if (!(...).includes(...)) throw`

### Conditional attribute pattern (ternary → undefined)
**Source:** `src/components/MuteToggle.tsx` line 37
**Apply to:** A11Y-01 `aria-describedby` on MuteToggle

```typescript
aria-pressed={needsResume ? undefined : muted}
// New — same shape:
aria-describedby={needsResume ? resumeHintId : undefined}
```

React omits JSX attributes whose value is `undefined` from the DOM output — this is the canonical pattern for conditional HTML attributes in this codebase.

### Prop forwarding chain
**Source:** `src/components/SessionControls.tsx` lines 68-73 (existing MuteToggle forwarding)
**Apply to:** `resumeHintId` plumbing (D-11)

Pattern: prop is declared optional on `SessionControlsProps` (for backward compatibility with legacy layout callers), passed through with a `?? ''` fallback, then consumed only when the feature condition (`needsResume`) is true.

### RTL renderHelper factory
**Source:** `src/components/MuteToggle.test.tsx` lines 8-19
**Apply to:** `SessionReadout.test.tsx` (NEW) `renderReadout` helper

Pattern: `function renderHelper(props: Partial<Props> = {})` with all required props defaulted, returns spread of render utils. Keeps individual test cases concise.

---

## No Analog Found

All files in Phase 11 have direct analogs in the codebase. No files required fallback to RESEARCH.md patterns.

---

## Metadata

**Analog search scope:** `src/domain/`, `src/components/`, `src/app/`
**Files read:** 12 (sessionController.ts, settings.ts, SessionReadout.tsx, MuteToggle.tsx, MuteToggle.test.tsx, SessionControls.tsx, App.tsx (3 ranges), sessionController.test.ts, App.dialog.test.tsx)
**Line number verification:** All CONTEXT.md-cited line numbers confirmed current as of Phase 10 close (2026-05-11). No drift detected.
**Pattern extraction date:** 2026-05-11
