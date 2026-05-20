---
phase: 34-stretch-as-a-distinct-practice
plan: "03"
subsystem: components/build-config
tags: [practice-toggle, a/b-treatment, build-time-flag, inline-svg, tdd]
dependency_graph:
  requires: [34-01, 34-02]
  provides: [PracticeToggle-3-pill, PracticeGlyph, vite-define-switcher-treatment]
  affects: [src/components/PracticeToggle.tsx, vite.config.ts, .env.example]
tech_stack:
  added: []
  patterns:
    - "Build-time Vite define constant for compile-time A/B branching"
    - "Exported sub-component (PracticeGlyph) for direct unit testing without separate build"
    - "vi.stubGlobal + dynamic import for treatment-B test coverage"
key_files:
  created:
    - .env.example
  modified:
    - vite.config.ts
    - src/components/PracticeToggle.tsx
    - src/components/PracticeToggle.test.tsx
decisions:
  - "Export PracticeGlyph as named export for direct unit testing (avoids separate B-treatment build)"
  - "Vite define block applies to both build and test via vitest/config — no separate test stub needed for treatment A"
  - "Treatment B tests use vi.stubGlobal + dynamic import with cache-busting query param"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-18"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
---

# Phase 34 Plan 03: 3-Pill PracticeToggle + A/B Treatment Summary

3-pill practice switcher extended with compile-time A/B treatment branch and PracticeGlyph inline SVGs using theme tokens.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add build-time VITE_SWITCHER_TREATMENT define | 2bde50e | vite.config.ts, .env.example |
| 2 (RED) | Failing tests for 3-pill PracticeToggle | b7d52ae | src/components/PracticeToggle.test.tsx |
| 2 (GREEN) | 3-pill PracticeToggle with A/B branch | 398af94 | src/components/PracticeToggle.tsx |

## What Was Built

**vite.config.ts** gains a `define` block that injects `__SWITCHER_TREATMENT__` as a string literal at build time. Only the exact value `'B'` activates treatment B; anything else (including unset) compiles to `'A'` (D-07 fail-safe).

**.env.example** (new file) documents `VITE_SWITCHER_TREATMENT` as a build-time-only developer knob with clear notes: values A/B, requires rebuild+redeploy, NOT a user setting.

**PracticeToggle.tsx** is upgraded from 2 to 3 pills:
- Removes local `export type PracticeId` alias; imports from `../storage/practices` (Phase 30 reconciliation)
- `PRACTICE_IDS = ['resonant', 'stretch', 'naviKriya']` (D-11 order: HRV · Stretch · Navi)
- Adds `declare const __SWITCHER_TREATMENT__: string` and `const TREATMENT` at module scope
- Adds `PracticeGlyph` component with 3 inline SVGs using `currentColor` (no hardcoded hex)
- Pill render: `{TREATMENT === 'B' && <PracticeGlyph id={id} />}` before the label
- `PracticeGlyph` is exported for direct unit testing

**PracticeToggle.test.tsx** is rewritten for 3-pill coverage:
- Treatment A: 3 pills in D-11 order, no SVGs, aria-pressed, disabled, onSwitch
- PracticeGlyph unit: each glyph aria-hidden, correct SVG shape, no hardcoded hex
- Treatment B: vi.stubGlobal + dynamic import verifies 3 aria-hidden SVGs render

## TDD Gate Compliance

- RED commit: `b7d52ae` (11 failing tests)
- GREEN commit: `398af94` (13 passing tests)

## Deviations from Plan

None — plan executed exactly as written. The `PracticeGlyph` export approach for treatment B testing (one of two options the plan offered) was selected as it allows cleaner unit testing without a full module re-evaluation cycle.

## Known Stubs

None — the 3-pill switcher is fully wired to `PRACTICE_IDS` from the canonical `PracticeId` type (added in 34-02). Treatment B glyphs are real inline SVGs. No placeholder text or empty data sources.

## Threat Flags

None beyond the plan's registered threats (T-34-05, T-34-06). The `define` block is build-time only; no runtime user-controlled path exists into the switcher treatment selection.

## Self-Check

Files created/modified:
- FOUND: vite.config.ts (contains `__SWITCHER_TREATMENT__`)
- FOUND: .env.example (contains `VITE_SWITCHER_TREATMENT`)
- FOUND: src/components/PracticeToggle.tsx (contains `PRACTICE_IDS`, `PracticeGlyph`, `TREATMENT`)
- FOUND: src/components/PracticeToggle.test.tsx (contains `stretch` tests)

Commits:
- FOUND: 2bde50e — feat(34-03): add build-time VITE_SWITCHER_TREATMENT define
- FOUND: b7d52ae — test(34-03): add failing tests for 3-pill PracticeToggle with A/B treatments
- FOUND: 398af94 — feat(34-03): 3-pill PracticeToggle with A/B treatment branch and PracticeGlyph

## Self-Check: PASSED
