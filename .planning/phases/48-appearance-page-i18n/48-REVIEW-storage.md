---
phase: 48-appearance-page-i18n
reviewed: 2026-05-26T00:00:00Z
depth: deep
scope: storage layer (Phase 4..47 carry-forward)
files_reviewed: 7
files_reviewed_list:
  - src/storage/index.ts
  - src/storage/installDismissed.ts
  - src/storage/practices.ts
  - src/storage/prefs.ts
  - src/storage/settings.ts
  - src/storage/stats.ts
  - src/storage/storage.ts
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 48 Storage Layer Code Review

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** deep
**Files Reviewed:** 7
**Status:** issues_found

## Summary

The storage layer was not modified during Phase 48 — the last touch was Phase 47-02 extending `UserPrefs` to 8 fields. This deep review re-examined the entire storage module against the focus areas (localStorage quota / try-catch coverage, JSON.parse error handling, schema migration safety, type-narrowing of unknown values, SSR/private-mode safety, key collisions, cross-tab races, sanitization on read).

The design is solid for the documented "embedded single-page, no SSR, no cloud sync" posture: every risky op is wrapped in try/catch with silent fallback (D-16/D-17), per-field coercers are non-throwing and prototype-pollution-safe (asRecord guard), the dual-versioning convention (`STATE_KEY` suffix + in-envelope `STATE_VERSION`) is well-documented, and migrate-on-read has an explicit `migrateEnvelope` seam with idempotent ladder steps.

No critical bugs or security vulnerabilities were found. Five warnings concern (1) a TOCTOU race window in the cross-tab future-version guard, (2) a silent-write-loss UX trap when an older build encounters a future-version envelope, (3) a lossy-on-read drift where `coerceTimbre`'s `chime → flute` legacy migration is re-run forever instead of being persisted, (4) the absence of runtime coercion at the `saveActivePractice` write boundary (TS-only typing leaves an injection seam), and (5) recording a session in one practice silently mutates other practices' on-disk slices through the coerce-then-write cycle. Info items track minor quality concerns including dead defensive code, inconsistent injection seams between modules, and one missed legacy-migration parity.

## Warnings

### WR-01: writeEnvelope future-version guard has a TOCTOU race window that can silently downgrade a v4 envelope

**File:** `src/storage/storage.ts:188-234`

**Issue:** The cross-tab future-version guard (STORAGE-02 / D-04a) reads the on-disk `version` field, compares it to `STATE_VERSION`, and skips the write if disk > current. The check is a Time-Of-Check / Time-Of-Use race: between the inner `storage.getItem(STATE_KEY)` (line 214) and the outer `storage.setItem(STATE_KEY, payload)` (line 230), another tab running a newer build can write a v4+ envelope. This tab's current-version-read returned a stale v3, so the comparison `currentVersion > STATE_VERSION` is false, the guard does not fire, and the v3 payload silently overwrites the v4 envelope.

This is structurally the same hazard the inline re-read was added to mitigate — but the mitigation only narrows the window, it does not close it. The WR-07 comment on `recordSession` (stats.ts:94-101) explicitly documents the in-tab race; the cross-tab race in `writeEnvelope` itself is not called out beyond "this addresses the CROSS-tab newer-version race only" (storage.ts:202).

The realistic exposure is small (two tabs of different versions, one mid-write) and there is no localStorage transactional primitive to close it. But the comment leaves a reader with the impression that the guard is comprehensive when it is merely best-effort.

