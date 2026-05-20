---
phase: 34-stretch-as-a-distinct-practice
plan: "01"
subsystem: domain
tags: [settings, stretch, domain, tdd, refactor]
dependency_graph:
  requires: []
  provides:
    - StretchSettings type (src/domain/settings.ts)
    - validateStretchSettings function (src/domain/settings.ts)
    - buildStretchSegments(StretchSettings) single-arg signature (src/domain/stretchRamp.ts)
    - computeStretchTotalMs(StretchSettings) single-arg signature (src/domain/stretchRamp.ts)
    - startStretchSession(StretchSettings, nowMs) (src/domain/sessionController.ts)
  affects:
    - src/domain/settings.ts
    - src/domain/stretchRamp.ts
    - src/domain/sessionController.ts
tech_stack:
  added: []
  patterns:
    - standalone-settings-type (mirrors NaviKriyaSettings isolation pattern)
    - split-validator (validateSettings standard-only + validateStretchSettings)
    - single-arg pure function (stretchRamp functions take StretchSettings, ratio read internally)
key_files:
  created: []
  modified:
    - src/domain/settings.ts
    - src/domain/settings.test.ts
    - src/domain/stretchRamp.ts
    - src/domain/stretchRamp.test.ts
    - src/domain/sessionController.ts
    - src/domain/sessionController.test.ts
decisions:
  - D-01 implemented: SessionMode/MODE_OPTIONS/isValidMode removed from domain layer
  - D-02 implemented: StretchSettings is standalone; ratio included; durationMinutes is computed not stored
  - startStretchSession added as distinct entry point (not a branch inside startSession)
  - extendTimedSession guard uses stretchSegments !== null (no mode read)
metrics:
  duration_minutes: 5
  completed_date: "2026-05-18"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 6
---

# Phase 34 Plan 01: Split Settings Domain Model — StretchSettings as Standalone Type

**One-liner:** Trim SessionSettings to 3 standard-only fields, add StretchSettings with ratio + 5 ramp fields, re-type stretchRamp/sessionController to StretchSettings, add startStretchSession.

## What Was Built

This plan implements decisions D-01 and D-02 from the 34-CONTEXT.md: Stretch becomes a distinct
practice by retiring the `mode` concept from the domain layer. The two-task TDD execution
produced clean splits across three domain files.

### Task 1: Split SessionSettings and add StretchSettings

**`src/domain/settings.ts` changes:**
- `SessionSettings` trimmed to 3 fields: `bpm`, `ratio`, `durationMinutes` — all stretch/mode fields removed
- `SessionMode`, `MODE_OPTIONS`, `isValidMode` deleted entirely
- New `StretchSettings` interface: `ratio: RatioLabel` + `initialBpm`, `targetBpm`, `warmUpMinutes`, `rampDurationMinutes`, `coolDownMinutes` (no `durationMinutes` — D-02: computed, not stored)
- `DEFAULT_STRETCH_SETTINGS` re-typed as `StretchSettings`, gains `ratio: '40:60'`
- `DEFAULT_SETTINGS` trimmed to 3 fields (no `mode`)
- `validateSettings` becomes standard-only (3-field, no mode check)
- New `validateStretchSettings(settings: StretchSettings): StretchSettings` carries all former stretch-branch checks including the `targetBpm < initialBpm` ordering rule

### Task 2: Re-type stretchRamp and split session controller

**`src/domain/stretchRamp.ts` changes:**
- `buildStretchSegments(settings: StretchSettings): StretchSegment[]` — single-arg; ratio read from `settings.ratio` internally
- `computeStretchTotalMs(settings: StretchSettings)` — same pattern
- `SessionSettings` import replaced with `StretchSettings`

**`src/domain/sessionController.ts` changes:**
- `startSession` is standard-only: no `isStretch` branch, `stretchSegments` always `null`
- New exported `startStretchSession(stretchSettings: StretchSettings, nowMs: number): RunningSessionState` builds lead-in plan at `initialBpm`, calls `buildStretchSegments(stretchSettings)`, returns stretch frame
- `extendTimedSession` guard changed from `lockedSettings.mode === 'stretch' || stretchSegments !== null` to `stretchSegments !== null` — no mode read

## Verification Results

- `npx vitest run src/domain/` — 134 tests pass (6 test files)
- `grep -n "SessionMode|MODE_OPTIONS|isValidMode" src/domain/settings.ts` — 0 matches
- `grep -c "export interface StretchSettings" src/domain/settings.ts` — 1
- `grep -c "export function startStretchSession" src/domain/sessionController.ts` — 1
- `grep -n "=== 'stretch'" src/domain/` — 0 code-level matches
- `npx tsc --noEmit` — no errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All domain functions are fully implemented and tested.

## Threat Flags

None. This plan is pure domain layer — no untrusted input, no network endpoints, no storage boundaries. The threat model's T-34-01 (Tampering / validateStretchSettings) is satisfied: function throws on bad input (fail-closed).

## Self-Check: PASSED

- src/domain/settings.ts — FOUND
- src/domain/stretchRamp.ts — FOUND
- src/domain/sessionController.ts — FOUND
- 34-01-SUMMARY.md — FOUND
- Commit 4a7a343 (task 1) — FOUND
- Commit 9ff3655 (task 2) — FOUND
