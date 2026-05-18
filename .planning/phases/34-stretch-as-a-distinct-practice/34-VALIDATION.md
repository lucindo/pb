---
phase: 34
slug: stretch-as-a-distinct-practice
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-18
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via `vitest/config` in `vite.config.ts`) |
| **Config file** | `vite.config.ts` (`test: { environment: 'jsdom', globals: true, setupFiles: './vitest.setup.ts' }`) |
| **Quick run command** | `npx vitest run src/storage/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/storage/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | STRETCH-03 | T-34-01 | `validateStretchSettings` fail-closed | unit | `npx vitest run src/domain/settings.test.ts` | ✅ extend | ⬜ pending |
| 34-01-02 | 01 | 1 | STRETCH-03 | T-34-01 | N/A | unit | `npx vitest run src/domain/stretchRamp.test.ts src/domain/sessionController.test.ts` | ✅ extend | ⬜ pending |
| 34-02-01 | 02 | 2 | STRETCH-05 | T-34-03 | v2→v3 step constructive, orphan-tolerant | unit | `npx vitest run src/storage/storage.test.ts src/storage/settings.test.ts` | ✅ extend | ⬜ pending |
| 34-02-02 | 02 | 2 | STRETCH-03, STRETCH-04 | T-34-02, T-34-04 | `coerceStretchSettings` + `asRecord` prototype-pollution-safe per-field coercion | unit | `npx vitest run src/storage/practices.test.ts` | ✅ extend | ⬜ pending |
| 34-03-01 | 03 | 3 | STRETCH-02 | T-34-05 | `VITE_SWITCHER_TREATMENT` strict `=== 'B'` build-time gate | build | `npx tsc --noEmit` | ✅ config | ⬜ pending |
| 34-03-02 | 03 | 3 | STRETCH-01, STRETCH-02 | T-34-05, T-34-06 | N/A | unit | `npx vitest run src/components/PracticeToggle.test.tsx` | ✅ extend | ⬜ pending |
| 34-04-01 | 04 | 3 | STRETCH-06 | T-34-07 | `LOCKED_COPY` byte-equality guard | unit | `npx vitest run src/content/strings.test.ts src/content/lockedCopy.test.ts` | ✅ extend | ⬜ pending |
| 34-05-01 | 05 | 4 | STRETCH-01, STRETCH-06 | — | N/A | unit | `npx vitest run src/components/SettingsForm.stretch.test.tsx src/components/SettingsForm.nk.test.tsx` | ✅ extend | ⬜ pending |
| 34-05-02 | 05 | 4 | STRETCH-03, STRETCH-04, STRETCH-05 | T-34-08, T-34-09, T-34-10 | slice-isolated `recordStretchSession`; coerced-settings engine path | integration | `npx vitest run src/hooks/useSessionEngine.test.tsx src/app/App.persistence.test.tsx src/app/App.session.test.tsx src/app/App.settings.test.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**No Wave 0 gaps.** Every test file in the map already exists (`PracticeToggle.test.tsx`,
`SettingsForm.stretch.test.tsx`, and all storage/domain/content/app suites) — each is extended
in place. The RESEARCH.md "Wave 0 Gaps" entries are superseded: `PracticeToggle.test.tsx`
exists, and `coerceStretchSettings` coverage is added to the existing `src/storage/practices.test.ts`
rather than a new `stretchSettings.test.ts`.

---

## Wave 0 Requirements

- [x] `src/components/PracticeToggle.test.tsx` — already exists; extended in Plan 03 Task 2 for
  STRETCH-01 (3 pills, order HRV·Stretch·Navi) and STRETCH-02 (treatment A default; treatment B glyphs).
- [x] `coerceStretchSettings` per-field exhaustiveness — covered by extending the existing
  `src/storage/practices.test.ts` in Plan 02 Task 2 (no new `stretchSettings.test.ts` needed).
- [x] Existing Vitest infrastructure covers all remaining phase requirements — storage/domain/strings/app
  tests are extended in place, not newly created.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3-practice switcher stays legible and tappable at 320px in EN + PT-BR | STRETCH-02 | No automated pixel/viewport test; visual judgment | Spike 007 already validated this — re-confirm via `open .planning/spikes/007-three-practice-switcher/index.html`, then in-app at 320px viewport in both locales |
| Treatment B glyphs read correctly per practice (orb / ramp / dots) | STRETCH-02 | Visual judgment of SVG motifs | Build with `VITE_SWITCHER_TREATMENT=B`, inspect switcher in-app |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — none exist (all test files present)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-approved 2026-05-18
