# Phase 5: Mobile Hands-Off Resilience - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 introduces a single progressive-enhancement hook that requests the Screen Wake Lock API when a breathing session is in flight, so the device screen stays awake without the user having to tap during practice (MOBL-02). The hook acquires the lock at the same user-gesture moment that `audioStart` is invoked (inside `onStartClick` during lead-in), releases it cleanly on every session-exit path (manual End, modal-confirm End, complete, lead-in cancel, unmount), and re-acquires it on `visibilitychange` whenever the tab returns to the foreground while a session is still running. On unsupported browsers, on permission denial, on secure-context absence, and on any thrown rejection, the failure is silently absorbed — no banner, no toast, no inline notice — matching Phase 3 D-10 (AudioContext failure → visuals-only) and Phase 4 D-16/D-17 (storage failure → in-memory only).

The phase boundary is fixed by `.planning/ROADMAP.md`. Out of scope for Phase 5: a user-visible Wake Lock fallback explanation (v2 `MOBL-03`), pause/resume during a session (v2 `SESS-06`), any UI indicator showing wake-lock state (deferred — D-09), volume control (v2 `AUDI-03`), Forrest learning content / claim-safe copy (Phase 6), accounts/cloud sync (PROJECT.md out-of-scope), PWA/offline (v2 `PWA-01`), and any change to the Phase 1 timing math, Phase 2 visual contract, Phase 3 audio engine API, or Phase 4 storage envelope. Wake Lock state is NOT persisted — it is a per-session imperative and never written to localStorage.

</domain>

<decisions>
## Implementation Decisions

### Acquisition Timing
- **D-01:** The Wake Lock request fires inside `onStartClick` during the lead-in branch, **parallel with `audioStart(plan)`**. This is the same user-gesture-fresh window where the AudioContext is constructed (Phase 3 D-09) — browsers accept Wake Lock requests reliably from within a click handler chain and may reject them outside one. The visual 3-2-1 countdown is part of the "session running" experience from the user's POV; the screen MUST stay awake during it, so deferring acquisition until t=0 would risk a 3-second blank-screen window on aggressive auto-lock devices.
- **D-02:** Wake Lock acquisition is **not awaited inline** in the start chain. The hook's `request()` returns a Promise that fires-and-forgets — the lead-in setTimeout chain (3-2-1) runs independently. Failures (rejection, no API) update internal hook state but do not block or reroute the start path. This mirrors Phase 3's `audioStart` non-blocking lead-in: visuals + timing must continue regardless of imperative-resource success.

### Visibility Re-Acquisition
- **D-03:** A `document.visibilitychange` listener is installed inside the hook. When the document transitions to `visible` AND the hook's internal `wasAcquired` flag is `true` (i.e. the consumer called `request()` and has not yet called `release()`), the hook **re-requests** the lock. This handles the natural mobile flow of phone-lock / phone-unlock during a session — the OS releases the lock when the tab is hidden (browser-mandated behavior of the Wake Lock API), and without re-acquisition the screen would lapse to OS auto-lock on return.
- **D-04:** The visibility listener is owned by the hook (installed in a `useEffect` on mount, removed in cleanup). It is gated by `wasAcquired` so re-acquisition does NOT fire when the user had the tab in the foreground and never started a session.
- **D-05:** Re-acquisition failures are silently absorbed (same posture as D-08 below). The `wasAcquired` flag stays `true` so subsequent visibility transitions retry — a single failed re-acquire does not abort future attempts during the same session.

### Release Triggers
- **D-06:** "Reset" in the ROADMAP success criteria ("Ending, resetting, or completing a session releases hands-off screen-awake behavior cleanly") is a **synonym for ending mid-session**. v1 has no pause/resume (`SESS-06` is v2) and no in-session "Restart" affordance — `ResetStatsDialog` is unrelated and only renders outside the session view (Phase 4 D-10). All session-exit paths therefore funnel into the same release rule.
- **D-07:** Release fires from **every path that takes `state.status` out of `running` OR exits `appPhase==='lead-in'` without entering `running`**. Concretely: manual `End` (open-ended), modal-confirm `End` (timed), `complete` (timed reaches duration), lead-in cancel (user re-clicks Start during 3-2-1), and unmount. The existing `useEffect` in `App.tsx` watching `state.status !== 'running'` is the natural single-write site, mirroring the Phase 4 stats writer (`recordSession`). The lead-in cancel branch in `onStartClick` and the unmount cleanup effect cover the two paths the `state.status` watcher cannot see (no transition out of `running` because the session never entered `running`).
- **D-08:** Release calls are **idempotent**: calling `release()` when no lock is held resolves silently. The hook tracks an internal sentinel ref; when the sentinel is `null`, `release()` is a no-op. This means the cleanup effect can call `release()` unconditionally on every status change without coordinating with the start path.

