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

## Milestone: v1.0.1 — Code Review Patch

**Shipped:** 2026-05-12
**Phases:** 6 (07–12) | **Plans:** 12 | **Tasks:** 17 | **Commits:** 143

### What Was Built

Fix-only patch closing all 26 findings from REVIEW.md (5 Critical / 12 Warning / 9 Info) mapped to 27 REQ-IDs. Phase 7 landed strict TS + ESLint `strictTypeChecked` + `react-hooks/exhaustive-deps: error` as the compiler floor for the rest of the milestone. Phase 8 made the localStorage envelope forward-compatible and refuse-downgrade, plus a cross-tab `storage` listener for live stats sync. Phase 9 eliminated audio + wake-lock race conditions (reconstruction generation counter, caller-side past-time clamp, lead-in null-on-closed, oscillator disconnect, state-change null-guard, dead `'starting'` removal, wake-lock in-flight guard). Phase 10 stabilized hook identity (`mutedRef`, status-primitive deps, per-phase frame identity, cancel-guard ordering). Phase 11 tightened domain + UI contracts + accessibility (`extendTimedSession` boundary validation, `SessionReadout` lead-in placeholder, symmetric auto-close, `MuteToggle` resume-mode a11y). Phase 12 cleaned assets + content + hygiene (favicon under Vite base, canonical amazon URL, `isValid<X>` predicate relocation, `formatLastSessionDate` JSDoc, HYGIENE-01 docs-only flip).

### What Worked

- **Strict baseline first (Phase 7) → every later phase wrote against it.** Latent compiler/lint errors surfaced once during Phase 7 and were fixed inline; no later phase had to "re-discover" them. The D-04 `// Reason:` annotation policy made `react-hooks/exhaustive-deps` disables auditable.
- **Per-commit green-gate (`tsc && lint && build && test`) as D-09/D-15 invariant.** Every commit boundary in the milestone exited 0 on all four gates. Made `git bisect` trustworthy and caught two task-2 deviations (`never`-template lint, Vitest `--reporter=basic` flag) at the boundary instead of post-merge.
- **Worktree isolation + sequential dispatch.** Phase 12 plan-01 ran in a worktree with all five tasks committed atomically and rescued cleanly via the standard merge path.
- **Audit before close.** Re-running `/gsd-audit-milestone` before `/gsd-complete-milestone` caught the staleness of the prior audit (pre Phase 11 verify, pre Phase 12) and surfaced 13 trace-row docs lag without blocking — the closeout sweep handled them implicitly during archival.
- **Cross-phase invariant call-out in CONTEXT (Phase 12 D-01/D-02).** HYGIENE-01 would have been a foot-gun (literal `audioNow` removal breaks the Phase 9 AUDIO-02 clamp). The CONTEXT decision to flip docs-only and add a REVIEW.md addendum preserved correctness while still closing the finding.

### What Was Inefficient

- **Trace row docs lag for Phase 7/8/9.** REQUIREMENTS.md rows stayed "Pending" through six phases despite VERIFICATION.md = passed. Caught only by milestone-close audit. **Fix:** verify-phase should flip trace rows as standard closeout (Phase 11 / Phase 12 did this; earlier phases did not).
- **REVIEW.md committed late.** The 441-line deep-review file was untracked through Phase 11 and only got committed in Phase 12 Task 1 alongside the §IN-02 addendum. Triggered an `untracked working tree files would be overwritten by merge` block during the Phase 12 worktree merge. **Fix:** commit large reference docs as soon as they're authored, not lazy-add at the end.
- **Phase 12 VALIDATION.md + SECURITY.md not generated.** Threat model was inlined in the plan (sufficient — block-on-high gate satisfied) but standalone files would have been better artifact discipline. Carried forward as advisory tech debt.
- **Single-plan phases (11, 12) with single-wave structure.** Wave/parallelization machinery added overhead vs. payoff; could have run as `--interactive` inline executor.

