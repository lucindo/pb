---
phase: 33
slug: close-gap-practice-02-resonant-settings-read-write-split-brain
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 33 — Validation Strategy

_Backfilled retroactively for Phase 33 (shipped 2026-05-19). Frontmatter `created: 2026-05-20` reflects backfill date; the audited code surface is the Phase 33 implementation present in `main`._

> Per-phase validation contract. Phase 33 was a one-plan gap-closure phase (PRACTICE-02) re-targeting the resonant-settings **read** path from the dead flat `env.settings` field to the per-practice `practices.resonant.settings` envelope, removing the dead `loadSettings`/`saveSettings` functions, and locking the fix with two regression tests (fresh-v2 user, v1-migrated user). This VALIDATION.md regenerates the Nyquist coverage table from the PLAN's six must-have truths and confirms each maps to at least one surviving Vitest assertion in current `main`. No gap-filling was required.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (with jsdom) |
| **Config file** | `vite.config.ts` (`test: { environment: 'jsdom', globals: true, setupFiles: './vitest.setup.ts' }`) |
| **Quick run command** | `npx vitest run src/app/App.persistence.test.tsx src/storage/settings.test.ts src/storage/stats.test.ts` |
| **Full suite command** | `npx tsc --noEmit && npm run lint && npm run build && npm test` |
| **Estimated runtime** | ~12 seconds (quick) / ~30 seconds (full gate at Phase 33 ship time) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/app/App.persistence.test.tsx src/storage/settings.test.ts src/storage/stats.test.ts`
- **After every plan wave:** Full gate (`npx tsc --noEmit && npm run lint && npm run build && npm test`)
- **Before `/gsd-verify-work`:** Full gate must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-01-T1 | 01 | 1 | PRACTICE-02 (D-01 read-path retarget) | — | `coercePractices` chain preserved at the seam (`coercePracticeSlice` → `coerceSettings` → readonly allow-list validation per Phase 12 HYGIENE-02) | unit + integration | `npx vitest run src/app/App.persistence.test.tsx -t "PRACTICE-02"` (two cases: fresh-v2 and v1-migrated) | ✅ extend | ✅ green |
| 33-01-T2 | 01 | 1 | PRACTICE-02 (D-02 dead-code removal) | — | Removing `loadSettings`/`saveSettings` eliminates a dead-but-callable read path that could re-introduce the split-brain on a future regression | unit + grep-assertion | `! grep -rqE 'loadSettings\|saveSettings' src/` (zero matches in current main) | ✅ inline | ✅ green |
| 33-01-T3 | 01 | 1 | PRACTICE-02 (D-03 dependent-test rework) | — | N/A | unit | `npx vitest run src/storage/settings.test.ts src/storage/stats.test.ts` (post-rework: settings.test.ts cases use `coerceSettings`/`coerceMute`/`loadMute`/`saveMute` only; stats.test.ts cases use `saveResonantSettings`/`loadPractices` from `./practices`) | ✅ extend | ✅ green |
| 33-01-T4 | 01 | 1 | PRACTICE-02 (D-04 v1-migrated user — stale-flat carve-out) | — | N/A — read path now ignores the dead flat `env.settings`; coercion ladder owns the source of truth | integration | `npx vitest run src/app/App.persistence.test.tsx -t "v1-migrated user with stale flat env.settings"` (asserts `practices.resonant.settings.bpm` value wins over flat `env.settings.bpm`) | ✅ extend | ✅ green |
| 33-01-T5 | 01 | 1 | PRACTICE-02 (D-05 regression-test coverage) | — | N/A | integration | `npx vitest run src/app/App.persistence.test.tsx -t "PRACTICE-02 — resonant settings survive remount"` (real `<App />` remount via `render` — covers both fresh-v2 and v1-migrated scenarios) | ✅ extend | ✅ green |
| 33-01-T6 | 01 | 1 | PRACTICE-02 (D-06 test-file colocation) | — | N/A | grep-assertion + Vitest run | `grep -nE "describe\('PRACTICE-02" src/app/App.persistence.test.tsx` (presence at line 484 — the canonical persistence test file, alongside the existing Phase 30/31 persistence coverage) | ✅ extend | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Coverage confirmed against current `main` (2026-05-20 backfill audit):**

- `src/app/App.tsx:120` — read path uses `loadPractices().resonant.settings` (or the equivalent `initialPractices.resonant.settings` useMemo seed per the PLAN's D-01 wording).
- `src/storage/settings.ts` — exports only `coerceSettings`/`coerceMute`/`loadMute`/`saveMute`; no `loadSettings`/`saveSettings` declarations. `grep -rn 'loadSettings\|saveSettings' src/` returns zero matches.
- `src/app/App.persistence.test.tsx:484` — `describe('PRACTICE-02 — resonant settings survive remount', ...)` block with two `it` cases (fresh-v2 user, v1-migrated user) using `seedV2Envelope` helper and `render(<App />)` remount assertions.
- `src/storage/practices.test.ts:131` and `:190` — pre-existing PRACTICE-02 coverage on the write path (`describe('coercePractices (PRACTICE-02 / T-30-05)')` and `describe('per-practice round-trips (PRACTICE-02)')`) ensures the storage seam continues to round-trip the resonant-settings slice losslessly.
- `33-VERIFICATION.md` (executed 2026-05-18 by gsd-verifier) scored 6/6 must-haves verified, all artifacts substantive, both key links wired, full Vitest suite green at 1154/1154 (post-Phase 33 baseline). The backfill audit corroborates each row against current `main` (Vitest baseline now 1255/1255 after subsequent v1.5 phases).

---

## Wave 0 Requirements

No Wave 0 gaps. Phase 33 was a gap-closure phase landing on the v1.5 test infrastructure (Vitest + jsdom + `seedV2Envelope` helper already in `src/app/App.persistence.test.tsx`). All three modified test files (`App.persistence.test.tsx`, `settings.test.ts`, `stats.test.ts`) and the two read-only `practices.test.ts` round-trip coverage tests were already in place; Phase 33 extended each in lockstep with the source-code edits. D-11 milestone invariant (zero net-new runtime deps) preserved.

---

## Manual-Only Verifications

No manual-only verifications required. Phase 33's deliverable is observably code-level: read-path retarget, dead-symbol removal, regression-test addition. Each must-have truth maps to a Vitest assertion or a grep contract.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| (none) | — | — | — |

---

## Validation Sign-Off

- [x] All tasks have automated `<verify>` (grep-assertion or Vitest assertion)
- [x] Sampling continuity: every must-have truth has at least one automated check (no 3 consecutive without verify)
- [x] Wave 0 covers all MISSING references — N/A (all test files pre-existed)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] Pre-existing test baseline (1153 → 1154 → 1255) preserved across the v1.5 wave per Phase 7 D-09 per-commit green-gate invariant
- [x] `nyquist_compliant: true` set in frontmatter — every must-have truth maps to a surviving automated check

**Approval:** verified 2026-05-20 (backfill — every Phase 33 must-have truth confirmed against the current `main` code surface; no gap-filling required, no test file added during this backfill audit)
