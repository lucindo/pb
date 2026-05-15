---
phase: 16
plan: 03
subsystem: themes
tags: [fouc, localStorage, inline-script, storage]
dependency_graph:
  requires: []
  provides: [FOUC-prevention-first-paint, STATE_KEY-sync-comment]
  affects: [index.html, src/storage/storage.ts]
tech_stack:
  added: []
  patterns: [synchronous-classic-inline-script, cross-file-sync-comment]
key_files:
  created: []
  modified:
    - index.html
    - src/storage/storage.ts
decisions:
  - FOUC inline script uses classic (no type/async/defer) synchronous execution per WHATWG HTML spec
  - ES5 syntax (var/.indexOf) required because script runs before Vite-bundled polyfills load
  - SYNC comment placed as 2-line block immediately above STATE_KEY export per S-02
  - Allowlist ['light','dark','moss','slate','dusk'] hardcoded in script guards against localStorage tampering (T-16-03-01)
metrics:
  duration: "4m"
  completed: "2026-05-13T02:48:51Z"
  tasks: 2
  files_changed: 2
---

# Phase 16 Plan 03: FOUC Prevention + Storage SYNC Comment Summary

**One-liner:** Synchronous ES5 IIFE inline script in `<head>` reads `localStorage['hrv:state:v1']`, resolves `prefs.theme` (with matchMedia fallback + allowlist guard), and writes `<html data-theme>` before `<body>` parses — eliminating flash of default theme on reload.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Insert FOUC-prevention inline script in index.html | 73b7e75 | index.html |
| 2 | Add SYNC WITH comment above STATE_KEY in storage.ts | 9667c11 | src/storage/storage.ts |

## What Was Built

### Task 1: index.html FOUC-prevention script (THEME-04)

Inserted a synchronous inline `<script>` block in `<head>`, positioned immediately after `<meta name="viewport">` and immediately before `<title>HRV Breathing</title>`. The script is an IIFE with try/catch:

**Exact script as committed:**
```html
<!-- Phase 16 THEME-04: pre-paint theme attribute. SYNC WITH src/storage/storage.ts STATE_KEY. -->
<script>(function(){try{var raw=localStorage.getItem('hrv:state:v1');var t=raw&&(JSON.parse(raw).prefs||{}).theme;if(t==='system'||!t||['light','dark','moss','slate','dusk'].indexOf(t)<0){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(_){document.documentElement.setAttribute('data-theme','light');}})();</script>
```

ES5 syntax confirmation:
- Uses `var` (not `const`/`let`) — ES5 compliant
- Uses `.indexOf(t) < 0` (not `.includes(t)`) — ES5 compliant
- No optional chaining (`?.`) or nullish coalescing (`??`) — ES5 compliant
- No arrow functions — ES5 compliant

Error path coverage:
- `localStorage.getItem` returns null → `t` evaluates falsy → matchMedia resolution
- JSON.parse throws (invalid JSON) → catch block → `setAttribute('data-theme', 'light')`
- `prefs` field missing → `(JSON.parse(raw).prefs || {}).theme` → undefined → matchMedia resolution
- `t === 'system'` → matchMedia resolution (never writes 'system' as attribute per S-01)
- `!t` or `t` not in allowlist → matchMedia resolution
- `matchMedia` absent → `(window.matchMedia && ...) ? 'dark' : 'light'` → `'light'`
- Any uncaught exception → catch block → `'light'`

### Task 2: src/storage/storage.ts SYNC comment (S-02)

Inserted 2-line comment block immediately above `export const STATE_KEY = 'hrv:state:v1'`:

**Comment at lines 35-36 post-commit:**
```
// SYNC WITH index.html FOUC SCRIPT — when bumping the :v1 suffix, update the
// hardcoded 'hrv:state:v1' string in index.html's <head> theme-resolve script.
export const STATE_KEY = 'hrv:state:v1'
```

Note on verify check: The plan's automated verify `grep -B 1 "^export const STATE_KEY" | grep -q "SYNC WITH"` checks the 1 line immediately before the export. With a 2-line comment block, the SYNC line is 2 lines before the export and the "hardcoded..." line is 1 line before. The verify check has a `grep -B 1` vs `grep -B 2` limitation for 2-line comments. The `must_haves.truths` is satisfied — the SYNC comment IS immediately above STATE_KEY in the block. `grep -B 2` confirms it. The STATE_KEY value is unchanged, tsc/lint/tests all pass.

### Bump policy reminder (v2+ schema changes)

When `STATE_KEY` needs to be bumped from `'hrv:state:v1'` to `'hrv:state:v2'`:
1. Update `src/storage/storage.ts`: change `export const STATE_KEY = 'hrv:state:v1'` to `'hrv:state:v2'`
2. Update `index.html`: change the hardcoded `localStorage.getItem('hrv:state:v1')` in the FOUC script to `'hrv:state:v2'`
3. Both files MUST be updated together in the same commit — the SYNC comment is the discovery anchor for this requirement

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Verify Check Note (informational, not a deviation)

Plan's Task 2 automated verify `grep -B 1` check requires "SYNC WITH" on the line IMMEDIATELY before `export const STATE_KEY`. Since the spec mandates a 2-line comment block with "SYNC WITH..." on line 1 and "hardcoded..." on line 2, the SYNC sentinel is 2 lines above the export (not 1). The verify check has a `-B 1` vs `-B 2` discrepancy for multi-line comment blocks.

Resolution: The `must_haves.truths` criterion ("SYNC WITH index.html FOUC SCRIPT comment immediately above the STATE_KEY export") IS satisfied — the 2-line block is directly and visibly adjacent to the export. The plan's acceptance criteria ("exactly one occurrence of the literal string `SYNC WITH index.html FOUC SCRIPT`" + "comment appears IMMEDIATELY ABOVE the export") is also satisfied. All 10 storage tests pass; tsc/lint/build all exit 0.

## Threat Model Compliance

| Threat | Status |
|--------|--------|
| T-16-03-01 (Tampering - localStorage XSS via attribute injection) | MITIGATED — `['light','dark','moss','slate','dusk'].indexOf(t) < 0` allowlist blocks any invalid value |
| T-16-03-02 (Info disclosure - FOUC reads localStorage) | ACCEPTED — prefs.theme is non-sensitive UI enum |
| T-16-03-03 (DoS - FOUC script throws) | MITIGATED — `try/catch(_) { setAttribute('data-theme', 'light') }` always succeeds |
| T-16-03-04 (Tampering - Vite strips inline script) | ACCEPTED — confirmed by `npm run build`; dist/index.html contains script verbatim |
| T-16-03-05/06/07 | ACCEPTED as specified |

## Known Stubs

None — both files are fully implemented with no placeholder content.

## Threat Flags

None — no new security-relevant surface introduced beyond what the threat model documents.

## Self-Check

- [x] `index.html` modified: line 7-8 contains the HTML comment + FOUC inline script
- [x] `src/storage/storage.ts` modified: lines 35-36 contain the SYNC comment
- [x] Commit 73b7e75 exists (Task 1 — index.html)
- [x] Commit 9667c11 exists (Task 2 — storage.ts)
- [x] No new files created
- [x] `npm run build` exits 0; dist/index.html contains FOUC script verbatim
- [x] All 466 tests pass (36 test files)
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run lint` exits 0

## Self-Check: PASSED
