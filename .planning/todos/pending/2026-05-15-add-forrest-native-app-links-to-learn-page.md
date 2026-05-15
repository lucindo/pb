---
created: 2026-05-15T15:00:44.934Z
title: Add Forrest native app links to Learn page
area: ui
resolves_phase: 24
files:
  - src/content/learnContent.ts
  - src/components/LearnDialog.tsx
---

## Problem

The Learn page references the Forrest breathing method but does not link out to
the original Forrest native apps. Users who want the full native experience have
no path from the web app to the iOS App Store / Android Play Store listings.

## Solution

Add links to the original Forrest native apps (iOS App Store and Android Play
Store) on the Learn page. Confirm the canonical store URLs before wiring. Route
the link copy through the i18n catalog (EN + PT-BR) consistent with the rest of
the Learn content. Keep within the D-12 claim-safe copy guardrails.
