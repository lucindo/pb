---
phase: 51-master-clock-unification
reviewed: 2026-05-28T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/audio/swappableSessionClock.ts
  - src/audio/swappableSessionClock.test.ts
  - src/hooks/useAudioCues.ts
  - src/hooks/useAudioCues.test.tsx
  - src/hooks/useSessionEngine.ts
  - src/hooks/useSessionEngine.test.tsx
  - src/hooks/useBreathingSessionController.ts
  - src/hooks/useBreathingSessionController.test.tsx
  - src/hooks/useNaviKriyaAudio.ts
  - src/hooks/useNaviKriyaAudio.test.tsx
  - src/hooks/useNaviKriyaSessionController.ts
  - src/hooks/useNaviKriyaSessionController.test.tsx
  - src/app/appControllerAdapters.test.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 51: Code Review Report

**Reviewed:** 2026-05-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the Phase 51 master-clock unification work — primarily the new `createSwappableSessionClock` proxy, its integration into `useAudioCues` and `useNaviKriyaAudio`, the new `reanchorSessionClock` path on `useSessionEngine`, and the controller-level bridges. The implementation is largely sound: subscription-survival semantics (D-04) in the proxy are correct, the reanchor math is algebraically right, and the new fake-timer-driven `MockSessionClock` tests (B1/B2/B3/B5/B7/B8) are deterministic by construction.

No critical (Blocker-tier) defects were found, but there are 4 Warning-tier concerns worth addressing:

1. The `useMemo(createSwappableSessionClock(...), [])` identity pattern in both `useAudioCues` and `useNaviKriyaAudio` is not a documented React identity guarantee — `useRef`-based lazy init is the safer pattern.
2. `reanchorSessionClock` accepts any finite `number` (including `NaN`/negative) without defensive validation; an upstream regression could silently poison `startedAtSec`.
3. The B3 "cross-clock-source" test in `useSessionEngine.test.tsx` does NOT actually exercise the proxy's D-03 identity-stability path; it tests the math via a `rerender` that re-creates the rAF effect — opposite of production behavior.
4. `useAudioCues` subscribes directly to `engine.clock` and tracks unsubs manually rather than going through the proxy's D-04 subscription-survival mechanism — leaving the proxy's primary architectural benefit unused inside the very hook that owns it.

Plus 5 informational items (comments, parity gaps, dead-comment drift).

## Warnings

### WR-01: `useMemo(... , [])` is not a guaranteed-stable identity in React 18+

**File:** `src/hooks/useAudioCues.ts:119`, `src/hooks/useNaviKriyaAudio.ts:83-86`
**Issue:** Both hooks rely on `useMemo(() => createSwappableSessionClock(createWallSessionClock()), [])` to obtain a stable proxy instance for the lifetime of the hook. React's official docs explicitly state that `useMemo` is a *performance optimization, not a semantic guarantee*: React may discard a memoized value and re-invoke the factory (offscreen Suspense, dev-mode strict re-runs, future scheduler changes). If that ever happens mid-lifecycle, the returned `proxyMemo.clock` reference exposed to consumers would silently diverge from `proxyMemoRef.current` (captured at first render and used for `setSource`). Subsequent `setSource(engine.clock)` calls would mutate the *old* proxy while `useSessionEngine` is still holding `clock.now()` against the new one — silent clock-divergence.

The defensive `proxyMemoRef = useRef(proxyMemo)` (L124) latches the FIRST `useMemo` result; if useMemo later returns a new object, the ref and the live `clock` prop diverge.

This is the documented identity-stability anti-pattern in React 18 (React Beta docs, "You should not rely on useMemo as a semantic guarantee").

**Fix:** Use `useRef` + lazy init, which IS guaranteed by React to return the same object for the lifetime of the component:
```ts
const proxyRef = useRef<SwappableSessionClock | null>(null)
if (proxyRef.current === null) {
  proxyRef.current = createSwappableSessionClock(createWallSessionClock())
}
const proxy = proxyRef.current
// Then: clock: proxy.clock, proxy.setSource(...)
```
Apply the same change in `useNaviKriyaAudio.ts:83-86`.

---

### WR-02: `reanchorSessionClock` accepts NaN / negative `newClockNow` without validation

**File:** `src/hooks/useSessionEngine.ts:322-339`
**Issue:** The reanchor updater performs `newStartedAtSec = newClockNow - currentState.lastFrame.elapsedSec` without sanity-checking `newClockNow`. If an upstream regression in `useAudioCues.reconstructEngine` (L536) ever passes `NaN` (e.g., a future change that reads from a stub-rejected AC), `startedAtSec` becomes `NaN`, every subsequent `elapsed = clock.now() - NaN = NaN`, and `completeIfNeeded` produces a `NaN` frame for the remainder of the session. The session would silently stop advancing and never auto-complete (NaN comparisons are always false → `lastFrame.isComplete` stays false).

