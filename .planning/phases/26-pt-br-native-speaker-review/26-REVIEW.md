---
phase: 26-pt-br-native-speaker-review
reviewed: 2026-05-16T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/content/content.no-review-markers.test.ts
  - src/content/learnContent.ts
  - src/content/strings.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-05-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Phase 26 was a pt-BR translation review: value-only edits to two string catalogs
(`strings.ts`, `learnContent.ts`) plus one new fs-scan guard test
(`content.no-review-markers.test.ts`). Review focused on test correctness,
TypeScript type integrity, and detection of accidental EN-branch edits.

**Correctness verdict: clean.** No bugs, no security issues, no type-integrity
problems. Specifically verified:

- **EN branch untouched.** `git diff d23dcca..HEAD` confirms every change in both
  catalogs is confined to the `'pt-BR':` object. The only non-`pt-BR` lines touched
  are the file-header doc comments — no `en:` value, key, or shape changed.
- **Guard does not flag itself.** `content.no-review-markers.test.ts` contains the
  literal `TODO: native-speaker review` substring on lines 3, 36, and 39. The
  `collectFiles` walker excludes `*.test.ts` (line 26), so the guard, plus the three
  sibling test files (`learnContent.test.ts`, `lockedCopy.test.ts`,
  `strings.test.ts`), are all skipped. The load-bearing exclusion works.
- **Marker substring matches the comment form.** The guard scans for
  `'TODO: native-speaker review'` (no `//` prefix). The markers removed in this phase
  were `// TODO: native-speaker review`. Since `String.includes()` matches a
  substring, the comment form is still caught — the bare-substring constant is
  correct and slightly broader (also catches a non-comment occurrence). Confirmed
  zero remaining markers in the two non-test catalog files.
- **Type integrity intact.** Both catalogs still close with
  `as const satisfies Readonly<Record<LocaleId, ...>>`; no key was added, removed, or
  renamed, so the `satisfies` constraint still holds. Value-only string edits cannot
  break the typed shape.
- **Test-file typing is sound.** `tsconfig.app.json` sets `types: ["vite/client"]`
  (excludes `@types/node`) but `include: ["src"]` covers this test. The
  `/// <reference types="node" />` directive is the correct, scoped mechanism to add
  Node type coverage for `node:fs`/`node:path` without mutating the shared tsconfig;
  `@types/node` is installed. `__dirname` resolves under Vitest.

The two findings below are minor robustness/maintainability observations on the new
guard test. Neither is a bug in current behavior.

## Info

### IN-01: Marker guard is silent if `src/content/` ever stops containing non-test `.ts` files

**File:** `src/content/content.no-review-markers.test.ts:34,41-46`
**Issue:** `CONTENT_FILES` is built by `collectFiles`, which only collects
non-`.test.ts` `.ts` files. If a future refactor renamed or relocated the catalogs
(e.g. moved them out of `src/content/`), `CONTENT_FILES` would become empty, the
`for` loop would not execute, `hits` would stay `[]`, and the test would pass
green — silently no longer guarding anything. The guard would give a false sense of
safety.
**Fix:** Add a sanity assertion that the scan actually covered files, so an empty
scope fails loudly instead of passing vacuously:
```ts
it('marker guard actually scans content files', () => {
  expect(CONTENT_FILES.length).toBeGreaterThan(0)
})
```

### IN-02: `collectFiles` recursion has no symlink-cycle guard

**File:** `src/content/content.no-review-markers.test.ts:20-31`
**Issue:** `collectFiles` recurses on any directory entry where `statSync(...).isDirectory()`
is true. `statSync` follows symlinks, so a symlinked directory pointing at an ancestor
inside `src/content/` would cause unbounded recursion (stack overflow) at test time.
This is the same pattern as the cited analog (`theme.no-hardcoded-classes.test.ts`),
and the practical risk is low — `src/content/` is a small, flat, symlink-free
directory under source control. Recorded for awareness, not as a defect requiring a
fix.
**Fix:** If hardening is desired, use `lstatSync` instead of `statSync` so symlinks
are treated as files (not descended into):
```ts
import { readFileSync, readdirSync, lstatSync } from 'node:fs'
// ...
const st = lstatSync(full)
```

---

_Reviewed: 2026-05-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
