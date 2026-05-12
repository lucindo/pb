---
phase: 10
slug: hooks-identity-effect-hygiene
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
verified: 2026-05-12
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
| 10-01-01 | 01 | 1 | HOOKS-03 | — | `currentFrame` `===` stable across renders within same `cycleIndex:phase` | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "currentFrame identity is stable"` | ✅ | ✅ green |
| 10-01-02 | 01 | 1 | HOOKS-03 | — | `currentFrame` identity changes at phase boundary | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "currentFrame identity changes"` | ✅ | ✅ green |
| 10-01-03 | 01 | 1 | HOOKS-03 | — | `liveFrame` identity new per rAF; `liveFrame.phaseProgress` advances within a phase | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "liveFrame"` | ✅ | ✅ green |
| 10-01-04 | 01 | 1 | HOOKS-04 | Resource exhaustion (DoS) — uncancelled rAF callback | rAF tick after teardown is a no-op (no setState observed) | unit (renderHook + unmount + advanceTimersByTime) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "rAF cancel-guard"` | ✅ | ✅ green (hardened by Plan 10-02 WR-01: positive console.error absence assertion + mockRestore) |
| 10-01-05 | 01 | 1 | HOOKS-02 | Tampering (stale-closure data integrity) | `runningSnapshotRef.current` populated while running; nulled per cleanup contract | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "runningSnapshotRef"` | ✅ | ✅ green (engine-owned writer in setState updater per Pitfall 1 resolution) |
| 10-02-01 | 01 | 1 | HOOKS-01 | DoS — identity churn render explosion | `start` callback identity stable across `setMuted(true)` toggle | unit (renderHook ref-equality) | `npx vitest run src/hooks/useAudioCues.test.tsx -t "start callback identity is stable"` | ✅ | ✅ green |
| 10-02-02 | 01 | 1 | HOOKS-01 | — | `reconstructEngine` identity stable across setMuted (via `resume` round-trip proxy) | unit (renderHook ref-equality) | `npx vitest run src/hooks/useAudioCues.test.tsx -t "resume callback.+stable"` | ✅ | ✅ green |
| 10-03-01 | 01 | 1 | HOOKS-02 | — | App leave-running cleanup fires once per status-transition-out-of-running (NOT per rAF); reads `session.liveFrame` for elapsed math (post-CR-01 fix) | integration (App-level) — D-15 boundary-cue exactly-once tests indirectly lock the cadence | `npm run test -- --run` (existing `App.audio.test.tsx` + `App.persistence.test.tsx`) | ✅ | ✅ green (CR-01 regression test added at App.audio.test.tsx:616-763) |
| 10-03-02 | 01 | 1 | HOOKS-05 | — | `react-hooks/exhaustive-deps` passes on `App.tsx:81-84` ref-updater AND tightened leave-running cleanup with no new disable comments (per Phase 7 D-04) | lint | `npm run lint` exits 0 | ✅ | ✅ green (deps `[session.liveFrame]` post-CR-01) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/hooks/useSessionEngine.test.tsx` — EXTENDED with 5-6 identity-stability tests covering HOOKS-02/03/04 + Plan 10-02 cancel-guard hardening.
- [x] `src/hooks/useAudioCues.test.tsx` — EXTENDED with callback-identity tests for HOOKS-01 (reused `SpyableAC` harness).
- [x] Framework install: **none required** — Vitest 4.1.5 + @testing-library/react 16.3.2 + jsdom already in `package.json`.
- [x] No new App-level test file (per D-15). `App.audio.test.tsx` covers boundary-cue exactly-once + Plan 10-02 CR-01 regression at lines 616-763.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| (none) | — | All phase behaviors have automated verification. | — |

*All Phase 10 contracts are testable in Vitest renderHook with fake timers; no manual UAT step required.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10 s (wave gate); < 5 s (per-task quick)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-12

---

## Validation Audit 2026-05-12

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Retroactive audit at HEAD (commit 172f1eb). Phase 10 shipped per 10-VERIFICATION.md (status: passed after re-verification — prior 4/5 gaps_found flipped to 5/5 via Plan 10-02 CR-01/WR-01/WR-02 closures). All 5 HOOKS-* REQ-IDs satisfied. 381 → 391 baseline + 1 CR-01 regression test. Real-iPhone human UAT confirmed pre-Phase-10 baseline match (10-HUMAN-UAT.md status: passed). Full suite at HEAD: 400/400. nyquist_compliant flipped true; status flipped verified.
