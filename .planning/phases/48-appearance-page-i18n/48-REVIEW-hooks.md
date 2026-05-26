---
phase: 48-appearance-page-i18n
reviewed: 2026-05-26T00:00:00Z
depth: deep
files_reviewed: 26
files_reviewed_list:
  - src/hooks/leadInCountdown.ts
  - src/hooks/useAmbientScale.ts
  - src/hooks/useAudioCues.ts
  - src/hooks/useBeforeInstallPrompt.ts
  - src/hooks/useBreathingSessionController.ts
  - src/hooks/useBreathingShapeChoice.ts
  - src/hooks/useCueChoice.ts
  - src/hooks/useFavicon.ts
  - src/hooks/useFeatureFlags.ts
  - src/hooks/useIsStandaloneOrPhone.ts
  - src/hooks/useLocale.ts
  - src/hooks/useLocaleChoice.ts
  - src/hooks/useNKEngine.ts
  - src/hooks/useNaviKriyaAudio.ts
  - src/hooks/useNaviKriyaSessionController.ts
  - src/hooks/useOrbIdleChoice.ts
  - src/hooks/usePrefersReducedMotion.ts
  - src/hooks/useRingCueChoice.ts
  - src/hooks/useSessionEngine.ts
  - src/hooks/useSwitcherIconChoice.ts
  - src/hooks/useTheme.ts
  - src/hooks/useThemeChoice.ts
  - src/hooks/useTimbreChoice.ts
  - src/hooks/useUiStringsContext.tsx
  - src/hooks/useVisualCue.ts
  - src/hooks/useWakeLock.ts
findings:
  critical: 0
  warning: 6
  info: 7
  total: 13
status: issues_found
---

# Phase 48: Hooks Code Review

**Reviewed:** 2026-05-26
**Depth:** deep
**Files Reviewed:** 26
**Status:** issues_found

## Summary

Reviewed all 26 hook files in scope at deep depth, with emphasis on stale closures, missing/excess effect deps, cleanup correctness, async-effect races, ref-vs-state misuse, listener and timer leaks, wake-lock + media-session lifecycle, storage subscription cleanup, and locale-driven re-renders.

The hooks codebase shows strong defensive posture overall: synchronous-null-before-await is consistently applied to imperative resources (`AudioContext`, `WakeLockSentinel`), generation counters guard async cancellation, refs mirror state where stale-closure risk is real, and same-tab/cross-tab storage sync uses a uniform `hrv:prefs-changed` + `storage` listener pair with disciplined teardown. No critical defects (data loss, security holes, crashes) were found.

The findings below are mostly subtle correctness or maintainability issues — most notably (1) a race in `useNaviKriyaSessionController.start` where a generation-style guard is missing between the lead-in completion and `nkStart`, (2) a missing dep on `runningNeedsConfirmation` in `useBreathingSessionController.requestEnd` (worked around by including `audioStop`/`sessionEnd`, but the lint suppression is implicit), and (3) several minor leaks and inconsistencies between the four Phase 47 picker hooks and the older `useThemeChoice`/`useTimbreChoice` template they were paste-and-renamed from.

## Warnings

### WR-01: `useNaviKriyaSessionController.start` has no cancel guard between `setStarting`/`scheduleLeadInTimeouts` and `nkStart`

**File:** `src/hooks/useNaviKriyaSessionController.ts:107-131`

**Issue:** The breathing-session counterpart (`useBreathingSessionController.startOrCancel`, lines 162-212) protects the lead-in window with `startGenerationRef` — incrementing the generation on cancel and bailing out post-`await` if the generation has moved. `useNaviKriyaSessionController.start` schedules timeouts that read `settings`, `audioSession.callbacks`, and `onComplete` via closure, then calls `nkStart(settings, ...)` in the `onComplete` callback inside `scheduleLeadInTimeouts`. There is no analogous cancellation token.

Concrete race: a user clicks "Start" → lead-in counts down → before the 3-second timer fires, the component unmounts (e.g., `activePractice` is switched away). `cancelStart` will only be invoked if the consumer wires it up; if the component just unmounts, only the unmount cleanup at lines 158-162 runs — which calls `clearLeadInTimeouts()`. That correctly cancels the pending timers, so the `nkStart` call inside `onComplete` will not fire. Good.

But there is a second race: lead-in is in flight, the user calls `setSettings` (e.g., switches `omLength` or `rounds`) before the lead-in completes. The closure in `start` captured `settings` at the click time. The `onComplete` callback fires `nkStart(settings, ...)` with the *stale* settings, even though `setSettingsState(next)` has updated React state and persisted the new settings via `saveNaviKriyaSettings`. The user will then run a session with the pre-change settings while the UI displays (and the picker reflects) the new ones.