### Patterns Established

- **`// Reason:` annotation policy** for any `eslint-disable react-hooks/exhaustive-deps` line — every disable cites the deviation rule.
- **Spread-then-override read + refuse-downgrade write** for forward-compat localStorage envelopes (Phase 8 D-01 / D-04a). Forward-port to v1.1 schema bumps.
- **Caller-side past-time clamp** for Web Audio scheduling (Phase 9 AUDIO-02) — Pitfall 5 belt-and-suspenders pattern.
- **Reconstruction generation counter** for async resource lifecycle hooks (Phase 9 AUDIO-01) — applicable to any async-engine-rebuild scenario.
- **`mutedRef` ref-stability pattern** (Phase 10 HOOKS-01) — generalizes to "stable hook return when stateful behavior is read-mostly."
- **Shared predicate extraction at domain layer** (Phase 12 HYGIENE-02) — `validateSettings` (throws) and `coerceSettings` (fallback) cousins share `isValid<X>` predicates without duplicating allow-lists.
- **HYGIENE-01 docs-only flip pattern** (Phase 12 D-01/D-02) — when a review finding becomes overtaken by a later-shipped contract, close it in docs with cross-citation, not via code removal.
- **`%BASE_URL%` favicon HTML substitution** (Phase 12 D-04) — survives any future Vite `base` change without an HTML edit.

### Key Lessons

1. **Strict baseline early pays compounding interest.** Six phases × ~25 commits each × zero re-discovered TS/lint errors = real velocity.
2. **Audit before complete-milestone.** Re-running the audit after late phases avoids stale "gaps_found" blocking the close.
3. **Verify-phase should own trace-row flips.** Don't defer to milestone close — flip at phase boundary so audit is reliable mid-milestone.
4. **Doc commits are not free.** Untracked reference docs cause worktree merge friction. Commit them when you author them.
5. **Cross-phase invariants need CONTEXT-level annotation.** Phase 12 HYGIENE-01 would have regressed Phase 9 AUDIO-02 without the explicit D-01/D-02 carve-out. Worth the 200-word context detour.
6. **Single-plan phases work well as `--interactive`.** Wave/parallelization is overhead when there's nothing to parallelize.

### Cost Observations

- Sessions: 3 (discuss → plan → execute, plus mid-milestone phase-11 verify)
- Notable: Phase 12 plan execution (5 task groups + green-gate × 5 + SUMMARY) ran in ~10 minutes wall-clock with a single executor agent.
- Test growth: 363 → 409 (+46 cases) for zero behavior change beyond the favicon + book URL hover.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 7 | 30 | Established phase/plan/wave structure, decimal-phase insertion pattern, pre-close audit workflow |
| v1.0.1 | 6 | 12 | Strict TS + ESLint baseline as compiler floor; per-commit green-gate as invariant; `// Reason:` policy for hook-deps disables; worktree-mode merge protocol shaken out (untracked-file merge gotcha) |

### Cumulative Quality

| Milestone | Tests | Test Files | LOC (src/) |
|-----------|-------|------------|------------|
| v1.0 | 363/363 pass | 27 | ~9,032 |
| v1.0.1 | 409/409 pass | 29 | ~10,925 |

### Top Lessons (Verified Across Milestones)

1. **Decimal-phase insertion handles emergent scope** — Phase 5.1 (v1.0) and Phase 12 HYGIENE-01 docs-only flip (v1.0.1) both proved that mid-milestone reality can be honored without forcing literal-text adherence to the original ROADMAP.
2. **Pre-close audit is non-negotiable** — both v1.0 and v1.0.1 caught real or apparent gaps before archival. v1.0.1 specifically demonstrated that stale audits can mislead; re-running is cheap.
3. **Cross-phase invariants must be made explicit in CONTEXT** — Phase 12 HYGIENE-01 → Phase 9 AUDIO-02 dependency would have caused a regression without the D-01/D-02 carve-out.
