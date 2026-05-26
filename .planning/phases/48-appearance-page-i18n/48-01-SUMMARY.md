---
phase: 48-appearance-page-i18n
plan: 01
subsystem: ui
tags: [i18n, typescript, vitest, strings-catalog, pt-br, drift-guard]

# Dependency graph
requires:
  - phase: 47-persistable-feature-flag-preferences
    provides: Phase 47 choice hooks and storage envelope that Phase 48 UI will bind to
provides:
  - UiStrings.appearance namespace (EN + PT-BR) — foundation for all Phase 48 UI plans
  - appSettings.sections.theme rename (D-01) — disambiguates Appearance section from Appearance page
  - Adapted drift-guard allowing appearance.* review markers (D-18 path a)
  - Phase 48 strings.test.ts describe block asserting EN locked copy
affects:
  - 48-02 (AppearancePage.tsx + OrbPicker + RingCuePicker — consumes appearance.* namespace)
  - 48-03 (AppSettingsPage right-chevron — consumes appearance.rightChevronAriaOnSettings)
  - 48-04 (routing + tests — not string-dependent but same phase)
  - I18N-04 future requirement (native-speaker review pass that removes appearance.* markers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UiStrings top-level namespace extension: add readonly appearance: { ... } to interface + both locale entries atomically"
    - "D-18 path (a) drift-guard adaptation: per-line scanner with ALLOWED_KEY_PATTERNS RegExp[] checking line-above-value structure"
    - "PT-BR draft workflow: // TODO: native-speaker review on the line directly above each new value (line-N-1 comment, line-N value)"

key-files:
  created: []
  modified:
    - src/content/strings.ts
    - src/content/strings.test.ts
    - src/content/content.no-review-markers.test.ts
    - src/components/SettingsPanelBody.tsx
    - src/components/SettingsPanelBody.test.tsx

key-decisions:
  - "D-01: appSettings.sections.appearance renamed to sections.theme; PT-BR Aparência → Tema with marker"
  - "D-18 path (a): drift-guard extended with ALLOWED_KEY_PATTERNS per-line allowlist, not a file-scope exclusion"
  - "TypeScript strict-mode null guard added to drift-guard (lines[i] ?? '') to fix TS2532 noUncheckedIndexedAccess"

patterns-established:
  - "Drift-guard adaptation pattern: replace whole-file include check with per-line scanner + ALLOWED_KEY_PATTERNS array; cite closing gate requirement in comments"

requirements-completed:
  - I18N-01
  - I18N-02
  - I18N-03

# Metrics
duration: 5min
completed: 2026-05-26
---

# Phase 48 Plan 01: i18n Foundation Summary

**UiStrings.appearance namespace added (EN + PT-BR), appSettings.sections.appearance → theme rename (D-01), drift-guard adapted to accept appearance.* review markers via ALLOWED_KEY_PATTERNS per-line allowlist (D-18 path a)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-26T06:18:40Z
- **Completed:** 2026-05-26T06:23:39Z
- **Tasks:** 4 (+1 Rule 1 fix within Task 01-02, +1 TypeScript null-guard fix)
- **Files modified:** 5

## Accomplishments

- Extended UiStrings interface with top-level `appearance` namespace (title, backChevron, rightChevronAriaOnSettings, sections.{orbStyle,visual}, orb.{label,options.{halo,minimal,kuthasta}}, ringCue.{label,options.{arc,rings}}, breathingEffect.label, switcherIcons.label)
- Renamed `appSettings.sections.appearance` → `sections.theme` in interface, EN catalog (`'Theme'`), and PT-BR catalog (`'Tema'` with marker)
- Added EN catalog `appearance:` block with all 14 locked strings (D-03..D-08)
- Added PT-BR catalog `appearance:` block with 14 draft values + 15 `// TODO: native-speaker review` markers (D-09)
- Updated sole consumer `SettingsPanelBody.tsx:139` to read `sections.theme`
- Rewrote `content.no-review-markers.test.ts` drift-guard: per-line scanner with `ALLOWED_KEY_PATTERNS`, accepts markers above appearance.* value lines, still fails on non-appearance markers
- Added `describe('Phase 48 appearance.* and theme rename', ...)` block to `strings.test.ts` with 3 `it()` cases

## Task Commits

1. **Task 01-01: Extend UiStrings + catalogs** - `69c0a13` (feat)
2. **Task 01-02: Update SettingsPanelBody consumer** - `29ede2f` (feat)
3. **Task 01-03: Adapt drift-guard** - `6cae025` (refactor)
4. **Task 01-04: Add strings.test.ts describe block** - `ea68fb1` (test)
5. **Rule 1 fix: TypeScript null-guard** - `d1c2074` (fix)

## Files Created/Modified

- `src/content/strings.ts` — UiStrings interface + EN + PT-BR catalogs extended; sections.appearance → sections.theme rename
- `src/content/strings.test.ts` — Phase 48 describe block with 3 it() cases added
- `src/content/content.no-review-markers.test.ts` — drift-guard rewritten with per-line scanner and ALLOWED_KEY_PATTERNS
- `src/components/SettingsPanelBody.tsx` — one-line rename at :139
- `src/components/SettingsPanelBody.test.tsx` — heading assertion updated to match renamed key

## Decisions Made

- D-18 path (a) selected: per-line structural allowlist via `ALLOWED_KEY_PATTERNS: RegExp[]`. Chosen over path (b) namespace-string match (fragile brace-balance tracking) and path (c) advisory flip (weakest guard).
- `theme:` pattern included in `ALLOWED_KEY_PATTERNS` to cover the D-01 renamed key (PT-BR carries a marker per D-09).
- TypeScript strict null-guard (`lines[i] ?? ''`) added proactively to satisfy `noUncheckedIndexedAccess`; not explicitly in plan but required for `tsc -b` to pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated SettingsPanelBody.test.tsx to reference renamed key**
- **Found during:** Task 01-02 (update SettingsPanelBody consumer)
- **Issue:** `SettingsPanelBody.test.tsx:39` referenced `EN.sections.appearance` which no longer exists after D-01 rename; would fail type-check and runtime
- **Fix:** Updated the heading assertion to use `EN.sections.theme` and updated the test description to say 'Theme / Language / Audio / About'
- **Files modified:** `src/components/SettingsPanelBody.test.tsx`
- **Verification:** `tsc -b` exits 0; test passes
- **Committed in:** `29ede2f` (Task 01-02 commit)

**2. [Rule 1 - Bug] TypeScript null-guard for drift-guard per-line scanner**
- **Found during:** Post-Task-01-03 TypeScript build check
- **Issue:** `lines[i]` typed as `string | undefined` under strict mode; `tsc -b` reported TS2532 at drift-guard test line 91
- **Fix:** Added `const currentLine = lines[i] ?? ''` before the `includes` check
- **Files modified:** `src/content/content.no-review-markers.test.ts`
- **Verification:** `tsc -b` exits 0; all tests still pass
- **Committed in:** `d1c2074` (separate fix commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs)
**Impact on plan:** Both fixes were correctness requirements exposed by the TypeScript compiler. No scope creep.

## Issues Encountered

- Worktree has no `node_modules` directory — tests run from main repo using `vitest --root` flag pointing to the worktree path. TypeScript runs from worktree's own `tsc -b` (inherits main repo `node_modules` via the project reference).

## Known Stubs

None. All string values are complete literal strings. EN values are locked per D-03..D-08. PT-BR values are draft strings (non-empty) with `// TODO: native-speaker review` markers per D-09 — this is intentional by design, not a stub. The I18N-04 future requirement governs the native-speaker pass.

## Threat Flags

None. All files are static module-load literals. No new network endpoints, auth paths, or file-access patterns introduced. T-48-01-01 through T-48-01-SC all in `accept` disposition per plan threat model.

## Next Phase Readiness

- All Phase 48 downstream plans can now bind to `strings.appearance.*` and `strings.appSettings.sections.theme`
- The `as const satisfies Readonly<Record<LocaleId, UiStrings>>` guard ensures any locale that skips a key will fail at compile time
- Drift-guard will remain green as downstream plans add no new `// TODO: native-speaker review` markers (all markers are in strings.ts which this plan owns)

## Self-Check: PASSED

- `src/content/strings.ts` — FOUND
- `src/content/strings.test.ts` — FOUND
- `src/content/content.no-review-markers.test.ts` — FOUND
- `src/components/SettingsPanelBody.tsx` — FOUND
- `.planning/phases/48-appearance-page-i18n/48-01-SUMMARY.md` — FOUND
- Commit `69c0a13` — FOUND (feat: extend UiStrings + catalogs)
- Commit `29ede2f` — FOUND (feat: update SettingsPanelBody consumer)
- Commit `6cae025` — FOUND (refactor: adapt drift-guard)
- Commit `ea68fb1` — FOUND (test: add Phase 48 describe block)
- Commit `d1c2074` — FOUND (fix: TypeScript null-guard)

---
*Phase: 48-appearance-page-i18n*
*Completed: 2026-05-26*
