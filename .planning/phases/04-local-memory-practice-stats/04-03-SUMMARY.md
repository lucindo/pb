---
phase: 04-local-memory-practice-stats
plan: "03"
subsystem: app-wiring
tags:
  - integration
  - app-wiring
  - react-hooks
  - localStorage
  - session-lifecycle
  - tdd
dependency_graph:
  requires:
    - "04-01 (storage module — loadSettings/saveSettings/loadMute/saveMute/loadStats/recordSession/resetStats)"
    - "04-02 (StatsFooter + ResetStatsDialog components)"
  provides:
    - "App.tsx: Phase 4 persistence wired at all four seams (mount restore, persisted setters, single-site stats, reset dialog)"
    - "useAudioCues: optional initialMuted parameter for persisted mute restore"
    - "App.persistence.test.tsx: 16-test integration suite covering LOCL-01/02/03"
  affects:
    - "End-to-end: users see their settings/mute/stats restored on every app load"
tech_stack:
  added: []
  patterns:
    - "useMemo([]) for synchronous mount-time storage reads (loadSettings/loadMute/loadStats)"
    - "Wrapped setters pattern (persistedSetSettings/persistedSetMuted) for save-on-change"
    - "runningSnapshotRef + recordedSessionKeyRef: single write site + idempotency guard (Pitfall 1)"
    - "Snapshot-update effect + cleanup effect augmentation: discriminated-union-safe elapsed computation"
    - "Global beforeEach localStorage.clear() in vitest.setup.ts for test isolation"
key_files:
  created:
    - src/app/App.persistence.test.tsx
  modified:
    - src/hooks/useAudioCues.ts
    - src/app/App.tsx
    - vitest.setup.ts
decisions:
  - "Used fireEvent instead of userEvent in persistence tests — same pattern as App.session.test.tsx to avoid fake-timer hang with async onStartClick"
  - "Added global localStorage.clear() to vitest.setup.ts beforeEach — prevents mute/settings cross-contamination between tests (Rule 1 isolation fix)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-10"
  tasks_completed: 3
  files_created: 1
  files_modified: 3
  tests_added: 16
  tests_total: 259
---

# Phase 4 Plan 03: App Wiring (Persistence Integration) Summary

**One-liner:** Phase 4 persistence wired into App.tsx at four seams — mount restore via useMemo, save-on-change via wrapped setters, single-site stats write via augmented cleanup effect, reset via dialog — plus 16-test integration suite covering all LOCL-01/02/03 requirements and Pitfall 1/2 guards.

## What Was Built

### Files Modified

#### src/hooks/useAudioCues.ts

**Two targeted changes only:**

1. Function signature: `export function useAudioCues(initialMuted?: boolean): UseAudioCues`
2. Initial muted state: `useState<boolean>(initialMuted ?? false)` (was `useState<boolean>(false) // D-07`)
3. Header comment updated to describe Phase 4 D-14 / LOCL-01 integration seam

No other lines modified. Default behavior preserved when called with no argument.

#### src/app/App.tsx

**New imports (top):** `StatsFooter`, `ResetStatsDialog`, all storage functions (`loadSettings`, `saveSettings`, `loadMute`, `saveMute`, `loadStats`, `recordSession`, `resetStats`, `PersistedStats`), `SessionSettings` type.

**Mount restore (top of App() body):**
- `useMemo(() => loadSettings(), [])` → `initialSettings` passed to `useSessionEngine(initialSettings)`
- `useMemo(() => loadMute(), [])` → `initialMute` passed to `useAudioCues(initialMute)`
- `useState(() => loadStats())` → `stats` React state for StatsFooter rendering
- `useState(false)` → `resetDialogOpen` for ResetStatsDialog

**Persisted setters (after audio hoisting):**
- `persistedSetSettings`: calls `session.setSelectedSettings(next)` then `saveSettings(next)`
- `persistedSetMuted`: calls `audio.setMuted(next)` then `saveMute(next)`
- Wired to `SettingsForm onChange` and `SessionControls onMuteToggle`

