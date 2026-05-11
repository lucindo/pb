# Phase 8: Storage Forward-Compat & Cross-Tab UI Sync - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the `localStorage` envelope safe to read/write across schema bumps and keep the stats UI consistent when a second tab writes the envelope. Scope-fixed: STORAGE-01 (read preserves on-disk `version` + top-level forward-compat), STORAGE-02 (write refuses downgrade), STORAGE-03 (App-level `storage` event listener refreshes stats display).

**Explicitly NOT in this phase:** v2 schema design, an actual migration framework, settings/mute cross-tab sync (only stats is in scope per STORAGE-03), audio/wake-lock fixes (Phase 9), hook identity fixes (Phase 10). No behavior change beyond what STORAGE-01/02/03 mandate. Tests must remain 363/363 green plus additive coverage for the new contracts.

</domain>

<decisions>
## Implementation Decisions

### Unknown-field forward-compatibility scope
- **D-01:** `readEnvelope` preserves unknown TOP-LEVEL fields from the parsed envelope by spreading the parsed object, then overriding `version` with the on-disk value (falling back to `STATE_VERSION` only when the disk `version` field is absent or non-numeric). The Phase 4 CR-01 invariant "pick only the 3 known subtree keys" is intentionally REVERSED at the top level — a future v2 envelope with a new top-level subtree (e.g., `prefs:`) must survive a v1 read+rewrite. Acceptable consequence: drift like `{__hack: 'x'}` injected via DevTools survives the round trip. Garbage at the top level is judged less harmful than dropping forward-compatible v2 fields.
- **D-02:** Subtree coercers (`coerceSettings` / `coerceMute` / `coerceStats`) keep stripping unknown SUB-keys inside each subtree. Forward-compat lives at the top level only. Rationale: D-15 per-field coercion semantics stay intact; schema evolution is expected to add new top-level subtrees, not widen existing ones.

