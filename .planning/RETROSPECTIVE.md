# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-11
**Phases:** 7 (1, 2, 3, 4, 5, 5.1 INSERTED, 6) | **Plans:** 30 | **Timeline:** 3 days (2026-05-08 → 2026-05-11)

### What Was Built

- React/Vite/TypeScript hands-off HRV breathing webapp with one accurate inhale/exhale session clock, finite settings (BPM 1–7 step 0.5, four ratios, 5–60min step 5 or unlimited), and a single SessionFrame contract powering every consumer (visuals, audio, persistence, wake lock).
- Polished accessible visual guide — orb with stacked gradient layers + two static reference rings + in-orb large phase label, fluid `clamp()` sizing, reduced-motion fixed-mid-scale + gradient crossfade fallback, focus-visible rings, 44×44 hit-area floor, three native `<dialog>`-based modals (EndSession / ResetStats / Learn) all sharing the same clone-don't-extract pattern with locked copy strings.
- Optional generated audio cues — pure `cueSynth` + `lookaheadScheduler` modules tested under FakeAudioContext polyfill, AC lifecycle + mute fade + lead-in scheduling, dual-anchor scheduling for phase-aligned cues, MuteToggle with morphing reconstruction affordance for iOS recovery.
- Local memory + practice stats — silent-fallback localStorage envelope, per-field validate-and-fallback coercers, persisted setters, single-write-site stats record with idempotency guard.
- Mobile hands-off resilience — Screen Wake Lock progressive enhancement with two-ref pattern, match-pair sentinel guard, idempotent release, visibility re-acquire wired into three App.tsx call sites.
- Hands-off polish (Phase 5.1 INSERTED) — iOS Safari audio engine reconstruction + dual-anchor re-anchor; Safari desktop orb max-scale visual fix via explicit-positioning pattern.
- Learning + claim-safe positioning — page-level `LearnAnchor` (D-18 disable-not-hide during session view) + native `<dialog>` `LearnDialog` with Forrest YouTube/Website-Trainings/Mastering-Meditation-book/curated videos, locked `inspired by Forrest's teachings` phrase, two-line disclaimer.

### What Worked

- **One-clock contract early.** Phase 1 establishing the SessionFrame derivation from elapsed time (not mutable phase counters) paid off compoundingly — every later phase (visuals, audio, wake lock, stats, recovery) consumed the same frame without inventing parallel timers. The single rAF loop in `useSessionEngine` stayed authoritative for the whole milestone.
- **TDD RED/GREEN commits for domain math.** Phase 1's commit-the-failing-test-first pattern surfaced lifecycle edge cases (open-ended vs timed completion, extension during running, cancel-during-lead-in) before they reached UI code.
- **Polyfill infrastructure paid back.** The `HTMLDialogElement` + `matchMedia` + `FakeAudioContext` + `navigator.wakeLock` polyfills in `vitest.setup.ts` made later phases testable under jsdom without flakey real-API dependencies; the FakeAudioContext `_simulateSuspend()` hook in particular made Phase 5.1's visibility-recovery testable without a real browser.
- **Dual-anchor scheduling held under re-anchor.** Phase 3's two-anchor cue scheduling (D-13/D-14) survived the Phase 5.1 engine reconstruction unchanged — the invariant was strong enough that recovery reused it.
- **Clone-don't-extract for dialogs.** Three dialogs (EndSession, ResetStats, Learn) share structure via copy-paste with locked-copy contracts rather than a shared abstraction. Each clone took ~minutes; an abstraction would have absorbed all three.
- **Decimal phase insertion (5.1) worked as intended.** When Plan 05-04 real-device UAT exposed iOS audio + Safari visual gaps after Phase 5 completed, inserting Phase 5.1 between 5 and 6 (with explicit INSERTED marker) preserved phase numbering invariants without renumbering downstream work.
- **Pre-close milestone audit.** Running `/gsd-audit-milestone` before `/gsd-complete-milestone` caught documentation drift (REQUIREMENTS.md unchecked checkboxes, ROADMAP.md stale progress row) and surfaced carry-forwards explicitly. Made the close a documentation-only step.

### What Was Inefficient

