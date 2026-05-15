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

## Milestone: v1.1 — Customization

**Shipped:** 2026-05-15
**Phases:** 10 (13, 14, 15, 16, 16.1, 16.2, 16.3, 17, 18, 19) | **Plans:** 47

### What Was Built

- 5-palette theme system (Light, Dark, Moss, Slate, Dusk) curated from open-source design systems (Nord, Everforest, Tokyo Night, Rosé Pine) with `data-theme` cascade and FOUC inline script
- Full UI token migration from hardcoded Tailwind colors to `var(--color-breathing-*)` across 16 components with `theme.no-hardcoded-classes.test.ts` guard
- SettingsDialog shell with 4 pickers (Theme, Variant, Timbre, Language) gated behind `inSessionView` disable contract
- 3 visual variants (Orb default, Square 18% rounded, Diamond rotated-square clip-path) via dispatcher + sibling-shape pattern
- 4 synthesized audio timbres (Bowl, Bell, Sine, Chime) via `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` dispatch; captured at session start
- EN+PT-BR language switching with roll-your-own typed catalog, `useLocale` orchestrator, `LanguagePicker` radiogroup, frozen-EN byte-equality guard on locked claim-safe copy

### What Worked

- **Sibling-pattern verbatim clones** for `useLocaleChoice`/`useTimbreChoice`/`useVariantChoice` and `LanguagePicker`/`TimbrePicker`/`ThemePicker` paid off: zero design surprises in waves 2+; pickers shipped in 3 hours each via mechanical mirroring.
- **`hrv:prefs-changed` CustomEvent + cross-tab `'storage'` listener** as the shared cross-tab sync mechanism for every customization dimension: one pattern, four consumers, zero special cases.
- **Frozen-EN `.toBe()` byte-equality snapshot guard** (`lockedCopy.test.ts`) lived up to D-12 promise: PT-BR translation churn during UAT did not weaken EN baseline.
- **Worktree-mode parallel waves** when intra-wave `files_modified` had no overlap — Wave 1 of Phase 19 (19-01, 19-02, 19-03) and Phase 16.3's per-palette cadence both ran ~3× faster than serial.

### What Was Inefficient

- **UI token migration was a 16-component sweep that wasn't visible until human-verify** — Phase 16 closed with the ThemePicker working but the rest of the UI ignoring theme swaps. Required Phase 16.1 emergency insertion. **Lesson:** "theme rebinding" SC needs an explicit per-component contract, not just a token-defined contract.
- **Translation quality was uncatchable by automated tests** — UAT-2 surfaced 11 distinct PT-BR fixes (Bowl→Taça, In/Out→Puxa/Solta, "Reativar pistas de áudio"→"Reativar áudio", etc.) and a separate `app` slice insertion (header/title were inline literals). **Lesson:** ship i18n with operator UAT in mind; expect a fix-now translation deviation commit after the first PT-BR walk-through.
- **Code review caught 2 hardcoded EN literals that bypassed translation** (`'Session complete'` in sessionController, `'Audio paused, tap to resume'` aria-live in App.tsx) — both shipped through 8 prior plans without flag. **Lesson:** for i18n phases, run `grep -rE "[A-Z][a-z]+ [a-z]+" src/ --include='*.ts*' | grep -v "import\|//\|UI_STRINGS\|strings\."` after wiring to surface unmigrated literals.
- **Subagent background-spawning flaked in Wave 2 of Phase 19** — 3 spawned `gsd-executor` agents returned "no Bash access" without attempting a tool call. Foreground spawning recovered cleanly. **Lesson:** if 2+ consecutive `run_in_background=true` agents fail with permission-decline before any tool call, switch to foreground for the wave; do not retry.

### Patterns Established

