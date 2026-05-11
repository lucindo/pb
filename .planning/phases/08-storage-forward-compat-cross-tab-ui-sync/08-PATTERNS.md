# Phase 8: Storage Forward-Compat & Cross-Tab UI Sync — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 5 (storage.ts, storage.test.ts, stats.ts, App.tsx, App.persistence.test.tsx)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/storage/storage.ts` | adapter | CRUD (read + write) | `src/storage/storage.ts` itself | exact — self-modification |
| `src/storage/storage.test.ts` | test | CRUD unit tests | `src/storage/storage.test.ts` itself | exact — self-modification |
| `src/storage/stats.ts` | service | CRUD | `src/storage/stats.ts` itself | exact — comment-only touch |
| `src/app/App.tsx` | component / root | event-driven (storage event) | `src/app/App.tsx` itself + `src/hooks/useAudioCues.ts` / `src/hooks/useWakeLock.ts` for the addEventListener pattern | exact |
| `src/app/App.persistence.test.tsx` | test | integration (React + StorageEvent) | `src/app/App.persistence.test.tsx` itself | exact — self-modification |

---

## Pattern Assignments

### `src/storage/storage.ts` — STORAGE-01 (`readEnvelope`) + STORAGE-02 (`writeEnvelope`) + `Envelope` interface

**Analog:** The file itself. All patterns copied from existing code in the same file.

**Existing `Envelope` interface** (lines 43–48):
```typescript
export interface Envelope {
  version: typeof STATE_VERSION   // <-- WIDEN to: version: number
  settings?: unknown
  mute?: unknown
  stats?: unknown
}
```
WIDEN `version: typeof STATE_VERSION` to `version: number`. `EMPTY_ENVELOPE` (line 50) is unchanged — `STATE_VERSION` (value `1 as const`) satisfies `number`.

**Existing `readEnvelope` — CR-01 pick-only pattern to REPLACE** (lines 52–79):
```typescript
export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // CR-01 pattern being REPLACED:
      const p = parsed as Record<string, unknown>
      return {
        version: STATE_VERSION,   // <- overwrites disk version unconditionally
        settings: p.settings,
        mute: p.mute,
        stats: p.stats,
      }
    }
    return { ...EMPTY_ENVELOPE }
  } catch {
    // D-17: read failures silent (corrupt JSON, throwing getItem in Safari ITP)
    return { ...EMPTY_ENVELOPE }
  }
}
```

**STORAGE-01 replacement — D-01 spread-all-override pattern:**
```typescript
// Replace the return inside the object-check branch only.
// Key elements to copy exactly:
//   1. Cast to Record<string, unknown> (existing pattern, line 66).
//   2. Spread `p` first; then override known fields (D-01).
//   3. Preserve on-disk version via Number.isFinite check; fallback STATE_VERSION.
const p = parsed as Record<string, unknown>
const onDiskVersion =
  typeof p.version === 'number' && Number.isFinite(p.version)
    ? p.version
    : STATE_VERSION
return {
  ...p,                   // D-01: preserves unknown top-level fields (future v2 subtrees)
  version: onDiskVersion, // on-disk value (or STATE_VERSION when absent/non-numeric)
  settings: p.settings,
  mute: p.mute,
  stats: p.stats,
}
// D-17 catch and { ...EMPTY_ENVELOPE } fallbacks are UNCHANGED.
```

**Existing `writeEnvelope` — no downgrade guard (to MODIFY)** (lines 81–89):
```typescript
export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    const payload = JSON.stringify({ ...env, version: STATE_VERSION })
    storage.setItem(STATE_KEY, payload)
  } catch {
    // D-16: write failures silent (quota, ITP, private mode).
  }
}
```

