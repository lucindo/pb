# Phase 25: Labels-vs-Icons Cue Toggle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 25-labels-vs-icons-cue-toggle
**Areas discussed:** Arrow icon semantics, Picker placement, Picker wording (EN), Icon visual treatment

---

## Arrow Icon Semantics

### Directional mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Up = In, Down = Out | Up arrow inhale, down arrow exhale. Conventional. | ✓ |
| Expand = In, Contract = Out | Outward arrows inhale, inward exhale. | |
| Down = In, Up = Out | Inverted "down into the belly". | |

**User's choice:** Up = In, Down = Out — plus a request to generate SVG candidates from two referenced flaticon inhale/exhale icons.

### Arrow form

| Option | Description | Selected |
|--------|-------------|----------|
| Single arrow | One clean glyph. | ✓ |
| Double chevron | Two stacked chevrons. | |

**User's choice:** Single arrow.

### Icon-only vs paired

| Option | Description | Selected |
|--------|-------------|----------|
| Icon only | SVG only; visually-hidden word for SR. | ✓ |
| Icon + small word | Hybrid. | |

**User's choice:** Icon only.

### Lead-in interaction

| Option | Description | Selected |
|--------|-------------|----------|
| No — digit unchanged | Lead-in always shows the numeral. | ✓ |
| Yes — affects lead-in | Lead-in switches presentation too. | |

**User's choice:** No — lead-in digit unchanged.

### Arrow style (mockup `25-cue-icon-mockup.html`, candidates A–F)

| Option | Description | Selected |
|--------|-------------|----------|
| A — Solid arrow | Filled arrow, shaft + head. | |
| B — Line arrow | Thin stroked arrow. | |
| C — Single chevron | V head, no shaft. | |
| D — Double chevron | Two stacked chevrons. | |
| E — Arrow + airflow arc | Flaticon "breathing" style. | |
| F — Soft solid chevron | Filled rounded chevron. | ✓ |

**User's choice:** F — soft solid chevron.

### Drawing mode (added mid-discussion)

User supplied two flaticon nose+airflow reference screenshots and asked for a 3-way picker config (Arrow / Drawing / Text). Drawing candidates D1–D3 added to the mockup.

| Option | Description | Selected |
|--------|-------------|----------|
| D1 — Nose + curved airflow | Closest to reference; busiest small. | |
| D2 — Nose + straight arrows | Cleaner; reads better small / across variants. | ✓ |
| D3 — Minimal nostrils + arrows | No bridge ridges; lightest. | |

**User's choice:** D2 — nose + straight arrows.

**Notes:** Scope expanded from binary to 3-way picker (Text / Arrow / Nose). User chose to update ROADMAP.md + REQUIREMENTS.md rather than defer Drawing to a later phase.

---

## Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Expand to 3-way | Update roadmap + CUE-01/02/03 to 3 cue modes. | ✓ |
| Binary now, Drawing later | Ship Arrow/Text only; defer Drawing. | |

**User's choice:** Expand to 3-way. ROADMAP.md + REQUIREMENTS.md updated 2026-05-15.

---

## Picker Placement

| Option | Description | Selected |
|--------|-------------|----------|
| After Variant | Theme, Variant, Cue, Timbre, Language. | ✓ |
| End of list | Theme, Variant, Timbre, Language, Cue. | |
| After Theme | Theme, Cue, Variant, Timbre, Language. | |

**User's choice:** After Variant.

---

## Picker Wording (EN)

### Section label

| Option | Description | Selected |
|--------|-------------|----------|
| Cue style | Short, neutral. | ✓ |
| In/Out cue | More explicit. | |
| Breathing cue | Names the domain. | |

**User's choice:** "Cue style".

### Option labels

| Option | Description | Selected |
|--------|-------------|----------|
| Text / Arrow / Drawing | Plain. | |
| Labels / Arrows / Drawing | Matches internal id. | |
| Word / Arrow / Nose | Most concrete. | |

**User's choice:** "Text / Arrow / Nose" (mix of options 1 and 3).

---

## Icon Visual Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Match label, static | SVG at label footprint, in/out tokens, no own animation. | ✓ |
| Match label + subtle fade | Same + soft crossfade on In↔Out swap. | |

**User's choice:** Match label, static.

---

## Claude's Discretion

- Internal id strings for the arrow/nose modes (`'labels'` for default is fixed).
- Final SVG path tuning for the F chevron and D2 nose (mockup gives the direction).
- Captured-at-Start vs live-reactive for the `cue` value.
- EN string key names.

## Deferred Ideas

None — the binary→3-way expansion was a scoped scope-change, not deferred work.
