---
phase: 35-flute-cue-timbre-replace-chime
reviewed: 2026-05-19T06:18:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/app/App.session.test.tsx
  - src/audio/audioEngine.test.ts
  - src/audio/cueSynth.test.ts
  - src/audio/cueSynth.ts
  - src/audio/nkCueSynth.ts
  - src/audio/timbres.test.ts
  - src/audio/timbres.ts
  - src/components/TimbrePicker.test.tsx
  - src/content/strings.ts
  - src/domain/settings.ts
  - src/hooks/useAudioCues.test.tsx
  - src/storage/prefs.test.ts
  - src/storage/prefs.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-05-19T06:18:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 35 renames the fourth timbre slot `chime` → `flute`, replaces the old wind-bell DSP recipe with a spike-008 harmonic-additive flute preset, adds an optional soft-attack envelope mode to `scheduleBowlCue`, and adds a legacy `'chime' → 'flute'` migration in `coerceTimbre`. The change is well-scoped: the type/enum rename, strings catalog, preset record, and synth path all moved together, and the migration coercer preserves a returning user's fourth-slot preference. The full unit suite for the changed audio/storage modules (88 tests) passes.

No correctness-breaking or security defects were found. The findings below concern a missing defensive clamp in the new envelope branch (latent risk if presets change), an untested envelope-interaction path, and minor consistency/cleanliness items.

## Warnings

### WR-01: Soft-attack + sustain-floor envelope has no clamp guaranteeing the phase-end fade-out starts after the attack ramp

**File:** `src/audio/cueSynth.ts:111-131`
**Issue:** When `preset.attackSec > 0` (flute) **and** `needsSustain` is true (long phase), the envelope schedules a linear attack ramp ending at `attackEnd = when + attackSec`, an exponential decay starting at `attackEnd`, and then a hard fade-out at `fadeStart = phaseEnd - PHASE_END_FADE_OUT_LEAD_SEC` (line 130-131). There is no guard that `fadeStart >= attackEnd`. If a future preset combines a large `attackSec` with a short `decayTau` (so `needsSustain` triggers at a small `phaseDurationSec`), `fadeStart` could precede `attackEnd`, scheduling a `setTargetAtTime(NEAR_SILENCE, ...)` *before* the `linearRampToValueAtTime` completes — producing a malformed envelope (the fade target competing with an in-progress ramp). With the current flute values it is safe (`naturalSilenceAt = 1.4 × 3 = 4.2 s`, so `fadeStart` is always `when + 4.0 s` minimum, well after `attackEnd = when + 0.13 s`), so this is a latent risk, not a live bug. Notably, the sibling code in `nkCueSynth.ts:124` *does* clamp this exact relationship (`releaseStart = Math.max(attackEnd, ...)`); `cueSynth.ts` should mirror that discipline rather than rely on an implicit numeric relationship between two independently-tunable preset fields.
**Fix:**
```ts
// in the needsSustain branch, after computing fadeStart:
const attackEnd = preset.attackSec > 0 ? when + preset.attackSec : when
const fadeStart = Math.max(attackEnd, phaseEnd - PHASE_END_FADE_OUT_LEAD_SEC)
envelope.gain.setTargetAtTime(NEAR_SILENCE, fadeStart, PHASE_END_FADE_OUT_TAU)
```

### WR-02: Soft-attack envelope path is not covered for the `needsSustain` (long-phase) regime

**File:** `src/audio/cueSynth.test.ts:348-380` / `src/audio/cueSynth.ts:111-131`
**Issue:** The new soft-attack tests exercise only the short-phase path: `scheduleInCueForTimbre(ac, 1.0, ac.destination, 'flute')` is called with no `phaseDurationSec`, so `needsSustain` is always false. The combined soft-attack + sustain-floor + phase-end-fade path (`attackSec > 0` AND `needsSustain === true`) — the most complex envelope branch and the one WR-01 flags — has zero test coverage. The `it.each(TIMBRE_OPTIONS)` decay-tau tests at lines 457-465 / 513-521 also pass no `phaseDurationSec`. A regression in flute's long-phase envelope (e.g. the WR-01 ordering bug, or `decayTarget`/`SUSTAIN_FLOOR_RATIO` applied incorrectly under soft attack) would not be caught.
**Fix:** Add a test that calls `scheduleInCueForTimbre(ac, 1.0, ac.destination, 'flute', 10)` and asserts: (a) `setValueAtTime(≈0.0001, 1.0)` then `linearRampToValueAtTime(0.18, 1.13)`; (b) the first `setTargetAtTime` decays toward `SUSTAIN_FLOOR` starting at `1.13` (the ramp end, not `when + STRIKE_RAMP_OFFSET`); (c) a second `setTargetAtTime(≈0.0001, ...)` fires at `1.0 + 10 - 0.2` and that this fade time is `> 1.13` (the attack end).

