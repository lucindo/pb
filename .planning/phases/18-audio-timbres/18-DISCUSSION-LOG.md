# Phase 18: Audio Timbres - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 18-audio-timbres
**Areas discussed:** Per-timbre DSP character, TimbrePicker UI element, Lead-in tick, Sustain-floor across timbres

---

## Per-timbre DSP character

### Bell character

| Option | Description | Selected |
|--------|-------------|----------|
| Bright + inharmonic + faster decay (Recommended) | 4 partials at 1.0/2.0/3.0/4.16, decay τ ~0.6s/0.9s, filter 6kHz Q=1.2. Sharp attack, perceptually "bell-like". | |
| Brighter + more inharmonic + crisper | 5 partials w/ extra inharmonic, decay τ ~0.4s/0.6s, filter 8kHz. More "church bell" / "tubular", risk of too-sharp at low BPM. | |
| Softer hand-bell variant | 3 partials 1.0/2.5/4.0, decay τ ~0.8s/1.1s, filter 5kHz Q=0.8. Closer to Bowl warmth, distinct via attack envelope. | ✓ |

**User's choice:** Softer hand-bell variant
**Notes:** Operator preferred attack-envelope distinction over harmonic-stack distinction. D-03 locks 1.0/2.5/4.0 partials at A4/A3 (TIMBRE-05 overrides research's 523/261 Hz Bell).

### Sine character

| Option | Description | Selected |
|--------|-------------|----------|
| Pure single sine, soft + long (Recommended) | 1 partial, near-transparent filter, decay τ ~1.5s/2.0s. Soft test-tone, long sustain. | ✓ |
| Pure single sine, short + tight | 1 partial, no filter, decay τ ~0.5s/0.8s. Crisp "beep". Risks audible silence before flip at low BPM. | |
| Sine + faint 2nd harmonic | 2 partials 1.0/2.0, gain 1.0/0.15. Hints at warmth without losing sine identity. | |

**User's choice:** Pure single sine, soft + long (Recommended)
**Notes:** Pure identity preserved. D-04 locks single 1.0-ratio partial at A4/A3 + filter 8kHz/Q=0.3 (near-transparent).

### Chime character

| Option | Description | Selected |
|--------|-------------|----------|
| Windchime: bright + many partials + long shimmer (Recommended) | 4-5 partials w/ mild inharmonicity (e.g. 1.0/2.76/5.4/7.6), decay τ ~1.0s/1.4s, filter 7kHz Q=1.0, lower peak gain. | ✓ |
| Doorbell / tubular chime: two-tone strike | 2 partials 1.0/1.5 (perfect fifth), risk of confusing phase distinction with 1.5 ratio interval. | |
| Glockenspiel / music-box: tight + bright + short | 3 partials 1.0/3.0/5.0 (odd harmonics), decay τ ~0.4s/0.6s, filter 8kHz Q=1.5. Crisp metallic "plink". | |

**User's choice:** Windchime: bright + many partials + long shimmer (Recommended)
**Notes:** D-05 locks 4 partials (Bowl stack 1.0/2.76/5.4 + extra 7.6 for shimmer), decay τ 1.0/1.4, filter 7kHz/Q=1.0, peakGain 0.16. Planner may experiment with 5th partial at ~10.0× if dev-server smoke shows shimmer too subtle.

### Preset dispatch shape

| Option | Description | Selected |
|--------|-------------|----------|
| TIMBRE_PRESETS record + parameterized scheduleBowlCue (Recommended) | NEW `src/audio/timbres.ts` with `TimbrePreset` interface + record. Parameterize existing `scheduleBowlCue`. Adding 5th timbre is data-only. Matches research §CUST-02. | ✓ |
| Per-timbre functions in cueSynth.ts | `scheduleBellCue` / `scheduleSineCue` / `scheduleChimeCue` alongside scheduleBowlCue; switch dispatch. Bowl path untouched but more files. | |
| Inline switch inside scheduleInCue/scheduleOutCue | Smallest file count; biggest diff inside existing fns. Bowl byte-identical harder to argue. | |

**User's choice:** TIMBRE_PRESETS record + parameterized scheduleBowlCue (Recommended)
**Notes:** D-01 locks the architecture. Bowl preset values = current module-level constants verbatim → TIMBRE-02 byte-identical proof.

---

## TimbrePicker UI element

| Option | Description | Selected |
|--------|-------------|----------|
| Name only — mirror ThemePicker text-only shape (Recommended) | Same posture as ThemePicker: capitalized name + border/bg state for selected. Smallest diff; smallest Phase 19 i18n surface. | ✓ |
| Name + short descriptor | Two-line: name + short descriptor ("Bowl — warm strike, long sustain"). Research-preferred. Wider Phase 19 i18n surface (4 timbres × locales). | |
| Name + symbolic SVG glyph | Same name + SVG icon per timbre (wave for Sine, partial-stack for Bowl, etc.). New design work for 4 glyphs. | |

**User's choice:** Name only — mirror ThemePicker text-only shape (Recommended)
**Notes:** D-06 locks name-only. TimbrePicker mirrors ThemePicker chrome verbatim; grid-cols-2 vs grid-cols-4 left to planner.

---

## Lead-in tick (3-2-1)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep fixed 1200Hz square (Recommended) | Tick stays as current 1200Hz square + lowpass. Same across all timbres. Preserves Phase 3 D-15 "countdown vs cue" perceptual separation. | ✓ |
| Tick inherits timbre fundamental + waveform | scheduleTick parameterized by preset. Cohesive per-timbre identity; risks losing countdown-vs-cue separation. | |
| Different fixed tick per timbre | Per-timbre TICK_PRESET still "countdown-shaped". Most code; least obvious user value. | |

**User's choice:** Keep fixed 1200Hz square (Recommended)
**Notes:** D-07. `scheduleTick` unchanged. Phase 3 D-15 perceptual contract preserved.

---

## Sustain-floor across timbres

| Option | Description | Selected |
|--------|-------------|----------|
| Shared logic, per-timbre threshold auto-derived (Recommended) | Constants `PERCEPTUAL_SILENCE_TAU_MULT=3` / `SUSTAIN_FLOOR_RATIO=0.15` / `PHASE_END_FADE_OUT_TAU=0.05` / `PHASE_END_FADE_OUT_LEAD_SEC=0.2` shared across all timbres. Each preset's `defaultDecayTau` auto-determines threshold. Bowl byte-identical. | ✓ |
| Per-timbre sustain config inside TimbrePreset | Add `sustainFloorRatio` / `fadeOutTau` / `fadeOutLeadSec` per preset. 4× UAT for low-BPM behavior. | |
| Sustain-floor only for Bowl + Chime; off for Sine + Bell | Branch on partials count. Risk: re-introduces Bug-2 silence-before-flip at BPM=1 for Sine/Bell. | |

**User's choice:** Shared logic, per-timbre threshold auto-derived (Recommended)
**Notes:** D-12. Each timbre's threshold derives from its preset `decayTauIn`/`Out` × 3. Bowl 4.2s/5.4s, Bell 2.4s/3.3s, Sine 4.5s/6.0s, Chime 3.0s/4.2s.

---

## Claude's Discretion

- TimbrePicker grid layout (grid-cols-2 vs grid-cols-4) — planner picks after dev-server smoke.
- Keep `scheduleInCue` / `scheduleOutCue` as Bowl-only thin wrappers vs delete + migrate callers to `scheduleInCueForTimbre('bowl', ...)`. Both preserve TIMBRE-02 byte-identical Bowl behavior; planner picks based on diff size preference.
- Chime: 4 vs 5 partials final — planner may add a 5th partial at ~10.0× / gain 0.05 if dev-server smoke reveals shimmer too subtle.
- Commit cadence (single plan / multiple plans) — planner decides. Phase 17's 6-plan / 5-wave cadence is precedent; Phase 14's single-plan / 3-commit is precedent for tighter packaging. Phase 18 size sits between.
- Test file split: keep `cueSynth.test.ts` monolithic vs split per timbre — planner picks.

## Deferred Ideas

- Per-timbre lead-in tick — D-07 chose fixed; revisit if countdown "feels disconnected."
- Per-timbre sustain-floor tuning — D-12 chose shared; per-timbre fields can be added if low-BPM UAT reveals a bad-sounding preset.
- In-app audio preview button — REQUIREMENTS Out of Scope.
- Per-timbre descriptor copy — D-06 chose name-only; revisit if user testing shows ambiguity.
- Per-timbre SVG glyph — D-06 chose name-only; revisit if names ambiguous.
- Visual cue highlight per timbre — out of scope; would couple audio + visual unnecessarily.
- PeriodicWave / custom waveforms — defer until a preset needs character impossible via partial-stacked sines.
- More than 4 timbres — TIMBRE_OPTIONS locked at 4 (Phase 14 D-01). Preset-record (D-01) makes adding presets trivial.
- Sibling-file split per timbre (`bowl.ts` / `bell.ts` / etc) — Phase 17 sibling-file precedent rejected for Phase 18 because audio presets are pure data, not component shapes.
- Removing `scheduleInCue`/`scheduleOutCue` wrappers — planner's call.
- Phase 5.1 mute fade-out per-timbre tuning — defer; current 150ms fade is timbre-agnostic and works.
