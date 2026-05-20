---
phase: 31
slug: navi-kriya-engine-session
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-17
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest` npm dependency; `npm run test` -> `vitest run`) |
| **Config file** | `vite.config.ts` (`test.environment: 'jsdom'`, `setupFiles: 'vitest.setup.ts'`) |
| **Quick run command** | `npx vitest run src/hooks/useNKEngine.test.tsx src/audio/nkCueSynth.test.ts src/storage/practices.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~25 seconds full suite |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (engine + cues + storage).
- **After every plan wave:** Run `npx vitest run` (full suite).
- **Before `/gsd-verify-work`:** Full suite must be green + `npx tsc --noEmit` clean + `npm run build` succeeds.
- **Max feedback latency:** ~25 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | NK-01,02,03,06,07 | T-31-01..03 | Settings coerced upstream; timer cancelled on unmount | unit (RED scaffold) | `npx vitest run src/hooks/useNKEngine.test.tsx` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | NK-01,02,03,06,07 | T-31-02 / T-31-03 | clearTimeout on cleanup; per-tick values from ref | unit | `npx vitest run src/hooks/useNKEngine.test.tsx` | ✅ (after 31-01-01) | ⬜ pending |
| 31-02-01 | 02 | 1 | NK-05 | T-31-04 | — | unit (RED scaffold) | `npx vitest run src/audio/nkCueSynth.test.ts` | ❌ W0 | ⬜ pending |
| 31-02-02 | 02 | 1 | NK-05, NK-06 | T-31-04 | Nodes disconnect on 'ended' — no leak | unit | `npx vitest run src/audio/nkCueSynth.test.ts` | ✅ (after 31-02-01) | ⬜ pending |
| 31-03-01 | 03 | 1 | NK-08 | T-31-06..08 | Non-throwing per-field coercion; naviKriya slice only | unit | `npx vitest run src/storage/stats.test.ts src/storage/practices.test.ts` | ✅ exists (add cases) | ⬜ pending |
| 31-03-02 | 03 | 1 | NK-08 | T-31-06 | roundsCompleted coerced; resonant render unbroken | unit | `npx vitest run src/components/StatsFooter.test.tsx` | ✅ exists (add cases) | ⬜ pending |
| 31-04-01 | 04 | 1 | NK-09 | — | — | unit (type-clean) | `npx vitest run src/content` | ✅ exists | ⬜ pending |
| 31-04-02 | 04 | 1 | NK-09 | T-31-09,10 | React escapes all text; no hard-coded copy | unit | `npx vitest run src/components/NKSessionReadout.test.tsx` | ❌ W0 | ⬜ pending |
| 31-04-03 | 04 | 1 | NK-09 | T-31-09,10 | Static fallback under reduced-motion | unit | `npx vitest run src/components/NKShape.test.tsx` | ❌ W0 | ⬜ pending |
| 31-05-01 | 05 | 2 | NK-02,03,04,06 | T-31-11,12 | Front-count options pre-filtered to multiples of 4 | unit | `npx vitest run src/components/SettingsForm.nk.test.tsx` | ❌ W0 | ⬜ pending |
| 31-06-01 | 06 | 3 | NK-08 | — | Additive, non-breaking dialog extension | unit | `npx vitest run src/components/EndSessionDialog.test.tsx` | ✅ exists (add cases) | ⬜ pending |
| 31-06-02 | 06 | 3 | NK-01,05,07,08,09 + CR-01 | T-31-13..16 | Timers cancelled; CR-01 write path; resonant stats isolated | integration | `npx vitest run src/app/App.session.test.tsx src/app/App.persistence.test.tsx` | ✅ exists (add cases) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

New test files created as the FIRST task of their plan (RED before GREEN):

- [ ] `src/hooks/useNKEngine.test.tsx` — covers NK-01, NK-02, NK-03, NK-06, NK-07 (plan 01 Task 1)
- [ ] `src/audio/nkCueSynth.test.ts` — covers NK-05 + the NK-06 tick (plan 02 Task 1)
- [ ] `src/components/NKSessionReadout.test.tsx` — covers NK-09 readout display (plan 04 Task 2)
- [ ] `src/components/NKShape.test.tsx` — covers NK-09 shape display + reduced-motion fallback (plan 04 Task 3)
- [ ] `src/components/SettingsForm.nk.test.tsx` — covers NK-02/03/04/06 controls (plan 05 Task 1)

Existing files extended with NK cases (no Wave 0 scaffold needed — files already exist):
`src/storage/stats.test.ts`, `src/storage/practices.test.ts`, `src/components/StatsFooter.test.tsx`,
`src/components/EndSessionDialog.test.tsx`, `src/app/App.session.test.tsx`, `src/app/App.persistence.test.tsx`.

No framework install required — Vitest + JSDOM + @testing-library/react are already configured.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cue sounds are audibly distinct and pleasant through each timbre | NK-05 | Audio quality is a perceptual judgement; automated tests verify a `CueHandle` is returned and scheduling is correct, not subjective sound quality | Run a session with each timbre (Bowl/Bell/Sine/Chime); confirm front marker rises, back marker falls, tick is unobtrusive, end chord resolves restfully |
| The per-OM scale pulse feels calm (not jarring) | NK-09 / D-04 | Animation feel is perceptual | Run a session; confirm the shape pulses gently per OM with no expanding ring; toggle OS reduced-motion and confirm the shape holds static while the count still updates |
| Settle delay feels right (~3-5 s) before the first OM | D-11 | Timing comfort is a perceptual judgement | Start a session; confirm a brief quiet settle then the front marker then the first count, with no 3-2-1 countdown |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (5 new test files scaffolded as plan Task 1s)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
