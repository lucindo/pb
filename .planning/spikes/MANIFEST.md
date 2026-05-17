# Spike Manifest

## Idea

Add a second Forrest Knutson practice — **Navi Kriya** — alongside the existing Resonant
Breathing practice in the HRV Breathing WebApp. Navi Kriya follows an HRV-like paced
pattern but with fewer options. The open structural question: ship it as a **separate
sibling app** (nearly a clone of this one) or host **multiple practices in one app** with
a way to switch between them (operator leans toward a Tab Bar). These spikes make the
multi-practice shell tangible before committing.

## Requirements

Design decisions that emerged during spiking — non-negotiable for the real build.

- Per-practice state vs. shared chrome must follow the existing split in
  `src/domain/settings.ts`: session settings (bpm/ratio/duration/mode) are per-practice;
  theme, timbre, visual variant, cue style, and locale are app-wide.
- Navi Kriya's real practice mechanics are NOT yet defined — modeled as a stub. Must be
  specified before any implementation phase.
- **Navigation and an active session are mutually exclusive.** Switching practices is
  disabled while a session is in progress; the user must end the session first. No
  background/multi-practice session state exists — one practice active, one session
  possible. (Spike 001, operator decision.)

## Spikes

| #   | Name                  | Type       | Validates | Verdict | Tags |
|-----|-----------------------|------------|-----------|---------|------|
| 001 | multi-practice-shell  | standard   | Tabbed shell hosting Resonant + Navi Kriya keeps per-practice settings/stats isolated with shared chrome, without feeling bloated | VALIDATED | architecture, navigation, multi-practice |
| 002 | switcher-ux           | comparison | Which switcher (bottom tab bar / top segmented control / launch screen) fits a calm, mid-practice breathing app | PENDING | navigation, ux, comparison |
