---
phase: 13
slug: inner-ring-ux-symmetry
status: approved
nyquist_compliant: partial
wave_0_complete: true
created: 2026-05-12
---

# Phase 13 — Validation Strategy

> Per-phase validation contract. WARMUP-01 routed to Manual-Only — CSS `@media (prefers-reduced-motion: reduce)` cascade is not exercisable in Vitest+jsdom. Nyquist override was accepted at plan time (see 13-01-PLAN.md `<validation_note>`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (with jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npx tsc --noEmit && npm run lint && npm run build && npm test` |
| **Estimated runtime** | ~6s (vitest) + ~5s (full gate) |

---

## Sampling Rate

- **After every task commit:** `npm test`
- **After every plan wave:** Full gate (`npx tsc --noEmit && npm run lint && npm run build && npm test`)
- **Before `/gsd-verify-work`:** Full gate must be green
- **Max feedback latency:** ~10s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-T1 | 01 | 1 | WARMUP-01 (doc rewrite) | — | ROADMAP/REQUIREMENTS/STATE prose reflects reduced-motion framing | grep-assertion (inline in PLAN) | `grep -F "the inner reference ring (\`.orb-ring--inner\`) is no longer rendered" .planning/ROADMAP.md` | ✅ inline | ✅ green |
| 13-01-T2 | 01 | 1 | WARMUP-01 (FEATURES callouts) | — | 6 append-only `[2026-05-12 update]` callouts at target lines | grep-count assertion | `[ "$(grep -c '\[2026-05-12 update\]' .planning/research/FEATURES.md)" -ge 6 ]` | ✅ inline | ✅ green |
| 13-01-T3 | 01 | 1 | WARMUP-01 (ARCHITECTURE callouts + Commit 1) | — | 5 append-only callouts + Commit 1 lands | grep-count + git log | `[ "$(grep -c '\[2026-05-12 update\]' .planning/research/ARCHITECTURE.md)" -ge 5 ] && git log -1 --pretty=%s \| grep -E "^docs\(13\)"` | ✅ inline | ✅ green |
| 13-01-T4 | 01 | 1 | WARMUP-01 (CSS suppression) | — | `.orb-ring--inner { display: none }` inside `@media (prefers-reduced-motion: reduce)` block | grep + awk slice + manual browser check | `awk '/@media \(prefers-reduced-motion: reduce\)/,/^}/' src/styles/theme.css \| grep -F ".orb-ring--inner"` (rule-presence only, not behavior) | ✅ inline | ✅ green (presence) · manual-only (behavior) |
| 13-01-T5 | 01 | 1 | WARMUP-01 (todo rename) | — | Folded todo at completed/ with rename detection | git log --name-status | `git log -1 --name-status \| grep -E "^R" \| grep -F "2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue"` | ✅ inline | ✅ green |

Existing test suite (818/818 green) continues to cover element presence in DOM (`querySelector` finds `.orb-ring--inner` unchanged — `display: none` keeps it in DOM per D-07/D-04 jsdom note):

| Pre-existing test | What it covers | Status |
|-------------------|----------------|--------|
| `src/app/App.session.test.tsx:99-108` | `shape.querySelector('[aria-hidden="true"].orb-ring--inner')` non-null | ✅ green |
| `src/components/BreathingShape.test.tsx:169-188` | Body inner-ring template (className + width/height style) | ✅ green |
| `src/components/BreathingShape.test.tsx:255-262` | Lead-in inner-ring template | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase-checkable artefacts. No new test files. No new framework install. D-11 invariant (zero net-new deps) preserved.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Under `prefers-reduced-motion: reduce`, `.orb-ring--inner` not rendered in layout in any state (Out, In, lead-in) | WARMUP-01 / ROADMAP §13 SC1 | Vitest+jsdom does not evaluate `@media (prefers-reduced-motion: reduce)` cascade for computed layout. `getComputedStyle` returns useragent defaults in jsdom; mocking `window.matchMedia` does not flow into CSS cascade. Visual regression tooling (Playwright/Storybook) is not in this project's stack (D-11: zero net-new deps). | (1) macOS: System Settings → Accessibility → Display → "Reduce motion" ON. (2) `npm run dev`. (3) Start a session. (4) Confirm: no inner reference ring visible during Out phase, In phase, or 3-2-1 lead-in countdown. (5) Confirm: `.orb-layer--out` opacity crossfade still transitions between phases (D-07 invariant). (6) Toggle reduce-motion OFF, restart session, confirm Out-phase inner-ring fade-in is pixel-identical to v1.0.1 baseline (SC2 invariant). |
| `display: none` keeps element in DOM (screen-reader semantics unchanged) | WARMUP-01 secondary | DOM-presence check is jsdom-covered (see existing tests above); ARIA-hidden semantics are static. | Manual SR sweep optional — `aria-hidden="true"` is already set on the element by the render path; no new ARIA surface introduced. |

---

## Validation Sign-Off

- [x] All tasks have inline grep/awk/git-log `<automated>` verify (per PLAN Tasks 1-5 acceptance criteria) — verified PASS by gsd-verifier (13-VERIFICATION.md, 13/13 must-haves)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has at least one grep-assertion)
- [x] Wave 0 covers all MISSING references — N/A (no new test files needed)
- [x] No watch-mode flags
- [x] Feedback latency < 30s (full gate ~10s)
- [x] Pre-existing test baseline (818/818) preserved across all three commits
- [ ] `nyquist_compliant: true` — set to `partial`: WARMUP-01 behavior under reduced motion is manual-only (CSS @media branch not jsdom-testable). Rule presence is automated; visual behavior requires browser. Nyquist override accepted at plan time per 13-01-PLAN.md `<validation_note>`.

**Approval:** approved 2026-05-12 (partial — manual-only branch documented; user accepted Nyquist override at plan time)
