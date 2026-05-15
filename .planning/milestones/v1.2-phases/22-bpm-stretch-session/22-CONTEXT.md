# Phase 22: BPM Stretch Session - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

A new **stretch session mode**: the breathing rate walks sub-perceptually from a
warm-up `initialBpm`, down a linear ramp, to a slower `targetBpm`, with optional
holds at each end (`holdInitialSeconds`, `holdTargetSeconds`). It runs on the
existing one-clock `SessionFrame`, and the dual-anchor audio scheduling holds
across every BPM step.

In scope: the stretch settings surface (Standard/Stretch mode picker + the new
fields), the ramp engine on the one-clock frame with the strict `< 0.5 BPM`
step invariant, dual-anchor audio across BPM changes, the minimum-duration gate,
persistence of stretch settings via the existing localStorage envelope, and the
in-session live BPM + stage label. Covers STRETCH-01 through STRETCH-08.

Out of scope: any non-linear ramp curve, up-only / both-direction ramps,
per-stage ratio changes, biofeedback-driven rate adjustment, presets/saved
stretch programs. The single-BPM Standard session is unchanged.
</domain>

<decisions>
## Implementation Decisions

### Ramp definition
- **D-01:** **Down-only.** `targetBpm` must be strictly less than `initialBpm`.
  The session warms up at a comfortable rate and eases into a slower target.
  The `targetBpm` picker is constrained to values below the chosen `initialBpm`.
- **D-02:** **Ramp has its own picker.** The user sets a ramp duration directly;
  the total session = `holdInitial + ramp + holdTarget` is computed and
  displayed. Ramp length is NOT derived by subtracting holds from a total.
- **D-03:** **Open-ended = infinite hold at target.** When the session is
  open-ended, `holdInitial` → ramp run finitely, then the session holds at
  `targetBpm` indefinitely until the user ends it. Only the cool-down hold is
  unbounded; warm-up and ramp are always finite.
- **D-04:** **Linear ramp.** Uniform BPM change per unit time across the whole
  ramp. Steps are spaced so each individual step is strictly `< 0.5 BPM` and
  lands sub-perceptually. No easing.

### Settings surface
- **D-05:** **Standard / Stretch mode picker.** A `SettingsStepper`-style picker
  with two options (Standard, Stretch), consistent with the existing
  bpm/ratio/duration steppers. Not an on/off toggle.
- **D-06:** **Swap `bpm` for stretch fields.** When Stretch mode is selected,
  the single `bpm` stepper is replaced by the stretch fields (`initialBpm`,
  `targetBpm`, `holdInitialSeconds`, `holdTargetSeconds`, ramp duration). The
  `ratio` stepper and the mode picker stay visible. Standard mode shows the
  original single `bpm` field.
- **D-07:** **Picker ranges:** `holdInitialSeconds` and `holdTargetSeconds` are
  0–60 seconds in 15s steps (0 = no hold). Ramp duration is 5–60 minutes in
  5-min steps, mirroring the existing duration grid. `holdTargetSeconds`
  additionally carries an `Open-ended` value past 60s (see D-11).
- **D-08:** **Live computed-total readout in SettingsForm.** A computed
  `Total: M:SS` line updates live as the user adjusts the stretch pickers, so
  the consequence of `holdInitial + ramp + holdTarget` is visible before start.

### Minimum-duration gate
- **D-09:** The gate reads the **computed stretch total**
  (`holdInitial + ramp + holdTarget`), not a standalone duration picker. The
  Stretch mode option is grayed when the computed total is below the threshold.
- **D-10:** **Threshold = 15 minutes.** Below a 15-minute computed total the
  ramp is too short to walk sub-perceptually across a useful BPM span.
- **D-11:** **Open-ended is chosen via an `Open-ended` value on the
  `holdTarget` stepper:** `{0, 15, 30, 45, 60s, Open-ended}`. Picking
  `Open-ended` makes the cool-down hold run forever. (An open-ended total is
  effectively infinite, so it always clears the 15-min gate.)
