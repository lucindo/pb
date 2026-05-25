---
status: complete
phase: 40-timbre-preview-cue
source: [40-CONTEXT.md, 40-VERIFICATION.md]
started: 2026-05-21T22:54:09Z
updated: 2026-05-25T18:30:00Z
---

## Current Test

[complete]

## Tests

### 1. PREV-01 — Cue correctness across all four timbres

Context: Each TIMBRE_PRESETS[timbre].fundamentalHzIn = 440 Hz (A4) per Phase 18 TIMBRE-05 / D-21.

expected: Tap each of the four timbre options (Bowl, Bell, Sine, Flute) once in App Settings. Each tap plays a single inhale cue at A4, distinguishable by timbre (bowl is rich-harmonic, bell is sharper attack, sine is the pure fundamental, flute is the soft-attack airy envelope per Phase 35 AUDIO-01). No looping, no exhale cue, no double-trigger.

result: pass — operator confirmed at v2.0 milestone close (2026-05-25): all four timbres play distinct inhale cues at A4, no looping, no exhale.

### 2. PREV-03 (empirical confirmation of D-11 structural lock) — Mute irrelevance

Context: PREV-03 is locked structurally by Plan 02's drift-guard (previewContext.ts imports no audioEngine). This item is the audible cross-check that the structural lock corresponds to real-world behavior.

expected: Start a session briefly, mute via MuteToggle (in-session toggle), end the session. Open Settings (or trigger the timbre picker surface). Tap each of the four timbres. Cues remain audible regardless of the MuteToggle state from the prior session.

result: pass — operator confirmed at v2.0 milestone close (2026-05-25): preview cues play regardless of prior MuteToggle state (structural lock cross-checked empirically).

### 3. D-08 — Rapid-tap overlap feel

Context: CONTEXT D-08 — brief polyphonic overlap during rapid auditioning is by design (matches in-session cueSynth queueing behavior at boundaries).

expected: Tap rapidly across 3-4 different timbres in quick succession (e.g., bowl → bell → sine → flute within ~1 second). Cues overlap briefly — this is expected and feels expressive, not buggy. No silence gaps, no audible glitches/crackles, no app crashes, no console errors.

result: pass — operator confirmed at v2.0 milestone close (2026-05-25): brief polyphonic overlap feels expressive, no glitches/crackles/crashes/console errors.

### 4. PREV-05 + D-01 + D-02 — iOS Safari standalone-PWA cold-start (HIGH-SIGNAL)

Context: This item exercises the cold AudioContext creation + resume + first oscillator schedule on the platform that historically breaks audio invariants (Phase 27 PWA-03, v1.x carry-forward iOS audio recovery bug). It is the highest-signal manual test in Phase 40 — explicitly flagged as such per CONTEXT specifics line 4.

expected: On iOS Safari (preferably the installed standalone PWA, but Safari browser also works), fully close the app/tab. Re-open the app. WITHOUT starting any session, navigate to App Settings (Phase 43 surface) or the existing SettingsDialog (current v1.5 surface). Tap a timbre — the cue plays. Latency from tap to first audio sample feels imperceptible (well under 100 ms per PREV-05 — operator subjective judgment). Repeat for a second timbre — subsequent tap is even faster (singleton reuse per D-01).

result: pass — operator confirmed at v2.0 milestone close (2026-05-25): cold-start preview latency imperceptible on iOS Safari standalone PWA; subsequent taps faster (singleton reuse).
