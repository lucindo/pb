---
phase: full-codebase-review
reviewed: 2026-05-11T00:00:00Z
depth: deep
files_reviewed: 35
files_reviewed_list:
  - src/app/App.tsx
  - src/main.tsx
  - src/audio/audioEngine.ts
  - src/audio/cueSynth.ts
  - src/components/BreathingShape.tsx
  - src/components/EndSessionDialog.tsx
  - src/components/LearnAnchor.tsx
  - src/components/LearnDialog.tsx
  - src/components/MuteToggle.tsx
  - src/components/ResetStatsDialog.tsx
  - src/components/SessionControls.tsx
  - src/components/SessionReadout.tsx
  - src/components/SettingsForm.tsx
  - src/components/SettingsStepper.tsx
  - src/components/StatsFooter.tsx
  - src/content/learnContent.ts
  - src/domain/breathingPlan.ts
  - src/domain/sessionController.ts
  - src/domain/sessionMath.ts
  - src/domain/settings.ts
  - src/hooks/useAudioCues.ts
  - src/hooks/usePrefersReducedMotion.ts
  - src/hooks/useSessionEngine.ts
  - src/hooks/useWakeLock.ts
  - src/storage/format.ts
  - src/storage/index.ts
  - src/storage/settings.ts
  - src/storage/stats.ts
  - src/storage/storage.ts
  - src/index.css
  - src/styles/theme.css
  - vite.config.ts
  - eslint.config.js
  - index.html
  - tsconfig.json
  - tsconfig.app.json
  - tsconfig.node.json
  - vitest.setup.ts
findings:
  critical: 5
  warning: 12
  info: 9
  total: 26
status: issues_found
---

# Full-Codebase Code Review Report

**Reviewed:** 2026-05-11
**Depth:** deep
**Files Reviewed:** 38 (incl. config + setup)
**Status:** issues_found

## Summary

The codebase is meticulously documented and shows a strong design instinct — comments cite pitfalls and decisions throughout, idempotent teardown patterns are used, async/gesture races are guarded with generation counters, and the dual-clock anchor between the audio thread and the session clock is deliberately separated. The discipline around `useRef`-then-await teardown, gesture-token preservation on iOS Safari, and explicit "single write site" guards is well above average for an app this size.

Adversarial review still surfaces real defects in three load-bearing areas:

1. **Build/type safety is dangerously loose.** `tsconfig.app.json` does not enable `strict` (so `strictNullChecks`, `noImplicitAny`, `noUncheckedIndexedAccess`, `strictFunctionTypes` are all off). Combined with `eslint.config.js` not enabling `@typescript-eslint`'s strict ruleset, the codebase's extensive null handling is effectively conventional, not compiler-enforced. This is the single largest quality risk in the repo.

2. **Persistent-state forward compatibility is silently broken.** `readEnvelope` ignores the on-disk `version` field and rewrites it to `STATE_VERSION` on every save, which will silently downgrade a `v2` envelope to `v1` if an old, cached build is opened after a schema bump — corrupting the new schema and losing forward-only fields.

3. **Imperative-resource lifecycles still have narrow but real races** — wake-lock double-acquire, AudioContext reconstruction racing against `stop()`, and a likely production-asset 404 from the `/hrv/` base path interaction with `index.html`'s absolute favicon href.

## Critical Issues

### CR-01: `index.html` favicon `href="/favicon.svg"` is absolute, but Vite `base` is `/hrv/`

**File:** `index.html:5` (also configured in `vite.config.ts:7`)
**Issue:** `vite.config.ts` sets `base: '/hrv/'` so production assets are served from `/hrv/*`. The favicon link is hardcoded as `/favicon.svg` (absolute, no base). When deployed at `https://<host>/hrv/`, the browser will request `https://<host>/favicon.svg` — a 404. The favicon will not load in production. Visible browser-tab regression; also pollutes server logs and confuses anyone running the deployed app behind a base-path-strict reverse proxy.
**Fix:** Use a base-relative path. With Vite 5+, the simplest fix is to make it relative:
```html
<link rel="icon" type="image/svg+xml" href="./favicon.svg" />
```
Or use Vite's `%BASE_URL%` substitution in index.html:
```html
<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
```

### CR-02: Storage envelope silently downgrades the on-disk schema version

