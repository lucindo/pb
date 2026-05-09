---
phase: 3
slug: optional-generated-audio-cues
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 with jsdom environment |
| **Config file** | `vite.config.ts` (test block); `vitest.setup.ts` for polyfills |
| **Quick run command** | `npm run test:run -- src/audio src/hooks/useAudioCues src/components/MuteToggle` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~5–15 s focused; full suite per existing baseline |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- src/audio src/hooks/useAudioCues src/components/MuteToggle`
- **After every plan wave:** Run `npm run test:run` (full suite, including Phase 1 + Phase 2 regression)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 s focused; full suite per existing baseline

---

## Per-Task Verification Map

> Populated by planner during PLAN.md generation. Each task gets a row binding `task_id`, `req`, `threat_ref`, `secure_behavior`, and `automated` command. Wave 0 tasks marked `❌ W0`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _populated by planner_ | | | | | | | | | |

---

## Wave 0 Requirements

- [ ] `vitest.setup.ts` — extend with `AudioContext` stub (per RESEARCH Pattern: "Polyfill AudioContext in vitest.setup.ts")
- [ ] `src/audio/audioEngine.test.ts` — covers AUDI-01 scheduling and AUDI-02 mute behavior
- [ ] `src/audio/cueSynth.test.ts` — covers cue construction (oscillator count, frequency values, envelope params asserted on the stub)
- [ ] `src/audio/lookaheadScheduler.test.ts` — covers scheduler tick logic with controllable `currentTime`
- [ ] `src/hooks/useAudioCues.test.tsx` — covers React hook lifecycle, AC failure path, mute prop reactivity
- [ ] `src/components/MuteToggle.test.tsx` — covers `aria-pressed`, disabled-when-AC-failed, click toggles state
- [ ] `src/app/App.audio.test.tsx` — covers integration: lead-in numerals visible, AC created on Start click, AC closed on each end path, end-during-lead-in cancels cleanly

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio cues feel calm, In > Out pitch is correctly perceived, fade-out is not jarring | AUDI-01, AUDI-02 | Subjective tuning of bowl timbre / partial mix / decay length | Start a 4-min session with audio on, listen to 5+ phase boundaries; mute mid-cue; verify fade is smooth, not abrupt; verify In sits perceptually higher than Out |
| iOS Safari behavior: silent-switch effect, interrupted state on phone call | AUDI-01, AUDI-02 | Real-device-only behavior (silent switch, audio interruption) | iPhone Safari: start session, flip silent switch — confirm session keeps running visually; place a phone call mid-session — confirm session timing is unaffected on resume |
| 3-2-1 lead-in numerals + ticks feel coherent and distinct from In/Out gongs | AUDI-01 | Subjective: tick must be clearly distinguishable from bowl cues (D-15) | Start session with audio on; verify tick at each numeral does NOT sound like a soft bowl cue |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30 s on focused subset
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
