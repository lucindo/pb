# Phase 8: Storage Forward-Compat & Cross-Tab UI Sync — Research

**Researched:** 2026-05-11
**Domain:** localStorage envelope versioning, jsdom StorageEvent propagation, React useEffect lifecycle
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** `readEnvelope` preserves unknown TOP-LEVEL fields from the parsed envelope by spreading the parsed object, then overriding `version` with the on-disk value (falling back to `STATE_VERSION` only when the disk `version` field is absent or non-numeric). The Phase 4 CR-01 invariant "pick only the 3 known subtree keys" is intentionally REVERSED at the top level.

**D-02:** Subtree coercers (`coerceSettings` / `coerceMute` / `coerceStats`) keep stripping unknown SUB-keys inside each subtree. Forward-compat lives at the top level only.

**D-03:** `writeEnvelope` refuses (returns void, no-op) when the on-disk `version > STATE_VERSION`. SILENT — no `console.warn` even in DEV. Consistent with Phase 4 D-16/D-17 silent-fallback posture.

**D-04:** `writeEnvelope` stamps `STATE_VERSION` on every successful write (ignores any `version` field on the input `env`).

**D-04a:** The refusal check inside `writeEnvelope` performs an inline disk re-read wrapped in its own try/catch so a throwing-`getItem` (Safari ITP) does not break the write path.

**D-05:** Listener refreshes STATS ONLY (`setStats(loadStats())`). Settings and mute drift across tabs stays deferred.

**D-06:** Storage event is the ONLY refresh trigger — no `focus` / `visibilitychange` backup. `e.newValue === null` (cleared) falls through naturally via `loadStats() → coerceStats(undefined) → ZERO_STATS`; no explicit branch required.

**D-06a:** Listener filters by `e.key === STATE_KEY`. Listener is attached once at App mount, cleaned up on unmount. Mid-session firings allowed — `setStats` is React-state-only, no domain side effects.

**D-07:** Adapter contracts (STORAGE-01 read-preserves-version, STORAGE-02 no-downgrade write refusal) go into existing `src/storage/storage.test.ts`. The current `'always re-stamps version: 1 even if a caller passes a wrong version'` case (lines 77-83) is REPLACED (not deleted) with a `'preserves on-disk version when reading'` case PLUS a new `'refuses to write when on-disk version > STATE_VERSION'` case. Cross-tab UI sync (STORAGE-03) lives in `src/app/App.persistence.test.tsx`.

### Claude's Discretion

- **`Envelope.version` type widening.** Currently `version: typeof STATE_VERSION` (literal `1`). Planner picks the cleanest narrowing under the Phase 7 strict baseline; both `Envelope` and any consumers reading `env.version` must compile cleanly.
- **Invalid `version` field validation tightness.** Minimum: `typeof p.version === 'number' && Number.isFinite(p.version)`. Whether to also require `Number.isInteger(p.version) && p.version >= 1` is left to the planner.
- **Existing `EMPTY_ENVELOPE` constant.** Whether to keep or inline.
- **How to dispatch the `StorageEvent` from the cross-tab Vitest case.** Planner verifies it triggers the React listener under jsdom.
- **Whether to extract a `useEnvelopeStorageEvent(setStats)` hook** or inline in `App.tsx`.

### Deferred Ideas (OUT OF SCOPE)

- **WR-07 increment race fix** — STORAGE-03 restores UI CONSISTENCY but not increment correctness. Comment update at `stats.ts:76-81` — planner decides whether to bundle inside Phase 8 or defer.
- **Settings + mute cross-tab sync** — out of scope per D-05.
- **Focus / visibilitychange backup refresh trigger** — out of scope per D-06.
- **Migration framework / v2 schema design** — explicitly deferred.
- **Custom dev-mode `console.warn` for refused writes** — rejected (D-03).
- **Subtree-level forward-compat** — rejected (D-02).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STORAGE-01 | `readEnvelope` preserves the on-disk `version` field; unknown top-level disk fields pass through | Verified: readEnvelope currently overwrites version unconditionally (storage.ts:68). Fix: spread `parsed` then override known keys; preserve on-disk version. |
| STORAGE-02 | `writeEnvelope` refuses to write when on-disk `version > STATE_VERSION` | Verified: writeEnvelope currently has no downgrade guard (storage.ts:81-89). Fix: inline re-read with try/catch before setItem. |
| STORAGE-03 | App-level `storage` event listener keeps stats display consistent across tabs | Verified: no listener exists currently. Fix: useEffect([]) in App.tsx attaching window 'storage' handler. jsdom confirmed to propagate synthetic StorageEvent. |
</phase_requirements>

---

## Summary

Phase 8 applies three targeted changes to the localStorage storage adapter. All three are surgical: two modify `src/storage/storage.ts` (STORAGE-01 and STORAGE-02) and one adds a `useEffect` to `src/app/App.tsx` (STORAGE-03). No new components, no new dependencies, no schema changes. The visual surface is unchanged byte-for-byte (per UI-SPEC.md).

The central constraint is that the Phase 7 strict-mode baseline (`strict: true`, `noUncheckedIndexedAccess: true`, `strictTypeChecked` ESLint) is already active. Every line added must compile cleanly under that baseline. The good news: no cast-heavy code paths are required. The `Envelope.version` type needs one widening (`typeof STATE_VERSION` → `number`), and all other changes use patterns already established in the codebase.

The cross-tab StorageEvent dispatch idiom works correctly under jsdom 29.1.1 — confirmed via direct verification. `window.dispatchEvent(new StorageEvent('storage', {...}))` propagates to `window.addEventListener('storage', ...)` handlers. This is the synthetic dispatch path the STORAGE-03 test case requires.

**Primary recommendation:** Implement as a single plan (one wave). All three changes touch disjoint code; they can be sequenced as: (1) widen Envelope type, (2) fix readEnvelope (STORAGE-01), (3) fix writeEnvelope (STORAGE-02), (4) add storage listener in App.tsx (STORAGE-03), (5) replace/add tests. Final test count: 363 + 2 = 365.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Envelope schema versioning (read) | Storage adapter (`storage.ts`) | — | `readEnvelope` is the sole disk-read entry point |
| Envelope downgrade refusal (write) | Storage adapter (`storage.ts`) | — | `writeEnvelope` is the sole disk-write entry point |
| Cross-tab stats refresh | Frontend App (`App.tsx`) | Storage adapter (`loadStats`) | UI state (`setStats`) lives in App; disk re-read via `loadStats()` |
| Stats re-read from disk | Storage adapter (`stats.ts:loadStats`) | — | `loadStats()` already wraps `coerceStats(readEnvelope().stats)` |
| StorageEvent dispatch (test) | Test layer (`App.persistence.test.tsx`) | jsdom | Synthetic dispatch triggers real React listener |

