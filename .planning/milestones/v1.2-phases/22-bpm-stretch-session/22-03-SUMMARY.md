---
phase: 22-bpm-stretch-session
plan: 03
subsystem: content
tags: [i18n, strings, stretch, bpm]
dependency_graph:
  requires: []
  provides: [UiStrings.settingsForm stretch keys, UiStrings.readout stretch keys]
  affects: [src/content/strings.ts, src/content/strings.test.ts]
tech_stack:
  added: []
  patterns: [EN+PT-BR locale parity, I18N-07 native-speaker review marker]
key_files:
  created: []
  modified:
    - src/content/strings.ts
    - src/content/strings.test.ts
decisions:
  - "PT-BR values from 22-UI-SPEC.md Copywriting Contract; all 17 new PT-BR entries carry // TODO: native-speaker review per I18N-07"
  - "Added 2 new parity test cases in strings.test.ts for the 13 settingsForm + 4 readout stretch keys"
metrics:
  duration: "~3 minutes"
  completed: "2026-05-15"
  tasks_completed: 1
  files_modified: 2
---

# Phase 22 Plan 03: Stretch Label Keys Catalog Summary

One-liner: Added 17 stretch UI string keys (13 settingsForm + 4 readout) to `UiStrings` interface and both EN + PT-BR locale blocks per the 22-UI-SPEC.md Copywriting Contract.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add stretch label keys to UiStrings settingsForm and readout slices | c81ec8f | src/content/strings.ts, src/content/strings.test.ts |

## Outcome

All 17 new stretch label keys added to:

1. `UiStrings` TypeScript interface (compile-enforced parity)
2. `UI_STRINGS.en` locale block (EN values from Copywriting Contract)
3. `UI_STRINGS['pt-BR']` locale block (PT-BR values from Copywriting Contract, each with `// TODO: native-speaker review`)

### settingsForm slice additions (13 keys)

| Key | EN | PT-BR |
|-----|----|-------|
| `sessionModeLabel` | `"Session mode"` | `"Modo de sessão"` |
| `modeStandard` | `"Standard"` | `"Padrão"` |
| `modeStretch` | `"Stretch"` | `"Alongamento"` |
| `stretchGateHint` | `"Needs a 15+ min session"` | `"Necessita sessão de 15+ min"` |
| `initialBpmLabel` | `"Start BPM"` | `"BPM inicial"` |
| `targetBpmLabel` | `"Target BPM"` | `"BPM alvo"` |
| `holdInitialLabel` | `"Warm-up"` | `"Aquecimento"` |
| `holdTargetLabel` | `"Cool-down"` | `"Resfriamento"` |
| `rampDurationLabel` | `"Ramp"` | `"Rampa"` |
| `holdNoneLabel` | `"None"` | `"Nenhum"` |
| `holdOpenEndedLabel` | `"Open-ended"` | `"Aberto"` |
| `totalLabel` | `"Total:"` | `"Total:"` |
| `totalOpenEndedLabel` | `"Total: Open-ended"` | `"Total: Aberto"` |

### readout slice additions (4 keys)

| Key | EN | PT-BR |
|-----|----|-------|
| `currentBpmLabel` | `"BPM"` | `"BPM"` |
| `stageHoldInitial` | `"Warm-up"` | `"Aquecimento"` |
| `stageRamp` | `"Ramp"` | `"Rampa"` |
| `stageHoldTarget` | `"Cool-down"` | `"Resfriamento"` |

## Verification Results

- `npx tsc --noEmit` exits 0 — interface parity enforced at compile time
- `npx vitest run src/content/` — 57/57 tests pass (15 in strings.test.ts, including 2 new parity tests)
- `npm run lint` exits 0
- `grep -c "sessionModeLabel" src/content/strings.ts` = 3 (interface + en + pt-BR)
- `grep -c "stageHoldInitial" src/content/strings.ts` = 3 (interface + en + pt-BR)
- `grep -c "native-speaker review" src/content/strings.ts` = 84 (was 67 before; +17 new PT-BR keys)

## Deviations from Plan

None — plan executed exactly as written. The type assertion lint error (`(value as string)` casts in test were auto-fixed to remove unnecessary assertions per Rule 1 — the `@typescript-eslint/no-unnecessary-type-assertion` ESLint rule flagged them as errors since TypeScript already inferred the correct type from the interface).

## Known Stubs

None — this plan adds static compile-time string constants only. No data sources, no rendering.

## Threat Flags

None — static string catalog only; no runtime input, no storage, no network. Threat model T-22-07 (compile-time constant shape enforcement) holds.

## Self-Check: PASSED

- FOUND: src/content/strings.ts
- FOUND: src/content/strings.test.ts
- FOUND: commit c81ec8f
