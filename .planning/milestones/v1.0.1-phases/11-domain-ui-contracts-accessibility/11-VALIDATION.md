---
phase: 11
slug: domain-ui-contracts-accessibility
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
---

# Phase 11 — Validation Strategy

> Per-phase validation contract. Phase 11 is a fix-only patch closing DOMAIN-01, UI-01, UI-02, A11Y-01 — all four requirements ship with co-located vitest coverage.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Config file** | `package.json` `"test": "vitest"` (no separate vitest.config.* — defaults) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~3 seconds (28 test files, 400 tests) |
| **Per-commit green-gate (D-17)** | `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` |

---

## Sampling Rate

- **After every task commit:** `npm test -- --run` (full vitest — runtime ~3s, faster than narrowed run)
- **Before `/gsd-verify-work`:** Full four-gate must be green (tsc, lint, build, vitest)
- **Max feedback latency:** ~3 seconds (vitest) / ~30 seconds (full four-gate)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | DOMAIN-01 | T-11-01 | `extendTimedSession(running, 7)` throws RangeError at the boundary (not deep inside `createBreathingPlan`) | unit | `npm test -- --run src/domain/sessionController.test.ts` | ✅ | ✅ green |
| 11-01-02 | 01 | 2 | UI-01 | T-11-02 | `SessionReadout` renders placeholder branch when `isLeadInPlaceholder` is true; status-override hack removed | unit/component | `npm test -- --run src/components/SessionReadout.test.tsx` | ✅ | ✅ green |
| 11-01-03 | 01 | 3 | UI-02 | T-11-03 | App-level effect on `[inSessionView]` force-closes Learn and Reset dialogs on in-session transition | integration | `npm test -- --run src/app/App.dialog.test.tsx` | ✅ | ✅ green |
| 11-01-04 | 01 | 4 | A11Y-01 | T-11-04 | `MuteToggle` sets `aria-describedby={resumeHintId}` only when `needsResume` is true | unit/component | `npm test -- --run src/components/MuteToggle.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Test-count delta per task (per SUMMARY): DOMAIN-01 +1, UI-01 +4, UI-02 +2, A11Y-01 +2 = +9. Baseline 391 → final 400. All four green gates exit 0 at every commit boundary.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework install, no new shared fixtures required. SessionReadout.test.tsx is a NEW test file (per D-16 exception for structural gap-fill) but uses the project's standard vitest + @testing-library/react setup.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Screen-reader announces resume hint via `aria-describedby` when MuteToggle is focused in `needsResume` state | A11Y-01 | Verifying live screen-reader output requires VoiceOver / NVDA / JAWS — not scriptable inside vitest. Unit test verifies the attribute is present; assistive-tech announcement is an external observation. | Trigger audio-paused state (interrupt audio source), enable screen reader, Tab to MuteToggle button. Screen reader should announce the sr-only resume hint after the button label. |

---

## Validation Sign-Off

- [x] All tasks have automated verify (vitest unit/component/integration)
- [x] Sampling continuity: 4 consecutive tasks, all with automated verify (no 3-in-a-row gap)
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags (`--run` enforced)
- [x] Feedback latency < 5s (~3s vitest)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-12
