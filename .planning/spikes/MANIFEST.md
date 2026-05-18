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
- **The practice switcher is a top segmented control** — a compact pill toggle above the
  orb, disabled during a session. Holds comfortably for ~3–4 practices; revisit if the
  catalog grows past that. (Spike 002, operator decision.)
- **One shared chrome-settings screen** (theme, language, visual variant, cue style)
  serves both practices unchanged — these are app-wide, per the spike-001 split. Practice
  controls stay per-practice and are NOT unified. The current `SettingsDialog` mixes both
  and will need to separate shared chrome from per-practice controls. (Operator
  clarification.)
- Navi Kriya is **app-paced** (metronome ticks each OM at the chosen OM length) and
  **auto-advances** front → back → next round, marking each transition with sound.
  (Operator decision, spike 003.)
- Navi Kriya structure: 1 round = front OMs + back OMs at a fixed **4:1 ratio**; base
  front count configurable (default 100); rounds configurable (default 3); four cue
  roles — front marker, back marker, per-OM tick (toggle), end chord. Real tempo
  ≈ 2.16s/OM (Forrest's follow-along ≈ 4m30s/round); fast/medium/slow values finalized
  in the build. Sounds route through the existing `audioEngine`/timbres. (Spike 003.)
- The **Learn screen** is not spiked — shared sections (Who is Forrest, Forrest
  Resources) plus per-practice sections (videos, description) is a content-architecture
  task, not a feasibility risk.
- The **3-2-1 countdown beep** swaps to **Crisp ping** — 660 Hz (`fundamentalHzIn ×
  1.5`), 0.10 s, peak gain 0.12, decay τ 0.04 — replacing the current 440 Hz / 0.12 s /
  0.08 / 0.05 beep. Single beep, **no settings picker**: the operator auditioned the
  alternatives and chose one. The swap is the three `COUNTDOWN_TICK_*` constants plus a
  pitch ratio in `src/audio/nkCueSynth.ts` (`scheduleCountdownTick`), and applies to both
  the HRV and Navi Kriya countdowns. (Spike 004, operator decision.)

## Spikes

| #   | Name                  | Type       | Validates | Verdict | Tags |
|-----|-----------------------|------------|-----------|---------|------|
| 001 | multi-practice-shell  | standard   | Tabbed shell hosting Resonant + Navi Kriya keeps per-practice settings/stats isolated with shared chrome, without feeling bloated | VALIDATED | architecture, navigation, multi-practice |
| 002 | switcher-ux           | comparison | Which switcher (bottom tab bar / top segmented control / launch screen) fits a calm, mid-practice breathing app | VALIDATED — winner: B (top segmented control) | navigation, ux, comparison |
| 003 | navi-kriya-practice   | standard   | App-paced Navi Kriya counting practice — 100 front / 25 back OM per round, N rounds, marker + per-OM sounds — works as a usable in-app meditation | VALIDATED | practice, navi-kriya, audio, counting |
| 004 | countdown-beep-alternatives | comparison | Auditioning the current 3-2-1 lead-in beep against alternatives surfaces the beep worth shipping | VALIDATED — winner: Crisp ping | audio, countdown, sound-design, cue, comparison |
| 005 | session-end-sound-alternatives | comparison | Auditioning the current session-complete chord against alternatives surfaces the end sound worth shipping, and whether it ships longer | PENDING | audio, session-end, sound-design, cue, comparison |