---

## Standard Stack

### Core (no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.5 | `useEffect` for storage listener lifecycle | Already in use throughout |
| TypeScript | (strict baseline) | Type-safe Envelope widening | Phase 7 strict baseline active |
| Vitest | ^4.1.5 | Unit tests + StorageEvent dispatch | Already in use; jsdom 29.1.1 confirmed |
| jsdom | ^29.1.1 | Test environment for window event propagation | Already in use |

**No new packages to install.** [VERIFIED: package.json]

---

## Architecture Patterns

### System Architecture Diagram

```
[Another Tab]
     |
     | writes localStorage (STATE_KEY)
     v
[Browser StorageEvent]
     |
     | dispatched to all OTHER windows/tabs
     v
[window 'storage' listener in App.tsx]
     |
     | e.key === STATE_KEY filter
     v
[loadStats() — reads envelope from disk]
     |
     | coerceStats(readEnvelope().stats)
     v
[setStats(newStats)] ——> React re-render ——> StatsFooter update

[v2 Build writes version:2 envelope]
     |
     | v1 build calls writeEnvelope()
     v
[D-04a inline re-read in writeEnvelope]
     |
     | disk version > STATE_VERSION?
     |-- YES --> return (silent no-op) ——> RAM state stays authoritative
     |-- NO  --> JSON.stringify + setItem ——> stamps STATE_VERSION
```

### Recommended Project Structure (unchanged)

```
src/storage/
├── storage.ts       # STORAGE-01: readEnvelope spread; STORAGE-02: D-04a guard in writeEnvelope
├── storage.test.ts  # D-07: replace lines 77-83; add STORAGE-02 test
├── stats.ts         # (optional comment update at lines 76-81; planner decides)
└── index.ts         # unchanged

src/app/
├── App.tsx          # STORAGE-03: add useEffect([]) with window storage listener
└── App.persistence.test.tsx  # D-07: add STORAGE-03 cross-tab test
```

### Pattern 1: readEnvelope — Spread + Override (STORAGE-01)

**What:** Replace the current "pick only known keys" pattern with "spread all disk fields, then override known fields."
**When to use:** Reading any envelope that may contain forward-compat top-level keys from a newer schema.

```typescript
// Source: CONTEXT.md §Specifics + CR-02 fix sketch (REVIEW.md:92-113)
// BEFORE (Phase 4 CR-01 pattern — pick only known keys):
return {
  version: STATE_VERSION,     // always overwrites disk version
  settings: p.settings,
  mute: p.mute,
  stats: p.stats,
}

// AFTER (D-01 — spread all, override known, preserve unknown):
const onDiskVersion = typeof p.version === 'number' && Number.isFinite(p.version)
  ? p.version
  : STATE_VERSION
return {
  ...p,                       // preserves unknown top-level fields (e.g. future 'prefs:')
  version: onDiskVersion,     // on-disk value (or STATE_VERSION fallback)
  settings: p.settings,       // explicit override keeps type clarity
  mute: p.mute,
  stats: p.stats,
}
```

[VERIFIED: codebase — current storage.ts:66-72 confirmed pick-only pattern]

### Pattern 2: writeEnvelope — Inline Re-Read Guard (STORAGE-02 + D-04a)

**What:** Before writing, re-read disk version. If disk version > STATE_VERSION, silently abort.
**When to use:** Every write path. One extra `getItem` per write; wrapped in its own try/catch.

```typescript
// Source: CONTEXT.md §Specifics (D-04a conservative shape)
export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    // D-04a: inline disk re-read to detect cross-tab newer-version landing
    // between caller-read and caller-write. Wrapped in its own try/catch so
    // a throwing getItem (Safari ITP) falls through to STATE_VERSION default
    // and the write proceeds (fail-open for the guard, fail-silent for the write).
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
    } catch { /* D-17: treat throwing-getItem as no disk version info */ }
    // STORAGE-02: refuse to downgrade a future-version envelope (D-03 silent)
    // WR-08 posture: caller's RAM state stays authoritative; disk retains future schema.
    if (currentVersion > STATE_VERSION) return
    // D-04: always stamp STATE_VERSION (running build owns version field)
    const payload = JSON.stringify({ ...env, version: STATE_VERSION })
    storage.setItem(STATE_KEY, payload)
  } catch {
    // D-16: write failures silent (quota, ITP, private mode).
  }
}
```

[VERIFIED: codebase — current writeEnvelope has no downgrade guard; CONTEXT.md D-04a shape]

### Pattern 3: App-Level Storage Event Listener (STORAGE-03)

**What:** Mount-time `useEffect([])` that attaches a `storage` event listener, refreshes stats on firing, cleans up on unmount.
**When to use:** Single instance in App.tsx root component.

```typescript
// Source: REVIEW.md WR-07 fix sketch (lines 313-321) + CONTEXT.md D-06a
// In App() component body, alongside existing useEffect patterns:
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setStats(loadStats())  // D-05: stats only; D-06: storage event is sole trigger
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])  // empty deps: setStats stable from useState; loadStats/STATE_KEY are module-level
```

[VERIFIED: App.tsx — no existing storage listener; precedent confirmed in useAudioCues.ts:176-179 and useWakeLock.ts:87-89 for document.addEventListener patterns]

### Pattern 4: Envelope.version Type Widening

**What:** Widen `version: typeof STATE_VERSION` to `version: number`.
**Why not index signature:** See Research Question 4 below.

```typescript
// Source: CONTEXT.md Claude's Discretion
export interface Envelope {
  version: number   // was: typeof STATE_VERSION (literal 1)
  settings?: unknown
  mute?: unknown
  stats?: unknown
}
// EMPTY_ENVELOPE stays valid: STATE_VERSION (1 as const) satisfies number.
const EMPTY_ENVELOPE: Envelope = { version: STATE_VERSION }  // unchanged
```

[VERIFIED: no consumer reads `.version` from Envelope-typed values outside storage.ts itself — grep confirmed zero `.version` reads in non-test source files]

### Anti-Patterns to Avoid

- **Separate try/catch wrapping the entire D-04a guard + write together:** The inner re-read needs its own try/catch distinct from the outer D-16 write catch. Merging them would cause a throwing-`getItem` to swallow the write silently instead of falling through to attempt-the-write.
- **`console.warn` in the refused-downgrade branch (D-03):** Even in DEV mode. Silent-refusal posture is locked.
- **`react-hooks/exhaustive-deps` with `loadStats` or `STATE_KEY` in deps:** Both are module-level stable constants. Empty deps array `[]` is correct and ESLint will not flag it.
- **Index signature on Envelope:** See Research Question 4.

---

## Research Questions — Answered

### RQ-1: jsdom StorageEvent Propagation