Compare to `useBreathingSessionController.startOrCancel` which captures `state.selectedSettings` similarly but the breathing session settings cannot be changed while `inSessionView` is truthy (the picker is gated via `controlsDisabled`). NaviKriya's `setSettings` has no equivalent gate — `sessionActive` is true during `starting`, but `setSettings` itself does not check it.

**Fix:** Either (a) gate `setSettings` to bail when `sessionActive`:
```ts
const setSettings = useCallback((next: NaviKriyaSettings): void => {
  if (sessionActive) return // or queue / no-op
  if (next.perOmCue !== settings.perOmCue) nkToggleCue(next.perOmCue)
  setSettingsState(next)
  saveNaviKriyaSettings(next)
}, [sessionActive, settings.perOmCue, nkToggleCue])
```
or (b) read settings from a ref captured inside the lead-in `onComplete` so the final `nkStart` sees the latest settings if the user does manage to change them.

---

### WR-02: `useBreathingSessionController.requestEnd` reads `runningNeedsConfirmation` but only declares dependencies that compose it indirectly

**File:** `src/hooks/useBreathingSessionController.ts:218-225`

**Issue:** `requestEnd` depends on `runningNeedsConfirmation`, which is a value computed each render from `state.status`, `state.lockedSettings.durationMinutes`, and `state.stretchSegments`. The dep array declares `[runningNeedsConfirmation, sessionEnd, audioStop]`. Including a derived non-memoized boolean in the dep array works because referential equality on `boolean` is value equality, but it carries hidden coupling: any future refactor that turns `runningNeedsConfirmation` into a non-primitive (e.g., an object describing the dialog reason) will silently break callback identity and start churning re-renders downstream — `requestEnd` is wired into adapters consumed by view models and components.

This is a maintainability/robustness warning rather than an active bug.

**Fix:** Wrap the derived value in `useMemo`:
```ts
const runningNeedsConfirmation = useMemo(
  () =>
    state.status === 'running' &&
    (state.lockedSettings.durationMinutes !== 'open-ended' || state.stretchSegments !== null),
  [state],
)
```
or inline the check inside `requestEnd` and depend on the primitive fields directly.

---

### WR-03: `useBreathingSessionController` boundary-effect has incomplete deps and silently skips notifications when `audioAnchor === null`

**File:** `src/hooks/useBreathingSessionController.ts:285-318`

**Issue:** Two concerns:

1. The dep array `[phase, session.currentFrame, audioNotifyPhaseBoundary, audioAudioNow]` excludes `lastBoundaryKeyRef` (a ref, correctly), but also excludes `audioAnchorRef` and `planRef` — also refs. The pattern is correct (refs in deps are anti-patterns). But the effect reads `audioAnchorRef.current` and `planRef.current` and computes against them — meaning a re-anchor (driven by `onAudioReanchorRequired`) does NOT itself fire this effect. It will only fire on the NEXT `session.currentFrame` identity change (= next phase boundary). Re-anchoring during a long phase will therefore not retro-correct the current phase's already-scheduled boundary cue. This may be intentional (the engine has already scheduled the cue), but the comment on the re-anchor callback at lines 90-93 talks about subtracting elapsed time, leaving the timing math implicit and undocumented.

2. Lines 302-305: when `audioAnchor === null && plan !== null`, the code clears `lastBoundaryKeyRef.current = null` and returns. This is a deliberate "wait until the anchor lands" wait-loop. But the next time the effect fires (next frame, when the frame identity is the same `===`), `lastBoundaryKeyRef.current === key` is false (just cleared), so the boundary fires. Good. However, the immediately-following `if (audioAnchor === null || plan === null) return` at line 306 means: if both anchor AND plan are null, the boundary key is NOT cleared — meaning a later anchor-set (with the same frame) will be missed because the cached key still matches. Concrete trigger: a session that ends and restarts in a way that leaves the cached `lastBoundaryKeyRef` pointing at the prior frame's key. This appears to be guarded by the `lastBoundaryKeyRef.current = null` write on line 287 when `phase !== 'running'`, so in practice it is safe — but the asymmetric clearing-only-when-plan-not-null branch is fragile.

**Fix:** Either (a) clear the boundary key whenever the effect early-returns without scheduling, or (b) add an inline comment explaining why the plan-null branch intentionally preserves the key.

---

### WR-04: `useFavicon` Effect A double-applies on `theme === 'system'` mount

**File:** `src/hooks/useFavicon.ts:86-110`