- **D-12:** When the gate disables the Stretch option, show it **grayed out
  with a short hint** (e.g. "Needs a 15+ min session") — tell the user why and
  how to unlock it, not a silent disable.

### In-session feedback
- **D-13:** **Show the live current BPM** while a stretch session runs — a BPM
  readout updates as the ramp progresses.
- **D-14:** **Subtle stage label** in `SessionReadout` marking the current
  stage (warm-up hold / ramp / cool-down hold).
- **D-15:** **No special cue** when the ramp finishes and the session reaches
  `targetBpm` — the transition into the cool-down hold is silent and unmarked,
  consistent with the sub-perceptual intent.

### Open consideration for the planner
- The D-09 computed-total gate creates a **chicken-and-egg**: the stretch
  fields (and therefore the computable total) only exist once the user is in
  Stretch mode, but the gate is meant to disable *entering* Stretch mode.
  Planner must resolve this — e.g. default stretch field values must yield a
  total ≥ 15 min so Stretch is reachable, and the gate then blocks *starting*
  (or re-flags the mode) if the user dials the fields below 15 min. Capture the
  exact mechanism during planning.

### Claude's Discretion
- The ramp engine representation on the one-clock `SessionFrame` — how a
  time-varying BPM is modeled when `getSessionFrame` currently assumes a single
  fixed `cycleMs` (piecewise-constant per cycle, segment table, BPM-as-function-
  of-elapsed, etc.). This is the core research/planning question.
- How `initialBpm`/`targetBpm`/holds/ramp are added to `SessionSettings`,
  `validateSettings`, the `isValid*` predicates, and the storage envelope.
- Exact `SettingsStepper` wiring for the new fields and the `targetBpm <
  initialBpm` constraint enforcement in the picker.
- Exact stage-label copy (EN + PT-BR) and where the live BPM / stage label
  render within `SessionReadout`.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 22: BPM Stretch Session" — goal + 5 success criteria.
- `.planning/REQUIREMENTS.md` §"BPM Stretch" — STRETCH-01 through STRETCH-08.

### Engine / domain (one-clock SessionFrame + ramp)
- `src/domain/sessionMath.ts` — `getSessionFrame(plan, elapsedMs)`, the one-clock
  frame. Currently assumes a single fixed `plan.cycleMs`; the ramp must walk BPM
  while keeping this one-clock model. `isComplete` rounds total up to a cycle
  boundary.
- `src/domain/breathingPlan.ts` — `createBreathingPlan` / `BreathingPlan`
  (`bpm`, `cycleMs`, `inhaleMs`, `exhaleMs`, `totalMs`). Single-BPM today.
- `src/domain/sessionController.ts` — `startSession` / `completeIfNeeded` /
  `extendTimedSession`; `RunningSessionState` holds the `plan` + `startedAtMs`.
- `src/domain/settings.ts` — `SessionSettings`, `BPM_OPTIONS` (1–7, step 0.5),
  `DURATION_OPTIONS`, `validateSettings`, `isValidBpm`/`isValidDuration`
  predicates, `DEFAULT_SETTINGS`. Stretch fields extend this surface.
- `src/hooks/useSessionEngine.ts` — rAF loop, `currentFrame`/`liveFrame`,
  `runningSnapshotRef`; the engine consumer.

### Audio (dual-anchor across BPM steps — STRETCH-08)
- `src/audio/audioEngine.ts` — dual-anchor scheduling logic (Phase 3 D-13/D-14);
  must hold across every BPM step change with no scheduling gap.
- `src/audio/cueSynth.ts` — lookahead scheduler / cue synthesis.
- `src/hooks/useAudioCues.ts` — audio-cue hook wiring; consumes the frame.

### Settings UI
- `src/components/SettingsForm.tsx` — the settings surface; add the
  Standard/Stretch mode picker + conditional stretch fields here.