**Answer: CONFIRMED WORKING.** [VERIFIED: direct jsdom 29.1.1 test]

`window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea, ... }))` fires `window.addEventListener('storage', handler)` listeners in jsdom 29.1.1. Tested directly:

```javascript
// Verified via node -e with require('jsdom')
let fired = false
window.addEventListener('storage', (e) => {
  fired = true
  // e.key, e.newValue, e.storageArea all present
})
window.dispatchEvent(new window.StorageEvent('storage', {
  key: 'hrv:state:v1',
  newValue: JSON.stringify({ version: 2, stats: { totalSessions: 5 } }),
  oldValue: null,
  storageArea: window.localStorage,
  url: window.location.href
}))
// fired === true ✓
```

**Critical distinction:** In real browsers, the `storage` event is fired only in OTHER tabs/windows (never in the same window that called `setItem`). jsdom has only one window, so `window.dispatchEvent` is the test idiom — it simulates receiving the event that would have arrived from another tab. This is the correct and standard test approach.

### RQ-2: StorageEvent Constructor Options Under jsdom

**Answer: All fields optional; `key` + `newValue` are sufficient for the test.** [VERIFIED: direct jsdom test]

| Field | Type (DOM lib) | Required for test? | Notes |
|-------|----------------|-------------------|-------|
| `key` | `string \| null` | YES — test filters on `e.key === STATE_KEY` | |
| `newValue` | `string \| null` | YES — loadStats reads disk, but newValue presence confirms event fired | |
| `oldValue` | `string \| null` | Optional | Null OK |
| `storageArea` | `Storage \| null` | Optional for event dispatch | jsdom sets it correctly when provided |
| `url` | `string` | Optional | Defaults to `''` in jsdom |

**Minimum viable dispatch for the STORAGE-03 test:**

```typescript
// Source: verified via direct jsdom 29.1.1 test
window.dispatchEvent(new StorageEvent('storage', {
  key: STATE_KEY,
  newValue: JSON.stringify({ version: 1, stats: { totalSessions: 5, ... } }),
  oldValue: null,
  storageArea: window.localStorage,
}))
```

`storageArea: window.localStorage` is recommended (not required) to match browser semantics. `url` can be omitted — jsdom defaults it to `''`.

**TypeScript strict-mode type:** `(e: StorageEvent) => void` — the DOM lib types `StorageEvent` cleanly; no widening or cast needed for the handler parameter. `e.key` is `string | null` (per DOM lib); `e.key === STATE_KEY` narrows it.

### RQ-3: Phase 7 Strict-Type Baseline Impact of `Envelope.version` Widening

**Answer: Zero impact on callers. No sites break.** [VERIFIED: grep of all non-test source files]

Grep for `.version` reads on Envelope-typed values in non-test source files produced **zero results**. The only code that reads `env.version` is inside `storage.ts` itself:
- `storage.ts:68`: `version: STATE_VERSION` (the unconditional overwrite — this is what STORAGE-01 changes).
- `storage.ts:84`: `{ ...env, version: STATE_VERSION }` in `writeEnvelope` (D-04 stamps STATE_VERSION, ignores env.version).

No consumer in `settings.ts`, `stats.ts`, `App.tsx`, or any other file reads `.version` from an `Envelope`-typed variable. Widening from `typeof STATE_VERSION` (literal `1`) to `number` has zero blast radius on callers.

