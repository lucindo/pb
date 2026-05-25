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

## Milestone: v1.3 — Release Polish

**Shipped:** 2026-05-16
**Phases:** 5 (23, 24, 25, 26, 27) | **Plans:** 11 | **Timeline:** ~1 day (2026-05-15 → 2026-05-16)

### What Was Built

- **Phase 23 — License & README:** Net-new MIT `LICENSE` at the repo root + a v1.3-accurate README refresh — corrected BPM range and test count, complete Features list, real MIT-pointer License section (DOCS-01/02).
- **Phase 24 — Forrest Native-App Links:** Third Learn-dialog link section linking Forrest Knutson's iOS App Store and Google Play "Resonant Breathing" apps; neutral claim-safe copy, both EN and PT-BR, `rel="noopener noreferrer"` on every anchor (LEARN-01).
- **Phase 25 — Labels-vs-Icons Cue Toggle:** Three-option SettingsDialog cue picker (text labels / directional arrow icons / nose-airflow drawing) via a shared `CueGlyph` component threaded through all 3 visual variants; choice persists in the prefs envelope with no `STATE_VERSION` bump; visually-hidden localized In/Out announcement keeps arrow and drawing modes accessible (CUE-01/02/03).
- **Phase 26 — PT-BR Native-Speaker Review:** Operator-reviewed sweep of both `src/content/` catalogs — 98 `// TODO: native-speaker review` markers resolved to native quality (short `Puxa`/`Solta` labels kept for UI fit); new `content.no-review-markers.test.ts` fs-scan drift-guard locks the done-state (I18N-07).
- **Phase 27 — PWA Install & Offline:** `vite-plugin-pwa` wired as a build-time devDependency; `/hrv/`-scoped Web App Manifest with maskable + Apple touch icons; Workbox `generateSW` service worker precaches the app shell for full offline sessions; `autoUpdate` + `cleanupOutdatedCaches` rolls updates without a stale shell; dark orb-glow install icons; real-device iOS standalone UAT (iOS 18.7.9) passed all 6 scenarios (PWA-01/02/03).

### What Worked

- **Smallest-blast-radius ordering held a second milestone.** Docs → links → cue picker → i18n → PWA sequenced the highest-integration work (PWA service worker) last; the first four phases closed fast.
- **Build-time-only dependency kept the zero-runtime-deps invariant.** `vite-plugin-pwa` entered as a devDependency — `dependencies` stays `react` + `react-dom` for a fourth milestone. Tooling that ships nothing to the runtime bundle is the right way to add a capability under that invariant.
- **Real-device UAT drove a concrete fix.** The iOS standalone UAT exposed the light orb install icon washing out against neighboring home-screen icons; the operator-confirmed dark orb-glow redesign (commit `29425f1`) landed before final sign-off.
- **fs-scan drift-guard locked an i18n done-state.** `content.no-review-markers.test.ts` scans the content files for the review marker so the 98-marker cleanup cannot silently regress — the sync-guard idea (v1.2 `favicon.sync.test.ts`) generalized to a whole-file invariant.

### What Was Inefficient

- **ROADMAP.md drifted — it only ever contained phases 25–27.** Phases 23 and 24 were executed but never written into ROADMAP.md, so `milestone.complete` undercounted the milestone as 3 phases / 9 plans instead of the actual 5 / 11. The MILESTONES.md entry needed a manual correction. **Lesson:** keep every executed phase in ROADMAP.md, or the close-time CLI counts are wrong.
- **MILESTONES.md auto-accomplishments produced `One-liner:` / `CueGlyph` stubs again.** Third consecutive milestone the `milestone.complete` SUMMARY.md extraction failed — curated rewrite required every time.

### Patterns Established

- **Build-time-only dependency** for adding tooling-driven capability (PWA service worker) — keeps the runtime bundle and `dependencies` list unchanged; verify the dep lands in `devDependencies` at planning.
- **fs-scan drift-guard test** — when a cleanup removes every instance of a marker/pattern, a test that scans the source tree for that pattern locks the done-state against silent regression.

### Key Lessons

