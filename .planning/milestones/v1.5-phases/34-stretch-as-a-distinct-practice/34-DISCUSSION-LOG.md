# Phase 34: Stretch as a Distinct Practice - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 34-stretch-as-a-distinct-practice
**Areas discussed:** HRV's stretch mode fate, What migrates (STRETCH-05), Dev label-treatment toggle, Stretch practice screen

---

## Config-todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| Fold in — stretch defaults only | Scope the config audit to the new stretch slice's defaults | |
| Don't fold | Standalone broad cross-practice audit; note as reviewed-but-deferred | ✓ |
| Fold in — full audit | Pull the entire HRV+Navi+Stretch config review into Phase 34 | |

**User's choice:** Don't fold.
**Notes:** "Review all app config values and defaults" is a broad cross-practice audit, not specific to promoting Stretch. Kept standalone.

---

## HRV's stretch mode fate

| Option | Description | Selected |
|--------|-------------|----------|
| Move out entirely | HRV becomes standard-only; `mode`/`MODE_OPTIONS`/`ModeToggle` retire | ✓ |
| Keep internal mode too | HRV keeps Standard/Stretch toggle AND stretch is also a practice | |
| You decide | Leave to research/planning | |

**User's choice:** Move out entirely.
**Notes:** Resolves the ROADMAP open question flagged for RESEARCH.md. One way to reach a stretch session — the new practice.

### Settings type shape (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Split into two types | Trim resonant `SessionSettings` to standard-only; new `StretchSettings` for ramp fields | ✓ |
| Keep one shared type | Both practices reuse `SessionSettings`; HRV ignores stretch fields | |
| You decide | Leave type-shape design to the planner | |

**User's choice:** Split into two types.
**Notes:** `StretchSettings` must include `ratio` (the stretch ramp consumes it); `durationMinutes` is computed for stretch and excluded. Bigger refactor — touches sessionController, stretchRamp, coercers.

---

## What migrates (STRETCH-05)

### Stretch config

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate into stretch slice | Lift the stretch ramp fields into `practices.stretch.settings` | ✓ |
| Start fresh from defaults | New slice starts at `DEFAULT_STRETCH_SETTINGS`; prior tuning discarded | |
| You decide | Leave to planner | |

**User's choice:** Migrate into stretch slice.

### Stretch stats

| Option | Description | Selected |
|--------|-------------|----------|
| Stretch starts at zero; resonant untouched | New slice = `ZERO_STATS`; resonant counter left as-is | ✓ |
| Copy resonant stats into stretch | Seed stretch with a copy of the resonant counter | |
| You decide | Leave to planner | |

**User's choice:** Stretch starts at zero; resonant untouched.
**Notes:** Stretch was never tracked separately; combined history can't be retroactively split. "Prior Stretch usage preserved" = the saved configuration, not stats.

---

## Dev label-treatment toggle

### Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage dev key | Runtime flip with no rebuild | |
| Build-time env var | `VITE_SWITCHER_TREATMENT`, baked at build; rebuild to change | ✓ |
| DEV-gated toggle | Hidden control visible only on the dev server | |

**User's choice:** Build-time env var (`VITE_SWITCHER_TREATMENT`).

### Default (unset/invalid)

| Option | Description | Selected |
|--------|-------------|----------|
| A — text-only pills | Today's validated component, extended to 3 | ✓ |
| B — icon + label | Default to icon+label | |
| You decide | Leave to planner | |

**User's choice:** A — text-only pills.

### Treatment B glyphs

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt the spike motifs | HRV = orb, Stretch = ramp/descending line, Navi = counting dots | ✓ |
| Plain abstract icons | Generic geometric icons not tied to each mechanic | |
| You decide | Leave final glyph design to the planner | |

**User's choice:** Adopt the spike motifs.

---

## Stretch practice screen

### Screen relationship to HRV

| Option | Description | Selected |
|--------|-------------|----------|
| Straight mirror of HRV | Same layout — orb, inline controls, heading, stats footer | ✓ |
| Mirror + a new element | Add a Stretch-specific element (e.g. ramp preview) | |
| You decide | Leave screen layout to the planner | |

**User's choice:** Straight mirror of HRV.

### Practice copy

| Option | Description | Selected |
|--------|-------------|----------|
| 'Stretch' for both | Switcher label and heading both 'Stretch' / 'Alongar' | ✓ |
| 'Stretch' + fuller heading | Short label + descriptive heading like 'BPM Stretch' | |
| You decide | Leave the exact strings to the planner | |

**User's choice:** 'Stretch' for both.
**Notes:** Spike 007 confirmed 'Alongar' fits the 320px 3-practice switcher.

---

## Claude's Discretion

- Exact `StretchSettings` field set and coercer shape (within the split-types constraint).
- In-session switcher lock posture — reuse the Phase 30 dimmed-in-place pattern.
- How treatment A vs B is wired into `PracticeToggle` (one branching component vs two).
- Test reworking for the removed `mode` / `ModeToggle` surface.

## Deferred Ideas

- Picking a single final switcher treatment and removing the other + the env var — a deliberate later cleanup after real-app testing.
- A fourth+ practice — the top segmented control is sized for ~3–4 practices.
- v1.x carry-forward tech debt — remains deferred.
- **Reviewed, not folded:** "Review all app config values and defaults" — broad cross-practice config audit, stays a standalone todo.