Concrete trigger: `newEngine.clock.now()` reads `audioCtx.currentTime` which CAN return NaN on some Safari versions when the AC was constructed but never resumed (rare but documented). The current code would propagate NaN through the entire session.

**Fix:** Guard at the boundary:
```ts
const reanchorSessionClock = useCallback((newClockNow: number) => {
  if (!Number.isFinite(newClockNow) || newClockNow < 0) {
    // Defensive: AC.currentTime should always be finite and non-negative.
    // Bail rather than poisoning startedAtSec.
    return
  }
  setState((currentState) => { ... })
}, [])
```
Symmetric guard in the `useAudioCues.reconstructEngine` reanchor call site at `useAudioCues.ts:536` would be belt-and-suspenders.

---

### WR-03: B3 cross-clock-source test does NOT exercise the proxy's identity-stability path

**File:** `src/hooks/useSessionEngine.test.tsx:943-1003`
**Issue:** Test B3 ("reanchorSessionClock preserves elapsed across an AC origin change") claims to exercise "the cross-clock-source angle" via:
```ts
rerender({ clock: mock2.clock })
```
But the production code path goes the OPPOSITE direction: the swappable proxy's whole D-03 invariant is that `clock` identity NEVER changes across `setSource`. The rerender-with-new-clock approach actually tears down and re-creates the rAF effect (because `clock` is in the dep array at `useSessionEngine.ts:214`), which is the failure mode the proxy was built to prevent.

Net effect: B3 proves the reanchor MATH is right (which it is), but provides zero coverage of the actual production swap path, where:
1. `clock` identity is preserved across reconstruction (proxy's D-03)
2. The rAF effect is NOT re-created (no clock-dep churn)
3. The next tick reads `clock.now()` against the new internal source via the same proxy reference

A regression that broke the proxy identity invariant (e.g., rebuilding `clock` inside `setSource`) would NOT be caught by B3 — it would only be caught by the dedicated `swappableSessionClock.test.ts` Test 1.

**Fix:** Either rename B3 to clarify it tests math-only ("B3-math: reanchor preserves elapsed when computed against the new origin"), or add a B3b that uses a real `createSwappableSessionClock` + `setSource` to exercise the identity-stable path end-to-end:
```ts
const proxy = createSwappableSessionClock(mock.clock)
const { result, rerender } = renderHook(({ clock }) => useSessionEngine(openEnded, null, clock), {
  initialProps: { clock: proxy.clock },
})
// ... advance, capture elapsed ...
proxy.setSource(mock2.clock)  // production-shape swap, identity stable
result.current.reanchorSessionClock(0.5)
// rerender NOT needed — proxy.clock identity unchanged
act(() => { vi.advanceTimersByTime(100) })
// assert no discontinuity
```

---

### WR-04: `useAudioCues` does not use its own proxy's D-04 subscription-survival mechanism

**File:** `src/hooks/useAudioCues.ts:341-344, 463-466, 508-515`
**Issue:** The proxy is designed so subscriptions on `clock.onSuspend/onResume/onClose` automatically survive `setSource` (D-04 — the whole reason the per-channel `Map<cb, unsub>` tracking exists). However, inside `useAudioCues` itself, `handleResume/handleSuspend/handleClose` are subscribed directly to `engine.clock.on*` (not via `proxyClock.on*`), and the hook manually:
- Tracks unsubs in `clockUnsubsRef` (L201)
- Tears them down before reconstruction (L463-466)
- Re-subscribes against the NEW engine clock (L512-515)

This duplicates work the proxy already does. More importantly, it means the proxy's `proxySuspendSubs/proxyResumeSubs/proxyCloseSubs` Sets and `*UnsubMap` Maps are EMPTY in practice — every test and production run of `useAudioCues` exercises the proxy with zero subscribers, so the D-04 subscription-survival code path in `swappableSessionClock.ts` resubscribeChannel (L98-111) is effectively dead code in production. Only `swappableSessionClock.test.ts` covers it.

This is architectural debt: the proxy's primary safety claim (subscription-survival across reconstruction) is asserted in tests but never actually used by its sole production consumer.

**Fix:** Either:
1. Subscribe via the proxy (`proxyClock.onResume(handleResume)` etc.) and delete the manual `clockUnsubsRef` re-subscribe dance in `reconstructEngine`. The proxy's `setSource` handles re-forwarding.
2. Or, if there's a reason to keep manual control (e.g., needing the synthetic-suspend `notifySuspended` escape hatch which the proxy hides), document explicitly that the proxy's D-04 invariant is dormant in production and only exists for hypothetical future external consumers — and consider whether the per-channel Maps should be deleted to reduce maintenance surface.

Option (1) is the cleaner posture and aligns code with the architectural intent stated in `swappableSessionClock.ts`'s D-04 invariant.

## Info

### IN-01: Misleading comment about source-pointer ordering in `setSource`

**File:** `src/audio/swappableSessionClock.ts:239-242`
**Issue:** The comment says "Update the source pointer AFTER re-subscribe so that any `now()` calls inside the subscribe callbacks see the new source (edge case: unlikely, but safer ordering)." This rationale is unclear — `next.onSuspend(cb)` only REGISTERS cb on next; it does not invoke cb. There's no `now()` call inside the subscribe action that could even observe `currentSource`. The comment misdescribes why the order matters (or doesn't matter).