1. **ROADMAP.md must hold every executed phase.** Close-time tooling (`milestone.complete`) derives phase/plan counts from ROADMAP.md — missing phases silently undercount the milestone.
2. **`milestone.complete` accomplishment extraction is still unreliable** — budget a curated MILESTONES.md rewrite at every close until SUMMARY.md one-liner keys are standardized (flagged in v1.1, v1.2, now v1.3).
3. **A full-codebase review pairs well with a release-polish milestone close.** The 2026-05-16 deep review (4 parallel domain reviewers) found 0 critical / 23 warning / 28 info; all 23 warnings were fixed same-day, info deferred — a clean quality checkpoint before tagging.

### Cost Observations

- Sessions: discuss → plan → execute → verify → close per phase; plus one close-session full-codebase review + fix sweep.
- Notable: only rework was the post-UAT PWA icon redesign — the other four phases executed plan-as-written.
- Test growth: 839 → 959 (+120) across the 5 phases.

---

## Milestone: v1.4 — Install Helper

**Shipped:** 2026-05-16
**Phases:** 2 (28, 29) | **Plans:** 6 | **Timeline:** ~1 day (2026-05-16)

### What Was Built

- **Phase 28 — Phone Install Banner:** Phone-class + standalone detection hooks (`useIsStandaloneOrPhone` on `pointer: coarse` + `display-mode: standalone`/`navigator.standalone`; `useBeforeInstallPrompt` capturing and replaying the Android `beforeinstallprompt`); `InstallBanner` with the Android install-button path and the iOS inline-expand "Share → Add to Home Screen" steps; wired into `App.tsx` behind the composed `showBanner` gate; dismissal persisted in `localStorage` (`hrv:install-dismissed`) (INSTALL-01..05).
- **Phase 29 — Settings Install Entry & Localization:** Persistent `SettingsDialog` install row gated `installable && !isStandalone` (no `isPhone` check — desktop included); shared `IosInstallSteps` component extracted as the single source of truth for both install surfaces; `UiStrings.install.settingsLabel` + native-quality PT-BR install copy; install state prop-drilled from `App.tsx`. GAP-1 (iOS steps unreadable on dark themes) closed in plan 29-03 via a theme-aware `--color-breathing-muted` token (INSTALL-06/07).

### What Worked

- **Shared component caught a defect once and fixed it everywhere.** Extracting `IosInstallSteps` (D-06) meant the GAP-1 dark-theme readability fix landed in one file and corrected both `InstallBanner` and `SettingsDialog`.
- **Operator UAT caught a real defect automated tests structurally cannot.** JSDOM does not resolve CSS custom properties, so the unreadable iOS steps on dark themes passed every automated suite. Operator device UAT flagged it; gap-closure plan 29-03 closed it with a regression test pinning the token classes.
- **Gap-closure-as-plan kept the loop tight.** GAP-1 became a `gap_closure: true` plan (29-03) in the same phase rather than a new phase — discuss/plan overhead skipped, re-verification confirmed closure.
- **Zero net-new runtime dependencies held a fifth milestone.** All install UX is React + browser APIs; `dependencies` stays `react` + `react-dom`.

### What Was Inefficient

- **`milestone.complete` accomplishment extraction failed again** — Phase 28 SUMMARYs produced `One-liner:` stubs; curated MILESTONES.md rewrite required. Fourth consecutive milestone (flagged v1.1/v1.2/v1.3).
- **VALIDATION.md and SECURITY.md were not closed during execution.** `29-VALIDATION.md` stayed `status: draft` / `nyquist_compliant: false` despite the tests existing and passing; `29-SECURITY.md` was never created. The milestone audit caught both; `/gsd-validate-phase 29` and `/gsd-secure-phase 29` reconciled them at close (0 gaps, 8 accepted threats). Process artifacts, not functional gaps — but they should close inside the phase.
- **SUMMARY doc drift.** 28-01 SUMMARY listed 7 `UiStrings.install` fields (now 9); 28-03 described a `SafariNavigator`/`const isIOS` later superseded by Phase 29 CR-01. Code correct; SUMMARYs are stale snapshots.

### Patterns Established

