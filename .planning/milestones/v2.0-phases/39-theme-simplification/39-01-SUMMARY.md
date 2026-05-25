---
phase: 39-theme-simplification
plan: 01
subsystem: domain
tags: [theme, settings, prefs, coerce, typescript]

# Dependency graph
requires:
  - phase: 14-customization
    provides: per-field non-throwing coercers (coerceTheme via isValidTheme + DEFAULT_THEME)
  - phase: 8-storage
    provides: envelope tolerance (readEnvelope spread-then-override preserves unknown values on disk until next savePrefs)
  - phase: 38-variant-removal
    provides: VAR-05 forward-compat round-trip test pattern (commit 4bd5e78) mirrored up-front by THM-05
provides:
  - ThemeId union narrowed from 6 to 3 members ('light' | 'dark' | 'system')
  - THEME_OPTIONS shrunk from 6 to 3 entries (drives ThemePicker render auto-shrink in Plan 03)
  - THM-05 read-coerce + round-trip regression test locked up-front
  - Compile cascade trigger — downstream Record<Exclude<ThemeId,'system'>, X> table literals in faviconPalette.ts and theme.contrast.test.ts now TS-fail until they collapse to 2 keys (Plan 02 collapses them)
affects: [39-02-favicon-contrast-css, 39-03-i18n-themepicker, 39-04-fouc-script, 39-05-drift-guard, 41-mono-zen-palette]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Union narrowing + auto-routed read-coerce: shrinking ThemeId + THEME_OPTIONS makes isValidTheme('moss'|'slate'|'dusk') return false, which routes coerceTheme(deprecated) to DEFAULT_THEME ('system') with zero body change."
    - "Forward-compat regression captured up-front (Phase 38 VAR-05 analog applied proactively rather than retroactively)."
    - "No STATE_VERSION bump (Phase 8 D-01 envelope tolerance + per-field coercer)."

key-files:
  created: []
  modified:
    - src/domain/settings.ts
    - src/storage/prefs.test.ts

key-decisions:
  - "D-01: Tighten ThemeId to 'light' | 'dark' | 'system'; keep the field; let coerceTheme handle THM-05 via the unchanged body (isValidTheme(raw) ? raw : DEFAULT_THEME). No STATE_VERSION bump."
  - "D-02: Two-level THM-05 regression test (read-coerce + round-trip) added up-front to lock the re-persist contract against future hook refactors that might break the mount-time savePrefs flow."
  - "Plan 01 intentionally leaves tsc --noEmit red at the commit boundary; downstream literals (faviconPalette / theme.contrast.test / strings.ts / theme.css / index.html) still contain moss/slate/dusk keys. Wave 2 plans (02/03/04) restore tsc green. Matches Phase 38 Plan 01's deferred-green pattern."

patterns-established:
  - "Union narrowing as the type-level switch that auto-flips downstream coercion behavior — no body edits needed in coerceTheme."
  - "Up-front forward-compat lock (THM-05 captured in Plan 01 vs Phase 38 VAR-05 captured retroactively as commit 4bd5e78) — proactive validation strategy."

requirements-completed: [THM-01, THM-02, THM-03, THM-04, THM-05]

# Metrics
duration: 2min
completed: 2026-05-21
---

# Phase 39 Plan 01: Domain type collapse + THM-05 lock Summary

**ThemeId union narrowed from 6 to 3 members ('light' | 'dark' | 'system'), THEME_OPTIONS shrunk to 3 entries, and the THM-05 read-coerce + round-trip regression test added up-front to lock the deprecated-value re-persist contract.**

## Performance

- **Duration:** ~2 min (112s)
- **Started:** 2026-05-21T16:21:25Z
- **Completed:** 2026-05-21T16:23:17Z (approx.)
- **Tasks:** 2 / 2
- **Files modified:** 2

## Accomplishments

