# Phase 5: Mobile Hands-Off Resilience - Research

**Researched:** 2026-05-10
**Domain:** Screen Wake Lock API + Page Visibility API + React imperative-resource hook patterns + vitest jsdom polyfill
**Confidence:** HIGH (Wake Lock API surface verified against MDN, W3C spec, web.dev, caniuse, and bundled `lib.dom.d.ts`; project carry-forward verified against actual source)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Acquisition Timing
- **D-01:** The Wake Lock request fires inside `onStartClick` during the lead-in branch, **parallel with `audioStart(plan)`**. This is the same user-gesture-fresh window where the AudioContext is constructed (Phase 3 D-09) — browsers accept Wake Lock requests reliably from within a click handler chain and may reject them outside one. The visual 3-2-1 countdown is part of the "session running" experience from the user's POV; the screen MUST stay awake during it, so deferring acquisition until t=0 would risk a 3-second blank-screen window on aggressive auto-lock devices.
- **D-02:** Wake Lock acquisition is **not awaited inline** in the start chain. The hook's `request()` returns a Promise that fires-and-forgets — the lead-in setTimeout chain (3-2-1) runs independently. Failures (rejection, no API) update internal hook state but do not block or reroute the start path. This mirrors Phase 3's `audioStart` non-blocking lead-in: visuals + timing must continue regardless of imperative-resource success.

#### Visibility Re-Acquisition
- **D-03:** A `document.visibilitychange` listener is installed inside the hook. When the document transitions to `visible` AND the hook's internal `wasAcquired` flag is `true` (i.e. the consumer called `request()` and has not yet called `release()`), the hook **re-requests** the lock. This handles the natural mobile flow of phone-lock / phone-unlock during a session — the OS releases the lock when the tab is hidden (browser-mandated behavior of the Wake Lock API), and without re-acquisition the screen would lapse to OS auto-lock on return.
- **D-04:** The visibility listener is owned by the hook (installed in a `useEffect` on mount, removed in cleanup). It is gated by `wasAcquired` so re-acquisition does NOT fire when the user had the tab in the foreground and never started a session.
- **D-05:** Re-acquisition failures are silently absorbed (same posture as D-08 below). The `wasAcquired` flag stays `true` so subsequent visibility transitions retry — a single failed re-acquire does not abort future attempts during the same session.

#### Release Triggers
- **D-06:** "Reset" in the ROADMAP success criteria ("Ending, resetting, or completing a session releases hands-off screen-awake behavior cleanly") is a **synonym for ending mid-session**. v1 has no pause/resume (`SESS-06` is v2) and no in-session "Restart" affordance — `ResetStatsDialog` is unrelated and only renders outside the session view (Phase 4 D-10). All session-exit paths therefore funnel into the same release rule.
- **D-07:** Release fires from **every path that takes `state.status` out of `running` OR exits `appPhase==='lead-in'` without entering `running`**. Concretely: manual `End` (open-ended), modal-confirm `End` (timed), `complete` (timed reaches duration), lead-in cancel (user re-clicks Start during 3-2-1), and unmount. The existing `useEffect` in `App.tsx` watching `state.status !== 'running'` is the natural single-write site, mirroring the Phase 4 stats writer (`recordSession`). The lead-in cancel branch in `onStartClick` and the unmount cleanup effect cover the two paths the `state.status` watcher cannot see (no transition out of `running` because the session never entered `running`).
- **D-08:** Release calls are **idempotent**: calling `release()` when no lock is held resolves silently. The hook tracks an internal sentinel ref; when the sentinel is `null`, `release()` is a no-op. This means the cleanup effect can call `release()` unconditionally on every status change without coordinating with the start path.

#### Failure Posture
- **D-09:** **All Wake Lock failures are silently absorbed.** Concretely: `'wakeLock' in navigator === false` (older browsers), insecure context (HTTP origin without localhost exception), permission denial, `request('screen')` rejection for any reason, and re-acquisition failures all resolve with no user-facing artifact. No banner, no toast, no inline note, no console warning required (a single dev-only `console.debug` is acceptable but not mandatory). Matches Phase 3 D-10 (AudioContext fail → visuals-only) and Phase 4 D-16/D-17 (storage fail → in-memory only). The session continues; the screen is at the mercy of the OS auto-lock on unsupported browsers.
- **D-10:** **MOBL-03 (Wake Lock fallback explanation) is explicitly deferred to v2.** Phase 5 ships zero user-visible indication that the lock was unavailable. Users on iOS <16.4, Firefox without `dom.screenwakelock.enabled`, or any context where the API rejects will see no message and may experience screen lock during long sessions. This is the deliberate v1 trade-off captured in `REQUIREMENTS.md`.

#### Module Shape
- **D-11:** Wake Lock logic lives in a new **`useWakeLock` hook** at `src/hooks/useWakeLock.ts`. Mirrors the `useAudioCues` shape: imperative methods exposed (`request()`, `release()`), internal sentinel ref + `wasAcquired` ref + visibility listener owned by the hook, no React state needed in the public return signature. `App.tsx` calls `request()` inside `onStartClick` (parallel with `audioStart`) and `release()` inside the existing `state.status !== 'running'` cleanup effect plus the lead-in cancel branch.
- **D-12:** **State exposure is fully internal.** The hook returns ONLY `{ request, release }`. No `isAcquired`, no `isSupported`, no `status`. There is no UI surface in Phase 5 (D-10) and YAGNI applies — a future indicator (v2 `MOBL-03`) can re-plumb the return type without breaking existing callers. Internal flags (`sentinelRef`, `wasAcquired`) stay refs.

#### Test Infrastructure
- **D-13:** `vitest.setup.ts` is extended with a `navigator.wakeLock` polyfill following the existing `Object.defineProperty(navigator, ...)` pattern used for `AudioContext` / `localStorage`. The polyfill provides a fake `request('screen')` that returns a `WakeLockSentinel`-shaped object with a `release()` method and a working `addEventListener('release', ...)` so `vi.spyOn(navigator.wakeLock, 'request')` and per-test `vi.stubGlobal` overrides (for the failure-path tests) work the same way the audio engine does.
- **D-14:** No fake-timer ceremony for Wake Lock tests — the hook's own scheduling is purely promise-based and event-driven. The existing `vi.useFakeTimers()` setup in App-level tests (lead-in countdown) remains unchanged; Wake Lock tests live alongside but do not depend on it.

### Claude's Discretion
The following technical choices are explicitly left to research/planning:
- Exact internal state shape inside the hook — single sentinel ref vs separate flags vs reducer. Constraint: idempotent `release()` (D-08), visibility re-acquire gated by `wasAcquired` (D-04), no React state in the public return (D-12).
- Whether `request()` returns `Promise<void>` or `Promise<boolean>` (success indicator). Either is fine for v1 since callers ignore the return per D-02; planner picks based on testing ergonomics.
- Whether to listen for the sentinel's own `'release'` event in addition to `visibilitychange`. The sentinel emits `'release'` when the system releases (which is mostly the visibility transition, but can also fire on other browser-internal triggers). Treating `'release'` as the canonical signal to clear the sentinel ref is cleaner; the visibility listener then becomes the re-acquire trigger only.
- Whether `console.debug` lines are added in the failure paths. D-09 makes this optional; planner may choose for development ergonomics.
- Whether the visibility listener uses `document.visibilityState === 'visible'` or `!document.hidden`. Both are equivalent; planner picks for readability.
- Module file organisation — hook file alone vs hook + a helper utility. The hook is small (~80 lines anticipated); a single file is likely sufficient.

### Deferred Ideas (OUT OF SCOPE)
- **User-visible Wake Lock fallback explanation** (banner / inline note when API absent or rejected) — explicitly tracked as v2 `MOBL-03` in `REQUIREMENTS.md`. Phase 5 ships silent fallback (D-09 / D-10).
- **Pause/resume during a session with Wake Lock retained** — out of scope (`SESS-06` is v2). If pause/resume ships in v2, the hook may need a `pause()` API that releases without clearing `wasAcquired` — deferred until then.
- **Wake Lock state indicator** (e.g. small icon when active, dev-only debug panel) — explicitly deferred (D-12). Hook return signature is intentionally minimal so this can be added cleanly when MOBL-03 ships.
- **Configuration to disable Wake Lock** (e.g. user preference) — not requested, not in MOBL-02.
- **Battery-aware acquisition** — not in scope; OS already handles low-battery aggressive-saving.
- **Persisted Wake Lock preference** — not in scope. Wake Lock is per-session imperative.
- **PWA / offline / installability** — explicitly out of scope per `PROJECT.md` (`PWA-01` is v2).
- **iOS Safari <16.4 polyfill** (e.g. `nosleep.js` video-playback hack) — explicitly out of scope. Silent fallback (D-09) accepts the cost.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOBL-02 | User can start a session that attempts to keep the screen awake using Wake Lock where supported. | Standard Stack (Wake Lock API native, zero deps); Architecture Patterns (imperative-resource hook + visibility re-acquire); Code Examples (canonical request/release/re-acquire patterns); Validation Architecture (hook unit tests + App integration tests + manual mobile QA). |