**Issue:** When `theme === 'system'`, Effect A calls `applyFavicon('system')` which resolves the matchMedia query and writes the favicon (lines 86-88). Effect B then runs (it has the same dep `[theme]`), gates on `theme === 'system'`, and immediately calls `applyFavicon('system')` AGAIN (line 101) before attaching the change listener. Two `replaceFaviconLink` calls on every mount-in-system-mode and on every switch *to* system mode.

`replaceFaviconLink` does a `document.querySelector` + `oldLink.remove()` + `createElement` + `appendChild`. Doing this twice on mount is a layout-affecting DOM thrash on a hot path (mount + every theme change to 'system'). Not a correctness bug, but produces visible favicon flicker on some browsers (the tab icon momentarily clears when the `<link>` is removed before the new one is appended).

**Fix:** In Effect A, skip the apply when `theme === 'system'` (let Effect B own it):
```ts
useEffect(() => {
  if (theme === 'system') return // Effect B handles the system branch
  applyFavicon(theme)
}, [theme])
```
This mirrors the `useTheme` pattern at lines 31-34 exactly (useTheme already does this for `data-theme`).

---

### WR-05: `useAmbientScale` rAF tick `setState` is unconditional, causing wasted renders when scale rounds to the same value

**File:** `src/hooks/useAmbientScale.ts:32-57`

**Issue:** Every requestAnimationFrame tick calls `setScale(next)` unconditionally. React's `useState` already bails on `Object.is`-equal state, but the computed `next` (a floating-point ease) will almost never be referentially-equal to the previous value frame-over-frame, so every frame triggers a re-render of every consumer of this hook. At ~60 Hz that is fine for the breathing shape, but the same hook is composed into orb / shape components rendered alongside other live-frame consumers. Combined with `useSessionEngine.tick` already driving a per-frame setState, this hook adds a second per-frame render trigger on the same component tree.

This is the same per-frame render cadence the comment at line 22-23 documents ("matches sessionEngine's live-frame rerender cadence"), so it is intentional. But there is no rounding or threshold — even when the breath sits near `MAX_SCALE` and the rate of change is below sub-pixel relevance, full renders fire.

Out-of-scope per the review rules (performance), but flagging because there is a correctness wrinkle: on initial mount of `animated = true`, `start = performance.now()` runs synchronously in the effect setup, but `tick` runs on the next rAF — by that time `now - start` could be ~16 ms, so `t ≈ 0.0036`. That's fine. But if the component unmounts mid-effect-init, `start` is set but `raf = 0` is never assigned, the cleanup runs `cancelAnimationFrame(0)` (no-op), and a rAF callback that was already queued by `requestAnimationFrame(tick)` on the next line is NOT cancelled. Race window is one synchronous statement wide (line 53), so practically impossible — but the assignment-order pattern is fragile vs. the order used in `useSessionEngine.ts:157-162` which similarly assigns `animationFrameId = requestAnimationFrame(tick)` last but is shielded by the top-of-tick `cancelled` guard.

**Fix:** Mirror `useSessionEngine`'s `cancelled` flag pattern — set a `let cancelled = false` in the effect and check it at the top of `tick`. Cleanup sets `cancelled = true` and `cancelAnimationFrame(raf)`.

---

### WR-06: `useBeforeInstallPrompt.triggerInstall` does not handle `prompt()` rejection

**File:** `src/hooks/useBeforeInstallPrompt.ts:66-76`

**Issue:** `await deferredPrompt.prompt()` is not wrapped in a `try/catch`. The W3C spec for `BeforeInstallPromptEvent.prompt()` says it can reject with `InvalidStateError` if the prompt was already shown, or with an `AbortError` if the user agent dismisses it via a non-`outcome` path. A rejection here will:
1. Throw out of the `await`, never reaching `setDeferredPrompt(null)`.
2. Leave the stale `deferredPrompt` reference live, so the next click hits `await deferredPrompt.prompt()` again — which (per spec, one-shot) will reject again with `InvalidStateError`.
3. The promise returned to the caller (`triggerInstall`) rejects. The caller in `useAppViewModel.ts:51` uses `triggerInstall` via `install` → `createInstallViewModel({ onInstall: triggerInstall })`. Whether the consumer awaits or `void`s it determines whether this surfaces as an unhandled rejection.

Compounding: lines 60-63 of the install view model in `appViewModel.ts` is not in scope here, but the contract is that `triggerInstall` "must not throw" given the JSDoc says it is called from a click handler — yet there is no enforcement.