**Fix:** Clarify or remove. If the ordering doesn't matter (it doesn't, in current code), say so: "// Order is incidental: resubscribeChannel only registers, never invokes, callbacks. Pointer update could happen first or last." Or, if there's a real concern (e.g., a future change where `subscribeOnNext` could synchronously fire), explicitly call out that scenario.

---

### IN-02: Test name in `swappableSessionClock.test.ts` describes proxy as `off()` but proxy uses `onSuspend`-returned function

**File:** `src/audio/swappableSessionClock.test.ts:143`
**Issue:** Test title says "off() removes callback from proxy and from underlying source; second off() is a no-op". The variable is locally called `off` (L148: `const off = proxy.clock.onSuspend(cb)`) but the public API has no member named `off` — it's just the returned-from-`onSuspend` function. Confusing for grep/triage. Minor.

**Fix:** Rename test title: "unsubscribe function returned by onSuspend removes the callback and is idempotent".

---

### IN-03: `useNaviKriyaAudio.closeAfterEndCue` ringout timer is not tracked for cancellation on unmount

**File:** `src/hooks/useNaviKriyaAudio.ts:163-174, 176-188`
**Issue:** `closeAfterEndCue` schedules `window.setTimeout(() => closeAudioContext(audioCtx), END_CHORD_RINGOUT_MS)`. If the component unmounts during the ringout window:
- `audioCtxRef.current` is already nulled (L165), so the unmount cleanup at L178-180 sees null and does NOT close the AC.
- The pending setTimeout still fires later and calls `closeAudioContext(audioCtx)` on a captured reference — the AC eventually closes, which is OK.
- However, the setTimeout itself is not cleared, so it leaks the timer handle until it fires.

Minor in practice — the timer is short-lived (~250ms) and will fire and resolve cleanly. But the pattern violates the "all side-effects must be cleared on unmount" hygiene followed elsewhere in this codebase (e.g., `clearLeadInTimeouts`).

**Fix:** Track the timeout id in a ref and clear it on unmount:
```ts
const ringoutTimeoutRef = useRef<number | null>(null)
// In closeAfterEndCue:
ringoutTimeoutRef.current = window.setTimeout(() => {
  ringoutTimeoutRef.current = null
  closeAudioContext(audioCtx)
}, END_CHORD_RINGOUT_MS)
// In unmount cleanup:
if (ringoutTimeoutRef.current !== null) {
  window.clearTimeout(ringoutTimeoutRef.current)
  closeAudioContext(audioCtx)  // close synchronously instead
}
```

---

### IN-04: Reanchor JSDoc mentions D-11 ordering but does not enforce it at the type level

**File:** `src/hooks/useSessionEngine.ts:96-99`
**Issue:** The JSDoc says: "D-11 ordering: this method fires BEFORE `onReanchorRequired` (the audio-anchor reanchor). The caller (`useBreathingSessionController` via `onSessionClockReanchored`) guarantees the ordering." But this is a documentation-only constraint — there's no runtime guard or test that enforces it at this layer. The ordering is verified in `useAudioCues.test.tsx:1488-1534` via `invocationCallOrder`, which is the right place, but the comment here suggests a stronger contract than exists.

**Fix:** Either soften the wording ("by convention, callers fire this before `onReanchorRequired`") or add a defensive runtime check in tests that asserts the ordering is preserved if a future refactor reorders the calls in `useAudioCues.reconstructEngine`. Low priority.

---

### IN-05: Dead-comment drift — comment at `useAudioCues.ts:194-200` references `Phase 50 D-11 + revision 1 Blocker #1` but Phase 51 has overlaid the wiring

**File:** `src/hooks/useAudioCues.ts:194-200, 259-263, 387-393, 463-466`
**Issue:** Multiple comments reference Phase 50 decisions (D-11, revision 1 Blocker #1) for the clock-subscription teardown logic. Phase 51 added the proxy on top, and the subscriptions are still wired against `engine.clock` directly (not the proxy — see WR-04). The comments accurately describe what happens but do not acknowledge that Phase 51's proxy makes the manual teardown semi-redundant. Reviewers reading this in Phase 52+ will find the rationale confusing.

**Fix:** Add a one-liner to each comment block: "Phase 51 note: subscriptions are intentionally registered directly on engine.clock (NOT the proxy) so the engine-only `notifySuspended` synthetic-suspend path remains observable. The proxy's D-04 subscription survival is therefore unused in production." This makes the architectural choice explicit instead of implicit.

---

_Reviewed: 2026-05-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
