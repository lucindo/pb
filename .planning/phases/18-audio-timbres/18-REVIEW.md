---
phase: 18-audio-timbres
reviewed: 2026-05-14T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/app/App.audio.test.tsx
  - src/app/App.session.test.tsx
  - src/app/App.tsx
  - src/audio/audioEngine.test.ts
  - src/audio/audioEngine.ts
  - src/audio/cueSynth.test.ts
  - src/audio/cueSynth.ts
  - src/audio/timbres.test.ts
  - src/audio/timbres.ts
  - src/components/SettingsDialog.test.tsx
  - src/components/TimbrePicker.test.tsx
  - src/components/TimbrePicker.tsx
  - src/hooks/useAudioCues.test.tsx
  - src/hooks/useAudioCues.ts
  - src/hooks/useTimbreChoice.test.ts
  - src/hooks/useTimbreChoice.ts
findings:
  critical: 0
  blocker: 0
  warning: 7
  info: 6
  total: 13
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-05-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 18 introduces user-selectable audio timbres (bowl / bell / sine / chime).
The change set spans a new pure-data preset module (`src/audio/timbres.ts`), a
parameterized synthesis dispatch (`scheduleInCueForTimbre` /
`scheduleOutCueForTimbre` in `cueSynth.ts`), capture-at-construction propagation
through `audioEngine.ts`, capture-at-Start at the React boundary
(`useAudioCues.ts` + `App.tsx`), and a settings-side picker
(`TimbrePicker.tsx` + `useTimbreChoice.ts`). The Bowl byte-identical proof
(TIMBRE-02) is solidly engineered: per-field guards in `timbres.test.ts` plus
the parameterized-dispatch tests pin the Bowl numbers verbatim.

No BLOCKER-tier defects were found. The implementation has good test
coverage, defensive guards, and aligns with existing patterns
(useVariantChoice / useThemeChoice mirror). The findings below cluster into:
(a) race-window and edge-case gaps in `useAudioCues.ts` that the existing
audit history did not surface; (b) light-weight quality issues (dead
expressions, stale comments, inconsistent error handling, callback-identity
hygiene); (c) test gaps in the per-timbre coverage.

## Warnings

### WR-01: visibility-resume "armed flag" can latch across suspend cycles

**File:** `src/hooks/useAudioCues.ts:208-221`
**Issue:** `onVisibility` unconditionally sets
`visibilityResumeAttemptedRef.current = true` whenever the document becomes
visible and an engine exists, then calls `engineRef.current.resume()`. If the
AC is ALREADY in `'running'` state when the visibility event fires (e.g.,
user briefly focuses another tab without iOS suspending audio), `resume()`
is a no-op AND no `statechange` event is emitted (state did not change), so
the `handleStateChange` running branch never resets the flag. The flag is
now permanently armed. The NEXT time the AC transitions to `'suspended'` or
`'interrupted'` (which can include benign transient suspends), the gated
branch at lines 161-166 flips `audioStatus = 'needs-resume'` and surfaces
the recovery affordance to the user even though no recovery is actually
required. The Pitfall-5 gate is supposed to prevent exactly this flash.
**Fix:** Only arm the flag when the AC is actually in a suspended state at
the moment of the visibility event:
```ts
const onVisibility = (): void => {
  if (document.visibilityState !== 'visible') return
  const engine = engineRef.current
  if (engine === null) return
  // Only arm the gate when there is something to resume — avoids stranding
  // visibilityResumeAttemptedRef armed across benign focus changes.
  const liveState = engine.state
  if (liveState === 'running' || liveState === 'closed') return
  visibilityResumeAttemptedRef.current = true
  void engine.resume()
}
```
The hook already exposes `engine.state` for exactly this kind of live read
(audioEngine.ts:263-267); using it here closes the latch.

### WR-02: `engineRef` is never cleared when AudioContext transitions to `'closed'` via external means