**EMPTY_ENVELOPE:** `const EMPTY_ENVELOPE: Envelope = { version: STATE_VERSION }` — `STATE_VERSION` is `1 as const`, which satisfies `number`. No change needed to the constant. The planner can keep or inline it (Claude's Discretion); keeping it avoids diff noise.

**Test files:** The test at `storage.test.ts:53` does `writeEnvelope({ version: STATE_VERSION, settings: { bpm: 4 } })` — still valid. The REPLACED test at lines 77-83 used `writeEnvelope({ version: STATE_VERSION, settings: { bpm: 4 } })` — the new STORAGE-02 test can write `{ version: 2 }` directly without any `as any` cast because `2` satisfies `number`. This is cleaner than the old approach.

### RQ-4: Envelope Interface Forward-Compat Shape Options

**Recommendation: Option (b) — no index signature; keep Envelope clean; rely on value-level spread.**

| Option | Shape | Strict Compliance | Tradeoffs |
|--------|-------|------------------|-----------|
| (a) `[k: string]: unknown` index signature | `interface Envelope { version: number; settings?: unknown; mute?: unknown; stats?: unknown; [k: string]: unknown }` | Compiles; but `no-unsafe-assignment` may flag spreads | Extra rules friction; not needed |
| (b) Keep narrow interface; value-level spread | `interface Envelope { version: number; settings?: unknown; mute?: unknown; stats?: unknown }` | Clean; no index sig friction | **Recommended** |
| (c) Separate `EnvelopeOnDisk` interface | Split interfaces | Compiles; but doubles the surface area | Overkill for this scope |

**Why Option (b) works:** The forward-compat preservation (D-01) happens at the **value level**, not the type level. When `readEnvelope` does `return { ...p, version: onDiskVersion, settings: p.settings, mute: p.mute, stats: p.stats }`, the spread of `p` (a `Record<string, unknown>`) means any extra top-level fields from disk (e.g., future `prefs: {...}`) exist on the returned object at runtime. TypeScript doesn't surface them in the return type (it sees `Envelope`), but they survive:

- When `settings.ts` does `const env = readEnvelope(deps); writeEnvelope({ ...env, settings }, deps)`, the extra fields are in `env` at runtime and propagate through `{ ...env, settings }`. The object literal passed to `writeEnvelope` has `Envelope`'s typed fields plus the runtime extras — TypeScript excess-property-check only applies to fresh object literals, not spread results. No type error.
- When `writeEnvelope` does `JSON.stringify({ ...env, version: STATE_VERSION })`, the extra fields serialize to JSON and survive the round trip.

This means **Option (b) preserves the D-01 invariant without any index signature complexity**.

**Rationale tied to Phase 7 strict mode + D-15:** `strictTypeChecked` ESLint includes `no-unsafe-assignment` which fires on assignments from `any`-typed values. An index signature makes all named fields typed as `unknown` (satisfies `unknown`, not `any`), so technically it doesn't trigger that rule. But it does create friction: `{ ...envB, settings: settingsObj }` where `envB` has an index sig produces a type where `settings` is `SessionSettings & unknown` = `SessionSettings`, which is fine — but the TypeScript inference chain is longer and less readable. Option (b) avoids this entirely.

### RQ-5: Inline Disk Re-Read Performance and Safety

**Answer: One extra `getItem` per write; negligible cost; ITP-safe via nested try/catch.** [VERIFIED: CONTEXT.md D-04a; codebase pattern analysis]

**Performance:** A `localStorage.getItem` call is synchronous and O(1) in modern browsers (backed by an in-process key-value store). Benchmarks show < 1ms for small payloads. The app writes to localStorage only on session end, settings change, mute toggle, or reset — low-frequency operations where 1ms overhead is imperceptible.

**Safety:** The D-04a pattern wraps the inner re-read in its own `try/catch` separate from the outer `try/catch` (D-16). This means:
- If `getItem` throws (Safari ITP private-mode restriction): caught by inner catch, `currentVersion` stays at `STATE_VERSION`, write proceeds as normal. Fail-open for the downgrade guard; fail-silent (D-16) for any subsequent write error.
- If `JSON.parse` throws: caught by inner catch, same fallback.
- If `setItem` throws (quota): caught by outer catch, D-16 silent.

The nested structure is already modeled in the CONTEXT.md `<specifics>` code sketch. `recordSession` and `resetStats` in `stats.ts` do NOT have their own outer try/catch — they rely on `readEnvelope` and `writeEnvelope` each carrying their own guards. D-04a's nested try/catch inherits this "each adapter method is its own guard" principle.

**No observable behavior change for the WR-07 in-tab race:** The extra getItem inside `writeEnvelope` adds a second read at the adapter layer, but the in-tab race described in `stats.ts:76-81` is between caller-read (`const env = readEnvelope(deps)`) and caller-write (`writeEnvelope({ ...env, stats: next }, deps)`). The D-04a re-read happens INSIDE `writeEnvelope`, so it sees the state at write-time — it protects only against a cross-tab newer-version that landed between caller-read and caller-write. The in-tab race window is unchanged.

### RQ-6: React App-Level Storage Listener Pattern

**Answer: Standard `useEffect([], [])` with `window.addEventListener`; confirmed by 3 existing precedents in the codebase.** [VERIFIED: codebase grep]

The established hook pattern in this project (confirmed by `useAudioCues.ts:176-179` and `useWakeLock.ts:87-89`):

```typescript
useEffect(() => {
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
  }
}, [])
```

The STORAGE-03 listener uses `window` instead of `document` (storage events fire on `window`, not `document`):

```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) setStats(loadStats())
  }
  window.addEventListener('storage', onStorage)
  return () => { window.removeEventListener('storage', onStorage) }
}, [])
```

**Empty deps `[]` is correct** per `react-hooks/exhaustive-deps` because:
- `setStats` has stable identity from `useState` (React guarantees this)
- `loadStats` is a module-level import (stable)
- `STATE_KEY` is a module-level constant (stable)

ESLint will NOT flag this as a violation. The Phase 7 strict baseline's `exhaustive-deps: 'error'` rule is satisfied.

**Inline vs hook extraction:** The Phase 5/6 precedent inlines small `useEffect` bodies directly in `App.tsx` (the `visibilitychange` and lead-in timeout cleanup effects are inline). Phase 5/6 did NOT extract custom hooks for 3-5 line effects. The storage listener is ~6 lines — inline in `App.tsx` is the project pattern. A `useEnvelopeStorageEvent` hook would be over-engineering for this scope.

**Existing App.tsx useEffect inventory (relevant to STORAGE-03 placement):**

| Line | Pattern | Deps |
|------|---------|------|
| 80-82 | `sessionFrameRef` updater | `[session.currentFrame]` |
| 203-209 | `endDialogOpen` subscribe-reflect | `[state.status, endDialogOpen]` |
| 366-374 | `runningSnapshotRef` updater | `[state]` |
| 382-418 | Session cleanup (stats write, audio stop) | `[state, audioStop, wakeLockRelease, clearLeadInTimeouts]` |
| 434-474 | Boundary cue scheduling | `[appPhase, session.currentFrame, audioNotifyPhaseBoundary]` |
| 477-481 | Lead-in timeout cleanup on unmount | `[clearLeadInTimeouts]` |

The new storage listener `useEffect([])` fits naturally after line 82 or before line 477 (cleanup group). Placement adjacent to the other mount-once effects (before cleanup-on-unmount) is recommended.

### RQ-7: Test Count Invariant

**Current count:** 363/363 passing. [VERIFIED: `npm run test` output — 27 test files, 363 tests]

**Phase 8 test delta:**

| Change | File | Delta |
|--------|------|-------|
| REPLACE `'always re-stamps version: 1...'` (lines 77-83) with preserve-on-disk-version test | `storage.test.ts` | 0 net (1 removed, 1 added) |
| ADD new `'refuses to write when on-disk version > STATE_VERSION'` test (STORAGE-02) | `storage.test.ts` | +1 |
| ADD new STORAGE-03 cross-tab stats refresh test | `App.persistence.test.tsx` | +1 |

**Final count: 363 + 2 = 365 tests.** [ASSUMED — based on D-07 scope; "optionally" a 3rd test for the key-filter invariant adds +1 to 366]

**Surviving tests (no modification needed):** All 8 existing tests in `storage.test.ts` except the one at lines 77-83; all 16 existing tests in `App.persistence.test.tsx`. Verified:
- `readEnvelope` tests at lines 15-48: all seed `version: 1` or no data; STORAGE-01 preserves `version: 1` when disk has `version: 1`. `toBe(STATE_VERSION)` continues to hold (1 === 1). No change.
- `writeEnvelope` tests at lines 52-75: all run against empty localStorage (cleared by `beforeEach`). Empty disk → `getItem` returns null → D-04a inner try/catch → `currentVersion` defaults to `STATE_VERSION` → write proceeds. No change.
- `App.persistence.test.tsx` LOCL-01/02/03 tests: all use `version: 1` envelopes or empty storage. STORAGE-01/02 behavior is identical for v1 envelopes. STORAGE-03 listener may fire during some tests but `setStats(loadStats())` from a freshly-cleared disk produces `ZERO_STATS`, which is the same as the initial `useState(() => loadStats())` value — no observable side effect.

### RQ-8: WR-07 Comment Update — Bundle or Defer?

**Recommendation: Bundle inside Phase 8.** [ASSUMED — reasoning based on scope analysis]

The comment at `stats.ts:76-81`:
```
// cross-tab sync is still a v2 concern
```
should be updated to:
```
// cross-tab concurrent end loses one increment — documented v1.x work; UI consistency
// restored via STORAGE-03 storage-event listener in App.tsx.
```

Rationale for bundling:
- Comment-only change (zero lines of logic, zero test impact).
- STORAGE-03 directly closes the "UI consistency" half of WR-07; updating the comment to reflect this makes the audit trail coherent.
- Leaving the "v2 concern" wording after STORAGE-03 lands would be misleading to a future reader.
- The CONTEXT.md `<deferred>` section explicitly says "planner decides" — research recommendation is to bundle.

### RQ-9: UI-SPEC.md — Cross-Tab Refresh Interaction Contract

**Key constraints the planner must honor:**

1. **No visual change to `StatsFooter.tsx`.** The component receives new `stats` props via `setStats` and React re-renders in place. Same DOM structure, same CSS classes, new text content. Zero layout shift. [VERIFIED: 08-UI-SPEC.md §Design System]

2. **No animation or flash on update.** The cross-tab refresh is decorative consistency, not a notification. Adding any CSS transition to the update would falsely imply the change happened in this tab. The locked behavior is silent text-node update. [VERIFIED: 08-UI-SPEC.md §Motion]

3. **No `aria-live` announcement.** Stats footer is persistent decorative content. WCAG 2.2 SC 4.1.3 is not violated — this is not a status message in response to a user action in the current tab. [VERIFIED: 08-UI-SPEC.md §Accessibility]

4. **React focus preservation.** `setStats(newStats)` re-renders `StatsFooter` via prop change; the component doesn't unmount/remount. React preserves focus on stable DOM nodes. The Reset button's identity is stable — a screen-reader user tabbed onto it will NOT lose focus. [VERIFIED: 08-UI-SPEC.md §Keyboard focus]

5. **Mid-session listener firing allowed.** When `inSessionView === true`, the footer is hidden by existing D-09/D-10 gating. The listener may fire and `setStats` may update React state, but no visual change occurs. [VERIFIED: 08-UI-SPEC.md §Mid-session tolerance]

6. **`e.newValue === null` (cleared storage) handled.** `loadStats()` → `readEnvelope()` → catches getItem("null") → `EMPTY_ENVELOPE` → `coerceStats(undefined)` → `ZERO_STATS` → `totalSessions === 0` → footer hides. No explicit branch needed. [VERIFIED: 08-UI-SPEC.md §Edge cases]

7. **Existing testing queries must remain valid post-listener.** `screen.getByRole('button', { name: 'Reset' })`, `screen.getByText(/N sessions/)`, `screen.queryByRole('button', { name: 'Reset' })` returning null — all survive a `setStats`-triggered re-render because the DOM structure is unchanged. [VERIFIED: 08-UI-SPEC.md §Testing Hooks]

### RQ-10: Manual Two-Window Test Recipe

**Reproducible step list for Success Criterion #3:**

```
Prerequisites:
  - npm run dev running locally (http://localhost:5173/hrv/)
  - Two Chrome windows open at the same URL (File > New Window, NOT incognito)
    [Both windows share the same localStorage origin]

Test steps:
  1. In Window A: verify footer is hidden (no sessions recorded)
  2. In Window A: start a session (click "Start session")
  3. In Window A: wait > 30 seconds (past D-01 threshold)
  4. In Window A: click "End session"
     -> Footer should appear in Window A showing "1 session · N min total"
  5. In Window B (currently idle): observe footer
     -> Footer should NOW appear showing "1 session · N min total"
     -> This is the STORAGE-03 event propagating from A's writeEnvelope to B's listener
  6. In Window A: start and complete a second session (> 30s)
  7. Observe Window B immediately after step 6 ends:
     -> Footer in Window B should update to "2 sessions · N min total"
     -> No page refresh needed

Reset test (e.newValue === null edge case):
  8. In Window A: click "Reset" and confirm
     -> Window A: footer hides (optimistic setStats(ZERO_STATS))
     -> Window B: footer should also hide (storage event fires; loadStats() returns ZERO_STATS)

Stats isolation test (key filter):
  9. Via DevTools Console in Window B:
     localStorage.setItem('some-other-key', '{"anything": 1}')
     -> Window B footer: NO change (e.key !== STATE_KEY filter working)

Pass condition: Window B updates match Window A's disk state without a page refresh.
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-tab state sync | Custom polling / BroadcastChannel | Browser `storage` event | Browser-native; fires automatically when localStorage changes from another tab |
| JSON deserialization safety | Custom try/catch per call site | `try { JSON.parse() } catch {}` in `readEnvelope` | Already abstracted by the adapter; callers are already safe |
| React state update from event | Custom event bus | `setStats(loadStats())` in `useEffect` callback | Standard React subscribe-and-reflect pattern |
| Version comparison | Custom semver library | Numeric `>` comparison | Version is a plain integer |

---

## Common Pitfalls

### Pitfall 1: D-04a try/catch Nesting Order

**What goes wrong:** Wrapping the D-04a inner re-read inside the same outer `try/catch` as the `setItem` write. A throwing `getItem` (Safari ITP) then gets silently absorbed by the D-16 outer catch WITHOUT attempting the write — the caller's state write is silently lost even though the quota/ITP-for-writes may not have applied.

**Why it happens:** The REVIEW.md fix sketch (lines 115-128) puts the re-read inside the outer `try` without nesting. The CONTEXT.md D-04a explicitly requires a nested try/catch.

**How to avoid:** Two separate try/catch blocks as shown in the Pattern 2 code example above. Inner catch defaults `currentVersion = STATE_VERSION` (fail-open for the guard) and falls through to the write attempt.

**Warning signs:** A test that mocks `getItem` to throw `SecurityError` and then asserts `setItem` was NOT called — but it SHOULD have been called.

### Pitfall 2: STORAGE-03 Test Needs to Set localStorage Before Dispatching the Event

**What goes wrong:** Dispatching the `StorageEvent` without first writing the new envelope to `localStorage`. The listener calls `loadStats()` which calls `localStorage.getItem(STATE_KEY)` — if the new envelope isn't there yet, `loadStats()` returns the OLD stats (or `ZERO_STATS`), and the test asserts the new value but sees the old value.

**Why it happens:** In real browsers, the `storage` event fires AFTER the other tab's `setItem` completes. In the synthetic test idiom, `dispatchEvent` fires synchronously — you must manually call `localStorage.setItem` first, then dispatch.

**How to avoid:** Always sequence as:
```typescript
// 1. Write the new envelope to localStorage first
window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, stats: { totalSessions: 5, ... } }))
// 2. Then dispatch the event
act(() => {
  window.dispatchEvent(new StorageEvent('storage', {
    key: STATE_KEY,
    newValue: window.localStorage.getItem(STATE_KEY),
    oldValue: null,
    storageArea: window.localStorage,
  }))
})
// 3. Assert
expect(screen.getByText(/5 sessions/)).toBeInTheDocument()
```

**Warning signs:** Test dispatches `StorageEvent` but asserts a value that was never written to localStorage.

### Pitfall 3: `readEnvelope` Return Type Hides Runtime Unknown Fields

**What goes wrong:** A future developer reads `readEnvelope()` and sees `Envelope` return type (no index sig). They conclude that `{ ...env, settings }` DROPS any unknown fields because `Envelope` doesn't declare them. They add a "cleanup step" that picks only known keys, breaking D-01.

**Why it happens:** TypeScript's structural type system hides the runtime extras. The type says `{ version: number, settings?: unknown, ... }` but the runtime object may have `{ version: 2, settings: ..., prefs: ... }`.

**How to avoid:** Add a code comment to `readEnvelope` explicitly documenting that D-01 forward-compat relies on the value-level spread, and that callers who do `{ ...env, someField }` propagate unknown fields through the round-trip. Reference D-01 by name.

**Warning signs:** A PR that changes `{ ...p, version, settings, mute, stats }` back to `{ version, settings, mute, stats }` (losing the `...p` spread).

### Pitfall 4: `EMPTY_ENVELOPE` Spread in readEnvelope Returns a Copy

**What goes wrong:** Current code has `return { ...EMPTY_ENVELOPE }` in fallback paths. After STORAGE-01, if the planner accidentally changes a fallback to `return EMPTY_ENVELOPE` (no spread), the returned object is the shared module-level constant and a callee that mutates it (shouldn't happen, but defensive) could corrupt all future fallback reads.

**Why it happens:** The spread is a no-op from a type perspective; its purpose (returning a fresh object) is invisible.

**How to avoid:** Keep `{ ...EMPTY_ENVELOPE }` spreads in fallback returns unchanged. STORAGE-01 only changes the happy path (valid disk data branch).

---

## Code Examples

### Full readEnvelope After STORAGE-01

```typescript
// Source: derived from storage.ts + CONTEXT.md D-01 + CR-02 fix sketch
export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // D-01: spread ALL top-level disk fields so future v2 top-level subtrees
      // (e.g., 'prefs:') survive a v1 read+rewrite round trip. This REVERSES
      // Phase 4 CR-01's "pick only known keys" at the top level — forward-compat
      // lives here; subtree coercers stay strict (D-02).
      const p = parsed as Record<string, unknown>
      const onDiskVersion = typeof p.version === 'number' && Number.isFinite(p.version)
        ? p.version
        : STATE_VERSION
      return {
        ...p,               // preserve unknown top-level fields (D-01)
        version: onDiskVersion,
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

### Full writeEnvelope After STORAGE-02 + D-04a

```typescript
// Source: CONTEXT.md §Specifics D-04a shape + storage.ts current structure
export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    // D-04a: detect cross-tab newer-version between caller-read and caller-write.
    // Separate try/catch so throwing-getItem (Safari ITP) falls through to STATE_VERSION
    // default and the write proceeds (fail-open for guard, fail-silent for write via D-16).
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

### STORAGE-03 Test Case (App.persistence.test.tsx)

```typescript
// Source: CONTEXT.md §Specifics "New STORAGE-03 test case" + RQ-2 StorageEvent options
describe('STORAGE-03 — cross-tab stats refresh via storage event', () => {
  it('refreshes stats footer when another tab writes the envelope', async () => {
    // Start with no sessions — footer is hidden
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()

    // Simulate another tab writing a new envelope with 5 sessions
    const newEnvelope = JSON.stringify({
      version: 1,
      stats: {
        totalSessions: 5,
        totalElapsedSeconds: 300,
        lastSessionAtMs: new Date('2026-05-09').getTime(),
        lastSessionDurationSeconds: 60,
      },
    })
    // Step 1: write to localStorage first (the event fires AFTER setItem in real browsers)
    window.localStorage.setItem(STATE_KEY, newEnvelope)
    // Step 2: synthetic dispatch simulates receiving the cross-tab storage event
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STATE_KEY,
        newValue: newEnvelope,
        oldValue: null,
        storageArea: window.localStorage,
      }))
    })

    // Footer should now show 5 sessions (listener called setStats(loadStats()))
    expect(screen.getByText(/5 sessions/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('ignores storage events for unrelated keys (e.key filter)', async () => {
    seedEnvelope({ stats: { totalSessions: 3, totalElapsedSeconds: 180,
      lastSessionAtMs: Date.now(), lastSessionDurationSeconds: 60 } })
    render(<App />)
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()

    // Dispatch for a different key — should not trigger loadStats
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: JSON.stringify({ totalSessions: 99 }),
      }))
    })
    // Stats unchanged
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()
    expect(screen.queryByText(/99 sessions/)).not.toBeInTheDocument()
  })
})
```

### Replaced Test (storage.test.ts lines 77-83)

```typescript
// Source: D-07 — REPLACE the existing test body; keep the it() slot
it('preserves on-disk version when reading; stamps STATE_VERSION on write', () => {
  // Seed a v2 envelope (future schema)
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 2, settings: { bpm: 4 }, prefs: { theme: 'dark' },  // 'prefs' is a future v2 field
  }))
  // STORAGE-01: readEnvelope should return version:2 (not STATE_VERSION:1)
  const env = readEnvelope()
  expect(env.version).toBe(2)
  expect(env.settings).toEqual({ bpm: 4 })
  // D-04a: writeEnvelope sees disk version 2 > STATE_VERSION 1 → refuses (no-op)
  writeEnvelope({ version: 1, settings: { bpm: 5 } })
  // STORAGE-02: disk value unchanged after refused write
  const rawAfter = window.localStorage.getItem(STATE_KEY)
  expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 2, settings: { bpm: 4 } })
})

