# Phase 1: Configurable Session Timing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 1-configurable-session-timing
**Areas discussed:** Timing controls, Run display, End behavior, Session copy

---

## Timing Controls

### Default session

| Option | Description | Selected |
|--------|-------------|----------|
| 5.5, 40:60, 20m | Familiar HRV-style starting point with a longer exhale and meaningful practice length. | |
| 5.0, 50:50, 10m | Simpler and more neutral for general meditators. | |
| 5.5, 50:50, 10m | Common BPM with an easier equal inhale/exhale pattern. | |
| You decide | Planner can choose the best default within locked v1 options. | |

**User's choice:** 5.5 BPM, 40:60 ratio, 10 minutes.
**Notes:** User supplied a hybrid value: same BPM and ratio as the recommended option, shorter duration.

### Control style

| Option | Description | Selected |
|--------|-------------|----------|
| Preset buttons | Visible tap targets for each option group. | |
| Steppers | Shows one value at a time with plus/minus controls. | Yes |
| Dropdowns | Compact and conventional. | |
| You decide | Planner can choose the best control style. | |

**User's choice:** Steppers.
**Notes:** Finite values remain locked by requirements.

### Setting order

| Option | Description | Selected |
|--------|-------------|----------|
| BPM, ratio, duration | Choose breath rhythm first, then session length. | Yes |
| Duration, BPM, ratio | Starts from commitment length. | |
| BPM, duration, ratio | Keeps rhythm first but moves ratio later. | |
| You decide | Planner can choose the most natural ordering. | |

**User's choice:** BPM, ratio, duration.
**Notes:** None.

### Ratio labeling

| Option | Description | Selected |
|--------|-------------|----------|
| Inhale/Exhale words | Labels like Inhale 40 / Exhale 60. | |
| Percent pairs only | Compact labels like 40:60. | Yes |
| Short plus help text | Show 40:60 with a small explanatory note. | |
| You decide | Planner can choose the clearest label style. | |

**User's choice:** Percent pairs only.
**Notes:** None.

---

## Run Display

### Running settings treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only summary | Hide editable controls and show compact selected settings. | |
| Disabled controls | Keep the same controls visible but disabled. | |
| Keep editable | Allow changes during a running session. | Partial |
| You decide | Planner can choose the cleanest running-state treatment. | |

**User's choice:** Keep only session duration editable during running.
**Notes:** BPM and ratio should not remain editable.

### Running duration edits

| Option | Description | Selected |
|--------|-------------|----------|
| Increase only | User can add time but cannot shorten below elapsed time. | Partial |
| Increase or shorten | More flexible, but needs clearer completion behavior. | |
| Timed only | Editable for timed sessions only. | Partial |
| You decide | Planner can choose the safest rule. | |

**User's choice:** Timed only, increase only.
**Notes:** Open-ended sessions are not edited while running.

### Main running readout

| Option | Description | Selected |
|--------|-------------|----------|
| Phase plus time | Large phase label with remaining time for timed sessions and elapsed time for open-ended sessions. | Yes |
| Phase only | Very calm and minimal. | |
| Full timing detail | Phase label, phase countdown, elapsed/remaining, BPM, ratio, and duration. | |
| You decide | Planner can choose the clearest readout. | |

**User's choice:** Phase plus time.
**Notes:** None.

### Basic phase indication

| Option | Description | Selected |
|--------|-------------|----------|
| Simple progress | Basic current-phase progress indicator. | |
| Text only | Just Inhale/Exhale plus time. | |
| Basic breathing shape | Rough expand/contract shape now, polished later. | Yes |
| You decide | Planner can choose the appropriate minimal indicator. | |

**User's choice:** Basic breathing shape.
**Notes:** Phase 2 remains responsible for polished accessible visuals.

---

## End Behavior

### Stop action label

| Option | Description | Selected |
|--------|-------------|----------|
| End session | Calm and clear; works for timed and unlimited sessions. | Yes |
| Reset | Direct, but can sound like it changes settings. | |
| Stop | Short and familiar, but abrupt. | |
| You decide | Planner can choose the best stop label. | |

**User's choice:** End session.
**Notes:** None.

### Manual end settings behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Keep settings | Clear active timer/phase state but keep selections for restart. | Yes |
| Reset defaults | Return to first-open defaults every time. | |
| Ask each time | Gives control, but adds interruption. | |
| You decide | Planner can choose reset behavior. | |

**User's choice:** Keep settings.
**Notes:** This is in-session state only; local persistence is Phase 4.

### Timed completion behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Completion message | Calm completed state with selected settings and a way to start again. | Yes |
| Return to setup | Automatically go back to configuration. | |
| Stay at zero | Leave completed timer visible until user acts. | |
| You decide | Planner can choose completion treatment. | |

**User's choice:** Completion message.
**Notes:** Exact copy captured under Session copy.

### End confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| No confirmation | One clear action ends the session immediately. | |
| Confirm always | Prevents accidental endings, but adds a step. | |
| Confirm timed only | Protects intentional timed sessions while open-ended sessions end quickly. | Yes |
| You decide | Planner can choose the safest interaction. | |

**User's choice:** Confirm timed only.
**Notes:** Open-ended sessions end directly.

---

## Session Copy

### Start button

| Option | Description | Selected |
|--------|-------------|----------|
| Start session | Clear, neutral, and consistent with End session. | Yes |
| Begin breathing | Warmer and practice-oriented. | |
| Start practice | Calm and meditative. | |
| You decide | Planner can choose the clearest start label. | |

**User's choice:** Start session.
**Notes:** None.

### Active phase labels

| Option | Description | Selected |
|--------|-------------|----------|
| Inhale / Exhale | Matches requirements and ratio language. | |
| Breathe in/out | Conversational and beginner-friendly. | |
| In / Out | Compact. | Yes |
| You decide | Planner can choose the best labels. | |

**User's choice:** In / Out.
**Notes:** None.

### Open-ended duration label

| Option | Description | Selected |
|--------|-------------|----------|
| Unlimited | Concise and matches requirement language. | |
| Open-ended | Gentler and more meditative. | Yes |
| Until I end it | Most explicit, but longer. | |
| You decide | Planner can choose the best label. | |

**User's choice:** Open-ended.
**Notes:** None.

### Completion message

| Option | Description | Selected |
|--------|-------------|----------|
| Session complete | Calm, short, and non-medical. | Yes |
| Practice complete | More meditative, but less tied to session controls. | |
| Well done | Warm but slightly gamified. | |
| You decide | Planner can choose completion copy. | |

**User's choice:** Session complete.
**Notes:** None.

---

## Agent Discretion

No explicit `you decide` choices were selected.

## Deferred Ideas

None.