- **Gap-closure plan (`gap_closure: true`) for UAT-surfaced defects** — a VERIFICATION.md gap becomes a single-phase plan, not a new phase; re-verification reruns after.
- **Shared presentational component as single source of truth** — when two surfaces render the same UI block, extract it so one fix (and one regression test) covers both.

### Key Lessons

1. **JSDOM cannot verify resolved CSS — theme/contrast defects need device UAT.** `getComputedStyle` returns the literal `var()` string; readability on a real theme background is only confirmable by a human. Budget human-verification items for any theme-token UI.
2. **Close VALIDATION.md and SECURITY.md inside the phase, not at milestone audit.** Both Phase 29 coverage docs were left stale/missing and only reconciled at close — the audit caught them, but that is the safety net, not the plan.
3. **`milestone.complete` accomplishment extraction remains unreliable** — fourth milestone running; the curated MILESTONES.md rewrite is now an expected close-time step until SUMMARY one-liner keys are standardized.

### Cost Observations

- Sessions: gap-closure execute (29-03) → verify → milestone audit → validate-phase + secure-phase → milestone close.
- Notable: the only execution rework was the GAP-1 dark-theme fix — both phases otherwise executed plan-as-written.
- Test growth: 959 → 997 (+38) across the 2 phases.

---

## Milestone: v1.5 — Multi-Practice

**Shipped:** 2026-05-19
**Phases:** 6 (30–35) | **Plans:** 27 | **Timeline:** ~3 days (2026-05-17 → 2026-05-19)

### What Was Built

- **Phase 30 — Multi-Practice Architecture & Switcher:** A `practice` concept above the existing `mode`; per-practice settings + stats persisted via a `STATE_VERSION` v1→v2 `migrateEnvelope` ladder folding returning users into `practices.resonant`; prototype-pollution-safe `src/storage/practices.ts`; top segmented `PracticeToggle` disabled during sessions; practice-aware split `SettingsForm` (PRACTICE-01..06).
- **Phase 31 — Navi Kriya Engine & Session:** The `useNKEngine` app-paced OM-counting machine (front/back phase machine, fixed 4:1 ratio, auto-advance), four synthesized cue sounds, a live OM count / phase / round readout, an end control, and per-practice Navi Kriya stats isolated from Resonant's (NK-01..09).
- **Phase 32 — Learn & Localization:** `learnContent.ts` restructured into a per-practice map over a shared base; `LearnDialog` made practice-aware; all new v1.5 copy reviewed to native-quality EN + PT-BR (LEARN-02/03, I18N-08).
- **Phase 33 — Close gap PRACTICE-02:** Inserted gap-closure phase — retargeted the resonant-settings read path from the dead flat `env.settings` field to the `practices.resonant.settings` envelope, removed dead `loadSettings`/`saveSettings`, added remount regression tests.
- **Phase 34 — Stretch as a Distinct Practice:** Promoted Stretch from an intra-HRV `mode` to a top-level practice — 3-pill switcher, a `STATE_VERSION` v2→v3 migration with a first-class `practices.stretch` slice, both switcher label treatments behind a developer-only `VITE_SWITCHER_TREATMENT` toggle; six gap-closure plans (34-06..34-11) closed verification + 3 UAT gaps (STRETCH-01..06; delivers Future requirement PRACTICE-F1).
- **Phase 35 — Flute Cue Timbre:** Replaced the windchime-clone Chime with the spike-008 Flute — harmonic 1·2·3 sine partials and a ~0.13 s soft breath attack via a new optional soft-attack envelope mode on `cueSynth` (strike stays default; Bowl/Bell/Sine byte-identical); `chime → flute` rename + storage coercion (AUDIO-01/02).

### What Worked

