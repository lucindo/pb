---
phase: 9
slug: audio-wake-lock-lifecycle-hardening
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-11
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Sourced from `09-RESEARCH.md` §Validation Architecture (Nyquist Dim 8). Fix-only patch — no user-facing behavior change. Baseline assertion: 366 → ≥ 366 Vitest cases.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (project-installed per package.json) |
| **Config file** | `vitest.config.*` + `vitest.setup.ts` (`FakeAudioContext` polyfill) |
| **Quick run command** | `npm run test -- <touched-file>` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 s per touched file; ~full-suite seconds for 366+ cases |

---

## Sampling Rate

- **After every task commit:** `npm run test -- <touched-file>` (one or two files at most)
- **After every plan wave:** `npm run test` (full suite — 366 baseline + new cases)
- **Before `/gsd-verify-work`:** Full suite green; `tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run build` exit 0
- **Max feedback latency:** <30 s per task; full suite per wave merge

---

## Per-Task Verification Map

> Task IDs concretised at plan-time; this table maps REQ-ID → assertion target + contract. Planner copies row-by-row into each plan's `<verification>` block.

| REQ-ID | Plan | Wave | Test Type | Assertion Target | Contract Locked | Precedent |
|--------|------|------|-----------|------------------|-----------------|-----------|
| AUDIO-01 (race) | 02 | 2 | unit | `src/hooks/useAudioCues.test.tsx` | stop() during in-flight reconstruct → orphaned new engine `close()` called; engineRef stays null; reanchor NOT called; tracker.constructed rose by 1 | `useAudioCues.test.tsx:558-579` (D-41(c)) + `:248-289` (SlowCloseAC) |
| AUDIO-01 (counter) | 02 | 2 | unit | `src/hooks/useAudioCues.test.tsx` | `reconstructGenerationRef` bumped by stop() + unmount; second reconstruct → first bails out without assignment | same as above |
| AUDIO-02 (engine) | 01 | 1 | unit | `src/audio/audioEngine.test.ts` | `scheduleNextCue` with `audioTime < now() + SAFE_LEAD_SEC` → clamped to `now() + SAFE_LEAD_SEC`; `audioTime > now() + SAFE_LEAD_SEC` → unclamped | `audioEngine.test.ts:255-279` |
| AUDIO-02 (caller) | 02 | 2 | integration | `src/app/App.audio.test.tsx` | App boundary effect passes clamped `audioTime ≥ now() + SAFE_LEAD_SEC` to `notifyPhaseBoundary` | spy on `cueSynth.scheduleInCue/OutCue` precedent at `useAudioCues.test.tsx:154-178` |
| AUDIO-02 (constant) | 01 | 1 | unit | `src/audio/audioEngine.test.ts` | `SAFE_LEAD_SEC` named export === `0.005` | `LEAD_IN_*` precedent at `audioEngine.ts:77-80` |
| AUDIO-03 (engine) | 01 | 1 | unit | `src/audio/audioEngine.test.ts` | `scheduleLeadIn` returns `null` when engine closed | `audioEngine.test.ts:246-253` |
| AUDIO-03 (hook) | 02 | 2 | unit | `src/hooks/useAudioCues.test.tsx` | `start(plan)` resolves to `null`; status === `'failed'` when scheduleLeadIn returns null | existing start-success case at `useAudioCues.test.tsx:35-54` |
| AUDIO-04 | 01 | 1 | unit | `src/audio/cueSynth.test.ts` | osc.onended attached with `{ once: true }`; on dispatch, disconnect called exactly once on osc + partialGain (+ shared filter/envelope on last osc) | osc tracking at `cueSynth.test.ts:26-42` |
| AUDIO-05 | 02 | 2 | unit | `src/hooks/useAudioCues.test.tsx` | synthetic statechange AFTER stop() nulled engineRef → no setStatus call; no throw; audioStatus stays `'ok'` | D-41(d) at `useAudioCues.test.tsx:581-625` |
| AUDIO-06 (union) | 01 | 1 | compile-time + unit | `src/hooks/useAudioCues.test.tsx` | `AudioStatus = 'idle' \| 'lead-in' \| 'failed'`; reintroducing `'starting'` fails to compile or fails test | new pattern; Phase 8 type discrimination precedent |
| AUDIO-06 (no transient) | 02 | 2 | unit | `src/hooks/useAudioCues.test.tsx` | start() flow: status transitions `'idle' → 'lead-in'` directly; no intermediate render observes `'starting'` | start success case at `useAudioCues.test.tsx:35-54` |
| WAKELOCK-01 (concurrent) | 01 | 1 | unit | `src/hooks/useWakeLock.test.tsx` | second request() during pending first → only ONE `navigator.wakeLock.request('screen')` call | absorb-rejection precedent at `useWakeLock.test.tsx:49-67` |
| WAKELOCK-01 (release-during-await) | 01 | 1 | unit | `src/hooks/useWakeLock.test.tsx` | release() during pending request() → post-await sentinel.release() called; sentinelRef === null | Pitfall 6 unmount precedent at `useWakeLock.test.tsx:202-225` |
| WAKELOCK-01 (unmount-during-await) | 01 | 1 | unit | `src/hooks/useWakeLock.test.tsx` | unmount during pending request() → post-await sentinel released, not stored | same Pitfall 6 precedent |

*Status column (⬜ pending · ✅ green · ❌ red · ⚠️ flaky) added to each plan's per-task table at plan-time.*

---

## Wave 0 Requirements

**None** — existing test infrastructure covers all phase requirements per RESEARCH.md §Wave 0 Gaps:

- Vitest already installed.
- `vitest.setup.ts` `FakeAudioContext` polyfill supports all needed timing primitives.
- `SpyableAC` + `SlowCloseAC` scaffolding in `useAudioCues.test.tsx` reusable for AUDIO-01 (Open Question 4 resolved).
- `installTrackedAC` in `App.audio.test.tsx` supports AUDIO-02 caller-side test.
- `useWakeLock.test.tsx` `vi.spyOn(navigator.wakeLock, 'request')` infrastructure supports both concurrency tests.

No new test files. All assertions co-locate per D-14 across 5 existing files: `audioEngine.test.ts`, `cueSynth.test.ts`, `useAudioCues.test.tsx`, `useWakeLock.test.tsx`, `App.audio.test.tsx`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|

*All phase behaviors have automated verification per Validation Architecture above — Phase 9 is a fix-only patch; no user-facing surface changes that would require human-eye verification.*

---

## Validation Sign-Off

- [x] All REQ-IDs have automated verify targets mapped to existing test files (no Wave 0 dependencies)
- [x] Sampling continuity: every task commit → fast targeted test; every wave merge → full suite
- [x] Wave 0 covers all MISSING references (none — no gaps)
- [x] No watch-mode flags
- [x] Feedback latency < 30 s per task
- [ ] `nyquist_compliant: true` set in frontmatter after plan-checker confirms per-task table alignment

**Approval:** pending (set to `approved YYYY-MM-DD` after plan-checker PASS)