**Confirmed deferred (NOT in Phase 5 scope):**
- `MOBL-03` (Wake Lock fallback explanation) — listed under v2 in `.planning/REQUIREMENTS.md` lines 75-76.
- `SESS-06` (pause/resume) — listed under v2 in `.planning/REQUIREMENTS.md` line 60.

</phase_requirements>

## Summary

Phase 5 adds a single small React hook (`useWakeLock`) that wraps the W3C Screen Wake Lock API (`navigator.wakeLock.request('screen')`). The hook is structurally a stripped-down `useAudioCues` — imperative methods + refs + a useEffect for the visibility listener — and it is wired into `App.tsx` at three sites: `onStartClick` lead-in branch (parallel with `audioStart`), `onStartClick` cancel branch (parallel with `audioStop`), and the existing `state.status !== 'running'` cleanup effect (parallel with `audioStop`). All failure modes are silent (`MOBL-03` deferred). Re-acquisition on `visibilitychange` to `visible` is the documented MDN pattern.

The Wake Lock API is now available across all major browsers (Chrome 85+, Safari 16.4+ on iOS, Firefox 126+ shipped, Samsung Internet 14+), so the silent-fallback path will be hit only by older browsers or insecure-context loads. TypeScript 6.0.2's bundled `lib.dom.d.ts` includes `WakeLock`, `WakeLockSentinel`, `WakeLockType` natively (verified in this project's `node_modules`) — no `@types/dom-screen-wake-lock` package is needed and no augmentation is required. Note that `navigator.wakeLock` is typed as **non-optional** in `lib.dom.d.ts`, so the runtime feature-detect (`'wakeLock' in navigator`) is mandatory and TypeScript will not warn about its absence.

Test infrastructure follows the existing pattern in `vitest.setup.ts`: a one-time conditional `Object.defineProperty(navigator, 'wakeLock', { writable: true, configurable: true, value: <fake> })` polyfill that gives jsdom a `WakeLockSentinel`-shaped fake (with a working `EventTarget` for `addEventListener('release', ...)` and a `release()` method that flips `released=true` and dispatches the `release` event). Per-test failure paths use `vi.stubGlobal` or `vi.spyOn(navigator.wakeLock, 'request').mockRejectedValue(...)`. No fake timers needed (D-14).

**Primary recommendation:** Implement `useWakeLock` exactly mirroring `useAudioCues.ts`'s shape — `useRef<WakeLockSentinel | null>(null)` for the sentinel, a `useRef<boolean>(false)` for `wasAcquired`, `useCallback([])`-stable `request()` and `release()`, a single `useEffect([])` that installs the `visibilitychange` listener and the unmount-time release. Listen for the sentinel's own `'release'` event to clear the ref (cleanest signal — covers OS-initiated release, manual release, and tab-hidden release uniformly). Use `visibilitychange` strictly as the re-acquire trigger.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Acquire screen wake lock on session start | Browser / Client (hook + DOM API) | — | Wake Lock is a per-document browser API; no server involvement. Same tier as Phase 3 audio engine. |
| Release wake lock on every session-exit path | Browser / Client (App.tsx effect + hook) | — | Lifecycle hook fires from React state transitions; release is a synchronous-from-the-hook's-POV imperative call into the DOM. |
| Re-acquire on tab-foreground transition | Browser / Client (hook-owned visibilitychange listener) | — | `document.visibilitychange` is a DOM event; the hook owns its lifecycle. |
| Silent-fallback on unsupported browsers | Browser / Client (hook try/catch + feature detect) | — | Matches Phase 3 D-10 / Phase 4 D-16-17 silent posture; nothing to escalate. |
| Persistence of wake-lock state | **NONE** | — | Wake Lock is per-session imperative — explicitly NOT persisted (CONTEXT phase boundary, ROADMAP). |
| User-visible indicator of wake-lock state | **NONE in v1** | — | Deferred to v2 `MOBL-03` (D-10/D-12). Hook return is `{ request, release }` only. |

This is purely a Browser/Client tier addition. No API tier, no storage tier, no UI surface. Misassignment risk is low because the API itself is browser-only.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `navigator.wakeLock` | W3C Recommendation 2024 / Baseline 2025 | Acquire/release screen wake lock | Built into the platform across all major browsers as of 2026. No userland alternative needed. [VERIFIED: caniuse.com/wake-lock; web.dev/blog/screen-wake-lock-supported-in-all-browsers] |
| Native `document.visibilitychange` | Page Visibility API (W3C, ubiquitous) | Detect tab foreground/background transitions for re-acquire | Mature DOM event; supported everywhere. [VERIFIED: MDN] |
| TypeScript bundled `lib.dom.d.ts` | TS 6.0.2 (already in `package.json`) | Types for `WakeLock`, `WakeLockSentinel`, `WakeLockType`, `Navigator.wakeLock` | Already in project's installed TypeScript — no external `@types/dom-screen-wake-lock` package needed. [VERIFIED: grep against `/Users/lucindo/Code/hrv/node_modules/typescript/lib/lib.dom.d.ts`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React | ^19.2.5 (existing) | Hook composition, refs, effects | Already in project; `useWakeLock` is a React hook. |
| Vitest | ^4.1.5 (existing) | Test runner | Already in project; Wake Lock hook + App-integration tests run under it. |
| @testing-library/react | ^16.3.2 (existing) | `renderHook` + `act` for hook unit tests | Same idiom used in `useAudioCues.test.tsx` and `useSessionEngine.test.tsx`. |
| jsdom | ^29.1.1 (existing) | DOM env in tests | Does NOT implement `navigator.wakeLock` — polyfill in `vitest.setup.ts` is required (D-13). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Wake Lock | `nosleep.js` (silent-video-playback hack for iOS <16.4) | Explicitly rejected by CONTEXT deferred-ideas: introduces a hidden `<video>` tag (battery cost, calm-tone violation, third-party dep). |
| Native Wake Lock | `@types/dom-screen-wake-lock` package | Unnecessary in TS 6.0.2 — types are already bundled. Adding the package would add a redundant dep. [VERIFIED] |
| Custom hook | Community `use-wake-lock` (mikeesto) | Adds a third-party dep for ~80 lines of code. Project already has the `useAudioCues` template — writing the hook in-tree mirrors existing patterns and avoids version-drift surface. |

**Installation:**

No new dependencies. Phase 5 adds zero packages — only project files.

```bash
# Nothing to install. All Wake Lock types are in the bundled lib.dom.d.ts.
```

**Version verification:**

```bash
# Confirm TypeScript ships Wake Lock types:
grep "interface WakeLockSentinel" node_modules/typescript/lib/lib.dom.d.ts
# Result: present (verified 2026-05-10 against TS 6.0.2)
```

The bundled `lib.dom.d.ts` declares:
- `interface WakeLock { request(type?: WakeLockType): Promise<WakeLockSentinel>; }`
- `interface WakeLockSentinel extends EventTarget { onrelease, released, type, release(), addEventListener('release', ...) }`
- `interface WakeLockSentinelEventMap { "release": Event; }`
- `type WakeLockType = "screen";`
- On `Navigator`: `readonly wakeLock: WakeLock;` (**non-optional** — runtime feature detection still required)

## Architecture Patterns

### System Architecture Diagram

