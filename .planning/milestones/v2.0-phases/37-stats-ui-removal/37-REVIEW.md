---
phase: 37-stats-ui-removal
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/app/App.dialog.test.tsx
  - src/app/App.persistence.test.tsx
  - src/app/App.tsx
  - src/components/SettingsDialog.tsx
  - src/content/content.no-stats-ui.test.ts
  - src/content/strings.test.ts
  - src/content/strings.ts
  - src/storage/index.ts
  - src/storage/practices.test.ts
  - src/storage/practices.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 37: Code Review Report

**Reviewed:** 2026-05-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 37 successfully excised the visible stats UI (`StatsFooter`, `ResetStatsDialog`), the `src/storage/format.ts` module, and the `resetPracticeStats` storage API. The structural cuts are clean — no live caller of a removed surface survives, the `from './format'` re-export is gone from the barrel, the migration ladder still functions, and the practices API remains internally consistent.

However, the deletion sweep stopped at *file boundaries* and missed several **string-keys and stale doc comments** that exist only to feed the removed UI. None block ship, but they collectively undermine the phase's anti-gamification intent (REQUIREMENTS STATSDISPLAY-01): the typed contract still publishes stats-shaped i18n keys, the drift-guard test does not lock the i18n surface where those keys live, and `naviKriyaStatsEmptyBody` in particular still ships translated stats-empty copy in both EN and PT-BR shipping bundles.

Separately, the drift-guard test in `content.no-stats-ui.test.ts` is **silently degradable** — if `collectFiles()` ever returns an empty array (renamed dir, broken `resolve()`, test running from a different cwd), the test passes vacuously with zero scanned files. The analog `content.no-review-markers.test.ts` has the same flaw, but here it's load-bearing for the anti-gamification lock.

## Warnings

### WR-01: Dead i18n keys for removed UI ship to production (`naviKriyaStatsEmptyBody`, `naviKriyaControlsPlaceholder`)

**File:** `src/content/strings.ts:144-145, 311, 312, 475, 476`
**Issue:** The `UiStrings.practice` interface still declares `naviKriyaControlsPlaceholder` and `naviKriyaStatsEmptyBody`, and both EN and PT-BR catalogs still ship the translated strings — including "Navi Kriya sessions will appear here after completing your first session." which is literally the body copy of the deleted StatsFooter empty state. A grep across `src/` (excluding `strings.ts` itself and `strings.test.ts`) returns zero consumers:

```
$ grep -rn -E "naviKriyaStatsEmptyBody|naviKriyaControlsPlaceholder" src --include='*.tsx'
# (no matches)
```

This means:
1. The production JS bundle still ships the stats-empty copy in two locales — partially defeating REQUIREMENTS STATSDISPLAY-01.
2. The strict-readonly `UiStrings` interface forces every future locale to translate copy that nothing reads.
3. The next developer adding a new "stats are empty" feature will find an inviting key already defined, undermining the intentional-unlock posture documented in CONTEXT D-11.

**Fix:** Delete the two key declarations from the `UiStrings.practice` interface (`src/content/strings.ts:144-145`), the four entries from `UI_STRINGS.en.practice` / `UI_STRINGS['pt-BR'].practice` (lines 311-312, 475-476), and the two literal-string assertions from `strings.test.ts:162-163`:

```ts
// src/content/strings.test.ts (around line 156-164) — remove these two entries:
const practiceStringKeys = [
  'toggleLabel',
  'resonantName',
  'naviKriyaName',
  'resonantHeading',
  'naviKriyaHeading',
  // 'naviKriyaControlsPlaceholder',   ← remove
  // 'naviKriyaStatsEmptyBody',        ← remove
] as const
```

### WR-02: Drift-guard test passes vacuously if `SCAN_FILES` is empty (silent false-negative)

