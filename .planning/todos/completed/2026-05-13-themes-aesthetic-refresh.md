---
created: 2026-05-13
source: phase-16 human-verify checkpoint
category: ux
priority: medium
resolves_phase: null
---

# Themes: aesthetic palette refresh

User feedback at Phase 16 human-verify checkpoint: "All themes are extremely ugly."

## Context

Phase 16 shipped 5 concrete palettes (light, dark, moss, slate, dusk) + System resolver. All 5 clear the automated WCAG ≥ 1.5 luminance contrast floor (THEME-05). All functional contracts (THEME-01..04) green. But the palettes themselves do not feel intentional.

Plan 16-01 deviated from D-03 byte-identical Moss baseline (2 of 17 tokens shifted) to clear the contrast floor — signal that v1.0.1 baseline colors were tuned for the OLD single-palette viewport, not the new 6-palette cascade.

## Scope

- Coordinated palette redesign across all 5 concrete themes
- Re-tune accent saturation (Dark risk), orb-stop hue separation (Dusk risk), Light vs default-white distinctness
- Preserve THEME-05 automated contrast floor
- Re-test in browser with all 6 themes after redesign

## Defer until

After v1.1 ships (Phases 17/18/19 first). Bundle with any other v1.x palette/visual work (e.g. variant-aware color tweaks from Phase 17).
