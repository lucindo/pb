---
phase: 17-visual-variants
created: 2026-05-14
purpose: Human-readable discussion audit (NOT consumed by downstream agents)
---

# Phase 17: Visual Variants - Discussion Log

**Date:** 2026-05-14
**Mode:** standard discuss (default; 4 areas selected, 4 questions per area = 16 questions total)
**Decided in CONTEXT.md:** D-01..D-24

---

## Pre-discussion state

- `phase_found = true` (Phase 17 = Visual Variants, milestone v1.1)
- `has_context = false`, `has_research = false`, `has_plans = false`
- Locked upstream: `VisualVariantId = 'orb' | 'square' | 'ring'` + `DEFAULT_VARIANT = 'orb'` (Phase 14 D-01/D-05); `VariantPicker.tsx` stub awaiting body (Phase 15 D-01..04); `'hrv:prefs-changed'` CustomEvent contract (Phase 16, forward-decl for variant)
- Scout: `BreathingShape.tsx` 224 LOC orb code; `useTheme.ts` 92 LOC orchestrator pattern; THEME-UI-01 token-binding guard active
- Todo cross-ref: 1 match (`2026-05-13-themes-aesthetic-refresh.md`, score 0.6, keyword-only) — reviewed not folded (Phase 16.x concern, not variant)

---

## Area 1: Variant rendering architecture (4 Q)

### Q1 — Dispatcher pattern
- Options: (a) 3 sibling shape files + thin dispatcher [Recommended], (b) single fat BreathingShape + internal switch, (c) registry/map
- **User chose: (a)** → D-01

### Q2 — Orb migration shape
- Options: (a) extract verbatim [Recommended], (b) extract + refactor common helpers, (c) rewrite on extract
- **User chose: (a)** → D-02 (mechanical className rename only; orb code byte-identical)

### Q3 — Variant source for dispatcher
- Options: (a) App passes variant prop [Recommended], (b) BreathingShape calls useVisualVariant internally, (c) BreathingShape reads loadPrefs at mount
- **User chose: (a)** → D-03

### Q4 — Idle null-return guard ownership
- Options: (a) Dispatcher owns null-return [Recommended], (b) each shape owns its own, (c) dispatcher always renders
- **User chose: (a)** → D-04

---

## Area 2: Square + Ring breathing animation (4 Q)

### Q1 — Square kinematics
- Options: (a) scale only [Recommended], (b) scale + border-radius morph, (c) scale + 45° rotation
- **User chose: (a)** → D-05

### Q2 — Ring kinematics
- Options: (a) scale only, hollow center [Recommended], (b) stroke-width animation (constant outer), (c) scale + stroke-width interpolation
- **User chose: (a)** → D-06

### Q3 — Reference markers per variant
- Options: (a) variant-specific reference shapes [Recommended], (b) no markers on Square + Ring, (c) share orb's existing circular ring classes
- **User chose: (a)** → D-07

### Q4 — Phase label + lead-in digit overlay
- Options: (a) identical typography + center positioning [Recommended], (b) variant-specific typography, (c) hide label on Ring
- **User chose: (a)** → D-08

---

## Area 3: Capture-at-session-start mechanism (4 Q)

### Q1 — Capture site
- Options: (a) useVisualVariant + App-side sessionVariantRef snapshot on Start [Recommended], (b) live useVisualVariant only (picker disable sole guard), (c) BreathingShape useMemo([sessionId]) internal capture
- **User chose: (a)** → D-09

### Q2 — Snapshot timing
- Options: (a) inside startSession handler, before lead-in [Recommended], (b) lazy: useEffect on appPhase change, (c) on lead-in dismissal / first 'in' phase
- **User chose: (a)** → D-10

### Q3 — Reconstruction behavior
- Options: (a) preserve frozen variant across reconstruction [Recommended], (b) re-snapshot on reconstruction, (c) reset to null then re-snapshot
- **User chose: (a)** → D-11

### Q4 — Idle preview
- Options: (a) no idle preview, picker shows shape swatches [Recommended], (b) live idle preview frozen at MID_SCALE, (c) live idle preview breathing at default 6 BPM
- **User chose: (a)** → D-12

---

## Area 4: Reduced-motion + token strategy (4 Q)

### Q1 — Token namespace
- Options: (a) reuse orb tokens verbatim across all variants [Recommended], (b) rename `--color-orb-*` → `--color-variant-*`, (c) per-variant token sets
- **User chose: (a)** → D-13 (with acknowledged `.orb-layer` naming inconsistency deferred to v1.2)

### Q2 — Reduced-motion contract
- Options: (a) identical contract via shared classes [Recommended], (b) per-variant `@media` blocks, (c) render orb regardless of selected variant
- **User chose: (a)** → D-14

### Q3 — Marker class strategy
- Options: (a) generic `.shape-marker--outer/--inner` + per-variant border-radius via `[data-variant]` [Recommended], (b) parallel `.square-marker-*` / `.ring-marker-*` class sets, (c) keep `.orb-ring--*` verbatim with attribute overrides
- **User chose: (a)** → D-15

### Q4 — data-variant scope
- Options: (a) render-local on shape root div [Recommended], (b) global on `<html>` like data-theme, (c) both local + global
- **User chose: (a)** → D-16

---

## Scope creep redirected

None — all 4 areas stayed inside Phase 17 HOW questions (variant set, picker contract, useTheme pattern were all upstream-locked and not re-asked).

## Carry-forward invariants noted but not asked

- D-17: per-commit green-gate
- D-18: zero new npm deps
- D-19: Phase 14 D-09 (settings.ts + prefs.ts NOT edited)
- D-20: Phase 15 D-01 (SettingsDialog NOT edited)
- D-21: Phase 15 D-02 (picker prop contract preserved)
- D-22: `'hrv:prefs-changed'` event reuse (filtered on `detail.key === 'variant'`)
- D-23: THEME-UI-01 token-binding guard remains green
- D-24: VARIANT-06 44×44 + focus-visible

## Deferred ideas captured

8 items — see `<deferred>` in CONTEXT.md.

## Reviewed-not-folded todos

1 item — `2026-05-13-themes-aesthetic-refresh.md` (Phase 16.x palette concern, not variant).

---

*Generated by /gsd-discuss-phase on 2026-05-14.*
