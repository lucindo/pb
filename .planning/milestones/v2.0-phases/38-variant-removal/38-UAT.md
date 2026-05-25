---
status: complete
phase: 38-variant-removal
source: [38-01-SUMMARY.md, 38-02-SUMMARY.md, 38-03-SUMMARY.md, 38-04-SUMMARY.md]
started: 2026-05-21T12:38:00Z
updated: 2026-05-21T12:42:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Settings dialog — 4 pickers (no Variant)
expected: Open Settings (gear). Dialog shows 4 pickers in order: Theme, Cue, Timbre, Language. No "Variant"/"Variante" label, no shape swatches.
result: pass

### 2. HRV breathing session renders Orb only
expected: Start an HRV breathing session. During inhale/exhale the only animated shape is the soft circular orb — no square edges, no diamond, no shape morph between sessions.
result: pass

### 3. NK (number / count-down) session renders Orb only
expected: Start an NK session. Lead-in digit and the practice phase both render the orb shape — single shape end-to-end, no variant switching.
result: pass

### 4. Returning user with legacy persisted variant survives
expected: |
  With the app open, open DevTools → Application → Local Storage. Find the prefs entry (key prefixed with the app's storage namespace).
  Edit the JSON value to inject a legacy field: add `"variant":"square"` (or `"diamond"`) to the prefs object. Save.
  Reload the page.
  App boots cleanly: no console errors, no white-screen flash, settings still shows 4 pickers, a breathing session still renders the orb.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