- **Phase 5.1 had to be inserted.** Plan 05-04 manual UAT was where iOS audio + Safari visual gaps surfaced — they could have been caught earlier by piping research-stage device assumptions through a real-device check before declaring Phase 5 done. The 5.1 insertion was correct response, but the gap detection was late.
- **Plan 05.1-01 empirically failed on real iPhone** despite a passing jsdom test suite — the visibilitychange→resume() path worked under FakeAudioContext but iOS Safari's actual `'interrupted'` AudioContext state required engine reconstruction, not just resume. Forced a re-plan into Plan 05.1-06. Lesson: jsdom polyfill semantics ≠ real WebKit audio session semantics for OS-level interruptions.
- **Plan 05.1-02 visual fix was insufficient.** 1.5px border-box compensation passed local visual review but Task 3 cross-browser UAT revealed deeper grid+abs-pos collapse on Safari desktop. Required Plan 05.1-04 explicit-positioning pattern re-fix. Lesson: visual fixes against Safari should be UAT-verified on real Safari, not just Chromium.
- **Phase 5 missing VERIFICATION.md.** Functional coverage rolled into Phase 5.1 Task 4 cross-browser sweep, which is fine in substance, but the procedural artifact gap shows up in `audit-open`. A short Phase 5 VERIFICATION.md noting "verified via 5.1 Task 4" would have closed the gap cleanly.
- **REQUIREMENTS.md checkboxes drifted.** 11 requirements stayed `[ ]` in REQUIREMENTS.md after their phases shipped because phase execution updates SUMMARY.md frontmatter but not REQUIREMENTS.md checkboxes. The milestone audit caught it; an executor or post-phase hook syncing back would prevent the drift entirely.
- **STATE.md velocity table malformed.** The performance metrics table got polluted by stray phase-slug rows. Cosmetic but a useful signal that automatic STATE.md writes are not always lossless.

### Patterns Established

- **One accurate clock, many consumers** (Phase 1). Visuals, audio, persistence, wake lock all derive from `useSessionEngine.currentFrame` — never invent a second timer.
- **Pure domain modules with TDD RED/GREEN commits** under `src/domain/` (settings, breathingPlan, sessionMath, sessionController, cueSynth, lookaheadScheduler) — UI hooks consume them as thin adapters.
- **Silent-fallback envelope for browser-API boundaries** (Phase 4 storage, Phase 5 wake lock, Phase 3/5.1 audio context). Catch + degrade rather than throw; per-field validate-and-fallback for persisted data.
- **Native `<dialog>` + locked-copy strings + clone-don't-extract** for modals. Browser-managed top-layer + focus trap; copy locked at the component to prevent drift across plans.
- **Dual-anchor scheduling** (Phase 3 D-13/D-14, reused Phase 5.1). Cue timing locked to session-clock anchors that survive AC reconstruction and (forward-compat) BPM changes.
- **Decimal phase insertion (X.Y INSERTED)** for urgent fixes discovered during/after an integer phase. Preserves downstream numbering and makes the insertion auditable.
- **Disable-not-hide contract** for cross-context anchors (Phase 6 LearnAnchor D-18). Visible+disabled during session view preserves layout invariant and visual stability.

### Key Lessons

1. **Test polyfills approximate APIs, not OS-level behavior.** jsdom + FakeAudioContext can't simulate iOS Safari's `'interrupted'` state from a real OS audio session loss. Manual real-device UAT is not optional for audio + wake lock + visibility flows.
2. **Pre-close audit > post-close cleanup.** Running the milestone audit before tag created a documentation-only close. Skip the audit and the close becomes a forensic cleanup.
3. **One-clock contract scales.** Locking every consumer to the same `SessionFrame` source meant adding new consumers (wake lock, audio reconstruction) didn't risk timing drift. Worth holding the line on this invariant in v1.1.
4. **Carry-forwards are valid ship state.** Five documented user-signed v1.x carry-forwards shipped with v1.0 without compromising the audit. Explicit deferral with documented rationale > silent gap or scope-creep block.
5. **Pure-then-React structure** (`src/domain/` pure modules + `src/hooks/` adapters + `src/components/` presentational) made the codebase reviewable at velocity — 30 plans in 3 days with 363 passing tests.

### Cost Observations

- Sessions: ~30 plans across ~3 days; intensive use of executor worktrees + parallel waves where dependency graph allowed (Phases 4/5/5.1/6 had parallel execution).
- Notable: Phase 5.1 INSERTED was the only significant rework; the rest of the milestone executed plan-as-written.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 7 | 30 | Established phase/plan/wave structure, decimal-phase insertion pattern, pre-close audit workflow |

### Cumulative Quality

| Milestone | Tests | Test Files | LOC (src/) |
|-----------|-------|------------|------------|
| v1.0 | 363/363 pass | 27 | ~9,032 |

### Top Lessons (Verified Across Milestones)

(Single-milestone — cross-validation pending v1.1.)