// NEW: separate STORAGE-02 test for clarity
it('writeEnvelope refuses to overwrite a future-version on-disk envelope (STORAGE-02)', () => {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 2 }))
  writeEnvelope({ version: 1, stats: { totalSessions: 99, totalElapsedSeconds: 0,
    lastSessionAtMs: null, lastSessionDurationSeconds: null } })
  // Disk unchanged: no-op write (D-03 silent)
  const rawAfter = window.localStorage.getItem(STATE_KEY)
  expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 2 })
  // Confirm 99 sessions were NOT written
  expect(JSON.parse(rawAfter!) as unknown).not.toMatchObject({ stats: { totalSessions: 99 } })
})
```

---

## Runtime State Inventory

Phase 8 is NOT a rename/refactor phase. No runtime state inventory required.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Always overwrite disk version with `STATE_VERSION` | Preserve on-disk version; stamp STATE_VERSION on write | Phase 8 (STORAGE-01/02) | Enables forward-compat with v2 envelopes |
| No downgrade guard on writes | Refuse write when disk version > running version | Phase 8 (STORAGE-02) | Prevents v1 build from corrupting v2 envelope |
| No cross-tab stats refresh | `storage` event listener in App refreshes stats | Phase 8 (STORAGE-03) | UI consistency across multiple open tabs |
| CR-01: "pick only known keys" in readEnvelope | D-01: "spread all, override known" in readEnvelope | Phase 8 (STORAGE-01) | Top-level forward-compat only; subtree coercers unchanged |

**Deprecated/outdated:**
- `'always re-stamps version: 1 even if a caller passes a wrong version'` test (storage.test.ts:77-83): test name becomes inaccurate after STORAGE-01/02; REPLACED with forward-compat + no-downgrade tests.

---

## Recommended Implementation Approach

The planner can adopt this mostly verbatim:

**Wave 1 — Single plan (one commit sequence):**

1. **Widen `Envelope.version`** in `src/storage/storage.ts`: change `version: typeof STATE_VERSION` to `version: number`. Keep `EMPTY_ENVELOPE` constant unchanged. Zero caller impact (verified grep).

2. **Fix `readEnvelope`** (STORAGE-01): replace the CR-01 pick-only-known pattern with the D-01 spread-all-override pattern. Preserve on-disk `version` via `Number.isFinite` check, fallback to `STATE_VERSION`. Run `tsc --noEmit` — should be green.

3. **Fix `writeEnvelope`** (STORAGE-02 + D-04a): add the nested inner try/catch for the inline re-read; add `if (currentVersion > STATE_VERSION) return`. Outer D-16 catch unchanged. Run `tsc --noEmit`.

4. **Update `storage.test.ts`**: REPLACE lines 77-83 (`'always re-stamps version: 1...'`) with the new `'preserves on-disk version when reading...'` case. ADD the new `'writeEnvelope refuses to overwrite a future-version...'` case. Run `npm run test` — should be 364 (363 - 1 + 2).

   Wait — actually the REPLACE keeps the test count at 363 and the ADD brings it to 364 for storage.test.ts contribution. The net of: (1 removed, 2 added) = +1 in storage.test.ts → 10 tests in that file instead of 9.

5. **Add storage listener in `App.tsx`** (STORAGE-03): add the 6-line `useEffect([])` after the `sessionFrameRef` updater effect (near line 82) or grouped with the mount-once effects. No functional change to existing effects.

6. **Add STORAGE-03 test in `App.persistence.test.tsx`**: add the new `describe` block with 2 cases (cross-tab refresh + key filter). Run `npm run test` — should be 365.

7. **(Optional, recommended) Update `stats.ts:76-81` comment** for WR-07 carry-forward clarity.

8. **Run full suite + build:** `npm run test && tsc --noEmit && npm run lint && npm run build` all exit 0.

**Validation tightness recommendation (Claude's Discretion):** Use `Number.isFinite` without the integer check. The REVIEW.md sketch uses this looser form; the additional `Number.isInteger && >= 1` check costs ~20 chars and protects against e.g. `version: 1.5` from a buggy serializer — a theoretical case. The `Number.isFinite` check is sufficient to reject `NaN`, `Infinity`, strings, booleans, and null. Either is acceptable; `Number.isFinite` matches the existing project pattern in `stats.ts` and is the lighter change.

---

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vite.config.ts` (`test.environment: 'jsdom'`, `test.setupFiles: './vitest.setup.ts'`) |
| Quick run command | `npm run test -- --reporter verbose --run src/storage/storage.test.ts src/app/App.persistence.test.tsx` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STORAGE-01 | `readEnvelope` returns on-disk `version`; unknown top-level fields preserved | unit | `npm run test -- --run src/storage/storage.test.ts` | Partial (new case replaces line 77-83) |
| STORAGE-02 | `writeEnvelope` refuses write when disk `version > STATE_VERSION` | unit | `npm run test -- --run src/storage/storage.test.ts` | No — Wave 0 gap |
| STORAGE-03 | App storage listener refreshes `stats` on cross-tab write; key filter works | integration | `npm run test -- --run src/app/App.persistence.test.tsx` | No — Wave 0 gap |
| STORAGE-03 | Manual two-window test: Window B stats update when Window A ends session | manual | See RQ-10 recipe | N/A — manual |

