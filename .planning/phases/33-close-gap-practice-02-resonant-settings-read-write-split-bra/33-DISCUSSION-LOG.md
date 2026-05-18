# Phase 33: Close gap PRACTICE-02 — resonant settings read/write split-brain - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 33-close-gap-practice-02-resonant-settings-read-write-split-brain
**Areas discussed:** Cleanup scope, Orphan flat field, Test coverage

---

## Cleanup scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full removal | Retarget the read AND delete dead `loadSettings`/`saveSettings` from settings.ts plus test references. `loadMute`/`saveMute` stay. | ✓ |
| Minimal retarget only | Change only `App.tsx:110`. Leave `loadSettings`/`saveSettings` as unused exports. | |

**User's choice:** Full removal
**Notes:** Leaving dead persistence functions in place would invite the same read/write split-brain mistake again — full removal closes the trap.

---

## Orphan flat field

| Option | Description | Selected |
|--------|-------------|----------|
| Leave it | Stale flat `env.settings` becomes harmless dead data once unread; migration already folded its value into `practices.resonant`. | ✓ |
| Prune it | Actively delete the flat field on write/migration for a clean envelope. | |

**User's choice:** Leave it
**Notes:** Pruning adds migration/write surface and a new test for zero functional gain.

---

## Test coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Both scenarios | Test fresh-v2 user AND v1-migrated user (stale flat value), each surviving a remount. | ✓ |
| Fresh-v2 only | Seed one v2 envelope, remount, assert settings survive. | |

**User's choice:** Both scenarios
**Notes:** The audit named the missing regression test as what let the bug ship; covering both distinct revert paths closes the gap properly.

---

## Claude's Discretion

- Exact test-helper shape; whether envelope co-existence tests in `stats.test.ts` are reworked vs. dropped (must not import deleted symbols; co-existence must stay covered somewhere).

## Deferred Ideas

None — discussion stayed within phase scope. Milestone-audit metadata gaps (REQUIREMENTS.md NK checkboxes, Phase 31 VALIDATION.md staleness) are left to `/gsd-complete-milestone v1.5`.

Reviewed todo not folded: "Review all app config values and defaults" — weak keyword match (score 0.2), unrelated config-audit task.
