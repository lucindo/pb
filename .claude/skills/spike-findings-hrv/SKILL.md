---
name: spike-findings-hrv
description: Implementation blueprint from spike experiments. Requirements, proven patterns, and verified knowledge for the HRV Breathing WebApp's multi-practice build — Navi Kriya, the 3-practice switcher, the synthesized audio cues, and the app icon. Auto-loaded during implementation work.
---

<context>
## Project: hrv

Evolve the HRV Breathing WebApp from a single Resonant Breathing practice into a
multi-practice app. The spikes proved the direction end to end: **one app** (not sibling
apps) hosting multiple Forrest Knutson practices behind a top segmented-control switcher —
Resonant Breathing, the app-paced OM-counting **Navi Kriya**, and **Stretch** promoted
from an intra-resonant mode to a top-level practice. Later spikes polished the sensory
surfaces: the synthesized audio cues (countdown beep, session-end chord, cue timbres) and
the installed PWA app icon.

Spike sessions wrapped: 2026-05-17, 2026-05-19
</context>

<requirements>
## Requirements

Non-negotiable design decisions that emerged from operator choices during spiking. Every
feature-area reference must honor these.

### Multi-practice architecture
- **Per-practice state vs. shared chrome.** Session settings (bpm/ratio/duration/mode and
  practice-specific knobs) are per-practice; theme, timbre, visual variant, cue style,
  and locale are app-wide chrome. Mirrors the existing `src/domain/settings.ts` split.
- **One app, not a separate sibling app** per practice.
- **Navigation and an active session are mutually exclusive.** Switching practices is
  disabled while a session runs; no background/multi-practice session state — one
  practice active, one session possible.
- **The practice switcher is a top segmented control** — a pill toggle above the orb,
  disabled during a session. Confirmed comfortable at 3 practices; revisit past ~4.
- **One shared chrome-settings screen** (theme, language, variant, cue) serves all
  practices; practice controls stay per-practice and are NOT unified into it.

### Navi Kriya practice
- **Navi Kriya is app-paced and auto-advances** front → back → next round, marking each
  transition with sound.
- **Navi Kriya structure:** 1 round = front OMs + back OMs at a fixed 4:1 ratio; base
  front count configurable (default 100); rounds configurable (default 3); four cue roles
  — front marker, back marker, per-OM tick (toggle), end chord. Real tempo ≈ 2.16s/OM.
  Sounds route through `src/audio/audioEngine.ts` + timbres.

### Stretch as a practice (spike 007)
- **Stretch is promoted from an intra-resonant `mode` to a top-level practice** — the
  switcher carries three (HRV · Stretch · Navi). Needs the new `PracticeId 'stretch'`, a
  third per-practice settings+stats slice, a storage-envelope migration, and EN/PT-BR
  "Stretch"/"Alongar" labels — a planned phase.
- **The switcher ships both label treatments** — A (text-only equal pills) and B (icon +
  label) — selectable via a developer-only toggle (NOT in the user Settings dialog).

### Audio cues (spikes 004, 005, 008)
- **Countdown beep → "Crisp ping"** — 660 Hz (`fundamentalHzIn × 1.5`), 0.10 s, peak
  0.12, decay τ 0.04. Single sound, no picker. Swap in `scheduleCountdownTick`.
- **Session-end sound → "Warm pad fade"** — same C-major triad, strike-free pad envelope
  (~0.9 s fade-in → hold → ~1.4 s fade-out, total ~5.0 s, peak 0.11). Single sound, no
  picker. Needs an optional pad envelope-mode on `buildNKToneNodes`.
- **The fourth cue timbre Chime → Flute (soft attack)** — harmonic partials
  `1.0/2.0@0.22/3.0@0.08`, decay 1.1/1.4, filter 4000/0.4, peak 0.18, `attackSec 0.13`.
  Needs an optional soft-attack envelope mode on `cueSynth`; rename `chime → flute`.
- **No bundled audio assets; `oscillatorType` is always `'sine'`** — synthesized cues
  only (D-04 / D-14).

### App icon (spike 006)
- **The installed PWA icon is "Breathing rings"** (pale on deep) — 3 concentric rings
  + center disc, in the app palette. Maskable PNG exports must inset the glyph into the
  inner-80% safe zone.
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| Multi-Practice Architecture | references/multi-practice-architecture.md | One app hosts all practices; a `practice` concept above `mode`; top segmented-control switcher locked during a session — confirmed at 3 practices (HRV/Stretch/Navi), both label treatments behind a dev toggle |
| Navi Kriya Practice | references/navi-kriya-practice.md | App-paced OM-counting engine — front/back phase machine, 4:1 ratio, auto-advance, four cue sounds; ~2.16s/OM real tempo |
| Audio Cues & Sound Design | references/audio-cues.md | Three synthesized cue swaps — Crisp ping countdown, Warm pad fade end sound, Flute timbre replacing the too-Bowl-like Chime; the pad and soft-attack swaps need optional envelope modes |
| App Icon & Branding | references/app-icon.md | Installed PWA icon → "Breathing rings"; maskable exports must inset the glyph (also fixes the byte-identical-maskable bug) |

## Source Files

Original spike source files (runnable `index.html` + README per spike) are preserved in
`sources/` for complete reference.
</findings_index>

<metadata>
## Processed Spikes

- 001-multi-practice-shell
- 002-switcher-ux
- 003-navi-kriya-practice
- 004-countdown-beep-alternatives
- 005-session-end-sound-alternatives
- 006-app-icon-alternatives
- 007-three-practice-switcher
- 008-chime-replacement-timbre
</metadata>
