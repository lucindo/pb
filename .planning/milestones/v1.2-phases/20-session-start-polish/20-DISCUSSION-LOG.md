# Phase 20: Session Start Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 20-session-start-polish
**Areas discussed:** Cancel-during-lead-in fate

---

## Cancel-during-lead-in fate

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it — wait out 3s | Button fully disabled during lead-in, no cancel affordance, Test 11 deleted | |
| Separate Cancel affordance | Small Cancel/X button near orb during lead-in; Start stays disabled | |
| Swap label to "Cancel" | Same button morphs Start session → Cancel during lead-in | ✓ |
| Disabled-look, still cancels | Button renders dim but click still triggers cancel branch | |

**User's choice:** Swap label to "Cancel".
**Notes:** Operator clarified: no style change, no other change. The button already cancels on click during the countdown today (CR-01 path) — only the label needs to swap. PT-BR label = "Cancelar". Emphasized "super simple."

### Wiring (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| New `inLeadIn` prop | Optional `inLeadIn?: boolean` on SessionControlsProps | ✓ (Claude's discretion) |
| App computes label, passes string | App computes label inline, passes as prop | |
| Reuse `status`, add 'lead-in' | Extend SessionStatus domain type | |

**User's choice:** Deferred to Claude — "you choose the best option."
**Notes:** Chose `inLeadIn` prop: smallest blast radius, matches existing optional-prop pattern in SessionControls, leaves domain types untouched.

### Strings (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Add `cancel` to controls slice | UI_STRINGS.{en,pt-BR}.controls.cancel | ✓ |
| Inline literal in SessionControls | Hardcode 'Cancel'/'Cancelar' in component | |

**User's choice:** Add `cancel` to the controls slice.
**Notes:** Matches existing startSession/endSession pattern; LOCKED_COPY frozen-EN guard unaffected (controls slice not frozen).

---

## Claude's Discretion

- Wiring mechanism (`inLeadIn` prop) — operator said "you choose the best option."
- Exact placement of the `cancel` key and label-resolution expression form.

## Deferred Ideas

None — discussion stayed within phase scope.