**File:** `src/storage/storage.ts:67-72` and `:84`
**Issue:** `readEnvelope` reads the persisted JSON but ALWAYS returns `{ version: STATE_VERSION, ...subtrees }`, discarding whatever `version` was on disk. `writeEnvelope` also overwrites `version` with `STATE_VERSION` on every write (`{ ...env, version: STATE_VERSION }`). Result: if v1 code (e.g., an offline / cached PWA build) opens an envelope previously written by v2 code, it silently rewrites the envelope to `version: 1` — corrupting the future schema. There is no detection of "this disk version is newer than the running code" so v2 fields the v1 coercers don't recognise are dropped silently. The comments at lines 19–24 ("v2-aware code reads the new key; v1 data is orphaned") describe an intent that the implementation does not enforce.
**Fix:** Make read/write version-aware. At a minimum, refuse to write back a stale `version` over a newer one:
```typescript
export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const p = parsed as Record<string, unknown>
      const onDiskVersion = typeof p.version === 'number' ? p.version : STATE_VERSION
      return {
        version: onDiskVersion as typeof STATE_VERSION, // preserve disk version
        settings: p.settings,
        mute: p.mute,
        stats: p.stats,
      }
    }
    return { ...EMPTY_ENVELOPE }
  } catch {
    return { ...EMPTY_ENVELOPE }
  }
}

export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    // Do NOT downgrade: if the on-disk envelope is from a newer schema, refuse.
    const current = readEnvelope(deps)
    if (typeof current.version === 'number' && current.version > STATE_VERSION) {
      return // newer schema present; this build is too old to write
    }
    const payload = JSON.stringify({ ...env, version: env.version ?? STATE_VERSION })
    storage.setItem(STATE_KEY, payload)
  } catch {
    /* D-16 */
  }
}
```

### CR-03: Race window in `useAudioCues.reconstructEngine` can leak a fresh AudioContext after `stop()`

