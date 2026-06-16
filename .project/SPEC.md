# Specification: Pattern Breathing

## Problem

The app currently ships a resonance timer parameterized by `bpm` + `ratio` +
`durationMinutes` — it can only express continuous inhale/exhale breathing at a
fixed rate. Real breathing techniques (box breathing, 4-7-8, ratio training)
require **holds** and **per-phase durations**, which the resonance model cannot
represent. This feature replaces that model with a four-phase pattern engine plus
named presets, turning the app into the Pattern Breathing tool it is named for.
Audience: anyone practising structured breathing — from box-breathing beginners to
people progressively training longer holds.

## Scope

In scope:
- A four-phase breathing model (inhale, hold-in, exhale, hold-out) with per-phase
  durations in **seconds**, a **multiplier** scalar, and a **rounds** session length.
- Named presets as data (Box-4, Weiss/4-7-8, 1-4-2) + a derived "Custom" state.
- Settings UI to pick a preset and edit all fields.
- Session playback: lead-in, per-phase audio + visual cues, rounds-based completion.
- Persistence + validation of the new settings shape.
- Removal of the `bpm`/`ratio`/`durationMinutes` resonance model and the binary
  `'in' | 'out'` phase kind (architecture-plan Step 3).

Out of scope (deferred, tracked in Open Questions):
- Per-phase cue **sound design** (whether holds get a distinct tone vs. reuse).
- The user-facing **label** for the multiplier control.
- Recording rounds-completed in stats (stats stay time-based).
- New preset authoring UI / user-saved presets beyond the live "Custom" state.
- Any backend, account, sync, or telemetry.

## Users

- **Practitioner** — opens the app, picks a preset or dials a custom pattern, sets
  rounds (or open-ended), starts, and breathes along with audio + visual cues.
- **Progressive trainer** — keeps a pattern's ratio fixed and raises the multiplier
  across sessions to lengthen holds over time.

## Functional Requirements

### Domain model

- **FR-1**: The system SHALL define `BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out'`,
  replacing the `'in' | 'out'` binary.
- **FR-2**: The system SHALL define `PatternSettings` with fields `inhale`, `holdIn`,
  `exhale`, `holdOut` (base seconds), `multiplier` (scalar), and `rounds`
  (`number | 'open-ended'`).
- **FR-3**: The effective duration of a phase SHALL be `baseSeconds × multiplier`.
- **FR-4**: A phase whose base value is `0` SHALL be omitted entirely from the cycle —
  no duration, no audio cue, no visual cue (applies only to `holdIn` / `holdOut`).
- **FR-5**: `createBreathingPlan(settings)` SHALL produce a plan exposing the ordered
  non-zero phase sequence and each phase's effective seconds, plus `cycleSec` = sum of
  effective phase seconds.
- **FR-6**: `getSessionFrame(plan, elapsedSec)` SHALL return the current `BreathPhase`,
  its label, phase progress `[0,1]`, the current round index, elapsed, remaining
  (or null), and completion flag.
- **FR-7**: For a timed plan, completion SHALL occur at `rounds × cycleSec`; an
  open-ended plan (`rounds === 'open-ended'`) SHALL never auto-complete.

### Validation

- **FR-8**: `inhale` and `exhale` SHALL each be an integer in `[1, 60]`.
- **FR-9**: `holdIn` and `holdOut` SHALL each be an integer in `[0, 300]`.
- **FR-10**: `multiplier` SHALL be an integer in `[1, 15]`.
- **FR-11**: `rounds` SHALL be an integer in `[1, 99]` or the literal `'open-ended'`.
- **FR-12**: A per-field coercer SHALL validate each stored field on load and substitute
  the default for any out-of-range / wrong-type value, without throwing.

### Presets

- **FR-13**: The system SHALL ship three named presets as data — Box-4
  (`1·1·1·1 ×4`), Weiss/4-7-8 (`4·7·8·0 ×1`), 1-4-2 (`1·4·2·0 ×1`) — each defining the
  five pattern fields (four phases + multiplier) but NOT `rounds`.
- **FR-14**: Selecting a named preset SHALL set the four phase fields and the
  multiplier, and SHALL leave `rounds` unchanged.
- **FR-15**: The active selection SHALL be reported as the named preset whose five
  pattern fields exactly match the current settings, else as "Custom".
- **FR-16**: Editing any of the five pattern fields SHALL re-derive the selection
  (→ "Custom" when no named preset matches).

### Settings UI

- **FR-17**: The settings surface SHALL present a preset picker
  (`Box-4 | Weiss | 1-4-2 | Custom`) using the existing picker pattern (as the
  current Ratio control).
