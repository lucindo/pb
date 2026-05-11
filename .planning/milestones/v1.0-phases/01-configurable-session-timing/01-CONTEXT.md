# Phase 1: Configurable Session Timing - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the main-screen timing configuration and running-session loop for HRV breathing. Users can choose BPM, inhale/exhale ratio, and either a timed or open-ended duration, start a session, see the active `In` or `Out` phase immediately, and end or complete the session without stale running state carrying over.

The phase boundary is fixed by `.planning/ROADMAP.md`: polished accessible visual design, audio cues, local saved settings/stats, wake lock, learning content, pause/resume, pre-session inhale/exhale second previews, advanced patterns, and biofeedback are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Timing Controls
- **D-01:** The first-open default session is `5.5` BPM, `40:60` ratio, and `10` minutes.
- **D-02:** Settings are presented as steppers rather than preset-button groups or dropdowns.
- **D-03:** Settings appear in this order before the start action: BPM, ratio, duration.
- **D-04:** Ratio values use compact percent-pair labels such as `40:60`; do not expand each option into inhale/exhale words in the control label.
- **D-05:** Duration includes the locked v1 values from 5 to 60 minutes in 5-minute increments plus an open-ended option.

### Run Display
- **D-06:** Starting a session locks BPM and ratio for that running session.
- **D-07:** During a running timed session, duration remains editable only to increase the total session length. Do not allow shortening, switching to open-ended, or otherwise disrupting completion logic mid-session.
- **D-08:** Open-ended sessions do not expose running duration edits; they continue until the user ends them.
- **D-09:** The primary running readout is phase plus time: show the current `In`/`Out` phase prominently, show remaining time for timed sessions, and show elapsed time for open-ended sessions.
- **D-10:** Phase 1 includes a basic breathing shape as functional phase indication. Treat it as a simple first-pass guide, not the polished final visual experience reserved for Phase 2.

### End Behavior
- **D-11:** The primary manual stop action is labeled `End session`.
- **D-12:** Manually ending a session clears active timer/phase state but keeps the user's selected BPM, ratio, and duration visible for easy restart.
- **D-13:** Timed sessions show a completion state when the timer reaches the end, using the message `Session complete`.
- **D-14:** Tapping `End session` requires confirmation for timed sessions only. Open-ended sessions end directly.

### Session Copy
- **D-15:** The idle-state start button is labeled `Start session`.
- **D-16:** Active phase labels are `In` and `Out`.
- **D-17:** The unlimited duration option is labeled `Open-ended`.
- **D-18:** The timed-session completion message is `Session complete`.

### Agent Discretion
No explicit `you decide` choices were selected. Downstream agents retain normal technical implementation discretion, but the product decisions above are locked.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope And Constraints
- `.planning/PROJECT.md` - Defines the web-first, local-only, calm, non-medical product direction and the active/out-of-scope requirements that constrain this phase.
- `.planning/ROADMAP.md` - Defines Phase 1 goal, fixed boundary, requirements mapping, and success criteria.

### Requirements
- `.planning/REQUIREMENTS.md` - Defines Phase 1 requirement IDs `SESS-01` through `SESS-05` and `BREA-01` through `BREA-03`, plus later-phase and out-of-scope items that must not be pulled into Phase 1.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None found. The repository currently contains planning artifacts only; no app source files, `package.json`, `src/`, `app/`, or component directories exist yet.

### Established Patterns
- Product docs establish a web-first, responsive, local-only v1 with no backend, accounts, medical claims, or advanced customization.
- Timing must come from one accurate continuous inhale/exhale session clock with no pauses; visuals and later audio consume that derived session state.

### Integration Points
- Phase 1 implementation starts the main app surface from scratch: timing controls, start/end controls, running-state display, completion state, and the underlying session timing model.
- Do not assume reusable UI primitives or timing utilities already exist.

</code_context>

<specifics>
## Specific Ideas

- User specifically wants timed sessions to be extendable while running, but only upward and only for timed sessions.
- The basic breathing shape should make the current phase followable now while leaving the polished accessible visual guide for Phase 2.
- `In` / `Out` copy is preferred over `Inhale` / `Exhale` for the active phase labels.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-configurable-session-timing*
*Context gathered: 2026-05-09*