**Snapshot refs (after lastBoundaryKeyRef):**
- `runningSnapshotRef`: captures `key`, `startedAtMs`, `lastElapsedMs` each render while running
- `recordedSessionKeyRef`: idempotency guard keyed on `startedAtMs` (prevents Pitfall 1 double-write)

**Snapshot-update effect (before cleanup effect):**
- Fires when `state.status === 'running'` and populates `runningSnapshotRef.current`
- TypeScript discriminated-union narrowing provides type-safe access to `state.startedAtMs` and `state.lastFrame.elapsedMs`

**Augmented cleanup effect:**
- Dependency array changed from `[state.status, ...]` to `[state, ...]` (required for accessing `state.completedAtMs` inside the `isComplete` branch)
- Single write site: `const snap = runningSnapshotRef.current; if (snap !== null && recordedSessionKeyRef.current !== snap.key) { ... }`
- For `complete`: `elapsedMs = state.completedAtMs - snap.startedAtMs` (sample-accurate)
- For `idle` (manual End): `elapsedMs = snap.lastElapsedMs` (last rAF tick, <16ms stale)
- Snap-null guard naturally handles cancel-during-lead-in (D-03) — runningSnapshotRef never populated
- After write: `runningSnapshotRef.current = null`

**Reset callbacks:**
- `onResetClick`: `setResetDialogOpen(true)`
- `confirmReset`: `resetStats()` then `setStats(loadStats())` then `setResetDialogOpen(false)`
- `cancelReset`: `setResetDialogOpen(false)`

**Render additions:**
- `{!inSessionView && stats.totalSessions > 0 && <StatsFooter stats={stats} onResetClick={onResetClick} />}` — after main card closing `</div>`, inside `<section>`
- `<ResetStatsDialog open={resetDialogOpen} onConfirm={confirmReset} onCancel={cancelReset} />` — sibling of `<EndSessionDialog>` inside `<main>`

**INVARIANTS PRESERVED:**
- Cancel-during-lead-in branch (lines 165-178): byte-identical, no storage calls
- `requestEnd` body: byte-identical
- `confirmEnd` body: byte-identical
- `cancelEnd` body: byte-identical
- `EndSessionDialog` props: byte-identical (Phase 2 contract frozen, R-06)

#### vitest.setup.ts

**Rule 1 fix — test isolation:** Added global `beforeEach(() => window.localStorage.clear())`. Without this, `saveMute(true)` in one test bled into the next test's `useAudioCues(initialMute)` mount, causing `aria-pressed="false"` assertion failures in `App.audio.test.tsx` (Test 14) and other cross-test contamination.

### Files Created

#### src/app/App.persistence.test.tsx (16 tests)

Uses `fireEvent` throughout instead of `userEvent` — same pattern as `App.session.test.tsx` which documents that `userEvent + vi.useFakeTimers()` hangs with the async `onStartClick` handler.

| Test | Requirement | Decision/Pitfall |
|------|-------------|-----------------|
| Restores persisted settings (bpm, ratio, durationMinutes) | LOCL-01 | D-15 |
| Restores persisted mute=true | LOCL-01 | D-14 |
| Falls back to defaults when nothing stored | LOCL-01 | D-07, D-15 |
| Persists mute toggle to localStorage | LOCL-01 | D-14 |
| Persists settings change via stepper interaction | LOCL-01 | — |
| Records session on timed completion | LOCL-02 | D-01 (completion bypass) |
| Records session on manual End >=30s | LOCL-02 | D-04, D-01 |
| Does NOT record sub-30s manual End | LOCL-02 | D-01 threshold |
| Does NOT record cancel-during-lead-in | LOCL-02 | D-03, Pitfall 2 |
| Does NOT double-write (Pitfall 1) | LOCL-02 | Pitfall 1 |
| Hides footer when totalSessions=0 | LOCL-02 | D-09 |
| Shows footer when totalSessions>0 | LOCL-02 | D-09 |
| Hides footer during inSessionView | LOCL-02 | D-10 |
| Reset opens confirmation dialog | LOCL-03 | D-12 |
| Confirming Reset wipes stats, preserves settings+mute | LOCL-03 | D-11, D-12 |
| Cancelling (Keep) leaves stats untouched | LOCL-03 | D-12 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] localStorage cross-contamination between tests**

