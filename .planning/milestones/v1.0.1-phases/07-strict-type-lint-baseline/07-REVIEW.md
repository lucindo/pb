---
phase: 07-strict-type-lint-baseline
reviewed: 2026-05-11T00:00:00Z
depth: standard
files_reviewed: 39
files_reviewed_list:
  - src/app/App.audio.test.tsx
  - src/app/App.dialog.test.tsx
  - src/app/App.persistence.test.tsx
  - src/app/App.session.test.tsx
  - src/app/App.tsx
  - src/app/App.wakeLock.test.tsx
  - src/audio/audioEngine.test.ts
  - src/audio/audioEngine.ts
  - src/audio/cueSynth.test.ts
  - src/audio/cueSynth.ts
  - src/components/BreathingShape.test.tsx
  - src/components/BreathingShape.tsx
  - src/components/EndSessionDialog.tsx
  - src/components/LearnAnchor.tsx
  - src/components/LearnDialog.test.tsx
  - src/components/LearnDialog.tsx
  - src/components/MuteToggle.test.tsx
  - src/components/MuteToggle.tsx
  - src/components/ResetStatsDialog.test.tsx
  - src/components/ResetStatsDialog.tsx
  - src/components/SessionControls.tsx
  - src/components/SettingsForm.tsx
  - src/components/SettingsStepper.tsx
  - src/components/StatsFooter.tsx
  - src/domain/sessionMath.ts
  - src/domain/settings.ts
  - src/hooks/useAudioCues.test.tsx
  - src/hooks/useAudioCues.ts
  - src/hooks/usePrefersReducedMotion.test.ts
  - src/hooks/usePrefersReducedMotion.ts
  - src/hooks/useSessionEngine.ts
  - src/hooks/useWakeLock.test.tsx
  - src/hooks/useWakeLock.ts
  - src/main.tsx
  - src/storage/format.ts
  - src/storage/settings.test.ts
  - src/storage/stats.test.ts
  - src/storage/storage.test.ts
findings:
  blocker: 0
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-11
**Depth:** standard
**Files Reviewed:** 39 (38 listed + extra coverage check on `useAudioCues.test.tsx`)
**Status:** issues_found

## Summary

Phase 7 landed TypeScript strict mode, `strictTypeChecked` ESLint, and `react-hooks/exhaustive-deps: 'error'` across the codebase, with three categories of lint silencing patterns:

1. **`this: void` on interface method declarations** — to silence `@typescript-eslint/unbound-method`.
2. **`() => { void callback() }` JSX wrappers** — to silence `@typescript-eslint/no-misused-promises` when handing an `async () => Promise<void>` to a `() => void` prop.
3. **`// Reason: …` + `// eslint-disable-next-line …` annotations** — auditable suppressions for invariants the type system cannot prove.

The patterns themselves are sound and behavior-preserving. **No blockers were found**: the `this: void` annotations, void-wrapper JSX patterns, and `// Reason:` annotated disables do not introduce runtime regressions. The four warnings below are mostly quality issues: a non-discriminating disjunctive test assertion, a `// Reason:` annotation that misdescribes the rule the disable targets, and two deviations from the planning that leave dead code under a misleading annotation.

The findings are listed by severity. None block the Phase 7 invariants (tsc clean, lint clean, build clean, 363/363 vitest).

---

## Warnings

### WR-01: Non-discriminating disjunctive assertion masks D-35b muted-state-preservation regression

**File:** `src/app/App.audio.test.tsx:496`
**Issue:**
The "D-42 (3): reconstruction preserves muted state (D-35b)" test asserts:

```tsx
const labelAfter = muteButton().getAttribute('aria-label')
expect(['Mute audio cues', 'Resume audio']).toContain(labelAfter)
```

The block comment immediately above (lines 486–494) explicitly documents the contract: muted=true MUST be preserved across reconstruction; net label after click MUST be `'Mute audio cues'`. The comment then says "If reconstruction failed and we are still in needs-resume, the label would be 'Resume audio' instead."