**Fix:**
```ts
const triggerInstall = useCallback(async (): Promise<void> => {
  if (deferredPrompt === null) return
  try {
    const { outcome } = await deferredPrompt.prompt()
    setDeferredPrompt(null) // null AFTER awaiting per spec one-shot semantics
    if (outcome === 'accepted') saveInstallDismissed()
  } catch {
    // Spec-allowed rejection (InvalidStateError, AbortError) — clear the stale ref
    setDeferredPrompt(null)
  }
}, [deferredPrompt])
```

---

## Info

### IN-01: Six picker hooks are near-identical copies — extract a shared factory

**File:** `src/hooks/useThemeChoice.ts`, `src/hooks/useTimbreChoice.ts`, `src/hooks/useLocaleChoice.ts`, `src/hooks/useCueChoice.ts`, `src/hooks/useBreathingShapeChoice.ts`, `src/hooks/useRingCueChoice.ts`, `src/hooks/useOrbIdleChoice.ts`, `src/hooks/useSwitcherIconChoice.ts`

**Issue:** Eight picker-side hooks (`useThemeChoice`, `useTimbreChoice`, `useLocaleChoice`, `useCueChoice`, `useBreathingShapeChoice`, `useRingCueChoice`, `useOrbIdleChoice`, `useSwitcherIconChoice`) share an identical structure: `useState` seeded from `loadPrefs().<field>`, a `setX` callback that does `loadPrefs() → savePrefs({ ...current, [field]: next }) → setXState(next) → dispatchEvent('hrv:prefs-changed', { detail: { key, value }})`. The Phase 47 hooks (`useCueChoice` etc.) even contain the same comment block referencing the same pitfall numbers. A bug fix to one (e.g., the future addition of `await navigator.storage.persist()` or queue-coalescing) will not propagate automatically to the others. `useCueChoice` already diverged — it reads from `useVisualCue()` instead of holding its own state mirror (the AC-WR-03 single-source-of-truth pattern documented at lines 18-26).

**Fix:** Extract a `createPrefChoiceHook<K extends keyof UserPrefs>(key: K)` factory and have each of the eight hooks call it. The `useCueChoice` divergence is the actually-correct pattern (no separate state mirror), so the factory should either default to that pattern or expose both.

---

### IN-02: `useAudioCues` unmount cleanup uses `++reconstructGenerationRef.current` instead of `reconstructGenerationRef.current += 1`

**File:** `src/hooks/useAudioCues.ts:179, 271`, `src/hooks/useWakeLock.ts:90, 123`

**Issue:** The pre-increment operator `++ref.current` works but is style-flagged by many lint configs (`no-plusplus`) and is less common than `ref.current += 1` in this codebase. Both useAudioCues lines (179, 271, 306) and useWakeLock (90, 123) use pre-increment. The pattern is correct (counters are write-only side effects), but consistency with the rest of the codebase suggests `ref.current += 1`.

**Fix:** Either suppress the lint rule project-wide if it's already off (it appears to be — no eslint-disable), or normalize to `+= 1` for consistency.

---

### IN-03: `useNaviKriyaAudio.begin` reads `getTimbre()` once on session start, never re-reads

**File:** `src/hooks/useNaviKriyaAudio.ts:59-94`

**Issue:** This is intentional and parallel to `useAudioCues`' `timbreRef` posture (D-08 — freeze timbre at session start so cross-tab changes don't mid-session-mutate). However, unlike `useAudioCues`, `useNaviKriyaAudio.begin` returns four closures (`frontMarker`, `backMarker`, `tick`, `endCue`) that all close over the same `timbre`. If a future call site decides it wants live timbre changes, the indirection point is invisible. Document the deliberate freeze with a comment matching `useAudioCues.ts:112-117` posture.

Additionally, line 94's `useCallback(begin, [])` has empty deps but reads `mutedRef.current` indirectly via the returned closures — fine because `mutedRef` is a ref. No bug.

**Fix:** Add a comment near line 70 explaining "timbre is frozen at session begin to mirror useAudioCues D-08; do not refactor to live-read".

---

### IN-04: `useSessionEngine.extendDuration` catches `RangeError` from `extendTimedSession` but the cross-module contract is undocumented

**File:** `src/hooks/useSessionEngine.ts:244-263`

**Issue:** The catch at line 256 silently swallows `RangeError` from `extendTimedSession` (returning the unchanged state). This is correct defensive coding, but the consumer cannot distinguish "extension declined" from "extension succeeded" — both return as a state with no change in the running state. Any user-facing UI hook that calls `extendDuration` (none in scope) cannot show an error toast or disable the button.