- **Spike-first blueprint paid off.** Three spikes preceded the milestone and were packaged into the `spike-findings-hrv` skill; the multi-practice architecture, the Navi Kriya engine tempo, and the switcher UX all landed close to their spiked designs with little replanning.
- **The `STATE_VERSION` migration ladder absorbed two schema bumps cleanly.** v1→v2 (Phase 30) and v2→v3 (Phase 34) chained without a returning-user data loss; each new practice slice was a localized, testable migration step.
- **Gap-closure-as-plan held under load.** Phase 34 alone absorbed six gap-closure plans (verification + 3 UAT gaps) inside the phase rather than spawning new phases — the loop stayed tight even when the gap count was high.
- **A milestone audit re-run caught real scope drift.** The first audit (2026-05-18) covered only Phases 30–32; appending Phases 33/34/35 invalidated it. The re-audit re-verified all 6 phases and confirmed the prior blocker (PRACTICE-02) was genuinely closed.
- **Zero net-new runtime dependencies held a sixth milestone.** The whole multi-practice build is React + Web Audio + `localStorage`.

### What Was Inefficient

- **The milestone grew past its own name.** Scoped as "Navi Kriya Practice" (2 practices), it shipped as "Multi-Practice" (3 practices) once Phases 34/35 were appended — STATE.md `milestone_name` stayed stale until close. Appended post-milestone phases are useful but the milestone identity should be renamed when they land, not at close.
- **`milestone.complete` accomplishment extraction failed a fifth time** — SUMMARY one-liner keys produced `One-liner:` / `RED:` / `vite.config.ts` stubs; the curated MILESTONES.md rewrite was again required.
- **Nyquist `VALIDATION.md` was not produced for the two appended phases.** Phases 33 and 35 shipped without `VALIDATION.md` — a documentation gap (the full suite is green), but the appended phases skipped the validation-doc step the core phases followed.
- **Phase 31 `VERIFICATION.md` frontmatter was never re-flipped** from `human_needed` to `passed` despite all 9 items being operator-confirmed in `31-HUMAN-UAT.md` — same procedural slip seen in v1.0/v1.1.
- **SUMMARY `requirements-completed` frontmatter was left empty** for every Phase 32/33/34/35 plan, weakening the 3-source audit cross-check.

### Patterns Established

- **Appended post-milestone phases** — Phases 33 (gap closure), 34 and 35 were appended to a roadmap whose original milestone was already scoped; a milestone can absorb new peer phases, but its name/frontmatter must be updated when it does.
- **Requirement amendment at audit** — NK-07 ("pause, resume, and end") was amended to end-only at the milestone audit once pause/resume was deliberately dropped; the audit is a valid place to reconcile a requirement with a shipped product decision, recorded inline in REQUIREMENTS.md.
- **Optional opt-in synth mode to protect byte-identical outputs** — the Flute's soft-attack envelope is an opt-in `cueSynth` mode so Bowl/Bell/Sine stay byte-identical; same shape as the v1.1 Bowl-default invariant.

### Key Lessons

1. **Rename the milestone when its scope changes.** A milestone that absorbs appended peer phases is no longer the thing it was scoped as — update `milestone_name` (and PROJECT.md / ROADMAP.md) when the phases land, so the close isn't the first time the name is corrected.
2. **Appended phases must follow the same artifact checklist as core phases.** Phases 33 and 35 skipped `VALIDATION.md`; the lighter-weight feel of an appended phase is not a license to skip coverage docs.
3. **Re-audit when phase scope changes after the audit.** The 2026-05-18 audit was invalidated by appended phases; re-auditing before close caught it. Treat any post-audit roadmap change as audit-invalidating.
4. **`milestone.complete` accomplishment extraction is reliably unreliable** — fifth milestone running; the curated MILESTONES.md rewrite is a permanent close-time step until SUMMARY one-liner keys are standardized.

### Cost Observations

- Sessions: 6 phases discuss→plan→execute→verify, plus a heavy Phase 34 gap-closure tail (6 plans), 9 quick/fast tasks, a re-audit, and milestone close.
- Notable: Phase 34 carried the most rework — 6 of its 11 plans were gap closure (1 verification + 3 UAT gaps spread across 34-06..34-11).
- Test growth: 997 → 1255 (+258) across the 6 phases — the largest single-milestone test gain since v1.1.

---

## Milestone: v2.0 — New Design

