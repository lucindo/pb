---
phase: 04-local-memory-practice-stats
reviewed: 2026-05-10T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/app/App.persistence.test.tsx
  - src/app/App.tsx
  - src/components/ResetStatsDialog.test.tsx
  - src/components/ResetStatsDialog.tsx
  - src/components/StatsFooter.test.tsx
  - src/components/StatsFooter.tsx
  - src/hooks/useAudioCues.ts
  - src/storage/format.test.ts
  - src/storage/format.ts
  - src/storage/index.ts
  - src/storage/settings.test.ts
  - src/storage/settings.ts
  - src/storage/stats.test.ts
  - src/storage/stats.ts
  - src/storage/storage.test.ts
  - src/storage/storage.ts
  - vitest.setup.ts
findings:
  critical: 1
  warning: 9
  info: 5
  total: 15
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-05-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 4 implements local persistence (settings, mute, stats) with silent-fallback storage, a stats footer with reset dialog, and a single end-of-session write site in `App.tsx`. The architecture is sound — the dual `runningSnapshotRef` / `recordedSessionKeyRef` design correctly avoids the "lost-state on transition out of running" bug that the discriminated union would otherwise cause, and per-field coercers enforce D-15.

However, the implementation has one BLOCKER (an envelope read that propagates unvalidated keys back to disk on every save, breaking D-15's discard-bad-fields invariant for non-target subtrees), several correctness/quality WARNINGs around cross-storage instance pollution in the test setup, locale-dependent date assertions, an HTML/UX layout smell, and a few INFO-level cleanup items.

## Critical Issues

### CR-01: `readEnvelope` re-stamps `version` but propagates unvalidated keys; every save re-writes drift to disk

**File:** `src/storage/storage.ts:32-37`
**Issue:** `readEnvelope` casts the parsed object as `Envelope` and spreads it, only overriding `version`. **All other top-level keys flow through verbatim** — including unknown / drifted / oversized / malicious fields the user injected via DevTools or that drifted from a future schema.

This breaks D-15's per-field validate-and-fallback contract once a `save*` operation runs:

```ts
// settings.ts:55
export function saveSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)          // env carries through unknown keys + un-coerced subtrees
  writeEnvelope({ ...env, settings }, deps) // and writes them BACK to disk
}
```

Concrete failure: a user has stored `{ version: 1, settings: <drifted>, mute: 'true' /* string */, stats: <drifted>, junk: 'x' }`. They toggle mute. `loadMute()` returns `false` (correctly coerced). They click Mute → `saveMute(true)` runs. The `readEnvelope` returns the raw object. `writeEnvelope({ ...env, mute: true })` persists `{ version: 1, settings: <drifted>, mute: true, stats: <drifted>, junk: 'x' }`. **The drifted settings + drifted stats + junk key are now PERMANENTLY re-saved** and will keep round-tripping every save.

Worse: the per-field coercers run only at `load` time. So the next `loadStats()` returns `ZERO`, but `saveStats`-via-`saveMute` re-persists the drifted raw stats subtree, which the next `loadStats` again coerces to ZERO. The user appears to have working stats but the disk envelope is permanently dirty, and any future migration will see junk fields.

Additional security concern: a malicious webpage that shares the same origin (none in v1, but defense-in-depth) could write a giant `junk` field; every legitimate save would re-serialize it, eventually triggering quota errors silently absorbed by D-16, leaving the user with a non-functional but non-erroring storage layer.

**Fix:** Coerce every subtree at the read boundary so unknown / un-coerceable keys never flow through saves. Either:

```ts
// In storage.ts — return a strictly-shaped envelope with only the four known keys.
export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const p = parsed as Record<string, unknown>
      // Pick ONLY the known keys; drop everything else.
      return {
        version: STATE_VERSION,
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
```

Or: add a `compactEnvelope` step that runs the per-subtree coercers (`coerceSettings` / `coerceMute` / `coerceStats`) before write so the disk image is always canonical.

The first approach is cheaper. Either makes save-after-load idempotent for valid data and discards drift instead of re-persisting it.

## Warnings

### WR-01: Test localStorage polyfill mutates `Storage.prototype` globally and shares one Map between localStorage AND sessionStorage

**File:** `vitest.setup.ts:22-60`
**Issue:** The polyfill assigns implementations to `Storage.prototype.{getItem,setItem,removeItem,clear,key}` and binds them to a closure-captured `_store` Map. It then assigns `fakeStorage` (an Object.create(Storage.prototype) with no own data) to `window.localStorage` AND a SECOND `Object.create(Storage.prototype)` to `window.sessionStorage`. Both objects share **the same `_store` Map** because the prototype methods close over the single `_store` variable.

Consequences:
1. Any future test (or the SUT) that uses `sessionStorage` will see localStorage data and vice-versa — silent cross-store contamination.
2. Calling `window.localStorage.clear()` in `vitest.setup.ts:11` ALSO wipes sessionStorage. Latent failure: a test relying on sessionStorage being preserved across the global beforeEach would break unexpectedly.
3. The polyfill replaces `Storage.prototype.getItem` etc. on the *real* `Storage.prototype` shipped by Node 25 / jsdom, mutating shared state for the whole test run. If any test imports another module that does feature-detection (`Storage.prototype.getItem === undefined`), the result will be wrong.

Currently latent (no `sessionStorage` users in src/), but this is a footgun for the next person who reaches for sessionStorage.

**Fix:** Give each store its own backing Map and per-instance method copies, OR install on the fake objects directly without touching `Storage.prototype`:

```ts
function makeFakeStorage(): Storage {
  const store = new Map<string, string>()
  const fake = Object.create(Storage.prototype) as Storage
  Object.defineProperties(fake, {
    getItem: { value: (k: string) => store.get(k) ?? null },
    setItem: { value: (k: string, v: string) => { store.set(k, String(v)) } },
    removeItem: { value: (k: string) => { store.delete(k) } },
    clear: { value: () => { store.clear() } },
    key: { value: (i: number) => [...store.keys()][i] ?? null },
    length: { get: () => store.size },
  })
  return fake
}
Object.defineProperty(window, 'localStorage', { writable: true, configurable: true, value: makeFakeStorage() })
Object.defineProperty(window, 'sessionStorage', { writable: true, configurable: true, value: makeFakeStorage() })
```

Caveat: `vi.spyOn(Storage.prototype, 'getItem')` in storage.test.ts depends on the prototype-installed methods. Either keep prototype installation but give each fake its own `_store` (e.g. via a WeakMap keyed on the fake instance), or migrate the few prototype-spy tests to `vi.spyOn(window.localStorage, 'getItem')`.

### WR-02: `formatTotalMinutes` flips to "hours" branch BEFORE the displayed hours value reaches 1.0, producing "1.0 hours" for inputs from 60:00 through 60:35

**File:** `src/storage/format.ts:19-24`
**Issue:** The branch condition is `minutes < 60` (using `Math.floor(totalSeconds/60)`), but the displayed value is `(totalSeconds / 3600).toFixed(1)`. For `totalSeconds` in `[3600, 3635]`, the boundary fires (minutes=60) but the hours value rounds to "1.0":

- 3600 s → `1.0000.toFixed(1)` = "1.0 hours" ✓ (test asserts this)
- 3630 s (60:30) → `1.0083.toFixed(1)` = "1.0 hours" — same as 60:00, no UX progression
- 3660 s (61:00) → `1.0166.toFixed(1)` = "1.0 hours" — STILL no progression
- 3690 s (61:30) → `1.025.toFixed(1)` = "1.0 hours"

So a user who has practiced 60:00 and a user who has practiced 61:30 see the SAME footer string. The first decimal increment ("1.1 hours") doesn't appear until ~63 minutes. This contradicts the spirit of D-06 ("decimal hours like `2.1 hours, 17.4 hours`") — the decimal is supposed to communicate progression.

The boundary condition should match: either use `(totalSeconds / 3600) >= 1` (i.e. switch only once the rendered hours value rounds up to ≥ 1.0 distinct from the minutes display), or make the flip happen LATER once "X.X hours" is meaningfully different from "60 min" / "61 min".

Spec literal-reading allows the current behavior (60+ min → hours), so this is a WARNING (UX defect, not contract violation). But test `flips to hours format at exactly 60 minutes ("1.0 hours")` (format.test.ts:24) actively LOCKS IN this anti-progression behavior — if it's intentional, document it; if not, fix the boundary.

**Fix:** EITHER (a) raise the flip threshold to ~75 minutes so the hours decimal is meaningful, OR (b) keep `minutes` for the 60-69 range and switch only at 70+. Concrete:

```ts
export function formatTotalMinutes(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = totalSeconds / 3600
  // Only show "1.0 hours" if it's actually distinguishable from "60 min".
  // Otherwise keep showing minutes through the noisy-decimal range.
  if (hours < 1.05) return `${minutes} min`
  return `${hours.toFixed(1)} hours`
}
```

Update the corresponding test at `format.test.ts:24` to reflect chosen behavior.

### WR-03: Date-formatting tests are locale-dependent; will break in non-en CI environments

**File:** `src/storage/format.test.ts:46-63`, `src/components/StatsFooter.test.tsx:38-40`, `src/app/App.persistence.test.tsx:210, 223`
**Issue:** The implementation passes `undefined` as the locale to `Intl.DateTimeFormat`, which uses the system default. Tests assert `toMatch(/May 7/)`. In a non-English CI runner (e.g. `LANG=fr_FR.UTF-8`), `Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })` produces `7 mai` — the regex fails. Even within English locales, the position of month/day differs (UK vs US: "7 May" vs "May 7"), and some locales include a comma or non-breaking space (`May 7`) that breaks naive regex matches.

This is not a production bug (the implementation is correct: `undefined` locale is the right call for user-facing display), but it makes the test suite environment-dependent. CI config drift is the most common failure mode.

**Fix:** EITHER (a) hardcode the test locale for assertion stability:

```ts
// In format.test.ts
import { vi } from 'vitest'
beforeAll(() => {
  vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: function(_locale, opts) {
    return Intl.DateTimeFormat('en-US', opts)
  }})
})
```

OR (b) assert structurally: assert that `formatLastSessionDate` includes a 4-character "May" substring AND a "7" substring without depending on order:

```ts
expect(out).toMatch(/May/i)
expect(out).toMatch(/\b7\b/)
```

Preferred: option (b) — keeps implementation locale-correct while making tests stable.

### WR-04: `<button>` with `min-h-[44px]` rendered inline inside `<p>` produces inconsistent line height; visible "Reset" text does not meet 44×44 hit-area floor in the way D-13 specifies

**File:** `src/components/StatsFooter.tsx:37-52`
**Issue:** D-13 requires the inline Reset link to meet the 44×44 hit-area floor "via padded tap-target around the visible inline label, not by enlarging the visible text". The implementation correctly does NOT enlarge the text (it uses `text-sm` from the parent `<div>`), but it places `inline-flex min-h-[44px] min-w-[44px]` on a `<button>` *inline-flow* within a `<p>` whose parent `<div>` uses `leading-6` (= 24 px line-height).

Two issues result:
1. The button's intrinsic 44 px height conflicts with the 24 px line-box of the surrounding text. Browsers handle this by extending the line-box to 44 px ONLY for the line containing the button — the previous `<p>` (Line 1) keeps its 24 px line-height, producing visible asymmetry between Line 1 and Line 2 spacing.
2. The 44×44 box is centered on the baseline of the inline text, so the *visible* tap target overflows BOTH above and below the surrounding text. Touch-area testing tools (e.g. Lighthouse mobile audit, WCAG 2.5.5) measure based on the rendered button rect, not the text box, so the test at `StatsFooter.test.tsx:60-65` passes — but the visual outcome is uneven line heights.

Empty-state regression: when `hasLastSession === false`, Line 2 renders just the Reset button alone — but the button still has `min-w-[44px]` and `inline-flex` which means it's stretched to 44 px wide with text "Reset" centered. That's a fine rendering; just be aware that D-08's literal "Last: May 7 · Reset" never appears for empty-last-session users.

**Fix:** Wrap the Reset button in a flex container that handles vertical alignment explicitly, OR switch the button to `display: inline-block` with explicit padding (the 44×44 floor is achieved through padding around a small visible label):

```tsx
<p className="mt-1 inline-flex flex-wrap items-center justify-center gap-x-2">
  {hasLastSession && <span>Last: {formatLastSessionDate(stats.lastSessionAtMs as number)} · {formatLastSessionDuration(stats.lastSessionDurationSeconds as number)} ·</span>}
  <button type="button" onClick={onResetClick} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 underline ...">
    Reset
  </button>
</p>
```

Note: a `<p>` containing flex layout via `inline-flex` is unusual; a `<div>` may be more appropriate semantically.

### WR-05: `STATE_KEY` is exported from the public storage barrel and imported by tests, making the storage key a load-bearing API surface

**File:** `src/storage/index.ts:4`, `src/storage/storage.ts:9`, `src/app/App.persistence.test.tsx:6`
**Issue:** `STATE_KEY = 'hrv:state:v1'` is exported through `storage/index.ts` (`export * from './storage'`) which makes it part of the module's public API. Tests at `App.persistence.test.tsx:6` import it directly. This couples future renames / schema bumps to a test-suite migration.

More importantly, the `:v1` suffix in the key is a **second versioning scheme** alongside the `version: 1` field stored INSIDE the envelope. If a future migration bumps to v2, you have two choices: (a) change the key and inside-version (orphans the v1 storage), (b) keep the key and bump the inside-version (forces migration logic at read). Without a migration plan or comment, future maintainers will face the choice ambiguously.

**Fix:** EITHER (a) document the dual-versioning convention in `storage.ts` and `04-CONTEXT.md`, OR (b) drop the `:v1` from the key (use `'hrv:state'`) and rely solely on the in-envelope `version` field for migration. Tests should not depend on the literal storage key — assert via the public load/save API instead:

```ts
// app/App.persistence.test.tsx — replace seedEnvelope() with:
import { saveSettings, saveMute, recordSession } from '../storage'
function seed(opts) {
  if (opts.settings) saveSettings(opts.settings)
  if (opts.mute !== undefined) saveMute(opts.mute)
  if (opts.stats) /* simulate via recordSession or write via dedicated fixture helper */
}
```

### WR-06: `coerceStats` requires integer `lastSessionAtMs`, breaking write-then-read idempotence for tests that inject fractional `now()`

**File:** `src/storage/stats.ts:27-33, 42`
**Issue:** `isFiniteNonNegativeInt` requires `Number.isInteger(v)`. `recordSession` writes `lastSessionAtMs: now()` where `now` defaults to `Date.now` (always integer in JS) but is documented as the test injection seam (D-18). If any future test injects a fractional `now: () => 1700000000000.5` (e.g. for sub-millisecond timestamps), the value is written but **on the next `loadStats()` it coerces to `null`**.

Currently latent: no test injects a non-integer now. But `D-18` explicitly invites tests to control timestamps — a future test author could naturally use `performance.now()` as `now`, which on most browsers returns sub-ms floats.

The mismatch breaks the round-trip invariant: `recordSession(...).lastSessionAtMs !== loadStats().lastSessionAtMs` for non-integer `now()`.

**Fix:** Either (a) `Math.floor(now())` before writing, or (b) drop the `Number.isInteger` check from `isFiniteNonNegativeInt` for the timestamp field (allow any non-negative finite number):

```ts
function isFiniteNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}
function isFiniteNonNegativeNumberOrNull(v: unknown): v is number | null {
  return v === null || isFiniteNonNegativeNumber(v)
}

// stats.ts:42-43
lastSessionAtMs:            isFiniteNonNegativeNumberOrNull(r.lastSessionAtMs)     ? r.lastSessionAtMs           : null,
lastSessionDurationSeconds: isFiniteNonNegativeNumberOrNull(r.lastSessionDurationSeconds) ? r.lastSessionDurationSeconds : null,
```

(Keep `isFiniteNonNegativeInt` for `totalSessions` and `totalElapsedSeconds` — those are genuinely integer-only.)

### WR-07: `recordSession` reads the envelope twice (once via `loadStats`, once via `readEnvelope`); race window for cross-tab contamination

**File:** `src/storage/stats.ts:57-71`
**Issue:**

```ts
export function recordSession(elapsedMs, isComplete, deps = {}): PersistedStats {
  const stats = loadStats(deps)               // read #1 (calls readEnvelope internally)
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) return stats
  ...
  const env = readEnvelope(deps)              // read #2 — could differ if another tab wrote between calls
  writeEnvelope({ ...env, stats: next }, deps)
  return next
}
```

If a second tab writes to the envelope between the two reads (e.g. user has two HRV tabs open and resets in one while finishing a session in the other), `next.totalSessions = stats.totalSessions + 1` is computed from read #1 but the write merges with read #2's settings/mute. Result: `totalSessions` count is based on stale data from read #1 even though the disk had been reset.

Concrete failure: tab A finishes a session. tab B clicks Reset. Tab A writes `totalSessions = previousCount + 1`, NOT `1`. The reset is silently undone with the previous count restored.

Cross-tab sync isn't a phase 4 requirement, but this is a latent foot-gun. v1 doesn't synchronize tabs anyway, so this is WARNING not BLOCKER.

**Fix:** Either (a) collapse to one read:

```ts
export function recordSession(elapsedMs, isComplete, deps = {}) {
  const env = readEnvelope(deps)
  const stats = coerceStats(env.stats)
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) return stats
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const now = deps.now ?? Date.now
  const next: PersistedStats = { ... }
  writeEnvelope({ ...env, stats: next }, deps)
  return next
}
```

Or (b) document the cross-tab limitation and add a `storage` event listener at App-level for v2.

### WR-08: `confirmReset` calls `setStats(loadStats())` without verifying the disk write actually succeeded; UI silently shows old stats if D-16 quota path hit

**File:** `src/app/App.tsx:270-274`
**Issue:**

```ts
const confirmReset = useCallback(() => {
  resetStats()           // silent on failure (D-16)
  setStats(loadStats())  // re-reads from disk
  setResetDialogOpen(false)
}, [])
```

If `resetStats()` failed silently (Safari ITP, quota, private mode), the disk still holds the OLD stats. `loadStats()` returns the OLD stats. `setStats(...)` sets React state to the OLD stats. The dialog closes but the footer continues to display the unchanged numbers. The user clicked Reset, saw nothing happen, and now believes the button is broken.

D-16 mandates silent fallback for storage write failures, but the LOCAL UI state should still reflect the user's intent. The user clicked Reset — the RAM-side state should zero out regardless of whether the disk write succeeded. (This mirrors Phase 3 D-10's posture: the visual UI continues even when audio fails.)