**Fix:** Either return a boolean from `extendDuration` (`true` if applied, `false` if rejected), or document the silent-failure semantics in the JSDoc on the `extendDuration` interface member at line 65.

---

### IN-05: `useAudioCues.start` swallows errors silently without logging path for diagnostics

**File:** `src/hooks/useAudioCues.ts:257-264`

**Issue:** The `catch {}` at line 257 is documented as D-10 (visuals-only fallback), and the comment says "intentionally swallowed (T-03-06: no raw stack to user-facing surfaces)". Correct policy for user-facing surfaces, but there is no developer-facing breadcrumb either — a `console.warn` behind a build flag, a `window.__hrv_diag__` push, or an `onError` callback would let the team triage iOS-Safari construction failures from real-device logs. Currently, a failed `createAudioEngine` leaves zero footprint.

**Fix:** Add a build-flagged debug hook (`if (import.meta.env.DEV) console.warn(...)`).

---

### IN-06: `useIsStandaloneOrPhone` initial state uses `(navigator as SafariNavigator).standalone === true` consistently, but the initializer at line 56 and the change-listener at lines 89-90 duplicate the logic

**File:** `src/hooks/useIsStandaloneOrPhone.ts:54-91`

**Issue:** Three call sites compute `mql.matches || (navigator as SafariNavigator).standalone === true`: lines 54-57 (initial useState), lines 82-84 (re-seed on mount), lines 89-91 (onChange listener). DRY violation only — refactoring to a helper `resolveStandalone(mql)` clarifies intent and reduces three places where a bug fix would need to land.

**Fix:** Extract a local helper inside the hook body.

---

### IN-07: `leadInCountdown.scheduleLeadInTimeouts` does not validate that the constants make timing sense

**File:** `src/hooks/leadInCountdown.ts:18-23`

**Issue:** The function trusts that `LEAD_IN_TICK_INTERVAL_MS < 2 * LEAD_IN_TICK_INTERVAL_MS < LEAD_IN_DURATION_MS`. If `audioEngine.ts` is ever refactored to make `LEAD_IN_DURATION_MS = 2 * LEAD_IN_TICK_INTERVAL_MS` (a plausible 2-digit countdown), the `complete` timeout would fire at the same instant as `showOne`, and the consumer would briefly see "1" then no countdown. Not a current bug — `LEAD_IN_DURATION_MS = 3 * LEAD_IN_TICK_INTERVAL_MS` is the contract.

**Fix:** Either add a `// invariant: LEAD_IN_DURATION_MS === 3 * LEAD_IN_TICK_INTERVAL_MS` comment, or assert it with a module-level `if (process.env.NODE_ENV !== 'production' && LEAD_IN_DURATION_MS <= 2 * LEAD_IN_TICK_INTERVAL_MS) throw …`.

---

## Notes on hooks that passed deep review with no findings

The following hooks were inspected at deep depth (call-chain trace, type consistency, error propagation, race analysis) and produced no actionable findings:

- `useUiStringsContext.tsx` — minimal context wrapper; throws on missing provider (correct).
- `usePrefersReducedMotion.ts` — clean MediaQueryList subscription with mount re-seed (IN-02 pattern) and proper change-listener teardown.
- `useTheme.ts` — clean three-effect orchestrator. The S-04 gated matchMedia effect correctly tears down when switching out of `'system'`. Cross-tab + same-tab listeners both teardown correctly.
- `useLocale.ts` — same shape as `useTheme` minus the system-mode gate. Lang attribute write on `document.documentElement.lang` is idempotent.
- `useVisualCue.ts` — read-only orchestrator. Two listener effects, both with correct teardown.
- `useWakeLock.ts` — the `AH-WR-01` generation-counter pattern is consistent across `request`, `release`, and unmount cleanup. Pitfall 6 (synchronous-null-then-async-release) is correctly applied. The sentinel's `release` event listener is `{ once: true }` — no leak on garbage collection.
- `useNKEngine.ts` — the `pendingTransition` D-11 fix is correct (the final OM gets full display time before phase change). Refs are used correctly for callbacks. `useEffect` cleanup at line 240 cancels the pending timer.
- `useSessionEngine.ts` — the dep array `[state.status]` on the rAF effect is intentional and documented (`AH-WR-05`). The `cancelled` flag + `cancelAnimationFrame` double-guard is correct. The `currentFrame` useMemo with primitive deps and lint-disable for the local-narrow pattern is correctly justified.
- `useFeatureFlags.ts` — `useSyncExternalStore` for popstate is the correct primitive. Both listener effects have empty deps with stable setters.

---

_Reviewed: 2026-05-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