- **FR-18**: The settings surface SHALL present editable controls for all six fields,
  each clamped to its bounds (FR-8..FR-11), with `holdIn`/`holdOut` allowing `0` and
  `rounds` allowing open-ended. The `multiplier` control is labeled **"Scale"**.
- **FR-18a**: The `rounds` control SHALL be a toggle (default **on**) plus a number
  stepper: toggle on ⇒ finite rounds in `[1,99]`; toggle off ⇒ `'open-ended'`. Stepping
  the number above the max (99) SHALL also set `'open-ended'`. Open-ended SHALL render as
  the infinity symbol `∞` in both the control and the readout.

### Session playback

- **FR-19**: The session SHALL retain the existing 3-2-1 lead-in before the first
  inhale cue.
- **FR-20**: The engine SHALL schedule exactly one audio cue at the start of each
  non-zero phase, keyed by `BreathPhase` (the cue's sound is a function of phase +
  timbre; specific sound mapping deferred).
- **FR-21**: The session surface SHALL show exactly one visual cue/label for the
  current non-zero phase (the breathing ring hosts the phase label).
- **FR-22**: A timed session SHALL end automatically after `rounds` completed cycles;
  an open-ended session SHALL run until the user ends it.
- **FR-23**: The readout SHALL show elapsed time, and for timed sessions a remaining
  indicator derived from `rounds × cycleSec`.

### Persistence & removal

- **FR-24**: `PatternSettings` SHALL persist in the flat localStorage envelope's
  `settings` field; there SHALL be no migration ladder (legacy `bpm`/`ratio`/
  `durationMinutes` envelopes coerce to defaults per FR-12).
- **FR-25**: Session stats SHALL continue to record elapsed seconds + session count
  with the existing 30 s-or-complete threshold (time-based; unchanged semantics).
- **FR-26**: The `bpm`, `ratio`, `durationMinutes` settings, the `RATIO_*`/`BPM_*`/
  `DURATION_*` tables, and the `'in' | 'out'` phase kind SHALL be removed; no resonance
  UI or copy SHALL remain.

## Non-Functional Requirements

- **NFR-1**: Client-only. No backend, network calls, telemetry, or third-party scripts;
  all settings/stats remain in `localStorage` on-device.
- **NFR-2**: Offline-capable PWA — the feature SHALL function with no network after
  first load.
- **NFR-3**: Audio cue scheduling SHALL preserve the existing rAF lookahead +
  `SAFE_LEAD_SEC` clamp posture; per-phase cue timing drift SHALL stay within the
  current ≤ 1 rAF (~16 ms) tolerance.
- **NFR-4**: `prefers-reduced-motion` SHALL be honored — the visual guide swaps
  animation for a static crossfade.
- **NFR-5**: Wake Lock SHALL remain progressive enhancement — sessions run correctly
  when it is unavailable.
- **NFR-6**: Not medical advice — no diagnostic/clinical claims; the locked
  medical-advice + affiliation copy SHALL remain byte-stable.

## Interfaces

- **Domain** (`src/domain`, barrel `index.ts`): `BreathPhase`, `PatternSettings`,
  `createBreathingPlan`, `getSessionFrame`, `getCompletionSec`, `validatePatternSettings`,
  `PRESETS` (data) + a `resolvePreset(settings)` selector.
- **Storage** (`src/storage/settings.ts`): `PatternSettings` coercer + read/write
  against the envelope `settings` field.
- **Audio** (`src/audio`): cue dispatch keyed by `BreathPhase` (`cueStore` + `audioEngine`
  + `cueSynth`/`boundaryCueSynth`).
- **UI** (`src/components`, `src/app`): preset picker, per-field controls, the
  breathing ring phase label, session readouts.
- **Content** (`src/content/strings.ts`): four localized phase labels + preset display
  names + rounds copy (EN, PT-BR).
- **Data format**: localStorage envelope `settings` = serialized `PatternSettings`.

## Constraints

- TypeScript 5+ strict (no `any`), React 19, Vite 8, Tailwind v4; runtime is the
  browser only.
- Runtime validation at the storage boundary (per-field coercion), not deep in the app.
- No migration ladder (new app) — invalid stored settings fall back to defaults.
- Multiplier is integer-only (no fractional scaling).
- Single session engine (`useSessionEngine` rAF lookahead); no second timer.

## Technical Profile