**Shipped:** 2026-05-25
**Phases:** 8 (36, 37, 38, 39, 40, 41, 44, 45 — 42/43 absorbed into 41) | **Plans:** 35 + 18 spike-loop items + 1 quick-task closeout | **Timeline:** 2026-05-20 → 2026-05-25 (6 days, ~335 commits) | **Tests:** 1255 → 1166 (–89 net; redundancy removal in 44-02 + dead-test deletions partly offset by spike-loop drift-guards)

### What Was Built

- **Phase 36 — Housekeeping reset:** Closed the entire v1.x procedural backlog in one bookkeeping sweep — Phase 12 VALIDATION+SECURITY backfill, Phase 33/35 Nyquist VALIDATION, Phase 31 VERIFICATION re-flip, SUMMARY frontmatter backfill for Phases 32–35, legacy `human_needed` flips for Phases 02/03/05/15/18, 28-01/28-03 SUMMARY drift recovered from git history, v1→v2→v3 chained `migrateEnvelope` regression test, root `CLAUDE.md` + `.claude/skills/spike-findings-hrv/` (22 files) removed, `.claude/` gitignored. Pushed to `origin/main` so the reset was publicly visible before any v2.0 build work.
- **Phase 37 — Anti-gamification stance:** Removed StatsFooter + ResetStatsDialog + Reset-stats Practice Settings affordance + dead formatters; preserved `recordSession()` computation + localStorage persistence; locked the deletion with `content.no-stats-ui.test.ts`.
- **Phases 38 + 39 — Vocabulary collapse:** Dropped Square/Diamond variants and Moss/Slate/Dusk palettes from code, tokens, picker, FOUC IIFE, EN/PT-BR i18n; persisted prefs coerce to `orb`/`system` (no STATE_VERSION bump); two new forbidden-token drift-guards.
- **Phase 40 — Audible timbre preview:** Singleton `previewContext.ts` AudioContext, resume-if-suspended dispatch, plays inhale cue once at A4 on every Timbre switch; preview cross-mute-irrelevance locked structurally by `previewContext.no-audioengine-import.test.ts` import-graph drift-guard.
- **Phase 41 — Spike 010 Mono Zen end-to-end (spike-loop J1–J18):** Mono Zen palettes (cool slate light + dark) with new `borderSoft`/`textSoft`/`onAccent`/`orbHalo1/2/3` tokens; self-hosted Inter Variable typography; 3-halo + centre disc orb with V1/V2 variants behind query-string flags; redesigned Idle + Running + Complete + Learn + App Settings (4-section layout); SetupCard + SettingsSheet + FeedbackTime + FeedbackCount primitives; desktop centered column (520/600/320 px); J18 final audit + 8-item orphan cleanup + drift-guard `content.no-removed-keys.test.ts`. Closed at `d2b886b`.
- **Phase 44 — Closeout polish:** `/gsd:code-review --all --fix` zeroed Warnings; 28 Info findings dispositioned; broad Tiger Style WHY-only comment audit; `SettingsRow` primitive extracted; 22-threat STRIDE security re-review; 9/9 POLISH verified; zero net-new runtime deps held.
- **Phase 45 — Ring progress-cue toggle (post-Phase-44 add-on):** Spike-011-validated bidirectional progress arc transcribed verbatim into `ProgressArcLayer`; `featureFlags.ringCue` threaded end-to-end; **default flipped to `progress-arc` post-UAT at operator request**; `?ringCue=outer-inner` reaches the prior rendering.
- **Versioned GitHub Pages deploy (quick-task 260525-hzq):** Tag-triggered multi-version deploy at `lucindo.github.io/hrv/` with `versions.json:official` as switchable root pointer; gotchas locked (short `vX.Y` tag form, explicit `v*` env tag policy, `[skip ci]` commit-back).

### What Worked

