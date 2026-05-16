---
status: complete
phase: 28-phone-install-banner
source: [28-VERIFICATION.md]
started: 2026-05-16T12:20:00Z
updated: 2026-05-16T12:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Android Chrome Install Prompt (SC1)
expected: On an Android phone in Chrome, the slim banner appears below the app; tapping "Install" opens the browser native "Add to Home Screen" dialog; after accepting, the banner never reappears.
result: pass

### 2. iOS Safari Inline Steps Expand (SC2)
expected: On an iPhone in Safari (not installed), the slim banner appears; tapping "How to install" expands three numbered steps inline (no modal) with the Share glyph visible in step 1; tapping again collapses.
result: pass

### 3. Dismiss Persists Across Page Reload (SC3)
expected: After tapping the × dismiss button, the banner is permanently absent on reload and in new tabs; `localStorage['hrv:install-dismissed']` is `'true'`.
result: pass

### 4. Standalone Mode — No Banner (SC4)
expected: When the app is launched from the home screen icon (standalone mode), no install banner appears at any point.
result: pass

### 5. Desktop — No Banner (SC5)
expected: On a desktop browser (Chrome/Firefox/Safari), no install banner appears.
result: pass

### 6. Banner Hidden During Breathing Session
expected: On a phone browser, the banner is hidden while a breathing session runs (`appPhase !== 'idle'`) and reappears when the app returns to idle.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
