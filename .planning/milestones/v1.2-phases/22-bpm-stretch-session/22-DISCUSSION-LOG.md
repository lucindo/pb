# Phase 22: BPM Stretch Session - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 22-bpm-stretch-session
**Areas discussed:** Ramp definition, Settings surface, Min-duration gate, In-session feedback

---

## Ramp definition

### BPM direction

| Option | Description | Selected |
|--------|-------------|----------|
| Both directions | targetBpm above or below initialBpm | |
| Down-only (slow down) | targetBpm must be < initialBpm — typical HRV ease-into-slower | ✓ |
| Up-only (speed up) | targetBpm must be > initialBpm | |

**User's choice:** Down-only (slow down)

### Ramp length

| Option | Description | Selected |
|--------|-------------|----------|
| Its own picker | User sets ramp duration; total computed = holdInitial + ramp + holdTarget | ✓ |
| Derived from total duration | ramp = totalDuration − holds; breaks for open-ended | |
| You decide | Planner picks | |

**User's choice:** Its own picker

### Open-ended meaning

| Option | Description | Selected |
|--------|-------------|----------|
| Infinite hold at target | Run holdInitial → ramp → hold at targetBpm indefinitely | ✓ |
| No open-ended for stretch | Stretch sessions must be timed | |

**User's choice:** Infinite hold at target

### Ramp curve

| Option | Description | Selected |
|--------|-------------|----------|
| Linear | Uniform BPM change per unit time; simplest step-invariant proof | ✓ |
| Eased (slow at ends) | Slower change near endpoints; more engine complexity | |
| You decide | Planner picks | |

**User's choice:** Linear

---

## Settings surface

### Mode enablement

| Option | Description | Selected |
|--------|-------------|----------|
| Standard / Stretch picker | SettingsStepper-style two-option picker | ✓ |
| On/off toggle | Single toggle/switch — new control pattern | |
| You decide | Planner picks | |

**User's choice:** Standard / Stretch picker

### Field layout

| Option | Description | Selected |
|--------|-------------|----------|
| Swap bpm for stretch fields | Single bpm stepper replaced by stretch fields in Stretch mode | ✓ |
| Keep bpm, add fields below | bpm stepper stays (unused) with stretch fields below | |
| You decide | Planner picks | |

**User's choice:** Swap bpm for stretch fields

### Picker ranges

| Option | Description | Selected |
|--------|-------------|----------|
| Holds 0–60s/15s; ramp 5–60min/5min | Holds in 15s steps; ramp mirrors duration grid | ✓ |
| Holds 0–300s/30s; ramp 5–60min/5min | Longer holds up to 5 min | |
| You decide | Planner picks | |

**User's choice:** Holds 0–60s/15s; ramp 5–60min/5min

### Total-duration display

| Option | Description | Selected |
|--------|-------------|----------|
| Live readout in SettingsForm | Computed total updates live as pickers change | ✓ |
| Only on the existing session readout | No new settings line | |
| You decide | Planner picks | |

**User's choice:** Live readout in SettingsForm

---

## Min-duration gate

### Gate target

| Option | Description | Selected |
|--------|-------------|----------|
| Standard duration picker | Gate reads Standard-mode durationMinutes | |
| Computed stretch total | Gate reads computed holdInitial + ramp + holdTarget | ✓ |
| You decide | Planner picks | |

**User's choice:** Computed stretch total
**Notes:** Creates a chicken-and-egg (stretch fields only exist once in Stretch mode) — flagged as an open consideration for the planner in CONTEXT.md.

### Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| 10 minutes | Minimum gated duration of 10 min | |
| 15 minutes | More conservative — genuinely gradual walk | ✓ |
| You decide | Planner picks | |

**User's choice:** 15 minutes

### Open-ended UI

| Option | Description | Selected |
|--------|-------------|----------|
| 'Open-ended' value on holdTarget | holdTarget stepper carries {0,15,30,45,60s,Open-ended} | ✓ |
| Separate open-ended toggle | Distinct toggle disabling the holdTarget picker | |
| You decide | Planner picks | |

**User's choice:** 'Open-ended' value on holdTarget

### Gate feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Grayed out + hint text | Disabled with a short reason hint | ✓ |
| Silently grayed out | Disabled with no explanation | |
| You decide | Planner picks | |

**User's choice:** Grayed out + hint text

---

## In-session feedback

### Live BPM display

| Option | Description | Selected |
|--------|-------------|----------|
| Hide BPM entirely | No BPM number while running | |
| Show live current BPM | BPM readout updates as the ramp progresses | ✓ |
| Show static initial→target | Fixed context, not the live value | |

**User's choice:** Show live current BPM

### Stage label

| Option | Description | Selected |
|--------|-------------|----------|
| No stage indicator | Running view identical to standard sessions | |
| Subtle stage label | Small label marking warm-up / ramp / cool-down | ✓ |
| You decide | Planner picks | |

**User's choice:** Subtle stage label

### Target-reached cue

| Option | Description | Selected |
|--------|-------------|----------|
| No special cue | Transition into cool-down hold silent and unmarked | ✓ |
| Subtle visual cue | Gentle acknowledgement at targetBpm | |
| You decide | Planner picks | |

**User's choice:** No special cue

---

## Claude's Discretion

- Ramp engine representation on the one-clock SessionFrame (time-varying BPM model).
- How stretch fields extend SessionSettings, validateSettings, isValid* predicates, storage envelope.
- SettingsStepper wiring for new fields and the targetBpm < initialBpm constraint.
- Stage-label copy (EN + PT-BR) and live BPM / stage label placement in SessionReadout.
- Resolution of the computed-total gate chicken-and-egg.

## Deferred Ideas

None — discussion stayed within phase scope. Reviewed todo
`2026-05-13-themes-aesthetic-refresh.md` (0.6 keyword match) was not folded —
unrelated to BPM stretch.