By including `'Resume audio'` in the `expect().toContain()` set, the test passes whether or not the contract holds. If reconstruction silently fails to call `newEngine.setMuted(currentMuted)`, the test still passes via the `'Resume audio'` arm. This is the exact "non-discriminating disjunctive assertion" anti-pattern that the close→unavailable test at `src/hooks/useAudioCues.test.tsx:614-618` explicitly addresses with the comment "Discriminating assertion: audioStatus MUST be 'unavailable' exactly. … The disjunctive {ok, unavailable} assertion used previously was non-discriminating because stop()'s reset masked the bug."

The same anti-pattern is reintroduced here. The test as written cannot detect a D-35b regression.

**Fix:**
Drop the `'Resume audio'` arm so the test enforces the documented contract:

```tsx
// Discriminating assertion: muted=true is preserved across reconstruction, then
// flipped to false by persistedSetMuted(!audio.muted); net label MUST be 'Mute
// audio cues'. 'Resume audio' would indicate reconstruction failed to call
// newEngine.setMuted(currentMuted) — D-35b regression.
expect(labelAfter).toBe('Mute audio cues')
```

If the test setup makes `'Resume audio'` an acceptable outcome under some other condition, document THAT condition in a separate test case rather than weakening this one.

---

### WR-02: `// Reason:` annotation in `usePrefersReducedMotion.ts` describes a rule that is not the one being suppressed

**File:** `src/hooks/usePrefersReducedMotion.ts:7-9, 16-18`
**Issue:**
Both `if (!window.matchMedia)` guards carry the annotation:

```ts
// Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill); typed as always-defined by DOM lib but absent in some test hosts.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!window.matchMedia) {
```

Two issues with this Reason text:

1. **Factually wrong about jsdom.** jsdom DOES provide `window.matchMedia` (the test on line 11 of `usePrefersReducedMotion.test.ts` runs with no stub and passes — proving `window.matchMedia` is defined in the test host). The "jsdom without polyfill" justification is not the actual reason this guard exists.
2. **Misaligned with the planning.** Phase 7 RESEARCH.md (Fix Category 6, sub-section `usePrefersReducedMotion.ts`) explicitly **recommends Option A** — *remove the dead SSR guard since this is pure SPA*. The shipped code took Option B (keep the guard + annotate) but justified it with a Reason text that contradicts the planning recommendation.

The disable suppresses `no-unnecessary-condition`. The rule fires because the DOM lib types `window.matchMedia` as `(query: string) => MediaQueryList` — non-optional. The Reason annotation should either:
- Acknowledge that the SPA decision was overruled and name the actual invariant being protected, OR
- Be removed in favor of Option A (delete the dead guard, per planning recommendation).

The D-04 policy (CONTEXT.md): "Reject any reason that is generic … without naming the invariant." This Reason names an invariant that does not exist in any tested environment.

**Fix:**
Either:

**(a)** Remove the dead guards entirely per RESEARCH.md Option A:

```ts
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    // Reason: re-seed … (existing annotation preserved)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mql.matches)
    // …rest unchanged
  }, [])

  return reduced
}
```

**(b)** Keep the guards but fix the Reason text to name the actual invariant (e.g., "portability hedge for non-browser hosts in case the hook is reused under SSR or a Node build target in v1.1; intentionally redundant with DOM lib types"). Then file an entry under `Out of Scope` so the audit trail explains why Option A was rejected.

---

### WR-03: `useAudioCues.ts` re-anchor offset is computed from a stale `sessionFrameRef` snapshot when reconstruction fires mid-frame

**File:** `src/app/App.tsx:83-90` (in tandem with `src/hooks/useAudioCues.ts:292`)
**Issue:**
`onAudioReanchorRequired` reads `sessionFrameRef.current?.elapsedMs ?? 0` to compute the new audio anchor offset:

```ts
const onAudioReanchorRequired = useCallback((newAudioAnchor: number) => {
  const elapsedMs = sessionFrameRef.current?.elapsedMs ?? 0
  audioAnchorRef.current = newAudioAnchor - elapsedMs / 1000
}, [])
```

`sessionFrameRef` is updated by a passive effect at line 80-82:

```ts
const sessionFrameRef = useRef(session.currentFrame)
useEffect(() => {
  sessionFrameRef.current = session.currentFrame
}, [session.currentFrame])
```

There is a one-render lag: the effect runs AFTER React commits the render with the new `session.currentFrame`. If `reconstructEngine` runs SYNCHRONOUSLY during a render (it is called from `resume`, which is awaited inside an event handler — the event handler may run between rAF ticks), the most recent `session.currentFrame` may not yet have been mirrored into `sessionFrameRef.current`.

