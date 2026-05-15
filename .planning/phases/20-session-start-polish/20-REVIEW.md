---
phase: 20-session-start-polish
reviewed: 2026-05-15T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/content/strings.ts
  - src/components/SessionControls.tsx
  - src/components/SessionControls.test.tsx
  - src/app/App.tsx
  - src/app/App.audio.test.tsx
  - src/app/App.persistence.test.tsx
  - src/app/App.wakeLock.test.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-05-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 20 adds a `cancel` UI string and an `inLeadIn` prop to `SessionControls` so the
primary button reads "Cancel"/"Cancelar" during the 3-2-1 lead-in window, replacing the
previous "Start session" copy-lock. The diff is small and the change set is internally
consistent: the `inLeadIn` prop follows the established optional-prop backward-compat
pattern, `App.tsx` wires `inLeadIn={appPhase === 'lead-in'}`, and the four touched test
files were updated to query the new "Cancel" label.

No Critical issues found. The label/handler routing was traced through the lead-in →
running transition and the completion → idle transition; both are sound because
`setAppPhase` and `session.start()` are batched into the same React commit, so there is
no render where the label and the click handler disagree.

Two Warnings concern test coverage gaps that let the new behavior ship under-verified,
and three Info items concern minor robustness and consistency points.

## Warnings

### WR-01: No test asserts the click during lead-in actually invokes the cancel path through `onStart`

**File:** `src/components/SessionControls.test.tsx:159-184`
**Issue:** The three new `SessionControls` tests assert only the *label* ("Cancel" /
"Cancelar" / backward-compat "Start session"). None click the button while `inLeadIn` is
true and assert `onStart` fires (and `onEnd` does not). The label change is cosmetic; the
load-bearing contract is that a click during lead-in still routes to `onStart` (because
`status` is `'idle'`, `isRunning` is false → `onClick={isRunning ? onEnd : onStart}`).
A future refactor that, e.g., gates `onStart` on `inLeadIn` would relabel correctly yet
break cancellation, and every test in this file would still pass. The App-level tests
(`App.audio.test.tsx` Test 11, `App.wakeLock.test.tsx` Test 5) do exercise the cancel
path, but the unit under review has no direct coverage of its own handler routing for the
`inLeadIn` case.
**Fix:** Add a unit test in `SessionControls.test.tsx`:
```tsx
it('LEAD-01: clicking the primary button while inLeadIn routes to onStart (cancel path), not onEnd', async () => {
  const user = userEvent.setup()
  const { onStart, onEnd } = renderControlsWithMute({ status: 'idle', inLeadIn: true })
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onStart).toHaveBeenCalledTimes(1)
  expect(onEnd).not.toHaveBeenCalled()
})
```

### WR-02: No test covers `inLeadIn` interaction with `status === 'running'` (precedence)

**File:** `src/components/SessionControls.tsx:71` and `:89`
**Issue:** The label expression `isRunning ? strings.endSession : inLeadIn ? strings.cancel : strings.startSession`
gives `isRunning` precedence over `inLeadIn`. In production `App.tsx` these two are
mutually exclusive (`appPhase === 'lead-in'` cannot coexist with `status === 'running'`),
so the precedence is currently invisible. But `SessionControls` is a standalone component
with both `status` and `inLeadIn` as independent props — nothing in its type or runtime
guards against a caller passing `status="running"` together with `inLeadIn={true}`. The
chosen precedence (running wins → "End session") is reasonable, but it is undocumented and
untested, so a future maintainer cannot tell whether it is intentional or accidental.
**Fix:** Add a one-line regression test pinning the precedence, and a short code comment:
```tsx
it('LEAD-01: status="running" outranks inLeadIn — label is "End session"', () => {
  renderControlsWithMute({ status: 'running', inLeadIn: true })
  expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
})
```
Add to the label line in `SessionControls.tsx`: `// running outranks inLeadIn (mutually exclusive in App, but precedence is fixed here)`.

## Info

### IN-01: PT-BR `cancel` in `controls` is not deduplicated with `endSessionDialog.cancel` / `resetStatsDialog.cancel`

**File:** `src/content/strings.ts:228`, compared to `:233`, `:238`
**Issue:** `controls.cancel` is `'Cancelar'` while `endSessionDialog.cancel` is `'Continuar'`
and `resetStatsDialog.cancel` is `'Manter'`. This is *correct* — the three "cancel" slots
are intentionally different verbs for different contexts (D-10 nested-interface decision
keeps them separate). Flagging only so a reviewer does not "fix" this into a shared key.
The new `controls.cancel` literal `'Cancel'` (EN) collides verbatim with no other EN entry,
which is fine. No action required beyond awareness.
**Fix:** None — intentional. Optionally add a comment near `controls.cancel` noting it is
deliberately distinct from the dialog cancel verbs.

### IN-02: `controls.cancel` carries the `// TODO: native-speaker review` marker — confirm it is tracked

**File:** `src/content/strings.ts:228`
**Issue:** The new PT-BR `cancel: 'Cancelar'` correctly carries the per-I18N-07
`// TODO: native-speaker review` comment, consistent with every other PT-BR entry. This is
working as designed, but it means the phase ships an untranslated-by-a-human string. Ensure
the I18N-07 native-speaker-review backlog is updated to include this new entry so it is not
silently lost (the marker is identical to ~70 other lines and easy to miss in a bulk pass).
**Fix:** None in code. Confirm the I18N-07 tracking artifact lists `controls.cancel`.

### IN-03: Stale checker reference in `onStartClick` comment

**File:** `src/app/App.tsx:312`
**Issue:** The comment block above `onStartClick` was updated for Phase 20 (good — it now
says D-04 supersedes D-11), but line 312 inside the function still reads
`// Cancel-during-lead-in branch (Open Question 2 option (a) + checker W4):`. "Checker W4"
referred to the now-superseded copy-lock decision; keeping the reference is mildly
misleading since W4's original conclusion (label locked to "Start session") was reversed
by this phase. Low impact — purely a documentation-drift nit.
**Fix:** Update the inline comment to reference the current decision, e.g.
`// Cancel-during-lead-in branch (Phase 20 D-04/D-07 — inLeadIn relabel):`.

---

_Reviewed: 2026-05-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
