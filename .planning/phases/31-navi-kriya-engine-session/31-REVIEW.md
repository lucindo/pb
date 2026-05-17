---
phase: 31-navi-kriya-engine-session
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/app/App.tsx
  - src/audio/nkCueSynth.ts
  - src/components/EndSessionDialog.tsx
  - src/components/NKSessionReadout.tsx
  - src/components/NKShape.tsx
  - src/components/SettingsForm.tsx
  - src/components/StatsFooter.tsx
  - src/content/strings.ts
  - src/domain/naviKriyaSettings.ts
  - src/hooks/useNKEngine.ts
  - src/index.css
  - src/storage/practices.ts
  - src/storage/stats.ts
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-05-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 31 wires the Navi Kriya OM-counting engine, its audio cues, the session UI
(NKShape, NKSessionReadout, completion/early-end dialogs), per-practice stats
persistence, and the SettingsForm NK branch. The persistence layer (practices.ts,
stats.ts) is careful and well-guarded. The engine hook is mostly sound.

The most serious defect is in the engine's `done`-phase state machine: nothing
prevents `resume()` from re-driving a finished session, which re-fires the end
cue and `onComplete`. Several quality defects cluster around the SettingsForm
NK gating logic (dead props), the NKShape accessibility label (always announces
the wrong phase), and untranslated PT-BR strings shipped as English.

## Critical Issues

### CR-01: `resume()` can re-drive a completed session, re-firing the end cue and `onComplete`

**File:** `src/hooks/useNKEngine.ts:197-202` (with `src/app/App.tsx:1058-1066`)
**Issue:** After natural completion, `stepOm` sets `e.phase = 'done'` and
`setNkRunning(false)` but does **not** null `eng.current` (only `end()` does).
`resume()` only guards `if (!e) return` — it does not check `e.phase`. The
pause/resume button in App.tsx is rendered whenever `nkSessionActive` is true,
and `nkSessionActive` includes `nkPhase !== 'idle'`, so the button is present
during the `done` phase showing "Resume" (because `nkRunning` is false).

If `resume()` is invoked in the `done` state, it calls `schedule(e.omMs)` →
`stepOm` runs again. `stepOm` does `e.count += 1` (count is already at
`backCount` from the final phase), `target = e.backCount`, so `e.count < target`
is false; `e.phase` is `'done'` (not `'front'`) and `e.round` is at max, so it
falls into the final `else` branch: increments `completedRounds` again, re-fires
`cbs.endCue()`, and calls `onCompleteRef.current(...)` a second time with a
larger `completedRounds`.

Today this is masked because the completion `<dialog>` is opened modally
(`showModal()`), making the rest of the page `inert` so the button cannot be
clicked. That is incidental mitigation — the engine itself is in an unsafe
state. Any code path that calls `resume()` while `phase === 'done'` (a future
keyboard shortcut, a test, a race where the dialog has not yet mounted) corrupts
`completedRounds` and double-schedules audio.
**Fix:** Guard `resume()` (and `pause()`) against the terminal phase:
```ts
const resume = useCallback(() => {
  const e = eng.current
  if (!e || e.phase === 'done') return
  setNkRunning(true)
  schedule(e.omMs)
}, [schedule])
```

## Warnings

### WR-01: NKShape `aria-label` always announces "phase In" regardless of front/back

**File:** `src/components/NKShape.tsx:55`
**Issue:** The accessible name is hardcoded to `strings.inhale` ("In"):
`` `Navi Kriya session: OM ${count}, phase ${strings.inhale}` ``. During the
back phase the screen reader still announces "phase In". The in-source comment
acknowledges the type-contract awkwardness but ships an incorrect label — a
blind user gets no signal that the practice has moved from Front to Back. The
NKSessionReadout does carry the correct phase, but NKShape is `role="img"` with
its own label and is the primary live element.
**Fix:** Pass the real phase into NKShape (add a `phase: 'front' | 'back'` prop)
and select the label from `nkReadout.front` / `nkReadout.back`, or drop the
phase clause from the NKShape label entirely and rely on NKSessionReadout's
`aria-live` region for phase announcement.

