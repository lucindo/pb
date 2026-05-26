---
phase: 46-kuthasta-orb-variant
plan: 03
subsystem: ui
tags: [orb, breathing-shape, variant, spike-012, halo-flame, star-glyph, react, svg]

requires:
  - phase: 46-kuthasta-orb-variant
    provides: BreathingShapeVariant union extended with 'spiritual-eye' literal + alias clause (Plan 01)
  - phase: 46-kuthasta-orb-variant
    provides: 10 --color-orb-*-spiritual-eye CSS tokens in theme.css light + dark blocks (Plan 02)
provides:
  - StarGlyph React component (co-located in OrbShape.tsx; 5-point polygon, 0..100 viewBox, outer:inner 2.5, point straight up)
  - SPIRITUAL_EYE_HALOS constant (3-entry halo geometry, V1-identical except halo-1/halo-2 tokens swap)
  - OrbContainer three-way halo-region branch (minimal-rings / spiritual-eye / V1 default)
  - Per-call-site discBg + children dispatch for variant === 'spiritual-eye' across OrbBody, OrbIdle, OrbLeadIn NK front/back
  - LeadIn-digit + showCompletion paths byte-identical (D-02 production-solid contract honoured)
affects: [phase 47 persistable preferences, phase 48 appearance page, any future BreathingShapeVariant addition]

tech-stack:
  added: []
  patterns:
    - "Per-variant inline `discBg` constant computed above `<OrbContainer>` return, threaded as prop — extends the existing OrbBody convention"
    - "Three-way variant ternary in JSX (chained `?:`) rather than `switch`/lookup — matches existing two-way ternary at the same locus"
    - "StarGlyph reads dedicated per-theme tokens via inline `style.fill` / `style.stroke` (NOT `currentColor`) — sidesteps the on-accent token resolving to dark in dark theme"

key-files:
  created:
    - .planning/phases/46-kuthasta-orb-variant/46-03-SUMMARY.md
  modified:
    - src/components/OrbShape.tsx
    - src/components/OrbShape.test.tsx

key-decisions:
  - "Open item #1 (CueGlyph + StarGlyph during Running): StarGlyph REPLACES CueGlyph at the OrbBody children slot for spiritual-eye. Resolution from CONTEXT.md D-01 + PATTERNS.md L228. Aria-label on OrbContainer root preserves screen-reader phase parity."
  - "Open item #2 (dark-theme star fill): StarGlyph wrapper drops the CheckmarkGlyph `color: var(--color-breathing-on-accent)` style and reads dedicated `--color-orb-star-fill/stroke-spiritual-eye` tokens directly. Plan 02 added these tokens for exactly this reason."
  - "Open item #3 (D-03 -strong gradient): consumed verbatim from Plan 02 via `var(--color-orb-disc-spiritual-eye-strong)` at the OrbLeadIn NK back-phase site. Operator UAT accepted the derivation without re-spec."
  - "JSX chain shape over lookup constant: kept the existing ternary structure at the halo region (now three-way) rather than introducing a `halos` lookup variable, so the V1 and V2 branches stay byte-identical."

patterns-established:
  - "Spike-locked variant additions: extend the existing variant ternaries in-place (halo region + per-site discBg + children dispatch) instead of adding new component props"
  - "Per-theme glyph tokens for cross-theme contrast: dedicated `--color-orb-star-fill/stroke-{variant}` tokens read via inline style avoid the currentColor + on-accent dark-theme trap"

requirements-completed: [KUTH-02, KUTH-03]

duration: ~10min
completed: 2026-05-26
---

# Phase 46 / Plan 03: Wire V5 Halo Flame into OrbShape Summary

**StarGlyph + SPIRITUAL_EYE_HALOS + three-way halo branch + per-call-site discBg/children dispatch wired into `OrbShape.tsx`; six structural tests added; operator UAT approved.**

## Performance

- **Duration:** ~10 min (inline execution on main; worktree-isolated subagent halted with no-Bash-access at first dispatch, second retry, then operator selected inline-on-main)
- **Started:** 2026-05-26T00:42:30Z
- **Completed:** 2026-05-26T00:55:00Z
- **Tasks:** 3 (Task 1 structural; Task 2 dispatch + tests; Task 3 visual UAT — approved)
- **Files modified:** 2 (src/components/OrbShape.tsx, src/components/OrbShape.test.tsx)

## Accomplishments