**File:** `src/hooks/useAudioCues.ts:145-171`
**Issue:** `handleStateChange` flips `audioStatus = 'unavailable'` when the
AC reports `'closed'` but does NOT null `engineRef.current`. If the AC
closes via a non-`stop()` path (e.g., system OOM, external close), a
subsequent call to `resume()` would return early because
`engineRef.current !== null` is the only guard — `if (engineRef.current ===
null) return` at line 397. But `reconstructEngine` would then proceed:
`oldEngine = engineRef.current` (a CLOSED engine), and the bail path at
line 343/352/359 calls `oldEngine.close()` again. `AudioContext.close()` on
an already-closed AC throws `InvalidStateError` per the WebAudio spec
(though the `void` swallows it). More importantly, `engineRef.current` now
points to a dead engine until the next reconstruction completes — any
caller reading `audioNow()`, `notifyPhaseBoundary()`, or `setMuted()` is
hitting a closed engine. The methods are no-ops by virtue of `closed=true`
inside the engine, but the dual-anchor math in App.tsx still computes
audioTimes against the stale anchor.
**Fix:** Clear `engineRef.current` in the `'closed'` branch:
```ts
} else if (state === 'closed') {
  engineRef.current = null
  firstInCueTimeRef.current = null
  setAudioStatus('unavailable')
}
```
This converges the post-close world with the post-stop() world and lets
the existing `if (engineRef.current === null) return` guards in `resume`,
`audioNow`, `setMuted`, `notifyPhaseBoundary` short-circuit correctly.

### WR-03: `onMuteOrResumeClick` callback identity churns on every render

**File:** `src/app/App.tsx:250-255`
**Issue:** The callback depends on `[audio, persistedSetMuted]`. Because
`useAudioCues` returns a fresh object literal each render
(useAudioCues.ts:418-429), `audio` identity churns every render, so this
`useCallback` is effectively `useCallback(fn, [render-identity])` — no
memoization. The same render produces a re-created
`SessionControls.onMuteToggle` wrapper at App.tsx:666, which churns
SessionControls's render. App.tsx already documents the standard
mitigation at lines 211-217 (hoist stable fields into local consts:
`audioStop`, `audioStart`, `audioNotifyPhaseBoundary`, `audioAudioNow`).
The mute-or-resume path is the only consumer that missed this pattern.
The mute toggle's parent `SessionControls` is itself rendered every rAF
during a running session, so the per-frame closure churn is on the hot
path.
**Fix:** Hoist `audio.audioStatus`, `audio.muted`, and `audio.resume` to
locals (mirroring lines 211-217) and depend on the locals:
```ts
const audioStatusValue = audio.audioStatus
const audioMuted = audio.muted
const audioResume = audio.resume
const onMuteOrResumeClick = useCallback(async () => {
  if (audioStatusValue === 'needs-resume') {
    await audioResume()
  }
  persistedSetMuted(!audioMuted)
}, [audioStatusValue, audioMuted, audioResume, persistedSetMuted])
```
Two of the deps (`audioStatusValue`, `audioMuted`) are legitimate state
values that SHOULD trigger re-creation; the third (`audioResume`) is a
stable `useCallback([reconstructEngine])`.

### WR-04: stale comment in `audioEngine.ts` references removed `scheduleInCue` / `scheduleOutCue` dispatch

**File:** `src/audio/audioEngine.ts:8`
**Issue:** The module header says `The boundary-driven scheduleNextCue
dispatch (in → scheduleInCue, out → scheduleOutCue)`. Plan 03 migrated the
engine to call `scheduleInCueForTimbre` / `scheduleOutCueForTimbre`. The
header is now misleading documentation — a reader chasing the dispatch
surface for a future timbre-related change would land on the wrong
function names. Same issue in cueSynth.ts:5-9 is correct (post-migration
language); audioEngine.ts header was missed.
**Fix:** Update the header to match the imports at line 23:
```ts
//   - The boundary-driven scheduleNextCue dispatch (in → scheduleInCueForTimbre,
//     out → scheduleOutCueForTimbre — per-timbre dispatch threaded through opts.timbre).
```

### WR-05: `cueSynth.ts` dead-store `void engine` (carries-over from useAudioCues null gate)

**File:** `src/hooks/useAudioCues.ts:149-152`
**Issue:**
```ts
const engine = engineRef.current
if (engine === null) return
// engine is available for future branches that need the non-null value.
void engine
```
The `void engine` expression is a no-op that exists solely to silence a
no-unused-vars lint when the local is not consumed in the current branch
shape. Comment claims "engine is available for future branches" but no
future branch uses it; the four branches that follow all consult
top-level `state` literal. This is speculative scaffolding that creates
two failure modes: (a) it suggests a refactor seam that does not exist,
inviting bad merges; (b) it carries lint debt forward. Either delete the
local or use it.
**Fix:** Inline the null gate:
```ts
if (engineRef.current === null) return
if (state === 'running') {
  ...
```
If a future branch genuinely needs the engine reference, re-introduce the
local at that point — speculative locals are noise.

### WR-06: `useTimbreChoice` silently no-ops when storage is full