### WR-03: `audioEngine` mid-cue mute fade-out (`cancelAndHoldAtTime`) is untested against the flute soft-attack envelope

**File:** `src/audio/audioEngine.test.ts:160-175` / `src/audio/cueSynth.ts:111-116`
**Issue:** `applyMuteFadeOut` (audioEngine.ts) calls `cancelAndHoldAtTime(now)` on the active cue's envelope `GainNode` to freeze the current gain and fade out. For a strike cue the gain at `now` is a well-defined point on an exponential decay. For the flute soft-attack cue, if mute is toggled *during the 0.13 s attack ramp*, `cancelAndHoldAtTime` must hold the partially-ramped value — and on the Safari <16.4 fallback path (`cancelScheduledValues` + `setTargetAtTime` only, with no `setValueAtTime` re-assert) the held value is whatever the ramp reached. The existing mute test (`setMuted(true) mid-cue`) uses a mock `CueHandle` with `gain.value = 0.18` and never exercises a real soft-attack envelope, so the soft-attack + mute interaction is unverified. This is a behavioral gap, not a proven defect — the Web Audio primitives should handle a ramp the same as a decay — but flute is a new envelope shape and the mute path is the one place envelopes are mutated externally.
**Fix:** Add an audioEngine (or cueSynth) test that schedules a real flute In cue, then toggles mute and asserts the fade-out automation is applied without throwing. At minimum, document that the soft-attack + mid-attack-mute path is intentionally relying on Web Audio's generic ramp/hold semantics.

## Info

### IN-01: `coerceTimbre` legacy remap is not table-driven — future renames will repeat the pattern

**File:** `src/storage/prefs.ts:47-55`
**Issue:** The `if (raw === 'chime') return 'flute'` remap is a one-off inline branch. `coerceVariant` (line 57-59) handles its own legacy `'ring'` value by simply falling through to the default (per the test at prefs.test.ts:167). The two coercers now use two different legacy-handling styles. If a third timbre is ever renamed, this accretes more inline `if` branches. Not a bug — the current single-entry remap is clear and well-commented — but a small `LEGACY_TIMBRE_REMAP: Record<string, TimbreId>` lookup would scale better and keep the two coercers consistent.
**Fix:** Optional. Consider `const LEGACY_TIMBRE_REMAP: Record<string, TimbreId> = { chime: 'flute' }` and `if (typeof raw === 'string' && raw in LEGACY_TIMBRE_REMAP) return LEGACY_TIMBRE_REMAP[raw]`.

### IN-02: `TimbrePicker.test.tsx` `seedTimbre` helper writes a prefs envelope missing the `cue` key

**File:** `src/components/TimbrePicker.test.tsx:15-21`
**Issue:** The `seedTimbre` helper writes `prefs: { theme, timbre, variant, locale }` with no `cue` field. `coercePrefs` tolerates this (pre-Phase-25 migration coerces `cue` to `'labels'`, verified by prefs.test.ts:81), so the tests pass. But this is a stale fixture shape — the canonical envelope has five prefs keys. Other seed helpers in the same change set (`App.session.test.tsx:466-472` `seedTimbre`, `App.session.test.tsx:343-349` `seedVariant`) have the same omission. Harmless today; could mask a future regression if `cue` coercion behavior changes.
**Fix:** Add `cue: 'labels'` to the seeded `prefs` objects for fixture accuracy. Low priority.

### IN-03: Pre-existing `TODO`/`TEMPORARY` debug artifact in a changed-adjacent file (not introduced by Phase 35)

**File:** `src/domain/settings.ts:60-77`
**Issue:** `DURATION_OPTIONS` carries a `// TEMPORARY (testing aid): 1-minute option ... Remove before release.` comment with a `1` entry. Phase 35 modified `settings.ts` (the `chime`→`flute` rename at lines 110/112) but did not touch this block, so it is out of scope for this phase's diff. Flagged only for visibility: a testing-aid `1`-minute duration option is still shipping in the production options list.
**Fix:** Out of Phase 35 scope. Track separately — remove the temporary `1` entry from `DURATION_OPTIONS` before release.

---

_Reviewed: 2026-05-19T06:18:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
