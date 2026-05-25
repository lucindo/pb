---
phase: 39-theme-simplification
plan: 03
subsystem: i18n + hook tests + component tests
tags: [theme-simplification, i18n-clean-cut, surgical-strip-rotation, THM-04, D-07, D-12]
dependency_graph:
  requires:
    - 39-01 (THEME_OPTIONS narrowed to 3; UserPrefs.theme: ThemeId narrowed)
  provides:
    - "THM-04 closed end-to-end (type-level + display-strings + render)"
    - "Display strings collapsed: UiStrings.themes 6 → 3 fields; EN + PT-BR catalogs aligned"
    - "ThemePicker.test.tsx: 3-option contract locked; behavioral rotations preserve click/disabled/aria-checked coverage"
    - "Cross-cutting hook tests rotated to surviving theme IDs (useTheme + useThemeChoice + useFavicon)"
  affects:
    - "src/content/strings.ts (3 type fields + 6 catalog entries deleted)"
    - "src/components/ThemePicker.tsx (D-22 comment debt: enumerate 3 themes)"
    - "src/components/ThemePicker.test.tsx (6 → 3 option contract; 4 behavioral rotations + L87 description fix)"
    - "src/hooks/useTheme.test.ts (cross-tab + same-tab event tests rotated)"
    - "src/hooks/useThemeChoice.test.ts (16 hits rotated — fixtures + setters + it() descriptions)"
    - "src/hooks/useFavicon.test.ts (8 hits rotated — including 3 FAVICON_COLORS.* property accesses)"
tech_stack:
  added: []
  patterns:
    - "D-07 clean-cut i18n deletion (no review markers; mirrors Phase 38 D-08)"
    - "D-12 surgical strip with rotation (mirrors Phase 38 D-10 / Phase 37 D-07)"
key_files:
  created: []
  modified:
    - src/content/strings.ts
    - src/components/ThemePicker.tsx
    - src/components/ThemePicker.test.tsx
    - src/hooks/useTheme.test.ts
    - src/hooks/useThemeChoice.test.ts
    - src/hooks/useFavicon.test.ts
key_decisions:
  - "Rotation pairing in useThemeChoice.test.ts: every 'moss' → 'dark'; every 'dusk' and 'slate' → 'system' (16 hits, internally consistent)"
  - "Rotation pairing in useFavicon.test.ts: Group A mount seed test rotates moss → light (avoiding duplicate it() with L72 dark test, gives complementary dark/light coverage); Group B cross-tab rotates moss → light for non-trivial dark→light delta; Group C same-tab CustomEvent rotates dusk → light for clean named-theme transition"
  - "Rotation in useTheme.test.ts: cross-tab event uses dark → light; same-tab CustomEvent uses dark → light (both preserve non-trivial named-theme delta)"
  - "ThemePicker.test.tsx rotation kept 8 it() blocks intact (no case deleted); rotations preserve click/disabled/aria-checked invariants"
  - "strings.test.ts is zero-edit (existing THEME_OPTIONS iteration auto-shrinks; no deprecated literal references)"
  - "App.session.test.tsx is zero-edit (grep confirms only spurious 'scale(0.79)' substring matches)"
metrics:
  tasks_total: 3
  tasks_completed: 3
  files_modified: 6
  files_created: 0
  commits: 3
  duration: "~25 minutes"
  completed: 2026-05-21
---

# Phase 39 Plan 03: Theme display-strings collapse + cross-cutting test rotation Summary

**One-liner:** Stripped moss/slate/dusk from UiStrings type + EN/PT-BR catalogs (D-07 clean cut), aligned ThemePicker tests to the 3-option set, and surgically rotated deprecated-theme fixtures + FAVICON_COLORS property accesses across useTheme/useThemeChoice/useFavicon test files (D-12 surgical strip with rotation). Closes THM-04 end-to-end (type + display strings + render).

## What Changed

### src/content/strings.ts — Before/After

