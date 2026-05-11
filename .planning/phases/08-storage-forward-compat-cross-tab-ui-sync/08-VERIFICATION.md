---
phase: 08-storage-forward-compat-cross-tab-ui-sync
verified: 2026-05-11T15:31:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Two-window cross-tab UI consistency manual test (ROADMAP SC #3)"
    expected: |
      1) Run `npm run dev` and open the app in two browser windows side-by-side on the same origin.
      2) In window A, complete one breathing session so `totalSessions` increments.
      3) Window B's stats footer must update without being focused or reloaded — the counter increments live.
      4) In window A, reset stats; window B's stats footer must hide (totalSessions returns to zero, gating hides it).
      5) In DevTools of window B, run `localStorage.setItem('some-other-key', 'noise')` — window B's footer must NOT change (D-06a key filter).
    why_human: "jsdom synthetic `StorageEvent` proves the listener wiring, key filter, and React re-render path, but only a real browser cross-tab delivery validates the underlying browser `storage` event propagation and `storageArea` semantics (omitted in test under jsdom IDL constraints — see Plan 02 SUMMARY deviation #1). VALIDATION.md explicitly tracks this as a Manual-Only Verification gate."
---

# Phase 08: Storage Forward-Compat & Cross-Tab UI Sync Verification Report