- **`Record<LocaleId, X>` lookup at render time** (`learnContent = LEARN_CONTENT[locale]`, `lockedCopy = LOCKED_COPY[locale]`, `uiStrings = UI_STRINGS[locale]`) is reference-stable enough for React; no memoization needed.
- **Per-palette commit cadence with B1 bisect-safe step granularity** (Phase 16.2 + 16.3): one commit per palette gradient or per palette redesign, each individually green-gated, enables cherry-pick or single-palette revert post-shipping.
- **Operator UAT as deviation source-of-truth**: Phase 17's Ring→Diamond swap, Phase 16.2's gradient retunes, Phase 19's translation fixes all came from operator-driven UAT findings post-implementation. Plan must accommodate a "fix-now-vs-defer" decision at the close checkpoint, not relegate translation/aesthetic UAT to "v1.x".
- **Decimal-phase insertion remains the right tool for emergent scope** — three inserts in v1.1 (16.1, 16.2, 16.3) all closed cleanly; insertion overhead is low because ROADMAP/STATE handles it.

### Key Lessons

1. **Auto-generated MILESTONES.md accomplishments are fragile** — the `milestone.complete` SDK call extracted "One-liner:" stubs for ~70% of phases because frontmatter format varied. Curated rewrite required.
2. **Frozen-EN guard works** — locked claim-safe copy stayed byte-identical through PT-BR translation churn (Phase 19) AND through the unrelated UAT translation deviation fix commit. The `.toBe()` assertion was the single line that prevented D-12 drift.
3. **Worktree merges with phantom deletions** — wave-2/3/4 executors committed their SUMMARY.md files to main directly while the worktree branch lacked them. The standard merge-loop deletion guard incorrectly blocked these as "files deleted in WT_BRANCH". Workaround: skip the deletion check when files match `*-SUMMARY.md` and validate post-merge via working-tree integrity.
4. **The `inSessionView` disable contract scales** — Phase 15 wrote it once (gear control), then Phase 17/18/19 reused it across 4 pickers without contract drift. Single-source UI gate pattern paid off.
5. **Locale-aware date formatting via optional argument** preserves Phase 4 D-19 minimal-diff invariant while still letting PT-BR users see Portuguese month names. `formatLastSessionDate(atMs, now?, locale?)` is backward-compatible.

### Cost Observations

- Model mix: ~90% sonnet (executor), 10% opus (orchestrator). Larger contexts via `--1M` not used for v1.1 — 200K window was sufficient with worktree isolation freshening each executor.
- Sessions: ~3 working sessions per phase from discuss→plan→execute→verify→close. Phase 19 took 1 long session due to manual UAT walkthrough mid-plan.
- Notable: subagent background-spawn flakiness in Phase 19 Wave 2 cost ~2 wasted spawns (no tool calls). Foreground recovery added ~10 min but produced clean results.

---

## Milestone: v1.2 — BPM Stretch

**Shipped:** 2026-05-15
**Phases:** 3 (20, 21, 22) | **Plans:** 8 | **Commits:** 80 (15 `feat`) | **Timeline:** ~1 day (2026-05-14 → 2026-05-15)

### What Was Built

- **Phase 20 — Session Start Polish:** Lead-in double-start prevention. The primary button relabels to `Cancel`/`Cancelar` during the lead-in countdown via a three-way ternary on an `inLeadIn` optional prop — a second click runs the existing cancel branch, so no `Start` affordance exists to double-fire (LEAD-01).
- **Phase 21 — Per-Theme Favicon:** Shared `faviconPalette` module (5 accent-strong colors + SVG template) + `useFavicon` orchestrator hook with dual-event cross-tab sync (`storage` + `hrv:prefs-changed`) and gated `matchMedia` system resolve; pre-paint inline script in `index.html` applies the persisted-theme favicon before first paint with no FOUC; `favicon.sync.test.ts` guards palette/`theme.css` drift (FAVI-01/02/03).
- **Phase 22 — BPM Stretch Session:** Piecewise-constant `stretchRamp.ts` ramp engine — sub-0.5-BPM step invariant, cycle-aligned segment table so BPM steps land only on Out→In boundaries — on the existing one-clock SessionFrame. Stretch settings persist via the existing forward-compat localStorage envelope with no `STATE_VERSION` bump; `sessionController` dispatches frame computation to the segment table; `SettingsForm` renders the Standard/Stretch mode picker + conditional 5-field block + gate hint + computed-total readout; `SessionReadout` shows the live BPM chip + stage label; App.tsx audio boundary effect computes per-cycle offsets so dual-anchor scheduling holds across the ramp (STRETCH-01..08).

