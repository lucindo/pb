---
phase: 40-timbre-preview-cue
reviewed: 2026-05-21T23:20:04Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/audio/previewContext.ts
  - src/audio/previewContext.test.ts
  - src/audio/previewContext.no-audioengine-import.test.ts
  - src/components/TimbrePicker.tsx
  - src/components/TimbrePicker.test.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 40: Code Review Report

**Reviewed:** 2026-05-21T23:20:04Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 40 adds a Web Audio preview path for the Timbre picker via a new
`src/audio/previewContext.ts` singleton plus wiring inside `TimbrePicker.tsx`.
The implementation is small, correctly typed, free of `any`, free of debug
artifacts, and the 19 tests across the three test files all pass.

The architectural moves are sound: lazy singleton AudioContext (D-01), no
`await` on `resume()` (D-12 synchronous-call-path contract), no `phaseDurationSec`
forwarded (D-03 natural decay), and an import-graph drift-guard for PREV-03.

The findings below are correctness and robustness gaps that should not block a
merge but should be fixed before this surface lands in front of users on iOS
Safari:

- **WR-01** — `previewContext` only checks `state === 'suspended'`; it does not
  cover WebKit's `'interrupted'` state, which the rest of the codebase
  acknowledges (`audioEngine.ts` D-37, `FakeAudioContext._simulateInterrupted`).
  A preview tap after a phone-call interruption on iOS Safari would schedule a
  silent cue.
- **WR-02** — The PREV-03 drift-guard regex misses `storage/settings.ts`
  (`loadMute` / `saveMute` are exported from there) and dynamic imports.
  CONTEXT D-15 explicitly empowered "Claude's Discretion" to widen the
  ban-list; the implemented list is narrower than the threat model justifies.
- **WR-03** — `vi.stubGlobal('AudioContext', ...)` in the D-10(b) suspend test
  is never unstubbed (`unstubGlobals: true` is not set in vite.config.ts and
  `vi.unstubAllGlobals()` is not called in `afterEach`). It works today only
  because subsequent tests in the same file happen to also be singleton-reset
  + AC-spy. The leak is real and the test isolation contract is wishful.
- **WR-04** — `setTimbre(id); playInhalePreview(id)` runs `setTimbre` first;
  if `setTimbre` ever starts throwing in a future refactor (today its disk
  path is silent on quota), no preview cue plays — violates D-09 "fire on
  every tap".

Three Info-level items cover minor type/comment cleanliness.

## Warnings

### WR-01: previewContext does not handle WebKit 'interrupted' state

**File:** `src/audio/previewContext.ts:32-35`

**Issue:**
The state check is exact-match `'suspended'`:

```ts
if (previewCtx.state === 'suspended') {
  void previewCtx.resume()
}
```

WebKit/iOS Safari has a third state `'interrupted'` (e.g., after a phone call,
Siri activation, or another audio app taking over), which the rest of this
codebase explicitly acknowledges:

- `audioEngine.ts:62` widens the type to `AudioContextState | 'interrupted'`
- `audioEngine.ts:68` documents WebKit's superset (D-37)
- `vitest.setup.ts:183` widens the fake state to `AudioContextState | 'interrupted'`
- `vitest.setup.ts:240` exposes `_simulateInterrupted()` precisely for this test path

The D-02 comment in `previewContext.ts:8-11` explicitly cites "iOS Safari +
Chrome auto-suspend" as the reason for the resume call — yet the very iOS
state that needs resume the most is not in the predicate. After a phone-call
interruption, the singleton sits at `state === 'interrupted'`; the next preview
tap schedules a cue against a non-running context, the user hears nothing, and
the audition feature looks broken on iOS.

This is the iOS PWA cold-start case Phase 40 HUMAN-UAT item 4 was written for,
but the structural unit test never exercises `'interrupted'`.

**Fix:**

```ts
export function playInhalePreview(timbre: TimbreId): void {
  const previewCtx = ensurePreviewContext()
  // Cover WebKit's 'interrupted' superset (D-37 mirror) — the post-call /
  // post-Siri state on iOS Safari is not 'suspended'. resume() is idempotent
  // when state === 'running', so the wider predicate is safe.
  if (previewCtx.state !== 'running') {
    void previewCtx.resume()
  }
  scheduleInCueForTimbre(previewCtx, previewCtx.currentTime, previewCtx.destination, timbre)
}
```

And add a unit case mirroring D-10(b) that calls `ctx._simulateInterrupted()`
and asserts `ctx.resume` was invoked.

---

### WR-02: PREV-03 drift-guard regex misses storage/settings.ts and dynamic imports

**File:** `src/audio/previewContext.no-audioengine-import.test.ts:34-41`

**Issue:**
CONTEXT D-11 frames the threat as "previewContext.ts imports neither
./audioEngine nor any module that re-exports the engine's `muted` state",
and CONTEXT D-15 explicitly empowers "Claude's Discretion" to widen the
ban-list. The implemented list covers `audioEngine` (good), the relative-path
variant `../audio/audioEngine` (good), and `useAudioCues` (good). It misses:

1. **`storage/settings.ts`** — exports `loadMute` and `saveMute` (`src/storage/settings.ts:37-44`).
   These ARE muted state at the disk layer; the engine reads `loadMute()` on
   construction. A future "helpful" refactor could write:
   ```ts
   import { loadMute } from '../storage/settings'
   if (loadMute()) return   // silent skip — violates PREV-03
   ```
   The current regex would not catch this. The header comment on the test
   file at line 9 says "any module known to re-export the engine's muted
   state" — `storage/settings` literally is that module for the persistent
   half of the state.

2. **Dynamic `await import('./audioEngine')`** — the `from ['"]...['"]` regex
   only matches static `import ... from '...'` syntax. `await import('./audioEngine')`
   does not contain `from`. The drift-guard misses it. While dynamic imports
   are unusual in this codebase, the comment promises a structural lock.

3. **Side-effect imports** (`import './audioEngine'` without `from`) — also
   miss the `from` keyword. Less plausible for muted state, but easy to add.

4. **Explicit `.ts` extension** — `from './audioEngine.ts'` would also miss
   (Vite accepts both forms).

**Fix:**

```ts
const FORBIDDEN_IMPORTS: Array<{ label: string; pattern: RegExp }> = [
  // Static imports — quoted module specifier, optional .ts extension.
  { label: "import from './audioEngine'", pattern: /from\s+['"]\.\/audioEngine(\.ts)?['"]/ },
  { label: "import from '../audio/audioEngine'", pattern: /from\s+['"]\.\.\/audio\/audioEngine(\.ts)?['"]/ },
  { label: "import from '../hooks/useAudioCues'", pattern: /from\s+['"]\.\.\/hooks\/useAudioCues(\.ts)?['"]/ },
  // D-15 wider net: storage/settings re-exports the disk-mute (loadMute / saveMute).
  { label: "import from '../storage/settings'", pattern: /from\s+['"]\.\.\/storage\/settings(\.ts)?['"]/ },
  // Side-effect imports.
  { label: "side-effect import './audioEngine'", pattern: /import\s+['"]\.\/audioEngine(\.ts)?['"]/ },
  // Dynamic imports.
  { label: "dynamic import './audioEngine'", pattern: /import\(\s*['"]\.\/audioEngine(\.ts)?['"]\s*\)/ },
  { label: "dynamic import '../audio/audioEngine'", pattern: /import\(\s*['"]\.\.\/audio\/audioEngine(\.ts)?['"]\s*\)/ },
]
```

---

### WR-03: vi.stubGlobal('AudioContext', ...) leaks across tests in the file

**File:** `src/audio/previewContext.test.ts:53-62`

**Issue:**
The D-10(b) suspend test stubs `window.AudioContext` with a wrapper class via
`vi.stubGlobal`. Vitest's `vi.stubGlobal` is NOT automatically reverted by
`vi.restoreAllMocks()` — it is reverted only when (a) `unstubGlobals: true`
is set in `vite.config.ts` (it is NOT set here — see `vite.config.ts:63-67`),
or (b) `vi.unstubAllGlobals()` is called explicitly. Neither holds in this
file's `afterEach`.

Result: after the suspend test runs, `window.AudioContext` is still the
wrapper class for any subsequent test in the same file. The D-10(c)
singleton-reuse test that runs next happens to also call
`vi.spyOn(window, 'AudioContext')` — it spies on the WRAPPER, not the original
`FakeAudioContext`. Tests pass today only because (i) the wrapper extends
`OriginalAC` so behavior is identical, and (ii) `vi.resetModules()` in
`beforeEach` re-imports `previewContext`. But the isolation invariant the file
documents ("Singleton isolation: vi.resetModules() in beforeEach ensures...")
is incomplete.

Concrete fragility: if a future test in this file (or imported via the same
worker) cares about `window.AudioContext.prototype` or instance-of checks,
those would fail because the constructor identity has been replaced.

**Fix:** Add `vi.unstubAllGlobals()` to the existing `afterEach`:

```ts
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()   // <-- unstubGlobals is not enabled in vite.config.ts
})
```

Alternatively (project-wide preference), set `test.unstubGlobals: true` in
`vite.config.ts`. The per-file fix is the smaller blast radius.

---

### WR-04: setTimbre runs before playInhalePreview — preview is starved if setTimbre throws

**File:** `src/components/TimbrePicker.tsx:56`

**Issue:**

```jsx
onClick={() => { setTimbre(id); playInhalePreview(id) }}
```

CONTEXT D-09 contracts: "tap = audition — selecting the currently-active
timbre to re-hear it is a feature". The implementation honors that as long
as `setTimbre` returns normally. Today the chain is robust:
`useTimbreChoice.setTimbre` → `savePrefs` → `writeEnvelope` (silent on quota,
`storage.ts:231-233`) and `window.dispatchEvent` is well-defined for built-in
events. So no current bug.