```
                                       USER INTERACTION
                                              │
                                  ┌───────────▼───────────┐
                                  │  click "Start session" │
                                  └───────────┬───────────┘
                                              │ (user gesture)
                                              ▼
                              ┌────────────────────────────────────┐
                              │   App.tsx onStartClick (idle path) │
                              │   (existing, lines 165-230)        │
                              └─────────────────┬──────────────────┘
                                                │
                          ┌─────────────────────┼─────────────────────┐
                          │                     │                     │
                          ▼ (existing)          ▼ (existing)          ▼ (NEW)
                   ┌──────────────┐    ┌──────────────────┐  ┌──────────────────┐
                   │ setAppPhase  │    │ audioStart(plan) │  │ wakeLock.request │
                   │  ('lead-in') │    │ (Phase 3)        │  │  (Phase 5, D-01) │
                   └──────┬───────┘    └────────┬─────────┘  └────────┬─────────┘
                          │                     │ (await,             │ (fire-and-forget,
                          ▼                     │  non-blocking)      │  D-02)
                   ┌──────────────┐             │                     │
                   │ setTimeouts  │             │              ┌──────▼───────────┐
                   │  3 → 2 → 1   │             │              │ navigator.       │
                   │ (3000ms      │             │              │  wakeLock        │
                   │  total)      │             │              │  .request('screen')│
                   └──────┬───────┘             │              └──────┬───────────┘
                          │                     │                     │
                          ▼                     │              ┌──────┴────────────┐
                   ┌──────────────┐             │              │ rejection?        │
                   │ session.start│             │              │ ─→ silent fallback│
                   │  (t = 0)     │             │              │   (D-09)          │
                   └──────┬───────┘             │              └──────┬────────────┘
                          │                     │                     │ (success)
                          │                     │              ┌──────▼────────────┐
                          │                     │              │ sentinelRef =     │
                          │                     │              │   sentinel        │
                          │                     │              │ wasAcquiredRef =  │
                          │                     │              │   true            │
                          │                     │              └──────┬────────────┘
                          ▼                     ▼                     ▼
                   ┌─────────────────────────────────────────────────────┐
                   │         RUNNING SESSION (state.status === 'running')│
                   │  Visuals (orb) ◄── frame ── Audio cues ── Wake Lock │
                   │                                              held    │
                   └────────────────────────────┬────────────────────────┘
                                                │
                          ┌─────────────────────┼──────────────────────┐
                          │                     │                      │
                  ┌───────▼─────────┐  ┌────────▼────────┐  ┌─────────▼─────────┐
                  │ User clicks End │  │ Tab → hidden    │  │ Tab → visible     │
                  │  (or timer hits │  │  (lock screen,  │  │  (return)         │
                  │  duration)      │  │   app-switcher) │  │                   │
                  └───────┬─────────┘  └────────┬────────┘  └─────────┬─────────┘
                          │                     │                     │
                          │              ┌──────▼─────────┐    ┌──────▼────────┐
                          │              │ OS releases    │    │ visibilitychange│
                          │              │ lock (browser- │    │  fires (D-03)  │
                          │              │ mandated)      │    │  AND state ==  │
                          │              │ → 'release'    │    │  'visible' AND │
                          │              │ event fires    │    │ wasAcquired    │
                          │              │ → sentinelRef  │    │  → re-request  │
                          │              │   cleared      │    └──────┬────────┘
                          │              │ (wasAcquired   │           │
                          │              │  STAYS true)   │           ▼
                          │              └────────────────┘    [back into running]
                          │
                          ▼
                   ┌────────────────────────────────────┐
                   │ state.status !== 'running' effect  │
                   │ (App.tsx, existing, lines 308-343) │
                   │  ─ audioStop()  (existing)         │
                   │  ─ wakeLock.release()  (NEW, D-07) │
                   │  ─ recordSession  (existing P4)    │
                   │  ─ reset appPhase, refs            │
                   └────────────────────────────────────┘

LEGEND:
  Existing wiring is unchanged. Phase 5 adds:
    • One call site in onStartClick lead-in branch (parallel with audioStart)
    • One call site in onStartClick cancel-during-lead-in branch (parallel with audioStop)
    • One call site in the existing state.status !== 'running' effect (parallel with audioStop)
    • The hook itself owns visibilitychange + unmount cleanup internally
```

### Component Responsibilities

| File | Responsibility |
|------|----------------|
| `src/hooks/useWakeLock.ts` (NEW) | Owns sentinel ref, `wasAcquired` ref, visibility listener, sentinel `'release'` listener, unmount cleanup. Returns `{ request, release }` only. |
| `src/app/App.tsx` (EXTENDED) | Calls `wakeLock.request()` in `onStartClick` lead-in branch (parallel with `audioStart`); calls `wakeLock.release()` in lead-in cancel branch (parallel with `audioStop`); calls `wakeLock.release()` in `state.status !== 'running'` effect (parallel with `audioStop`). |
| `src/hooks/useWakeLock.test.tsx` (NEW) | Hook unit tests: request success, request failure (no API / rejection), release idempotency, visibility re-acquire when wasAcquired, no re-acquire when not acquired, unmount cleanup. |
| `src/app/App.wakeLock.test.tsx` (NEW, planner discretion) | App-integration tests: request fires on Start, release fires on every exit path. |
| `vitest.setup.ts` (EXTENDED) | Adds `navigator.wakeLock` polyfill following the existing `Object.defineProperty` pattern. |

### Recommended Project Structure

```
src/
├── hooks/
│   ├── useAudioCues.ts            # existing — STRUCTURAL TEMPLATE for useWakeLock
│   ├── useSessionEngine.ts        # existing — observed by App-level cleanup effect
│   ├── usePrefersReducedMotion.ts # existing — unrelated
│   ├── useWakeLock.ts             # NEW — Phase 5 hook
│   └── useWakeLock.test.tsx       # NEW — Phase 5 hook unit tests
├── app/
│   ├── App.tsx                    # EXTENDED — three call sites added
│   ├── App.audio.test.tsx         # existing — should not require changes (verify)
│   ├── App.persistence.test.tsx   # existing — should not require changes (verify)
│   ├── App.session.test.tsx       # existing — should not require changes (verify)
│   ├── App.dialog.test.tsx        # existing — should not require changes (verify)
│   ├── App.settings.test.tsx      # existing — should not require changes (verify)
│   └── App.wakeLock.test.tsx      # NEW (planner discretion) — Phase 5 App-integration tests
└── (no new files outside hooks/ and app/)

vitest.setup.ts                    # EXTENDED — navigator.wakeLock polyfill
```

### Pattern 1: Imperative-Resource Hook with Idempotent Release

**What:** A React hook that wraps a browser-side imperative resource (DOM API) with `useRef` for the live handle, `useCallback([])` for stable method identities, and `useEffect([])` for unmount cleanup. The hook exposes only imperative methods, never React state, when there is no UI consumer (D-12).

**When to use:** Whenever the resource has independent lifecycle from React render and the consumer drives it imperatively (Phase 3 `useAudioCues`, Phase 5 `useWakeLock`).

**Example (verified template — `src/hooks/useAudioCues.ts:54-164`, adapted for Wake Lock):**

```typescript
// Source: project pattern from src/hooks/useAudioCues.ts
import { useCallback, useEffect, useRef } from 'react'

export interface UseWakeLock {
  request(): Promise<void>
  release(): Promise<void>
}

export function useWakeLock(): UseWakeLock {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const wasAcquiredRef = useRef<boolean>(false)

  const request = useCallback(async (): Promise<void> => {
    // D-09 silent fallback: API absence
    if (!('wakeLock' in navigator)) return
    // D-08 idempotent: skip if already held
    if (sentinelRef.current !== null) return
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      sentinelRef.current = sentinel
      wasAcquiredRef.current = true
      // Sentinel's own 'release' event is the canonical signal that the lock
      // is gone — fires for OS-initiated release (tab hidden) AND manual
      // release. Use it to clear the ref uniformly. Do NOT reset wasAcquired
      // here — D-04 keeps it true so visibilitychange re-acquires.
      sentinel.addEventListener('release', () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null
        }
      })
    } catch {
      // D-09: silently absorbed (NotAllowedError, SecurityError, etc.)
    }
  }, [])

  const release = useCallback(async (): Promise<void> => {
    wasAcquiredRef.current = false  // stop visibility re-acquires
    const sentinel = sentinelRef.current
    sentinelRef.current = null  // clear synchronously (mirror useAudioCues stop())
    if (sentinel !== null) {
      try { await sentinel.release() } catch { /* D-09 */ }
    }
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (!wasAcquiredRef.current) return
      if (sentinelRef.current !== null) return  // already re-acquired
      void request()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      // Unmount: synchronously release if still held.
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      wasAcquiredRef.current = false
      if (sentinel !== null) {
        void sentinel.release().catch(() => {})  // D-09
      }
    }
  }, [request])

  return { request, release }
}
```