### WR-02: `resume()` after a pause during a lead-in window uses the wrong delay

**File:** `src/hooks/useNKEngine.ts:197-202`
**Issue:** When a phase target is reached, `stepOm` schedules the next step with
`schedule(NK_LEAD_MS)` (700 ms). If the user pauses during that 700 ms lead-in
and then resumes, `resume()` unconditionally schedules with `e.omMs`
(1750-3000 ms). The first OM of the next phase therefore arrives later than the
designed 700 ms lead-in, and the lead-in no longer aligns with the phase marker
audio. The engine record does not track which delay the cancelled timer was
using, so resume cannot restore it.
**Fix:** Store the pending delay (or a "pending step kind") on `NKEngineRecord`
when scheduling, and have `resume()` reschedule with that stored value instead
of always `e.omMs`.

### WR-03: `new AudioContext()` in the NK start handler is unguarded

**File:** `src/app/App.tsx:858`
**Issue:** `onNKStartClick` does `const audioCtx = new AudioContext()` with no
try/catch. If construction throws (browser without Web Audio, hardened privacy
config), the handler aborts before `setNkStarting(true)` and the wake-lock
request — the Start button appears dead with no feedback, and the NK session
never begins. The resonant path elsewhere in the app treats audio as
fail-soft (visuals continue when audio fails); the NK path should match.
**Fix:** Wrap construction in try/catch; on failure either run the session
silently (pass no-op callbacks) or surface the existing "audio unavailable"
affordance, but still start the visual engine.

### WR-04: SettingsForm `disabled={isNKSessionRunning}` on the NK steppers is dead logic

**File:** `src/components/SettingsForm.tsx:256,263,272` (with `src/app/App.tsx:1019,1032`)
**Issue:** App.tsx renders `<SettingsForm>` only inside `{!nkSessionActive && ...}`
and passes `isNKSessionRunning={nkStarting}`. But `nkSessionActive` is
`activePractice === 'naviKriya' && (nkStarting || nkPhase !== 'idle')` — it is
already true whenever `nkStarting` is true or the engine is non-idle. Therefore
whenever SettingsForm is actually mounted, `isNKSessionRunning` is always
`false`. The `disabled={isNKSessionRunning}` props on the rounds / frontCount /
omLength steppers can never evaluate to `true`. This is dead code that misleads
a future reader into thinking the steppers lock during a session (they cannot
be reached at all because the whole form is unmounted).
**Fix:** Remove the `isNKSessionRunning` prop and the `disabled` bindings, or
document explicitly that the steppers are guarded by form unmounting and the
prop is retained only for API symmetry.

### WR-05: PT-BR `nkReadout` / `nkControls` / `nkCompletion` are untranslated English

**File:** `src/content/strings.ts:518-544`
**Issue:** The `pt-BR` locale object for `nkReadout`, `nkControls`, and
`nkCompletion` is byte-identical to the `en` object — "Phase", "Front", "Back",
"Round", "Count", "Rounds", "Front OMs", "OM pace", "Fast/Medium/Slow",
"OM tick", "On/Off", "Practice complete", "rounds complete", "Close summary"
all ship in English to Brazilian users. The file header claims "PT-BR values
reviewed by a native speaker in Phase 26", which is now false for the Phase 31
additions. Unlike WR-06, these have no `TODO` marker, so they are easy to miss
in a future translation pass.
**Fix:** Either translate these entries, or add explicit `// TODO Phase 32:
PT-BR translation` markers on every untranslated NK entry so the gap is
tracked, consistent with `stats.roundsCompletedLabel`.

### WR-06: `practice` PT-BR strings also untranslated and uncommented

