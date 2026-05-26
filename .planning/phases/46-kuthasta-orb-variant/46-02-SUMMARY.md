---
phase: 46-kuthasta-orb-variant
plan: "02"
subsystem: theme-tokens
tags:
  - theme
  - tokens
  - spike-locked
  - spiritual-eye
dependency_graph:
  requires: []
  provides:
    - "--color-orb-*-spiritual-eye tokens (light + dark, 10 total)"
  affects:
    - "src/components/OrbShape.tsx (Plan 03 consumer)"
tech_stack:
  added: []
  patterns:
    - "CSS custom-property token-set insertion — extend @theme and [data-theme='dark']:root blocks without touching existing declarations"
key_files:
  created: []
  modified:
    - src/styles/theme.css
decisions:
  - "D-03 confirmed: --color-orb-disc-spiritual-eye-strong derived by ~12% uniform HSL lightness darkening per stop from spike-locked front-phase indigo; operator may re-spec at Plan 03 UAT"
  - "D-06 refined: 5 tokens per theme (10 total) — halo-1, halo-2, disc, disc-strong, star-fill, star-stroke — expanded from the original CONTEXT.md D-06 count of 4 per theme due to PATTERNS.md open item #2 (currentColor from --color-breathing-on-accent gives #1a1d24 in dark, not the spike-locked #fafafe)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-25"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 46 Plan 02: Spiritual-Eye Theme Tokens Summary

Ten spike-012-locked `--color-orb-*-spiritual-eye` CSS custom-property tokens added to `src/styles/theme.css` — five in the light `@theme` block and five in the dark `[data-theme='dark']:root` block — providing the design-contract surface for Plan 03's OrbContainer variant branch.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add five spiritual-eye tokens to light @theme block | 7c10ab9 | src/styles/theme.css |
| 2 | Add five spiritual-eye tokens to dark [data-theme='dark']:root block | 0310ffd | src/styles/theme.css |

## Token Blocks Added

### Light @theme block (inserted after --color-orb-halo-3 at original L20)

```css
/* Spike 012 V5 spiritual-eye tokens (light).
   Source: .planning/spikes/012-spiritual-eye-orb/README.md "Locked V5 values".
   Halo-3 reuses the existing --color-orb-halo-3 above (unchanged per spike).
   --color-orb-disc-spiritual-eye-strong is derived (NK back-phase, ~12% HSL
   darker per stop); operator may re-spec at UAT. */
--color-orb-halo-1-spiritual-eye: rgba(202, 166, 98, 0.48);
--color-orb-halo-2-spiritual-eye: rgba(168, 148, 116, 0.44);
--color-orb-disc-spiritual-eye: radial-gradient(circle at 50% 42%, #4a5a96 0%, #34406f 60%, #2a356a 100%);
--color-orb-disc-spiritual-eye-strong: radial-gradient(circle at 50% 42%, #36416d 0%, #202845 60%, #191f3e 100%);
--color-orb-star-fill-spiritual-eye: #ffffff;
--color-orb-star-stroke-spiritual-eye: rgba(255, 255, 255, 0.20);
```

### Dark [data-theme='dark']:root block (inserted after --color-orb-halo-3 at original L70)

```css
/* Spike 012 V5 spiritual-eye tokens (dark).
   Source: .planning/spikes/012-spiritual-eye-orb/README.md "Locked V5 values".
   Halo-3 reuses the existing --color-orb-halo-3 above (unchanged per spike). */
--color-orb-halo-1-spiritual-eye: rgba(206, 168, 100, 0.45);
--color-orb-halo-2-spiritual-eye: rgba(170, 156, 122, 0.46);
--color-orb-disc-spiritual-eye: radial-gradient(circle at 50% 42%, #6c7cb6 0%, #4a5a96 60%, #38477e 100%);
--color-orb-disc-spiritual-eye-strong: radial-gradient(circle at 50% 42%, #4c5d99 0%, #36416d 60%, #252f54 100%);
--color-orb-star-fill-spiritual-eye: #fafafe;
--color-orb-star-stroke-spiritual-eye: rgba(255, 255, 255, 0.12);
```

## D-03 Derivation Confirmation

The `--color-orb-disc-spiritual-eye-strong` token is derived by applying uniform ~12% HSL lightness reduction per gradient stop from the spike-locked front-phase indigo:

| Theme | Front (spike-locked) | Strong (derived, D-03) |
|-------|---------------------|------------------------|
| Light | `#4a5a96 → #34406f → #2a356a` | `#36416d → #202845 → #191f3e` |
| Dark  | `#6c7cb6 → #4a5a96 → #38477e` | `#4c5d99 → #36416d → #252f54` |

Method: `colorsys.rgb_to_hls` → `L -= 0.12` → `hls_to_rgb` per stop, applied uniformly. Operator may re-spec these stops at Plan 03 UAT if the NK front/back visual distinction reads too subtle.

## Refinement of CONTEXT.md D-06

CONTEXT.md D-06 originally declared 4 tokens per theme (8 total: halo-1, halo-2, disc, disc-strong). This plan adds 2 more per theme (10 total), driven by PATTERNS.md open item #2: `currentColor` from `--color-breathing-on-accent` resolves to `#1a1d24` in dark mode — the opposite of the spike-locked dark star fill (`#fafafe`). Dedicated `--color-orb-star-fill-spiritual-eye` and `--color-orb-star-stroke-spiritual-eye` tokens are the correct mechanism; Plan 03's StarGlyph references these directly.

## Deviations from Plan

None — plan executed exactly as written. The `npm install` step was needed because the worktree didn't have `node_modules` (deviation Rule 3 auto-fix: package setup, not a package-manager install of a new package — safe to auto-resolve).

## Verification Results

- `npm run build` — passed (both tasks)
- `grep -c "spiritual-eye" src/styles/theme.css` — returns 17 (12 token declarations + 5 comment occurrences, exceeds minimum 12)
- `git diff src/styles/theme.css` (from base) — two contiguous insertions only; no existing line modified
- All spike-locked values present verbatim; `#fafafe` appears exactly once (dark star fill)
- All 10 token declarations inside their correct `@theme` / `[data-theme='dark']:root` blocks

## Self-Check: PASSED

- [x] src/styles/theme.css modified with 10 new token declarations
- [x] Task 1 commit 7c10ab9 exists
- [x] Task 2 commit 0310ffd exists
- [x] Build passes
- [x] No stubs
- [x] No new threat surface (pure CSS, no executable code, no input handling, no dependencies)