- **Language**: TypeScript 5+ (strict, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`); no `any`.
- **Runtime**: Browser (ES2023), installable PWA, deploy base `/pb/`.
- **Build**: Vite 8 + `@tailwindcss/vite` + `vite-plugin-pwa`.
- **Testing**: Vitest + Testing Library + jsdom; behavior-through-public-interface.

## Acceptance Criteria

- **AC-1**: Given `inhale=4, holdIn=7, exhale=8, holdOut=0, multiplier=1`, when a plan
  is built, then the cycle is `[inhale 4s, hold-in 7s, exhale 8s]` (hold-out omitted)
  and `cycleSec === 19`.
- **AC-2**: Given `1·1·1·1` with `multiplier=4`, when a plan is built, then every phase's
  effective duration is `4s` and `cycleSec === 16`.
- **AC-3**: Given `holdIn=0`, when the session plays a cycle, then no audio cue and no
  visual label fire for hold-in.
- **AC-4**: Given a running timed plan, when `elapsedSec` reaches `rounds × cycleSec`,
  then `getSessionFrame(...).isComplete === true`; one second before, it is `false`.
- **AC-5**: Given `rounds='open-ended'`, when elapsed exceeds any multiple of `cycleSec`,
  then `isComplete` stays `false`.
- **AC-6**: Given any field is set out of bounds (e.g. `multiplier=0`, `inhale=61`,
  `holdOut=301`, `rounds=100`), when loaded via the coercer, then that field becomes its
  default and no throw occurs.
- **AC-7**: Given the user selects the Box-4 preset with `rounds=10` already set, when
  applied, then phases become `1·1·1·1`, multiplier `4`, and `rounds` stays `10`.
- **AC-8**: Given settings equal to a named preset's five fields, when rendered, then
  that preset shows selected; given the user changes any one phase value, then the
  selection shows "Custom".
- **AC-9**: Given a started session, when the 3 s lead-in elapses, then the first
  audible cue and the "inhale" label appear together.
- **AC-10**: Given a four-phase plan, when each non-zero phase begins, then exactly one
  audio cue is scheduled for that phase boundary (no double-fire, no cue for zero phases).
- **AC-11**: Given a timed session of `rounds=N`, when the Nth cycle completes, then the
  session ends automatically and reports complete; an open-ended session continues.
- **AC-12**: Given a session ≥ 30 s or completed, when it ends, then stats record one
  session and the elapsed seconds.
- **AC-13**: Given a stored envelope containing legacy `bpm`/`ratio`/`durationMinutes`,
  when loaded, then settings resolve to the `PatternSettings` defaults with no throw.
- **AC-14**: Given the full app, when searched, then no `bpm`/`ratio`/`durationMinutes`
  symbols, resonance copy, or `'in' | 'out'` phase kind remain.

### Coverage

- FR-1 → AC-1, AC-9, AC-14
- FR-2 → AC-1, AC-6
- FR-3 → AC-2
- FR-4 → AC-3, AC-10
- FR-5 → AC-1, AC-2
- FR-6 → AC-4, AC-9
- FR-7 → AC-4, AC-5
- FR-8 → AC-6
- FR-9 → AC-3, AC-6
- FR-10 → AC-6
- FR-11 → AC-6
- FR-12 → AC-6, AC-13
- FR-13 → AC-7, AC-8
- FR-14 → AC-7
- FR-15 → AC-8
- FR-16 → AC-8
- FR-17 → AC-8
- FR-18 → AC-6 (clamping), AC-7
- FR-19 → AC-9
- FR-20 → AC-9, AC-10
- FR-21 → AC-3, AC-9
- FR-22 → AC-11
- FR-23 → AC-11
- FR-24 → AC-13
- FR-25 → AC-12
- FR-26 → AC-14

## Open Questions

All resolved in **D7** except #2 (deferred, non-blocking). See `.project/DECISIONS.md`.

1. ~~**Cue sound per phase**~~ — RESOLVED (D7): each timbre gains a 3rd, **sustained**
   flavor for holds (note-on at hold start, note-off at hold end). Same sound for both
   holds. This refines FR-20 — a hold is a bounded sustained voice, not a one-shot;
   the engine schedules a note-off at the phase boundary.
2. ~~**Multiplier UI label**~~ — RESOLVED (D7): **"Scale"** (internal name stays
   `multiplier`).
3. ~~**Phase label wording**~~ — RESOLVED (D7): EN In/Out/Hold, PT-BR Puxa/Solta/Prende;
   both holds share the single "Hold" label.
4. ~~**Round counter**~~ — RESOLVED (D7): `X/N` readout.
5. ~~**Default `PatternSettings`**~~ — RESOLVED (D7): Box-4 (`1·1·1·1 ×4`), rounds `10`;
   also the coercer fallback.
6. ~~**Long-hold UX**~~ — RESOLVED (D7): the `[0,300]`×`[1,15]` bound is the only guard;
   long holds drone flat (no fade/loop). Hold visual is a static-track progress bar below
   the "Hold" word; static under `prefers-reduced-motion`.
