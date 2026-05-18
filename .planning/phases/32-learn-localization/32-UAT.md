---
status: complete
phase: 32-learn-localization
source: [32-01-SUMMARY.md, 32-02-SUMMARY.md, 32-03-SUMMARY.md]
started: 2026-05-18T02:38:32Z
updated: 2026-05-18T02:42:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Navi Kriya Learn content
expected: With Navi Kriya as the active practice, opening the Learn dialog shows two NK description sections — "What is Navi Kriya" and "How this app paces it" — followed by a "Selected Navi Kriya Videos" heading with two video links ("The Guardian In Meditation", "Navi Kriya Walkthrough").
result: pass

### 2. Resonant Learn content unchanged
expected: With Resonant as the active practice, opening the Learn dialog shows the original resonant content — the HRV and timing explainer sections plus the resonant video links — exactly as before this phase.
result: pass

### 3. Native-apps section is resonant-only (D-02)
expected: Opening the Learn dialog under Resonant shows the native-apps recommendations block; opening it under Navi Kriya omits that block entirely — no empty space or placeholder where it would be.
result: pass

### 4. Shared Forrest sections for both practices (LEARN-03)
expected: The Forrest Knutson explainer section and the "Forrest Resources" links (YouTube, website, book, Patreon) appear identically in the Learn dialog for both practices.
result: pass

### 5. PT-BR localization (I18N-08)
expected: With the app language set to Portuguese, the Learn dialog under both practices renders all copy — headings, NK description, video heading, Forrest sections — in fluent Brazilian Portuguese, with no English fallback text and no visible "TODO" markers.
result: pass

### 6. PT-BR operator corrections
expected: In Portuguese, the resonant practice heading reads "Respiração Ressonante", the resume control reads "Continuar", and the rounds-completed stat label reads "OMs na frente".
result: issue
reported: "this is something we changed on a previous phase, we set it to \"HRV\", so in pt-BR should be \"VFC\" — practice toggle button shows \"HRV\" while the rest of the pt-BR UI uses \"VFC\" (heading reads \"Respiração VFC\" / \"PRÁTICA VFC\")"
severity: minor

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "In pt-BR the practice toggle button labels should use the localized abbreviation — 'VFC' instead of the English 'HRV' — to match the rest of the pt-BR UI (heading already reads 'Respiração VFC')"
  status: failed
  reason: "User reported: this is something we changed on a previous phase, we set it to \"HRV\", so in pt-BR should be \"VFC\" — practice toggle button shows \"HRV\" while the rest of the pt-BR UI uses \"VFC\""
  severity: minor
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