**File:** `src/content/content.no-stats-ui.test.ts:53-60, 95-113`
**Issue:** `SCAN_FILES` is built at module-load time from `collectFiles(COMPONENTS_DIR)` + `collectFiles(APP_DIR)`. If either `resolve(__dirname, '..', 'components')` resolves to an empty/renamed path, or `readdirSync` returns `[]`, the test loop iterates zero times and `hits` stays empty. `expect(hits).toEqual([])` passes — the anti-gamification invariant becomes a no-op.

This is exactly the failure mode CONTEXT D-11 calls "drift" (an undetected unlock). The plan/summary describes the test as locking the done-state; a vacuous pass is the worst regression because it gives a green check while the code is wide open.

**Fix:** Add a sanity assertion that at least one production file from each scanned root was loaded. Anchor on a file that is certain to exist for the lifetime of the project (e.g. `App.tsx`, `SettingsDialog.tsx`) so re-arrangement of the directory does not break the guard:

```ts
describe('STATS-05 drift-guard (CONTEXT D-09 / D-10 / D-11)', () => {
  it('scans a non-empty set including known anchor files (guard-against-empty-scan)', () => {
    expect(SCAN_FILES.length).toBeGreaterThan(10)
    expect(SCAN_FILES.some(f => f.endsWith('/App.tsx'))).toBe(true)
    expect(SCAN_FILES.some(f => f.endsWith('/SettingsDialog.tsx'))).toBe(true)
  })

  it('no forbidden stats-UI token appears in src/components/ or src/app/', () => {
    // existing body
  })
})
```

### WR-03: Drift-guard scope does not cover `src/content/` — stats copy can re-land via i18n keys

**File:** `src/content/content.no-stats-ui.test.ts:53-60`
**Issue:** The scan is limited to `src/components/` + `src/app/`. But the **copy** for any future stats UI must live in `src/content/strings.ts` (the only translated catalog). A regression vector the current guard misses: a developer adds `'4 SESSIONS TODAY'` as a string in `strings.ts` and consumes it from a renamed `ProgressFooter` component. The regex `/MIN TODAY/i` would catch it *only* in the component file, not in the strings catalog. Given WR-01 above (orphan stats-shaped keys already shipping), this scope gap is concrete: those orphan keys live in `src/content/` and are *invisible to the drift-guard*.

**Fix:** Add `src/content/` to the scanned roots (excluding `.test.ts` files as the helper already does, which keeps the guard from flagging itself):

```ts
const CONTENT_DIR = resolve(__dirname) // = src/content
const SCAN_FILES: string[] = [
  ...collectFiles(COMPONENTS_DIR),
  ...collectFiles(APP_DIR),
  ...collectFiles(CONTENT_DIR),
]
```

Run the test once after this change to confirm — given WR-01, you may need to delete the dead string keys first (which is the right cleanup anyway).

### WR-04: Stale doc-comment references to deleted code surfaces leak intent

**File:** `src/storage/stats.ts:25-30`, `src/storage/storage.ts:43`, `src/styles/theme.css:121`
**Issue:** Several doc-comments still reference symbols that no longer exist. These mislead readers into thinking the named consumers are live:

- `src/storage/stats.ts:25` — `// WR-08: exported so App.tsx confirmReset can update React state optimistically`. `confirmReset` was deleted with `ResetStatsDialog`. The rest of the comment (lines 26-30) explains a footer state-sync contract that is gone.
- `src/storage/stats.ts:28` — `// must STILL reflect the user's intent — otherwise the footer keeps showing the old stats`. No footer exists.
- `src/storage/storage.ts:43` — `now?: () => number       // D-18 — defaults to Date.now (consumed by stats.ts / format.ts)`. `format.ts` is deleted.
- `src/styles/theme.css:121` — `End-button red (Tailwind 'bg-red-700' hardcoded in EndSessionDialog.tsx + ResetStatsDialog.tsx)`. `ResetStatsDialog.tsx` is deleted.

A reader hitting `stats.ts:25` will look for `confirmReset` callers, find none, and either re-introduce one or burn time confirming the comment is wrong. The CSS comment is the lowest-risk but most visible "ghost reference".