**Fix:** Update React state from a known zero-state, not from a re-read of disk:

```ts
const ZERO_STATS: PersistedStats = {
  totalSessions: 0,
  totalElapsedSeconds: 0,
  lastSessionAtMs: null,
  lastSessionDurationSeconds: null,
}

const confirmReset = useCallback(() => {
  resetStats()
  setStats(ZERO_STATS)  // optimistic — disk may or may not have synced (D-16)
  setResetDialogOpen(false)
}, [])
```

(Or export `ZERO_STATS` from `stats.ts` to avoid duplication.)

Same pattern applies to `recordSession`'s return value, which `App.tsx` line 329 correctly uses (`setStats(updated)`) — this is internally consistent except for the reset path.

### WR-09: `<p>` in `StatsFooter.tsx` contains a fragment with a trailing space-padded ` · ` separator that renders awkwardly when `hasLastSession === false`

**File:** `src/components/StatsFooter.tsx:37-52`
**Issue:** When `hasLastSession === false`, the `<p>` line 2 renders only the Reset button. When `hasLastSession === true`, it renders `Last: May 7 · 10 min · Reset` correctly.

But examine the JSX:

```tsx
{hasLastSession && (
  <>
    Last: {date} ·{' '}
    {duration}
    {' · '}
  </>
)}
<button>Reset</button>
```