**UiStrings.themes type block (L35-42 before; L35-39 after):**

```typescript
// Before:
readonly themes: {
  readonly light: string
  readonly dark: string
  readonly system: string
  readonly moss: string
  readonly slate: string
  readonly dusk: string
}

// After:
readonly themes: {
  readonly light: string
  readonly dark: string
  readonly system: string
}
```

**EN catalog themes block:**

```typescript
// Before:
themes: {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  moss: 'Moss',
  slate: 'Slate',
  dusk: 'Dusk',
},

// After:
themes: {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
},
```

**PT-BR catalog themes block:**

```typescript
// Before:
themes: {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
  moss: 'Musgo',
  slate: 'Ardósia',
  dusk: 'Crepúsculo',
},

// After:
themes: {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
},
```

**Net delete:** 3 type fields + 6 catalog entries (3 EN + 3 PT-BR) = 9 lines removed.

**src/content/strings.test.ts:** Zero-edit. Existing `for (const id of THEME_OPTIONS)` iteration (~L36-42) auto-shrinks from 6 to 3 because THEME_OPTIONS shrunk in Plan 01. 33/33 tests pass.

### src/components/ThemePicker.tsx — Comment debt

L8 D-22 comment updated from "Light/Dark/System/Moss/Slate/Dusk verbatim" to "Light/Dark/System verbatim". JSX render body and props are unchanged (the `THEME_OPTIONS.map(...)` consumer auto-shrinks).

### src/components/ThemePicker.test.tsx — 6 edits across 8 it() blocks

| Case (line range)          | Before                                                                        | After                                                                          |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| L37-43 option-list test    | "all 6 options"; toHaveLength(6); 6-label array                               | "all 3 options"; toHaveLength(3); `['Light', 'Dark', 'System']`                |
| L45-56 aria-checked test   | seedTheme('moss'); find Moss button; assert moss is checked                   | seedTheme('dark'); find Dark button; assert dark is checked + updated comment  |
| L58-70 click-write test    | seed light; click Slate; assert stored=='slate'                               | seed light; click System; assert stored=='system'                              |
| L87 disabled-sweep desc    | "all 6 buttons have the disabled attribute"                                   | "all 3 buttons have the disabled attribute"                                    |
| L96-109 disabled-click     | click Dusk; assert stored stays 'light'                                       | click Dark; assert stored stays 'light'                                        |
| L111-117 disabled-arias    | seedTheme('dusk'); duskButton aria-checked=true while disabled                | seedTheme('system'); systemButton aria-checked=true while disabled             |

8 it() blocks preserved; behavioral coverage (click writes, disabled blocks click, aria-checked tracks state) intact. 8/8 tests pass.

### src/hooks/useTheme.test.ts — Cross-tab + same-tab event rotations

| Line | Before                                                                       | After                                                                          |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| L126 | `prefs: { theme: 'moss', timbre: 'bowl', locale: 'en' }`                     | `prefs: { theme: 'light', ... }` (paired with seedPrefs('dark') at L119 — non-trivial delta) |
| L142 | `expect(result.current.theme).toBe('moss')`                                  | `expect(result.current.theme).toBe('light')`                                   |
| L143 | `expect(document.documentElement.dataset.theme).toBe('moss')`                | `expect(document.documentElement.dataset.theme).toBe('light')`                 |
| L172 | `seedPrefs('dusk')`                                                          | `seedPrefs('light')`                                                           |
| L178 | `new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'dusk' } })` | `value: 'light'`                                                          |
| L182-183 | assertions to 'dusk'                                                     | assertions to 'light'                                                          |

11 it() blocks preserved. All tests pass.

### src/hooks/useThemeChoice.test.ts — 16 hits (recommended rotation applied)

Recommended internally-consistent rotation: every `'moss'` → `'dark'`; every `'dusk'` and `'slate'` → `'system'`.

