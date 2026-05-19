# Spike Wrap-Up Summary

**Latest wrap-up:** 2026-05-19 · **Spikes processed:** 8 total across 2 sessions
**Feature areas:** Multi-Practice Architecture, Navi Kriya Practice, Audio Cues & Sound Design, App Icon & Branding
**Skill output:** `./.claude/skills/spike-findings-hrv/`

## Processed Spikes

| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | multi-practice-shell | standard | VALIDATED | Multi-Practice Architecture |
| 002 | switcher-ux | comparison | VALIDATED (winner: top segmented control) | Multi-Practice Architecture |
| 003 | navi-kriya-practice | standard | VALIDATED | Navi Kriya Practice |
| 004 | countdown-beep-alternatives | comparison | VALIDATED (winner: Crisp ping) | Audio Cues & Sound Design |
| 005 | session-end-sound-alternatives | comparison | VALIDATED (winner: Warm pad fade) | Audio Cues & Sound Design |
| 006 | app-icon-alternatives | comparison | VALIDATED (winner: Breathing rings) | App Icon & Branding |
| 007 | three-practice-switcher | comparison | VALIDATED (3-practice confirmed; A+B treatments behind a dev setting) | Multi-Practice Architecture |
| 008 | chime-replacement-timbre | comparison | VALIDATED (winner: Flute — soft attack) | Audio Cues & Sound Design |

## Session 1 — wrapped 2026-05-17 (spikes 001–003)

**The second-practice idea is viable end to end — one app, not a sibling app.**

1. **Multi-practice shell (001).** Hosting Resonant Breathing + Navi Kriya in a single
   app reads cleanly. Per-practice settings/stats isolate while theme/locale behave as
   shared app-wide chrome — mirroring `src/domain/settings.ts`. A `practice` concept sits
   one level above the existing `mode`.
2. **Navigation locks during a session (001).** Navigation and an active session are
   mutually exclusive — one practice active, one session possible, no background state.
3. **Top segmented control wins the switcher comparison (002).** Beats a bottom tab bar
   and a launch screen — sits out of the breathing sightline, no extra tap. Holds ~3–4.
4. **Navi Kriya is a solved practice (003).** App-paced OM metronome, front→back→next
   auto-advance, fixed 4:1 ratio, four cue sounds, ~2.16s/OM real tempo.

## Session 2 — wrapped 2026-05-19 (spikes 004–008)

**The sensory surfaces got polished, and Stretch joined the switcher.**

5. **Countdown beep → Crisp ping (004).** A four-constant change in `scheduleCountdownTick`
   — 660 Hz / 0.10 s / peak 0.12 / decay τ 0.04. Single sound, no picker.
6. **Session-end sound → Warm pad fade (005).** A strike-free ~5 s fade-in/hold/fade-out.
   Needs an optional pad envelope-mode on the shared `buildNKToneNodes`.
7. **App icon → Breathing rings (006).** Installed PWA icon = 3 concentric rings + center
   disc, pale on deep. Maskable exports must inset the glyph into the inner-80% safe zone
   — also fixing the byte-identical-maskable bug.
8. **3-practice switcher confirmed (007).** HRV · Stretch · Navi holds down to 320 px in
   EN/PT-BR, no compaction. Both label treatments (text / icon+label) ship behind a
   developer-only toggle. Promoting Stretch is a planned-phase feature.
9. **Chime → Flute (008).** Chime was structurally a near-clone of Bowl; replaced by a
   flute with harmonic partials + a ~0.13 s breath attack. Needs an optional soft-attack
   envelope mode on `cueSynth` and a `chime → flute` rename.

Recurring method in session 2: every spike was a comparison spike with an interactive
harness; "louder / longer / distinct" questions were settled with deterministic
measurement (`OfflineAudioContext` peak + tail length; computed switcher fit) plus
operator audition — not impressions.

## Build follow-ups (not spiked — planning tasks)

- Split `src/components/SettingsDialog.tsx` into shared chrome vs. per-practice controls.
- `STATE_VERSION` migrations: the `practices` map; the `'stretch'` practice slice; the
  `timbre: 'chime' → 'flute'` coercion.
- Learn screen content architecture (shared + per-practice sections).
- Audio: add optional pad (005) and soft-attack (008) envelope modes — same shape of
  change, do them together.
- App icon: SVG → PNG rasterisation with the maskable safe-zone inset.

> Note: several of these have since shipped (Navi Kriya, the 3-practice Stretch switcher
> — phases 30–34). The audio-cue swaps (004/005/008) remain open build work.
