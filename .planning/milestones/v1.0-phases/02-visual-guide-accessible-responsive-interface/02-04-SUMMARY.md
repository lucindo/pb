---
phase: 02-visual-guide-accessible-responsive-interface
plan: 04
subsystem: ui-modal-confirmation
tags:
  - react
  - accessibility
  - dialog
  - modal
  - focus-management
  - tdd
dependency-graph:
  requires:
    - 02-01  # HTMLDialogElement polyfill in vitest.setup.ts
    - 02-03  # focus-visible ring pattern + Plan 03 BPM/Ratio restoration test
  provides:
    - end-session-confirmation-modal-component
    - app-modal-state-machine
    - jsdom-cancel-event-test-pattern
  affects:
    - src/app/App.tsx
    - src/app/App.session.test.tsx
    - src/app/App.settings.test.tsx
tech-stack:
  added: []
  patterns:
    - native-html-dialog-with-showmodal
    - cancel-event-preventdefault-double-fire-mitigation
    - backdrop-click-target-equality-check
    - imperative-open-close-via-useeffect
    - modal-state-machine-in-composition-root
key-files:
  created:
    - src/components/EndSessionDialog.tsx
    - src/app/App.dialog.test.tsx
  modified:
    - src/app/App.tsx
    - src/app/App.session.test.tsx
    - src/app/App.settings.test.tsx
decisions:
  - D-10: Replace window.confirm with in-app accessible modal dialog
  - D-11: Locked copy ("End this session?", "End", "Keep going")
  - D-12: Default focus on Keep going button
  - D-13: Session timing clock keeps running while modal is open (SESS-05 invariant)
  - D-14: Open-ended sessions skip the modal entirely
  - GUID-04: Native dialog role + aria-labelledby + focus-visible ring + 48px hit-area
metrics:
  duration_minutes: 5
  completed_date: 2026-05-09
  tests_added: 17
  tests_rewritten: 6
  tests_total_after: 78
  tasks_completed: 2
---

# Phase 02 Plan 04: End-Session Confirmation Modal Summary

Replaced the Phase 1 `window.confirm('End this timed session?')` browser prompt with an accessible in-app modal dialog (`EndSessionDialog`) using the native `<dialog>` element, wired into `App.tsx` via a clean state machine that preserves the SESS-05 single-clock invariant from Phase 1.

## Tasks Completed

| Task | Name | Commits | Files |
|------|------|---------|-------|
| 1 | Create EndSessionDialog component (RED → GREEN) | a774e8e (RED), 51cab2b (GREEN) | `src/app/App.dialog.test.tsx` (new), `src/components/EndSessionDialog.tsx` (new) |
| 2 | Wire dialog into App.tsx + migrate confirm-spy tests (RED → GREEN) | 2922dbb (RED), a2eb11a (GREEN) | `src/app/App.dialog.test.tsx` (extended), `src/app/App.session.test.tsx`, `src/app/App.settings.test.tsx`, `src/app/App.tsx` |

## What Was Built

### `src/components/EndSessionDialog.tsx` (new, 83 lines)

Native HTML `<dialog>` modal with the following contract:

- **Imperative open/close.** A `useEffect` calls `dialog.showModal()` when `open=true` and `dialog.close()` when `open=false`, so the browser sets up the top-layer + `inert` focus trap.
- **Default focus on Keep going (D-12).** When opening, the cancel button receives focus, so a stray Enter key does not destructively end the session.
- **Esc cancel handler with `preventDefault` (Pitfall 5 mitigation).** A `cancel`-event listener calls `event.preventDefault()` (so the dialog does not auto-close + double-fire `close`) and forwards the cancellation to `onCancel`. The polyfill in `vitest.setup.ts` only dispatches `close` from `close()`, so tests simulate Esc by manually firing a `cancel` event on the dialog.
- **Backdrop click via target-equality.** An `onClick` on the `<dialog>` element checks `event.target === dialogRef.current`; clicks that bubble from inner children (title, panel, buttons) are ignored.
- **Locked copy strings (D-11).** Title `End this session?`, primary `End`, secondary `Keep going`. The title `id="end-session-title"` is wired to `aria-labelledby="end-session-title"`.
- **Theme-matched focus-visible ring on both buttons (D-21).** Identical Plan 03 utility composition: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2`.
- **48px hit-area floor on both buttons** (`min-h-12`).
- **Backdrop color via theme token.** `backdrop:bg-[var(--color-modal-backdrop)]` references the variable defined by Plan 02's `theme.css` (single source of truth).

### `src/app/App.tsx` (modified)

Replaced the inline `endSession` function (which called `window.confirm`) with a three-handler state machine:

```ts
const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)