- **Spike-loop format absorbed Phases 41/42/43 into one.** The Mono Zen visual system is tightly coupled across all 5 surfaces; sequencing as 3 separate phases × N plans would have shipped surface-by-surface with broken intermediate states. The per-item propose/go/implement/approve 4-step loop kept operator-in-the-loop on every visual increment and absorbed mid-stream feedback dumps (J16 alone landed ~50 sub-commits this way). Per-commit green-gate held throughout.
- **Drift-guard for every deletion sweep.** Phases 37, 38, 39, 41 each landed a forbidden-token regex scan as the deletion's contract (`content.no-stats-ui` / `no-variants` / `no-removed-themes` / `no-removed-keys`). Plus 2 helper structural drift-guards (`previewContext.no-audioengine-import`, `favicon.sync`). Deletion is the deletion; the test is the contract that the deletion stays deleted.
- **Field deletion + coercer fallback beat STATE_VERSION migrations.** Persisted prefs with retired values (`variant: 'square'|'diamond'`, `theme: 'moss'|'slate'|'dusk'`) coerced to defaults on read via the existing Phase 8 D-01 envelope-tolerance contract — no STATE_VERSION bump, no migration ladder, no FOUC.
- **Query-string dev toggles over `VITE_*` env vars.** `?breathingShape=` / `?orbIdle=` / `?ringCue=` allow per-tab toggling without a rebuild. Operator decision at J5+J6 propose and applied again at Phase 45. Aliases supported case-insensitively with default-on-junk parsing.
- **Spike-locked values applied verbatim, no re-deciding.** The Phase 41 J1 palette hex, the Phase 45 ProgressArcLayer SVG math (viewBox 0 0 100 100, r = 49.7, sweep-flags 0/1, strokeWidth 2.5) — both transcribed byte-identically from the spike. Saved a class of mistake we'd made before (re-litigating spike-locked values as if they were OQ checkpoints).
- **Operator architectural rules locked into memory.** Five new operator-architectural rules saved at v2.0 (Design must not touch logic, Spike is design NOT features, Spike implementation fidelity, Spike-locked values are not decisions, No design locking, Propose-step checklist mandatory). These compound: every future propose step starts from a tighter contract.
- **Final POLISH as a real sweep, not a checkbox.** 7 plans, 9 POLISH requirements, 28 Info findings dispositioned, broad Tiger Style WHY-only comment audit, `SettingsRow` primitive extraction, 22-threat STRIDE re-review for new attack surfaces (preview audio, dev toggles, font asset). Zero open Warning findings at close.

### What Was Inefficient

- **Phase 41 SUMMARY frontmatter wasn't structured for `summary-extract`.** Most J-item SUMMARYs lack a clean `one_liner` field, so the milestone.complete CLI's auto-extracted accomplishments came back as garbage (`"One-liner:"` literals × ~16). Had to hand-curate the MILESTONES.md v2.0 entry. **Fix forward:** lock `one_liner: "..."` into the spike-loop SUMMARY template if the spike-loop format is reused.
- **Pre-flight audit skipped.** No `v2.0-MILESTONE-AUDIT.md` was created before close. v1.0/v1.0.1/v1.4/v1.5 had milestone audits; v1.1/v1.2/v1.3 didn't. v2.0 also didn't — and operator chose proceed-without-audit at close. **Fix forward:** run `/gsd:audit-milestone` proactively at the start of the close sequence so the audit either confirms readiness or surfaces gaps before bookkeeping starts.
- **Audit-open scanner mismatch on quick-task slugs and UAT statuses.** Operator finished 7 quick tasks via prefixed `<slug>-SUMMARY.md` files; the scanner needs a top-level literal `SUMMARY.md` with `status: complete` frontmatter to clear. Similarly, the UAT scanner only clears `status: complete` — `resolved` (the convention used by Phases 37/45) was reported as a gap. Both required a status-only file edit at milestone close. **Fix forward:** standardize on `status: complete` in the quick-task and UAT templates, OR widen the scanner's accepted statuses.
- **Phase 45 added post-milestone-tag.** The `v2.0` git tag was already on `591df88` (release commit for the versioned-Pages deploy) when Phase 45 work landed. Phase 45 commits are 2 commits ahead of the tag. The release is what users got; Phase 45 will sit between tags until the next tag triggers a re-deploy. **Fix forward:** decide tag-vs-phase semantics earlier — either tag after all milestone phases close, or treat post-tag work as the next milestone's seed.
- **`versions.json:official` still `v1.5` at v2.0 close.** Operator-deferred — v2.0 is reachable at `lucindo.github.io/hrv/v2.0/` but the root still defaults to v1.5. Worth promoting once v2.0 has live-user validation.

