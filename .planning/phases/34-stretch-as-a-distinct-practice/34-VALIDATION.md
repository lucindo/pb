---
phase: 34
slug: stretch-as-a-distinct-practice
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 34-XX-XX | TBD | TBD | STRETCH-01 | — | N/A | unit | `npx vitest run src/components/PracticeToggle.test.tsx` | ❌ W0 | ⬜ pending |
| 34-XX-XX | TBD | TBD | STRETCH-02 | — | N/A | unit | `npx vitest run src/components/PracticeToggle.test.tsx` | ❌ W0 | ⬜ pending |
| 34-XX-XX | TBD | TBD | STRETCH-03 | — | `coerceStretchSettings` per-field non-throwing coercion | unit | `npx vitest run src/storage/practices.test.ts` | ✅ extend | ⬜ pending |
| 34-XX-XX | TBD | TBD | STRETCH-04 | — | N/A | unit | `npx vitest run src/storage/practices.test.ts` | ✅ extend | ⬜ pending |
| 34-XX-XX | TBD | TBD | STRETCH-05 | T-30-05 | `asRecord` prototype-pollution-safe guard before named-key reads | unit | `npx vitest run src/storage/storage.test.ts` | ✅ extend | ⬜ pending |
| 34-XX-XX | TBD | TBD | STRETCH-06 | — | N/A | unit | `npx vitest run src/content/strings.test.ts` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders — the planner fills the real per-plan/per-task mapping.*

---

## Wave 0 Requirements

- [ ] `src/components/PracticeToggle.test.tsx` — stubs for STRETCH-01 (3 pills, order HRV·Stretch·Navi) and STRETCH-02 (treatment A default when `VITE_SWITCHER_TREATMENT` unset/invalid; treatment B renders glyphs)
- [ ] `src/domain/stretchSettings.test.ts` (or extend an existing settings test) — stubs for `coerceStretchSettings` per-field exhaustiveness
- [ ] Existing infrastructure (Vitest) covers all remaining phase requirements — storage/strings tests are extended in place, not newly created.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3-practice switcher stays legible and tappable at 320px in EN + PT-BR | STRETCH-02 | No automated pixel/viewport test; visual judgment | Spike 007 already validated this — re-confirm via `open .planning/spikes/007-three-practice-switcher/index.html`, then in-app at 320px viewport in both locales |
| Treatment B glyphs read correctly per practice (orb / ramp / dots) | STRETCH-02 | Visual judgment of SVG motifs | Build with `VITE_SWITCHER_TREATMENT=B`, inspect switcher in-app |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
