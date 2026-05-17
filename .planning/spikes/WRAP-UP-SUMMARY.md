# Spike Wrap-Up Summary

**Date:** 2026-05-17
**Spikes processed:** 3
**Feature areas:** Multi-Practice Architecture, Navi Kriya Practice
**Skill output:** `./.claude/skills/spike-findings-hrv/`

## Processed Spikes

| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | multi-practice-shell | standard | VALIDATED | Multi-Practice Architecture |
| 002 | switcher-ux | comparison | VALIDATED (winner: top segmented control) | Multi-Practice Architecture |
| 003 | navi-kriya-practice | standard | VALIDATED | Navi Kriya Practice |

## Key Findings

**The second-practice idea is viable end to end — one app, not a sibling app.**

1. **Multi-practice shell (001).** Hosting Resonant Breathing + Navi Kriya in a single
   app reads cleanly and does not feel bloated. Per-practice settings/stats isolate while
   theme/locale behave as shared app-wide chrome — mirroring the existing
   `src/domain/settings.ts` split. A `practice` concept sits one level above the existing
   `mode` (`standard`/`stretch`).

2. **Navigation locks during a session (001).** An early design kept sessions alive
   across practice switches; it was rejected for the "is my session still alive?"
   ambiguity. Final rule: navigation and an active session are mutually exclusive — one
   practice active, one session possible, no background state.

3. **Top segmented control wins the switcher comparison (002).** Head-to-head against a
   bottom tab bar and a launch/home screen. The segmented pill sits out of the breathing
   sightline and avoids the home screen's extra choose→enter tap. Holds ~3–4 practices.

4. **Navi Kriya is a solved practice, not an unknown (003).** App-paced OM metronome,
   front (100) → back (25) → next round auto-advance, fixed 4:1 ratio, four cue sounds
   (front marker / back marker / per-OM tick / end chord). Real tempo ≈ 2.16s/OM
   (Forrest's follow-along ≈ 4m30s/round) — exact fast/medium/slow values to be finalized
   in the build.

## Build follow-ups (not spiked — planning tasks)

- Split `src/components/SettingsDialog.tsx` into shared chrome settings vs. per-practice
  controls.
- `STATE_VERSION` migration to add the `practices` map to the prefs envelope.
- Learn screen: shared sections (Who is Forrest, Forrest Resources) + per-practice
  sections (videos, description) — content architecture.
- Route Navi Kriya sounds through `src/audio/audioEngine.ts` + timbres.
