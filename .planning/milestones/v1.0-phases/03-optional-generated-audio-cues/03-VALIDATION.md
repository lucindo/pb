---
phase: 3
slug: optional-generated-audio-cues
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-09
updated: 2026-05-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 with jsdom environment |
| **Config file** | `vite.config.ts` (test block); `vitest.setup.ts` for polyfills |
| **Quick run command** | `npm run test:run -- src/audio src/hooks/useAudioCues src/components/MuteToggle src/app/App.audio.test.tsx` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~5–15 s focused; full suite per existing baseline |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- <focused path from task's automated field>`
- **After every plan wave:** Run `npm run test:run` (full suite, including Phase 1 + Phase 2 regression)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 s focused; full suite per existing baseline

---

## Per-Task Verification Map

> Bound to PLAN.md tasks. Each row references the task's `<automated>` command.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-T1 | 03-01 | 1 | AUDI-01, AUDI-02 | T-03-02 | jsdom test polyfill safe — no production exposure | infra | `npm run test:run` | yes (after task) | planned |
| 01-T2 | 03-01 | 1 | AUDI-01 | T-03-01 | Frequency constants are module-locked, not user-controlled | unit | `npm run test:run -- src/audio/cueSynth.test.ts` | yes (after task) | planned |
| 01-T3 | 03-01 | 1 | AUDI-01 | n/a | Scheduler reads only audioCtx.currentTime (no Date.now leakage) | unit | `npm run test:run -- src/audio/lookaheadScheduler.test.ts` | yes (after task) | planned |
| 02-T1 | 03-02 | 2 | AUDI-01, AUDI-02 | T-03-03, T-03-05, T-03-06 | AC close-on-end (D-11), gesture-chain creation (D-09), silent error swallowing (D-10) | unit | `npm run test:run -- src/audio/audioEngine.test.ts` | yes (after task) | planned |
| 02-T2 | 03-02 | 2 | AUDI-01, AUDI-02 | T-03-03, T-03-04, T-03-06 | useEffect cleanup closes AC on unmount; mute state default ON; failure-path swallows error | unit (hook) | `npm run test:run -- src/hooks/useAudioCues.test.tsx` | yes (after task) | planned |
| 03-T1 | 03-03 | 3 | AUDI-02 | T-03-07 | aria-pressed + disabled attribute enforced; click suppressed when disabled | unit (RTL) | `npm run test:run -- src/components/MuteToggle.test.tsx` | yes (after task) | planned |
| 03-T2 | 03-03 | 3 | AUDI-02 | n/a | D-05 inline composition; locked Phase 1 copy preserved | unit (RTL) | `npm run test:run -- src/components/SessionControls.test.tsx` | yes (after task) | planned |
| 03-T3 | 03-03 | 3 | AUDI-01 | T-03-08 | leadInDigit prop type-narrowed to {3,2,1,null}; orb at MID_SCALE during lead-in | unit (RTL) | `npm run test:run -- src/components/BreathingShape` | partial (extends) | planned |
| 04-T1 | 03-04 | 4 | AUDI-01, AUDI-02 | T-03-09, T-03-10, T-03-11 | Gesture-chain AC creation; close on all 4 end paths; clearLeadInTimeouts on cancel | unit + integration | `npm run test:run -- src/app` | partial (extends) | planned |
| 04-T2 | 03-04 | 4 | AUDI-01, AUDI-02 | T-03-09, T-03-10, T-03-12 | Lead-in numeral progression; AC constructed on Start; AC closed on each end path; D-10 fallback render | integration | `npm run test:run -- src/app/App.audio.test.tsx` | yes (after task) | planned |
| 05-CP1 | 03-05 | 5 | AUDI-01 | n/a | Subjective bowl tuning — human listening | manual UAT | n/a | n/a | planned |
| 05-CP2 | 03-05 | 5 | AUDI-02 | n/a | D-08 fade smoothness — human listening | manual UAT | n/a | n/a | planned |
| 05-CP3 | 03-05 | 5 | AUDI-01 | n/a | D-15 tick distinctness — human listening | manual UAT | n/a | n/a | planned |
| 05-CP4 | 03-05 | 5 | AUDI-02 | T-03-12 | D-10 fallback usability — human verification with stubbed AC | manual UAT | n/a | n/a | planned |
| 05-CP5 | 03-05 | 5 | AUDI-01, AUDI-02 | n/a | iOS Safari real-device behavior (Pitfalls 6, 7) — best-effort | manual UAT | n/a | n/a | planned |
| 05-CP6 | 03-05 | 5 | AUDI-01, AUDI-02 | all T-03-* | Phase 3 acceptance checklist sign-off | manual UAT | n/a | n/a | planned |

---

## Wave 0 Requirements

All Wave 0 scaffolding is folded into Plan 01 (Wave 1) — there is no separate Wave 0 plan because the test infrastructure (`vitest.setup.ts` polyfill) and the pure synthesis modules can be developed together without circular dependency. Plan 01's Task 1 ships the AC polyfill before Task 2 / Task 3 need it.

- [x] `vitest.setup.ts` — extend with `AudioContext` stub → Plan 01 Task 1
- [x] `src/audio/audioEngine.test.ts` — covers AUDI-01 scheduling and AUDI-02 mute behavior → Plan 02 Task 1
- [x] `src/audio/cueSynth.test.ts` — covers cue construction → Plan 01 Task 2
- [x] `src/audio/lookaheadScheduler.test.ts` — covers scheduler tick logic → Plan 01 Task 3
- [x] `src/hooks/useAudioCues.test.tsx` — covers React hook lifecycle → Plan 02 Task 2
- [x] `src/components/MuteToggle.test.tsx` — covers aria-pressed + disabled → Plan 03 Task 1
- [x] `src/app/App.audio.test.tsx` — integration tests → Plan 04 Task 2

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Plan / Checkpoint |
|----------|-------------|------------|-------------------|
| Audio cues feel calm, In > Out pitch is correctly perceived | AUDI-01 | Subjective tuning of bowl timbre / partial mix / decay length | Plan 05 Checkpoint 1 |
| Mute fade-out is smooth, not jarring | AUDI-02 / D-08 | Subjective: ~150 ms perceptual fade target | Plan 05 Checkpoint 2 |
| 3-2-1 lead-in tick is clearly distinct from In/Out gongs | AUDI-01 / D-15 | Subjective: tick must NOT sound like a soft bowl cue | Plan 05 Checkpoint 3 |
| AC-failure visuals-only path is fully usable | AUDI-02 / D-10 | Cross-browser AC blocking is hard to fully simulate in CI | Plan 05 Checkpoint 4 |
| iOS Safari silent-switch effect, interrupted state on phone call | AUDI-01, AUDI-02 | Real-device-only behavior (Pitfalls 6, 7) | Plan 05 Checkpoint 5 |
| Phase 3 full acceptance checklist | AUDI-01, AUDI-02, D-* | End-to-end human sign-off | Plan 05 Checkpoint 6 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are explicit checkpoint tasks (Plan 05)
- [x] Sampling continuity: every code task has automated verify; no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — folded into Plan 01 Task 1 (vitest.setup.ts polyfill)
- [x] No watch-mode flags — every command uses `npm run test:run`
- [x] Feedback latency < 30 s on focused subset — focused command runs in ~5-15 s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready for execution
