---
status: partial
phase: 34-stretch-as-a-distinct-practice
source: [34-VERIFICATION.md]
started: 2026-05-18T21:25:15Z
updated: 2026-05-18T21:25:15Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 3-practice switcher at 320px viewport (EN)
expected: All three pills (HRV, Stretch, Navi) are fully legible with no text truncation, each pill is at least 44px tall, layout does not overflow the viewport
result: [pending]

### 2. 3-practice switcher at 320px viewport (PT-BR)
expected: "Alongar" fits the pill without truncation; all three pills remain legible and tappable
result: [pending]

### 3. Treatment B glyphs — visual quality
expected: Built with `VITE_SWITCHER_TREATMENT=B npx vite build`, each pill shows an inline SVG glyph (circle for HRV, descending diagonal for Stretch, three dots for Navi). Glyphs are visually distinct, use no hardcoded colors, and inherit theme tokens via `currentColor`.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