**STORAGE-02 + D-04a replacement — nested try/catch inline re-read guard:**
```typescript
export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    // D-04a: inline disk re-read detects cross-tab newer-version that landed
    // between caller-read and caller-write. Separate inner try/catch so a
    // throwing-getItem (Safari ITP) falls through to STATE_VERSION default and
    // the write proceeds (fail-open for the guard; D-16 still silences write errors).
    let currentVersion: number = STATE_VERSION
    try {
      const raw = storage.getItem(STATE_KEY)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const v = (parsed as Record<string, unknown>).version
          if (typeof v === 'number' && Number.isFinite(v)) currentVersion = v
        }
      }
    } catch { /* D-17: treat as no version info; proceed with write */ }
    // STORAGE-02 / D-03: refuse to downgrade a future-version envelope (silent).
    // WR-08 posture: caller's RAM state stays authoritative when this returns void.
    if (currentVersion > STATE_VERSION) return
    // D-04: running build stamps STATE_VERSION (ignores caller-passed version field).
    const payload = JSON.stringify({ ...env, version: STATE_VERSION })
    storage.setItem(STATE_KEY, payload)
  } catch {
    // D-16: write failures silent (quota, ITP, private mode).
  }
}
```

**Critical structural note:** The inner `try/catch` MUST be separate from the outer `try/catch`. Merging them into the outer would cause a throwing `getItem` to silently skip the write via the D-16 catch — the wrong outcome (guard should be fail-open).

---

### `src/storage/storage.test.ts` — Replace lines 77–83; add STORAGE-02 case

**Analog:** The file itself.

**Existing test infrastructure pattern** (lines 1–12) — copy imports and beforeEach/afterEach shape verbatim for any new test:
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readEnvelope, writeEnvelope, STATE_KEY, STATE_VERSION } from './storage'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
```

**Spy pattern for throwing-getItem / throwing-setItem** (lines 34–38 and 61–75) — verbatim shape for any mock needing Storage errors:
```typescript
vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
  throw new Error('SecurityError')
})
// or for setItem:
vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
  const e = new Error('quota')
  e.name = 'QuotaExceededError'
  throw e
})
```

**Seeding pattern used across all write tests** (e.g. lines 53–54):
```typescript
window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, settings: { bpm: 4 } }))
```

**Existing test to REPLACE** (lines 77–83) — the body below replaces only the `it()` body; the slot stays:
```typescript
// OLD (lines 77-83) — to be replaced:
it('always re-stamps version: 1 even if a caller passes a wrong version', () => {
  writeEnvelope({ version: STATE_VERSION, settings: { bpm: 4 } })
  const rawStr = window.localStorage.getItem(STATE_KEY)!
  expect(JSON.parse(rawStr) as unknown).toMatchObject({ version: 1 })
})
```

**STORAGE-01 replacement case** (D-07):
```typescript
it('preserves on-disk version when reading; stamps STATE_VERSION on write', () => {
  // Seed a v2 envelope (simulates a future schema written by a newer build).
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 2, settings: { bpm: 4 }, prefs: { theme: 'dark' },
  }))
  // STORAGE-01: readEnvelope must return version:2 (not STATE_VERSION:1)
  const env = readEnvelope()
  expect(env.version).toBe(2)
  expect(env.settings).toEqual({ bpm: 4 })
  // D-04a: writeEnvelope sees disk version 2 > STATE_VERSION 1 → refuses (no-op)
  writeEnvelope({ version: 1, settings: { bpm: 5 } })
  // STORAGE-02: disk value unchanged after refused write
  const rawAfter = window.localStorage.getItem(STATE_KEY)
  expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 2, settings: { bpm: 4 } })
})
```

Note: `writeEnvelope({ version: 1, ... })` no longer requires `as any` because `1` satisfies `number` after the Envelope interface widening.

**New STORAGE-02 standalone case** (appended after the replaced case, still inside `describe('writeEnvelope', ...)`:
```typescript
it('writeEnvelope refuses to overwrite a future-version on-disk envelope (STORAGE-02)', () => {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 2 }))
  writeEnvelope({
    version: 1,
    stats: { totalSessions: 99, totalElapsedSeconds: 0,
             lastSessionAtMs: null, lastSessionDurationSeconds: null },
  })
  // Disk unchanged: no-op write (D-03 silent)
  const rawAfter = window.localStorage.getItem(STATE_KEY)
  expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 2 })
  // Confirm 99 sessions were NOT written
  expect(JSON.parse(rawAfter!) as unknown).not.toMatchObject({ stats: { totalSessions: 99 } })
})
```

**Non-null assertion pattern** (lines 57–58, 81) — used for post-write getItem calls where the test proves non-null one line above:
```typescript
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rawStr = window.localStorage.getItem(STATE_KEY)!
```

---

### `src/storage/stats.ts` — Optional comment update at lines 76–81

**Analog:** The file itself.

**Existing WR-07 comment block** (lines 76–81 — the only touch):
```typescript
  // WR-07: single envelope read. Previously recordSession called loadStats
  // (which calls readEnvelope) AND then readEnvelope again before write,
  // opening a cross-tab race window: a second tab could write between the
  // two reads, and we'd compute next.totalSessions from stale stats while
  // merging with fresh settings/mute. Collapsing to one read closes that
  // window for in-tab correctness (cross-tab sync is still a v2 concern).
