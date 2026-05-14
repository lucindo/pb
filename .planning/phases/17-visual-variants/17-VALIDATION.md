---
phase: 17
slug: visual-variants
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-14
approved: 2026-05-14
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (jsdom env) + TS + ESLint + Vite build |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` |
| **Estimated runtime** | ~25–40 seconds (full); ~8–12 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run` (per-commit green-gate D-17)
- **After every plan wave:** Run `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green on all 5 palettes (Light / Dark / Moss / Slate / Dusk) — THEME-05 contrast guard carries forward
- **Max feedback latency:** ~40 seconds

---

## Per-Task Verification Map

> Populated by `gsd-planner` post-revision. Plans 02–05 use TDD-per-task: each plan creates its component AND its test file within the same commit, so a strict "Wave 0 = test stubs only" separation does not apply. The `<automated>` verify command on each task IS the sampling primitive.

| Task ID    | Plan  | Wave | Requirement | Threat Ref | Secure Behavior | Test Type        | Automated Command | File Exists | Status     |
|------------|-------|------|-------------|------------|-----------------|------------------|-------------------|-------------|------------|
| 17-01-01   | 17-01 | 1    | VARIANT-02 / VARIANT-04 (carry) | — | `.shape-marker--*` rename across theme.css + BreathingShape.tsx; reduced-motion `display: none` rule survives | grep-gate + build | `grep -nE "orb-ring--(outer\|inner)" src/styles/theme.css src/components/BreathingShape.tsx ; test $? -ne 0` | ✅ | ⬜ pending |
| 17-01-02   | 17-01 | 1    | VARIANT-02 / VARIANT-04 (carry) | — | Test selectors track the rename; full suite green at commit boundary | grep-gate + suite | `grep -nE "orb-ring--(outer\|inner)" src/components/BreathingShape.test.tsx src/app/App.session.test.tsx ; test $? -ne 0 && npm test -- --run` | ✅ | ⬜ pending |
| 17-02-01   | 17-02 | 2    | VARIANT-02 (carry — extraction prep) | — | shapeConstants module exports MIN/MAX/MID with sync-with-css comment | tsc-gate | `npx tsc --noEmit` | ✅ (after task) | ⬜ pending |
| 17-02-02   | 17-02 | 2    | VARIANT-02 / VARIANT-05 | — | OrbShape Body + LeadIn byte-identical to pre-Plan-02 BreathingShape (modulo data-variant='orb' + class rename) | tsc + lint + suite | `npx tsc --noEmit && npm run lint && npm test -- --run` | ✅ (after task) | ⬜ pending |
| 17-02-03   | 17-02 | 2    | VARIANT-02 / VARIANT-05 | — | Body + LeadIn + WR-03 structural contract migrated to OrbShape.test.tsx; BreathingShape becomes pass-through | unit + integration | `npm test -- --run OrbShape BreathingShape && npx tsc --noEmit && npm run lint` | ✅ (after task) | ⬜ pending |
| 17-03-01   | 17-03 | 3    | VARIANT-01 / VARIANT-04 / VARIANT-05 | — | SquareShape renders + scale interp + reduced-motion crossfade + lead-in | unit | `npm test -- --run SquareShape` | ✅ (after task) | ⬜ pending |
| 17-03-02   | 17-03 | 3    | VARIANT-01 / VARIANT-04 / VARIANT-05 | — | RingShape renders + scale interp + radial-gradient hollow center + reduced-motion + lead-in | unit | `npm test -- --run RingShape` | ✅ (after task) | ⬜ pending |
| 17-03-03   | 17-03 | 3    | VARIANT-01 / VARIANT-04 | — | `[data-variant='square'\|'ring']` CSS overrides land; THEME-05 + THEME-UI-01 guards stay green | guard suite + build | `npm test -- --run theme.contrast theme.no-hardcoded-classes && npx tsc --noEmit && npm run build` | ✅ (after task) | ⬜ pending |
| 17-04-01   | 17-04 | 2    | VARIANT-01 / VARIANT-07 | — | useVariantChoice 4-step write pipeline; envelope-merge + CustomEvent dispatch shape; setVariant identity stable | unit | `npm test -- --run useVariantChoice` | ✅ (after task) | ⬜ pending |
| 17-04-02   | 17-04 | 2    | VARIANT-07 | — | useVisualVariant cross-tab + same-tab listeners; D-16 no global write; no matchMedia | unit | `npm test -- --run useVisualVariant` | ✅ (after task) | ⬜ pending |
| 17-05-01   | 17-05 | 4    | VARIANT-02 | — | BreathingShape 3-way dispatcher with `variant?` prop defaulting to 'orb'; idle null-return preserved | unit | `npm test -- --run BreathingShape && npx tsc --noEmit && npm run lint && npm run build` | ✅ (after task) | ⬜ pending |
| 17-05-02   | 17-05 | 4    | VARIANT-01 / VARIANT-06 | — | VariantPicker radiogroup with inline shape swatches; 44×44 hit area + focus-visible; savePrefs round-trip | unit | `npm test -- --run VariantPicker` | ✅ (after task) | ⬜ pending |
| 17-06-01   | 17-06 | 5    | VARIANT-03 / VARIANT-07 | — | useVisualVariant + sessionVariantRef wired into App.tsx (3 ref-write sites); VARIANT-03 capture-at-start integration | integration + suite | `npm test -- --run App.session && npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` | ✅ (after task) | ⬜ pending |
| 17-06-02   | 17-06 | 5    | VARIANT-01 / VARIANT-04 (operator) | — | Operator UAT — variant rendering, picker UX, per-palette aesthetic, reduced-motion, cross-tab capture-at-Start | manual checkpoint | manual (see §Manual-Only Verifications) | n/a | ⬜ pending |
| 17-06-03   | 17-06 | 5    | VARIANT-01..07 (close-out) | — | Phase close — VARIANT-01..07 flipped to Done in REQUIREMENTS.md; ROADMAP + STATE updated; 17-SUMMARY created | close-out gate | `grep -cE "VARIANT-(0[1-7]) \| Phase 17 \| Done" .planning/REQUIREMENTS.md ; grep -c "^- \[x\] \*\*Phase 17:" .planning/ROADMAP.md ; ls -la .planning/phases/17-visual-variants/17-SUMMARY.md && npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` | ✅ (after task) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Plans 02–05 use TDD-per-task: production code AND test file land in the same commit (e.g. Plan 02 Task 3 creates `OrbShape.test.tsx` alongside the migrated body). The classical Wave-0-stub-only separation does not apply here; each line below is marked `n/a — TDD per task within plan` and points to the plan/task that creates the test file.

- [x] `src/components/OrbShape.test.tsx` — n/a — TDD per task within plan (created in Plan 02 Task 3; migrates Body + LeadIn + WR-03 structural contract from BreathingShape.test.tsx)
- [x] `src/components/SquareShape.test.tsx` — n/a — TDD per task within plan (created in Plan 03 Task 1 with VARIANT-01/04/05 coverage: scale interp, reduced-motion fixed-mid, leadInDigit, `data-variant='square'`)
- [x] `src/components/RingShape.test.tsx` — n/a — TDD per task within plan (created in Plan 03 Task 2 with VARIANT-01/04/05 coverage: scale interp, reduced-motion, leadInDigit, `data-variant='ring'`)
- [x] `src/components/BreathingShape.test.tsx` — n/a — slimmed in Plan 02 Task 3 (dispatcher-level smoke only); extended in Plan 05 Task 1 with full 3-way dispatch coverage + default-to-orb
- [x] `src/components/VariantPicker.test.tsx` — n/a — TDD per task within plan (created in Plan 05 Task 2 with VARIANT-01/06 coverage: radiogroup, disabled gating, swatch render, savePrefs + dispatch, 44×44 + focus-visible)
- [x] `src/hooks/useVisualVariant.test.ts` — n/a — TDD per task within plan (created in Plan 04 Task 2 with VARIANT-07 coverage: cross-tab `'storage'`, same-tab `'hrv:prefs-changed'` filtered on `detail.key === 'variant'`, no global attribute write, no matchMedia)
- [x] `src/app/App.session.test.tsx` — n/a — extended in Plan 06 Task 1 with VARIANT-03 capture-at-start coverage; `.orb-ring` selector references already renamed in Plan 01 Task 2

*Framework already installed (Vitest + RTL + jsdom). No new tooling. Zero new npm deps invariant (D-18) preserved.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Square + Ring visual smoothness at 6 BPM | VARIANT-01 | Visual aesthetic / motion-clarity; not assertable in jsdom | Operator runs `npm run dev`, selects each variant, runs a 30-second session, confirms scale interpolation reads as smooth + the inner marker visibility matches orb at MIN/MAX |
| Square border-radius final value (18% / 22% / 25%) | VARIANT-01 | Aesthetic pick by operator | Operator A/B's each candidate radius in dev server; picks final |
| Ring inner-radius final value (35% start) | VARIANT-01 | Aesthetic pick by operator | Operator A/B's each candidate inner-stop; picks final |
| Picker inline swatch legibility at 24px | VARIANT-01 / VARIANT-06 | Visual perception | Operator confirms each swatch (orb / square / ring) is identifiable at the picker's actual render size; flag if Ring needs Option B (inline SVG) hybrid |
| Per-palette contrast on Square + Ring | VARIANT-04 (token reuse via D-13) | Visual + contrast spot-check | Operator runs each of Light / Dark / Moss / Slate / Dusk, selects each variant; confirms in-text and out-text remain readable + boundary markers visible |
| Reduced-motion fallback per variant | VARIANT-04 | Visual confirmation that the crossfade carries the phase cue when motion is locked | Operator enables OS reduced-motion, runs a session per variant, confirms body sits at MID_SCALE + `.orb-layer` opacity crossfade reads cleanly |
| Cross-tab variant change does not swap mid-session | VARIANT-03 | DOM event in second tab; requires real two-tab browser context | Operator starts a session in Tab A, opens Tab B, changes variant in Tab B's settings, returns to Tab A, confirms the shape did not swap; after End, both tabs reflect Tab B's chosen variant |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — every executable task in the Per-Task Verification Map carries an `<automated>` command; the single `checkpoint:human-verify` (17-06-02) is the operator UAT, which is correctly manual-only per §Manual-Only Verifications.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — confirmed in map above; the only manual task (17-06-02) is bracketed by 17-06-01 (full suite gate) before it and 17-06-03 (close-out gate) after it.
- [x] Wave 0 covers all MISSING references — n/a — TDD per task within plan; every component test file is created alongside its production code in the same commit, so there are no MISSING references at any wave boundary.
- [x] No watch-mode flags — all `<automated>` commands use `npm test -- --run` (one-shot mode); no `--watch` anywhere in the map.
- [x] Feedback latency < 40s — confirmed; the heaviest gate (full suite at 17-02-03 / 17-05-01 / 17-06-01 / 17-06-03) runs in ~25–40 seconds per Test Infrastructure §; per-task suites (`--run OrbShape`, `--run useVariantChoice`, etc.) run in ~5–10 seconds.
- [x] `nyquist_compliant: true` set in frontmatter — flipped to true in this revision; every executable task has an `<automated>` verify and the suite re-runs at the commit boundary for plans 02 / 05 / 06.

**Approval:** approved (2026-05-14, post-revision)
