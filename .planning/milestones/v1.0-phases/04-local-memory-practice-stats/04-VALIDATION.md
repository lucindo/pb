---
phase: 4
slug: local-memory-practice-stats
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + @testing-library/react 16.3.2 + jsdom 29.1.1 |
| **Config file** | `vitest.config.ts`; setup at `vitest.setup.ts` (no changes required — jsdom localStorage is functional) |
| **Quick run command** | `npx vitest run --changed` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~15 seconds (full suite, current size) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --changed`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Populated as plans are written. Source for each row: `04-RESEARCH.md` § Validation Architecture → "Phase Requirements → Test Map".

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| LOCL-01 | Settings restored on mount | unit | `vitest run src/storage/settings.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-01 | Mute restored on mount | unit | `vitest run src/storage/settings.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-01 | Per-field validate-and-fallback (D-15) | unit | `vitest run src/storage/settings.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-01 | App-level integration: restored steppers + mute icon | integration | `vitest run src/app/App.persistence.test.tsx` | ❌ W0 | ⬜ pending |
| LOCL-01 | Silent absorb on read failure (D-17) | unit | `vitest run src/storage/storage.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-01 | Silent absorb on write failure (D-16) | unit | `vitest run src/storage/storage.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-02 | recordSession threshold (D-01: ≥30s OR complete) | unit | `vitest run src/storage/stats.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-02 | totalElapsedSeconds aggregation (D-02) | unit | `vitest run src/storage/stats.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-02 | Last-session date+duration format (D-05/D-07) | unit | `vitest run src/storage/format.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-02 | Total-minutes 60-min boundary (D-06) | unit | `vitest run src/storage/format.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-02 | Footer hidden when totalSessions=0 (D-09) | component | `vitest run src/components/StatsFooter.test.tsx` | ❌ W0 | ⬜ pending |
| LOCL-02 | Footer hidden during inSessionView (D-10) | integration | `vitest run src/app/App.persistence.test.tsx` | ❌ W0 | ⬜ pending |
| LOCL-02 | App-level stats accumulator: complete + manual end + cancel-lead-in | integration | `vitest run src/app/App.persistence.test.tsx` | ❌ W0 | ⬜ pending |
| LOCL-02 | No double-write across cleanup effect + confirmEnd | integration | `vitest run src/app/App.persistence.test.tsx` | ❌ W0 | ⬜ pending |
| LOCL-03 | resetStats wipes stats only (D-11) | unit | `vitest run src/storage/stats.test.ts` | ❌ W0 | ⬜ pending |
| LOCL-03 | ResetStatsDialog default focus on Keep (D-12) | component | `vitest run src/components/ResetStatsDialog.test.tsx` | ❌ W0 | ⬜ pending |
| LOCL-03 | Reset link 44×44 hit area (D-13) | component | `vitest run src/components/StatsFooter.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/storage/storage.test.ts` — silent-fallback envelope read/write failure paths
- [ ] `src/storage/settings.test.ts` — coerceSettings + load/save + per-field fallback
- [ ] `src/storage/stats.test.ts` — recordSession + threshold + resetStats
- [ ] `src/storage/format.test.ts` — formatTotalMinutes / formatLastSession / formatSessionCount
- [ ] `src/components/StatsFooter.test.tsx` — gating, copy, 44×44 hit area
- [ ] `src/components/ResetStatsDialog.test.tsx` — copy, default focus, Esc cancel, backdrop close
- [ ] `src/app/App.persistence.test.tsx` — integration: restore on mount, record on each end path, no double-write, reset clears

*No `vitest.setup.ts` change required — jsdom localStorage is functional; per-test `beforeEach(() => localStorage.clear())` enforces isolation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings + mute restored across browser reload | LOCL-01 | jsdom does not persist localStorage across vitest processes; cross-reload behavior validated under unit + integration but real-browser confirmation is the smoke test | Open app → change BPM/ratio/duration/mute → close tab → reopen → assert all four restored |
| Stats footer reflects completed session in real browser | LOCL-02 | Validates layout + responsive 44×44 hit area at real viewport sizes | Run a full timed session → assert footer appears with `1 session · N min total` and `Last: <today>` |
| Reset clears stats footer in real browser | LOCL-03 | Validates dialog focus + Esc-to-cancel + reset wipes UI | Click Reset → confirm via dialog → assert footer disappears; settings remain intact |
| Storage failure silent fallback | LOCL-01 (D-16/D-17) | Validates calm UX under Safari Private Browsing and quota-exceeded paths in a real browser | Test in Safari Private Browsing → assert app loads with defaults, no banner/toast |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
