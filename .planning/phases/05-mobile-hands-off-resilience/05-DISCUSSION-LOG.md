# Phase 5: Mobile Hands-Off Resilience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 05-mobile-hands-off-resilience
**Areas discussed:** Acquisition timing, Visibility re-acquisition, Release triggers + 'reset' meaning, Module shape + state exposure

---

## Acquisition Timing

| Option | Description | Selected |
|--------|-------------|----------|
| At Start click, parallel with AudioContext | Inside onStartClick during lead-in, mirrors audioStart() pattern. User-gesture-fresh, browsers tend to be permissive here. If lead-in is cancelled, release. Visual countdown already running = screen 'should' stay awake before t=0 too. | ✓ |
| At t=0 (running phase begins) | Inside the same setTimeout that calls session.start(). Tighter scope (only awake during real running), but loses the user-gesture freshness — some browsers reject Wake Lock outside a click handler. Lead-in is short (~3s) so the gap is small. | |
| On idle screen and persist always | Acquire whenever app is loaded. Out of pattern with progressive enhancement; user did not ask for permanent screen awake. Likely rejected. | |

**User's choice:** At Start click, parallel with AudioContext
**Notes:** Matches Phase 3 D-09 (AudioContext gesture-fresh window). Avoids 3-second blank-screen window during lead-in on aggressive auto-lock devices.

---

## Visibility Re-Acquisition

| Option | Description | Selected |
|--------|-------------|----------|
| Auto re-acquire while session still running | Listen on document visibilitychange. If tab visible AND state.status==='running' AND lock was previously held, request again. Keeps hands-off promise across phone-lock/unlock cycles — the typical mobile flow. | ✓ |
| One-shot only | Acquire once at Start, release on end. If user backgrounds the tab and returns mid-session, the screen stays subject to OS auto-lock. Simpler implementation, but breaks the 'hands-off' goal during natural mobile usage. | |

**User's choice:** Auto re-acquire while session still running
**Notes:** The Wake Lock API auto-releases when tab is hidden (browser-mandated, non-overridable). Without re-acquire the typical mobile usage pattern (start → pocket → unlock → return) breaks the hands-off promise.

---

## Release Triggers + 'Reset' Meaning

| Option | Description | Selected |
|--------|-------------|----------|
| Synonym for ending mid-session | 'Reset' = same as End: manual End, modal-confirm End. v1 has no pause/resume (SESS-06 is v2) and no 'restart' button — so 'reset' in this context is just another word for early termination. ResetStats is unrelated (only available outside session view). | ✓ |
| Lead-in cancel counts as 'reset' | User clicked Start during 3-2-1 to bail. Wake Lock was acquired in lead-in (per prior decision) so it must release here regardless of label. | |
| Both — any path that exits session view should release | Covers: manual End, modal-confirm End, complete, lead-in cancel, unmount. Single rule: when state.status leaves 'running' OR appPhase leaves 'lead-in' without entering 'running', release. | |

**User's choice:** Synonym for ending mid-session
**Notes:** Decision is interpretive (what does ROADMAP "reset" mean), not behavioral. Even though only the synonym answer was selected, the lead-in cancel and unmount paths still require release because the lock was acquired during lead-in (D-01). Captured in CONTEXT.md D-07 as a single rule covering all exit paths — the alternatives differed in how to label the rule, not in what code to write.

---

## Module Shape

| Option | Description | Selected |
|--------|-------------|----------|
| useWakeLock hook | src/hooks/useWakeLock.ts. Mirrors useAudioCues shape: imperative request()/release() exposed, internal sentinel ref, optional muted-equivalent state. App.tsx calls request() inside onStartClick and release() in the existing 'state.status !== running' cleanup effect. Best fit for the codebase's hook precedent. | ✓ |
| Plain module + manual wiring in App.tsx | src/wakeLock/index.ts with request/release exports + module-level sentinel. App.tsx calls directly without React state. Simpler, but loses the visibilitychange listener lifecycle that a hook would manage with useEffect cleanup. | |
| Inline in App.tsx | Direct navigator.wakeLock calls in onStartClick/cleanup effect. Smallest diff, but App.tsx already large; visibilitychange handling would clutter further. | |

**User's choice:** useWakeLock hook
**Notes:** Matches the existing imperative-resource hook precedent (useAudioCues, useSessionEngine). Gives the visibility listener a natural unmount-cleanup home.

---

## State Exposure

| Option | Description | Selected |
|--------|-------------|----------|
| Fully internal — no UI surface | Matches Phase 3 D-10 / Phase 4 D-16 silent-fallback posture. Hook's return signature contains only imperative methods (request/release). No banner, no icon, no console-visible toast. MOBL-03 (fallback explanation) is v2. | ✓ |
| Expose acquired boolean for future use | Hook returns { request, release, isAcquired }. Nothing wired to UI in Phase 5, but a future indicator (e.g. dev-only debug, v2 MOBL-03) can read it without re-plumbing. | |
| Expose full status (acquired / unsupported / denied / hidden) | Richer state. Useful for v2, but YAGNI for v1 — silent-fallback means no consumer. | |

**User's choice:** Fully internal — no UI surface
**Notes:** YAGNI — no consumer in Phase 5. v2 MOBL-03 can re-plumb the return type without breaking existing callers.

---

## Claude's Discretion

- Exact internal state shape inside the hook (single sentinel ref vs separate flags vs reducer).
- `request()` return type (`Promise<void>` vs `Promise<boolean>`).
- Whether to listen for the sentinel's own `'release'` event in addition to `visibilitychange`.
- Whether `console.debug` lines are added in the failure paths.
- Whether the visibility listener uses `document.visibilityState === 'visible'` or `!document.hidden`.
- Module file organisation (hook file alone vs hook + helper utility).

## Deferred Ideas

- User-visible Wake Lock fallback explanation (v2 MOBL-03).
- Pause/resume with Wake Lock retained (v2 SESS-06).
- Wake Lock state indicator (icon, dev-only debug panel) — deferred per D-12.
- User preference to disable Wake Lock — not requested, not in MOBL-02.
- Battery-aware acquisition — overlap with OS behavior, brittle.
- Persisted Wake Lock preference — implies a UI toggle, out of MOBL-02.
- PWA / offline / installability — out of scope (PWA-01 is v2).
- iOS Safari <16.4 polyfill (e.g. nosleep.js) — conflicts with calm tone, third-party asset.