### Patterns Established

- **Spike-loop format** (per-item propose/go/implement/approve 4-step cycle, with state at `.planning/REFACTOR-LOOP-STATE.md`, resumes after `/clear` via stable prompt) — reusable for any tightly-coupled visual rewrite.
- **Propose-step checklist** — every propose step starts with Downstream Constraints + Applicable Memory Rules BEFORE Goal/Scope/Risk. No exceptions for "small" changes.
- **Field-deletion + coercer fallback** for retired prefs values — no STATE_VERSION bump needed when the envelope contract is already tolerant.
- **Forbidden-token regex drift-guard** as the contract for any deletion sweep — paired with the deletion itself in the same atomic commit.
- **Query-string dev toggles** with case-insensitive aliases + default-on-junk parsing in a central `featureFlags.ts` module — per-tab toggling without rebuild.
- **Versioned GitHub Pages deploy** — tag (`vX.Y` short form) → versioned subdirectory → `versions.json:official` selects root.

### Key Lessons

1. **Spike is design, NOT features.** Spike locks visuals / controls / colors only. Do NOT add features, move features between surfaces, or change the data model based on spike screens. Cue-sound toggle + Timbre relocation were mistakes that were rolled back. Now codified in operator memory.
2. **Design must not touch logic.** Design-only changes must not touch state machines, audio, persistence, business logic. Tests over a mixed monolith are NOT trustworthy as a design-isolation guarantee. Now an architectural rule.
3. **Spike-locked values are not decisions.** When a spike already locked a hex / value / formula, apply verbatim and quietly relax downstream guards. Never re-surface as an OQ checkpoint. Phase 41 J1 palette and Phase 45 ProgressArcLayer math both followed this.
4. **No design locking in tests/code/comments.** Tests must not anchor downstream-modifiable values (Tailwind classes, hex, design tokens, deleted-code refs, stale future-tense notes). Phase 44-02 explicitly removed these.
5. **Per-item operator-in-the-loop scales better than per-plan for tightly-coupled work.** 18 J-items beat sequencing 3 phases × N plans for a visual system that needed coherent intermediate states. Choose format by coupling, not by phase count.
6. **Pre-close audit catches what the scanner doesn't.** Even without the formal `/gsd:audit-milestone`, surfacing audit-open + the 85/85 actionable-requirement count to the operator at close start prevented silent gaps.

### Cost Observations