| Line | Category                | Before                                          | After                                          |
| ---- | ----------------------- | ----------------------------------------------- | ---------------------------------------------- |
| L32  | Fixture seed            | `theme: 'moss'`                                 | `theme: 'dark'`                                |
| L34  | Assertion               | `toBe('moss')`                                  | `toBe('dark')`                                 |
| L37  | it() description        | `setTheme("dusk") updates local state...`       | `setTheme("system") updates local state...`    |
| L38  | Fixture seed            | `theme: 'moss'`                                 | `theme: 'dark'`                                |
| L42  | Setter call             | `setTheme('dusk')`                              | `setTheme('system')`                           |
| L45  | Assertion               | `toBe('dusk')`                                  | `toBe('system')`                               |
| L48  | it() description        | `setTheme("dusk") writes the new theme...`      | `setTheme("system") writes the new theme...`   |
| L49  | Fixture seed            | `theme: 'moss'`                                 | `theme: 'dark'`                                |
| L53  | Setter call             | `setTheme('dusk')`                              | `setTheme('system')`                           |
| L60  | Assertion               | `toBe('dusk')`                                  | `toBe('system')`                               |
| L63  | it() description        | `setTheme("slate") preserves other prefs...`    | `setTheme("system") preserves other prefs...`  |
| L64  | Fixture seed            | `theme: 'moss', ...`                            | `theme: 'dark', ...`                           |
| L68  | Setter call             | `setTheme('slate')`                             | `setTheme('system')`                           |
| L75  | Assertion               | `toBe('slate')`                                 | `toBe('system')`                               |
| L81  | Fixture seed            | `theme: 'moss'`                                 | `theme: 'dark'`                                |
| L103 | Fixture seed            | `theme: 'moss'`                                 | `theme: 'dark'`                                |

6 it() blocks preserved. All 6 tests pass.

### src/hooks/useFavicon.test.ts — 8 hits (3 are FAVICON_COLORS.* property accesses)

**Group A — mount-time seed test (~L80-85, moss-track rotated to light):**

| Line | Before                                                                          | After                                                                          |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| L80  | `it('seeds favicon ... (named theme: moss)', ...)`                              | `it('seeds favicon ... (named theme: light)', ...)`                            |
| L81  | `seedPrefs('moss')`                                                             | `seedPrefs('light')`                                                           |
| L84  | `expect(href).toContain(FAVICON_COLORS.moss.replace('#', '%23').slice(1))`      | `FAVICON_COLORS.light.replace(...)`                                            |

Rotation deviation from plan recommendation: plan suggested `moss → dark`, but L72's existing test already covers `dark`. Rotated to `light` instead to (1) avoid duplicate it() descriptions and (2) give complementary dark/light coverage at mount.

**Group B — cross-tab storage event test (~L126-151, moss-track rotated to light for non-trivial delta):**

| Line | Before                                                                          | After                                                                          |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| L134 | `prefs: { theme: 'moss', timbre: 'bowl', locale: 'en' }`                        | `prefs: { theme: 'light', ... }`                                               |
| L150 | `expect(getFaviconHref()).toContain(FAVICON_COLORS.moss.replace(...))`          | `FAVICON_COLORS.light.replace(...)` (preserves dark→light non-trivial delta)   |

**Group C — same-tab CustomEvent test (~L175-192, dusk-track rotated to light):**

| Line | Before                                                                          | After                                                                          |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| L181 | `seedPrefs('dusk')`                                                             | `seedPrefs('light')`                                                           |
| L187 | `new CustomEvent(..., { detail: { key: 'theme', value: 'dusk' } })`             | `value: 'light'`                                                               |
| L191 | `expect(getFaviconHref()).toContain(FAVICON_COLORS.dusk.replace(...))`          | `FAVICON_COLORS.light.replace(...)`                                            |

The test now seeds `dark` at mount (L176) → asserts dark favicon (L178) → seeds `light` on disk (L181) → dispatches CustomEvent (L187) → asserts light favicon (L191). Clean dark→light transition preserves the same-tab CustomEvent re-read invariant.

