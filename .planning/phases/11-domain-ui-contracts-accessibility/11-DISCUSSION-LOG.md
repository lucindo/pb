---
phase: 11-domain-ui-contracts-accessibility
created: 2026-05-11
milestone: v1.0.1
mode: discuss (default)
---

# Phase 11 Discussion Log — Domain, UI Contracts & Accessibility

This log is human-reference only — audits, retrospectives, "why did we pick X over Y?" lookups. Downstream agents (researcher, planner, executor) consume `11-CONTEXT.md`, not this file.

## Areas selected for discussion

User selected all four gray areas (multiSelect):
- DOMAIN-01 — extendTimedSession validation
- UI-01 — SessionReadout lead-in contract
- UI-02 — Dialog auto-close on session transition
- A11Y-01 — MuteToggle describedby + plan packaging

## DOMAIN-01 — extendTimedSession validation

### Q1: How should extendTimedSession validate durationMinutes against DURATION_OPTIONS?

Options presented:
1. Explicit runtime throw at boundary (keep param `number`).
2. Narrow param type to `DurationOption` + boundary throw on `'open-ended'`.
3. Both — narrow type AND keep runtime throw (belt-and-suspenders).

**Selected:** Option 1 — explicit runtime throw, keep param `number`.

Rationale (captured in CONTEXT D-01): smallest diff at the caller boundary; no `SettingsForm.onExtendDuration` prop-type churn; WR-01's failure mode is fully closed by a boundary throw regardless of param type narrowing.

### Q2: Where should the allowlist check land, and what error class?

Options presented:
1. After open-ended throw, BEFORE the `<=` check, `RangeError`.
2. Merge into the existing comparison check, `RangeError`.
3. After open-ended throw, BEFORE the `<=` check, dedicated `InvalidDurationError` subclass.

**Selected:** Option 1 — after open-ended throw, before `<=` check, `RangeError`.

Rationale (captured in CONTEXT D-02): orders failure messages by severity; preserves callers' existing `RangeError` catch sites unchanged; avoids the ambiguity of a merged predicate; subclass deferred (too much surface for fix-only patch).

## UI-01 — SessionReadout lead-in contract

### Q1: Which contract for the SessionReadout lead-in placeholder case?

Options presented:
1. `isLeadInPlaceholder` boolean prop.
2. Component-local `ReadoutStatus = SessionStatus | 'lead-in'` union.
3. Extend domain `SessionStatus` union with `'lead-in'`.

**Selected:** Option 1 — `isLeadInPlaceholder` boolean prop.

Rationale (captured in CONTEXT D-04): lead-in is App-state (`appPhase`), not engine-state; widening the domain `SessionStatus` would force every exhaustive switch in `useSessionEngine` to handle a state the engine never produces; a boolean prop keeps the UI-only concept at the UI boundary.

### Q2: When isLeadInPlaceholder=true, what should SessionReadout do internally?

Options presented:
1. Force-render timer chip from `frame`; ignore status/message.
2. Force-render timer chip; keep the existing `status='idle'` override at App.tsx:583.
3. Assert non-null frame + render chip, throw on null frame.

**Selected:** Option 1 — force-render timer chip from `frame`; ignore status/message.

Rationale (captured in CONTEXT D-05): fully removes the App-side `status='idle'` hack; documents the contract at the component boundary; runtime throw rejected as overkill for a UI contract (React boundary swallows would surface as blank UI).

## UI-02 — Dialog auto-close on session transition

### Q1: Shape of the UI-02 force-close mechanism?

Options presented:
1. Single App-level `useEffect` on `inSessionView`, closes both dialogs.
2. Two separate effects, one per dialog.
3. Open-guard only, no reactive close.

**Selected:** Option 1 — single `useEffect` watching `[inSessionView]`, closes both.

Rationale (captured in CONTEXT D-07, D-08): mirrors the EndSessionDialog subscribe-and-reflect pattern at App.tsx:247-253; React's reconciler suppresses no-op setStates so two-effect split wins nothing; open-guard-only fails WR-09's "cannot remain open" under any open-then-transition race. Existing `onLearnClick` open-guard preserved as defense in depth.

## A11Y-01 — MuteToggle describedby + plan packaging

### Q1: How to wire MuteToggle's aria-describedby to the App-level aria-live region?

Options presented:
1. App passes `resumeHintId` prop; MuteToggle conditional describedby.
2. Hard-code id string in both files, conditional describedby.
3. Always-set describedby (drop conditional).

**Selected:** Option 1 — App passes `resumeHintId` prop; conditional describedby on MuteToggle.

Rationale (captured in CONTEXT D-10, D-11): id ownership belongs at the live-region site (App), not duplicated in MuteToggle; conditional describedby avoids the dangling-pointer announcement some screen readers fire when the live region text is empty.

### Q2: Plan packaging for Phase 11?

Options presented:
1. Single plan, single wave, four task groups.
2. Two plans — domain/contract vs a11y wiring.
3. Four plans, one per REQ.

**Selected:** Option 1 — single plan, single wave, four task groups.

Rationale (captured in CONTEXT D-13, D-14): files barely overlap; App.tsx multi-touch lands at non-overlapping line ranges; mirrors Phase 10 D-16 single-plan rationale; splitting wouldn't reduce risk.

## Todos cross-referenced

| Todo | Score | Disposition |
|---|---|---|
| `2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md` (area: ui) | 0.9 | Reviewed, NOT folded. Tangential — Phase 11 doesn't touch BreathingShape's reduced-motion render path. Stays in v1.x backlog. |
| `2026-05-11-missing-favicon-404-in-console.md` (area: ui) | 0.5 | Reviewed, NOT folded. Owned by ASSETS-01 (Phase 12), not Phase 11. |

## Scope-creep redirects

None. The user did not propose any scope-creep candidates during the discussion; all four selected areas live within Phase 11's success-criteria envelope from ROADMAP.md.

## Claude's discretion

- Final wording of the new `RangeError` message in `extendTimedSession` (D-01) — planner picks; CONTEXT only requires that the message disambiguates allowlist-failure from comparison-failure.
- Exact line offset for the new App-level UI-02 effect (D-07) — planner picks; the natural site is adjacent to the existing EndSessionDialog effect at App.tsx:247-253 but order inside that effect cluster is planner's call.
- Whether to add the WR-09 cases to the existing `describe` block in `App.dialog.test.tsx` or open a new sibling `describe('WR-09 in-session dialog auto-close')` block (D-09) — planner's call; the test geography itself is fixed (same file).
- Exact final wording of the `// Reason:` annotation on the new UI-02 eslint-disable (D-15) — planner picks; the CONTEXT sketch is a recommended starting point, not a literal string lock.