**File:** `src/hooks/useTimbreChoice.ts:34-46`
**Issue:** `setTimbre` calls `savePrefs(merged)` (which swallows quota /
private-mode errors per storage/storage.ts writeEnvelope), THEN calls
`setTimbreState(next)` and dispatches `hrv:prefs-changed`. The
optimistic-UI comment at lines 39-40 says the picker reflects the change
immediately without waiting for round-trip. But because the write may
silently fail, the picker's optimistic state (in-memory) and the on-disk
state DIVERGE without any signal to the user or to other consumers.
Cross-tab sync (`storage` event listener in App.tsx:119-129) is driven
off the on-disk envelope, so the OTHER TAB will see no change while THIS
tab shows the new timbre selected. This is also the existing
useVariantChoice / useThemeChoice posture, so a project-wide quality
concern, not a Phase 18 regression — but Phase 18 is the third instance
of the same pattern, so it merits flagging now rather than accumulating.
**Fix:** Either (a) accept the gap and document it explicitly in the
hook's header comment (it's currently undocumented), or (b) have
`savePrefs` return a boolean indicating success and only call
`setTimbreState(next)` on success. Option (a) is the cheaper short-term
fix and matches the existing accepted-gap precedent for cross-tab
`clear()` in App.tsx:108-115.

### WR-07: `useAudioCues.start()` swallows ALL exceptions, masking unrelated bugs

**File:** `src/hooks/useAudioCues.ts:261-268`
**Issue:**
```ts
try {
  timbreRef.current = timbre
  const engine = await createAudioEngine({ timbre, onStateChange: handleStateChange })
  engineRef.current = engine
  engine.setMuted(mutedRef.current)
  const startAudioTime = engine.now()
  const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
  if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }
  firstInCueTimeRef.current = firstInCueTime
  setStatus('lead-in')
  setAudioAvailable(true)
  return firstInCueTime
} catch {
  setAudioAvailable(false)
  setStatus('failed')
  return null
}
```
The catch block catches **everything** — not just AudioContext
construction failures (the documented D-10 path), but any `TypeError`
from a typo in `engine.scheduleLeadIn`, any internal cueSynth bug, etc.
A real bug introduced elsewhere in the chain (e.g., the engine factory
starts to throw on a malformed `plan`) would silently degrade the user
to visuals-only mode with no diagnostic. The D-10 spec call-out is
specifically about AC construction; the catch should be tighter.
**Fix:** Wrap ONLY the construction await in try/catch:
```ts
let engine: AudioEngine
try {
  timbreRef.current = timbre
  engine = await createAudioEngine({ timbre, onStateChange: handleStateChange })
} catch {
  setAudioAvailable(false)
  setStatus('failed')
  return null
}
engineRef.current = engine
engine.setMuted(mutedRef.current)
const startAudioTime = engine.now()
const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }
firstInCueTimeRef.current = firstInCueTime
setStatus('lead-in')
setAudioAvailable(true)
return firstInCueTime
```
This still satisfies the D-10 anchor (AC construction failure → visuals
only) while letting an actual bug in `scheduleLeadIn` surface as a real
error rather than a silent fallback.

## Info

### IN-01: Bell preset oscillator-type comment in `timbres.ts` is dead from the start