**Fix:**
1. Update the doc-comment at storage.ts:191-205 to explicitly call out the residual TOCTOU window between the inner re-read and the outer setItem, and note that closing it would require `BroadcastChannel`-coordinated locking or Web Locks API (deferred).
2. Optionally, add a post-write verify pass: after `storage.setItem`, re-read and compare the on-disk `version`; if a higher version reappeared (lost write), do nothing (the other tab's data already authoritative). Adds one extra read per write but tightens the contract.

### WR-02: An older build encountering a future-version envelope silently discards every user action with no UX recovery path

**File:** `src/storage/storage.ts:225` (`if (currentVersion > STATE_VERSION) return`)

**Issue:** When a user has run a newer build (writing a v4 envelope) and then loads an older build via browser cache, service worker stale-while-revalidate, or back-forward cache, every `writeEnvelope` call from the older build short-circuits at line 225 with no return value, no thrown error, no logging, and no callback. The downstream `saveResonantSettings`, `savePrefs`, `saveMute`, `saveActivePractice`, `recordSession`, `recordResonantSession`, `recordStretchSession`, `recordNaviKriyaSession`, `resetStats` — all return `void` or a value that does not reflect persistence success. The UI happily updates React state from `setMute(true)`, `saveActivePractice('stretch')`, etc., the user sees the change "take effect," and on next reload their entire session is discarded because nothing was persisted.

The WR-08 comment in `stats.ts:25-30` acknowledges this for the reset flow ("D-16: quota / Safari ITP / private mode" — RAM state authoritative). But the older-build-vs-future-envelope case is fundamentally different from quota/ITP: those are infrastructure failures the user cannot remediate; the future-version case has a clear recovery path (reload the newer build, or clear localStorage). Without surfacing this, the user has no signal that something is wrong.

Worse, this silently breaks `recordResonantSession` and siblings (practices.ts:225-337): they return the `next` PersistedStats as if the write succeeded, so the caller updates UI state to "5 sessions completed" — but on next read it's back to 4 sessions. The bug looks like data corruption to the user.

**Fix:**
1. At minimum, hoist a sentinel from `writeEnvelope`: change the return type to `{ ok: boolean; reason?: 'quota' | 'future-version' | 'unknown' }` and propagate the failure to callers that have UX-visible writes (saveActivePractice, savePrefs, recordSession). Callers that care can show a one-time "Your data is from a newer version of the app — please refresh" banner; callers that don't care can ignore the field.
2. Alternatively, leave the silent posture but add a single DEV-only `console.warn` gated on `import.meta.env.DEV` at line 225 so developers can spot the situation in the console. The Open Question 1 reference at storage.ts:7 explicitly invited this.
3. Document the user-facing failure mode in storage.ts:191-205: "an older-build-after-newer-build session is invisible to the user; UAT/QA should clear localStorage between builds when downgrading."

### WR-03: `coerceTimbre` chime→flute legacy remap is re-run on every read because it never persists back

**File:** `src/storage/prefs.ts:61-68`

**Issue:** AUDIO-02's `chime → flute` migration lives inside `coerceTimbre`, returning `'flute'` when raw is `'chime'`. The comment at line 62-65 says "No STATE_VERSION bump needed — coercers are non-throwing per-field; 'chime' is a stale value, not a structural envelope change." Correct as far as it goes, BUT: the migrated value is only persisted when the user next calls `savePrefs(...)` — i.e., when they change ANY pref (theme, locale, timbre, etc.). If a user has `prefs.timbre: 'chime'` on disk and never changes their prefs, the disk value stays `'chime'` forever; every `loadPrefs()` call re-pays the migration cost. More importantly, ANY future writer that bypasses `coerceTimbre` (e.g., a hand-edited dev fixture, a hypothetical bulk-import migration) would see `chime` on disk and have no signal it's a legacy value.

Worse: a future build that DELETES the chime→flute remap (e.g., as part of a "we removed chime years ago" cleanup) will silently downgrade those users to `DEFAULT_TIMBRE = 'sine'` instead of `'flute'`. The remap is treated as ephemeral but it's actually load-bearing for every returning user with stale data.

**Fix:** Two options:
1. **Persist on first read** — in `loadPrefs`, after coercion, compare to the raw envelope and if they differ, fire-and-forget a `savePrefs(coerced)`. This trades one extra write per first-load-after-migration for permanent disk cleanup. Caveat: don't re-trigger the write on every load — guard on "raw was actually stale," e.g., compare `raw.prefs?.timbre === 'chime'` before re-saving.
2. **Make the legacy table the documented contract** — extract `LEGACY_TIMBRE_REMAP: Record<string, TimbreId>` as a top-level constant with a comment "MUST NOT be deleted without a STATE_VERSION bump + explicit migration ladder." This codifies the contract that the test suite (`prefs.test.ts:478-496` exercises chime→flute) should lock.

### WR-04: `saveActivePractice` writes the unvalidated `id` parameter directly to disk — no runtime coercion at the write boundary

**File:** `src/storage/practices.ts:187-190`

**Issue:** `saveActivePractice(id: PracticeId, deps)` accepts a `PracticeId` (typescript-narrowed union of three strings) and writes `{ ...env, activePractice: id }` to the envelope. The TS type does not enforce a runtime check — a caller that bypasses the type system (e.g., `saveActivePractice(rawString as PracticeId, deps)`, a hand-rolled storage event handler casting from `unknown`, or a test fixture using `// @ts-expect-error`) can land arbitrary strings on disk. Subsequent reads pass through `coerceActivePractice` which narrows the bad value back to `'resonant'`, so the data is self-healing on read — but the on-disk envelope is corrupted in between, and a third-party tool (debugger, devtools, future bulk-export) sees the bad string.

Every other write path in the module DOES coerce at the boundary either implicitly (because the SessionSettings / StretchSettings / NaviKriyaSettings types are constructed by validators) or explicitly (`coercePractices(env.practices)` runs before every save in saveResonantSettings et al.). `saveActivePractice` is the one path that takes user-controlled-ish input directly to disk.

**Fix:**
```typescript
export function saveActivePractice(id: PracticeId, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  // Defensive: coerce at write boundary to prevent on-disk corruption from a
  // type-unsafe call site. coerceActivePractice is the runtime narrower.
  writeEnvelope({ ...env, activePractice: coerceActivePractice(id) }, deps)
}
```
The coerce is a no-op for type-correct callers and a corruption guard for type-unsafe ones.

### WR-05: Recording a session in one practice silently rewrites other practices' on-disk slices via the coerce-then-write cycle

**File:** `src/storage/practices.ts:225-337` (all three `record*Session` functions)

**Issue:** Each `record*Session` reads the envelope, runs `coercePractices(env.practices)` to construct a fully-coerced PracticeMap, then writes back `{ ...env, practices: { ...practices, <one-slice>: ... } }`. The spread carries the COERCED versions of the other two practices, not the original on-disk versions. Consequences:

1. **Partial corruption is normalized away.** If naviKriya.stats was `{totalSessions: 'bad', totalElapsedSeconds: 600}` on disk (one bad field, one good field), and the user records a resonant session, the disk write now contains `naviKriya.stats: {totalSessions: 0, totalElapsedSeconds: 600, ...}` because `coerceStats` reset the bad field to 0. The user's 0-vs-original-N count is now lost forever.

2. **Forward-compatible unknown sub-keys in OTHER practices are stripped.** If a future build writes `practices.stretch.settings.experimentalRamp: true` and an older build records a resonant session, the older build's `coerceStretchSettings` does not preserve `experimentalRamp` (it constructs a fresh object from the six known fields). The newer build, on next read, finds its unknown key gone.

The top-level `readEnvelope` forward-compat spread (storage.ts:148-179) only covers UNKNOWN TOP-LEVEL keys — once you descend into `practices.<id>`, the subtree-level coercers strip unknowns. This is acknowledged in storage.ts:164-166 ("forward-compat is top-level ONLY") but the cross-practice contamination is not.

**Fix:**
1. Refactor the record* functions to update ONLY the target slice and preserve everything else as raw on-disk shape. Something like:
```typescript
const env = readEnvelope(deps)
const rawPractices = (env.practices ?? {}) as Record<string, unknown>
const targetSlice = coercePracticeSlice(rawPractices['resonant'], coerceSettings)
// ... compute next stats ...
writeEnvelope({
  ...env,
  practices: { ...rawPractices, resonant: { ...targetSlice, stats: next } },
}, deps)
```
This way `rawPractices.stretch` and `rawPractices.naviKriya` are spread back unchanged.
2. Document the trade-off in the comments: if cross-practice normalization-on-save IS the intended behaviour (one bad field heals everywhere), state so explicitly so future readers don't introduce inconsistency.

## Info

### IN-01: `snapToNearestOption` empty-array fallback is dead defensive code

**File:** `src/storage/practices.ts:70-87`

**Issue:** Lines 71-74 guard against `NK_FRONT_COUNT_OPTIONS[0] === undefined` and return `DEFAULT_NK_SETTINGS.frontCount`. `NK_FRONT_COUNT_OPTIONS` is hardcoded as `[100, 200, 300, 400, 500]` in `src/domain/naviKriyaSettings.ts:11` — there is no path by which `NK_FRONT_COUNT_OPTIONS[0]` can be undefined unless someone empties the literal. TypeScript's noUncheckedIndexedAccess (assumed enabled given the `firstOption: number | undefined` inference) demands the guard for type-safety, so this is a strict-mode artifact, not a bug. Marking as Info because removal requires either disabling the strict flag locally or factoring out a typed non-empty-array helper.

**Fix:** Either:
- Add an inline `eslint-disable` + `as const` assertion at the import site to widen `NK_FRONT_COUNT_OPTIONS` to a `readonly [number, ...number[]]` (non-empty tuple), eliminating the undefined branch.
- Leave as-is and add a comment `// Strict-mode artifact: NK_FRONT_COUNT_OPTIONS is non-empty by construction (domain literal); guard satisfies noUncheckedIndexedAccess.`

### IN-02: `installDismissed.ts` lacks the `StorageDeps` injection pattern used everywhere else

**File:** `src/storage/installDismissed.ts:15-35`

**Issue:** Every other module in the storage layer accepts a `StorageDeps` parameter (`storage?: Storage`, `now?: () => number`) so tests can inject mocks and the module can in principle run server-side with a polyfill. `installDismissed.ts` hardcodes `window.localStorage` and is silently dependent on the global. The module comment at line 5 calls this "Pattern 4 from RESEARCH.md — raw boolean key, no Envelope wrapper, no StorageDeps injection (no FOUC dependency, no cross-tab sync, no per-field coercion needed)." So this IS intentional — but the asymmetry with the rest of the layer is fragile: a future refactor that wants to test the install-banner flow with a different storage backend (e.g., session storage for "dismiss for this session only") would need to retrofit injection.

The test at `installDismissed.test.ts:25-29` works around this by spying on `window.localStorage.getItem` globally; this is OK for one-off testing but means dependencies are implicit.

**Fix:** Add an opt-in `StorageDeps` parameter for parity. The default still resolves to `window.localStorage` so existing call sites need no change:
```typescript
export function loadInstallDismissed(deps: StorageDeps = {}): boolean {
  const storage = deps.storage ?? window.localStorage
  try { return storage.getItem(INSTALL_DISMISSED_KEY) === 'true' } catch { return false }
}
```
If the research decision to deliberately keep it standalone is load-bearing, document the rationale at the function level (not just in the file header) so future readers do not "fix" the asymmetry without context.

### IN-03: FOUC inline script in `index.html` duplicates the `'hrv:state:v1'` key and `prefs.theme` path with no compile-time link to `STATE_KEY`

**File:** `src/storage/storage.ts:36` + `index.html:18`

**Issue:** The comment at storage.ts:35 explicitly says "SYNC WITH index.html FOUC SCRIPT — when bumping the :v1 suffix, update the hardcoded 'hrv:state:v1' string in index.html's <head> theme-resolve script." This is a hand-maintained invariant: nothing in the build system catches the desync. If a future PR bumps STATE_KEY to `'hrv:state:v2'` and forgets the FOUC script, every returning user gets a `data-theme="light"` flash on every load until they change a pref.

The FOUC script also hardcodes the `prefs.theme` path — if `prefs` ever moves under `practices.appearance` (or any nested location), the FOUC silently degrades to the system theme. This is documented (D-17 silent-fallback policy) but the contract between FOUC and `coercePrefs` is invisible.

**Fix:**
1. Add a CI-or-pretest grep that fails if `index.html` does not contain the current `STATE_KEY` literal: `grep "hrv:state:v1" index.html || exit 1`. One-line guard.
2. Optionally: build-step substitute the STATE_KEY into the FOUC script at bundle time so it's structurally linked. Costs build complexity; not worth it for a v1.x app.

### IN-04: `coerceCue` has no legacy migration path despite `DEFAULT_CUE` having been remapped (`labels → arrow` in quick task 260519-9mi)

**File:** `src/storage/prefs.ts:70-72`

**Issue:** `coerceTimbre` explicitly migrates `'chime' → 'flute'` (lines 61-68) with comment "AUDIO-02 legacy-value migration." The parallel case for cue style (`DEFAULT_CUE` was changed from `'labels'` to `'arrow'` in commit `296904b`) has no migration. A returning user who had `prefs.cue: 'labels'` on disk gets `'labels'` back (since `'labels'` is still a valid CueStyleId in CUE_OPTIONS) — so this is NOT a bug, but it IS an inconsistency in policy: changing the DEFAULT does not require migrating EXISTING users' explicit choices.

Logging this as Info to flag the asymmetric pattern. If there is no policy contract distinguishing "rename a legacy value (must migrate)" from "rename a default (no migration)," the next refactor will have ambiguous guidance.

**Fix:** Add a short policy comment at the top of `prefs.ts`:
```
// Legacy migration policy (per AUDIO-02 precedent):
//  - DELETED enum value → explicit migration in the coercer (e.g., chime → flute)
//  - RENAMED default only (enum value still valid) → no migration; existing users keep their explicit choice
//  - STRUCTURAL field move → STATE_VERSION bump + migrateEnvelope ladder
```

### IN-05: `recordSession` returns `next` PersistedStats as if the write succeeded but ignores `writeEnvelope` failure path

**File:** `src/storage/stats.ts:89-126` + parallel `recordResonantSession` / `recordStretchSession` / `recordNaviKriyaSession` in practices.ts

**Issue:** Each `record*Session` function calls `writeEnvelope({...}, deps)` then returns `next` directly. `writeEnvelope` silently swallows quota / ITP / future-version errors. The caller receives `next` and assumes "stats: 5 sessions" was persisted; on next load it might be back to 4. This is consistent with the WR-08 "RAM-authoritative" posture documented in `stats.ts:25-30`, but means the consumer cannot distinguish "write succeeded" from "write silently failed."

For a v1 single-tab single-user app this is the right trade-off (UX continues even when persistence fails). But the return value `next` is misleading documentation — a reader expects "this was persisted." Marking Info because this is policy-by-design, not a bug.

**Fix:** Either:
- Rename `next` semantically to make the optimism explicit, e.g., return `{ projected: next, persisted: boolean }`. Adds verbosity.
- Document at each `record*Session` site: "Returns the in-memory projection. Disk write is fire-and-forget per D-16/D-17 — caller must treat return value as RAM-authoritative."

### IN-06: `coerceStats` returns `roundsCompleted` for ANY input that has a valid `roundsCompleted` field — including a resonant/stretch stats slot that shouldn't have it

**File:** `src/storage/stats.ts:69-83`

**Issue:** `coerceStats` is shared between resonant, stretch, and naviKriya stats. `roundsCompleted` is logically a NaviKriya-only field but the coercer preserves it for any input that has it. The NK-08 comment at lines 19-23 says "resonant always writes undefined" — true at the write site (`recordResonantSession` builds a fresh object without spreading `...stats`, so any pre-existing `roundsCompleted` is dropped). But a hand-edited disk fixture or a future caller that uses `coerceStats` for resonant data WITHOUT going through `recordResonantSession` would surface `roundsCompleted` on the resonant slot.

The `PersistedStats.roundsCompleted?: number` typing allows this leak. Not exploitable; just imprecise. The fix (if desired) is to thread a `practice: PracticeId` argument into `coerceStats` and only preserve `roundsCompleted` when `practice === 'naviKriya'`. The cost is more parameter plumbing through `coercePracticeSlice` and the public `loadStats` (which is currently practice-agnostic).

**Fix:** Probably leave as-is — the leak is theoretical given the current call graph. Add a comment at line 81:
```typescript
// Surface-level note: roundsCompleted is preserved for any input that has it.
// Per the NK-08 write contract (recordResonantSession / recordStretchSession do
// NOT spread ...stats), resonant/stretch slots never carry this field on disk.
// A hand-edited fixture or future caller that bypasses the write helpers can
// surface this field on a non-NK slot; consumers should not rely on it being
// absent for resonant/stretch.
```

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Scope: storage layer carry-forward (Phase 4..47); Phase 48 did not modify these files_