### Failure Posture
- **D-09:** **All Wake Lock failures are silently absorbed.** Concretely: `'wakeLock' in navigator === false` (older browsers), insecure context (HTTP origin without localhost exception), permission denial, `request('screen')` rejection for any reason, and re-acquisition failures all resolve with no user-facing artifact. No banner, no toast, no inline note, no console warning required (a single dev-only `console.debug` is acceptable but not mandatory). Matches Phase 3 D-10 (AudioContext fail → visuals-only) and Phase 4 D-16/D-17 (storage fail → in-memory only). The session continues; the screen is at the mercy of the OS auto-lock on unsupported browsers.
- **D-10:** **MOBL-03 (Wake Lock fallback explanation) is explicitly deferred to v2.** Phase 5 ships zero user-visible indication that the lock was unavailable. Users on iOS <16.4, Firefox without `dom.screenwakelock.enabled`, or any context where the API rejects will see no message and may experience screen lock during long sessions. This is the deliberate v1 trade-off captured in `REQUIREMENTS.md`.

### Module Shape
- **D-11:** Wake Lock logic lives in a new **`useWakeLock` hook** at `src/hooks/useWakeLock.ts`. Mirrors the `useAudioCues` shape: imperative methods exposed (`request()`, `release()`), internal sentinel ref + `wasAcquired` ref + visibility listener owned by the hook, no React state needed in the public return signature. `App.tsx` calls `request()` inside `onStartClick` (parallel with `audioStart`) and `release()` inside the existing `state.status !== 'running'` cleanup effect plus the lead-in cancel branch. Best-fit precedent — matches `useAudioCues.ts` and `useSessionEngine.ts` imperative-resource conventions.
- **D-12:** **State exposure is fully internal.** The hook returns ONLY `{ request, release }`. No `isAcquired`, no `isSupported`, no `status`. There is no UI surface in Phase 5 (D-10) and YAGNI applies — a future indicator (v2 `MOBL-03`) can re-plumb the return type without breaking existing callers. Internal flags (`sentinelRef`, `wasAcquired`) stay refs.

### Test Infrastructure
- **D-13:** `vitest.setup.ts` is extended with a `navigator.wakeLock` polyfill following the existing `Object.defineProperty(navigator, ...)` pattern used for `AudioContext` / `localStorage`. The polyfill provides a fake `request('screen')` that returns a `WakeLockSentinel`-shaped object with a `release()` method and a working `addEventListener('release', ...)` so `vi.spyOn(navigator.wakeLock, 'request')` and per-test `vi.stubGlobal` overrides (for the failure-path tests) work the same way the audio engine does. Tests assert: (a) request fires once on Start, (b) release fires on each exit path, (c) re-request fires on visibilitychange when `wasAcquired`, (d) silent absorption when `navigator.wakeLock` is undefined / `request` rejects.
- **D-14:** No fake-timer ceremony for Wake Lock tests — the hook's own scheduling is purely promise-based and event-driven. The existing `vi.useFakeTimers()` setup in App-level tests (lead-in countdown) remains unchanged; Wake Lock tests live alongside but do not depend on it.