- **Found during:** Task 2 — running existing App.audio.test.tsx after wiring persistence into App.tsx
- **Issue:** `saveMute(true)` in Test 13 (idle mute toggle) persisted to localStorage. Test 14 (running session mute toggle) then rendered App, restored `mute: true` from localStorage, and expected `aria-pressed="false"` initially — which failed. The audio test's `afterEach` never cleared localStorage because it was written before persistence existed.
- **Fix:** Added a global `beforeEach(() => window.localStorage.clear())` to `vitest.setup.ts`. Storage-specific tests that need pre-seeded data call `localStorage.setItem()` in their own test body (before rendering), which runs after the global clear.
- **Files modified:** `vitest.setup.ts`
- **Commit:** `cb72cda`

**2. [Rule 1 - Bug] userEvent + fake timers causes test timeouts**

- **Found during:** Task 3 — initial test run of App.persistence.test.tsx
- **Issue:** Tests using `userEvent.setup({ advanceTimers })` hung for 5+ seconds and timed out when combined with `vi.useFakeTimers()` and the async `onStartClick` handler. The root cause is documented in `App.session.test.tsx` which switched from userEvent to fireEvent for the same reason.
- **Fix:** Rewrote all persistence tests to use `fireEvent.click(...)` followed by `await act(async () => { await Promise.resolve() })` for microtask flushing. No behavior change — assertions are unchanged.
- **Files modified:** `src/app/App.persistence.test.tsx`
- **Commit:** `67d8b87`

## Test Coverage Summary

| Full suite | Tests | Result |
|-----------|-------|--------|
| App.persistence.test.tsx | 16 | PASS |
| All 22 test files | 259 | PASS |

TypeScript: `npx tsc --noEmit` exits 0.

## Known Stubs

None. All persistence seams are fully wired with real storage calls. No hardcoded empty values, TODO markers, or placeholder returns in the new/modified files.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The threat model entries T-04-10 through T-04-14 from the plan's threat register are all mitigated:

- **T-04-10** (Tampering — restored settings): flows through `coerceSettings`/`coerceMute` (Plan 01 upstream). Verified by Test 3 ("falls back to defaults when nothing stored").
- **T-04-11** (Double-write): `recordedSessionKeyRef` idempotency guard. Verified by Test 10 ("does NOT double-write").
- **T-04-12** (Cancel-during-lead-in phantom record): `runningSnapshotRef` snap-null guard. Verified by Test 9 ("does NOT record on cancel-during-lead-in").
- **T-04-13** (Storage failure surfacing): accepted — silent-fallback posture from D-16/D-17 (Plan 01) absorbs read/write failures.
- **T-04-14** (initialMuted arbitrary bool): typed `boolean | undefined` with `?? false` fallback. No injection surface.

## Self-Check: PASSED

Files created/modified:
- `src/hooks/useAudioCues.ts` — FOUND, modified (2 functional lines + header comment)
- `src/app/App.tsx` — FOUND, modified (4 import blocks, 6 state vars, 2 refs, 3 effects augmented, 2 wrapped setters, 3 callbacks, 2 render additions)
- `src/app/App.persistence.test.tsx` — FOUND, 16 tests
- `vitest.setup.ts` — FOUND, global beforeEach localStorage.clear() added

Commits:
- `c62184a` — feat(04-03): add optional initialMuted parameter to useAudioCues (Task 1)
- `cb72cda` — feat(04-03): wire Phase 4 persistence into App.tsx (Task 2)
- `67d8b87` — test(04-03): add App.persistence.test.tsx integration suite (Task 3)