- `?breathingShape=spiritual-eye` (aliases `kuthasta`, `star`) now renders the spike-012 V5 Halo Flame design verbatim — gold halo + opalescent indigo radial-gradient disc + 5-point white star — in both light and dark themes
- StarGlyph replaces CueGlyph at OrbBody (Running) and renders alongside the disc at OrbIdle (Running + Idle only, per D-01)
- NK front/back distinction preserved on spiritual-eye via the spike-012 disc-spiritual-eye + disc-spiritual-eye-strong token pair
- LeadIn countdown and Completion checkmark stay production-solid (var(--color-breathing-accent)) for all three variants, honouring D-02
- Outer ring, progress arc, ring-cue dispatch, reduced-motion freeze, scale animation, idle still/ambient behaviour — byte-identical for spiritual-eye to V1 (KUTH-03)
- Operator visually verified light + dark + idle + running + lead-in + NK front/back + completion + unrecognized fallback + reduced-motion

## Task Commits

Each task was committed atomically:

1. **Task 1: Add StarGlyph + SPIRITUAL_EYE_HALOS + three-way halo branch** — `e1d13bc` (feat)
2. **Task 2: Wire per-call-site discBg + children dispatch + 6 vitest assertions** — `02b267d` (feat)
3. **Task 3: Operator visual UAT** — checkpoint approved, no code change

**Plan metadata:** this commit

_Note: this plan did not run RED-first TDD per-task (Plan 02's executor also went straight to feat commits)._

## Files Created/Modified

- `src/components/OrbShape.tsx` — added `SPIRITUAL_EYE_HALOS` constant; added `StarGlyph` function; extended halo-region ternary to three-way chain (minimal-rings / spiritual-eye / default V1); per-call-site `discBg` constant in OrbBody and OrbIdle + extended NK branch in OrbLeadIn; children dispatch in OrbBody and OrbIdle (+56 lines Task 1, +119/-6 Task 2)
- `src/components/OrbShape.test.tsx` — appended `OrbShape — variant="spiritual-eye" (Phase 46)` describe block with 6 tests (Tests A–F: Running renders polygon, Running suppresses CueGlyph text, Idle renders polygon, LeadIn-digit + Completion render no polygon, default-variant zero regression)

## Decisions Made

- StarGlyph as the only Running disc child for spiritual-eye (open item #1) — CueGlyph entirely replaced, not stacked. Aria-label keeps screen-reader parity.
- Dedicated star fill + stroke tokens consumed via inline style (no currentColor) — open item #2 root cause was the on-accent token resolving to near-black in dark theme.
- JSX chain over lookup variable at the halo region — V1 / V2 branches stay byte-identical and reviewable.
- Test selectors discriminate StarGlyph SVG by `viewBox="0 0 100 100"` + `polygon` child to disambiguate from CueGlyph / ProgressArcLayer / CheckmarkGlyph SVGs.

## Deviations from Plan

None - plan executed exactly as written. All three open items resolved per plan inline.

**Inline-on-main execution note (not a plan deviation):** The first two attempts to spawn `gsd-executor` in a worktree halted before issuing any Bash call, reporting no-Bash-access. Operator selected inline-on-main execution as the recovery path. Wave 2 plan therefore committed directly to `main` instead of through a `worktree-agent-*` branch + merge cycle. STATE.md / ROADMAP.md tracking writes are handled by the orchestrator's post-Wave update_roadmap step (same final state as worktree mode).

## Issues Encountered

- gsd-executor worktree subagent halted twice with no-Bash-access despite Wave 1 agents (46-01, 46-02) running fine in the same setup; operator approved fallback to inline-on-main execution

## User Setup Required

None - no external service configuration required.

## Operator UAT Notes

- Operator typed "approved" after walking through the five UAT checks
- D-03 derived `-strong` darker-indigo gradient (`#36416d → #202845 → #191f3e` light / `#4c5d99 → #36416d → #252f54` dark) accepted as-derived — no re-spec
- Dark-theme star fill renders as `#fafafe` (Plan 02 token wiring correct)
- All five locked UAT checks pass

## Next Phase Readiness

- Phase 46 KUTH-02 + KUTH-03 closed (Plans 01, 02, 03 together close KUTH-01 / 02 / 03 / 04 — all four phase requirements)
- Ready for Phase 47 (Persistable preferences — moves `?breathingShape=` from URL flag to a Settings dialog control with localStorage persistence)
- No blockers, no carry-forward

---
*Phase: 46-kuthasta-orb-variant*
*Completed: 2026-05-26*
