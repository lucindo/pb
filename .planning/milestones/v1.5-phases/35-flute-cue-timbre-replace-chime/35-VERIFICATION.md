---
phase: 35-flute-cue-timbre-replace-chime
verified: 2026-05-19T09:21:35Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 35: Flute Cue Timbre (Replace Chime) Verification Report

**Phase Goal:** Replace the Chime cue timbre — structurally a near-clone of Bowl — with a Flute timbre clearly distinct from Bowl, Bell, and Sine. The flute uses harmonic sine partials and a ~0.13 s soft breath attack, which requires a soft-attack envelope mode on the breathing cue synth, a `chime → flute` rename across the timbre id and EN/PT-BR copy, and a storage coercion for persisted `timbre: 'chime'`.
**Verified:** 2026-05-19T09:21:35Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The fourth cue timbre is a Flute — spike-008 preset (harmonic partials 1.0→1.0 / 2.0→0.22 / 3.0→0.08, decayTauIn/Out 1.1/1.4, filter 4000 Hz / Q 0.4, peakGain 0.18, attackSec 0.13) | ✓ VERIFIED | `TIMBRE_PRESETS.flute` in `src/audio/timbres.ts` lines 92-107 contains verbatim spike-008 values; `timbres.test.ts` `flute preset matches spike-008 values` test passes (11/11) |
| 2 | The breathing cue synth gains an optional soft-attack envelope mode; Bowl, Bell, and Sine cues plus the countdown/end cues stay byte-identical | ✓ VERIFIED | `src/audio/cueSynth.ts` lines 111-121: `if (preset.attackSec > 0)` gate routes to linear-ramp path, else falls through to original `setValueAtTime` strike path; `scheduleTick` (line 243+) contains no `attackSec` or `linearRampToValueAtTime` reference; cueSynth.test.ts 51/51 pass including dedicated soft-attack and bowl-strike-unchanged tests |
| 3 | The timbre is renamed chime → flute across the TimbreId union, the EN/PT-BR display strings, and TimbrePicker | ✓ VERIFIED | `settings.ts`: `TimbreId = 'bowl' \| 'bell' \| 'sine' \| 'flute'`, `TIMBRE_OPTIONS` = `['bowl', 'bell', 'sine', 'flute']`; `strings.ts` line 250 EN `flute: 'Flute'`, line 433 PT-BR `flute: 'Flauta'`; `TimbrePicker.tsx` data-driven (`TIMBRE_OPTIONS.map`), no chime literal; `TimbrePicker.test.tsx` labels assertion `['Bowl', 'Bell', 'Sine', 'Flute']`, 8/8 pass |
| 4 | A returning user with a persisted timbre: 'chime' preference is coerced to 'flute' — no crash, preference preserved | ✓ VERIFIED | `src/storage/prefs.ts` line 53: `if (raw === 'chime') return 'flute'` with AUDIO-02 comment; wired through `coercePrefs` line 77; `prefs.test.ts` 26/26 pass including `coerceTimbre('chime') → 'flute'` and `coercePrefs` integration test; unknown values (`'trumpet'`, `null`, `0`) still fall to DEFAULT_TIMBRE `'bowl'` |
| 5 | The timbres.ts D-21 guard (every preset fundamentalHzIn === 440 && fundamentalHzOut === 220) still passes | ✓ VERIFIED | `TIMBRE_PRESETS.flute` has `fundamentalHzIn: 440`, `fundamentalHzOut: 220`; D-21 iterative guard in `timbres.test.ts` `every preset uses A4/A3 fundamentals` test passes; 11/11 pass |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/domain/settings.ts` | TimbreId union with 'flute' (no 'chime'); TIMBRE_OPTIONS with 'flute' | ✓ VERIFIED | Line 110: `TimbreId = 'bowl' \| 'bell' \| 'sine' \| 'flute'`; line 112: `TIMBRE_OPTIONS = ['bowl', 'bell', 'sine', 'flute']`; zero 'chime' literals |
| `src/content/strings.ts` | EN 'Flute' and PT-BR 'Flauta' display strings under timbres | ✓ VERIFIED | Line 66: `readonly flute: string` in UiStrings type; line 250: EN `flute: 'Flute'`; line 433: PT-BR `flute: 'Flauta'`; zero 'chime'/'Carrilhão' references |
| `src/storage/prefs.ts` | coerceTimbre maps legacy 'chime' → 'flute' | ✓ VERIFIED | Lines 47-54: AUDIO-02 comment + `if (raw === 'chime') return 'flute'` before the isValidTimbre fallthrough |
| `src/audio/timbres.ts` | TIMBRE_PRESETS.flute spike-008 preset; attackSec field on TimbrePreset | ✓ VERIFIED | Interface line 27: `attackSec: number`; flute preset lines 92-107: all spike-008 values present verbatim; bowl/bell/sine each have `attackSec: 0` |
| `src/audio/cueSynth.ts` | scheduleBowlCue optional soft-attack envelope mode driven by preset.attackSec | ✓ VERIFIED | Lines 103-121: AUDIO-01 comment + `if (preset.attackSec > 0)` branch calls `linearRampToValueAtTime`; else block is byte-identical strike path; `scheduleTick` unmodified |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/storage/prefs.ts coerceTimbre` | TimbreId 'flute' | legacy-value remap before isValidTimbre fallback | ✓ WIRED | `if (raw === 'chime') return 'flute'` at line 53; then `isValidTimbre(raw) ? raw : DEFAULT_TIMBRE` fallthrough |
| `src/components/TimbrePicker.tsx` | TIMBRE_OPTIONS | renders strings[id] for each id including 'flute' | ✓ WIRED | Line 19: `import { TIMBRE_OPTIONS }` from settings; line 41: `TIMBRE_OPTIONS.map((id: TimbreId) => ...)` |
| `src/audio/cueSynth.ts scheduleBowlCue` | preset.attackSec | linear ramp 0 → peakGain over attackSec when attackSec > 0, else strike | ✓ WIRED | Lines 111-121: `if (preset.attackSec > 0)` with `linearRampToValueAtTime(preset.peakGain, attackEnd)`; else `setValueAtTime(preset.peakGain, when)` |
| `src/audio/timbres.ts TIMBRE_PRESETS.flute` | cueSynth soft-attack path | flute preset carries attackSec 0.13; bowl/bell/sine carry 0 | ✓ WIRED | `attackSec: 0.13` in flute preset; `attackSec: 0` in bowl/bell/sine; cueSynth.ts reads `preset.attackSec` at runtime |