const requestEnd = () => {
  if (state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended') {
    setEndDialogOpen(true)
    return
  }
  session.end()
}

const confirmEnd = () => { setEndDialogOpen(false); session.end() }
const cancelEnd  = () => { setEndDialogOpen(false) }
```

`<EndSessionDialog>` is rendered as a sibling of the main `<section>` inside `<main>`. Because `showModal()` promotes the dialog to the top layer, its DOM position relative to the main content does not matter for stacking.

### `src/app/App.dialog.test.tsx` (new, 232 lines)

Two describe blocks:

1. **`EndSessionDialog (component-level)`** — 11 unit tests covering open/close, default focus, role + aria-labelledby contract, locked copy, click handlers, cancel-event simulation, backdrop click target-equality (with the `not-on-child` regression), focus-visible ring presence, and 48px hit-area.
2. **`end-session confirmation modal (App integration)`** — 6 integration tests covering the full user flow: opening from End session, Keep going to dismiss, End to confirm, Esc cancel, open-ended bypass, and the SESS-05 fake-timer regression that asserts the `Remaining` readout advances from `10:00` → `9:59` while the modal is open.

### Phase 1 / Plan 03 test rewrites

Removed every `vi.spyOn(window, 'confirm')` call. The 6 affected tests now interact with the modal's End / Keep going buttons via `userEvent.click`:

- `App.session.test.tsx` `manual session ending` describe — 3 tests
- `App.settings.test.tsx` "ends a running session", "keeps selected settings", "restores BPM and Ratio steppers (D-16)" — 3 tests

## Verification

- `npm run test:run` — **78 / 78** passing (61 baseline + 11 component-level + 6 App-integration). Up from 61 in the Phase 1 baseline.
- `npx tsc --noEmit` — **0 errors**.
- `npm run build` — succeeds (`dist/index.html` + `dist/assets/index-DwEVj4Wm.css` + `dist/assets/index-C8Vf1nRr.js`).
- `grep -rE "window\.confirm|window\.prompt|window\.alert" src/` — **zero matches** (production + test code).
- Locked Phase 2 D-11 copy verified: `grep -c "End this session?" src/components/EndSessionDialog.tsx` returns 1.
- D-13 SESS-05 invariant proven by Test F (App.dialog.test.tsx): with `vi.useFakeTimers()`, advancing time by 1s while the modal is open shrinks the readout from `10:00` → `9:59`. The clock never pauses.

## Patterns Established

1. **Native `<dialog>` with `showModal()` + browser-managed focus trap.** No `focus-trap-react`, no manual `tabindex` shuffle. The browser handles `inert` on the rest of the page.
2. **Cancel-event `preventDefault()` to mitigate double-fire.** Without this, the user-supplied `cancel` listener would fire, then the default close behavior would also fire `close`, causing two onCancel invocations in some browsers.
3. **Backdrop click via `event.target === dialogRef.current`.** Cleanly distinguishes a click on the dialog's pseudo-backdrop area from a click on any inner content. A regression test asserts that clicking the title does NOT cancel.
4. **jsdom cancel-event simulation pattern.** `fireEvent(dialog, new Event('cancel', { cancelable: true }))` is the deterministic way to test Esc semantics under jsdom 29 (whose `close()` polyfill only dispatches `close`, not `cancel`).
5. **Modal state machine in the composition root.** App.tsx owns the boolean; the component owns the imperative open/close. This keeps `useSessionEngine` ignorant of the modal — preserving the SESS-05 single-clock invariant and avoiding any pause/resume API surface.

## Decisions Implemented

- **D-10:** End session for timed sessions now uses the in-app modal, not `window.confirm`.
- **D-11:** Locked copy `End this session?`, `End`, `Keep going` is asserted by name in 11 unit tests + 6 integration tests; the literal title appears in `EndSessionDialog.tsx`.
- **D-12:** Default focus on Keep going is verified at both component-level (Test 2) and App-integration level (Test A).
- **D-13:** Session timing clock keeps running while the modal is open. The fake-timer regression test (Test F) is the runtime guard.
- **D-14:** Open-ended sessions skip the modal entirely. Verified by Test E (App-level) and the rewritten `App.session.test.tsx` "ends open-ended sessions directly without showing the modal" test.
- **GUID-04:** Modal exposes role=dialog (native), aria-labelledby, focus-visible ring on both buttons, motion-reduce transition, 48px hit-area floor.

## Requirements Addressed

- `GUID-04` — User can use a polished accessible breathing UI on mobile and desktop browsers (the modal completes the requirement's accessibility contract).

## Deviations from Plan

None — plan executed exactly as written. The 11+6 = 17 new tests and the 6 rewritten tests all match the plan's `<behavior>` specs verbatim. No auto-fixes were needed; no architectural changes triggered Rule 4. No authentication gates encountered.

The plan's example test scaffold for the SESS-05 fake-timer regression (Test F) used a top-level `try/finally` with `vi.useFakeTimers()` inside a single `it`. I lifted the fake-timer setup into a nested `describe` with `afterEach(vi.useRealTimers)` for cleaner isolation — this is a stylistic improvement, not a deviation, and the test still asserts identical behavior (`10:00` → `9:59` while modal is open).

## Acceptance Criteria

### Task 1 (component, 11 tests)

| Check | Expected | Actual |
|-------|----------|--------|
| `export function EndSessionDialog` | 1 | 1 |
| `<dialog` count | ≥1 | 2 |
| `showModal()` | 1 | 1 |
| `dialog.close()` | 1 | 1 |
| `addEventListener('cancel'` | 1 | 1 |
| `removeEventListener('cancel'` | 1 | 1 |
| `event.preventDefault()` | 1 | 1 |
| `aria-labelledby="end-session-title"` | 1 | 1 |
| `id="end-session-title"` | 1 | 1 |
| `End this session?` | 1 | 1 |
| `Keep going` | 1 | 2 (id + label) |
| `min-h-12` | 2 | 2 |
| `focus-visible:ring-breathing-accent` | 2 | 2 |
| `motion-reduce:transition-none` | 2 | 2 |
| `color-modal-backdrop` | 1 | 1 |
| `role="dialog"` (must NOT be set) | 0 | 0 |
| `tabindex` (must NOT be set) | 0 | 0 |
| `focus-trap` library | 0 | 0 |
| `useSessionEngine` import in dialog | 0 | 0 |
| 11 component tests pass | yes | yes |
| `npx tsc --noEmit` | exit 0 | exit 0 |

### Task 2 (App wiring + test migration)

| Check | Expected | Actual |
|-------|----------|--------|
| `import { EndSessionDialog }` in App.tsx | 1 | 1 |
| `import { useState }` in App.tsx | 1 | 1 |
| `window.confirm` in App.tsx | 0 | 0 |
| `setEndDialogOpen(true)` | 1 | 1 |
| `setEndDialogOpen(false)` | 2 | 2 |
| `session.end()` in App.tsx | 2 | 2 |
| `durationMinutes !== 'open-ended'` | 1 | 1 |
| `<EndSessionDialog` | 1 | 1 |
| `window.confirm/prompt/alert` in src/ | 0 | 0 |
| `vi.spyOn(window, 'confirm'` in App.session.test | 0 | 0 |
| `vi.spyOn(window, 'confirm'` in App.settings.test | 0 | 0 |
| `End this timed session?` in App.session.test | 0 | 0 |
| `end-session confirmation modal (App integration)` | 1 | 1 |
| `fireEvent` in App.dialog.test | ≥1 | 7 |
| Full suite | exit 0 | 78/78 pass |
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npm run build` | exit 0 | exit 0 |

## TDD Gate Compliance

Both tasks followed the TDD RED → GREEN cycle correctly:

1. **Task 1:** RED commit `a774e8e` (test file fails with "Failed to resolve import") → GREEN commit `51cab2b` (component implementation makes 11 tests pass).
2. **Task 2:** RED commit `2922dbb` (10 tests fail because App still uses window.confirm) → GREEN commit `a2eb11a` (App.tsx state machine makes the 10 failures + 6 new integration tests pass).

Both `test(...)` commits land before their corresponding `feat(...)` commits. No REFACTOR commit was needed.

## Phase 2 Status

This plan completes Phase 02 (visual-guide-accessible-responsive-interface). Phase 2 deliverables:

- **GUID-01** — themed visual identity → Plan 02
- **GUID-02** — single visible source of phase label → Plans 02 + 03
- **GUID-03** — reduced-motion support → Plans 01 + 02
- **GUID-04** — accessible focus management + modal → Plans 03 + 04
- **MOBL-01** — mobile-first breakpoints + 44px hit-area floor → Plan 03

All Phase 2 must_haves.truths from the plan frontmatter are now backed by automated tests.

## Self-Check: PASSED

**Files (all FOUND):**
- src/components/EndSessionDialog.tsx
- src/app/App.dialog.test.tsx
- src/app/App.tsx
- src/app/App.session.test.tsx
- src/app/App.settings.test.tsx
- .planning/phases/02-visual-guide-accessible-responsive-interface/02-04-SUMMARY.md

**Commit hashes (all FOUND in git log):**
- a774e8e — test(02-04) RED: dialog test suite
- 51cab2b — feat(02-04) GREEN: EndSessionDialog component
- 2922dbb — test(02-04) RED: App-integration + confirm-spy migration
- a2eb11a — feat(02-04) GREEN: App.tsx state machine