- Sessions: 8 phases discuss→plan→execute→verify, with Phase 41 running as a single 18-item spike-loop session, plus the post-Phase-44 add-on Phase 45 (3 plans), plus 7 quick tasks closed at close, plus a versioned Pages deploy quick-task, plus this milestone close.
- Notable: Phase 41 alone landed ~100+ atomic commits across J1–J18; J16 (the feedback dump consolidation) accounted for ~50 of those.
- Phase 44 polish across 7 plans was the largest closeout sweep yet — `/gsd:code-review --all --fix` mega-commit + 28 Info dispositions + broad WHY-only comment audit + primitive extraction + 22-threat security re-review.
- Test count net reduction (1255 → 1166) is the first milestone where the test count went DOWN — driven by Phase 44-02's intra-file redundancy removal and dead-test deletions across the deletion-sweep phases. Net quality is higher despite lower count: 7 new drift-guards locked deletion contracts.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 7 | 30 | Established phase/plan/wave structure, decimal-phase insertion pattern, pre-close audit workflow |
| v1.0.1 | 6 | 12 | Strict TS + ESLint baseline as compiler floor; per-commit green-gate as invariant; `// Reason:` policy for hook-deps disables; worktree-mode merge protocol shaken out (untracked-file merge gotcha) |
| v1.1 | 10 | 47 | Worktree parallel waves with intra-wave `files_modified` overlap check; sibling-pattern verbatim cloning for picker/hook trios; `Record<LocaleId, X>` per-render lookup; frozen-EN byte-equality guard for locked copy; decimal-phase inserts (16.1, 16.2, 16.3) for emergent UAT-driven scope; locale-aware date formatter via optional arg (Phase 4 D-19 preserved) |
| v1.2 | 3 | 8 | Cycle-aligned segment table for piecewise-constant ramps on the one-clock SessionFrame; sync-guard test for cross-file constant drift; pre-paint inline-script standardized as the FOUC slot; milestone audit skipped for a small fully-checked milestone |
| v1.3 | 5 | 11 | Build-time-only dependency for tooling-driven capability (zero runtime deps held a 4th milestone); fs-scan drift-guard test locks cleanup done-states; full-codebase parallel review at milestone close; ROADMAP.md drift undercounted phases at close |
| v1.4 | 2 | 6 | Gap-closure plan (`gap_closure: true`) for UAT-surfaced defects within the phase; shared presentational component as single source of truth (one fix covers both surfaces); VALIDATION/SECURITY docs left stale, reconciled by audit at close |
| v1.5 | 6 | 27 | Spike-first blueprint packaged as a skill; chained `STATE_VERSION` migration ladder (v1→v2→v3); appended post-milestone peer phases (33/34/35); requirement amended at audit (NK-07 end-only); milestone re-audit after post-audit scope change; milestone outgrew its scoped name |
| v2.0 | 8 | 35 + 18 spike-loop items | Spike-loop format (per-item propose/go/implement/approve) absorbed 3 phases into 1; field-deletion + coercer fallback beat STATE_VERSION migrations for retired prefs; forbidden-token drift-guards as deletion contracts; query-string dev toggles over `VITE_*` env vars; 5 operator architectural rules locked into memory (design-must-not-touch-logic, spike-is-design-NOT-features, spike-implementation-fidelity, spike-locked-values-are-not-decisions, no-design-locking, propose-step-checklist); versioned GitHub Pages deploy; post-tag phase added (Phase 45 lands after `v2.0` tag); first milestone with test count NET REDUCTION (1255 → 1166) driven by intra-file redundancy removal |

### Cumulative Quality

| Milestone | Tests | Test Files | LOC (src/) |
|-----------|-------|------------|------------|
| v1.0 | 363/363 pass | 27 | ~9,032 |
| v1.0.1 | 409/409 pass | 29 | ~10,925 |
| v1.1 | 712/712 pass | 54 | ~14,500 (est.) |
| v1.2 | 839/839 pass | — | ~19,161 |
| v1.3 | 959/959 pass | 65 | — |
| v1.4 | 997/997 pass | 70 | — |
| v1.5 | 1255/1255 pass | — | ~28,933 |
| v2.0 | 1166/1166 pass | 108 | ~30,096 |

### Top Lessons (Verified Across Milestones)

1. **Decimal-phase insertion handles emergent scope** — Phase 5.1 (v1.0), Phase 12 HYGIENE-01 docs-only flip (v1.0.1), and Phases 16.1/16.2/16.3 (v1.1) all proved mid-milestone reality can be honored without forcing literal-text adherence to the original ROADMAP.
2. **Pre-close audit is non-negotiable** — v1.0, v1.0.1, and v1.1 each caught real or apparent gaps before archival. v1.1 specifically demonstrated that human_needed UAT/VERIFICATION acknowledgments are explicit deferred-items entries, not silent passes.
3. **Cross-phase invariants must be made explicit in CONTEXT** — Phase 12 HYGIENE-01 → Phase 9 AUDIO-02 dependency (v1.0.1) and Phase 19 `format.ts` D-19 "untouched" invariant (v1.1) both proved that explicit carve-outs prevent regressions.
4. **Sibling-pattern verbatim cloning is the cheapest way to ship feature trios** — `useThemeChoice`/`useTimbreChoice`/`useVariantChoice`/`useLocaleChoice` and `ThemePicker`/`TimbrePicker`/`VariantPicker`/`LanguagePicker` (v1.1) all closed in 3–10 hours each because the mirror reference was load-bearing.
5. **Operator UAT is the source of truth for aesthetic + i18n + variant choices** — v1.1 saw operator-driven deviations in 3 phases (Ring→Diamond, palette retunes, PT-BR translation fixes). The orchestrator must accommodate fix-now deviations at the close checkpoint.