This is a **starting point**, not a final implementation — the planner picks the exact internal flag layout and decides whether to add `console.debug` (CONTEXT discretion).

### Pattern 2: Visibility Re-Acquire (MDN Canonical)

**What:** When the document becomes hidden, the browser auto-releases all wake locks (browser-mandated, non-overridable behavior). When the document becomes visible again, re-request the lock IF the consumer was holding one before hide.

**When to use:** Whenever a wake lock must persist across natural mobile screen-lock cycles (D-03).

**Example (Source: [MDN Screen_Wake_Lock_API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)):**

```javascript
// Canonical MDN pattern — adapted to ref-tracked acquired state.
document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    wakeLock = await navigator.wakeLock.request('screen')
  }
})
```

The project's hook pattern (Pattern 1) refines this by:
1. Tracking `wasAcquiredRef` separately from `sentinelRef`. The MDN example mutates `wakeLock` to null externally; the project pattern uses two refs because `sentinelRef` is cleared by the sentinel's own `'release'` listener (which fires on tab-hide), while `wasAcquiredRef` is cleared only by the consumer's `release()` call.
2. Adding the `sentinelRef.current !== null` guard so a fast double `visibilitychange` (or a manual `request()` ahead of the listener) is idempotent.

### Pattern 3: Polyfill-and-Spy Test Seam (Project Convention)

**What:** Conditional install of a fake browser API on the `window` (or `navigator`) object inside `vitest.setup.ts`, gated by feature detection so it does not clobber a real implementation. The fake exposes the same shape as the real API; tests use `vi.spyOn(navigator.wakeLock, 'request')` for assertions and `vi.stubGlobal` (or per-test override) for failure paths.

**When to use:** Any browser API not implemented by jsdom 29.1.1.

**Example (Source: project pattern in `vitest.setup.ts:126-200` for AudioContext, adapted):**

```typescript
// vitest.setup.ts addition for Phase 5
if (typeof navigator !== 'undefined' && !('wakeLock' in navigator)) {
  class FakeWakeLockSentinel extends EventTarget {
    type: WakeLockType = 'screen'
    released = false
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null = null

    async release(): Promise<void> {
      if (this.released) return
      this.released = true
      const event = new Event('release')
      // Fire onrelease handler if set (lib.dom.d.ts contract)
      if (this.onrelease) this.onrelease.call(this as unknown as WakeLockSentinel, event)
      // Fire addEventListener('release', ...) handlers
      this.dispatchEvent(event)
    }
  }

  const fakeWakeLock = {
    request: vi.fn(async (_type?: WakeLockType) => new FakeWakeLockSentinel()),
  }

  Object.defineProperty(navigator, 'wakeLock', {
    writable: true,
    configurable: true,  // allow per-test vi.stubGlobal / Object.defineProperty override
    value: fakeWakeLock,
  })
}
```

Per-test failure path:

```typescript
// Test: silently absorb rejection
beforeEach(() => {
  vi.spyOn(navigator.wakeLock, 'request').mockRejectedValueOnce(
    new DOMException('blocked', 'NotAllowedError'),
  )
})
```

Per-test API-absent path (matches the `useAudioCues` pattern of removing the global):

```typescript
// Test: silently absorb when API is undefined
beforeEach(() => {
  // Save and remove navigator.wakeLock
  const saved = (navigator as any).wakeLock
  delete (navigator as any).wakeLock
  // ...test runs here, hook should bail at the `'wakeLock' in navigator` check
  // Restore in afterEach
})
```

### Anti-Patterns to Avoid