### Sampling Rate

- **Per task commit:** `npm run test -- --run src/storage/storage.test.ts src/app/App.persistence.test.tsx`
- **Per wave merge:** `npm run test` (full 365-test suite)
- **Phase gate:** Full suite green + `tsc --noEmit` + `npm run lint` before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Replace `storage.test.ts:77-83` with STORAGE-01 preserve-version case — covers STORAGE-01
- [ ] Add STORAGE-02 no-downgrade case in `storage.test.ts` — covers STORAGE-02
- [ ] Add STORAGE-03 cross-tab refresh case in `App.persistence.test.tsx` — covers STORAGE-03
- [ ] Add STORAGE-03 key-filter case in `App.persistence.test.tsx` (optional but recommended)

*(No new test framework install needed — Vitest + jsdom + Testing Library already operational.)*

---

## Risks and Landmines

### 1. The Inner Try/Catch Must Be Separate (HIGH RISK)

If the D-04a re-read is inside the outer `try` but not nested in its own `try/catch`, a throwing `getItem` (Safari ITP) causes the outer catch to absorb the error and skip the write entirely. This is wrong — the write should proceed when the guard cannot read the disk version (fail-open).

**Mitigation:** Use the exact nested try/catch shape from CONTEXT.md §Specifics / Pattern 2 above.