```

**Proposed updated comment** (comment-only change — no logic touches):
```typescript
  // WR-07: single envelope read. Previously recordSession called loadStats
  // (which calls readEnvelope) AND then readEnvelope again before write,
  // opening a cross-tab race window: a second tab could write between the
  // two reads, and we'd compute next.totalSessions from stale stats while
  // merging with fresh settings/mute. Collapsing to one read closes that
  // window for in-tab correctness. Cross-tab concurrent ends lose one
  // increment — documented v1.x work; UI consistency restored via the
  // STORAGE-03 storage-event listener in App.tsx.
```

---

### `src/app/App.tsx` — STORAGE-03 storage event listener (`useEffect`)

**Analog:** `src/app/App.tsx` existing `useEffect` patterns (lines 80–82, 203–209, 366–374, 382–418, 434–474, 477–481). Secondary analog: `document.addEventListener` cleanup shape from `useAudioCues` and `useWakeLock` hooks (confirmed in RESEARCH.md RQ-6).

**Existing imports block** (lines 1–32) — `loadStats`, `setStats`, and `STATE_KEY` are already imported; no new imports needed:
```typescript
// Lines 17–31 (relevant subset):
import {
  loadSettings,
  saveSettings,
  loadMute,
  saveMute,
  loadStats,
  recordSession,
  resetStats,
  ZERO_STATS,
  type PersistedStats,
} from '../storage'
// STATE_KEY is NOT currently imported — it must be added to this block:
import { STATE_KEY } from '../storage'
// OR add STATE_KEY to the existing named import above (preferred — one import statement).
```

**Existing mount-once cleanup pattern** (lines 477–481) — the closest structural analog for a `[]`-dep cleanup effect:
```typescript
// Cleanup pending lead-in timeouts on unmount (Pitfall 3 leak guard).
useEffect(() => {
  return () => {
    clearLeadInTimeouts()
  }
}, [clearLeadInTimeouts])
```

**Existing subscribe-and-reflect pattern** (lines 203–209) — philosophically identical (external event → local state update):
```typescript
// WR-01: Auto-close the confirmation modal when the session leaves running state.
// The setState below is intentional: subscribe + reflect pattern.
useEffect(() => {
  if (state.status !== 'running' && endDialogOpen) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndDialogOpen(false)
  }
}, [state.status, endDialogOpen])
```

**WR-08 optimistic-UI pattern** (lines 333–343) — the philosophical anchor for D-03 silent refusal; reference it in the new useEffect's inline comment:
```typescript
const confirmReset = useCallback(() => {
  // WR-08: optimistic UI — set RAM state from a known zero-state, not from
  // a re-read of disk. If resetStats() fails silently (D-16 quota / Safari
  // ITP / private mode), disk still holds OLD stats; loadStats() would return
  // them; footer would keep showing them despite the user clicking Reset.
  resetStats()
  setStats(ZERO_STATS)   // optimistic — disk may or may not have synced
  setResetDialogOpen(false)
}, [])
```

**New STORAGE-03 `useEffect` to add** — place after `sessionFrameRef` updater (after line 82) or before unmount cleanup (before line 477); either position is acceptable per RESEARCH.md RQ-6:
```typescript
// STORAGE-03: cross-tab stats consistency. When another tab writes the envelope,
// the browser fires a 'storage' event here (NOT in the writing tab). Re-read
// stats from disk so the footer stays consistent without a page reload.
// D-05: stats only — settings/mute drift stays deferred (v1.1).
// D-06: storage event is the sole trigger; no focus/visibilitychange backup.
// D-06a: filter by STATE_KEY; attach once; clean up on unmount.
// WR-08 posture: setStats is React-state-only — no domain side effects.
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setStats(loadStats())
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
// Empty deps: setStats has stable identity (useState); loadStats and STATE_KEY
// are module-level constants. react-hooks/exhaustive-deps will NOT flag this.
```

**Import addition required** — `STATE_KEY` must be added to the `../storage` import (line 17 block). The current import does not include `STATE_KEY`. Add it to the existing destructured import:
```typescript
import {
  loadSettings,
  saveSettings,
  loadMute,
  saveMute,
  loadStats,
  recordSession,
  resetStats,
  ZERO_STATS,
  STATE_KEY,          // <-- add this line
  type PersistedStats,
} from '../storage'
```

---

### `src/app/App.persistence.test.tsx` — STORAGE-03 cross-tab test (new `describe` block)

**Analog:** The file itself — all infrastructure is reused verbatim.

**Existing `beforeEach` / `afterEach` pattern** (lines 59–67) — the new `describe` block runs under these same file-level hooks; `vi.useFakeTimers()` is active for all tests in this file, including the new ones. This is safe — `StorageEvent` dispatch and `setStats` are synchronous; no real timers are involved:
```typescript
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
```

**`seedEnvelope` helper** (lines 26–33) — reuse in the new tests for initial state:
```typescript
function seedEnvelope(opts: SeedOpts = {}) {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 1,
    settings: opts.settings,
    mute: opts.mute,
    stats: opts.stats,
  }))
}
```

**`render(<App />)` + `screen.queryByRole` pattern** (e.g. lines 204–209) — exact query form for the stats footer:
```typescript
render(<App />)
expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
// and, after dispatch:
expect(screen.getByText(/5 sessions/)).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
```

**`act(async () => { ... })` flush pattern** (e.g. lines 43–48, 107) — required after StorageEvent dispatch to flush React state updates:
```typescript
await act(async () => {
  // synchronous work inside act flushes React state
  vi.advanceTimersByTime(LEAD_IN_MS)
})
// For the StorageEvent case — no timer advance needed, just act flush:
await act(async () => {
  window.dispatchEvent(new StorageEvent('storage', { ... }))
})
```

**Critical dispatch ordering** (from RESEARCH.md Pitfall 2): `setItem` MUST precede `dispatchEvent`. The listener calls `loadStats()` which reads disk; if the new data isn't on disk yet, `loadStats()` returns stale data.

**New STORAGE-03 `describe` block** — add after the final `describe('LOCL-03 — reset ...', ...)` block (after line 318):
```typescript
// ---------------------------------------------------------------------------
// STORAGE-03 — Cross-tab stats refresh via storage event
// ---------------------------------------------------------------------------
describe('STORAGE-03 — cross-tab stats refresh', () => {
  it('refreshes stats footer when another tab writes the envelope', async () => {
    // Start with no sessions — footer is hidden (D-09)
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()

    // Simulate another tab writing a new envelope (setItem before dispatchEvent — Pitfall 2).
    const newEnvelope = JSON.stringify({
      version: 1,
      stats: {
        totalSessions: 5,
        totalElapsedSeconds: 300,
        lastSessionAtMs: new Date('2026-05-09').getTime(),
        lastSessionDurationSeconds: 60,
      },
    })
    window.localStorage.setItem(STATE_KEY, newEnvelope)
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STATE_KEY,
        newValue: newEnvelope,
        oldValue: null,
        storageArea: window.localStorage,
      }))
    })

    // Footer now shows 5 sessions (listener called setStats(loadStats()))
    expect(screen.getByText(/5 sessions/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('ignores storage events for unrelated keys (D-06a key filter)', async () => {
    seedEnvelope({
      stats: {
        totalSessions: 3, totalElapsedSeconds: 180,
        lastSessionAtMs: new Date('2026-05-09').getTime(),
        lastSessionDurationSeconds: 60,
      },
    })
    render(<App />)
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()

    // Dispatch for a different key — must NOT trigger loadStats
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: JSON.stringify({ totalSessions: 99 }),
      }))
    })
    // Stats unchanged — 3 sessions still displayed
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()
    expect(screen.queryByText(/99 sessions/)).not.toBeInTheDocument()
  })
})
```

---

## Shared Patterns

### Silent-fallback storage try/catch (D-16/D-17)
**Source:** `src/storage/storage.ts` lines 54–78, 83–88
**Apply to:** ALL new code in `storage.ts`
```typescript
try {
  // risky storage op
} catch {
  // D-16/D-17: silent — no console.warn, no throw, no return value
}
```

### `Record<string, unknown>` cast after object type guard
**Source:** `src/storage/storage.ts` line 66
**Apply to:** Both the new `readEnvelope` D-01 branch and the D-04a inner re-read in `writeEnvelope`
```typescript
const p = parsed as Record<string, unknown>
// use p.version, p.settings, etc. — all typed unknown, no any
```

### `useEffect` window/document event listener lifecycle
**Source:** `src/app/App.tsx` lines 477–481 (cleanup-on-unmount shape) + RESEARCH.md RQ-6 citing `useAudioCues.ts:176-179` and `useWakeLock.ts:87-89`
**Apply to:** The new STORAGE-03 `useEffect` in `App.tsx`
```typescript
useEffect(() => {
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('storage', handler)
  }
}, [])
// Empty deps array: handler closes over module-level stable references only.
```

### Subscribe-and-reflect state update in `useEffect`
**Source:** `src/app/App.tsx` lines 203–209
**Apply to:** The new STORAGE-03 `useEffect` — same pattern (external event → local state update via setter)
```typescript
// eslint-disable-next-line react-hooks/set-state-in-effect
setEndDialogOpen(false)  // <- shape; STORAGE-03 equivalent is setStats(loadStats())
```
Note: the `set-state-in-effect` eslint disable comment may or may not be needed for the storage listener — the existing `setEndDialogOpen` in an effect required it; `setStats` in a `window.addEventListener` callback inside `useEffect` is the standard subscribe-and-reflect pattern and should not require the disable comment (it's inside an event handler, not called unconditionally during render).

### `act(async () => { ... })` flush for async state
**Source:** `src/app/App.persistence.test.tsx` lines 43–48, 107
**Apply to:** All assertions after `StorageEvent` dispatch in the new STORAGE-03 test
```typescript
await act(async () => {
  window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, ... }))
})
// then assert
```

### Non-null assertion for post-write localStorage reads in tests
**Source:** `src/storage/storage.test.ts` lines 57–58
**Apply to:** New STORAGE-02 test assertions that read `getItem(STATE_KEY)` after a seeded write
```typescript
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rawAfter = window.localStorage.getItem(STATE_KEY)!
expect(JSON.parse(rawAfter) as unknown).toMatchObject({ ... })
```

---

## No Analog Found

All files in scope have exact self-analogs (modifications to existing files). No file requires a greenfield pattern from RESEARCH.md alone.

---

## Metadata

**Analog search scope:** `src/storage/`, `src/app/`
**Files scanned:** 5 source files read in full; RESEARCH.md and CONTEXT.md read for cross-validation
**Pattern extraction date:** 2026-05-11

---

## PATTERN MAPPING COMPLETE