The robustness gap: any future change that lets `setTimbre` throw (e.g.,
adding a `if (!isValidTimbre(next)) throw` guard, or wrapping the dispatch in
a strict listener that re-throws) breaks the audition contract silently —
the user taps and hears nothing because `playInhalePreview` never runs.

Pure-audio side-effects should generally run BEFORE state mutations on
gesture handlers, so the gesture-attachment chain reaches Web Audio promptly
even if the storage layer rejects. This is also the path with the strongest
real-user feedback (audible).

**Fix:** Swap the order (the storage write does not need to land before the
cue is scheduled):

```jsx
onClick={() => { playInhalePreview(id); setTimbre(id) }}
```

If the team prefers to keep state-first ordering, wrap in a try/finally so the
preview always fires:

```jsx
onClick={() => {
  try { setTimbre(id) } finally { playInhalePreview(id) }
}}
```

Either change requires updating `TimbrePicker.test.tsx:71-83` and `85-98`
slightly only if they assert ordering — they do not, so the existing
assertions stand.

## Info

### IN-01: Tuple cast in test misrepresents the actual arg-array length

**File:** `src/audio/previewContext.test.ts:35-39`

**Issue:**

```ts
const callArgs = spy.mock.calls[0] as [AudioContext, number, AudioNode, string, unknown]
expect(callArgs[3]).toBe(timbre)
expect(callArgs).toHaveLength(4)
expect(callArgs[4]).toBeUndefined()
```

The cast asserts a 5-tuple, but the assertion immediately below
(`toHaveLength(4)`) proves the array has only 4 elements. Reading
`callArgs[4]` on a 4-element array is `undefined` regardless of whether the
fifth arg was passed as `undefined` or omitted entirely — `toHaveLength(4)`
already proves omission, so the `callArgs[4]` assertion is redundant.

**Fix:** Either narrow the tuple to 4 elements (which removes the redundancy
and tightens types), or drop the redundant `expect(callArgs[4]).toBeUndefined()`:

```ts
const callArgs = spy.mock.calls[0] as [AudioContext, number, AudioNode, TimbreId]
expect(callArgs[3]).toBe(timbre)
expect(callArgs).toHaveLength(4)   // D-03 natural-decay lock: phaseDurationSec omitted
```

---

### IN-02: D-10(b) test's no-resume-before-mockClear assumption is implicit

**File:** `src/audio/previewContext.test.ts:67-79`

**Issue:** The test asserts `resume` was called exactly once on the second
tap, after `mockClear()`. The control flow assumes:

1. First tap → constructs FakeAudioContext with `state === 'running'` (the
   default per `vitest.setup.ts:183`); `previewContext.ts` does NOT call
   `resume()` because `state === 'suspended'` is false.
2. `_simulateSuspend()` flips state to suspended.
3. Second tap → calls `resume()`.

This is correct, but the test does not assert step 1 (no resume on the first
tap) before clearing. If a future refactor (e.g., addressing WR-01 with
`state !== 'running'`) causes `resume()` to be called on construction-fresh
contexts that briefly report a non-running state, this test would still pass
because `mockClear()` discards that call. The intent — "resume is called
because of the suspend, not as a constant — would be stronger without the
`mockClear`:

**Fix (defensive):** Add a check before clearing:

```ts
playInhalePreview('bowl')
expect(capturedCtx).not.toBeNull()
const ctx = capturedCtx!
// Default FakeAudioContext.state === 'running' → no resume on tap 1.
expect(ctx.resume).not.toHaveBeenCalled()
ctx._simulateSuspend()
playInhalePreview('bowl')
expect(ctx.resume).toHaveBeenCalledTimes(1)
```

Removes the `mockClear()` entirely and tightens the contract.

---

### IN-03: Drift-guard comment mismatches the test it documents (singular vs. broader claim)

**File:** `src/audio/previewContext.no-audioengine-import.test.ts:9-10, 44`

**Issue:** The header (line 9-10) says: "Proving that previewContext.ts
imports neither ./audioEngine nor any module known to re-export the engine's
muted state". The assertion in the `it()` body (line 44) repeats the same
phrasing. Today the test's actual ban-list is three entries, none of which
is `storage/settings.ts` (which DOES re-export muted state at the disk
layer — see WR-02). The comment over-promises relative to the code.

After WR-02's fix lands, the comment is accurate. Until then, either:

- Tighten the comment to match the actual ban-list, or
- Expand the ban-list to match the comment (preferred — WR-02 fix).

**Fix:** Apply WR-02 (recommended), which makes the comment factually
correct. Alternative narrow fix is to soften the comment:

```ts
//   …proving previewContext.ts imports neither ./audioEngine, nor the
//   useAudioCues hook (which would re-export muted via React state if
//   refactored). The disk-layer mute (storage/settings.ts) is intentionally
//   NOT in the ban-list because <document the rationale>.
```

---

_Reviewed: 2026-05-21T23:20:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