### Downgrade-refusal failure mode (STORAGE-02)
- **D-03:** `writeEnvelope` refuses (returns void, no-op) when the on-disk `version > STATE_VERSION`. Silent — no `console.warn` even in DEV. Consistent with Phase 4 D-16/D-17 silent-fallback posture. Callers cannot distinguish a downgrade-refusal from a quota failure; that is by design — both yield "RAM state is the source of truth; disk may or may not have synced" semantics.
- **D-04:** `writeEnvelope` stamps `STATE_VERSION` on every successful write (ignores any `version` field on the input `env`). The running build owns the `version` field. The downgrade-refusal guard is what prevents a v1 build from clobbering a v2 envelope; the stamp itself does not need to honor caller-passed versions and doing so invites accidental misuse from future callers. (REVIEW.md's `env.version ?? STATE_VERSION` fix sketch is deliberately tightened here.)
- **D-04a:** The refusal check inside `writeEnvelope` performs an inline disk re-read (mirroring REVIEW.md's fix sketch). This adds one `getItem` per write but is the only race-safe primitive available — there is no atomic test-and-set on `localStorage`. Cross-tab concurrent-write loss (WR-07's actual increment race) remains documented v1.x work and is NOT fixed here; STORAGE-03 only restores UI consistency, not increment correctness.

### Cross-tab refresh scope (STORAGE-03)
- **D-05:** Listener refreshes STATS ONLY (`setStats(loadStats())`). Settings and mute drift across tabs stays deferred. Matches STORAGE-03 wording and ROADMAP success criterion #3 exactly. Settings only change on the settings screen (pre-session) so drift is rarely observed; mute drift is annoying but out of phase scope.
- **D-06:** Storage event is the ONLY refresh trigger — no `focus` / `visibilitychange` backup. Smallest blast radius; matches the success criterion. Edge case `e.newValue === null` (other tab cleared localStorage) falls through naturally via `loadStats() → coerceStats(undefined) → ZERO_STATS`; no explicit branch required.
- **D-06a:** Listener filters by `e.key === STATE_KEY` (string constant from `storage.ts`). Listener is attached once at App mount, cleaned up on unmount. Mid-session firings are allowed — `setStats` is React-state-only, no domain side-effects.

### Test layout (STORAGE-01 / STORAGE-02 / STORAGE-03)
- **D-07:** Adapter contracts (STORAGE-01 read-preserves-version, STORAGE-02 no-downgrade write refusal) go into existing `src/storage/storage.test.ts`. The current `'always re-stamps version: 1 even if a caller passes a wrong version'` case (lines 77-83) is REVERSED by STORAGE-01 and must be replaced (not deleted) with a `'preserves on-disk version when reading'` case PLUS a new `'refuses to write when on-disk version > STATE_VERSION'` case. Cross-tab UI sync (STORAGE-03) lives in `src/app/App.persistence.test.tsx` (existing file) since the assertion is React-state-on-StorageEvent — matches current test geography.

### Claude's Discretion
- **`Envelope.version` type widening.** Currently `version: typeof STATE_VERSION` (literal `1`). Preserving on-disk version requires widening to `number` (or `number | typeof STATE_VERSION`). Planner picks the cleanest narrowing under the Phase 7 strict baseline; both `Envelope` and any consumers reading `env.version` must compile cleanly.
- **Invalid `version` field validation.** When on-disk `version` is a non-number (string, boolean, null, missing), fallback shape: `typeof p.version === 'number' && Number.isFinite(p.version) ? p.version : STATE_VERSION` is the minimum. Whether to also require `Number.isInteger(p.version) && p.version >= 1` is left to the planner — the looser shape matches REVIEW.md's fix sketch; the tighter shape costs ~10 chars and rejects accidental garbage. Either is acceptable.
- **Existing `EMPTY_ENVELOPE` constant.** Currently `{ version: STATE_VERSION }`. Under STORAGE-01 the "empty" envelope (no disk data) still legitimately reports `version: STATE_VERSION` since there is nothing to preserve. Planner decides whether to keep the constant or inline.
- **How to dispatch the `StorageEvent` from the cross-tab Vitest case.** `window.dispatchEvent(new StorageEvent('storage', { key, newValue, ... }))` is the standard idiom; planner verifies it triggers the React listener under jsdom.
- **Whether to extract the listener into a `useEnvelopeStorageEvent(setStats)` hook** or inline it in `App.tsx`. Either is fine; ≤10 lines either way. Phase 5/6 precedent inlines small useEffects in App.tsx.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source spec for the milestone
- `REVIEW.md` §CR-02 (lines 87–129) — Storage envelope silently downgrades the on-disk schema version. Provides the fix-code sketch for both `readEnvelope` (preserve `onDiskVersion`) and `writeEnvelope` (refuse if `current.version > STATE_VERSION`). D-04 deliberately tightens REVIEW.md's `env.version ?? STATE_VERSION` to always stamp `STATE_VERSION`.
- `REVIEW.md` §WR-07 (lines 308–322) — `recordSession` cross-tab race. Provides the `storage` event listener sketch. Note: increment race itself is NOT fixed in Phase 8 (documented v1.x carry-forward).

### Milestone requirements
- `.planning/REQUIREMENTS.md` §"Storage" — STORAGE-01, STORAGE-02, STORAGE-03 (the three REQs this phase satisfies).
- `.planning/REQUIREMENTS.md` §"Out of Scope (for v1.0.1)" — what NOT to introduce (no migration framework, no v2 schema design).
- `.planning/ROADMAP.md` §"Phase 8: Storage Forward-Compat & Cross-Tab UI Sync" — success criteria 1–4 + 363/363 invariant.

### Project context
- `.planning/PROJECT.md` §"Current Milestone: v1.0.1 Code Review Patch" — milestone goal + constraint that 363/363 tests must keep passing.
- `.planning/PROJECT.md` §"Key Decisions" — D-09 (silent-fallback localStorage envelope posture; D-03/D-04 above explicitly mirror this).

### Prior-phase context that carries forward
- `.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` §"Integration Points" — `src/storage/storage.ts:67-72` already cited as a Phase 7 type-only touch site; STORAGE-01 lands the actual behavior change against the strict-mode baseline.
- `.planning/milestones/v1.0-REQUIREMENTS.md` — D-15/D-16/D-17 silent-fallback contracts that STORAGE-01/02 inherit (no console.warn in prod; quota/ITP/private-mode swallow; round-trip drift drop at the subtree level, now widened at top level only).

### Code touch surface (read first)
- `src/storage/storage.ts` — `readEnvelope` (lines 52–79), `writeEnvelope` (lines 81–89), `Envelope` interface (43–48), `STATE_KEY` / `STATE_VERSION` exports (35–36), `EMPTY_ENVELOPE` (50).
- `src/storage/storage.test.ts` — full file. Lines 77–83 hold the reversed contract case that must be replaced.
- `src/storage/stats.ts` — `recordSession` (71–98) and `resetStats` (100–104) call `writeEnvelope`; under D-03 silent refusal these calls already handle "write may silently fail" gracefully (RAM state stays optimistic via WR-08 pattern).
- `src/storage/settings.ts` and `src/storage/index.ts` — public-surface consumers; verify D-01 top-level spread doesn't break the `loadSettings` / `saveSettings` path.
- `src/app/App.tsx` lines 22–31 (storage imports), 47 (`loadStats` initial), 333–343 (`confirmReset` + WR-08 optimistic stats) — call sites the listener must coexist with.
- `src/app/App.persistence.test.tsx` — destination for the new STORAGE-03 cross-tab test.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`STATE_KEY` constant export** (`storage.ts:35`) — already public. The `storage` listener filters `e.key === STATE_KEY`; no new constant needed.
- **`loadStats(deps)` re-read entry point** (`stats.ts:67-69`) — already wraps `coerceStats(readEnvelope().stats)`. The cross-tab listener calls `setStats(loadStats())`; no new adapter needed.
- **`coerceStats(undefined) === ZERO_STATS`** (`stats.ts:55-65`) — handles `e.newValue === null` (cleared) cleanly via the existing fallback. D-06a's "no explicit branch" relies on this.
- **`WR-08 optimistic-UI pattern`** (`App.tsx:333-343` `confirmReset`) — the same pattern (RAM state owns truth, disk may silently fail) is the philosophical anchor for D-03 (silent refusal). Mention it in the docstring of the new refusal branch.

### Established Patterns
- **Silent-fallback storage adapter (Phase 4 D-16/D-17).** Every risky storage op is wrapped in `try { } catch { }` and swallows ALL errors. D-03 extends this to the new no-downgrade branch — refuse silently, no warn, no throw.
- **Single-envelope-read inside multi-step mutations (Phase 4 WR-07).** `recordSession` and `resetStats` read the envelope once, mutate, write back. D-04a's "inline disk re-read inside writeEnvelope" adds a second read at the adapter layer — acceptable because it is one extra `getItem`, and the WR-07 in-tab race is unchanged (the caller still reads once at the start; the writeEnvelope re-read protects only against a CROSS-tab newer-version that landed between caller-read and caller-write).
- **App-level `useEffect` + `window.addEventListener` cleanup pattern.** Multiple precedents in `App.tsx` (visibilitychange, beforeunload, etc.). Same shape for the new `storage` listener: attach once, clean up on unmount, no deps.

### Integration Points
- **`readEnvelope` return shape.** D-01 widens the in-memory shape to "all top-level disk keys". `Envelope` interface (currently 4 fields) needs widening — see Claude's Discretion (`Envelope.version` type widening + whether to use `[k: string]: unknown` index signature or extend the interface). Under Phase 7 strict baseline this MUST type-check cleanly with no `any`.
- **`App.tsx:47` stats initialization.** Already `useState(() => loadStats())` — the cross-tab listener writes to the same `setStats`. No state-shape change; just a new event source feeding the existing setter.
- **`storage.test.ts` infrastructure.** `beforeEach` clears localStorage. The new no-downgrade test will seed `{ version: 99, ... }` via `setItem`, then call `writeEnvelope({...})` and assert the disk value is unchanged. The new "preserves on-disk version" case is symmetric.
- **`App.persistence.test.tsx` infrastructure.** Already exercises mount-time `loadStats`. The new STORAGE-03 case dispatches a synthetic `StorageEvent` and asserts the rendered stats reflect the new disk state. Need to verify jsdom propagates `StorageEvent` to `window` listeners (it does — but planner should double-check).

</code_context>

<specifics>
## Specific Ideas

- **Existing test case to REPLACE, not delete.** `storage.test.ts:77-83`. Rename from `'always re-stamps version: 1 even if a caller passes a wrong version'` to `'preserves on-disk version when reading; ignores caller-passed version on write'` or similar. Body asserts:
  - Seed `setItem(STATE_KEY, JSON.stringify({ version: 2, settings: { bpm: 4 } }))`.
  - `readEnvelope()` → `{ version: 2, settings: { bpm: 4 }, ... }`.
  - `writeEnvelope({ version: 7 as any, settings: { bpm: 5 } })` — refused by D-04a (disk version 2 > STATE_VERSION 1).
  - Disk value unchanged after the refused write.
- **New STORAGE-02 test case** alongside the replaced one:
  - `'writeEnvelope refuses to overwrite a future-version on-disk envelope'`.
  - Seed `{ version: 2 }`, call `writeEnvelope({ version: 1 as any, stats: ZERO_STATS })`, assert `getItem(STATE_KEY)` matches the seed unchanged.
- **New STORAGE-03 test case** in `App.persistence.test.tsx`:
  - Render App; observe initial `totalSessions: 0` in the footer.
  - Mutate `localStorage` with a fully-formed envelope that has `totalSessions: 5`.
  - Dispatch `new StorageEvent('storage', { key: STATE_KEY, newValue: <new json>, oldValue: <old json>, storageArea: localStorage })`.
  - Assert the rendered footer shows `5` after a `flush`/`act`.
- **D-04a inline re-read** — the planner should ensure the inline `getItem` inside `writeEnvelope` is wrapped in its own try/catch so a throwing-`getItem` (Safari ITP) does not break the write path. Conservative shape:
  ```ts
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
  } catch { /* D-17 */ }
  if (currentVersion > STATE_VERSION) return  // STORAGE-02
  ```

</specifics>

<deferred>
## Deferred Ideas

- **WR-07 increment race fix** — two tabs ending sessions concurrently can lose one `totalSessions` increment. STORAGE-03 restores UI CONSISTENCY but not increment correctness. Documented v1.x carry-forward; matching REVIEW.md WR-07's "accept-or-fix" guidance: we accept, and document. Update the `recordSession` comment at `stats.ts:76-81` to escalate from "in-tab correctness; cross-tab is v2 concern" to "in-tab correctness; cross-tab concurrent end loses one increment — documented v1.x work; UI consistency restored via STORAGE-03 listener." (Comment-only change; planner decides whether to bundle inside Phase 8 or defer.)
- **Settings + mute cross-tab sync** — out of scope per D-05. Settings drift is unlikely (only changes pre-session); mute drift is annoying but not phase-scoped. Candidate for v1.1.
- **Focus / visibilitychange backup refresh trigger** — out of scope per D-06. Worth revisiting in v1.1 if real-world reports indicate `storage` events get throttled in backgrounded tabs.
- **Migration framework / v2 schema design** — explicitly deferred. Phase 8 only ensures v1 doesn't CORRUPT a future v2 envelope; the actual schema bump and migrators land when the next breaking change is needed.
- **Custom dev-mode `console.warn` for refused writes** — rejected (D-03). Could be added in v1.1 if debugging cross-tab issues becomes painful.
- **Subtree-level forward-compat (preserve unknown sub-keys inside settings/mute/stats)** — rejected (D-02). Subtree coercers stay strict; widening lives at the top level only.

</deferred>

---

*Phase: 8-storage-forward-compat-cross-tab-ui-sync*
*Context gathered: 2026-05-11*
