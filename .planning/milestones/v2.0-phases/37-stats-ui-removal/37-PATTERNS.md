# Phase 37: Stats UI removal — Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 14 (4 deletes, 1 new, 9 modifies)
**Analogs found:** 14 / 14

This is a deletion-heavy phase. Most rows have "no analog needed — delete file and remove every consumer import"; the load-bearing analogs are the **STATS-05 drift-guard test** (`content.no-review-markers.test.ts`), the **STATS-04 regression test** (existing `recordResonantSession` tests in `practices.test.ts`), and the **Phase 36-08 multi-file deletion commit precedent**.

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/components/StatsFooter.tsx` | delete (component) | render | none (delete) | n/a |
| `src/components/StatsFooter.test.tsx` | delete (component-test) | render | none (delete-with-component) | n/a |
| `src/components/ResetStatsDialog.tsx` | delete (component) | modal | none (delete) | n/a |
| `src/components/ResetStatsDialog.test.tsx` | delete (component-test) | modal | none (delete-with-component) | n/a |
| `src/app/App.tsx` | modify (consumer) | render + state | self (lines 13-14, 68, 131, 295-311, 505-522, 675-695, 1270-1278, 1304-1310) | exact (self-prune) |
| `src/app/App.dialog.test.tsx` | modify (test) | render | self (lines 332-362 — single `it` block to drop) | exact (self-prune) |
| `src/app/App.persistence.test.tsx` | modify (test) | render | self (LOCL-02 footer-gating + LOCL-03 reset blocks) | exact (self-prune) |
| `src/content/strings.ts` | modify (i18n catalog) | typed-record | self (Phase 19/26 frozen-EN catalog deletion path) | exact (self-prune) |
| `src/storage/practices.ts` | modify (data) | persistence | self (`resetPracticeStats`, lines 333-349) | exact (self-prune) |
| `src/storage/practices.test.ts` | modify + new test | persistence-test | `recordResonantSession` tests at lines 240-265 | exact |
| `src/storage/format.ts` | modify (utility) | pure-function | self (`formatLastSession`, lines 67-71) | exact (self-prune) |
| `src/storage/format.test.ts` | modify (utility-test) | pure-function | self (`describe('formatLastSession ...')` lines 89-115) | exact (self-prune) |
| `src/components/SettingsDialog.tsx` | modify (comments only) | n/a | self (lines 20-21, 25-28 comment debt) | exact (self-prune) |
| `src/content/content.no-stats-ui.test.ts` (NEW) | new (drift-guard test) | fs-scan | `src/content/content.no-review-markers.test.ts` | exact |

## Pattern Assignments

### `src/content/content.no-stats-ui.test.ts` (NEW — STATS-05 drift-guard)

**Analog:** `src/content/content.no-review-markers.test.ts` (exact pattern, different scope + token list)

**File-collection pattern** (lines 11-31 of analog):
```typescript
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Collect all non-test .ts files in src/content/.
function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, acc)
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      acc.push(full)
    }
  }
  return acc
}
```

**Assertion pattern** (lines 33-47 of analog):
```typescript
const CONTENT_DIR = resolve(__dirname)
const CONTENT_FILES = collectFiles(CONTENT_DIR)

const REVIEW_MARKER = 'TODO: native-speaker review'