**File:** `src/hooks/useAudioCues.ts:252-297`
**Issue:** `reconstructEngine` nulls `engineRef.current` synchronously (line 258) and then awaits `createAudioEngine(...)` (line 263). If the user clicks "End session" during that await window, `stop()` runs to completion (sees `engineRef.current === null`, sets `audioStatus('ok')`, `status='idle'`). When the await resolves, `reconstructEngine` then assigns the new engine to `engineRef.current` (line 278), calls `setMuted` (line 282), invokes `onReanchorRequiredRef.current?.(...)` (line 290), and sets state back to "ok"/available. The session is now ended in React state but the engine is alive — phase-boundary cues will be scheduled if anything else still calls `notifyPhaseBoundary`, and the AudioContext leaks (browsers cap concurrent ACs ~6). The same race exists against `useEffect` unmount-cleanup (line 139–148): unmount nulls `engineRef`, then reconstructEngine resumes and writes a new engine into the orphaned ref.
**Fix:** Stamp a generation counter on every reconstruction; bail out if the generation changed during the await (same pattern as `App.tsx`'s `startGenerationRef`):
```typescript
const reconstructGenerationRef = useRef(0)
const reconstructEngine = useCallback(async (): Promise<void> => {
  const gen = ++reconstructGenerationRef.current
  const oldEngine = engineRef.current
  // ...
  engineRef.current = null
  // ...
  let newEngine: AudioEngine | null = null
  try {
    newEngine = await createAudioEngine({ onStateChange: handleStateChange })
  } catch { /* ... */ return }

  // Bail out if stop() / unmount / a newer reconstruct ran during the await.
  if (gen !== reconstructGenerationRef.current || engineRef.current !== null) {
    void newEngine.close()
    return
  }
  // ...
}, [muted, handleStateChange])
```
Also bump the generation in `stop()` and the unmount cleanup so they invalidate any in-flight reconstruct.

### CR-04: `useWakeLock.request()` can leak a sentinel under concurrent calls

**File:** `src/hooks/useWakeLock.ts:34-60`
**Issue:** The idempotency guard at line 39 checks `sentinelRef.current !== null`, but the assignment to `sentinelRef.current` only happens AFTER the `await navigator.wakeLock.request('screen')` resolves (line 41–42). Between two close-in-time callers (e.g., `App.tsx onStartClick` firing `void wakeLockRequest()` while the visibility listener also calls `void request()` on tab-becoming-visible), both calls enter the await branch, both resolve, both assign to the same ref — last write wins, the first sentinel is leaked (it stays held by the OS, its event listener still runs, no `release()` is ever called on it). The visibility re-acquire path at line 85 is exactly the call site where this races against any in-flight request.
**Fix:** Track in-flight requests with a generation token or boolean lock:
```typescript
const requestInFlightRef = useRef<boolean>(false)
const request = useCallback(async (): Promise<void> => {
  if (!('wakeLock' in navigator)) return
  if (sentinelRef.current !== null) return
  if (requestInFlightRef.current) return // in-flight; subsequent caller no-ops
  requestInFlightRef.current = true
  try {
    const sentinel = await navigator.wakeLock.request('screen')
    // Bail out cleanly if release() / unmount ran during the await.
    if (!wasAcquiredRef.current /* cleared by release() */) {
      void sentinel.release().catch(() => {})
      return
    }
    sentinelRef.current = sentinel
    wasAcquiredRef.current = true
    sentinel.addEventListener('release', () => {
      if (sentinelRef.current === sentinel) sentinelRef.current = null
    })
  } catch {
    /* D-09 */
  } finally {
    requestInFlightRef.current = false
  }
}, [])
```

### CR-05: `tsconfig.app.json` does not enable `strict` — `strictNullChecks` is OFF

**File:** `tsconfig.app.json` (and `tsconfig.node.json`)
**Issue:** Neither config sets `"strict": true` nor any of its constituent flags (`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `noUncheckedIndexedAccess`, `noImplicitReturns`). The codebase is shot through with `T | null` return types (`audioNow(): number | null`, `engineRef.current?.now() ?? null`, `frame: SessionFrame | null`, etc.) — all of these are written defensively as if `strictNullChecks` were on, but the compiler is not enforcing the null narrowing. A future maintainer can write `audio.audioNow() + 3` and the build will pass; only at runtime will it produce `NaN`. Combined with `eslint.config.js` not enabling the `@typescript-eslint` strict / strict-type-checked rule set, type safety is purely conventional. Given the app's reliance on null markers as channel signals (`null` for "AC unavailable", `null` for "no session frame", `null` for "no last session"), this is the single largest regression risk in the repo.
**Fix:** Enable strict mode and re-run the build (and tests) to surface latent issues:
```json
// tsconfig.app.json
{
  "compilerOptions": {
    // ...existing flags...
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```
Same change in `tsconfig.node.json`. Also add the strict-type-checked ESLint preset to `eslint.config.js`:
```js
...tseslint.configs.strictTypeChecked,
```

## Warnings

### WR-01: `extendTimedSession` does not validate the new `durationMinutes` value

**File:** `src/domain/sessionController.ts:59-88`
**Issue:** `extendTimedSession` accepts a `durationMinutes: number` and constructs a fresh `lockedSettings` and `plan` from it (line 79). `createBreathingPlan` calls `validateSettings`, which throws `RangeError` if `durationMinutes` is not in `DURATION_OPTIONS`. So the validation happens, but only via a thrown exception inside `createBreathingPlan`. The narrower issue: the early guard at line 67 (`!Number.isFinite(durationMinutes) || durationMinutes <= state.lockedSettings.durationMinutes`) is fine when `lockedSettings.durationMinutes` is a number (the line 63 guard guarantees this), but does NOT itself ensure the value is a supported `DURATION_OPTIONS` choice. A finite-but-unsupported value (e.g., 11) passes line 67, fails inside `createBreathingPlan`. `useSessionEngine.extendDuration` only catches `RangeError` (line 106) so it silently no-ops — but the value-discovery is by exception, which is a code-quality smell and easy to miss when refactoring.
**Fix:** Validate explicitly at the boundary:
```typescript
if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(durationMinutes)) {
  throw new RangeError(`Unsupported duration: ${durationMinutes}`)
}
```
Or, better, change the parameter type to `DurationOption` and let the call-site filter.

### WR-02: `App.tsx` boundary effect can schedule cues at past audio times after a long suspension

**File:** `src/app/App.tsx:433-473`, interacting with `src/audio/cueSynth.ts:128`
**Issue:** The boundary effect computes `audioTime = audioAnchor + boundaryStartMs / 1000` from the source-of-truth plan. If the AudioContext is suspended for an arbitrary period (lock-screen on iOS, tab hidden), `audioCtx.currentTime` freezes, but the session clock (`performance.now()`) keeps ticking — by design. After a resume / reconstruction, the new `audioAnchor` is set by `onAudioReanchorRequired` (App.tsx:83-90) to `newAudioAnchor - elapsedMs/1000`, so for boundaries soon after resume the math lands near `newAudioAnchor`. But if the boundary effect ran for a frame that was PAST when the new anchor was installed, `audioTime` can be slightly negative or in the past on the new AC clock. `cueSynth.scheduleBowlCue` will silently no-op (Web Audio spec: schedules at past time are dropped) — a silent missed cue. The dual-clock invariant assumes anchor + offset always projects to a future `audioTime`, but nothing enforces it.
**Fix:** Clamp `audioTime` to the engine's `now()` + a small lead before scheduling. In `audio.notifyPhaseBoundary` (or earlier in the App boundary effect):
```typescript
const SAFE_LEAD_SEC = 0.005
const liveNow = engine.now()
if (audioTime < liveNow + SAFE_LEAD_SEC) {
  audioTime = liveNow + SAFE_LEAD_SEC
}
```
This trades a microscopic perceptual delay for a guarantee that the cue is actually heard.

### WR-03: `useAudioCues.start()` depends on `muted`, causing `onStartClick` (and SessionControls' `onStart`) identity churn

**File:** `src/hooks/useAudioCues.ts:217`
**Issue:** The `useCallback` for `start` lists `[muted, handleStateChange]`. Every time the user toggles mute, the `start` callback's identity changes. `App.tsx`'s `onStartClick` depends on `audioStart`, so it churns. Anything depending on `onStart` (the primary button's onClick handler) re-renders. This is mostly cosmetic but unnecessary. The reason `muted` is in the deps is line 197: `engine.setMuted(muted)` — closing over the current value. The cleaner fix is to read mute from a ref (mirroring the pattern used for `onReanchorRequiredRef`) so `start` can be `useCallback([])`.
**Fix:**
```typescript
const mutedRef = useRef(initialMuted ?? false)
useEffect(() => { mutedRef.current = muted }, [muted])

const start = useCallback(async (plan: BreathingPlan) => {
  // ...
  engine.setMuted(mutedRef.current)
  // ...
}, [handleStateChange])
```
Same applies to `reconstructEngine` which has the same pattern at line 254.

### WR-04: App-level effect on `[state, audioStop, wakeLockRelease, clearLeadInTimeouts]` runs every animation frame while running

**File:** `src/app/App.tsx:381-417` (and the sibling `useEffect` at `:365-373`)
**Issue:** `state` is a fresh object literal on every `useSessionEngine` setState (which fires per `requestAnimationFrame` while running). Both effects depend on `[state]` (or include it). React invokes the effect callback on every frame; the body short-circuits on `state.status === 'running'`, but the effect still runs and React still does the dependency-comparison work. Net: hundreds of effect executions per second during a session. The intent ("subscribe + reflect") is documented, but the implementation pays the framework overhead on every frame. The `runningSnapshotRef` writer at lines 365–373 likewise updates the ref on every frame.
**Fix:** Depend on `state.status` (a string) for the cleanup-on-leave-running effect; the running-snapshot writer can derive what it needs from `session.currentFrame`'s elapsed value:
```typescript
useEffect(() => {
  if (state.status !== 'running') return
  runningSnapshotRef.current = {
    key: String(state.startedAtMs),
    startedAtMs: state.startedAtMs,
    lastElapsedMs: state.lastFrame.elapsedMs,
  }
}, [state.status, state.startedAtMs, /* read elapsed from currentFrame in ref */])
```
Or expose `session.lastFrameRef` and write the ref imperatively without a React effect.

### WR-05: Boundary effect (`App.tsx:433-473`) also runs every animation frame

**File:** `src/app/App.tsx:433-473`
**Issue:** Same pattern as WR-04 — depends on `[appPhase, session.currentFrame, audioNotifyPhaseBoundary]`. `session.currentFrame` is a fresh object every rAF tick because `useMemo([state])` in `useSessionEngine.ts:59-62` produces a new object whenever `state` changes (which is every frame). The effect runs every frame; the `lastBoundaryKeyRef.current === key` short-circuit absorbs all but the boundary frame. Effective but wasteful. The deeper fix is for `useSessionEngine` to expose `currentFrame` keyed by `cycleIndex:phase` only — i.e., return the same memoised frame for every render within the same phase tick.
**Fix:** Change `useSessionEngine`'s memo to return a frame object only when `cycleIndex` or `phase` changes:
```typescript
const lastFrameRef = useRef<SessionFrame | null>(null)
const currentFrame = useMemo(() => {
  if (state.status !== 'running') return null
  const next = state.lastFrame
  const prev = lastFrameRef.current
  if (prev !== null && prev.cycleIndex === next.cycleIndex && prev.phase === next.phase) {
    return prev // stable identity within phase
  }
  lastFrameRef.current = next
  return next
}, [state])
```
Note: `BreathingShape` consumes `phaseProgress` from `currentFrame`, so it must continue to update per-frame — that consumer needs the live frame. A separate hook output (`liveFrame` for per-frame visuals, `boundaryFrame` for cue scheduling) would split these cleanly.

### WR-06: `useSessionEngine`'s rAF loop reuses the same callback identity on every tick but re-subscribes per `state.status` change

**File:** `src/hooks/useSessionEngine.ts:29-57`
**Issue:** The effect's dep array is `[state.status]`. On entering `running`, the effect installs an rAF loop. The loop calls `setState` which produces new states with the same `status: 'running'`, so the effect does NOT tear down between frames — good. But if `completeIfNeeded` transitions to `'complete'`, the `state.status` dep change fires the cleanup (cancelAnimationFrame). The `cancelled` flag and the synchronous null are correct. The subtle risk: if a `setState` is queued and resolves AFTER `cancelled = true`, but `requestAnimationFrame(tick)` was already enqueued (line 47) inside an earlier `tick`, that next `tick` reads `currentState.status !== 'running'` and returns `currentState` (no-op) — fine. But the `if (!cancelled)` check at line 46 races against `cancelled = true` written by the cleanup; the read is after `setState` returns synchronously. Cleanup runs synchronously when React unsubscribes the effect. The hazard is small but present: an extra rAF can be scheduled between the React render that toggled status and the cleanup execution. Result: one extra `tick()` execution after teardown, which the inner status guard catches. Defensively fine, but the comment claims "cancel" is bulletproof, and it isn't quite.
**Fix:** Move the `!cancelled` check to the start of `tick()` so even an extra rAF firing after cleanup short-circuits immediately:
```typescript
const tick = () => {
  if (cancelled) return
  setState(/* ... */)
  if (!cancelled) animationFrameId = requestAnimationFrame(tick)
}
```

### WR-07: `recordSession` cross-tab race — two tabs ending sessions concurrently can lose a session count

**File:** `src/storage/stats.ts:71-98`
**Issue:** `recordSession` reads the envelope (line 82), computes `next.totalSessions = stats.totalSessions + 1`, and writes back. If two tabs each end a session within the same event-loop tick, both read totalSessions=N, both write N+1 → one increment is lost. The comment at line 76–81 acknowledges this ("cross-tab sync is still a v2 concern") but the issue is mentioned as if it's resolved by single-envelope-read; that only closes an intra-tab race. localStorage has no native transactions; the typical mitigations are (a) listen to the `storage` event and refresh on conflict, (b) write a monotonic operation log, or (c) accept the loss as documented.
**Fix:** Accept-or-fix decision. If acceptable, escalate the comment from "in-tab correctness" to an explicit "cross-tab concurrent end loses one increment — documented v2 work". If fixing in v1, add a storage event listener on `App.tsx`:
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STATE_KEY) setStats(loadStats())
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}, [])
```
This doesn't fix the increment race, but it at least keeps both tabs' UI consistent so the user sees the issue.

### WR-08: `SessionReadout` discards `frame.remainingMs === null` semantic when status is `'idle'` and a lead-in placeholder frame is present

**File:** `src/components/SessionReadout.tsx:16-17`, called from `src/app/App.tsx:505-514`
**Issue:** During the lead-in, `App.tsx` synthesises `leadInPlaceholderFrame = getSessionFrame(plan, 0)` (App.tsx:104-107) and forces `status='idle'` (App.tsx:512). For an open-ended setting, `plan.totalMs === null` so `frame.remainingMs === null`, and `SessionReadout` picks `timeLabel = 'Elapsed'`. Reasonable. For a timed setting (e.g., 10 min), `frame.remainingMs === 600000`, so `timeLabel = 'Remaining'` and `timeValue = formatDuration(600000) = '10:00'`. That's correct. But there is no test contract on the `(status === 'idle' && frame !== null)` path — the early return at line 12 was the guard against accidentally rendering during the true idle screen. The condition only suppresses the readout if `message === undefined` too. The combination is fragile: if a future caller sets `frame` but forgets `status==='lead-in'` semantics, the readout will render an "Elapsed 0:00" or "Remaining N:00" chip on the idle screen.
**Fix:** Add an explicit `isLeadInPlaceholder` prop or a `'lead-in'` value to the `status` union so the component's contract is self-evident. Or assert: when `status === 'idle' && frame !== null`, log/throw in development. Minimum: document the lead-in placeholder contract in `SessionReadoutProps` JSDoc.

### WR-09: `endDialogOpen` closes automatically when status transitions, but the auto-close depends on the dialog already being open

**File:** `src/app/App.tsx:203-208`
**Issue:** The effect closes the modal "when the session leaves the running state on its own". The condition is `state.status !== 'running' && endDialogOpen`. This works when status transitions running → complete with the modal open. But when status is `'idle'` from the START (initial render), the effect ALSO fires and reads `endDialogOpen === false` — short-circuit OK. Subtle case: if the user opens the End modal, then the session completes (status=complete), the modal auto-closes. Now the user clicks Reset (modal opens). At this point status is still `complete`. If the user then clicks Reset's confirm, the modal closes and stats reset, but the End modal effect re-evaluates and the condition is `complete !== running && false`, no fire. Fine. The risk: there is no symmetric auto-close for `ResetStatsDialog` or `LearnDialog`. If a session were ever to auto-end while either is open, the dialog would stay open over the post-session UI. For LearnDialog, this is gated by `inSessionView` (anchor disabled), but the modal can remain open if it was opened pre-session and a session somehow started. Theoretical only — but the inconsistency hints at a missing invariant.
**Fix:** Document the contract or extend the auto-close: ResetStatsDialog and LearnDialog should never be open while a session is running. Add a defensive auto-close in `App.tsx`:
```typescript
useEffect(() => {
  if (inSessionView) {
    setLearnDialogOpen(false)
    setResetDialogOpen(false)
  }
}, [inSessionView])
```

### WR-10: `audioEngine.scheduleLeadIn` returns the projected `firstInCueTime` even when no cues were scheduled (muted or closed)

**File:** `src/audio/audioEngine.ts:147-165`
**Issue:** When `muted === true` or `closed === true`, the function returns `startAudioTime + LEAD_IN_DURATION_SEC` WITHOUT scheduling the ticks or the first In cue. The caller (`useAudioCues.start`, App.tsx) stores this value as the audio anchor and computes future boundaries from it. That is correct for the dual-clock alignment when muted (subsequent boundaries continue to schedule against the audio clock; unmute-on-boundary will start playing). But if the engine is `closed` at the time of `scheduleLeadIn`, returning a "future" audio time on a closed AC is meaningless — subsequent calls into `scheduleNextCue` no-op (line 168), but the anchor in App.tsx is now a stale projection. There's no failure path to the caller. The hook's `start()` would only see this if `engineRef.current` somehow points at a closed engine, which shouldn't happen given the synchronous-null-then-async-close pattern. But it's a defense-in-depth opportunity.
**Fix:** Have `scheduleLeadIn` return `null` when closed, and update the caller signature:
```typescript
scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null {
  if (closed) return null
  // ...
}
```
`useAudioCues.start` already returns `number | null`, so propagating is trivial.

### WR-11: `cueSynth.scheduleBowlCue` creates oscillators that may not be disconnected after `stop()` if a mute fade-out is applied late

**File:** `src/audio/cueSynth.ts:117-130` (oscillator creation), with `src/audio/audioEngine.ts:82-97` (fade-out)
**Issue:** When `setMuted(true)` runs mid-cue, the engine applies `applyMuteFadeOut` to the envelope's gain param. The oscillators have already been `osc.stop(stopAt)`-scheduled (line 129). The fade-out makes the cue inaudible but doesn't disconnect the partial gain → filter → envelope → destination chain. The chain is GC-able only after the oscillators have actually stopped and dropped references — which happens at `stopAt` (5 × τ later). For the bowl cue at `OUT_DECAY_TIME_CONSTANT = 1.8`, that's 9 s of node retention after a user click. Multiplied across a long session with frequent mute toggles, the audio graph can grow. Web Audio nodes are reclaimed by the implementation when all sources stop AND the node has no references, but the engine retains `cleanupAt` and the `CueHandle` keeps `envelope`. Not a leak in the GC sense, but a node retention pattern. The `pruneExpiredCues` cleans the JS-side Set; the Web Audio side disconnects only when the OS GCs.
**Fix:** Explicitly disconnect when scheduling the stop, using `osc.onended` to disconnect the chain:
```typescript
osc.onended = () => {
  try { partialGain.disconnect() } catch {}
  try { filter.disconnect() } catch {}
  // envelope is shared across partials — disconnect once at the last onended
}
```
Or track per-cue node references and disconnect them inside `pruneExpiredCues`.

### WR-12: `useAudioCues.handleStateChange` fires `setAudioStatus` synchronously from the engine, including during `start()`'s `engine.setMuted` chain

**File:** `src/hooks/useAudioCues.ts:116-134` + `audioEngine.ts:124-127`
**Issue:** `createAudioEngine` attaches the `statechange` listener BEFORE the WR-06 resume (line 127), then potentially calls `audioCtx.resume()` (line 114) which fires a `suspended → running` state transition synchronously. That transition invokes `opts.onStateChange?.(state)` which calls back into the React-side `handleStateChange`, which calls `setAudioStatus('ok')`. This happens INSIDE `createAudioEngine`'s `await` chain — before `engineRef.current = engine` (line 193) is assigned. React schedules the state update; by the time it commits, the engine assignment has happened. No correctness bug, but the ordering is fragile: any future addition to `handleStateChange` that reads `engineRef.current` would dereference null on the WR-06 resume path. The Pitfall 5 gate at line 124 protects this case for "needs-resume" specifically, but any other branch added to `handleStateChange` will break.
**Fix:** Make `handleStateChange` defensive against null `engineRef.current` for any reads it performs; document that the callback can fire before `engineRef` is populated. Or restructure: defer the addEventListener until after the WR-06 resume completes.

## Info

### IN-01: `useEffect` without deps array at `App.tsx:80-82` updates a ref on every render

**File:** `src/app/App.tsx:80-82`
**Issue:** `useEffect(() => { sessionFrameRef.current = session.currentFrame })` has no dep array — it runs after every render. Functionally identical to `useEffect(() => { ... }, [session.currentFrame])` here, since `session.currentFrame` is the only thing read. Reads slightly oddly and bypasses ESLint exhaustive-deps. Per the React 19 docs, omitting the dep array is allowed but discouraged.
**Fix:** Add `[session.currentFrame]` explicitly.

### IN-02: `audio.audioNow` is declared in the hook's return interface but never read by `App.tsx`

**File:** `src/hooks/useAudioCues.ts:331-333`, `:343` (return), `App.tsx` (no usage)
**Issue:** The hook returns `audioNow` (line 343) and the consumer never reads it. App.tsx uses `firstInAudioTime` from `audioStart` and `engine.now()` indirectly via `onAudioReanchorRequired`'s callback argument. Dead public API surface; either remove from the interface or document its intended consumer.
**Fix:** Remove from the return tuple and the `UseAudioCues` interface, or keep with a JSDoc note about intended future callers (e.g., "Used by App.tsx for the dual-anchor (Pitfall 2)" — current comment claims this but App.tsx doesn't actually call it).

[2026-05-12 update] Overtaken by Phase 9 AUDIO-02 — `audio.audioNow()` is the documented seam for the caller-side past-time clamp at App.tsx:549. HYGIENE-01 closed-no-op in 12-CONTEXT.md.

### IN-03: `AudioStatus` `'starting'` is an unobservable transient state

**File:** `src/audio/audioEngine.ts:25` and `src/hooks/useAudioCues.ts:190, 204`
**Issue:** `setStatus('starting')` is set inside `start()` before the `await createAudioEngine(...)` (line 190), then immediately overwritten with `'lead-in'` (line 204) or `'failed'` (line 212) at the next microtask. No UI subscribes to `status` (App.tsx uses `audioStatus` and `audioAvailable`). The `'starting'` value never reaches a render. Dead enum member.
**Fix:** Either remove `'starting'` from the type or expose `status` to the UI so a brief "preparing audio…" indication can render during slow AC creation (which can take ~tens of ms on mobile).

### IN-04: `validateSettings` (`src/domain/settings.ts:50-64`) and `coerceSettings` (`src/storage/settings.ts:35-44`) carry duplicated allow-list logic

**File:** `src/domain/settings.ts:50-64` vs. `src/storage/settings.ts:20-44`
**Issue:** Both files inspect the same `BPM_OPTIONS / RATIO_OPTIONS / DURATION_OPTIONS` allow-lists with subtly different policies (throw vs. fallback). The duplication is intentional (Pitfall 3 — non-throwing vs. throwing cousins) but the per-field predicates (`isValidBpm`, `isValidRatio`, `isValidDuration`) could be derived from a shared utility. Minor DRY opportunity.
**Fix:** Extract a shared `isValid<X>` predicate set into `src/domain/settings.ts` and import from both validators.

### IN-05: `formatLastSessionDate` accepts `now: () => number = Date.now` but `formatLastSession` always passes the default

**File:** `src/storage/format.ts:42-58`
**Issue:** Tests-only seam. Not a bug, but the injection point is unused in production. Fine.
**Fix:** None needed; consider documenting the test-only purpose.

### IN-06: `MuteToggle` `aria-pressed` is `undefined` when `needsResume`, but the button is still rendered as a toggle in screen readers

**File:** `src/components/MuteToggle.tsx:37, 44`
**Issue:** When `needsResume === true`, `aria-pressed` is undefined (removing it) and the button label becomes "Resume audio". For most screen readers this is the right call — the button is no longer a toggle, it's an action. But the visual `<svg>` and the button container are unchanged structurally. Some screen readers may still announce a stale "toggle" semantic from a prior cycle. Low risk.
**Fix:** Consider setting `role="button"` (its native role) and adding `aria-describedby="resume-hint"` linking to the `aria-live` region in App.tsx for richer context.

### IN-07: `learnContent.ts` uses an `amzn.to` redirect — opaque destination

**File:** `src/content/learnContent.ts:60`
**Issue:** The "Mastering Meditation" book link uses `https://amzn.to/3RTAVqi`, an Amazon affiliate short-URL. Not a security issue (the page renders it in a `target="_blank" rel="noopener noreferrer"` anchor — good), but opaque to users who hover. The `LearnDialog`'s footer says "Independent project. Not affiliated with Forrest Knutson" — if this `amzn.to` is an affiliate code, the disclaimer is technically inaccurate (an affiliate code is a financial relationship with Amazon, not with Forrest).
**Fix:** Use the canonical `https://www.amazon.com/dp/...` URL OR document the affiliate relationship in the modal.

### IN-08: `eslint.config.js` does not enable a `@typescript-eslint` strict ruleset

**File:** `eslint.config.js`
**Issue:** Only `tseslint.configs.recommended` is loaded. Missing: `strictTypeChecked` (or at minimum `stylisticTypeChecked`) — these enforce no-unsafe-assignment, no-unsafe-member-access, no-floating-promises, etc. `void engine.close()` and `void wakeLockRequest()` patterns rely on the developer remembering to explicitly `void` floating promises; an ESLint rule would catch the next regression.
**Fix:**
```js
...tseslint.configs.strictTypeChecked,
```
Note: requires `parserOptions.project` so the type info is available. Worthwhile.

### IN-09: `eslint.config.js` does not include `eslint-plugin-react-hooks/recommended` rules verbatim, only the rule set itself

**File:** `eslint.config.js:22`
**Issue:** `...reactHooks.configs.recommended.rules` is spread in, but the configuration object structure may not include `react-hooks/exhaustive-deps` at error level depending on plugin version. Verify the rule is active and at `error` level (not `warn`). Several places in `App.tsx` use `// eslint-disable-next-line react-hooks/set-state-in-effect` — indicating the linter IS running, but worth confirming `exhaustive-deps` fires for the missing-deps cases (e.g., `confirmReset` at App.tsx:332-342 omits `resetStats` which is a module import — likely fine).
**Fix:** Audit current ESLint output (`pnpm lint` or equivalent) and confirm `exhaustive-deps` is enforced.

---

_Reviewed: 2026-05-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