- `src/components/SettingsStepper.tsx` — the stepper control to reuse for the
  mode picker and all new stretch fields.
- `src/components/SettingsDialog.tsx` — dialog host for SettingsForm.
- `src/content/strings.ts` — `UI_STRINGS` EN + PT-BR; new stretch labels need
  both locales (the `settingsForm`/`controls` slices are NOT part of the
  frozen-EN `LOCKED_COPY` guard, so additions are allowed).

### In-session display
- `src/components/SessionReadout.tsx` — running readout; host for the live BPM
  (D-13) and the subtle stage label (D-14).

### Persistence (STRETCH-07)
- `src/storage/storage.ts` — `STATE_KEY` envelope; forward-compat read +
  refuse-downgrade write. Stretch settings persist through this same envelope.

No external ADRs/specs — prior-phase decisions (dual-anchor, envelope) live in
the code above; requirements fully captured in the decisions section.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SettingsStepper.tsx` — generic stepper already used for bpm/ratio/duration;
  the Standard/Stretch mode picker and every new stretch field reuse it (D-05,
  D-06).
- `BPM_OPTIONS` (`settings.ts`) — the 1–7 / step-0.5 grid is the source for both
  `initialBpm` and `targetBpm` pickers (STRETCH-02); `targetBpm` is the same
  grid filtered to values below `initialBpm` (D-01).
- The localStorage envelope (`storage.ts`) — forward-compat read + refuse-
  downgrade write already absorbs new schema fields; stretch settings ride it
  with no envelope change (STRETCH-07).
- Dual-anchor scheduling (`audioEngine.ts`) — was explicitly designed (Phase 3
  D-13/D-14) to survive BPM changes and was reused for Phase 5.1 reconstruction;
  STRETCH-08 relies on it holding across each ramp step.

### Established Patterns
- One-clock `SessionFrame`: `getSessionFrame` is a pure
  `(plan, elapsedMs) → frame`. The ramp must preserve this — a single elapsed
  clock — rather than introducing a second timer. `cycleIndex` and the
  cycle-boundary `isComplete` rounding both assume a constant `cycleMs` today;
  the ramp model has to reconcile a time-varying BPM with these.
- `validateSettings` throws on out-of-range; `isValid*` predicates back both the
  throw path and the storage coerce/fallback path. New stretch fields need the
  matching predicate + validation entries.
- EN + PT-BR parity: every new user-facing string needs both locales in
  `strings.ts`. Stretch labels land in the non-locked `settingsForm` slice.
- Calm/minimal UI: the running view is deliberately sparse (orb + In/Out +
  time). D-13/D-14 add a live BPM + stage label; D-15 keeps the target
  transition unmarked.

### Integration Points
- `SessionSettings` gains the stretch fields → flows into `breathingPlan` /
  `sessionController` / storage / `SettingsForm` simultaneously.
- The ramp engine sits between `breathingPlan` and `sessionMath` — the planner
  decides whether `BreathingPlan` becomes time-varying or a new ramp structure
  feeds `getSessionFrame`.
- The minimum-duration gate (D-09/D-10) wires the computed total back into the
  mode picker's disabled state in `SettingsForm`.
</code_context>

<specifics>
## Specific Ideas

The ramp must feel like nothing is happening — sub-perceptual is the whole
point. Down-only: warm up, then ease into a slower, deeper rate. Linear walk,
no easing. Keep the running view calm — the live BPM and stage label are the
only additions, and reaching the target is silent.
</specifics>

<deferred>
## Deferred Ideas

None raised during discussion — the conversation stayed within phase scope.

### Reviewed Todos (not folded)
- `2026-05-13-themes-aesthetic-refresh.md` ("Themes: aesthetic palette
  refresh") — surfaced as a 0.6 keyword match (shared words: phase, themes,
  palette, refresh) but is unrelated to BPM stretch. Not folded; remains in the
  todo backlog.
</deferred>

---

*Phase: 22-bpm-stretch-session*
*Context gathered: 2026-05-15*
