# Plan — Pattern Breathing (pb)

This repo is an import of the HRV breathing app, being repurposed into a
**Pattern Breathing** app. Strategy: strip the HRV app down to a lean single-practice
base, then build pattern-breathing on the surviving core breathing engine.

## Roadmap

- [x] Decide seed: keep HRV/resonant timer as the base for pattern breathing
- [x] Remove Navi Kriya practice (engine, audio, settings, stats, copy)
- [x] Remove Stretch practice (ramp engine, settings, stats, copy)
- [x] Collapse the 3-way practice abstraction to a single HRV practice (switcher UI gone)
- [x] Remove dead Stretch/Navi Kriya bilingual copy + parity tests
- [x] Refresh `.project/PROJECT.md` to current single-practice shape; drop stale Stretch `SPEC.md`
- [ ] Collapse vestigial single-practice scaffolding (in progress, /ds-step-mode) — see Open questions
- [ ] (Pending user input) Receive remaining "things to remove" toward lean state
- [ ] (Pending user input) Implement pattern-breathing functionality

## Now

**State** — On branch `refactor/strip-to-pattern-breathing`. Stretch + Navi Kriya
fully removed; app is a single HRV/resonant timer. Two commits landed
(`e9c3bca`, `3e9e8c1`). All gates green: `tsc -b`, `eslint`, 1009 vitest tests,
`vite build`. Core breathing pipeline (breathingPlan → sessionMath/sessionAudio →
useSessionEngine → useBreathingSessionController) is simplified and clean.

**Next** — User approved the vestigial-scaffolding collapse (PLAN item 3), to run
under /ds-step-mode. Pattern-breathing spec is deferred (user will define later).

**Open questions**
- Vestigial-scaffolding collapse candidates: storage `PracticeId` single-value
  indirection + unused `load/saveActivePractice`; rename `nkCueSynth.ts` (now HRV
  lead-in tick + end chord only); single-use dual-AC seam in `sessionClock` with
  stale NK comments; `PracticeControlsView` two-identical-audio-props; the
  `switcherIcon` feature flag whose only consumer (PracticeToggle) was deleted — its
  AdvancedPage toggle is now a no-op.
- What is the concrete pattern-breathing spec (e.g. user-defined box/custom
  inhale–hold–exhale–hold patterns)? Deferred — user will define later. The old
  Stretch `SPEC.md` was removed (it specced a deleted practice, not this).
