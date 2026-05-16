---
status: partial
phase: 29-settings-install-entry-localization
source: [29-VERIFICATION.md]
started: 2026-05-16T16:20:00Z
updated: 2026-05-16T16:20:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Settings install row on Android/desktop Chrome — native install prompt fires
expected: Tapping the Install button in SettingsDialog on Android Chrome or desktop Chrome triggers the browser's native beforeinstallprompt install dialog
result: [pending]

### 2. Settings install row on iOS Safari — Add to Home Screen flow completes
expected: Tapping 'How to install' in SettingsDialog on iOS Safari expands the three-step iOS instructions; following the steps successfully adds the app to the Home Screen
result: ISSUE — iOS install-step instructions are difficult/impossible to read on both dark themes (low text contrast in shared IosInstallSteps component). See Gaps.

### 3. Settings install row absent when standalone (installed PWA)
expected: When the app is opened as an installed PWA (standalone display mode), the Settings dialog contains no install row
result: [pending]

### 4. Post-dismissal phone re-entry path
expected: After a phone user dismisses the install banner, opening Settings still shows the install row (banner dismissal does not affect the Settings install entry)
result: [pending]

## Summary

total: 4
passed: 0
issues: 1
pending: 3
skipped: 0
blocked: 0

## Gaps

### GAP-1: iOS install instructions unreadable on dark themes
status: failed
source: operator manual UAT 2026-05-16
detail: Shared IosInstallSteps step text has insufficient contrast on both dark themes — hard/impossible to read. Affects both InstallBanner and SettingsDialog. Fix: theme-aware text color tokens for the step <li> text.