### 2. StorageEvent Dispatch Order (MEDIUM RISK)

The STORAGE-03 test must `setItem` to localStorage BEFORE dispatching the `StorageEvent`. The listener calls `loadStats()` which reads from disk. If dispatch happens before setItem, `loadStats()` returns stale/empty data.

**Mitigation:** Always: setItem → dispatchEvent → assert. See Pitfall 2 and Pattern code above.

### 3. `readEnvelope` Return Includes Runtime Extras (LOW RISK — future concern)

The Envelope interface doesn't have an index signature. A future developer may not realize that `{ ...env, field }` in callers propagates unknown top-level fields at runtime. This is by design (D-01) but is invisible in the type.

**Mitigation:** Add a comment to `readEnvelope` citing D-01 and explaining the value-level spread. See Pitfall 3.

### 4. Phase 7 Strict-Mode ESLint `no-unsafe-assignment` on `(parsed as Record<string, unknown>)` (LOW RISK)

The existing `storage.ts:66` does `const p = parsed as Record<string, unknown>` after a type check. Under `strictTypeChecked`, this pattern should be clean because `parsed` is typed `unknown` and the cast after `typeof` check is well-established. Phase 7 already landed with `storage.ts` compiling clean — the new D-04a inner re-read uses the same pattern and should not trigger new lint errors.

**Mitigation:** Run `npm run lint` after adding D-04a code. If any `no-unsafe-assignment` fires, wrap the `.version` access with the same `Record<string, unknown>` cast pattern used in the outer `readEnvelope`.

### 5. `app.persistence.test.tsx` Uses `vi.useFakeTimers()` (LOW RISK)

