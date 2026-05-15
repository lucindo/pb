---
created: 2026-05-15T15:00:44.934Z
title: Add labels vs icons toggle for session indicator
area: ui
files:
  - src/components/BreathingShape.tsx
  - src/components/SettingsForm.tsx
  - src/domain/settings.ts
---

## Problem

During a session the breathing indicator shows the text labels "In" / "Out".
Some users would prefer a purely visual cue (icon/symbol) over text for the
inhale/exhale indication.

## Solution

Add a setting to switch the main in-session indicator between Labels (current
"In"/"Out" text) and Icons/Visual. Source or design a good inhale/exhale icon
pair. New customization enum + predicate in settings.ts, persisted via the
existing localStorage envelope; SettingsForm picker; BreathingShape consumes
the choice. Mirror the established v1.1 customization pattern (theme/timbre/
variant/locale): typed enum, isValid* predicate, capture-at-start where
relevant. Likely a new milestone/phase rather than a quick task.