**File:** `src/content/strings.ts:507-517`
**Issue:** The `pt-BR` `practice` block (`toggleLabel: 'Switch practice'`,
`naviKriyaHeader: 'Navi practice'`, `naviKriyaControlsPlaceholder: 'Controls
coming soon'`, `naviKriyaStatsEmptyBody`, `resetStatsTitle` -> `` `Reset ${...}
stats?` ``) ships English copy to PT-BR. `resetStatsTitle` in particular is a
user-facing dialog title produced by an interpolation function. No `TODO`
marker flags the gap.
**Fix:** Translate or add tracked `TODO` markers, same as WR-05.

## Info

### IN-01: Session-duration estimate omits per-phase lead-in time

**File:** `src/components/SettingsForm.tsx:127-130`
**Issue:** `estimatedMinutes` sums OM time plus the one-time `NK_SETTLE_MS`, but
each phase begins with an `NK_LEAD_MS` (700 ms) lead-in fired by the engine —
`rounds * 2` lead-ins total. For a 5-round session that is ~7 s unaccounted for.
The estimate is rounded to whole minutes so the visible drift is small, but it
is a systematic underestimate.
**Fix:** Add `nkSettings.rounds * 2 * NK_LEAD_MS` to the numerator, or document
that the estimate intentionally excludes lead-in overhead.

### IN-02: `stats.roundsCompletedLabel` PT-BR is English with a TODO

**File:** `src/content/strings.ts:481`
**Issue:** `roundsCompletedLabel: 'Rounds'` in the PT-BR block, flagged
`// TODO Phase 32: PT-BR translation`. This is correctly tracked (unlike
WR-05/WR-06) — listed for completeness.
**Fix:** Translate in Phase 32 as the TODO states.

### IN-03: NK audio cues scheduled at `audioCtx.currentTime` with no look-ahead

**File:** `src/app/App.tsx:868-871`
**Issue:** Every NK cue callback passes `audioCtx.currentTime` as the `when`
argument. Scheduling a Web Audio node to start exactly at `currentTime` leaves
no headroom and can produce occasional clicks/glitches on slower devices,
because the audio thread may already be past that instant by the time the node
is wired up. A few-ms look-ahead offset is the conventional guard.
**Fix:** Pass `audioCtx.currentTime + LOOKAHEAD` (e.g. 0.02 s) for each cue, or
confirm this matches the existing resonant `cueSynth` scheduling discipline and
is intentional.

### IN-04: `onNKStartClick` does not clear stale completion dialog state

**File:** `src/app/App.tsx:856-882`
**Issue:** `onNKStartClick` resets `nkRecordedRef` and `setNkStarting(true)` but
does not clear `nkCompletionInfo` / `nkCompletionOpen` / `nkEndDialogOpen`.
Today the completion dialog is dismissed via `onNKCompletionClose` before a new
session can start (the Start button is hidden while `nkSessionActive`), so this
is not currently reachable, but the handler is not self-defensive against stale
dialog state from a prior session.
**Fix:** Defensively call `setNkCompletionOpen(false)`, `setNkEndDialogOpen(false)`,
and `setNkCompletionInfo(null)` at the top of `onNKStartClick`.

### IN-05: `NKShape` renders the inner shape with a hidden hardcoded `leadInDigit={1}`

**File:** `src/components/NKShape.tsx:91-110`
**Issue:** NKShape reuses each variant shape's LeadIn branch by passing
`leadInDigit={1}`, then hides the rendered "1" digit behind the count span via
`z-index` layering. This is a structural workaround documented at length in
comments, but it leaves a real "1" digit in the DOM (under `aria-hidden`) that
depends on z-index stacking to stay invisible. Any future change to the shape's
stacking context or the wrapper's `z-10` would visually expose the stray digit.
**Fix:** Longer-term, give the shape components a proper NK/blank lead-in mode
rather than rendering-then-masking a digit. Acceptable as-is for v1 given the
extensive comments, but flagged as a fragility.

---

_Reviewed: 2026-05-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