### Data-Flow Trace (Level 4)

Not applicable — this phase delivers audio synthesis constants and storage coercion, not UI rendering of dynamic remote data. All data sources are compile-time constants in `TIMBRE_PRESETS` (no DB, no fetch) or localStorage values that flow through `coerceTimbre`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| timbres.test.ts D-21 guard and spike-008 values | `npx vitest run src/audio/timbres.test.ts` | 11/11 passed | ✓ PASS |
| cueSynth soft-attack + bowl-strike-unchanged tests | `npx vitest run src/audio/cueSynth.test.ts` | 51/51 passed | ✓ PASS |
| coerceTimbre chime→flute migration tests | `npx vitest run src/storage/prefs.test.ts` | 26/26 passed | ✓ PASS |
| TimbrePicker labels show Flute (not Chime) | `npx vitest run src/components/TimbrePicker.test.tsx` | 8/8 passed | ✓ PASS |
| Full audio suite (4 files) | `npx vitest run src/audio` | 103/103 passed | ✓ PASS |
| TypeScript type check | `npx tsc --noEmit` | exit 0, no errors | ✓ PASS |
| Full project test suite | `npx vitest run` | 1251 passed, 3 failed (all pre-existing LOCL-03 in App.persistence.test.tsx) | ✓ PASS (pre-existing failures excluded) |

### Probe Execution

No conventional probes declared or applicable for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUDIO-01 | Plans 01 + 02 | Chime cue timbre replaced by Flute — harmonic sine partials with soft breath attack, audibly distinct from Bowl, Bell, and Sine | ✓ SATISFIED | `TIMBRE_PRESETS.flute` with spike-008 exact values; `cueSynth.scheduleBowlCue` soft-attack envelope mode; `TimbreId`/`TIMBRE_OPTIONS` carry 'flute'; EN 'Flute' / PT-BR 'Flauta' strings in place; TimbrePicker renders 'Flute' as fourth option |
| AUDIO-02 | Plan 01 | Returning user with persisted `timbre: 'chime'` migrated to `'flute'` — no crash, no lost preference | ✓ SATISFIED | `coerceTimbre` explicit `if (raw === 'chime') return 'flute'` remap; wired through `coercePrefs`; tested by `prefs.test.ts` including full `coercePrefs` integration case |

### Anti-Patterns Found

Scan of all phase-modified files:

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `src/storage/prefs.ts` | `if (raw === 'chime')` — intentional `chime` literal | ℹ️ Info | Required by AUDIO-02: the coercer must reference the legacy value to remap it. Documented with AUDIO-02 comment. Not a stub. |
| All modified files | No TBD/FIXME/XXX/TODO/PLACEHOLDER/HACK markers found | — | Clean |
| `src/audio/cueSynth.ts` | `return null` / `return {}` / hardcoded empty | — | No such patterns. Strike path returns `{envelope, scheduledAt, ...}` with real GainNode. Soft-attack path same shape. |

No blockers. No warnings.

### Human Verification Required

**One item requires human verification — audible distinctness:**

#### 1. Audible Timbre Distinctness (In + Out Cues)

**Test:** Open the app in a browser. Navigate to Settings → Timbre. Cycle through Bowl, Bell, Sine, Flute while triggering In (A4) and Out (A3) cues. Confirm the Flute timbre sounds distinctly different from the other three — specifically: (a) the Flute has a noticeable ~0.13 s soft breath onset (not an instant strike), and (b) the Flute sounds different from Sine despite sharing harmonic integer partials, because the attack ramp is audible.

**Expected:** Flute has a breathy onset; it is clearly distinguishable from Bowl (inharmonic with strike), Bell (inharmonic, brighter, with strike), and Sine (pure single partial, with strike). No audio glitches or silence on Flute cues.

**Why human:** The DSP code is correctly wired (`linearRampToValueAtTime(0.18, when+0.13)` confirmed in tests), but whether the resulting sound is *perceptually* distinct requires human listening. This criterion is in the success criteria as "audibly distinct" — it cannot be verified programmatically.

### Gaps Summary

No gaps. All five success criteria are satisfied at the code level. One human listening test remains for audible distinctness (success criterion 1 perceptual aspect).

---

_Verified: 2026-05-19T09:21:35Z_
_Verifier: Claude (gsd-verifier)_
