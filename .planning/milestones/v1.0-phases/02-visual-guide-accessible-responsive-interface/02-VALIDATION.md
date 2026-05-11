---
phase: 2
slug: visual-guide-accessible-responsive-interface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 + @testing-library/react 16.3.2 (jsdom 29.1.1) |
| **Config file** | `vitest.config.ts`, setup at `vitest.setup.ts` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD — populated by planner | — | — | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*The planner fills the table from research's Validation Architecture section. Each row maps to a requirement (GUID-01..04, MOBL-01) plus the SESS-05 regression for D-13 (modal does not pause clock).*

---

## Wave 0 Requirements

- [ ] `vitest.setup.ts` — extend with `HTMLDialogElement.prototype.show/showModal/close` polyfills (jsdom 29 gap)
- [ ] `vitest.setup.ts` — extend with `window.matchMedia` mock for `prefers-reduced-motion`
- [ ] `src/hooks/usePrefersReducedMotion.ts` — new hook scaffold + test stub
- [ ] `src/components/EndSessionDialog.tsx` — new component scaffold + test stub
- [ ] `src/app/App.dialog.test.tsx` — new test file scaffold

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reduced-motion crossfade timing feels calm (not abrupt) | GUID-03 | Subjective UX call within 300–500ms band; jsdom cannot judge perceptual smoothness | Toggle OS reduced-motion, run timed session, verify In→Out transition is a soft crossfade (not a snap) and orb stays at fixed mid-size |
| 44×44 hit areas comfortable on real mobile | GUID-04, MOBL-01 | Touch ergonomics need a real device; pixel assertions verify size but not feel | Open practice surface on phone, tap stepper +/- buttons one-handed, confirm no mis-taps |
| Above-the-fold orb + End session on mobile (D-16/D-19) | MOBL-01 | Viewport heights vary across real devices | Run timed session on iPhone SE / mid-Android, confirm orb and End session button visible without scroll |
| Color contrast and pastel palette feels calm in light theme | GUID-04 (D-20, D-21) | Subjective brand feel + contrast tuning | Visual sweep in Chrome + Safari + iOS Safari |
| Focus-visible ring readability on theme background | GUID-04 (D-21) | Subjective ring-vs-background contrast within calm palette | Tab through controls, confirm ring is clearly visible but not jarring |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
