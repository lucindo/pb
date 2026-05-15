---
phase: 24-forrest-native-app-links
plan: "01"
subsystem: learn-content
tags: [content, i18n, accessibility, security]
dependency_graph:
  requires: []
  provides: [LEARN-01-native-app-links]
  affects: [LearnDialog, learnContent, strings]
tech_stack:
  added: []
  patterns: [link-section-pattern, noopener-noreferrer, todo-native-speaker-review]
key_files:
  created: []
  modified:
    - src/content/learnContent.ts
    - src/content/strings.ts
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
    - src/content/learnContent.test.ts
decisions:
  - "appStoreIos and googlePlayAndroid as the two new LearnLink key names in LearnContent.links"
  - "nativeAppsHeading as the new UiStrings['learn'] key; EN value: 'Resonant Breathing app'"
  - "Plain styled text links (no badge assets) reusing the existing external-link className verbatim per D-03"
  - "Both links carry target=_blank rel=noopener noreferrer per D-04 / T-24-01 reverse-tabnabbing mitigation"
  - "Locale-invariant URLs for both store links per D-07"
  - "Neutral framing: heading and labels name the app only, no Forrest authorship/ownership assertion per D-08"
metrics:
  duration: "3m"
  completed: "2026-05-15T22:12:20Z"
  tasks_completed: 2
  files_modified: 5
---

# Phase 24 Plan 01: Forrest Native-App Links Summary

Two outbound store links (Apple App Store + Google Play) for the native "Resonant Breathing" app added to LearnDialog as a third link section between the videos block and the affiliation micro-line, localized in EN and PT-BR with proper security attributes and neutral attribution.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add native-app link data and heading string for both locales | d8fdeb4 | src/content/learnContent.ts, src/content/strings.ts |
| 2 | Render the native-apps link section in LearnDialog and update tests | 93ddfce | src/components/LearnDialog.tsx, src/components/LearnDialog.test.tsx, src/content/learnContent.test.ts |

## Verification Results

- `npx tsc -b`: exit 0
- `npx eslint .`: exit 0 (1 pre-existing warning in App.tsx, not caused by this plan)
- `npx vitest run`: 849/849 passed (839 baseline + 10 new tests)
- `npm run build`: exit 0
- `git diff --stat src/content/lockedCopy.ts`: no output (byte-unchanged)
- `grep -n 'native-speaker review' learnContent.ts strings.ts`: 3 new markers on PT-BR lines (appStoreIos label line 166, googlePlayAndroid label line 170, nativeAppsHeading line 367)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all new data is wired; both store URLs are real and resolved.

## Threat Surface Scan

No new threat surface beyond the two outbound `<a>` links documented in the plan's threat model. Both T-24-01 (reverse-tabnabbing via `rel="noopener noreferrer"`) and T-24-02 (dangerous-scheme guard extended in learnContent.test.ts) are mitigated as planned. T-24-03 (referrer leakage) is accepted and also mitigated by `noreferrer`. T-24-04 (spoofing via neutral framing) is mitigated — heading "Resonant Breathing app" and labels name only the app.

## Self-Check: PASSED

- FOUND: src/content/learnContent.ts
- FOUND: src/content/strings.ts
- FOUND: src/components/LearnDialog.tsx
- FOUND: 24-01-SUMMARY.md
- FOUND commit: d8fdeb4 (Task 1)
- FOUND commit: 93ddfce (Task 2)
