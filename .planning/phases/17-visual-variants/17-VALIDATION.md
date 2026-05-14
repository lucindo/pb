---
phase: 17
slug: visual-variants
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
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

> Filled by `gsd-planner` during plan generation; this draft seeds the requirement → test-type mapping. Plan-checker enforces no-gap continuity.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-XX-XX | TBD  | 1    | (D-15 rename atlas — no requirement bind; carry-forward green-gate) | — | N/A | build-gate | `npx tsc --noEmit && npm test -- --run` | ✅ | ⬜ pending |
| 17-XX-XX | TBD  | 2    | VARIANT-02 | — | Orb default unchanged after extraction | unit | `npm test -- --run OrbShape` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 2    | VARIANT-05 | — | leadInDigit prop renders on orb | unit | `npm test -- --run OrbShape` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 3    | VARIANT-01 | — | Square renders + scale interp | unit | `npm test -- --run SquareShape` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 3    | VARIANT-01 | — | Ring renders + scale interp | unit | `npm test -- --run RingShape` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 3    | VARIANT-04 | — | Reduced-motion fixed-mid + crossfade per variant | unit | `npm test -- --run SquareShape RingShape` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 3    | VARIANT-05 | — | leadInDigit prop renders on square + ring | unit | `npm test -- --run SquareShape RingShape` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 3    | VARIANT-07 | — | useVisualVariant cross-tab + same-tab listeners | unit | `npm test -- --run useVisualVariant` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 4    | VARIANT-01 | — | VariantPicker radiogroup selection writes prefs | unit | `npm test -- --run VariantPicker` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 4    | VARIANT-06 | — | 44×44 hit area + focus-visible on picker | unit | `npm test -- --run VariantPicker` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 4    | VARIANT-03 | — | sessionVariantRef snapshot at startSession; no mid-session swap | integration | `npm test -- --run App.session` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 4    | VARIANT-02 | — | Dispatcher renders correct child per variant; null at idle | unit | `npm test -- --run BreathingShape` | ❌ W0 | ⬜ pending |
| 17-XX-XX | TBD  | 5    | VARIANT-07 | — | Per-commit green-gate exits 0 across wave; THEME-UI-01 + contrast guards stay green | build-gate | `npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/OrbShape.test.tsx` — stubs for VARIANT-02 + VARIANT-05 (orb cases extracted from current `BreathingShape.test.tsx`)
- [ ] `src/components/SquareShape.test.tsx` — stubs for VARIANT-01 / VARIANT-04 / VARIANT-05 (scale interp, reduced-motion, leadInDigit, `data-variant='square'`)
- [ ] `src/components/RingShape.test.tsx` — stubs for VARIANT-01 / VARIANT-04 / VARIANT-05 (scale interp, reduced-motion, leadInDigit, `data-variant='ring'`)
- [ ] `src/components/BreathingShape.test.tsx` — slim to dispatch smoke (renders correct child per variant prop; returns null at idle)
- [ ] `src/components/VariantPicker.test.tsx` — stubs for VARIANT-01 / VARIANT-06 (radiogroup, disabled gating, swatch render, savePrefs + dispatch, 44×44 + focus-visible)
- [ ] `src/hooks/useVisualVariant.test.ts` — stubs for VARIANT-07 (cross-tab `'storage'`, same-tab `'hrv:prefs-changed'` filtered on `detail.key === 'variant'`, no global attribute write)
- [ ] `src/app/App.session.test.tsx` — extend with VARIANT-03 capture-at-start coverage; `.orb-ring` selector references rename to `.shape-marker`

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 40s
- [ ] `nyquist_compliant: true` set in frontmatter (planner sets after task-map fully populated)

**Approval:** pending