**Phase Goal:** Make the localStorage envelope safe to read/write across schema bumps and keep stats UI consistent when a second tab writes the envelope.
**Verified:** 2026-05-11T15:31:00Z
**Status:** human_needed (all automated checks PASS; ROADMAP SC #3 requires a manual two-window browser test gate per VALIDATION.md §Manual-Only Verifications)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1  | `readEnvelope` returns the on-disk numeric `version` field (not unconditional rewrite to STATE_VERSION); forward-compatible unknown fields preserved. | VERIFIED | `src/storage/storage.ts:87-98`: `const onDiskVersion = ...Number.isFinite(p.version) ? p.version : STATE_VERSION` then `return { ...p, version: onDiskVersion, settings: p.settings, mute: p.mute, stats: p.stats }`. D-01 spread-then-override pattern. Vitest case `'preserves on-disk version when reading; stamps STATE_VERSION on write'` at `src/storage/storage.test.ts:77-99` seeds `{ version: 2, settings: { bpm: 4 }, prefs: { theme: 'dark' } }` and asserts `env.version === 2`. |
| 2  | `readEnvelope` preserves unknown top-level fields (e.g., `prefs`) from a future v2 envelope through the round-trip. | VERIFIED | `src/storage/storage.ts:93` `...p,` spread carries forward-compat top-level fields. The `prefs: { theme: 'dark' }` seed at `storage.test.ts:82` is the forward-compat probe and survives via the spread. Static return type stays `Envelope` (RESEARCH RQ-4 Option b — no index signature). |
| 3  | `writeEnvelope` refuses (no-op) to overwrite a future-version on-disk envelope when on-disk `version > STATE_VERSION`. Refusal is silent (no console.warn/log/DEV branch). | VERIFIED | `src/storage/storage.ts:131-144`: inline re-read in nested try/catch sets `currentVersion`; `if (currentVersion > STATE_VERSION) return` short-circuits before `storage.setItem`. `grep -nE "console\." src/storage/storage.ts` returns ZERO matches (D-03 silent). Vitest case `'writeEnvelope refuses to overwrite a future-version on-disk envelope (STORAGE-02)'` at `storage.test.ts:101-125` seeds `{ version: 2 }`, calls `writeEnvelope({ version: 1, stats: { totalSessions: 99, ... } })`, asserts disk matches `{ version: 2 }` and NOT `{ stats: { totalSessions: 99 } }`. |
| 4  | `writeEnvelope` stamps STATE_VERSION on every successful write (D-04; ignores caller-passed version). | VERIFIED | `src/storage/storage.ts:148`: `const payload = JSON.stringify({ ...env, version: STATE_VERSION })` — explicit override after spread. Existing test `'persists the envelope with version stamped'` at `storage.test.ts:52-59` asserts `version: 1` stamped even when caller-passed value differs. |
| 5  | Inner re-read try/catch is nested separately from outer D-16 catch — a throwing `getItem` falls through to write attempt. | VERIFIED | `src/storage/storage.ts:132-143`: inner `try { ... } catch { /* D-17 posture */ }` is structurally nested inside the outer `try` block. The outer catch at line 150 only runs if the **write** throws; the inner catch silences only the re-read. `grep -cE "^\s*try \{" src/storage/storage.ts` returns 3 (readEnvelope outer + writeEnvelope outer + writeEnvelope inner). Comment block at lines 126-130 explicitly documents Pitfall 1. |
| 6  | Subtree coercers (coerceSettings/coerceMute/coerceStats) keep stripping unknown sub-keys — forward-compat is top-level only (D-02). | VERIFIED | `src/storage/stats.ts:55-65` `coerceStats` extracts only the four known fields via individual `is*` checks; unknown sub-keys are dropped. Neither this file nor `src/storage/settings.ts` / `src/storage/mute.ts` was modified by Phase 8 (only stats.ts comment block). |
| 7  | App registers `window.addEventListener('storage', handler)` exactly once at mount and removes it on unmount. | VERIFIED | `src/app/App.tsx:102-112`: `useEffect(() => { ... window.addEventListener('storage', onStorage); return () => { window.removeEventListener('storage', onStorage) } }, [])` with empty deps. `grep -nE "window\.addEventListener\('storage'" src/app/App.tsx` → 1 match (line 108). `grep -nE "window\.removeEventListener\('storage'" src/app/App.tsx` → 1 match (line 110). |
| 8  | Handler filters on `e.key === STATE_KEY` — events for other keys are ignored (D-06a). | VERIFIED | `src/app/App.tsx:104`: `if (e.key === STATE_KEY) { setStats(loadStats()) }`. Vitest case `'ignores storage events for unrelated keys (D-06a key filter)'` at `App.persistence.test.tsx:365-392` dispatches a `key: 'some-other-key'` event and asserts the footer still shows /3 sessions/ and NOT /99 sessions/. |
| 9  | Listener refreshes STATS ONLY — settings and mute are not re-read cross-tab (D-05). | VERIFIED | `src/app/App.tsx:103-107`: handler body calls only `setStats(loadStats())`. No `loadSettings()` / `loadMute()` / `setSelectedSettings` / `setMuted` calls inside the handler. Settings and mute remain owned by their respective write-on-change paths. |
| 10 | Storage event is the SOLE refresh trigger — no focus/visibilitychange/BroadcastChannel/poll (D-06). | VERIFIED | `grep -nE "addEventListener\('focus'|'visibilitychange'|BroadcastChannel|setInterval.*loadStats" src/app/App.tsx` returns ZERO storage-related matches. The only new listener registered in this phase is the `'storage'` listener at line 108. |
| 11 | Cross-tab refresh is decorative — no aria-live, no toast, no animation, no console output around the storage listener. | VERIFIED | `grep -nE "console\." src/app/App.tsx` against the listener block (lines 102-112): zero matches. No `aria-live` wrapper or animation hook in the new useEffect — handler body is purely `setStats(loadStats())`. UI-SPEC contract honored. |
| 12 | All 363 baseline tests still pass; new tests cover read-preserve, write-refuse-downgrade, and cross-tab refresh (ROADMAP SC #4). | VERIFIED | `npx vitest run` → 27 files / **366 passed** (363 baseline + 1 STORAGE-02 case + 2 STORAGE-03 cases). `storage.test.ts` now has 10 `it()` declarations (5 readEnvelope + 5 writeEnvelope); `App.persistence.test.tsx` now has 18 `it()` declarations (16 baseline + 2 STORAGE-03). |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/storage/storage.ts` | Widened `Envelope.version: number`; readEnvelope D-01 spread-and-override; writeEnvelope D-04a nested-try-catch downgrade refusal. | VERIFIED | Line 51 `version: number`. Lines 87-98 D-01 spread block. Lines 131-149 STORAGE-02 + D-04a guard + D-04 stamp. `Number.isFinite` used in BOTH readEnvelope (line 89) and writeEnvelope (line 138). |
| `src/storage/storage.test.ts` | Replaced re-stamp test with preserve-on-disk-version case; new STORAGE-02 no-downgrade case inside `describe('writeEnvelope', ...)`. | VERIFIED | 10 `it()` cases total. The old `'always re-stamps version: 1...'` case is gone (grep returns zero). New `'preserves on-disk version when reading; stamps STATE_VERSION on write'` at line 77. New `'writeEnvelope refuses to overwrite a future-version on-disk envelope (STORAGE-02)'` at line 101. `prefs: { theme: 'dark' }` forward-compat probe at line 82. `totalSessions: 99` STORAGE-02 negative probe at line 110. |
| `src/storage/stats.ts` | WR-07 comment updated to reference STORAGE-03 carry-forward (UI consistency restored). | VERIFIED | Line 83: `// UI consistency restored via the STORAGE-03 storage-event listener in App.tsx.` Old wording `'cross-tab sync is still a v2 concern'` purged from entire `src/` tree (grep returns zero). Function body lines 84-100 unchanged. |
| `src/app/App.tsx` | `STATE_KEY` added to `../storage` named import; new mount-once useEffect registers storage listener with key filter, calls `setStats(loadStats())`, cleans up on unmount. | VERIFIED | Line 30 `STATE_KEY,` inside existing import block (no second import line). Lines 102-112 contain the new `useEffect(() => { ... }, [])` block with handler at lines 103-107, addEventListener at line 108, removeEventListener cleanup at lines 109-111. `loadStats(deps)` consumed via the existing import at line 26. |
| `src/app/App.persistence.test.tsx` | New `describe('STORAGE-03 — cross-tab stats refresh', ...)` block with cross-tab refresh case and D-06a key-filter case. | VERIFIED | Lines 320-393 contain the new section divider + describe block. Case 1 `'refreshes stats footer when another tab writes the envelope'` (lines 324-363) — setItem-before-dispatch ordering (RESEARCH Pitfall 2 honored), 5-session probe, asserts footer becomes visible. Case 2 `'ignores storage events for unrelated keys (D-06a key filter)'` (lines 365-392) — dispatch without setItem, asserts footer unchanged. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `src/storage/storage.ts` readEnvelope | object literal return | spread of `parsed` Record before key overrides | WIRED | Lines 87-98: `const p = parsed as Record<string, unknown>` then `return { ...p, version: onDiskVersion, ... }`. Spread comes FIRST so unknown top-level fields survive; explicit overrides last. |
| `src/storage/storage.ts` writeEnvelope | early return | inline disk re-read followed by `if (currentVersion > STATE_VERSION) return` | WIRED | Lines 131-144. Inner re-read in nested try/catch (lines 132-143); guard at line 144 short-circuits BEFORE the JSON.stringify + setItem at lines 148-149. |
| `src/storage/storage.test.ts` describe('writeEnvelope') | STORAGE-02 disk-unchanged assertion | seed `{ version: 2 }` → `writeEnvelope({ version: 1, ... })` → `getItem` matches seed | WIRED | Lines 101-125. Seed at line 103, write at lines 107-115, disk-match assertion at line 121 (`toMatchObject({ version: 2 })`), negative assertion at line 124 (`.not.toMatchObject({ stats: { totalSessions: 99 } })`). |
| `src/app/App.tsx` App() useEffect | window 'storage' event | `window.addEventListener('storage', onStorage)` with cleanup | WIRED | Line 108 register, line 110 unregister inside cleanup return. Empty deps `[]` at line 112 — react-hooks/exhaustive-deps clean (ESLint passes). |
| `src/app/App.tsx` onStorage handler | `setStats(loadStats())` | filter `e.key === STATE_KEY` | WIRED | Line 104 filter, line 105 call. No other branches in the handler. |
| `src/app/App.persistence.test.tsx` STORAGE-03 cross-tab test | rendered footer update | `setItem(STATE_KEY, ...)` then `window.dispatchEvent(new StorageEvent('storage', { ... }))` inside `act` | WIRED | Line 343 `localStorage.setItem(STATE_KEY, newEnvelope)`. Lines 352-358 `await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: newEnvelope, oldValue: null })) })`. Footer assertion at lines 361-362. Note `storageArea` field deliberately omitted per documented jsdom IDL incompatibility (Plan 02 SUMMARY deviation #1). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `src/app/App.tsx` (StatsFooter render path) | `stats` (PersistedStats) | `useState<PersistedStats>(() => loadStats())` at line 48; mutated by `setStats(loadStats())` in storage listener (line 105), `recordSession` end-transition (line 443-444), and `confirmReset` (line 372). | Yes | FLOWING |
| `src/app/App.tsx` StatsFooter call site | `stats={stats}` prop | `stats` React state (line 583) gated by `!inSessionView && stats.totalSessions > 0` | Yes | FLOWING — gating via `totalSessions > 0` is the documented hide-on-empty path (D-09); listener-fired `setStats` populates real values from disk via `loadStats()`. |
| `src/storage/storage.ts` writeEnvelope inner re-read | `currentVersion` | `storage.getItem(STATE_KEY)` → `JSON.parse` → `Number.isFinite` check; fallback `STATE_VERSION` | Yes | FLOWING — guard reads live disk state, not a stale cache. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| TypeScript compiles under Phase 7 strict baseline | `npx tsc --noEmit` | exit 0, no output | PASS |
| Full Vitest suite passes | `npx vitest run` | exit 0, 27 files / 366 tests passed (363 baseline + 3 new) | PASS |
| Storage + persistence test files isolated | `npx vitest run src/storage/storage.test.ts src/app/App.persistence.test.tsx` | exit 0, 2 files / 28 tests passed (10 storage + 18 persistence) | PASS |
| ESLint clean on all modified files | `npx eslint src/storage/storage.ts src/storage/storage.test.ts src/storage/stats.ts src/app/App.tsx src/app/App.persistence.test.tsx` | exit 0, no output | PASS |
| D-03 silent refusal — no console statements in storage.ts | `grep -nE "console\." src/storage/storage.ts` | zero matches | PASS |
| Old WR-07 wording fully purged from src tree | `grep -rn "cross-tab sync is still a v2 concern" src/` | zero matches | PASS |
| Try-block count for nested-catch invariant | `grep -cE "^\s*try \{" src/storage/storage.ts` | 3 (readEnvelope outer + writeEnvelope outer + writeEnvelope inner) | PASS |
| All three task commits exist | `git log --oneline \| grep -E '84ecea7\|2e249b6\|b7f63dc\|a2fd7c6\|cb408f8'` | 5 commits found (Plan 01 Tasks 1-3 + Plan 02 Tasks 1-2) | PASS |

### Probe Execution

Not applicable — Phase 8 declares no probe scripts. VALIDATION.md uses Vitest as the sampling mechanism; spot-check above runs the same Vitest suite.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| STORAGE-01 | 08-01 | `readEnvelope` preserves on-disk `version` field; unknown disk fields pass through. | SATISFIED | Truths #1 + #2 verified above. `src/storage/storage.ts:87-98` D-01 spread-then-override. Vitest `storage.test.ts:77-99` preserve case asserts `env.version === 2` after seeding `{ version: 2, ..., prefs: { theme: 'dark' } }`. |
| STORAGE-02 | 08-01 | `writeEnvelope` refuses to write when on-disk `version > STATE_VERSION`. | SATISFIED | Truth #3 verified. `src/storage/storage.ts:131-144` nested-try inline re-read + guard. Vitest `storage.test.ts:101-125` no-downgrade case asserts disk `{ version: 2 }` unchanged after `writeEnvelope({ version: 1, stats: { totalSessions: 99, ... } })`. D-03 silent confirmed (zero console statements). |
| STORAGE-03 | 08-02 | App `storage` event listener keeps stats display consistent across tabs. | SATISFIED (jsdom) / HUMAN NEEDED (real browser) | Truths #7-#12 verified. `src/app/App.tsx:102-112` listener. Two Vitest cases at `App.persistence.test.tsx:323-393` lock the listener wiring + D-06a key filter. The real-browser cross-tab UI consistency gate (ROADMAP SC #3 "manual two-window test") is intentionally out-of-scope for the automated gate and tracked in VALIDATION.md §Manual-Only Verifications — surfaced in `human_verification` frontmatter above. |

No orphaned requirements: REQUIREMENTS.md maps STORAGE-01, STORAGE-02, STORAGE-03 to Phase 8; all three are claimed by Plan 01 (STORAGE-01/02) and Plan 02 (STORAGE-03) `requirements:` frontmatter fields.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | — | — | None found. No `TBD`/`FIXME`/`XXX` debt markers introduced; no unreferenced TODOs in modified files. The phase-introduced eslint-disable lines (`@typescript-eslint/require-await` at `App.persistence.test.tsx:351, 381` and `@typescript-eslint/no-non-null-assertion` at `storage.test.ts:97, 120, 123`) all carry inline `// Reason:` annotations matching the Phase 7 D-04 convention. |

### Human Verification Required

#### 1. Two-window cross-tab UI consistency manual test (ROADMAP SC #3)

**Test:**
1. Run `npm run dev` and open the app in two browser windows side-by-side on the same origin.
2. In window A, complete one breathing session so `totalSessions` increments.
3. Window B's stats footer must update without being focused or reloaded — the counter increments live.
4. In window A, reset stats; window B's stats footer must hide (totalSessions returns to zero, gating hides it).
5. In DevTools of window B, run `localStorage.setItem('some-other-key', 'noise')` — window B's footer must NOT change (D-06a key filter).

**Expected:** Window B's stats footer mirrors window A's writes without focus change or reload. Unrelated-key writes never trigger a footer refresh.

**Why human:** jsdom synthetic `StorageEvent` proves the listener wiring, key filter, and React re-render path, but only a real browser cross-tab delivery validates the underlying browser `storage` event propagation and `storageArea` semantics (the `storageArea` field is omitted in the jsdom test per the documented IDL incompatibility in Plan 02 SUMMARY deviation #1). VALIDATION.md §Manual-Only Verifications explicitly tracks this as the one remaining gate at the phase boundary.

### Gaps Summary

No code-level gaps. All 12 must-have truths are VERIFIED in the codebase:

- `Envelope.version` is widened from the `typeof STATE_VERSION` literal (1) to `number` (`src/storage/storage.ts:51`), with the docblock explicitly citing RESEARCH RQ-4 Option b for omitting the index signature.
- `readEnvelope` implements D-01 spread-then-override (`src/storage/storage.ts:87-98`): spreads `parsed` first, overrides `version` with `Number.isFinite`-validated on-disk value (fallback STATE_VERSION), then re-surfaces the four known subtree keys. Comment block at lines 66-86 documents the contract and Pitfall 3.
- `writeEnvelope` implements STORAGE-02 + D-04a (`src/storage/storage.ts:131-149`): inline re-read in a nested try/catch (lines 132-143) sets `currentVersion`; guard at line 144 returns silently when `currentVersion > STATE_VERSION`; D-04 stamping unchanged at line 148. Outer D-16 catch (line 150) still silences quota/ITP write failures. Zero `console.*` statements file-wide (D-03).
- App-level storage listener (`src/app/App.tsx:102-112`) registers exactly once at mount, filters on `e.key === STATE_KEY`, calls `setStats(loadStats())`, removes itself on unmount. Empty deps `[]` (line 112) — react-hooks/exhaustive-deps clean. No focus / visibilitychange / BroadcastChannel / poll backup (D-06 — sole trigger).
- Test coverage: `src/storage/storage.test.ts` grew 9 → 10 (STORAGE-01 preserve case replaced old re-stamp; STORAGE-02 no-downgrade case appended). `src/app/App.persistence.test.tsx` grew 16 → 18 (STORAGE-03 cross-tab refresh case + D-06a key-filter case). Full suite: 363 → **366** passing.
- WR-07 audit-trail comment in `src/storage/stats.ts:76-83` escalated from "cross-tab sync is still a v2 concern" to documenting STORAGE-03's UI-consistency restore. Old wording fully purged from the `src/` tree.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` all exit 0 against the Phase 7 strict baseline.

**One outstanding gate (status: human_needed):** ROADMAP Success Criterion #3 explicitly calls out a "manual two-window test" as part of the cross-tab UI consistency contract. The jsdom test suite locks the listener wiring + key-filter contract but cannot exercise real-browser `storage` event propagation across tabs (and intentionally omits the `storageArea: window.localStorage` field per the documented jsdom IDL incompatibility). VALIDATION.md §Manual-Only Verifications tracks this as a separately-acknowledged gate at the phase boundary, recommended to be executed by the user post-merge before formally closing the phase.

---

_Verified: 2026-05-11T15:31:00Z_
_Verifier: Claude (gsd-verifier)_
