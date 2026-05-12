---
phase: 11
slug: domain-ui-contracts-accessibility
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-12
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Phase 11 is a fix-only patch (4 boundary-contract tightenings: DOMAIN-01, UI-01, UI-02, A11Y-01). No new attack surface, no new untrusted-input source, no new external dependency. ASVS L1 surface is minimal.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| In-app caller → `extendTimedSession` | Component-layer code passes a `number` across the domain boundary into `extendTimedSession`. Post-DOMAIN-01 the throw lands at the boundary itself instead of deep inside `createBreathingPlan`. | `number` (duration minutes; in-process, no external source) |
| App state → React prop (UI-01) | `appPhase === 'lead-in'` is a typed boolean prop passed to `SessionReadout`. | `boolean` (in-process; no untrusted data) |
| App state → React effect (UI-02) | `inSessionView` is an internal React-derived boolean; effect mutates only local dialog-open state. | `boolean` (in-process; React reconciler-mediated) |
| App DOM id → child `aria-describedby` (A11Y-01) | Static string id (`"mute-toggle-resume-hint"`) plumbed through typed React props to MuteToggle. | `string` (compile-time constant; no user input, no DOM injection) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-11-01 | Tampering | `extendTimedSession` accepting an out-of-allowlist finite `durationMinutes` (DOMAIN-01) | accept | Defensive narrowing throw at boundary (`src/domain/sessionController.ts:68`); REDUCES — not introduces — attack surface. No untrusted input source. ASVS L1 has no requirement implicated. | closed |
| T-11-02 | Information Disclosure | DOM render of `SessionReadout` props (UI-01) | accept | Component renders typed React props (string label, number-formatted duration via `formatDuration`). No user-controlled text reaches DOM. No XSS vector. | closed |
| T-11-03 | Denial of Service | Effect-driven state mutation on `[inSessionView]` (UI-02) | mitigate | Effect deps array is a single primitive boolean; React reconciler suppresses no-op setStates; no derived object identity churn; no unbounded loop possible. Mirrors WR-01 EndSessionDialog auto-close posture (`src/app/App.tsx:247-271`). | closed |
| T-11-04 | Spoofing | `aria-describedby` referencing a static id (A11Y-01) | accept | Static string `"mute-toggle-resume-hint"` is a compile-time constant plumbed through typed React props. Not user-controllable. ARIA references are read by assistive tech, not parsed as URLs or code. | closed |
| T-11-05 | Repudiation / Auditing | Per-commit green-gate (tsc/lint/build/vitest) per D-17 | mitigate | Acceptance criteria of every task in 11-01-PLAN.md require the four-gate to exit 0 BEFORE the commit lands. SUMMARY records all 4 commits passed the gate (391 → 400 tests, all four gates exit 0 at every commit boundary). Broken state cannot be committed. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-11-01 | T-11-01 | Disposition `none / informational` in PLAN. The new boundary throw is itself the defensive narrowing; no upstream caller passes untrusted data. ASVS L1 has no implicated requirement. | Renato Lucindo | 2026-05-12 |
| R-11-02 | T-11-02 | Disposition `none` in PLAN. SessionReadout renders only typed, in-process React props; no user input crosses to the DOM. | Renato Lucindo | 2026-05-12 |
| R-11-04 | T-11-04 | Disposition `none` in PLAN. The aria-describedby id is a compile-time constant; ARIA reference IDs are not URL- or code-parsed. | Renato Lucindo | 2026-05-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-12 | 5 | 5 | 0 | gsd-secure-phase (short-circuit: register_authored_at_plan_time=true, threats_open=0) |

### Evidence verified at audit time

- T-11-01 mitigation: `src/domain/sessionController.ts:68` boundary throw confirmed in SUMMARY self-check (verified via grep).
- T-11-02 mitigation: SessionReadout.tsx renders `formatDuration` output + static label; no `dangerouslySetInnerHTML`, no user text path.
- T-11-03 mitigation: Effect at `src/app/App.tsx:264-271`, deps `[inSessionView]` (single primitive); no object identity churn.
- T-11-04 mitigation: `src/components/MuteToggle.tsx:44` (`aria-describedby={needsResume ? resumeHintId : undefined}`) + App-owned static id at `src/app/App.tsx:621`.
- T-11-05 mitigation: 4 commits in plan (`2f6b54f`, `e6a6ddb`, `2296b08`, `ac5e446`) — SUMMARY records all four gates exit 0 at every commit boundary (391 → 400 vitest counts: 392 / 396 / 398 / 400).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-12
