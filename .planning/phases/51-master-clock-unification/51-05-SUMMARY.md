---
phase: 51-master-clock-unification
plan: 05
status: complete_pending_uat
completed: 2026-05-28
requirements_addressed:
  - CLOCK-04
  - DEPS-01
  - QUAL-01
key_files:
  created:
    - .planning/phases/51-master-clock-unification/51-IOS-UAT.md
commits:
  - 6da3f58 docs(51-05): write iOS device UAT plan for CLOCK-04
---

# Plan 51-05 Summary — iOS device UAT plan for CLOCK-04

## What was delivered

`51-IOS-UAT.md` — a 340-line operator-driven manual test plan covering 7
scenarios that close CLOCK-04 (iOS lock/unlock keeps audio + animation in
phase on resume) and confirm ROADMAP Phase 51 Success Criteria #1–#4 on a
real iOS device.

The scenarios are:

| ID | Scenario | Closes |
|----|----------|--------|
| (a) | HRV breathing — short lock/unlock mid-session | CLOCK-04 / SC#1 |
| (b) | Stretch — short lock/unlock mid-session | CLOCK-04 / D-09 (ramp continuity) |
| (c) | Navi Kriya — short lock/unlock mid-session | CLOCK-04 / D-08 (NK stats on AC-time) |
| (d) | Long lock test (5+ minutes) | CLOCK-04 stress / B2 real-device confirmation |
| (e) | Brief lock test (< 5 sec) | Phase 5.1 optimistic visibilitychange path preservation |
| (f) | Long-lock recovery affordance + reanchor interaction | D-10 / D-11 (real-device confirmation) + Phase 5.1 preservation |
| (g) | Foreground 5-min smoke | CLOCK-05 real-device confirmation (B7 in jsdom proves this deterministically) |

## Plan must_haves — outcomes

| Truth | Status |
|---|---|
| UAT file exists and documents an executable test plan for CLOCK-04 | ✓ |
| Scenarios (a)-(f) covered at minimum | ✓ — plus scenario (g) for CLOCK-05 real-device |
| Each scenario has explicit PASS / FAIL criteria | ✓ |
| Covers all 4 ROADMAP Phase 51 Success Criteria | ✓ |
| Covers BOTH Phase 51 caller-level rebase AND Phase 5.1 iOS recovery affordance interaction | ✓ — scenario (f) explicitly |
| Documents device matrix the operator commits to testing | ✓ — table with operator-fill rows |
| Out-of-scope deferred items explicitly listed | ✓ — S2 Android, iOS PWA < 18.4, Pitfall 6 phone-call interruption |
| Plan includes a checkpoint that pauses for operator UAT execution | ✓ — see "Operator Checkpoint" below |
| UAT failures route into `/gsd:plan-phase 51 --gaps` | ✓ — documented in "Aggregate UAT Result" section |
| DEPS-01 holds (no package change) | ✓ — only adds markdown |
| QUAL-01 holds at commit boundary | ✓ — `tsc -b` + `test:run` pass at HEAD |

## Locked decisions — outcomes

- **Checkpoint**: this plan is `autonomous: false`. The UAT document is
  written and committed (commit `6da3f58`); the operator UAT execution
  remains pending. The orchestrator returns control with a
  `checkpoint:human-verify` payload identifying the next required user action.
- **No code changes**: the plan modifies zero source files; only a single
  new planning document.
- **Out-of-scope deferred items**: explicitly carried forward per STATE.md
  L99-101 (S2 Android Chrome wake-lock UAT; iOS standalone-PWA Wake Lock <
  18.4; iOS Pitfall 6 phone-call interrupted state).

## Operator Checkpoint

The plan-level work (writing the UAT document) is complete and committed.
The remaining work is the real-device UAT execution, which only the operator
can perform.

**Awaiting:** operator runs the 7 scenarios in `51-IOS-UAT.md` on a real iOS
device and reports back to the orchestrator with one of:

- `all UAT pass` / `approved` → CLOCK-04 closed; phase verification proceeds.
- `UAT failures: <comma-separated scenario letters>` (e.g. `UAT failures: a, f`)
  → routes into `/gsd:plan-phase 51 --gaps`.

## Verification

- `npx tsc -b` → exit 0 at HEAD `6da3f58`
- `npm run test:run` → 1387 tests passing at HEAD
- `git diff package.json` → zero changes (DEPS-01 holds)

## Self-Check: PASSED (document complete; UAT execution pending operator)