**File:** `src/audio/timbres.ts:65,80,99`
**Issue:** Every preset hardcodes `oscillatorType: 'sine'` with no commentary
on why the field exists. The interface allows any `OscillatorType` (square,
sawtooth, triangle, sine, custom), but all four presets use 'sine' and the
guard test enforces it (timbres.test.ts:50-54). The field is essentially
dead — readers will wonder why it's a parameter at all. Either remove the
field and hard-code 'sine' in `scheduleBowlCue`, or add a one-line comment
explaining the future-extension intent ("D-14 invariant — kept on the
interface so a Phase-19+ percussion timbre could use 'square' without a
schema migration").
**Fix:** Add a single comment to the interface declaration:
```ts
/** Locked to 'sine' across all v1.x presets per D-14 (no-PeriodicWave invariant).
 *  Kept on the interface for forward-compat with non-sine timbres in v2+. */
oscillatorType: OscillatorType
```

### IN-02: TimbrePicker has no event listener for `hrv:prefs-changed`

**File:** `src/hooks/useTimbreChoice.ts:29-49`
**Issue:** The hook dispatches `hrv:prefs-changed` on every `setTimbre`
call but does NOT listen for the event. The dispatch is one-way. If a
sibling picker mutated `prefs.timbre` (theoretical — current UI does not
permit it) or if a future feature triggered the event from elsewhere, the
TimbrePicker would not update. This matches useVariantChoice — the
asymmetry is intentional in the project's architecture (D-22). Worth a
one-line clarifying comment in the JSDoc so future maintainers don't
wonder whether to add a listener.
**Fix:** Add to the hook header comment block:
```
// One-way dispatch by design — no listener installed. Same-tab sibling
// pickers do NOT exist for timbre (TimbrePicker is the only writer).
// Cross-tab updates flow through App.tsx's `storage` listener which
// re-reads stats only; prefs.timbre takes effect on the NEXT Start click
// (capture-at-Start invariant — D-09/D-10).
```

### IN-03: `aria-disabled` on TimbrePicker `<div role="radiogroup">` always emits a literal string

**File:** `src/components/TimbrePicker.tsx:35`
**Issue:** `aria-disabled={disabled}` — when `disabled={false}`, React
emits the attribute `aria-disabled="false"` rather than omitting it. Per
ARIA recommendation, `aria-disabled="false"` is semantically correct, but
some assistive technologies have historically had bugs with explicit
"false" values vs absent attributes. This matches the existing
ThemePicker / VariantPicker, so it's an accepted pattern; the test at
TimbrePicker.test.tsx:43-53 verifies the disabled=true case but not the
disabled=false case (no assertion that the attribute is absent or "false"
when disabled=false).
**Fix:** No code change needed (consistent with sibling pickers). If
hygiene wanted, a test asserting `aria-disabled="false"` would prevent a
silent regression.

### IN-04: `audioEngine.ts` exports `LEAD_IN_TICK_INTERVAL_SEC` but no consumer reads it

**File:** `src/audio/audioEngine.ts:83-86`
**Issue:** Of the four exported lead-in constants
(`LEAD_IN_TICK_INTERVAL_SEC`, `LEAD_IN_DURATION_SEC`,
`LEAD_IN_TICK_INTERVAL_MS`, `LEAD_IN_DURATION_MS`), only the `_MS`
suffixed pair is imported elsewhere (App.tsx:22-25). The `_SEC` pair is
consumed only inside this module. WR-04 in the module comments says
"exported as the single source of truth — App.tsx and useAudioCues.ts
import these"; that justifies the `_MS` pair but the `_SEC` pair is
unused outside this file.
**Fix:** Either remove the `_SEC` exports (keep them as private module
consts) or document why they're exported (e.g., "exported for symmetry —
preferred shape when calculating audio-clock offsets in tests").

### IN-05: Hardcoded magic ratio constants in `timbres.ts` are unlabeled

**File:** `src/audio/timbres.ts:37-100`
**Issue:** Each preset's partials array contains raw numbers like `2.76`,
`5.4`, `2.5`, `4.0`, `7.6`. These are inharmonic ratios with acoustic
meaning (e.g., 2.76 is the Bowl's first inharmonic partial; 2.5 is the
Bell's distinguishing minor sixth). The Bowl 2.76 ratio is briefly
acknowledged in the original cueSynth comments (now moved here) but the
Bell 2.5 ratio is unlabeled. A reader changing a preset would have no way
to know what the ratios mean acoustically.
**Fix:** Add a one-line comment per non-1.0 partial documenting the
acoustic role:
```ts
bell: {
  partials: [
    { ratio: 1.0, gain: 1.0 },      // fundamental
    { ratio: 2.5, gain: 0.5 },      // minor sixth above fundamental — Bell's signature inharmonic
    { ratio: 4.0, gain: 0.15 },     // 2-octave harmonic
  ],
  ...
}
```

### IN-06: Test `'reconstructEngine reuses timbreRef.current'` relies on undocumented order

**File:** `src/hooks/useAudioCues.test.tsx:1204-1244`
**Issue:** The test mutates `localStorage` mid-session and asserts that
the reconstruction call passes the captured timbre, not the mutated one.
This implicitly assumes `useAudioCues` does NOT install a
`hrv:prefs-changed` listener (true today). If a future change adds such
a listener and re-reads prefs at the listener fire-point (a plausible
"feature" to surface timbre changes immediately), the test would still
pass because the listener cycle hasn't fired between the localStorage
mutation and the reconstruction — but the safety property the test
claims to assert ("D-11 invariant: reconstruction NEVER re-reads user
prefs") would be untested. Strengthen by adding a sibling test that
dispatches `hrv:prefs-changed` mid-session and asserts the captured
timbre is still used.
**Fix:** Add a second assertion path:
```ts
// Sibling proof: even if hrv:prefs-changed fires mid-session,
// reconstruction must still use the captured timbre.
window.dispatchEvent(new CustomEvent('hrv:prefs-changed',
  { detail: { key: 'timbre', value: 'chime' } }))
await act(async () => { await result.current.resume() })
expect(createSpy.mock.calls.at(-1)?.[0]).toMatchObject({ timbre: 'bell' })
```

---

_Reviewed: 2026-05-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