### What Worked

- **Smallest-blast-radius ordering held.** Phase 20 (single button label) → Phase 21 (asset + DOM) → Phase 22 (engine + UI) sequenced the highest-risk work last. Phases 20 and 21 closed fast; Phase 22's risk was isolated as planned.
- **Stretch rode the one-clock contract unchanged.** The v1.0 "one accurate clock, many consumers" invariant absorbed the BPM ramp as a piecewise-constant segment table without a second clock or timing abstraction — the cycle-aligned segment table was the right shape to keep BPM steps on Out→In boundaries.
- **Dual-anchor audio survived the ramp.** Phase 3 D-13/D-14 dual-anchor scheduling held across every BPM step with only a per-cycle offset computation added — no per-segment cue variants needed. Third milestone the dual-anchor invariant has paid off (Phase 5.1 reconstruction, then v1.2 ramp).
- **Pre-paint inline-script pattern reused cleanly.** The favicon FOUC-prevention script mirrors the Phase 16 theme FOUC script — same `index.html` inline-script slot, same persisted-theme read. Sibling-of-an-existing-pattern again shipped fast.
- **Forward-compat envelope absorbed stretch settings with no schema bump.** Phase 8 D-01/D-04a spread-then-override read meant 4 new stretch fields persisted via per-field `coerceSettings` fallback — `STATE_VERSION` untouched.

### What Was Inefficient

- **Stretch UX was redesigned mid-checkpoint after implementation.** Operator UAT on Phase 22 rejected the planned minimum-duration gate and second-clock-style stage model; the redesign (gate removed, minute-based stages, stage renames) landed in commit `8eb35bd` after the feature was already built. The engine survived (segment table was the right primitive) but the settings surface and strings were reworked. **Lesson:** stretch/ramp UX assumptions (gating, stage vocabulary) needed an operator sketch-review *before* SettingsForm implementation, not after.
- **MILESTONES.md auto-accomplishments produced 3 `One-liner:` stubs again.** The `milestone.complete` SDK call extracted empty stubs for the 3 phases whose SUMMARY.md frontmatter used a different one-liner key/format. Same fragility flagged in the v1.1 retro — curated rewrite required both times.

### Patterns Established

- **Cycle-aligned segment table** for any piecewise-constant parameter ramp on the one-clock SessionFrame — discretize the change so it lands only on cycle boundaries, keeping every downstream consumer (visual, audio) coherent without re-anchoring mid-cycle.
- **Sync-guard test for cross-file constant drift** (`favicon.sync.test.ts`) — when a constant is duplicated across a TS module and a CSS file by necessity, a plain-regex parse test asserting equality blocks silent drift. Generalizes the v1.1 `theme.no-hardcoded-classes.test.ts` guard idea.
- **Pre-paint inline script** as the standard FOUC-prevention slot in `index.html` — theme (Phase 16) and favicon (Phase 21) both use it; any future persisted-visual-state read at load should follow.

### Key Lessons