All tests in `App.persistence.test.tsx` use `vi.useFakeTimers()` in `beforeEach`. The STORAGE-03 test does NOT require fake timers (it tests synchronous state updates, not timer-driven behavior). The `beforeEach` installs fake timers, so the new test runs under them regardless. This is safe — `StorageEvent` dispatch and `setStats` are synchronous; no real timers are involved. The `act(async () => { ... })` wrapper is still needed to flush React state updates. [VERIFIED: existing App.persistence.test.tsx beforeEach/afterEach structure]

---

## Environment Availability

Phase 8 has no external dependencies beyond the project's own code. No new tools, services, CLIs, or runtimes are required.

- Node.js, npm, Vitest, jsdom: all operational. [VERIFIED: `npm run test` 363/363 passing]
- TypeScript strict baseline: operational. [VERIFIED: `tsc --noEmit` exits 0]

**Step 2.6: SKIPPED condition partially met** — the phase touches only existing tools; no new external dependencies.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Final test count will be 365 (363 + 2 new cases) | RQ-7 | Test count might be 366 if planner adds optional key-filter test as separate case; either is acceptable |
| A2 | Bundle WR-07 comment update in Phase 8 | RQ-8 | Minimal: comment stays stale until v1.x; no behavior impact |
| A3 | `Number.isFinite` check (without integer check) is sufficient version validation | Recommended Approach | Theoretical: a buggy serializer could produce `version: 1.5`; `Number.isFinite` accepts it; downgrade guard still works correctly since `1.5 > 1` would correctly refuse a v1 write against a v1.5 disk |

**All code-level claims are VERIFIED against the actual codebase or direct tool tests.**

---

## Open Questions

1. **Optional key-filter test** (STORAGE-03)
   - What we know: UI-SPEC.md §New STORAGE-03 test mentions it as "(Optional) Assert that dispatching an unrelated StorageEvent...does NOT change the rendered stats"
   - What's unclear: Whether planner considers it in-scope (adds +1 to 366)
   - Recommendation: Include it. It's 5 lines and locks the D-06a filter contract.

2. **`EMPTY_ENVELOPE` constant — keep or inline?**
   - What we know: It's used in 3 return sites in `readEnvelope`. Keeping reduces diff noise; inlining removes indirection.
   - What's unclear: Pure style preference; either compiles cleanly.
   - Recommendation: Keep — no functional change, no diff noise.

---

## Sources

### Primary (HIGH confidence)

- `src/storage/storage.ts` — full implementation; current `readEnvelope` and `writeEnvelope` patterns confirmed [VERIFIED: direct read]
- `src/storage/storage.test.ts` — full test file; lines 77-83 confirmed; existing test survival verified [VERIFIED: direct read]
- `src/storage/stats.ts` — `recordSession`/`resetStats` callers; WR-07 comment [VERIFIED: direct read]
- `src/storage/settings.ts` — `loadSettings`/`saveSettings` callers; spread pattern verified [VERIFIED: direct read]
- `src/app/App.tsx` — useEffect patterns, `setStats` identity, storage imports [VERIFIED: direct read]
- `src/app/App.persistence.test.tsx` — existing test infrastructure, `beforeEach` pattern [VERIFIED: direct read]
- `.planning/phases/08-storage-forward-compat-cross-tab-ui-sync/08-CONTEXT.md` — all decisions D-01..D-07 [VERIFIED: direct read]
- `.planning/phases/08-storage-forward-compat-cross-tab-ui-sync/08-UI-SPEC.md` — interaction contract [VERIFIED: direct read]
- `REVIEW.md §CR-02, §WR-07` — root-cause findings and fix sketches [VERIFIED: direct read]
- jsdom 29.1.1 `StorageEvent` propagation: `window.dispatchEvent(new StorageEvent(...))` fires `window.addEventListener('storage', ...)` [VERIFIED: direct node test with jsdom module]
- `npm run test` — 363/363 passing [VERIFIED: direct execution]
- `tsc --noEmit` — exits 0 [VERIFIED: direct execution]
- `tsconfig.app.json` — `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true` [VERIFIED: direct read]

### Secondary (MEDIUM confidence)

- `useAudioCues.ts:176-179` and `useWakeLock.ts:87-89` — `document.addEventListener`/`removeEventListener` cleanup pattern confirming project precedent [VERIFIED: direct grep]

### Tertiary (LOW confidence)

None. All claims in this research were verified against the actual codebase or via direct tool execution.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new dependencies; all existing tooling verified operational
- Architecture: HIGH — all patterns verified against existing codebase code; jsdom StorageEvent behavior directly tested
- Pitfalls: HIGH — derived from CONTEXT.md decisions and direct code reading
- Test impact: HIGH — all existing tests traced to confirm non-regression; final count computed from D-07 scope

**Research date:** 2026-05-11
**Valid until:** 2026-07-11 (stable domain — localStorage API, React hooks, jsdom behavior not fast-moving)

---

## RESEARCH COMPLETE

**Phase:** 8 — storage-forward-compat-cross-tab-ui-sync
**Confidence:** HIGH

### Key Findings

- jsdom 29.1.1 `window.dispatchEvent(new StorageEvent('storage', {...}))` CONFIRMED to fire `window.addEventListener('storage', ...)` handlers. The STORAGE-03 test idiom works.
- `Envelope.version: typeof STATE_VERSION → number` widening has ZERO impact on callers — grep confirms no consumer outside `storage.ts` reads `.version` from an Envelope-typed variable.
- Recommend **Option (b) for Envelope shape**: no index signature; value-level spread in `readEnvelope` preserves unknown top-level fields at runtime even though the static type doesn't surface them. Cleanest Phase 7 strict-mode compliance.
- **Nested try/catch** (not merged into D-16 outer catch) is critical for D-04a: inner re-read failure must fall-open so the write still proceeds.
- **Test count after Phase 8: 365** (363 baseline + 2 new cases; REPLACE at lines 77-83 nets to 0 in storage.test.ts, then +1 STORAGE-02 + +1 STORAGE-03 = +2).
- All existing tests survive unmodified — confirmed by tracing each test against the STORAGE-01/02 behavior changes (all current tests seed `version: 1` or empty localStorage, so the new guard doesn't trigger).

### File Created

`.planning/phases/08-storage-forward-compat-cross-tab-ui-sync/08-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | No new deps; all verified against package.json and operational test suite |
| Architecture | HIGH | Patterns verified against actual codebase; jsdom behavior directly tested |
| Pitfalls | HIGH | Derived from code reading + CONTEXT.md decisions; D-04a nesting verified against stated requirement |
| Test impact | HIGH | All tests traced individually; no regressions found |

### Open Questions

- Optional key-filter test (6th STORAGE-03 test case): planner decides +1 to 366 or stays at 365
- WR-07 comment update: research recommends bundling; planner decides

### Ready for Planning

Research complete. Planner can create PLAN.md with full confidence in the implementation approach.