- **Using a single sentinel ref as the "acquired" flag.** The sentinel ref gets cleared automatically when the OS releases on tab-hide (via the `'release'` event listener), but the consumer is still holding the conceptual lock and wants re-acquisition. Use TWO refs: `sentinelRef` (the live handle, may be null mid-session if tab is hidden) and `wasAcquiredRef` (the consumer's intent — only cleared by explicit `release()`).
- **Awaiting `request()` inline in the start chain.** D-02 forbids this — the lead-in countdown must run regardless of Wake Lock outcome. Use fire-and-forget (`void wakeLock.request()`) or call inside `onStartClick` without `await`.
- **Calling `request()` from a non-user-gesture path.** While the W3C spec does NOT mandate transient activation (per `https://www.w3.org/TR/screen-wake-lock/` section 8.1), browsers may reject more aggressively outside a click handler in practice. D-01 locks the call site to inside `onStartClick` (the user-gesture chain) — do not move it to a `useEffect` that fires on `state.status === 'running'`.
- **Leaving stale event listeners on a released sentinel.** A `WakeLockSentinel`, once released (`released === true`), cannot be reused — a fresh `request()` returns a new sentinel. The project pattern's `if (sentinelRef.current === sentinel)` guard inside the `'release'` listener prevents a stale listener (from a prior acquire/release cycle) from clobbering a freshly-acquired sentinel ref.
- **Persisting wake-lock state.** Per CONTEXT phase boundary: "Wake Lock state is NOT persisted — it is a per-session imperative and never written to localStorage." Do not add a storage key.
- **Using a UI indicator.** D-10 / D-12 forbid this for v1.
- **Re-implementing `request('screen')` rejection codes.** The W3C spec says only `NotAllowedError` is thrown; treating "any rejection" as the silent-fallback signal (a generic try/catch) is correct AND simpler. Do not branch on `err.name`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keep mobile screen awake during practice | A `setInterval` that polls and re-focuses, a hidden silent-video tag, or a fake user-input trigger | `navigator.wakeLock.request('screen')` | All native-behavior workarounds are battery-expensive, brittle, OS-blocked, or visually intrusive. The W3C API exists exactly for this. |
| Detect tab visibility transitions | Custom blur/focus listeners on `window` | `document.addEventListener('visibilitychange', ...)` + `document.visibilityState` | Page Visibility API handles all platform variants (iOS swipe-to-app-switcher, Android task-switch, OS lock-screen) uniformly. blur/focus miss several mobile cases. |
| Test browser API absence path | Mock the entire `useWakeLock` hook | Polyfill `navigator.wakeLock` with a fake in `vitest.setup.ts` and stub-globally in failure-path tests | Project precedent — `AudioContext` and `Storage` polyfills follow this pattern; mocking the hook bypasses the actual feature-detect branch we want to verify. |
| Provide TypeScript types for Wake Lock | Hand-write `interface Navigator { wakeLock: ... }` augmentation | Use TypeScript 6.0.2's bundled `lib.dom.d.ts` | Types ship in the bundled lib — verified by grep against the project's installed TypeScript. Augmenting would conflict. |
| Track "is the lock currently held" for re-acquire | Subscribe to all the things, write a state machine | Two refs + the sentinel's `'release'` event listener | The shape is captured by `sentinelRef` (live handle) + `wasAcquiredRef` (intent). Sentinel's own `'release'` event tells us when the OS released. ~30 lines, no state machine. |

**Key insight:** Phase 5 is structurally simpler than Phase 3 audio — no AudioContext lifecycle complexity, no scheduler, no fade math, no clock alignment. The complexity is purely in the silent-fallback branches and the visibility re-acquire correctness. Lean hard on the W3C API and the existing project polyfill convention.

## Runtime State Inventory

> Not a rename/refactor/migration phase. Phase 5 is greenfield additive code. This section is OMITTED.

## Common Pitfalls

### Pitfall 1: Holding a stale sentinel after tab-hidden (auto-release)

**What goes wrong:** The OS releases the wake lock when the tab becomes hidden (W3C spec section 11.3, browser-mandated, non-overridable). If the hook keeps the old sentinel reference, a subsequent `release()` call awaits a no-op promise on an already-released sentinel — harmless, but the `wasAcquired` re-acquire logic gets confused if it checks `sentinelRef.current !== null` to mean "still acquired."

**Why it happens:** The Wake Lock API's auto-release-on-hide is invisible to consumer code unless they listen for the sentinel's `'release'` event.

**How to avoid:** Listen for `sentinel.addEventListener('release', ...)` and clear `sentinelRef.current` to null in the handler. Do NOT clear `wasAcquiredRef` in this listener — the consumer's intent is still "hold the lock," and `visibilitychange → visible` should re-acquire (D-03).

**Warning signs in tests:** A test that calls `request()`, simulates a `visibilitychange → hidden`, then asserts re-acquire on `visibilitychange → visible` would silently no-op if the hook reuses the released sentinel ref.

### Pitfall 2: Order of events on tab-hide is browser-dependent

**What goes wrong:** The W3C spec (section 11.3 page-visibility-change-steps + 11.5 release algorithm) defines that the `release` event on the sentinel is fired as part of the visibility-change processing, but **does not specify ordering relative to the `visibilitychange` event itself**. [VERIFIED: W3C spec read directly]. In practice this means a hook's `visibilitychange` listener may run BEFORE or AFTER the sentinel's `'release'` listener.

**Why it happens:** Implementations are free to interleave the two; spec only guarantees both fire on the hidden transition.

**How to avoid:** Make the re-acquire logic order-independent. Check `document.visibilityState === 'visible'` AND `wasAcquiredRef.current === true` AND `sentinelRef.current === null` — the third clause means "we don't already hold a fresh one." This works regardless of which listener ran first because:
- On `hidden`: the visibilitychange listener does nothing (state !== 'visible'); the release listener clears the ref.
- On `visible`: the visibilitychange listener checks all three and re-acquires; the release listener doesn't fire.

**Warning signs in tests:** Flaky tests that depend on event-firing order would surface this. Avoid asserting "release event fires before visibilitychange" — use the order-independent guards.

### Pitfall 3: `'wakeLock' in navigator` is true but `request()` rejects

**What goes wrong:** Older browsers may have `navigator.wakeLock` as an unimplemented stub that throws synchronously, OR may have it but reject with `NotAllowedError` on any actual call (e.g., insecure context, user disabled the feature, document not fully active). A naive feature-detect that assumes `'wakeLock' in navigator` means "API works" misses these cases.

**Why it happens:** Feature detection at the `in` level only checks property presence, not method liveness or browser permissions.

**How to avoid:** Wrap the `await navigator.wakeLock.request('screen')` in try/catch and treat ALL errors as silent fallback (D-09). Do NOT branch on `err.name` — the W3C spec says only `NotAllowedError` is the documented type, but in-the-wild older browsers may throw other types or even synchronously throw before the promise resolves. Generic catch is both correct and simplest.

**Warning signs:** A test that asserts a specific `err.name` would be brittle. Prefer "request resolves silently" or "wasAcquired is/isn't true after the call."

### Pitfall 4: TypeScript's non-optional `Navigator.wakeLock` typing

**What goes wrong:** `lib.dom.d.ts` declares `readonly wakeLock: WakeLock` on `Navigator` — non-optional. TypeScript will not warn at the call site if you forget the runtime feature-detect, but on iOS Safari <16.4 or Firefox <126, `navigator.wakeLock` is genuinely `undefined` at runtime and `navigator.wakeLock.request(...)` throws `TypeError: Cannot read property 'request' of undefined`.

**Why it happens:** TypeScript types model the spec, not the actual runtime support matrix.

**How to avoid:** Always check `'wakeLock' in navigator` (or `typeof navigator.wakeLock !== 'undefined'`) before the first call. The hook's `request()` does this in the first line. Do NOT trust the type system here.

**Warning signs:** Lint passes, types pass, then a real-device user hits a `TypeError` at console. The polyfill in `vitest.setup.ts` would mask this in tests if it's installed unconditionally; the project's existing pattern is to install conditionally (`if (typeof navigator !== 'undefined' && !('wakeLock' in navigator))`), so the test environment behaves like a "supported" browser by default. Failure-path tests must explicitly delete `navigator.wakeLock` to exercise the no-API branch.

### Pitfall 5: `request()` + `audioStart()` ordering inside `onStartClick`

**What goes wrong:** The existing `onStartClick` chain has a specific structure: `setAppPhase('lead-in') → setLeadInDigit(3) → const plan = ... → const firstInAudioTime = await audioStart(plan) → cancel-check → setTimeouts`. The Wake Lock request must be added without breaking the audio-anchor logic (which depends on the resolved `firstInAudioTime` from the awaited `audioStart`).

**Why it happens:** The audio path uses an `await` (because Audio Context creation is async), and the Wake Lock path is fire-and-forget. Putting Wake Lock between `setAppPhase` and `audioStart` is fine. Putting Wake Lock AFTER the `await` and BEFORE the cancel-check is fine. Putting it AFTER the cancel-check is also fine.

**How to avoid:** Place `void wakeLock.request()` immediately after `setLeadInDigit(3)` and BEFORE `const plan = createBreathingPlan(...)`. This:
1. Keeps Wake Lock acquisition as gesture-fresh as possible (D-01).
2. Doesn't depend on `plan` (Wake Lock takes no plan argument).
3. Is unaffected by the cancel-during-await race (the cancel branch will call `wakeLock.release()` separately, which is idempotent per D-08).
4. Doesn't change the audio anchor or the lead-in setTimeout chain.

**Warning signs:** Existing `App.audio.test.tsx` and `App.session.test.tsx` tests that count `setTimeout` calls or assert specific await-resolution ordering may need adjustment if the implementation accidentally changes the await chain. The recommended placement (before any await) preserves existing test contracts.

### Pitfall 6: Unmount cleanup race against in-flight `request()`

**What goes wrong:** `useAudioCues.ts` documents this exact race: "between `request()` being called and its promise resolving, the component unmounts; the resolved sentinel gets stored in a ref of an unmounted component, leaking until GC." The same race applies to Wake Lock.

**Why it happens:** `request()` is async; React's unmount cleanup fires synchronously.

**How to avoid:** In the unmount cleanup effect, synchronously read and null the sentinel ref. If a request was in-flight when the cleanup ran, store a "cancelled" flag (mirror the `useSessionEngine.ts:53-56` `cancelled` idiom) or check `sentinelRef.current !== null` AFTER the await. The project's `useAudioCues.ts:73-82` cleanup pattern is the canonical reference.

**Warning signs:** Test "unmount during request" would surface this. The hook unit test list (Validation Architecture below) includes this case explicitly.

## Code Examples

Verified patterns from official sources and existing project code.

### Feature detection + acquire (silent fallback)

```typescript
// Source: MDN https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
//         + project pattern from src/hooks/useAudioCues.ts:84-121 (try/catch swallow)
async function tryAcquireWakeLock(): Promise<WakeLockSentinel | null> {
  if (!('wakeLock' in navigator)) return null  // older browser
  try {
    return await navigator.wakeLock.request('screen')
  } catch {
    // D-09: NotAllowedError, SecurityError (insecure context),
    //       any synchronous throw from older stub. All silent.
    return null
  }
}
```

### Visibility re-acquire (canonical MDN pattern adapted to refs)

```typescript
// Source: MDN canonical visibility re-acquire pattern,
//         https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
//         + project two-ref refinement
useEffect(() => {
  const onVisibility = () => {
    if (document.visibilityState !== 'visible') return
    if (!wasAcquiredRef.current) return
    if (sentinelRef.current !== null) return  // already re-acquired
    void request()  // silent fallback inside request handles all errors
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => document.removeEventListener('visibilitychange', onVisibility)
}, [request])
```

### Sentinel `'release'` listener (clear ref uniformly)

```typescript
// Source: MDN https://developer.mozilla.org/en-US/docs/Web/API/WakeLockSentinel
//         + project pattern (use addEventListener, not onrelease, for symmetry
//           with project-wide event-listener convention)
sentinel.addEventListener('release', () => {
  if (sentinelRef.current === sentinel) {
    sentinelRef.current = null
    // Do NOT clear wasAcquiredRef — D-04 keeps it for visibility re-acquire.
  }
})
```

### App.tsx integration (three sites)

```typescript
// Site 1 — onStartClick lead-in branch (parallel with audioStart, D-01).
// Add immediately after setLeadInDigit(3), before any await.
setAppPhase('lead-in')
setLeadInDigit(3)
void wakeLock.request()  // NEW — fire-and-forget per D-02

const plan = createBreathingPlan(state.selectedSettings)
planRef.current = plan
const firstInAudioTime = await audioStart(plan)  // existing
// ... rest of existing onStartClick body ...

// Site 2 — onStartClick cancel-during-lead-in branch (parallel with audioStop).
if (appPhase === 'lead-in') {
  startGenerationRef.current += 1
  clearLeadInTimeouts()
  setLeadInDigit(null)
  setAppPhase('idle')
  audioAnchorRef.current = null
  planRef.current = null
  void audioStop()
  void wakeLock.release()  // NEW — idempotent per D-08
  return
}

// Site 3 — state.status !== 'running' cleanup effect (parallel with audioStop).
useEffect(() => {
  if (state.status !== 'running') {
    void audioStop()
    void wakeLock.release()  // NEW — D-07 single-write site for release
    setAppPhase('idle')
    // ... existing cleanup body ...
  }
}, [state, audioStop, /* wakeLock.release stable identity */, clearLeadInTimeouts])
```

Note: like `audioStop`, the planner should hoist `wakeLock.release` to a stable local before the effect's dep array (the hook returns a fresh object each render but the methods themselves are `useCallback([])` stable — see `App.tsx:120-122` for the existing precedent).

### Vitest polyfill (extend existing `vitest.setup.ts`)

```typescript
// Source: project polyfill convention from vitest.setup.ts:126-200
//         (AudioContext) + vitest.setup.ts:29-81 (Storage with Object.defineProperty)
// Append AFTER the AudioContext block.

if (typeof navigator !== 'undefined' && !('wakeLock' in navigator)) {
  class FakeWakeLockSentinel extends EventTarget {
    type: WakeLockType = 'screen'
    released = false
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null = null

    async release(): Promise<void> {
      if (this.released) return
      this.released = true
      const event = new Event('release')
      if (this.onrelease) this.onrelease.call(this as unknown as WakeLockSentinel, event)
      this.dispatchEvent(event)
    }
  }

  Object.defineProperty(navigator, 'wakeLock', {
    writable: true,
    configurable: true,  // allow per-test override
    value: {
      request: vi.fn(async (_type?: WakeLockType) => new FakeWakeLockSentinel()),
    },
  })
}
```

### Hook unit test scaffolding (mirrors `useAudioCues.test.tsx`)

```typescript
// Source: project pattern from src/hooks/useAudioCues.test.tsx
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './useWakeLock'

describe('useWakeLock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('request() acquires a sentinel when API is supported', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { result, unmount } = renderHook(() => useWakeLock())
    await act(async () => { await result.current.request() })
    expect(requestSpy).toHaveBeenCalledWith('screen')
    unmount()
  })

  it('request() silently absorbs NotAllowedError', async () => {
    vi.spyOn(navigator.wakeLock, 'request').mockRejectedValueOnce(
      new DOMException('blocked', 'NotAllowedError'),
    )
    const { result, unmount } = renderHook(() => useWakeLock())
    await expect(act(async () => { await result.current.request() })).resolves.toBeUndefined()
    unmount()
  })

  it('release() is idempotent when no sentinel is held', async () => {
    const { result, unmount } = renderHook(() => useWakeLock())
    await expect(act(async () => { await result.current.release() })).resolves.toBeUndefined()
    unmount()
  })

  // ... more tests below in Validation Architecture ...
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `nosleep.js` hidden-video shim for iOS Safari <16.4 | Native `navigator.wakeLock.request('screen')` | iOS Safari 16.4 (2023-03), all major browsers shipped by 2025-Q1 | Phase 5 can rely on native API in modern browsers. <1% of mobile users on unsupported browsers will silently fall back (D-09). |
| `@types/dom-screen-wake-lock` userland TypeScript types | Native bundled `lib.dom.d.ts` types | TypeScript started including types via DOM lib generator several major versions ago; verified present in TS 6.0.2 (this project's version) | No external types package needed. No augmentation required. |
| `onrelease` event-handler property | `addEventListener('release', ...)` | Both supported by spec; project convention prefers addEventListener for symmetry | Cleaner unregistration story; consistent with rest of codebase. |
| Single-ref tracking (sentinel doubles as "acquired" flag) | Two-ref tracking (sentinel + wasAcquired) | This project's adaptation, motivated by the visibility-re-acquire case where sentinel is null but consumer's intent is still "hold" | Correct re-acquire behavior across tab-hide cycles. |

**Deprecated/outdated:**
- **`@types/dom-screen-wake-lock` package.** Verified that TypeScript 6.0.2 (`/Users/lucindo/Code/hrv/node_modules/typescript/lib/lib.dom.d.ts`) ships `WakeLock`, `WakeLockSentinel`, `WakeLockType`, and `Navigator.wakeLock` natively. Do NOT add the package.
- **`navigator.wakeLock` as optional in TS types.** Old userland shims declared it as optional; the bundled lib declares it non-optional. Runtime feature-detection is still required (Pitfall 4) — TS types are aspirational.
- **iOS Safari Wake Lock as PWA-only.** WebKit bug 254545 (filed 2023, resolved iOS 18.4 / 2025-03) restricted PWA-mode Wake Lock to Safari-browser-mode. Since v1 is explicitly NOT a PWA, this bug never affected this project. By 2026 the bug is fully resolved on current iOS.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `'release'` event on `WakeLockSentinel` fires reliably when the OS auto-releases on tab-hide. | Pattern 1, Pitfall 1 | If the event does not fire on some browser, `sentinelRef.current` stays pointing to a released sentinel. Mitigation: the visibility re-acquire path also checks `sentinelRef.current === null` AND `wasAcquiredRef.current === true` — but a stale-non-null sentinel would block re-acquire. The fallback is the unmount cleanup, which fires on session-end via `release()`. Actual user-visible impact: re-acquire after tab-hide may not work on a non-conforming browser. Real-device QA on iOS Safari 16.4+ and Chrome Android catches this. [VERIFIED via MDN: "Fires when the wake lock is released for any reason" on `WakeLockSentinel` event-name documentation, and W3C spec section 11.5 release algorithm dispatches the event — but precise ordering vs visibilitychange is not spec'd, hence the order-independent guards in Pattern 1.] |
| A2 | The `'release'` event handler runs before any subsequent `request()` call resolves on the same tab. | Pitfall 2 | If a freshly-requested sentinel is stored in `sentinelRef`, then the OLD sentinel's release listener fires belatedly and clears the new sentinel — bug. The `if (sentinelRef.current === sentinel)` guard inside the release listener prevents this. Belt-and-braces. |
| A3 | `Object.defineProperty(navigator, 'wakeLock', ...)` works in jsdom 29.1.1 + Node 25.9.0. | Pattern 3 (polyfill) | If `navigator` is a frozen object in jsdom, the polyfill installation throws. Mitigation: the conditional guard (`!('wakeLock' in navigator)`) means we only attempt installation when needed; if jsdom freezes navigator, an alternative is `Object.defineProperty(window.navigator, ...)` or a `vi.stubGlobal` per-suite. The existing `Storage` polyfill installs methods on `Storage.prototype` (different surface, but the project has handled jsdom quirks before). Fallback: planner can switch to a per-test `vi.stubGlobal('navigator', { ...realNavigator, wakeLock: fakeWakeLock })` if defineProperty is rejected. |
| A4 | Existing `App.audio.test.tsx`, `App.persistence.test.tsx`, `App.session.test.tsx`, `App.dialog.test.tsx`, `App.settings.test.tsx` will pass unchanged after Phase 5 wiring is added. | Carry-forward integration risk | A test that asserts a specific call count or order in `onStartClick` could fail if Wake Lock acquisition is incorrectly threaded into the await chain. Mitigation: the recommended placement (`void wakeLock.request()` immediately after `setLeadInDigit(3)` and BEFORE the audio await) does not change the existing await chain, the `setTimeout` chain, or the `setState` order. The cleanup effect adds a parallel `wakeLock.release()` next to the existing `audioStop()` — same pattern Phase 4 used to add `recordSession`. Verified: the polyfill in `vitest.setup.ts` makes `navigator.wakeLock.request` a no-op-equivalent (returns a sentinel with a working `release()`), so existing tests that don't reference Wake Lock are not affected by the new code path being exercised. **VALIDATION: planner should run the full existing suite once after adding the polyfill (before adding any hook code) to confirm the polyfill itself is non-breaking.** |
| A5 | jsdom does not implement `navigator.wakeLock` natively as of jsdom 29.1.1. | Pattern 3 (polyfill) | If a future jsdom upgrade adds Wake Lock, the conditional `!('wakeLock' in navigator)` guard makes the polyfill a no-op — no harm. [VERIFIED: jsdom 29.1.1 changelogs do not mention Wake Lock; project also confirms no existing references to `wakeLock` in `src/`.] |

**Note:** Assumptions A1-A2 are about Wake Lock spec/implementation behavior that cannot be easily verified offline; they are mitigated by defensive code patterns (order-independent guards, `=== sentinel` checks). A3 is about test-environment plumbing and has a clear fallback. A4 is the highest-risk practical assumption for plan correctness — the planner should add an explicit "smoke-test existing suite after polyfill addition" task before adding hook code. A5 is verified.

## Open Questions

1. **Should the hook test file be `.tsx` or `.ts`?**
   - What we know: `useAudioCues.test.tsx` and `usePrefersReducedMotion.test.ts` both exist in the project — the audio one is `.tsx` (uses `renderHook` from `@testing-library/react`), the reduced-motion one is `.ts`. `useWakeLock` uses `renderHook` and may use JSX in test setup wrappers, so `.tsx` is the safer match.
   - What's unclear: whether any tests will need an actual `<App>` JSX render (only if planner chooses to add `App.wakeLock.test.tsx`).
   - Recommendation: `.tsx` for the hook test (mirrors `useAudioCues.test.tsx`).

2. **Should the visibility listener also handle `pageshow` / `pagehide` events for back-forward cache?**
   - What we know: Modern Chrome/Safari use bfcache aggressively. A page restored from bfcache fires `pageshow` (with `event.persisted === true`) but NOT necessarily `visibilitychange` if the tab was already foreground.
   - What's unclear: whether bfcache restore preserves the wake lock state (spec is silent; implementations vary).
   - Recommendation: Out of scope for v1. The phase boundary explicitly does not require bfcache resilience. If real-device QA finds a bfcache regression, treat as a v2 follow-up under MOBL-03 or similar. Document in Phase 5 manual UAT checklist.

3. **What happens during a Wake-Lock-active session if the user navigates to another tab and the OS sleeps the device for an hour?**
   - What we know: The OS releases the wake lock when tab is hidden (D-03 pre-condition). On return, the device is unlocked, the user un-hides our tab, `visibilitychange → visible` fires, and we re-acquire. Meanwhile the breathing session has continued ticking (rAF is throttled to ~1 Hz when hidden, but the underlying timing math is `performance.now()`-based and recovers on each frame — Phase 1 SESS-05).
   - What's unclear: A timed session may have completed during the hidden period — by the time the user comes back, `state.status === 'complete'` and the cleanup effect fires `wakeLock.release()`. If the visibility-listener re-acquired BEFORE the rAF caught up to the completion, there's a tiny window where `request()` runs and resolves while `state.status` transitions to `complete`. The `release()` from the cleanup effect runs idempotently afterward — net effect: brief no-op acquire then immediate release. Harmless.
   - Recommendation: No special handling. The two-ref pattern + idempotent release naturally covers the race. Document the tiny "acquire-then-immediate-release" window as expected behavior.

4. **Should `release()` await the sentinel's release Promise, or fire-and-forget?**
   - What we know: `useAudioCues.stop()` returns `Promise<void>` and IS awaited in some App-level paths via `void audioStop()`. The project pattern is to call `void` (fire-and-forget at call site) but have the method return a promise so test cases can await for assertion.
   - What's unclear: Whether returning `Promise<void>` vs `void` from `useWakeLock.release()` matters for any caller. CONTEXT marks the return-type choice as planner discretion.
   - Recommendation: Match `useAudioCues.stop()` exactly — `release(): Promise<void>` so tests can `await act(async () => { await result.current.release() })`. Call sites use `void wakeLock.release()` per existing audio convention.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Test runner, build | ✓ | v25.9.0 | — |
| TypeScript | Type-checking, build (`tsc -b`) | ✓ | ~6.0.2 | — (lib.dom.d.ts includes Wake Lock types) |
| React | Hook composition | ✓ | ^19.2.5 | — |
| Vitest | Test runner | ✓ | ^4.1.5 | — |
| jsdom | Test DOM environment | ✓ | ^29.1.1 | Wake Lock NOT implemented natively; polyfill in `vitest.setup.ts` (D-13). |
| Chrome / Safari iOS / Firefox / Samsung Internet (real devices for manual QA) | UAT validation of actual screen-on behavior | (planner discretion) | iOS 16.4+, Chrome 85+, Firefox 126+, Samsung Internet 14+ | Manual QA only — no automated test reaches real Wake Lock OS behavior. |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- jsdom does not implement `navigator.wakeLock`; mitigated by the polyfill in Pattern 3 (test-environment-only).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 + jsdom 29.1.1 |
| Config file | `vite.config.ts` (test config inlined; `setupFiles: './vitest.setup.ts'`) |
| Quick run command | `npm run test:run -- src/hooks/useWakeLock.test.tsx` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOBL-02 | `useWakeLock.request()` calls `navigator.wakeLock.request('screen')` exactly once when supported | unit (hook) | `npm run test:run -- src/hooks/useWakeLock.test.tsx -t "request acquires"` | ❌ Wave 0 |
| MOBL-02 | `useWakeLock.request()` silently absorbs absent `navigator.wakeLock` | unit (hook) | same file | ❌ Wave 0 |
| MOBL-02 | `useWakeLock.request()` silently absorbs `NotAllowedError` rejection | unit (hook) | same file | ❌ Wave 0 |
| MOBL-02 | `useWakeLock.release()` is idempotent when no sentinel held (D-08) | unit (hook) | same file | ❌ Wave 0 |
| MOBL-02 | `useWakeLock.release()` calls `sentinel.release()` once when held | unit (hook) | same file | ❌ Wave 0 |
| MOBL-02 | Sentinel's `'release'` event clears `sentinelRef` but NOT `wasAcquiredRef` (D-04) | unit (hook) — assert via post-event behavior of subsequent `request()` not being skipped | same file | ❌ Wave 0 |
| MOBL-02 | `visibilitychange` to `visible` re-requests when `wasAcquired === true` and no sentinel held | unit (hook) — fire `new Event('visibilitychange')` after `Object.defineProperty(document, 'visibilityState', ...)` | same file | ❌ Wave 0 |
| MOBL-02 | `visibilitychange` to `visible` does NOT re-request when `wasAcquired === false` (never acquired) | unit (hook) | same file | ❌ Wave 0 |
| MOBL-02 | `visibilitychange` re-acquire failure is silently absorbed; `wasAcquired` stays true (D-05) | unit (hook) | same file | ❌ Wave 0 |
| MOBL-02 | Unmount with sentinel held releases the sentinel (Pitfall 6 leak guard) | unit (hook) | same file | ❌ Wave 0 |
| MOBL-02 | App `onStartClick` triggers `wakeLock.request` once (Success Criterion 1) | integration (App) | `npm run test:run -- src/app/App.wakeLock.test.tsx -t "Start triggers request"` | ❌ Wave 0 (planner discretion: file exists or behavior is asserted in App.audio.test.tsx) |
| MOBL-02 | App on `state.status` transition out of `running` triggers `wakeLock.release` (Success Criterion 3, D-07) | integration (App) | same file | ❌ Wave 0 |
| MOBL-02 | App on `complete` transition triggers `wakeLock.release` (Success Criterion 3) | integration (App) | same file | ❌ Wave 0 |
| MOBL-02 | App on cancel-during-lead-in triggers `wakeLock.release` (D-07) | integration (App) | same file | ❌ Wave 0 |
| MOBL-02 | App on modal-confirm End triggers `wakeLock.release` | integration (App) | same file | ❌ Wave 0 |
| MOBL-02 | Silent fallback: App start succeeds with `navigator.wakeLock` deleted (no error reaches user) | integration (App) | same file | ❌ Wave 0 |
| MOBL-02 | **Actual screen stays awake on real iOS Safari 16.4+ during a 60-min session** (Success Criterion 2) | manual-only — no automated test reaches the OS auto-lock layer | n/a | ❌ Manual UAT plan |
| MOBL-02 | **Actual screen stays awake on real Android Chrome during a 60-min session** | manual-only | n/a | ❌ Manual UAT plan |
| MOBL-02 | **Phone-lock during session, then unlock — screen stays on after unlock** (D-03 re-acquire) | manual-only | n/a | ❌ Manual UAT plan |
| MOBL-02 | **No console errors / no user-visible artifact on Firefox <126 or any rejection path** (D-09) | manual-only on a downlevel browser, OR visual inspection on supported browser with feature force-disabled | n/a | ❌ Manual UAT plan |

### Sampling Rate

- **Per task commit:** `npm run test:run -- src/hooks/useWakeLock.test.tsx` (and `src/app/App.wakeLock.test.tsx` if added). ~1-2 seconds.
- **Per wave merge:** `npm run test:run` (full suite) — confirms Phase 1-4 tests still pass after Phase 5 wiring.
- **Phase gate:** Full suite green AND manual UAT checklist signed off before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/hooks/useWakeLock.ts` — the hook itself (does not exist yet)
- [ ] `src/hooks/useWakeLock.test.tsx` — covers MOBL-02 hook-level requirements above
- [ ] `src/app/App.wakeLock.test.tsx` — covers MOBL-02 App-integration requirements above (planner discretion: could fold into `App.audio.test.tsx` extension since the integration sites overlap; recommend SEPARATE file for diff-locality)
- [ ] `vitest.setup.ts` — extend with `navigator.wakeLock` polyfill (D-13)
- [ ] **Smoke test existing suite after polyfill is added but BEFORE hook code** — A4 risk mitigation. Add the polyfill in isolation, run `npm run test:run`, confirm 0 regressions, then add the hook + integration code. This catches Pitfall 4 / A3 / A4 in the cheapest possible way.
- [ ] No framework install needed (Vitest, RTL, jsdom already present).

### Browser-Specific Holes (silent fallback, D-09)

The following behaviors **cannot be verified by automated tests** and require manual mobile QA:

1. **Actual screen stays awake on supported browsers.** Vitest + jsdom has no display, no auto-lock, and the polyfill is a stub — the only way to verify the OS does not auto-lock the screen is to run the app on a real iOS Safari 16.4+ device and Chrome Android device for the full session length.
2. **iOS Safari version-specific behavior.** Browser-specific quirks (low-power mode interactions, Focus mode, audio-keepalive subtleties) cannot be exercised in jsdom. The Phase 3 audio cues run through `OscillatorNode` which is a polyfilled stub in tests; on real iOS the audio context and wake lock both interact with the OS audio session, but neither is reliably exercised offline.
3. **Visibility re-acquire correctness.** Tests can fire a synthetic `visibilitychange` event, but only on a real device can we verify that the OS-level lock release on tab-hide and the OS-level re-acquire on tab-show actually keep the screen awake post-unlock.
4. **Firefox-without-flag fallback.** Forcing `navigator.wakeLock` to undefined in tests verifies the silent-fallback code path; verifying that a real Firefox instance with `dom.screenwakelock.enabled=false` shows no console warnings and no user-visible artifact requires manual QA on a real Firefox build with the flag toggled.
5. **Battery-low / Power-saver-on rejection.** The browser may revoke a granted lock when the battery drops below a threshold. Test environment cannot simulate this; manual QA on a depleted device is the only verification.

**Acceptable to leave unverified in v1:** Items 4 and 5. Item 4 is an acknowledged silent-fallback case (D-09 / D-10 / MOBL-03 deferred). Item 5 is rare and the hook's behavior is "lock revoked → silently absorbed" which is the same code path as any other rejection; we trust the unit test of the rejection handler.

**Manual UAT checklist (recommended, planner-owned):**
- [ ] iOS Safari 16.4+ on real device: Start a 10-min timed session, leave phone face-up untouched, confirm screen does not auto-lock for the full 10 min.
- [ ] iOS Safari 16.4+: Start a session, lock the phone manually, wait 30s, unlock, confirm screen stays awake for the rest of the session.
- [ ] Android Chrome on real device: Same two scenarios as iOS.
- [ ] Desktop Firefox 126+: Start a session, confirm no console errors; screen-saver behavior is platform-specific but the API call should succeed (visible via DevTools `navigator.wakeLock`).
- [ ] Android Chrome with battery <20%: Start a session, observe whether the lock is granted or rejected; if rejected, confirm no user-visible artifact.
- [ ] Visual confirmation: NO Wake-Lock-related UI appears anywhere (D-10 / D-12).

## Project Constraints (from CLAUDE.md)

The user's `~/.claude/CLAUDE.md` is global (`@RTK.md` token-saving CLI hook) and not project-specific. There is **no `./CLAUDE.md` in `/Users/lucindo/Code/hrv/`** — verified by ls. The project skills directories (`.claude/skills/`, `.agents/skills/`) also do not exist in this repo.

The actionable project constraints come from `.planning/PROJECT.md`:

- **No medical/therapeutic/diagnostic claims** — Phase 5 ships zero copy, so this is structurally satisfied (no UI surface).
- **Local-only / no backend / no accounts** — Wake Lock is a per-document browser API, no network, no persistence. Satisfied.
- **No PWA / offline / installability** — Phase 5 does NOT touch the manifest, service worker, or any PWA surface. The Wake Lock API works in plain web context. Satisfied.
- **No Forrest protected assets** — Phase 5 ships no assets. Satisfied.
- **Web-first / responsive across mobile and desktop** — This is exactly what MOBL-02 + Phase 5 supports.
- **Calm tone / no distractions** — Phase 5 ships zero UI; calm by absence.
- **Tailwind v4 + theme tokens baseline** — No styling changes in Phase 5.
- **44×44 hit-area floor** — N/A; no new tappable surfaces.

## Sources

### Primary (HIGH confidence)
- MDN — `Screen Wake Lock API` overview: <https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API>
- MDN — `WakeLockSentinel` interface: <https://developer.mozilla.org/en-US/docs/Web/API/WakeLockSentinel>
- MDN — `WakeLock: request()` method: <https://developer.mozilla.org/en-US/docs/Web/API/WakeLock/request>
- W3C Recommendation — Screen Wake Lock API spec: <https://www.w3.org/TR/screen-wake-lock/>
- web.dev — Stay awake with the Screen Wake Lock API: <https://developer.chrome.com/docs/capabilities/web-apis/wake-lock>
- caniuse — Screen Wake Lock API support table: <https://caniuse.com/wake-lock>
- web.dev — Screen Wake Lock now supported in all browsers: <https://web.dev/blog/screen-wake-lock-supported-in-all-browsers>
- TypeScript bundled `lib.dom.d.ts` (this project's `node_modules/typescript/lib/lib.dom.d.ts`) — verified via grep, 2026-05-10
- Project source `/Users/lucindo/Code/hrv/src/hooks/useAudioCues.ts` — structural template for Phase 5 hook (D-11)
- Project source `/Users/lucindo/Code/hrv/src/hooks/useSessionEngine.ts` — `state.status` discriminated union read by App-level effect
- Project source `/Users/lucindo/Code/hrv/src/app/App.tsx` — composition site (lines 165-230, 308-343, 394-398)
- Project source `/Users/lucindo/Code/hrv/vitest.setup.ts` — polyfill convention for jsdom-missing APIs

### Secondary (MEDIUM confidence)
- WebKit bug 254545 (iOS PWA Wake Lock) — resolved iOS 18.4 / 2025-03: <https://bugs.webkit.org/show_bug.cgi?id=254545>. Relevant only to confirm the issue does NOT affect this project (project is non-PWA web).
- mikeesto/use-wake-lock community React hook: <https://github.com/mikeesto/use-wake-lock>. Reviewed for ecosystem precedent only — not used as dependency (CONTEXT defers third-party shims).
- TypeScript issue #40534 (request to add Wake Lock types to lib.dom.d.ts): <https://github.com/microsoft/TypeScript/issues/40534>. Used to confirm the historical context; current TS 6.0.2 has the types.

### Tertiary (LOW confidence)
- General community blog posts about Vitest + jsdom Wake Lock mocking — referenced for pattern confirmation but the project's existing `vitest.setup.ts` polyfill convention is the authoritative seam.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — native Wake Lock API verified via MDN, W3C spec, caniuse, and direct grep against bundled `lib.dom.d.ts`. Zero new dependencies.
- Architecture: **HIGH** — the hook pattern is a near-identical (and simpler) variant of the verified `useAudioCues` pattern already in the codebase. Three integration sites in `App.tsx` are explicitly identified by file location and line range from CONTEXT and verified against the actual `App.tsx` source.
- Pitfalls: **HIGH** — Pitfalls 1-6 are derived from spec language, project source, and well-documented browser behavior. The two `[ASSUMED]` items (A1, A2 about exact event ordering) are mitigated by order-independent guard patterns and clearly logged in the Assumptions Log.
- Validation Architecture: **HIGH** — test framework, polyfill seam, and per-requirement test mapping all derive from existing project precedent (`useAudioCues.test.tsx`, `App.audio.test.tsx`, `App.persistence.test.tsx` patterns are all read and applicable).

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days for stable browser API + ~zero-risk hook pattern). Re-research if: a TypeScript major upgrade changes lib.dom.d.ts type signatures; OR jsdom adds native Wake Lock support; OR a browser ships breaking changes to the Wake Lock auto-release-on-hide semantics (none expected — API is W3C Recommendation).
