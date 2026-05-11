---
phase: 10
slug: hooks-identity-effect-hygiene
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `10-RESEARCH.md` §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.setup.ts` (FakeAudioContext polyfill); `vite.config.ts` (test config inline) |
| **Quick run command** | `npx vitest run src/hooks/useSessionEngine.test.tsx src/hooks/useAudioCues.test.tsx` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~3 seconds (full); < 1 s (quick) |

---

## Sampling Rate

- **After every task commit:** Run quick command for the file(s) touched (< 5 s).
- **After every plan wave:** Run full suite (`npm run test -- --run`) plus `tsc --noEmit` + `npm run lint` + `npm run build` per D-21 / Phase 7 D-09.
- **Before `/gsd-verify-work`:** Full suite green + tsc + lint + build all exit 0.
- **Max feedback latency:** 5 seconds (quick); 10 seconds (wave gate).

---

## Per-Task Verification Map

> Task IDs finalized when PLAN.md is written. Engine-first ordering per CONTEXT D-17: task 1 = `useSessionEngine`, task 2 = `useAudioCues`, task 3 = `App.tsx`. Single plan, single wave per D-16.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | HOOKS-03 | — | `currentFrame` `===` stable across renders within same `cycleIndex:phase` | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "currentFrame identity is stable"` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | HOOKS-03 | — | `currentFrame` identity changes at phase boundary | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "currentFrame identity changes"` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | HOOKS-03 | — | `liveFrame` identity new per rAF; `liveFrame.phaseProgress` advances within a phase | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "liveFrame"` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | HOOKS-04 | Resource exhaustion (DoS) — uncancelled rAF callback | rAF tick after teardown is a no-op (no setState observed) | unit (renderHook + unmount + advanceTimersByTime) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "rAF cancel-guard"` | ❌ W0 | ⬜ pending |
| 10-01-05 | 01 | 1 | HOOKS-02 | Tampering (stale-closure data integrity) | `runningSnapshotRef.current` populated while running; nulled per cleanup contract | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "runningSnapshotRef"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 01 | 1 | HOOKS-01 | DoS — identity churn render explosion | `start` callback identity stable across `setMuted(true)` toggle | unit (renderHook ref-equality) | `npx vitest run src/hooks/useAudioCues.test.tsx -t "start callback identity is stable"` | ❌ W0 | ⬜ pending |
| 10-02-02 | 01 | 1 | HOOKS-01 | — | `reconstructEngine` identity stable across setMuted (via `resume` round-trip proxy) | unit (renderHook ref-equality) | `npx vitest run src/hooks/useAudioCues.test.tsx -t "resume callback.+stable"` | ❌ W0 | ⬜ pending |
| 10-03-01 | 01 | 1 | HOOKS-02 | — | App leave-running cleanup fires once per status-transition-out-of-running (NOT per rAF); reads `session.runningSnapshotRef.current` for elapsed math | integration (App-level) — D-15 boundary-cue exactly-once tests indirectly lock the cadence | `npm run test -- --run` (existing `App.audio.test.tsx` + `App.persistence.test.tsx`) | ✅ existing | ⬜ pending |
| 10-03-02 | 01 | 1 | HOOKS-05 | — | `react-hooks/exhaustive-deps` passes on `App.tsx:81-84` ref-updater AND tightened `App.tsx:464` leave-running cleanup with no new disable comments (per Phase 7 D-04) | lint | `npm run lint` exits 0 | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/useSessionEngine.test.tsx` — EXTEND existing file (not create — research §Code-State Verification corrected D-13 drift). Add 5-6 identity-stability tests covering HOOKS-02/03/04.
- [ ] `src/hooks/useAudioCues.test.tsx` — EXTEND existing file. Add 2-3 callback-identity tests for HOOKS-01 (reuse existing `SpyableAC` harness — no new test infra).
- [ ] Framework install: **none** — Vitest 4.1.5 + @testing-library/react 16.3.2 + jsdom already in `package.json`.
- [ ] No new App-level test file (per D-15). Existing `App.audio.test.tsx` and `App.persistence.test.tsx` cover boundary-cue exactly-once + leave-running cleanup correctness.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| (none) | — | All phase behaviors have automated verification. | — |

*All Phase 10 contracts are testable in Vitest renderHook with fake timers; no manual UAT step required.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10 s (wave gate); < 5 s (per-task quick)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