### Claude's Discretion
The following technical choices are explicitly left to research/planning:
- Exact internal state shape inside the hook — single sentinel ref vs separate flags vs reducer. Constraint: idempotent `release()` (D-08), visibility re-acquire gated by `wasAcquired` (D-04), no React state in the public return (D-12).
- Whether `request()` returns `Promise<void>` or `Promise<boolean>` (success indicator). Either is fine for v1 since callers ignore the return per D-02; planner picks based on testing ergonomics.
- Whether to listen for the sentinel's own `'release'` event in addition to `visibilitychange`. The sentinel emits `'release'` when the system releases (which is mostly the visibility transition, but can also fire on other browser-internal triggers). Treating `'release'` as the canonical signal to clear the sentinel ref is cleaner; the visibility listener then becomes the re-acquire trigger only.
- Whether `console.debug` lines are added in the failure paths. D-09 makes this optional; planner may choose for development ergonomics.
- Whether the visibility listener uses `document.visibilityState === 'visible'` or `!document.hidden`. Both are equivalent; planner picks for readability.
- Module file organisation — hook file alone vs hook + a helper utility. The hook is small (~80 lines anticipated); a single file is likely sufficient.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope And Constraints
- `.planning/PROJECT.md` — Defines the no-medical-claims / local-only / no-PWA constraint that bounds Phase 5. Specifically the "Mobile" outcome wording in Constraints ("Web-first, responsive across mobile and desktop browsers — the core motivation is access without native apps") — Wake Lock is the v1 nudge toward usable mobile practice without writing a native app or shipping an installable PWA.
- `.planning/ROADMAP.md` — Defines Phase 5 goal, fixed boundary (`Depends on: Phase 4`), `Requirements: MOBL-02`, and the four success criteria. Also confirms Phase 6 is the next phase (`Learning & Claim-Safe Positioning`) — Phase 5 must not pull learning content forward.
- `.planning/STATE.md` — Notes "Wake Lock support is browser-dependent and must remain a progressive enhancement in Phase 5" in `Blockers/Concerns`. This is the project-level lock on the silent-fallback posture (D-09).

### Requirements
- `.planning/REQUIREMENTS.md` — Defines `MOBL-02` (Mobile & Responsive Use: User can start a session that attempts to keep the screen awake using Wake Lock where supported). Also defines deferred `MOBL-03` (User sees a Wake Lock fallback explanation when unsupported or rejected) — explicitly v2, must NOT be addressed in Phase 5. And `SESS-06` (pause/resume) — also v2, used here only to confirm "reset" cannot mean pause.