**Fix:** Strip the stale references — these are 1-line edits, no behavioral change. For `stats.ts:25-36`, the entire WR-08 block can be removed and `ZERO_STATS` doc reduced to a single line: `// Zero-value baseline. Test fixture for "no sessions yet" and (formerly) reset target.` For `storage.ts:43`, drop the `/ format.ts` suffix. For `theme.css:121`, remove the `+ ResetStatsDialog.tsx` clause.

## Info

### IN-01: Flat `loadStats` / `recordSession` / `resetStats` API in `stats.ts` is dead production code

**File:** `src/storage/stats.ts:85-132`
**Issue:** All three exported functions (`loadStats`, `recordSession`, `resetStats`) have zero production consumers — every live caller writes through the per-practice surface in `practices.ts` (`recordResonantSession`, `recordStretchSession`, `recordNaviKriyaSession`). The only references outside `stats.ts` are in `stats.test.ts`, which is a self-test of dead code. This is a Phase 30 carry-forward orphan, not introduced by Phase 37, so it's out of this phase's nominal scope — but Phase 37's deletion sweep had it in arm's reach and the same anti-gamification rationale that justifies deleting `format.ts` arguably applies here too. Flagged as Info so a future phase can pick it up rather than because Phase 37 must address it now.

**Fix:** Defer to a follow-up. When picked up: delete `loadStats`, `recordSession`, `resetStats` from `stats.ts`, delete `stats.test.ts`, keep `coerceStats` + `ZERO_STATS` + `PersistedStats` + `COUNT_THRESHOLD_MS` (consumed by `practices.ts`).

### IN-02: `App.persistence.test.tsx` documents `seedEnvelope` writes a flat `stats` field that no production read-path consumes

**File:** `src/app/App.persistence.test.tsx:15-33`
**Issue:** The `SeedOpts.stats` field type and the seeded `stats: opts.stats` write are vestigial — every test that does pass `stats:` in this file was removed in Phase 37 (the resonant-stats read tests now go through `resonantStatsOf`, which navigates `practices.resonant.stats`). The `stats?:` field in `SeedOpts` lives on but no test in the file populates it (I grep'd — no caller passes `stats:` to `seedEnvelope`). This is harmless dead code in a test file, low priority.

**Fix:** Drop the `stats?: { … }` block from `SeedOpts` (lines 18-23) and the corresponding `stats: opts.stats` line in `seedEnvelope`.

### IN-03: `coerceStretchSettings` cross-field reset silently drops a valid `targetBpm`

**File:** `src/storage/practices.ts:121-147`
**Issue:** This is pre-existing behavior (CR-01 fix), not introduced by Phase 37, but the review surfaced it: when `targetBpm >= initialBpm` is violated, BOTH fields reset to defaults — including a valid `targetBpm` that happened to be paired with a drifted `initialBpm`. The test at `practices.test.ts:390-411` documents this as intentional ("Resets BOTH BPM fields"). The rationale is sound (ramp validity), but the comment could note the trade-off explicitly: "We could keep a valid `targetBpm` and reset only `initialBpm` to default, but that risks `default-initial >= target` still violating; resetting both is the safe choice." Flagged as Info because the comment block does describe the behavior, just not why the alternative was rejected.

**Fix:** Optional — add one sentence to the existing comment block at line 133-134 to document the rejected alternative.

### IN-04: `App.persistence.test.tsx` Phase 33 / Phase 34 narrative comments name a closed Phase as the current change

**File:** `src/app/App.persistence.test.tsx:225-232, 286-287`
**Issue:** Two block comments still describe Phase 33 / Phase 34 as the "current" change context. After Phase 37, these read as anachronisms — particularly "These tests verify the read-path fix from Phase 33" and "Phase 34 — v2→v3 envelope upgrade…". They are not wrong (those phases did do that work), but they orient the reader toward the wrong commit. Flagged Info because doc-comments aren't load-bearing.

**Fix:** Optional — re-frame as factual references (e.g. "PRACTICE-02 read-path invariant introduced in Phase 33; locked here as a regression test"). Or simply leave; doc archaeology is fine.

---

_Reviewed: 2026-05-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