1. **UX assumptions for novel interaction models need a pre-implementation operator checkpoint.** The stretch mode was a genuinely new interaction (multi-stage ramp config); the plan's gate + stage model was operator-rejected only at post-build UAT. New interaction models are exactly where a sketch/spec review earns its cost.
2. **The one-clock contract keeps absorbing new consumers.** v1.0 visuals/audio/wake-lock, v1.1 variants/timbres, now v1.2 BPM ramp — four milestones, zero parallel timers. Hold this line.
3. **`milestone.complete` accomplishment extraction is unreliable** — budget for a curated MILESTONES.md rewrite at every close until SUMMARY.md frontmatter one-liner keys are standardized.
4. **Skipping the milestone audit is viable for a small, fully-checked milestone.** v1.2 had 12/12 requirements checked and 3 phases each with SUMMARY + VERIFICATION; the operator chose to skip `/gsd-audit-milestone`. Acceptable when the requirement table is small and trace rows are current — but it removes the cross-phase integration check, so reserve the skip for low-phase-count milestones.

### Cost Observations

- Sessions: discuss → plan → execute → verify → close per phase; Phase 22 carried an extra session for the mid-checkpoint UX redesign.
- Notable: the only significant rework was the Phase 22 stretch-UX redesign — Phases 20 and 21 executed plan-as-written.
- Test growth: 712 → 839 (+127) across the 3 phases.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 7 | 30 | Established phase/plan/wave structure, decimal-phase insertion pattern, pre-close audit workflow |
| v1.0.1 | 6 | 12 | Strict TS + ESLint baseline as compiler floor; per-commit green-gate as invariant; `// Reason:` policy for hook-deps disables; worktree-mode merge protocol shaken out (untracked-file merge gotcha) |
| v1.1 | 10 | 47 | Worktree parallel waves with intra-wave `files_modified` overlap check; sibling-pattern verbatim cloning for picker/hook trios; `Record<LocaleId, X>` per-render lookup; frozen-EN byte-equality guard for locked copy; decimal-phase inserts (16.1, 16.2, 16.3) for emergent UAT-driven scope; locale-aware date formatter via optional arg (Phase 4 D-19 preserved) |
| v1.2 | 3 | 8 | Cycle-aligned segment table for piecewise-constant ramps on the one-clock SessionFrame; sync-guard test for cross-file constant drift; pre-paint inline-script standardized as the FOUC slot; milestone audit skipped for a small fully-checked milestone |

### Cumulative Quality

| Milestone | Tests | Test Files | LOC (src/) |
|-----------|-------|------------|------------|
| v1.0 | 363/363 pass | 27 | ~9,032 |
| v1.0.1 | 409/409 pass | 29 | ~10,925 |
| v1.1 | 712/712 pass | 54 | ~14,500 (est.) |
| v1.2 | 839/839 pass | — | ~19,161 |

### Top Lessons (Verified Across Milestones)

1. **Decimal-phase insertion handles emergent scope** — Phase 5.1 (v1.0), Phase 12 HYGIENE-01 docs-only flip (v1.0.1), and Phases 16.1/16.2/16.3 (v1.1) all proved mid-milestone reality can be honored without forcing literal-text adherence to the original ROADMAP.
2. **Pre-close audit is non-negotiable** — v1.0, v1.0.1, and v1.1 each caught real or apparent gaps before archival. v1.1 specifically demonstrated that human_needed UAT/VERIFICATION acknowledgments are explicit deferred-items entries, not silent passes.
3. **Cross-phase invariants must be made explicit in CONTEXT** — Phase 12 HYGIENE-01 → Phase 9 AUDIO-02 dependency (v1.0.1) and Phase 19 `format.ts` D-19 "untouched" invariant (v1.1) both proved that explicit carve-outs prevent regressions.
4. **Sibling-pattern verbatim cloning is the cheapest way to ship feature trios** — `useThemeChoice`/`useTimbreChoice`/`useVariantChoice`/`useLocaleChoice` and `ThemePicker`/`TimbrePicker`/`VariantPicker`/`LanguagePicker` (v1.1) all closed in 3–10 hours each because the mirror reference was load-bearing.
5. **Operator UAT is the source of truth for aesthetic + i18n + variant choices** — v1.1 saw operator-driven deviations in 3 phases (Ring→Diamond, palette retunes, PT-BR translation fixes). The orchestrator must accommodate fix-now deviations at the close checkpoint.