- `ThemeId` union shrunk from `'light' | 'dark' | 'system' | 'moss' | 'slate' | 'dusk'` to `'light' | 'dark' | 'system'` (THM-01..03 closed at the type level).
- `THEME_OPTIONS` shrunk from 6 entries to 3 entries; `isValidTheme` body and `DEFAULT_THEME` value byte-identical to before (THM-04 closed at the option-list level — the `ThemePicker` render auto-shrinks via Plan 03's verification half).
- `coerceTheme('moss'|'slate'|'dusk')` now routes to `'system'` automatically via the union narrowing — no body edits to `coerceTheme` (THM-05 read-side mechanism).
- Two new it() cases added to `src/storage/prefs.test.ts` lock THM-05 end-to-end:
  1. `'coerces deprecated persisted theme values to "system" on read — THM-05 (CONTEXT D-02)'` — read-coerce loop over `['moss', 'slate', 'dusk']`.
  2. `'re-persists deprecated theme as "system" on the next savePrefs call — THM-05 round-trip (CONTEXT D-02)'` — read → savePrefs → re-read raw JSON → assert `prefs.theme === 'system'` (locks the re-persist contract).
- All 26 cases in `src/storage/prefs.test.ts` pass (24 existing + 2 new THM-05).

## Task Commits

Each task was committed atomically:

1. **Task 1: Narrow ThemeId union and shrink THEME_OPTIONS in src/domain/settings.ts** — `99bcf4b` (feat)
2. **Task 2: Add the two-level THM-05 regression test to src/storage/prefs.test.ts** — `03912aa` (test)

## Files Created/Modified

### `src/domain/settings.ts` — surgical edit (lines 97-99)

**Before:**
```typescript
export type ThemeId = 'light' | 'dark' | 'system' | 'moss' | 'slate' | 'dusk'

export const THEME_OPTIONS = ['light', 'dark', 'system', 'moss', 'slate', 'dusk'] as const satisfies readonly ThemeId[]
```

**After:**
```typescript
export type ThemeId = 'light' | 'dark' | 'system'

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const satisfies readonly ThemeId[]
```

- `isValidTheme(v)` body unchanged: `return typeof v === 'string' && (THEME_OPTIONS as readonly string[]).includes(v)`
- `DEFAULT_THEME: ThemeId = 'system'` unchanged
- Diff stat: `1 file changed, 2 insertions(+), 2 deletions(-)`

### `src/storage/prefs.test.ts` — additive edit (+34 lines)

Added a new top-level describe block at the end of the file:

```typescript
describe('THM-05 forward-compat (CONTEXT D-02)', () => {
  // WHY: returning user with pre-Phase-39 persisted theme: 'moss'|'slate'|'dusk' must
  // read through coercePrefs as theme: 'system' (read-coerce half), and the next
  // savePrefs must overwrite the on-disk value with 'system' (round-trip half).
  // Mirrors Phase 38 VAR-05 pattern (commit 4bd5e78); captured up-front per CONTEXT §specifics.

  it('coerces deprecated persisted theme values to "system" on read — THM-05 (CONTEXT D-02)', () => {
    for (const deprecated of ['moss', 'slate', 'dusk']) {
      window.localStorage.setItem(STATE_KEY, JSON.stringify({
        version: 1,
        prefs: { theme: deprecated, timbre: 'bowl', cue: 'arrow', locale: 'en' },
      }))
      expect(loadPrefs().theme).toBe('system')
    }
  })

  it('re-persists deprecated theme as "system" on the next savePrefs call — THM-05 round-trip (CONTEXT D-02)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      prefs: { theme: 'moss', timbre: 'bowl', cue: 'arrow', locale: 'en' },
    }))
    const loaded = loadPrefs()
    expect(loaded.theme).toBe('system')
    savePrefs(loaded)
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { prefs: { theme: string } }
    expect(raw.prefs.theme).toBe('system')
  })
})
```

**Seed shape:** `{ version: 1, prefs: { theme: deprecated, timbre: 'bowl', cue: 'arrow', locale: 'en' } }` — `timbre: 'bowl'`, `cue: 'arrow'`, `locale: 'en'` are all valid current values per `src/domain/settings.ts` TIMBRE_OPTIONS / CUE_OPTIONS / LOCALE_OPTIONS.

**Assertion shape:**
- Half 1: `expect(loadPrefs().theme).toBe('system')` for each of `moss`, `slate`, `dusk`.
- Half 2: `expect(loaded.theme).toBe('system')` after `loadPrefs()`; then `expect(raw.prefs.theme).toBe('system')` after `savePrefs(loaded)` re-reads the raw `localStorage[STATE_KEY]` JSON.

- Diff stat: `1 file changed, 34 insertions(+)` — within the ≤45-line additive budget.
- No edits to existing test cases. No new imports (`STATE_KEY`, `loadPrefs`, `savePrefs` already in scope).
- `THEME_OPTIONS` iteration loop at L111 is loop-invariant (already iterates whatever `THEME_OPTIONS` contains) — auto-shrinks from 6 → 3 entries with no code edit; `git diff src/storage/prefs.test.ts | grep -E "^[+-].*THEME_OPTIONS"` returns 0 matches.

## Decisions Made

- **D-01 satisfied:** ThemeId union narrowed to 3 members; THEME_OPTIONS shrunk to 3 entries; coerceTheme body unchanged; DEFAULT_THEME = 'system' unchanged; no STATE_VERSION bump.
- **D-02 satisfied:** Two-level THM-05 regression test (read-coerce loop + round-trip) added up-front, matching the Phase 38 VAR-05 forward-compat pattern (commit 4bd5e78 analog).
- **Deferred-green at commit boundary acknowledged:** `tsc --noEmit` is intentionally red after this plan because downstream consumers (`faviconPalette.ts` `Record<Exclude<ThemeId,'system'>, string>` literal, `theme.contrast.test.ts` `THEME_05_FLOORS` literal, `strings.ts` `themes` block, `index.html:18` FOUC script, `theme.css` `[data-theme='moss'|'slate'|'dusk']` blocks) still contain `moss`/`slate`/`dusk` keys/blocks. This matches Phase 38 Plan 01's documented deferred-green pattern; wave 2 plans (02/03/04) restore tsc green.

## Deviations from Plan

None — plan executed exactly as written.

Notes on potential deviation points that were checked and turned out to require no action:
- **Nearby comment-debt sweep (Task 1 step 5):** The comment at L94-95 references Phase 14 D-01 generically ("v1.1 customization enum surfaces — predicates are FINAL") and does not enumerate the 5 deprecated themes by name. No update needed.
- **THEME_OPTIONS iteration in existing prefs.test.ts case (Task 2 step 1 verification):** The existing `for (const opt of THEME_OPTIONS)` at L111 is loop-invariant. After Task 1's union narrowing, it iterates `['light', 'dark', 'system']` automatically. No surgical strip needed.
- **Test toolchain (Task 2 step 6):** The plan specified `pnpm test`, but the worktree uses `npm` (no `pnpm` in `$PATH`). Used the main repo's `node_modules/.bin/vitest` binary against worktree files instead. All 26 cases pass. This is a tool-mapping operational note, not a deviation from the plan's intent.

## Issues Encountered

- **Worktree has no `node_modules`** — the project's worktree was provisioned without `pnpm install` (and `pnpm` is not on `$PATH`; only `npm` is available). Resolved by running `vitest` from the main repo's `node_modules/.bin/vitest` against the worktree's `cwd`. Vitest's cwd-relative config resolution picked up the worktree's vitest.config and ran all 26 prefs.test.ts cases green.

## User Setup Required

None.

## Next Phase Readiness

- **Plan 02 ready:** the compile cascade is armed — `Record<Exclude<ThemeId, 'system'>, string>` table literals in `faviconPalette.ts` and `theme.contrast.test.ts` will TypeScript-fail compile against the now-deprecated `moss`/`slate`/`dusk` keys. Plan 02 deletes the 3 entries from each literal + the 3 `[data-theme='moss'|'slate'|'dusk']:root` blocks from `theme.css` + the 5-keys assertion in `faviconPalette.test.ts`.
- **Plan 03 ready:** the `UiStrings.themes` block in `src/content/strings.ts` is now type-incoherent (3 extra `themes.moss`/`slate`/`dusk` fields against the narrower `ThemeId`-derived consumers). Plan 03 deletes those fields from the type + EN + PT-BR catalogs and strips the deprecated assertions from `ThemePicker.test.tsx`.
- **Plan 04 ready:** `index.html:18` FOUC script still contains `['light','dark','moss','slate','dusk']` allowlist + 3 deprecated hex map entries. Plan 04 surgical-edits them out while preserving the minified IIFE shape.
- **Plan 05 ready:** the drift-guard test will lock the done-state once all 4 surface deletions land.
- **THM-06/07/08 still pending:** THM-06 (favicon palette collapse) + THM-07 (favicon.sync re-guard) closed in Plan 02; THM-08 (WCAG contrast guard regen) auto-satisfied via Plan 02's `THEME_05_FLOORS` literal strip + the auto-shrinking `CONCRETE_THEMES` filter.
- **`tsc --noEmit` red at this commit boundary** is expected and documented. Wave 2 plans restore it.

## Self-Check: PASSED

Verified after writing SUMMARY.md:

- `src/domain/settings.ts` — modified, present in worktree.
- `src/storage/prefs.test.ts` — modified, present in worktree.
- Commit `99bcf4b` — found in `git log --oneline -3` (Task 1 commit).
- Commit `03912aa` — found in `git log --oneline -3` (Task 2 commit).
- `grep -cE "'(moss|slate|dusk)'" src/domain/settings.ts` returns `0`.
- `grep -c "THM-05" src/storage/prefs.test.ts` returns `4` (≥ 2 required).
- `vitest run src/storage/prefs.test.ts` exits 0 with 26/26 tests passing.

---

*Phase: 39-theme-simplification*
*Completed: 2026-05-21*