The `{' · '}` text node is conditionally included BEFORE the button. When `hasLastSession === false`, only the button renders. When `hasLastSession === true`, the trailing ` · ` separator is followed immediately by the button. There's an inconsistency: the leading "Last: " uses literal-text + `{' '}` for spacing, but the trailing separator uses `{' · '}` (full string). This works but is fragile to reorder.

More importantly: when `hasLastSession === false`, `formatLastSession` returns null (the helper exists in `format.ts:46-49`). The component does NOT use this helper — it inlines the string formatting. This is duplicated logic.

**Fix:** Use the `formatLastSession` helper that already exists in `format.ts`:

```tsx
import { formatSessionCount, formatTotalMinutes, formatLastSession } from '../storage'

export function StatsFooter({ stats, onResetClick }: StatsFooterProps) {
  const lastLine = formatLastSession(stats)
  return (
    <div className="mt-6 text-center text-sm leading-6 text-[var(--color-breathing-muted)]">
      <p>{formatSessionCount(stats.totalSessions)} · {formatTotalMinutes(stats.totalElapsedSeconds)} total</p>
      <p className="mt-1">
        {lastLine && <>{lastLine} · </>}
        <button type="button" onClick={onResetClick} className="...">Reset</button>
      </p>
    </div>
  )
}
```