describe('src/content marker-guard (Phase 26 D-12 / I18N-07)', () => {
  it('no "// TODO: native-speaker review" marker remains in src/content/', () => {
    const hits: string[] = []
    for (const file of CONTENT_FILES) {
      const text = readFileSync(file, 'utf-8')
      if (text.includes(REVIEW_MARKER)) hits.push(file)
    }
    expect(hits, `Unresolved native-speaker review markers in:\n${hits.join('\n')}`).toEqual([])
  })
})
```

**Adaptation for STATS-05 (per CONTEXT D-09/D-10):**
- Scope: scan `src/components/` AND `src/app/` (two roots), not `src/content/`.
- File filter: still skip `*.test.ts` AND `*.test.tsx` (note `.tsx` extension — analog only filters `.test.ts`).
- Forbidden tokens (case-sensitive component names, case-insensitive visual regex):
  - Plain substring match: `StatsFooter`, `ResetStatsDialog`
  - Regex match (case-insensitive): `/MIN TODAY/i`, `/STREAK/i`, `/SESSIONS/`, `/TOTAL TIME/i` — note `SESSIONS` is required-uppercase per D-10, so use `/SESSIONS/` (no `/i`) or `/\bSESSIONS\b/`.
- Per-file aggregation of hits with descriptive `expect(...).toEqual([])` failure message naming both the file AND the token (so a future contributor sees what tripped the guard).
- Filename guidance: Discretion in CONTEXT allows `src/app/no-stats-ui.test.ts` or `src/components/stats-ui-absence.test.ts`. **Recommend `src/content/content.no-stats-ui.test.ts`** — colocates with the existing marker-guard analog so future readers find both drift-guards via the same `src/content/content.*` glob. Alternatively, root the file where the scanned dir lives (e.g. `src/app/no-stats-ui.test.ts`) if the planner prefers proximity to the scanned tree. Either is acceptable; do not split into two files.
- One-line guidance: Copy the analog structure verbatim, parameterize the dir roots, build a token list, and emit a self-explanatory failure message.

---

### `src/storage/practices.test.ts` — add STATS-04 regression block

**Analog:** existing `describe('recordResonantSession (Pitfall 3 / T-30-08)' ...)` at lines 240-265, plus matching blocks for `recordNaviKriyaSession` (267-318) and `recordStretchSession` (487-512)

**Existing pattern to copy** (lines 240-248):
```typescript
describe('recordResonantSession (Pitfall 3 / T-30-08)', () => {
  it('increments only practices.resonant.stats and leaves naviKriya untouched', () => {
    const next = recordResonantSession(40_000, false, { now: () => 1_700_000_000_000 })
    expect(next.totalSessions).toBe(1)
    const map = loadPractices()
    expect(map.resonant.stats.totalSessions).toBe(1)
    expect(map.resonant.stats.totalElapsedSeconds).toBe(40)
    expect(map.naviKriya.stats).toEqual(ZERO_STATS)
  })
```

**Adaptation for STATS-04 (per CONTEXT D-08):**
- Add one top-level `describe('STATS-04 record-and-persist regression', ...)` with three `it` cases (one per practice).
- For each case: call `recordXSession(...)` → call `loadPractices()` (or `loadEnvelope()` if more direct) → assert `totalSessions = prior+1`, `totalElapsedSeconds = prior + N`, `lastSessionAtMs` set to the injected `deps.now()`, `lastSessionDurationSeconds` correct.
- Use the existing `{ now: () => 1_700_000_000_000 }` deps-injection style — no new test seam.
- No React render, no integration smoke (D-08 explicit).
- Place block at the bottom of the file, after the existing per-practice `record*Session` blocks, so it reads as "regression lock" rather than duplicate coverage.

One-line guidance: Copy the `recordResonantSession` test shape three times (resonant / stretch / naviKriya), assert the four envelope fields, label the block `STATS-04`.

---

### Delete `src/storage/practices.ts:resetPracticeStats` (lines 333-349)

**Action:** Remove the function block, including its preceding `// Pitfall 4: practice-scoped reset.` comment (lines 333-335).

**Existing code** (lines 333-349):
```typescript
// Pitfall 4: practice-scoped reset. Writes ZERO_STATS into the named practice's
// stats slice ONLY — the other practice's slice (settings and stats) is left
// untouched.
export function resetPracticeStats(practice: PracticeId, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope(
    {
      ...env,
      practices: {
        ...practices,
        [practice]: { ...practices[practice], stats: { ...ZERO_STATS } },
      },
    },
    deps,
  )
}
```

**Also delete:**
- The `resetPracticeStats` re-export from `src/storage/index.ts` (verify via `grep`).
- The two `describe('resetPracticeStats ...' ...)` blocks at `practices.test.ts:320-348` and `practices.test.ts:515-532`.
- Delete the import at `practices.test.ts:17`.

One-line guidance: Delete the function + its comment + its two test blocks + its re-export; the TypeScript compiler then flags the App.tsx consumer at line 68 + line 686.

---

### Delete `src/storage/format.ts:formatLastSession` (lines 67-71) — verify `formatLastSessionDate` orphan status

**Existing code** (lines 67-71):
```typescript
// D-08: "Last: May 7 · 10 min" — null when stats has no last-session data.
export function formatLastSession(stats: PersistedStats, now: () => number = Date.now): string | null {
  if (stats.lastSessionAtMs === null || stats.lastSessionDurationSeconds === null) return null
  return `Last: ${formatLastSessionDate(stats.lastSessionAtMs, now)} · ${formatLastSessionDuration(stats.lastSessionDurationSeconds)}`
}
```

**Verification step (per CONTEXT canonical_refs line 89):**
- `grep -rn 'formatLastSessionDate\b' src/` — if the only remaining consumer after `StatsFooter.tsx` deletion is `formatLastSession` (itself being deleted), then `formatLastSessionDate` becomes orphaned. **Currently** (pre-deletion) StatsFooter at line 24 also imports it directly, so deleting StatsFooter removes that consumer too. After both deletions, `formatLastSessionDate` is dead. Delete it.
- Same for `formatLastSessionDuration` (line 63 — verify via grep, almost certainly orphaned after StatsFooter deletion).
- `formatTotalMinutes` (line 40) and `formatSessionCount` (line 48) — verify before deleting (these may have other internal consumers).
- Delete the matching `describe('formatLastSession ...')` block at `format.test.ts:89-115` AND any orphaned-formatter `describe` blocks.

One-line guidance: Delete `formatLastSession`, verify via grep that `formatLastSessionDate`/`formatLastSessionDuration` are now orphaned (both consumed only by StatsFooter and `formatLastSession`), and delete those too along with their tests.

---

### Modify `src/app/App.tsx` — strip every stats-UI consumer

**Action sites (all line numbers from CONTEXT):**

1. **Imports** (L13-14): delete two component imports.
   ```typescript
   import { StatsFooter } from '../components/StatsFooter'        // delete
   import { ResetStatsDialog } from '../components/ResetStatsDialog'  // delete
   ```

2. **Storage barrel import** (L68): delete `resetPracticeStats,` from the multi-import block.

3. **State machine** (L143): delete `const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false)`.

4. **`activeStats` subscription** (L302-304): delete — no consumers after StatsFooter removal. `recordResonantSession` / `recordStretchSession` / `recordNaviKriyaSession` re-read the envelope via the WR-07 single-read pattern in `src/storage/stats.ts:89-102`:
   ```typescript
   // WR-07: single envelope read. Previously recordSession called loadStats
   // (which calls readEnvelope) AND then readEnvelope again before write...
   const env = readEnvelope(deps)
   const stats = coerceStats(env.stats)
   ```
   This is why the App-level `activeStats` snapshot is now redundant.

5. **Per-practice stats useState** (L134-141 — `resonantStats` / `naviKriyaStats` / `stretchStats`): verify whether the cross-tab storage listener (STORAGE-03) still writes to these. If the storage listener writes only to refresh the StatsFooter render gate, it's now dead too. **Planner: re-read App.tsx around the storage listener before deleting these — they may still be touched by `recordXSession` return values that nothing reads.** Delete the unused setters at minimum; consider deleting the state entirely if no callers remain.

6. **Comments** (L131, L300, L505, L511): these are WHY-comments referencing `StatsFooter` / `ResetStatsDialog` / `onResetClick`. After deletion, the references dangle. Delete the comments wholesale; do not rewrite (Tiger Style WHY-only comments — no live referent → no purpose).

7. **WR-09 auto-close** (L519): delete `setResetDialogOpen(false)` from the `inSessionView` effect. Keep `setLearnDialogOpen(false)` and `setSettingsDialogOpen(false)`.

8. **Callback handlers** (L675-695): delete `onResetClick`, `confirmReset`, `cancelReset` entirely.

9. **Render block** (L1270-1278): delete the entire `{!inSessionView && !nkSessionActive && activeStats.totalSessions > 0 && (<StatsFooter ... />)}` gate.

10. **Dialog block** (L1304-1310): delete the entire `<ResetStatsDialog ... />` element.

One-line guidance: After the deletions, run `tsc --noEmit` — the compiler will flag any consumer you missed (this is the value of D-01's clean-cut over leaving orphan symbols).

---

### Modify `src/app/App.dialog.test.tsx`

**Action:** Delete the entire `it('auto-closes ResetStatsDialog when the session starts underneath it (WR-09)' ...)` block at lines 332-362 (30 lines, one `it` case). Surrounding `describe` block (likely the WR-09 / Phase 6 dialog suite) stays intact.

**Pattern to delete** (lines 332-362):
```typescript
it('auto-closes ResetStatsDialog when the session starts underneath it (WR-09)', async () => {
  // ResetStatsDialog is triggered from StatsFooter, which only renders when
  // stats.totalSessions > 0. Seed the envelope so the Reset button is visible.
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, stats: {...} }))
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(screen.getByRole('dialog', { name: 'Reset HRV Breathing stats?' })).toBeVisible()
  await startAndAdvancePastLeadIn()
  expect(screen.queryByRole('dialog', { name: 'Reset HRV Breathing stats?' })).not.toBeInTheDocument()
})
```

One-line guidance: Surgical delete of the single `it` case; verify no shared `beforeEach` seeds stats-only state that becomes dead.

---

### Modify `src/app/App.persistence.test.tsx`

**Action:** Delete three blocks wholesale:
- `describe('LOCL-02 — footer gating (D-09 / D-10)', ...)` — lines 227-265 (39 lines, 3 `it` cases for the footer-gating UI).
- `describe('LOCL-03 — reset clears stats only (D-11 / D-12)', ...)` — lines 270-344 (75 lines, 3 `it` cases for the Reset dialog flow).
- `describe('STORAGE-03 — cross-tab stats refresh' ...)` at line 349 — **verify scope at plan time.** The first `it` (lines 350-389) asserts the StatsFooter re-renders on `storage` event. With StatsFooter gone, this assertion is dead. The second `it` (line 391+) asserts the key-filter — still valid if STORAGE-03's listener exists for other reasons; otherwise drop both. **Planner decision:** if the storage listener is being deleted in step 5 of the App.tsx changes above, drop the entire `STORAGE-03` describe block; if the listener stays for non-stats reasons, drop only the first `it` and adapt the second.

Also delete the line 45 comment reference: `// env.practices.resonant.stats — recordResonantSession / resetPracticeStats`.

One-line guidance: Drop LOCL-02 + LOCL-03 whole; STORAGE-03 disposition depends on whether the storage listener survives the App.tsx prune.

---

### Modify `src/content/strings.ts` — typed-catalog block deletion

**Analog:** Phase 19 / Phase 26 I18N typed-catalog precedent (`UiStrings` is a typed `Record<LocaleId, UiStrings>`). Removing a block from the type AND both catalogs is the clean path — TypeScript flags every stale consumer at compile time.

**Sites to delete:**
1. **Type definition** (L114-123): delete the entire `readonly stats: { ... }` block from `UiStrings`.
   ```typescript
   readonly stats: {
     readonly sessionsCount: (n: number) => string
     readonly totalMinutes: (seconds: number) => string
     readonly lastSessionPrefix: (date: string, duration: string) => string
     readonly totalSuffix: string
     readonly reset: string
     readonly roundsCompletedLabel: string
   }
   ```

2. **Type definition** (separate location — verify exact line): delete `readonly resetStatsDialog: { title, confirm, cancel }` from `UiStrings`.

3. **Type definition** (separate location): delete `readonly resetStatsTitle: (practiceName: string) => string` from `UiStrings.practice`.

4. **EN catalog** — `resetStatsDialog` block (L209-213):
   ```typescript
   resetStatsDialog: {
     title: 'Reset practice stats?',
     confirm: 'Reset',
     cancel: 'Keep',
   },
   ```

5. **EN catalog** — `stats` block (L296-306):
   ```typescript
   stats: {
     sessionsCount: (n) => (n === 1 ? '1 session' : `${String(n)} sessions`),
     totalMinutes: (seconds) => { ... },
     lastSessionPrefix: (date, duration) => `Last: ${date} · ${duration}`,
     totalSuffix: 'total',
     reset: 'Reset',
     roundsCompletedLabel: 'Rounds',
   },
   ```

6. **EN catalog** — `practice.resetStatsTitle` row (L345): delete.

7. **PT-BR catalog** — matching `resetStatsDialog` block (search around L470-485).

8. **PT-BR catalog** — `stats` block (L477+).

9. **PT-BR catalog** — `practice.resetStatsTitle` row (search around the PT-BR `practice` block).

**LOCKED_COPY guard:** None of these strings are in `LOCKED_COPY` (which covers Forrest/medical claim-safe copy only — confirmed via CONTEXT line 103). The byte-equality guard is not affected.

One-line guidance: Delete the three type-level blocks first; `tsc` will then walk you to every stale catalog entry and every stale consumer (including the App.tsx `uiStrings.stats` / `uiStrings.resetStatsDialog` / `uiStrings.practice.resetStatsTitle` references).

---

### Modify `src/components/SettingsDialog.tsx` — comment debt

**Existing code** (lines 20-21, 25-28):
```typescript
// D-13: NO explicit focus call on open — SettingsDialog has no destructive default;
//        native focus-return contract; differs from ResetStatsDialog which focuses Keep.
// ...
// Three structural deltas from ResetStatsDialog:
//   (a) single onClose prop (not onConfirm/onCancel)
//   (b) inSessionView prop threaded as disabled={inSessionView} to all four pickers
//   (c) NO explicit focus on open (D-13 — no destructive default; native focus-return only)
```

**Action (per CONTEXT code_context line 110):** After `ResetStatsDialog` is deleted, these comments reference a non-existent sibling. Two options:
- (A) Rewrite as standalone documentation: "Single onClose prop (no destructive default — no focus call on open; native focus-return contract handles the close)."
- (B) Delete (Tiger Style WHY-only comments — if the WHY referenced a live sibling and that sibling is gone, the WHY no longer informs).

**Recommendation:** Option B (delete). The structural deltas were a comparison artifact; the standalone behavior is already documented by D-15/D-18 above (which stay).

One-line guidance: Delete the two `ResetStatsDialog` comment references; do not rewrite. Keep the D-13 first half ("NO explicit focus call on open — SettingsDialog has no destructive default; native focus-return contract").

---

### Delete `src/components/StatsFooter.tsx` + `StatsFooter.test.tsx` (same commit)

**Action:** `git rm` both files. No imports remain after the App.tsx prune; the TypeScript compiler will not flag (D-06 delete-with-component policy).

**Precedent (CONTEXT D-06):** Phase 36 spike-findings-hrv removal — tightly-coupled multi-file deletion in one commit. See `.planning/phases/36-housekeeping-bookkeeping-reset/36-08-PLAN.md:54-62` for the WHY ("tightly coupled... single commit reads cleaner than three for a coordinated cleanup"). Mirror this posture for the StatsFooter component+test commit.

One-line guidance: `git rm` both files in the same commit as the App.tsx import strip — the import L13 and the file deletion belong together.

---

### Delete `src/components/ResetStatsDialog.tsx` + `ResetStatsDialog.test.tsx` (same commit)

**Action:** `git rm` both files. Same precedent as above (Phase 36-08 multi-file delete).

One-line guidance: Same commit as the App.tsx import L14 + dialog block L1304-1310 deletion.

---

## Shared Patterns

### Multi-file delete commit shape (Phase 36-08 precedent)

**Source:** `.planning/phases/36-housekeeping-bookkeeping-reset/36-08-PLAN.md:55-62`

> "the three items are tightly coupled (CLAUDE.md only existed to point at the removed skill; the gitignore entry prevents the just-removed dir from getting re-committed) and a single commit reads cleaner than three for a coordinated cleanup."

**Apply to Phase 37 commit grouping:**

The planner's "Claude's Discretion" call (CONTEXT discretion section line 59) is whether to ship one atomic commit or split. The Phase 36-08 precedent says "tightly-coupled → combine". The cleanest split for Phase 37, applying that heuristic:

1. `chore(37): delete StatsFooter component + tests + App.tsx render gate` — StatsFooter.tsx + .test.tsx + App.tsx L13 import + L1270-1278 render block + L302-304 activeStats subscription + L675 onResetClick.
2. `chore(37): delete ResetStatsDialog + reset flow` — ResetStatsDialog.tsx + .test.tsx + App.tsx L14 import + L143 state + L519 WR-09 close + L679-695 confirm/cancel + L1304-1310 dialog block + App.dialog.test.tsx L332-362 + App.persistence.test.tsx LOCL-03.
3. `chore(37): delete resetPracticeStats + formatLastSession dead code` — practices.ts L333-349 + practices.test.ts L320-348/L515-532 + format.ts L67-71 + format.test.ts L89-115 + App.tsx L68 import.
4. `chore(37): delete stats i18n surface (EN + PT-BR)` — strings.ts type blocks + EN catalog + PT-BR catalog.
5. `chore(37): drop App.persistence.test.tsx LOCL-02 footer-gating + STORAGE-03 stats branch` — surgical test prune.
6. `test(37): STATS-04 record-and-persist regression` — new test block in practices.test.ts.
7. `test(37): STATS-05 drift-guard for stats-UI tokens` — new test file.
8. `chore(37): SettingsDialog comment debt cleanup` — small comment-only diff.

Alternative: One atomic `chore(37): remove stats UI surface (STATS-01..03)` commit covering items 1-5, plus separate `test(37):` commits for items 6-7 and the comment cleanup item 8. Both are defensible; favor split for git-history clarity per Tiger Style (CONTEXT code_context line 105).

### Conventional-commit scope

**Source:** Existing Phase 37 git log (`feat(37):`, `fix(37):`, `docs(37):` per Phase 36 precedent commits like `fix(36): IN-01 HOUSE-09 ...`).

Use `(37):` scope. Predominant type for this phase: `chore(37):` (deletions), `test(37):` (new tests), `docs(37):` (comment cleanup).

### Frozen-catalog deletion (Phase 19/26 I18N pattern)

**Source:** Phase 19 INFRA / Phase 26 I18N-07 precedent — `UiStrings` typed-record pattern.

**Apply to strings.ts deletion:** Delete the type-level block first, run `tsc --noEmit`, then delete the EN and PT-BR catalog entries in the same commit. The TypeScript compiler is the linter — every stale consumer surfaces as a compile error pointing at the App.tsx render block (which is being deleted in the same wave anyway). LOCKED_COPY byte-equality guard is unaffected (stats strings are NOT locked copy — confirmed CONTEXT line 103).

## No Analog Found

None. Every file in this phase has either a self-analog (sites being pruned in-place) or an exact external analog (`content.no-review-markers.test.ts` for STATS-05; `recordResonantSession` tests for STATS-04; Phase 36-08 PLAN for multi-file deletion commit shape).

## Metadata

**Analog search scope:** `src/content/`, `src/storage/`, `src/components/`, `src/app/`, `.planning/phases/36-housekeeping-bookkeeping-reset/`
**Files scanned:** ~25
**Pattern extraction date:** 2026-05-20
