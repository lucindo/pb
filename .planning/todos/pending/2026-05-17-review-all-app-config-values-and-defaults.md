---
created: 2026-05-17T22:28:52.858Z
title: Review all app config values and defaults
area: general
files:
  - src/domain/settings.ts
  - src/domain/naviKriyaSettings.ts
  - src/domain/breathingPlan.ts
  - src/hooks/useNKEngine.ts
---

## Problem

Before the v1.5 milestone closes, every tunable configuration value across both
practices should be reviewed in one pass to confirm each default / min / max /
step is sensible and intentional — not just an artifact of incremental phase
work. Several values were set provisionally across v1.0–v1.5 and have never been
audited together.

Scope:

**HRV (resonant)**
- Breaths per minute — range and step.
- Inhale:exhale ratio — the offered options.
- Session duration — range, step, and the unlimited option.
- BPM-stretch settings — warm-up / ramp / settle stage durations and bounds.
- The TEMPORARY 1-minute session-duration testing option (commit `9a26bf0`,
  marked TEMPORARY in `src/domain/settings.ts`). Operator is deliberately
  keeping it for now to test later phases — this review is the checkpoint to
  decide its final fate before release.

**Navi Kriya**
- `frontCount` — default, min, max, step, and the multiple-of-4 constraint.
- `rounds` — default, min, max, step.
- `omLength` — the fast / medium / slow values in `NK_OM_SECONDS`
  (1.75 / 2.16 / 3.0 s).
- `perOmCue` — default.
- `NK_LEAD_MS` (5000 ms — finalized via Phase 31 UAT).
- `NK_LAST_OM_HOLD_MULTIPLIER` (2).
- `NK_SETTLE_MS` (3500 ms — note: currently exported but unused by the engine;
  confirm whether it should be wired in or removed).
- Default `NaviKriyaSettings` (`DEFAULT_NK_SETTINGS`).

## Solution

TBD — a single review pass before milestone close. For each value: confirm the
default is a good first-run experience, the min/max are safe bounds, and the
step is a sensible increment. Flag anything provisional. Decide the temporary
1-minute HRV duration's release fate. Resolve the `NK_SETTLE_MS` unused-export
question.
