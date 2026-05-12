---
created: 2026-05-11T17:35:00.000Z
title: Reduced motion still shows out-phase boundary cue
area: ui
resolves_phase: 13
files:
  - src/components/BreathingShape.tsx:114-132
  - src/styles/theme.css:106-154
---

## Problem

When OS-level "Reduce motion" is enabled, the breathing orb correctly locks at `MID_SCALE` (D-06 invariant), but the **inner reference ring** (`orb-ring--inner` at `MIN_SCALE` boundary, `src/components/BreathingShape.tsx:127-133`) is still rendered during the Out phase.

That inner ring exists specifically as the "approach the boundary" visual cue — its purpose is to mirror the outer-ring cue from the In phase as the orb shrinks toward `MIN_SCALE`. Under reduced motion the orb does not shrink (it's pinned at `MID_SCALE`), so the ring stops carrying information and just sits there as a static phase-end/switch cue that the reduced-motion contract is supposed to suppress.

User report (Phase 7 UAT, 2026-05-11, with screenshot attached to verification log): "with reduced motion on, on the out phase, we should not show the visual clue of phase end/switch."

Severity: minor (visual/UX correctness; no functional break). Not a Phase 7 regression — pre-existing under the Phase 2/3 reduced-motion contract.

## Solution

TBD. Two candidate approaches:

1. **Conditional render in BreathingShape.** When `reducedMotion === true` AND `frame.phase === 'out'`, skip rendering the `orb-ring--inner` span. Keep the existing `In` phase outer-ring cue logic untouched. Update tests in `src/app/App.session.test.tsx` (the D-06 reduced-motion test) to assert the inner ring is absent on Out under reduced motion.

2. **CSS-only suppression.** Add `display: none` (or `visibility: hidden`) for `.orb-ring--inner` inside the `@media (prefers-reduced-motion: reduce)` block in `src/styles/theme.css:154`. Lower-risk; matches the same media-query gating already used for other reduced-motion suppressions. Downside: still in DOM, so screen readers / future logic must not rely on its presence as a state signal.

Lean toward (2) — least invasive, matches the existing reduced-motion gating pattern in `theme.css`, no React render-path change. Verify D-07 phase-indicator contract still satisfied (the "fade-in IS the phase" substitute cue documented in theme.css:146-149 must remain present).

Re-confirm under reduced motion: Out phase shows no boundary/switch ring, only the static MID_SCALE orb + label.
