---
phase: 30
slug: multi-practice-architecture-switcher
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-17
audited: 2026-05-17
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Populated from `30-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vite.config.ts` (test section — environment: jsdom, setupFiles: `./vitest.setup.ts`) |
| **Quick run command** | `npm run test:run -- src/storage/practices.test.ts src/storage/storage.test.ts` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~5 seconds (quick) / ~25 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- src/storage/practices.test.ts src/storage/storage.test.ts`
- **After every plan wave:** Run `npm run test:run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~25 seconds (full suite ceiling)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | PRACTICE-02 | T-30-01 | `isValidFrontCount` rejects non-finite / non-integer / non-multiple-of-4 (no fractional `backCount`) | unit | `npx tsc --noEmit` + grep | ✅ | ✅ green |
| 30-01-02 | 01 | 1 | PRACTICE-02 | T-30-01 / T-30-02 | NK validator suite proves 102→false (Pitfall 5 regression guard) | unit | `npm run test:run -- src/domain/naviKriyaSettings.test.ts` | ✅ | ✅ green |
| 30-02 | 02 | — | PRACTICE-01, PRACTICE-05 | — | N/A (string catalog + presentational toggle) | unit | `npm run test:run -- src/components/PracticeToggle.test.tsx` | ✅ | ✅ green |
| 30-03 | 03 | — | PRACTICE-02, PRACTICE-04 | T-30 (V5 coercer) | `coercePractices`/`coerceActivePractice`/`coerceNaviKriyaSettings` non-throwing, per-field, prototype-pollution-safe | unit | `npm run test:run -- src/storage/practices.test.ts src/storage/storage.test.ts` | ✅ | ✅ green |
| 30-04 | 04 | — | PRACTICE-03, PRACTICE-06 | T-30-10 | Cross-tab `storage` listener reads `loadPractices()` (coerced) — orphaned flat `env.stats` never zeroes display | unit | `npm run test:run -- src/components/SettingsForm.stretch.test.tsx src/app/App.persistence.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement → Test Detail

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRACTICE-01 | PracticeToggle renders two pills; clicking switches active practice | unit | `npm run test:run -- src/components/PracticeToggle.test.tsx` | ✅ |
| PRACTICE-01 | PracticeToggle passes correct `aria-pressed` | unit | same | ✅ |
| PRACTICE-02 | `loadPractices` returns coerced resonant settings from stored data | unit | `npm run test:run -- src/storage/practices.test.ts` | ✅ |
| PRACTICE-02 | `saveActivePractice` persists; `loadActivePractice` reads it back | unit | same | ✅ |
| PRACTICE-02 | `coerceNaviKriyaSettings` returns defaults for unknown input | unit | `npm run test:run -- src/domain/naviKriyaSettings.test.ts` | ✅ |
| PRACTICE-02 | `coerceNaviKriyaSettings` rounds non-multiple-of-4 `frontCount` down | unit | same | ✅ |
| PRACTICE-03 | PracticeToggle disabled when `inSessionView=true`, enabled when false | unit | `npm run test:run -- src/components/PracticeToggle.test.tsx` | ✅ |
| PRACTICE-04 | `migrateEnvelope(v1Envelope, 1)` coerces settings+stats into `practices.resonant` | unit | `npm run test:run -- src/storage/storage.test.ts` | ✅ |
| PRACTICE-04 | `readEnvelope` with v1 disk data returns `practices.resonant` populated | unit | same | ✅ |
| PRACTICE-04 | `migrateEnvelope` is idempotent on v2 data (`fromVersion=2` no-op) | unit | same | ✅ |
| PRACTICE-04 | Cross-tab `storage` event refreshes both stats slices via `loadPractices()` | unit | `npm run test:run -- src/app/App.persistence.test.tsx` | ✅ |
| PRACTICE-05 | SettingsDialog renders all shared chrome pickers (no per-practice controls) | unit | `npm run test:run -- src/components/SettingsDialog.test.tsx` | ✅ |
| PRACTICE-06 | Practice-aware SettingsForm renders resonant knobs when `practice=resonant` | unit | `npm run test:run -- src/components/SettingsForm.stretch.test.tsx` | ✅ |
| PRACTICE-06 | Practice-aware SettingsForm renders NK scaffold (empty) when `practice=naviKriya` | unit | same | ✅ |

---

## Wave 0 Requirements

Five new/extended test files — all delivered:

- [x] `src/domain/naviKriyaSettings.test.ts` — new — covers PRACTICE-02 (NK coercer inputs, validators, defaults). Created by plan 30-01 Task 2 (in-wave TDD).
- [x] `src/storage/practices.test.ts` — new — covers PRACTICE-02 (`coercePractices`, `loadPractices`, `saveActivePractice`, `resetPracticeStats`, `recordResonantSession`).
- [x] `src/components/PracticeToggle.test.tsx` — new — covers PRACTICE-01, PRACTICE-03.
- [x] `src/storage/storage.test.ts` — extended — covers PRACTICE-04 (`migrateEnvelope` v1→v2 ladder, idempotency, STATE_KEY guard).
- [x] `src/components/SettingsForm.stretch.test.tsx` — extended — covers PRACTICE-06 (practice-aware dispatch). *Plan referenced `SettingsForm.test.tsx`; execution extended the existing `SettingsForm.stretch.test.tsx` instead — same coverage, different file.*

*Vitest 4.1.5 is already installed and operational from prior phases — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual styling of PracticeToggle pills (active/inactive/disabled treatment) | PRACTICE-01, PRACTICE-03 | CSS-variable rendering and `opacity-50` disabled treatment are visual | Run dev server, switch practices, start a session, confirm toggle dims and is non-interactive in-session |
| Cross-tab stats refresh after migration | PRACTICE-04 | Multi-tab `storage` event timing | Open two tabs, complete a session in one, confirm the other tab's stats footer updates without zeroing |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (5 test files listed above)
- [x] No watch-mode flags (`test:run` is single-shot)
- [x] Feedback latency < 25s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-17

---

## Validation Audit 2026-05-17

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 6 requirements (PRACTICE-01..06) have automated, green coverage. Full suite: **1057 tests passing across 73 files**. The five Wave 0 test files were delivered (one as an extension of the existing `SettingsForm.stretch.test.tsx` rather than the plan-named `SettingsForm.test.tsx`). No gaps to fill — no auditor spawn required. Two manual-only verifications (visual pill styling, cross-tab timing) remain documented as intentionally manual.