10 it() blocks preserved. All 10 tests pass.

### src/app/App.session.test.tsx — Zero-edit

`grep -nE "\b(moss|slate|dusk|Moss|Slate|Dusk)\b" src/app/App.session.test.tsx` returns ZERO hits. Spurious `grep -E "moss|slate|dusk"` hits at L179-184 are CSS `scale(0.79)` substring matches (per CONTEXT §canonical_refs note). No edit applied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Duplicate it() title in useFavicon.test.ts**
- **Found during:** Task 3 Group A rotation
- **Issue:** Plan recommended rotating `seedPrefs('moss')` test to `dark`, but L72's existing test was already titled `(named theme: dark)`. Direct rotation would produce two identical it() descriptions in the same describe block (vitest reports both but the duplicate description is misleading documentation).
- **Fix:** Rotated to `light` instead of `dark` — yields complementary dark/light mount coverage with no duplicate. Updated FAVICON_COLORS.moss → FAVICON_COLORS.light at L84 to match.
- **Files modified:** src/hooks/useFavicon.test.ts
- **Commit:** 19cb9e6

No other deviations.

## Verification

| Check                                                   | Result      |
| ------------------------------------------------------- | ----------- |
| `grep -nE "(moss\|slate\|dusk):" src/content/strings.ts` | 0 matches  |
| `grep -nE "'(Moss\|Slate\|Dusk\|Musgo\|Ardósia\|Crepúsculo)'" src/content/strings.ts` | 0 matches |
| `grep -nE "moss\|slate\|dusk" src/content/strings.test.ts` (word-boundary) | 0 matches (only spurious "translated" substring hits at L59/L173/L255) |
| `grep -nE "\b(moss\|slate\|dusk\|Moss\|Slate\|Dusk)\b" src/components/ThemePicker.test.tsx` | 0 matches |
| `grep -nE "\b(moss\|slate\|dusk\|Moss\|Slate\|Dusk)\b" src/components/ThemePicker.tsx` | 0 matches |
| `grep -n "toHaveLength(3)" src/components/ThemePicker.test.tsx` | 1 match (L40) |
| `grep -nE "all [0-9]+ (buttons\|options)" src/components/ThemePicker.test.tsx` | only "all 3" matches (L37, L87) |
| `grep -n "all 6" src/components/ThemePicker.test.tsx` | 0 matches |
| `grep -nE "\b(moss\|slate\|dusk)\b" src/hooks/useTheme.test.ts` | 0 matches |
| `grep -nE "\b(moss\|slate\|dusk)\b" src/hooks/useThemeChoice.test.ts` | 0 matches |
| `grep -nE "\b(moss\|slate\|dusk)\b" src/hooks/useFavicon.test.ts` | 0 matches |
| `grep -nE "FAVICON_COLORS\\.(moss\|slate\|dusk)" src/hooks/useFavicon.test.ts` | 0 matches |
| `grep -nE "\b(moss\|slate\|dusk)\b" src/app/App.session.test.tsx` | 0 matches |
| `npx vitest run src/content/strings.test.ts` | 33/33 pass |
| `npx vitest run src/components/ThemePicker.test.tsx` | 8/8 pass |
| `npx vitest run src/hooks/useTheme.test.ts src/hooks/useThemeChoice.test.ts src/hooks/useFavicon.test.ts src/app/App.session.test.tsx` | 54/54 pass across 4 files |
| `npx tsc -b` at this plan's commit boundary | Remaining errors only in `src/styles/faviconPalette.test.ts` and `src/styles/theme.contrast.test.ts` (Plan 02's territory — same wave, will resolve when Plan 02 merges). NO errors in any Plan 03 file. |

## D-07 + D-12 + Threat Model Satisfaction

