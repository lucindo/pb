---
name: spike-findings-hrv
description: Implementation blueprint from spike experiments. Requirements, proven patterns, and verified knowledge for adding a second Forrest Knutson practice (Navi Kriya) to the HRV Breathing WebApp. Auto-loaded during implementation work.
---

<context>
## Project: hrv

Add a second Forrest Knutson practice — **Navi Kriya** — alongside the existing Resonant
Breathing practice in the HRV Breathing WebApp. Navi Kriya is an app-paced OM-counting
meditation (not breath-synced). The structural question — separate sibling app vs. one
app hosting multiple practices — was resolved in favor of **one app** with a top
segmented-control switcher. All three spikes validated; the direction is proven end to
end.

Spike sessions wrapped: 2026-05-17
</context>

<requirements>
## Requirements

Non-negotiable design decisions that emerged from operator choices during spiking. Every
feature-area reference must honor these.

- **Per-practice state vs. shared chrome.** Session settings (bpm/ratio/duration/mode and
  practice-specific knobs) are per-practice; theme, timbre, visual variant, cue style,
  and locale are app-wide chrome. Mirrors the existing `src/domain/settings.ts` split.
- **One app, not a separate sibling app** per practice.
- **Navigation and an active session are mutually exclusive.** Switching practices is
  disabled while a session runs; no background/multi-practice session state — one
  practice active, one session possible.
- **The practice switcher is a top segmented control** — a pill toggle above the orb,
  disabled during a session. Comfortable for ~3–4 practices.
- **One shared chrome-settings screen** (theme, language, variant, cue) serves all
  practices; practice controls stay per-practice and are NOT unified into it. The current
  `SettingsDialog` mixes both and must be split.
- **Navi Kriya is app-paced and auto-advances** front → back → next round, marking each
  transition with sound.
- **Navi Kriya structure:** 1 round = front OMs + back OMs at a fixed 4:1 ratio; base
  front count configurable (default 100); rounds configurable (default 3); four cue roles
  — front marker, back marker, per-OM tick (toggle), end chord. Real tempo ≈ 2.16s/OM
  (Forrest's follow-along ≈ 4m30s/round); fast/medium/slow values finalized in the build.
  Sounds route through the existing `src/audio/audioEngine.ts` + timbres.
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| Multi-Practice Architecture | references/multi-practice-architecture.md | One app hosts both practices; a `practice` concept sits above the existing `mode`; top segmented-control switcher, locked during a session |
| Navi Kriya Practice | references/navi-kriya-practice.md | App-paced OM-counting engine — front/back phase machine, 4:1 ratio, auto-advance, four cue sounds; ~2.16s/OM real tempo |

## Source Files

Original spike source files (runnable `index.html` + README per spike) are preserved in
`sources/` for complete reference.
</findings_index>

<metadata>
## Processed Spikes

- 001-multi-practice-shell
- 002-switcher-ux
- 003-navi-kriya-practice
</metadata>