This eliminates the unused `formatLastSession` (currently dead code — see IN-01) and removes the manual inline composition.

## Info

### IN-01: `formatLastSession` exported from `format.ts` is unused by the only consumer (`StatsFooter.tsx`)

**File:** `src/storage/format.ts:46-49`, `src/components/StatsFooter.tsx:38-43`
**Issue:** `formatLastSession` is exported and tested (`format.test.ts:74-99`) but never imported anywhere in src. `StatsFooter.tsx` builds the same string inline using `formatLastSessionDate` and `formatLastSessionDuration`. Dead code OR redundant duplication.
**Fix:** Either delete `formatLastSession` (and its tests) OR use it from `StatsFooter.tsx` (see WR-09 fix).

### IN-02: Cleanup useEffect at `App.tsx:301` runs on every animation frame while session is running

**File:** `src/app/App.tsx:301-336`
**Issue:** The cleanup effect's dependencies `[state, audioStop, clearLeadInTimeouts]` cause it to fire on every render. While `state.status === 'running'`, the effect fires ~60 times/second because `state` (and `state.lastFrame` inside) changes per animation frame. The body early-returns on `state.status === 'running'`, but React still invokes the effect callback + tracks dependencies + processes the cleanup phase each time.

This is a performance smell, not a bug (review scope excludes pure performance), but it's worth flagging since the explicit comment block at `App.tsx:295-300` says this effect is for the "external 'complete' transition" — the current dep array does not match that intent. Splitting into `[state.status]` would fire only on transitions:

**Fix:** Narrow the dependency:

```ts
useEffect(() => {
  if (state.status !== 'running') {
    void audioStop()
    setAppPhase('idle')
    clearLeadInTimeouts()
    audioAnchorRef.current = null
    planRef.current = null
    lastBoundaryKeyRef.current = null
    const snap = runningSnapshotRef.current
    if (snap !== null && recordedSessionKeyRef.current !== snap.key) {
      const isComplete = state.status === 'complete'
      const elapsedMs = isComplete
        ? state.completedAtMs - snap.startedAtMs
        : snap.lastElapsedMs
      const updated = recordSession(elapsedMs, isComplete)
      setStats(updated)
      recordedSessionKeyRef.current = snap.key
    }
    runningSnapshotRef.current = null
  }
}, [state.status, state, audioStop, clearLeadInTimeouts])
// Or restructure: read completedAtMs from a ref captured by the snapshot effect.
```

(Note: `state` is still needed in the body for the `state.completedAtMs` access on the complete branch — restructuring requires capturing that value into a ref or splitting the effect.)

### IN-03: Type assertions `as number` in `StatsFooter.tsx:40-41` could be replaced with a narrowed local

**File:** `src/components/StatsFooter.tsx:28-43`
**Issue:** `hasLastSession` checks `stats.lastSessionAtMs !== null && stats.lastSessionDurationSeconds !== null`. Inside the conditional render, the type system does NOT propagate the narrowing because `hasLastSession` is a boolean stored in a const, not a discriminated check on `stats`. So the code falls back to `as number` assertions. These assertions are type-system-only (no runtime cost) but lose the narrowing safety that a true type guard would give.
**Fix:** Use early-return narrowing OR a proper type guard:

```tsx
if (stats.lastSessionAtMs !== null && stats.lastSessionDurationSeconds !== null) {
  // Inside this block, both fields are narrowed to `number` without `as` assertions.
  const lastDate = formatLastSessionDate(stats.lastSessionAtMs)
  const lastDuration = formatLastSessionDuration(stats.lastSessionDurationSeconds)
  // Render with the narrowed values
}
```

Better: use `formatLastSession` (see WR-09) which returns `string | null` and skips the boolean intermediary entirely.

### IN-04: `coerceMute` comment claims "D-07 seed default" but D-14 is the binding decision

**File:** `src/storage/settings.ts:46-48`
**Issue:** Comment says `// D-07 seed default + D-15 type check`. D-07 is the Phase 3 first-visit-default decision. D-14 (Phase 4) is the binding rule for this code path: "when no stored mute pref exists, the default is ON; once the user toggles, the new value is written and restored on subsequent visits". The seed value is from D-07 but the persistence-layer decision is D-14. Reference both for clarity.
**Fix:** Update comment to `// D-14 + D-07 (seed default ON / muted=false) + D-15 type check`.

### IN-05: `STATE_VERSION` is `1 as const` but the field is treated as `typeof STATE_VERSION` — no migration framework hook

**File:** `src/storage/storage.ts:10, 17-22, 47`
**Issue:** `writeEnvelope` always re-stamps `version: STATE_VERSION` regardless of caller-supplied value. This means a v2 envelope read (in some hypothetical future) would lose its `version: 2` marker the first time v1-code wrote anything. There's no read-side check for "version matches what we expect" — a v2 stored envelope is read into the same `Envelope` type as v1 with no migration hook.

D-15 (per-field validate-and-fallback) handles SOFT drift, but a hard schema rename (e.g. `bpm` → `breathsPerMin`) would fail silently — old field undefined, new field missing, fall back to defaults. The user loses their settings invisibly.

This is acceptable for v1 (no migrations expected), but the "version" field is currently decorative — it serves no purpose. Either remove it (simplify) or add a real migration hook (`if (parsed.version !== STATE_VERSION) return migrate(parsed)`). A comment explaining the intent would suffice for now.

**Fix:** Add a comment to `STATE_VERSION` documenting the v1-first-bump migration policy, OR remove the field if it's not load-bearing yet:

```ts
// STATE_VERSION is reserved for the next schema bump's migration hook (future phases).
// v1 has no migrations; D-15's per-field coercers absorb soft drift. A migration framework
// will be added when a non-trivial schema change lands (deferred per 04-CONTEXT.md).
export const STATE_VERSION = 1 as const
```

---

_Reviewed: 2026-05-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