- **D-07 (i18n clean cut):** `themes.moss`/`themes.slate`/`themes.dusk` deleted from UiStrings type AND both catalogs. No `[review-needed]` markers introduced. Phase 26 `content.no-review-markers.test.ts` drift-guard unaffected. Phase 19 `LOCKED_COPY` byte-equality guard unaffected (palette display strings were never in LOCKED_COPY).
- **D-12 (surgical strip with rotation):** All deprecated theme literals rotated to surviving themes across 3 hook test files; no it() block deleted; behavioral coverage of cross-tab event, same-tab CustomEvent, setTheme write-to-disk, aria-checked tracking, and disabled-blocks-click invariants preserved.
- **T-39-06 (LOCKED_COPY drift):** Mitigated — palette display strings are not in LOCKED_COPY; the frozen-EN byte-equality guard is untouched. `strings.test.ts` passes 33/33.
- **T-39-07 (review-marker debt):** Mitigated — clean-cut deletion. No `[review-needed]` markers exist.
- **T-39-08 (behavioral coverage loss):** Mitigated — rotation preserved every it() block; cross-tab and same-tab change tests use distinct surviving themes to keep before/after deltas non-trivial.
- **T-39-09 (tsc-broken commit boundary):** Plan 03's commit boundary leaves 7 tsc errors in 2 files — `faviconPalette.test.ts` (6 errors) + `theme.contrast.test.ts` (1 error). These are Plan 02's territory (Plan 02 deletes FAVICON_COLORS.moss/slate/dusk and THEME_05_FLOORS entries). Final wave-level `npx tsc --noEmit` will exit 0 once Plan 02 merges. All Plan 03 files (strings.ts, ThemePicker.tsx + test, useTheme.test.ts, useThemeChoice.test.ts, useFavicon.test.ts) are tsc-clean.

## THM-04 Closed End-to-End

- **Type-level half (Plan 01):** ThemeId narrowed to `'light' | 'dark' | 'system'`; THEME_OPTIONS narrowed to 3 entries.
- **Display-strings half (this plan):** UiStrings.themes 6 → 3 fields; EN + PT-BR catalogs aligned (3 entries each).
- **Render half (this plan):** ThemePicker.tsx auto-shrinks via THEME_OPTIONS.map(...) (zero JSX edit beyond comment debt); ThemePicker.test.tsx asserts exactly 3 radio buttons with labels `['Light', 'Dark', 'System']` and the L87 disabled-sweep description tracks "all 3 buttons".

## Forward Pointer

- **Plan 04:** index.html FOUC script surgical edit (D-08) — drop 3 allowlist tokens + 3 color-map hex entries from the inline IIFE; preserve minified one-liner shape.
- **Plan 05 (likely):** Drift-guard test (D-03..D-06) at `src/content/content.no-removed-themes.test.ts` to lock the moss/slate/dusk absence invariant.

## Tiger Style — 3 Atomic Commits

| # | Hash    | Subject |
| - | ------- | ------- |
| 1 | b84452c | `feat(39-03): delete moss/slate/dusk from UiStrings + EN/PT-BR catalogs (THM-04 strings)` |
| 2 | 41ddb4c | `feat(39-03): align ThemePicker tests to 3-option theme set (THM-04 render)` |
| 3 | 19cb9e6 | `test(39-03): rotate deprecated-theme fixtures + property accesses in hook tests (D-12)` |

## Self-Check: PASSED

All declared files exist; all 3 declared commits found in git log; SUMMARY.md present.

Files verified:
- src/content/strings.ts (modified)
- src/components/ThemePicker.tsx (modified)
- src/components/ThemePicker.test.tsx (modified)
- src/hooks/useTheme.test.ts (modified)
- src/hooks/useThemeChoice.test.ts (modified)
- src/hooks/useFavicon.test.ts (modified)
- .planning/phases/39-theme-simplification/39-03-SUMMARY.md (created)

Commits verified: b84452c, 41ddb4c, 19cb9e6.
