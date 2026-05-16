---
status: complete
phase: 29-settings-install-entry-localization
source: [29-VERIFICATION.md]
started: 2026-05-16T16:20:00Z
updated: 2026-05-16T18:20:00Z
---

## Current Test

[all tests passed — operator UAT 2026-05-16]

## Tests

### 1. Settings install row on Android/desktop Chrome — native install prompt fires
expected: Tapping the Install button in SettingsDialog on Android Chrome or desktop Chrome triggers the browser's native beforeinstallprompt install dialog
result: PASS — operator UAT 2026-05-16

### 2. Settings install row on iOS Safari — Add to Home Screen flow completes
expected: Tapping 'How to install' in SettingsDialog on iOS Safari expands the three-step iOS instructions; following the steps successfully adds the app to the Home Screen
result: PASS — operator UAT 2026-05-16

### 3. Settings install row absent when standalone (installed PWA)
expected: When the app is opened as an installed PWA (standalone display mode), the Settings dialog contains no install row
result: PASS — operator UAT 2026-05-16

### 4. Post-dismissal phone re-entry path
expected: After a phone user dismisses the install banner, opening Settings still shows the install row (banner dismissal does not affect the Settings install entry)
result: PASS — operator UAT 2026-05-16

### 5. iOS install steps readable on all 5 themes (GAP-1 re-confirmation)
expected: On each theme (Light, dark, moss, slate, dusk), opening the iOS install steps in both InstallBanner and SettingsDialog shows all three step lines with comfortable contrast against the theme background
result: PASS — operator UAT 2026-05-16; GAP-1 visually re-confirmed closed

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

### GAP-1: iOS install instructions unreadable on dark themes
status: resolved
source: operator manual UAT 2026-05-16
detail: Shared IosInstallSteps step text had insufficient contrast on both dark themes. Closed by plan 29-03 — steps 2 & 3 now carry the theme-aware `text-[var(--color-breathing-muted)]` token (step 1 keeps `accent-strong`). Awaiting visual re-confirmation via Test 5.