### Carrying Forward From Prior Phases
- `.planning/phases/01-configurable-session-timing/01-CONTEXT.md` — `useSessionEngine` lifecycle (`status: idle | running | complete`), the `state.startedAtMs` clock, and SESS-05 single-clock invariant. Phase 5 attaches release behavior to the existing `status !== 'running'` cleanup effect; it MUST NOT introduce a parallel timer or watch a different clock source.
- `.planning/phases/03-optional-generated-audio-cues/03-CONTEXT.md` — D-09 (AudioContext is constructed inside `onStartClick`'s user-gesture chain) is the precedent for D-01 (Wake Lock request fires in the same place). D-10 (silent visuals-only fallback when AC fails) is the precedent for D-09 (silent fallback when Wake Lock fails). D-11 (AC closes on every End path) is the structural precedent for D-07 (release fires on every End path).
- `.planning/phases/04-local-memory-practice-stats/04-CONTEXT.md` — D-16/D-17 (storage failures absorbed silently) confirms the silent-fallback posture is now a project pattern, not a one-off. D-18 (injected clock for testability) is NOT inherited — Wake Lock tests do not need a clock seam (D-14). Phase 4's wrapping pattern (`persistedSetSettings`, `persistedSetMuted` in `App.tsx` lines 129-138) shows how new behavior is added at the App composition site without modifying prior hooks.

### Web APIs And Browser Behavior
- MDN `Screen Wake Lock API` — primary API. Specifically `navigator.wakeLock.request('screen')` (returns `Promise<WakeLockSentinel>`), `WakeLockSentinel.release()`, `WakeLockSentinel.addEventListener('release', ...)`, the `'release'` event firing on tab-hidden, the secure-context requirement, and the iOS Safari 16.4+ availability cutoff.
- MDN `Page Visibility API` — `document.visibilityState`, `visibilitychange` event. Used for D-03 re-acquisition. The event fires on tab focus changes, browser-window minimize, OS-level lock-screen, and iOS Safari swipe-to-app-switcher.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/App.tsx` is the composition site. The `onStartClick` lead-in branch (lines 165-230) constructs the AudioContext via `audioStart(plan)` — Phase 5 calls `wakeLock.request()` immediately before or after that line, parallel and non-blocking (D-01, D-02). The `state.status !== 'running'` cleanup effect (lines 308-343) already covers manual End / modal-confirm End / complete and is the single-write site for stats — Phase 5 adds `wakeLock.release()` here (D-07). The lead-in cancel branch (lines 167-179) and the unmount cleanup (lines 394-398) cover the two paths the `state.status` watcher cannot see; both gain a `wakeLock.release()` call.
- `src/hooks/useAudioCues.ts` is the structural template for `useWakeLock` (D-11). Imperative API (`start`, `stop`, `setMuted`), internal `engineRef`, `useCallback([])` for stable identities, unmount cleanup. The Phase 5 hook follows the same shape but is significantly smaller — no audio engine, no async creation, no state machine — just a sentinel ref, a `wasAcquired` ref, the visibility listener, and two methods.
- `src/hooks/useSessionEngine.ts` exposes the canonical `state.status` discriminated union. Phase 5 does not touch this hook; it observes `state.status` from the App-level cleanup effect.
- `vitest.setup.ts` (lines 90-185) shows the `Object.defineProperty(window, '...', ...)` polyfill pattern with `configurable: true` so per-test `vi.stubGlobal` overrides work. D-13's `navigator.wakeLock` polyfill follows the same shape.

### Established Patterns
- **Imperative resource hooks** — Phase 3 introduced `useAudioCues` (engine ref, async init, cleanup-on-unmount). Phase 5's `useWakeLock` follows the same shape but smaller. No state machine, no React state, only refs + imperative methods + listener cleanup.
- **Silent-fallback posture** — Phase 3 D-10 (AC fail → visuals-only) + Phase 4 D-16/D-17 (storage fail → in-memory only) is now the project pattern for browser-API failures. Phase 5 D-09 inherits it directly.
- **Single-write-site lifecycle hooks** — Phase 4 D-18 / `recordSession` proves the App-level `state.status !== 'running'` effect is the canonical "session ended" hook. Phase 5 adds release here without competing with stats writes.
- **User-gesture API construction** — Phase 3 D-09 locks AudioContext construction inside the click handler. Phase 5 D-01 inherits the same posture for Wake Lock.
- **Polyfill-and-spy testing** — Phase 4's `Storage.prototype` polyfill + `vi.spyOn` pattern (and Phase 3's `AudioContext` polyfill + `vi.stubGlobal` pattern) are the canonical test seams for browser-API code. Phase 5 D-13 extends `vitest.setup.ts` the same way.

### Integration Points
- **`onStartClick` lead-in branch (`src/app/App.tsx:165-230`):** Phase 5 adds `wakeLock.request()` after `setAppPhase('lead-in')` and either before or in parallel with `await audioStart(plan)`. Fire-and-forget — the await chain is unchanged.
- **`onStartClick` cancel-during-lead-in branch (`src/app/App.tsx:167-179`):** Phase 5 adds `wakeLock.release()` alongside `void audioStop()`. Both are idempotent and fire-and-forget (D-08).
- **Cleanup effect watching `state.status !== 'running'` (`src/app/App.tsx:308-343`):** Phase 5 adds `wakeLock.release()` alongside the existing `void audioStop()` call. This covers manual End / modal-confirm End / complete in one site (D-07).
- **Unmount cleanup (`src/app/App.tsx:394-398`):** Phase 5's hook's internal `useEffect` cleanup releases the sentinel and removes the visibility listener. The App-level effect also calls `release()` defensively but the hook owns the listener.
- **New file:** `src/hooks/useWakeLock.ts` — the new hook (D-11). Anticipated ~80-120 lines.
- **New file:** `src/hooks/useWakeLock.test.tsx` — hook unit tests (D-13). Cover request, release, visibility re-acquire, silent-fallback when API absent or rejects.
- **Extended file:** `vitest.setup.ts` — adds the `navigator.wakeLock` polyfill (D-13).
- **Extended file:** `src/app/App.tsx` — adds the hook usage in 3 sites (request in start-click, release in cleanup effect, release in lead-in cancel). No structural changes to the existing logic.
- **No changes to:** `src/storage/`, `src/domain/`, `src/audio/`, `src/components/` — Phase 5 does not modify Phase 1-4 modules. (Possible exception: a defensive App-test for the integrated path may live under `src/app/App.wakeLock.test.tsx` parallel to `App.audio.test.tsx`, `App.persistence.test.tsx` — planner discretion.)

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose **Start-click acquisition over t=0 acquisition** (D-01). Reason: matches the AudioContext gesture-fresh window from Phase 3 D-09, browsers reject Wake Lock outside click handlers more often than they reject inside, and the 3-second lead-in countdown is part of the "session running" experience from the user's POV — losing the lock during 3-2-1 would be a real UX regression on aggressive auto-lock devices.
- The user explicitly chose **auto re-acquire on visibilitychange while running** over one-shot only (D-03). Reason: the typical mobile flow is start session → put phone face-down or pocket → return → unlock. The Wake Lock API auto-releases when the tab is hidden (browser-mandated, non-overridable). Without re-acquire, every phone-unlock during a session would reset the OS auto-lock countdown — exactly the "hands-off" failure mode this phase is meant to prevent.
- The user explicitly chose **'reset' = end mid-session synonym** (D-06). Reason: v1 has no pause/resume (`SESS-06` is v2) and no in-session "Restart" button. "Reset" in the ROADMAP wording is just another word for early termination; the existing `state.status !== 'running'` watcher is the single funnel.
- The user explicitly chose the **`useWakeLock` hook over a plain module or inline App.tsx code** (D-11). Reason: the codebase already has two imperative-resource hooks (`useAudioCues`, `useSessionEngine`) with a consistent shape. Following the same pattern keeps `App.tsx` from growing further (it is already the largest single file in the codebase) and gives the visibility listener a natural unmount-cleanup home that a plain module cannot provide.
- The user explicitly chose **fully internal state, no `isAcquired` / no `isSupported` exposure** (D-12). Reason: there is no UI surface in Phase 5 (silent fallback, D-09), MOBL-03 is v2, and YAGNI — a future indicator can re-plumb the hook return type without breaking existing callers. Lean public surface today is cheaper than speculative state today.

</specifics>

<deferred>
## Deferred Ideas

- **User-visible Wake Lock fallback explanation** (banner / inline note when API absent or rejected) — explicitly tracked as v2 `MOBL-03` in `REQUIREMENTS.md`. Phase 5 ships silent fallback (D-09 / D-10).
- **Pause/resume during a session with Wake Lock retained** — out of scope (`SESS-06` is v2). If pause/resume ships in v2, the hook may need a `pause()` API that releases without clearing `wasAcquired` — deferred until then.
- **Wake Lock state indicator** (e.g. small icon when active, dev-only debug panel) — explicitly deferred (D-12). Hook return signature is intentionally minimal so this can be added cleanly when MOBL-03 ships.
- **Configuration to disable Wake Lock** (e.g. user preference) — not requested, not in MOBL-02. The user opts in implicitly by starting a session; opt-out is by not starting one. May be revisited if user feedback shows battery anxiety.
- **Battery-aware acquisition** (e.g. release at low battery) — not in scope. Browser/OS already handle low-battery aggressive-saving on most platforms; an in-app heuristic would be brittle and overlap with OS behavior.
- **Persisted Wake Lock preference** (a "keep screen awake" toggle in settings) — not in scope. Wake Lock is per-session imperative; persistence would imply a UI toggle and a stored preference, both out of MOBL-02. May be revisited if v2 settings expand.
- **PWA / offline / installability** — explicitly out of scope per `PROJECT.md` and `REQUIREMENTS.md` (`PWA-01` is v2). Wake Lock works in plain web context; no manifest changes are needed in Phase 5.
- **iOS Safari <16.4 polyfill** (e.g. `nosleep.js` video-playback hack) — explicitly out of scope. Silent fallback (D-09) accepts the cost; bringing in a video-trickery shim would conflict with the calm tone (a hidden video tag), introduce battery overhead, and contradict the local-only / no-third-party-asset stance.

</deferred>

---

*Phase: 05-mobile-hands-off-resilience*
*Context gathered: 2026-05-10*