Concrete sequence:
1. rAF tick N updates `state.lastFrame.elapsedMs` (via `useSessionEngine`'s tick callback at sessionMath.ts internals).
2. React renders App with the new `state`, computing the new `session.currentFrame`.
3. **Between commit and the post-commit effect at line 80-82**, the user clicks the resume affordance. The onClick handler calls `audio.resume()`, which calls `reconstructEngine`, which synchronously calls `onReanchorRequiredRef.current?.(newEngine.now())`.
4. `onAudioReanchorRequired` reads `sessionFrameRef.current` — this is the **prior** frame's elapsedMs, not the current one.

In practice the delta is small (one rAF interval ~16ms = 0.016 sec of audio offset) and the dual-anchor math then carries that error forward into every subsequent cue boundary computation.

A simpler implementation that does not have this lag would read `session.currentFrame?.elapsedMs ?? 0` directly inside the useCallback and add `session.currentFrame` to the dep array — but this would churn the callback identity on every rAF tick and undo the design intent. The `useRef` mirror was added to avoid churn; the lag is the cost.

**Fix:**
Either accept the ≤16ms drift as documented behavior (add a comment to `onAudioReanchorRequired` naming the lag and showing the math), OR populate the ref **synchronously during render** (a write during render is acceptable for ref-only state that does not affect the render output):

```ts
const sessionFrameRef = useRef(session.currentFrame)
sessionFrameRef.current = session.currentFrame  // sync write each render, no effect needed
```

A render-time ref write is the React-documented pattern for "mirror a value into a ref without an effect" (https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents). It is closure-stable and lag-free. This is a Phase 7-adjacent quality issue, not a strict-mode regression, but Phase 7's effect-dependency audit should have surfaced it.

---

### WR-04: `useAudioCues.ts:124-127` Reason annotation describes the wrong reason

**File:** `src/hooks/useAudioCues.ts:124-128`
**Issue:**
```ts
} else if (
  // Reason: explicit state check documents the WebKit-specific 'interrupted' state-machine branch (D-37); TS narrowing here is incidental to the documentation purpose.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  (state === 'suspended' || state === 'interrupted') &&
  visibilityResumeAttemptedRef.current
) {
```

The Reason names "WebKit-specific 'interrupted' state-machine branch (D-37)". But the rule fires because, AFTER the prior branches handled `'running'` and `'closed'`, TypeScript narrowed the union to `'suspended' | 'interrupted'` — so the `(state === 'suspended' || state === 'interrupted')` check is provably always-true. The disable is suppressing the always-true narrowed disjunction, NOT documenting the 'interrupted' literal specifically.

The annotation should name the actual invariant being protected. As written, a future reader who tries to "clean up" the redundant check (per the rule's suggestion) by removing one of the disjuncts will lose the WebKit documentation that the Reason was trying to preserve — but the linter would have correctly flagged that change because the documentation was disguised as a runtime check.

**Fix:**
Restructure so the comment is independent from the suppressed rule:

```ts
// Plan 06 D-37: WebKit 'interrupted' is a non-standard 5th AudioContextState, not
// part of TypeScript's DOM lib union. Listing it explicitly alongside 'suspended'
// documents the WebKit state-machine branch and survives any future DOM-lib
// widening that adds 'interrupted' to the standard union.
} else if (
  // Reason: TS narrows state to 'suspended' | 'interrupted' after the prior branches; the disjunction is provably always-true here but documents the two states semantically.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  (state === 'suspended' || state === 'interrupted') &&
  visibilityResumeAttemptedRef.current
) {
```

The narrative comment lives above the disable; the Reason names the actual TS-narrowing invariant the disable is suppressing.

---

## Info

### IN-01: `SettingsStepper.changeBy` wraps around with `.at()` if the disabled-state guard ever lags

**File:** `src/components/SettingsStepper.tsx:26-31`
**Issue:**
```ts
const changeBy = (offset: -1 | 1) => {
  const nextValue = options.at(selectedIndex + offset)
  if (nextValue !== undefined) {
    onChange(nextValue)
  }
}
```

`Array.prototype.at` accepts negative indices and counts from the end. The button is correctly disabled via `disabled || disableDecrease || !canDecrease` (line 46) and `disabled || disableIncrease || !canIncrease` (line 61), so `changeBy(-1)` cannot fire when `selectedIndex === 0` under normal flow.

However, if a future caller calls the function programmatically OR a future refactor relies on the disabled state for safety but the click outpaces the React re-render, `options.at(-1)` would return the LAST element of the array — a wraparound bug. With `noUncheckedIndexedAccess`, the previous form `options[selectedIndex + offset]` would have returned `undefined` for index -1, making the bug into a no-op via the `if (nextValue !== undefined)` guard.

The change from `options[i]` to `options.at(i)` was made (per Phase 7 PATTERNS.md Fix Category 9, sub-section `SettingsStepper.tsx:28`) to satisfy `no-unnecessary-condition` — `.at()` returns `T | undefined` unambiguously. The fix is correct for the lint rule but introduces a subtle wraparound risk that the prior bracket-access did not have.

**Fix:**
Add a positive-index guard to make `.at()` behave like the old bracket-access for negative offsets:

```ts
const changeBy = (offset: -1 | 1) => {
  const targetIndex = selectedIndex + offset
  if (targetIndex < 0) return
  const nextValue = options.at(targetIndex)
  if (nextValue !== undefined) {
    onChange(nextValue)
  }
}
```

Defense-in-depth — the disabled-state guard remains the primary protection.

---

### IN-02: `audio` dep in `onMuteOrResumeClick` churns the callback every render

**File:** `src/app/App.tsx:189-194`
**Issue:**
```ts
const onMuteOrResumeClick = useCallback(async () => {
  if (audio.audioStatus === 'needs-resume') {
    await audio.resume()
  }
  persistedSetMuted(!audio.muted)
}, [audio, persistedSetMuted])
```

`audio` is the object literal returned by `useAudioCues()`. Per the comment at lines 148-153, the hook returns a fresh object every render, which is why `audioStop`, `audioStart`, and `audioNotifyPhaseBoundary` are hoisted into stable local consts and used in effect deps instead of `audio` itself.

`onMuteOrResumeClick` does not follow that pattern — it depends on the whole `audio` object, so the `useCallback` is invalidated every render. The downstream `onMuteToggle={() => { void onMuteOrResumeClick() }}` arrow at line 529 is a new arrow each render anyway, so the practical impact on SessionControls re-rendering is zero. This is not a behavior bug.

It is a consistency issue: the rest of the file went through extra effort to stabilize callback identity against the `audio` object literal churn (lines 154-167). This callback skips that effort.

**Fix:**
Hoist the three specific fields used by the callback (mirroring the pattern at lines 154-156):

```ts
const audioStatus = audio.audioStatus
const audioMuted = audio.muted
const audioResume = audio.resume

const onMuteOrResumeClick = useCallback(async () => {
  if (audioStatus === 'needs-resume') {
    await audioResume()
  }
  persistedSetMuted(!audioMuted)
}, [audioStatus, audioMuted, audioResume, persistedSetMuted])
```

Note: `audio.audioStatus` and `audio.muted` are React state — they DO change identity per render when the underlying state changes (so the callback rightly invalidates then). `audio.resume` is `useCallback`-stable in the hook (deps `[reconstructEngine]`, which itself depends on `[muted, handleStateChange]`). Net result: callback only churns when the relevant state changes, not every render.

---

### IN-03: `audioEngine.ts` `(err as DOMException)?.name` optional chain is meaningless after the cast

**File:** `src/audio/audioEngine.ts:236`
**Issue:**
```ts
if ((err as DOMException)?.name === 'InvalidStateError') {
```

The `?.` after a type assertion is dead — type assertions don't make a value nullable. The `?.` only matters if the actual runtime value of `err` is `null` or `undefined`. In a `catch (err)` block under modern JS, `err` can be `undefined` only if the throwing code explicitly threw `undefined` (rare). The cast `(err as DOMException)` doesn't change the runtime, so this expression is equivalent to `((err as DOMException) && (err as DOMException).name === 'InvalidStateError')` which is what the optional chain compiles to.

The intent is presumably "if err is a DOMException, check its name" — but the cast doesn't perform a runtime check, so a non-DOMException err (e.g., a TypeError) would still match if its `.name === 'InvalidStateError'`. In practice no other error type uses that name, so the behavior is correct, but the code suggests a runtime guard that does not exist.

**Fix:**
Either use a real `instanceof` check, or just access `.name` directly:

```ts
// Option A — real runtime guard:
if (err instanceof DOMException && err.name === 'InvalidStateError') { … }

// Option B — accept any error with that name (current effective behavior, made explicit):
const errName = err instanceof Error ? err.name : undefined
if (errName === 'InvalidStateError') { … }
```

---

### IN-04: `useWakeLock` request() race against in-flight calls (not Phase 7 regression — pre-existing)

**File:** `src/hooks/useWakeLock.ts:34-60`
**Issue:**
```ts
const request = useCallback(async (): Promise<void> => {
  if (!('wakeLock' in navigator)) return
  if (sentinelRef.current !== null) return
  try {
    const sentinel = await navigator.wakeLock.request('screen')
    sentinelRef.current = sentinel
    // …
  }
}, [])
```

The `if (sentinelRef.current !== null) return` idempotency check happens BEFORE the `await`. If two callers invoke `request()` in rapid succession before the first `await` resolves, both checks pass (`sentinelRef.current` is still null) and both proceed to call `navigator.wakeLock.request('screen')` — yielding two sentinels, with the second overwriting the ref and the first becoming orphaned.

The match-pair guard at line 50 (`if (sentinelRef.current === sentinel)`) prevents the orphaned sentinel's 'release' event from clobbering the active ref, but the orphan still holds a live OS wake lock that only releases when the OS GCs it or the page unloads.

This is **not a Phase 7 regression** — the code pre-dates Phase 7. Phase 7 only added the `this: void` annotations to the interface. Flagging here as Info because the standard-depth review found it and it merits a follow-up under the owning phase (MOBL-02 / Phase 5).

**Fix:**
Out of Phase 7 scope. File for the owning phase: add an in-flight flag that flips synchronously before the await:

```ts
const inFlightRef = useRef<boolean>(false)

const request = useCallback(async (): Promise<void> => {
  if (!('wakeLock' in navigator)) return
  if (sentinelRef.current !== null || inFlightRef.current) return
  inFlightRef.current = true
  try {
    const sentinel = await navigator.wakeLock.request('screen')
    sentinelRef.current = sentinel
    // …
  } finally {
    inFlightRef.current = false
  }
}, [])
```

---

### IN-05: Phase 7 PATTERNS.md prescribed `// Reason:` placement but several disables silently deviated

**File:** Multiple, e.g. `src/app/App.audio.test.tsx:148-153, 151-153`, `src/audio/cueSynth.test.ts:71-72, 74-75, 105-107`
**Issue:**
Phase 7 PATTERNS.md Shared Patterns says: "Reason: \<one sentence naming the invariant\> / eslint-disable-next-line \<rule\> / \<code that fires the rule\>".

In `src/audio/cueSynth.test.ts:70-77`, two adjacent `unbound-method` disables share a single Reason line at line 71 with both `// eslint-disable-next-line @typescript-eslint/unbound-method` directives at lines 72 and 74. The second disable at line 74 has no immediately-preceding `// Reason:` line (the prior Reason is two lines up). A reader scanning for "is this disable justified?" sees an unannotated disable.

Multiple test files exhibit the same pattern: one Reason line followed by multiple disables (e.g., `src/components/BreathingShape.test.tsx:175-181` — one Reason, four `eslint-disable-next-line @typescript-eslint/no-non-null-assertion`).

CONTEXT.md D-04: "Each surviving disable MUST be preceded by (or carry on the same line) a `// Reason: …` annotation naming the invariant being protected. Unjustified disables are removed." The single-Reason-shared-by-multiple-disables pattern technically violates the letter of D-04 (only the FIRST disable has a Reason immediately preceding it).

This is consistency-only — the audit intent is preserved when reading the block as a whole — but a custom enforcement rule (D-05 deferred to v1.1) would flag every disable after the first.

**Fix:**
Either (a) accept the pattern and update D-04 wording to "Each cluster of related disables must be preceded by a `// Reason:`" or (b) duplicate the Reason line above every disable. Option (a) preserves readability; option (b) preserves auditability and matches the strictest reading of D-04.

---

_Reviewed: 2026-05-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
