# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + 5.1 (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- ✅ **v1.1 Customization** — Phases 13–19 (shipped 2026-05-15)
- ✅ **v1.2 BPM Stretch** — Phases 20–22 (shipped 2026-05-15)
- ✅ **v1.3 Release Polish** — Phases 23–27 (shipped 2026-05-16)
- ✅ **v1.4 Install Helper** — Phases 28–29 (shipped 2026-05-16)
- ✅ **v1.5 Multi-Practice** — Phases 30–35 (shipped 2026-05-19)
- 🔨 **v2.0 New Design** — Phases 36–44 (in progress)

## Phases

### v2.0 New Design (Phases 36–44)

> **Reconciliation note (2026-05-25):** The originally-planned Phases 41 / 42 / 43 (Mono Zen palette+tokens / New orb / Five-surface redesign) were delivered as a single tightly-coupled spike-loop implementation (items J1-J18, 2026-05-24) — see Phase 41 below for the absorbed scope. The 42/43 numbering gaps are kept intentionally to preserve the audit trail. Phase 44 (POLISH) remains as a separate planned phase.

- [x] **Phase 36: Housekeeping bookkeeping reset** (9 plans) - Retroactively close the v1.x procedural backlog (Phase 12 VALIDATION + SECURITY, Phase 33/35 Nyquist VALIDATION, Phase 31 VERIFICATION re-flip, SUMMARY frontmatter backfill, legacy human_needed flips, 28-01/28-03 SUMMARY drift, v1→v2→v3 chained-migration regression test), remove root `CLAUDE.md` + `.claude/skills/spike-findings-hrv/`, gitignore `.claude/`, push to origin/main
- [x] **Phase 37: Stats UI removal** (3 plans) - Remove `StatsFooter`, `ResetStatsDialog`, and the Practice Settings "Reset stats" affordance; keep `recordSession` computation + localStorage persistence intact (shipped 2026-05-21)
- [x] **Phase 38: Variant removal** (4 plans) - Drop the Square + Diamond shape variants from code/tokens/picker/Start-capture refs; coerce persisted `variant: 'square'|'diamond'` to `'orb'`
- [x] **Phase 39: Theme simplification** (5 plans) - Remove Moss/Slate/Dusk palettes; reduce ThemePicker to Light/Dark/System; coerce persisted theme outside `{light, dark, system}` to `'system'`; regenerate WCAG guard (shipped 2026-05-21)
- [x] **Phase 40: Timbre preview cue** (4 plans) - Switching the Timbre selection in App Settings plays the inhale cue once at the current pitch via the existing `cueSynth` scheduler (preview plays even when muted) (shipped 2026-05-21)
- [x] **Phase 41: Spike 010 Mono Zen — full implementation** (spike-loop items J1-J18 + architecture refactor loop items A-I) - Absorbed the originally-planned Phases 41 (palette+tokens), 42 (new orb), and 43 (five-surface redesign) into a single tightly-coupled implementation. Delivered: Mono Zen light + dark palettes with new `borderSoft`/`textSoft`/`orbHalo1/2/3`/`onAccent` tokens; self-hosted Inter Variable typography; 3-halo + centre disc orb with V1/V2 variants behind query-string flags (operator decision — NOT VITE_*); idle orb states (still/ambient); SetupCard + SettingsSheet + FeedbackTime + FeedbackCount primitives; 4-section App Settings page (Appearance/Language/Feedback/About); desktop responsive (520/600 px columns + 320 px orb); LOCKED_COPY carry-through verified J17; J18 final audit + orphan cleanup + drift-guard. **Deviations:** install banner V3 (UX-12/13/14) dropped entirely per operator J13 decision — install kept only in App Settings. Shipped 2026-05-25 at commit `d2b886b`. See `.planning/phases/41-spike-mono-zen/`.
- [ ] **Phase 44: Final polish** (TBD plans) - Full-codebase `/gsd-code-review --all --fix` sweep, disposition the 28 Info-severity findings from 2026-05-16, test-name cleanup, Tiger Style WHY-only comment audit, refactoring + security re-review + readability pass, zero-Warning closeout. **Carries forward from Phase 41:** lint debt from Phase 40 (55 errors / 4 warnings on `main`, +2/+1 vs pre-Phase-40 baseline, all in `previewContext.test.ts`); plus the broad code review sweep against the redesigned codebase.

<details>
<summary>✅ v1.5 Multi-Practice (Phases 30–35) — SHIPPED 2026-05-19</summary>

- [x] Phase 30: Multi-Practice Architecture & Switcher (4/4 plans)
- [x] Phase 31: Navi Kriya Engine & Session (6/6 plans)
- [x] Phase 32: Learn & Localization (3/3 plans)
- [x] Phase 33: Close gap — PRACTICE-02 resonant settings persistence (1/1 plans)
- [x] Phase 34: Stretch as a Distinct Practice (11/11 plans)
- [x] Phase 35: Flute Cue Timbre (2/2 plans)

Full detail: `.planning/milestones/v1.5-ROADMAP.md`
</details>

<details>
<summary>✅ v1.4 Install Helper (Phases 28–29) — SHIPPED 2026-05-16</summary>

- [x] Phase 28: Phone Install Banner (3/3 plans)
- [x] Phase 29: Settings Install Entry & Localization (3/3 plans)

Full detail: `.planning/milestones/v1.4-ROADMAP.md`
</details>

<details>
<summary>✅ v1.3 Release Polish (Phases 23–27) — SHIPPED 2026-05-16</summary>

- [x] Phase 23: License & README (1/1 plans)
- [x] Phase 24: Forrest Native-App Links (1/1 plans)
- [x] Phase 25: Labels-vs-Icons Cue Toggle (5/5 plans)
- [x] Phase 26: PT-BR Native-Speaker Review (1/1 plans)
- [x] Phase 27: PWA Install & Offline (3/3 plans)

Full detail: `.planning/milestones/v1.3-ROADMAP.md`
</details>

Earlier milestones (v1.0 → v1.2) are archived under `.planning/milestones/` — see `v1.x-ROADMAP.md` and `v1.x-REQUIREMENTS.md` for each.

## Phase Details

### Phase 36: Housekeeping bookkeeping reset
**Goal**: Close the entire v1.x procedural backlog in one bookkeeping sweep and reset the GSD baseline for v2.0 — restore the v1.5 phase dirs from git, backfill the missing artifacts, drop dead `.claude/` content from the repo, then push to `origin/main` so the reset is visible.
**Depends on**: Nothing (first phase of v2.0)
**Requirements**: HOUSE-01, HOUSE-02, HOUSE-03, HOUSE-04, HOUSE-05, HOUSE-06, HOUSE-07, HOUSE-08, HOUSE-09, HOUSE-10, HOUSE-11, HOUSE-12, HOUSE-13, HOUSE-14
**Success Criteria** (what must be TRUE):
  1. `/gsd-validate-phase 33` and `/gsd-validate-phase 35` both report a present `VALIDATION.md` with status `passed`; Phase 12 has both a `VALIDATION.md` and a `SECURITY.md` written from `12-01-PLAN.md` and `/gsd-secure-phase 12` (HOUSE-01..04).
  2. No `VERIFICATION.md` in the v1.x phase set carries status `human_needed` — Phases 02, 03, 05, 15, 18, 31 all read `passed`; SUMMARY `requirements-completed` frontmatter is populated for Phases 32, 33, 34, 35; 28-01 / 28-03 SUMMARYs no longer drift from the canonical code (HOUSE-05..08).
  3. A new `storage` test exercises the v1 → v3 chained `migrateEnvelope` ladder in a single read (returning user with a v1 flat envelope lands in a `v3` `practices.{resonant,stretch,navi}` envelope losslessly); the v1.5 phase directories are re-archived to `.planning/milestones/v1.5-phases/` with a clean working tree (HOUSE-09, HOUSE-10).
  4. The root `CLAUDE.md` and the entire `.claude/skills/spike-findings-hrv/` directory (22 tracked files) are removed from the repo; `.claude/` is in `.gitignore` so per-project Claude Code files no longer get re-committed (HOUSE-11..13).
  5. All Phase 36 commits are pushed to `origin/main` at phase close (no source changes — bookkeeping only), so the GSD baseline reset is publicly visible before any v2.0 build work starts (HOUSE-14).
**Plans**: 9 plans
- [x] 36-01-PLAN.md — Restore v1.5 phase directories from HEAD (HOUSE-10 prep)
- [x] 36-02-PLAN.md — Backfill Phase 12 VALIDATION + SECURITY and Phase 33/35 VALIDATION (HOUSE-01..04)
- [x] 36-03-PLAN.md — Re-flip VERIFICATION status human_needed → passed for phases 02/03/05/15/18/31 (HOUSE-05, HOUSE-07)
- [x] 36-04-PLAN.md — Populate SUMMARY requirements-completed frontmatter for phases 32/33/34/35 (HOUSE-06)
- [x] 36-05-PLAN.md — Recover and correct 28-01/28-03 SUMMARY drift (HOUSE-08)
- [x] 36-06-PLAN.md — Add v1→v3 chained migrateEnvelope regression test (HOUSE-09)
- [x] 36-07-PLAN.md — Re-archive v1.5 phase dirs to .planning/milestones/v1.5-phases/ (HOUSE-10)
- [x] 36-08-PLAN.md — Drop root CLAUDE.md + .claude/skills/spike-findings-hrv/ and gitignore .claude/ (HOUSE-11..13)
- [x] 36-09-PLAN.md — Green-gate and push to origin/main (HOUSE-14)

### Phase 37: Stats UI removal
**Goal**: Implement the spike-010 anti-gamification stance — remove every visible stats surface from the app while preserving the computation and localStorage persistence so a future deliberate decision can re-introduce a calm stats display.
**Depends on**: Phase 36
**Requirements**: STATS-01, STATS-02, STATS-03, STATS-04, STATS-05
**Success Criteria** (what must be TRUE):
  1. `StatsFooter.tsx` and `ResetStatsDialog.tsx` are gone from the app shell and from every consumer import; the "Reset stats" affordance is removed from Practice Settings (STATS-01..03).
  2. Completing a session, reloading the app, and inspecting the localStorage envelope shows `recordSession()` still incremented per-practice stats — a regression test locks this behavior (STATS-04).
  3. A full audit of Idle, Running, Complete, Learn, and App Settings surfaces shows no "12 MIN TODAY · STREAK 5d" style readout or any equivalent visible stat (STATS-05).
**Plans**: 3 plans
- [x] 37-01-PLAN.md — Delete StatsFooter + ResetStatsDialog components, App.tsx consumers, stats i18n, and reset-stats test branches (STATS-01..03 / D-01 D-04 D-06 D-07 D-12)
- [x] 37-02-PLAN.md — Delete dead-code data layer (resetPracticeStats, formatLastSession), verify orphan formatters, add STATS-04 record-and-persist regression (STATS-03 STATS-04 / D-02 D-03 D-05 D-08)
- [x] 37-03-PLAN.md — Add STATS-05 drift-guard test in src/content/content.no-stats-ui.test.ts and run the closing green gate (STATS-05 / D-09 D-10 D-11)

### Phase 38: Variant removal
**Goal**: Reduce the shape vocabulary to Orb-only — drop Square and Diamond from code, tokens, picker, and Start-capture, so the Phase 42 orb rewrite has exactly one shape to dispatch to.
**Depends on**: Phase 37
**Requirements**: VAR-01, VAR-02, VAR-03, VAR-04, VAR-05, VAR-06
**Success Criteria** (what must be TRUE):
  1. `BreathingShape.tsx` and the `Variant` union no longer reference `Square` or `Diamond`; the `sessionVariantRef` Start-capture invariant is gone since there is one shape (VAR-01, VAR-02, VAR-04).
  2. The user `SettingsDialog` has no visible variant picker (VAR-03).
  3. A returning user with persisted `variant: 'square'` or `variant: 'diamond'` lands on `'orb'` via `coerceSettings` — no `STATE_VERSION` bump, no FOUC, no broken UI (VAR-05).
  4. A repo-wide search for variant-specific tokens / CSS classes / EN+PT-BR strings / test fixtures returns zero leftover references (VAR-06).
**Plans**: 4 plans
- [x] 38-01-PLAN.md — Delete SquareShape / DiamondShape / VariantPicker / BreathingShape + their hooks; collapse 3 App.tsx call sites to <OrbShape />; collapse NKShape dispatcher to OrbShape-only (VAR-01 VAR-02 VAR-04 partial / D-02 D-03 D-09)
- [x] 38-02-PLAN.md — Delete VisualVariantId / VARIANT_OPTIONS / coerceVariant + prefs.variant field; strip variant i18n surface (UiStrings.variants + variantLabel; EN+PT-BR catalogs); SettingsDialog Pick union token; prefs.test + strings.test + App.session.test variant cases (VAR-03 VAR-05 / D-01 D-08 D-10)
- [x] 38-03-PLAN.md — Strip sessionVariantRef + sessionVariant + liveVariant + VisualVariantId import from App.tsx; delete [data-variant='square'|'diamond'] CSS blocks from theme.css; align App.test + App.locale.test fixtures to 4-field UserPrefs (VAR-04 / D-03 D-10)
- [x] 38-04-PLAN.md — Add VAR-06 drift-guard test src/content/content.no-variants.test.ts (4-root scan, .css filter, 14-token forbidden list); run closing green gate (VAR-06 / D-04 D-05 D-06 D-07)

### Phase 39: Theme simplification
**Goal**: Collapse the 5-palette theme system to Light / Dark / System, so the Phase 41 Mono Zen palette only replaces two palettes plus a system follow.
**Depends on**: Phase 37 (so the stats footer is gone before themed tokens are re-shuffled)
**Requirements**: THM-01, THM-02, THM-03, THM-04, THM-05, THM-06, THM-07, THM-08
**Success Criteria** (what must be TRUE):
  1. `theme.css` and the `ThemeId` union contain only `light` / `dark` / `system`; Moss, Slate, and Dusk are deleted (THM-01..04).
  2. The user-visible `ThemePicker` renders exactly three options — Light, Dark, System — and `System` resolves to the OS-active palette (THM-04).
  3. A returning user with persisted `theme: 'moss'`, `'slate'`, or `'dusk'` lands on `'system'` on read and re-persists as `'system'` going forward (THM-05).
  4. The `faviconPalette` set is reduced to `light` + `dark`; `favicon.sync.test.ts` guards the new 2-palette mapping; the persisted-theme favicon applies pre-paint with no FOUC (THM-06, THM-07).
  5. The WCAG luminance contrast guard regenerates against the new 2-palette + system surface and passes (THM-08).
**Plans**: 5 plans
- [x] 39-01-PLAN.md — Domain type collapse + prefs.test.ts THM-05 lock (THM-01..05 / D-01 D-02)
- [x] 39-02-PLAN.md — Delete moss/slate/dusk CSS blocks + collapse FAVICON_COLORS + align contrast and favicon.sync tests (THM-01..03 THM-06..08 / D-09 D-10)
- [x] 39-03-PLAN.md — Delete themes.moss/slate/dusk from UiStrings + EN/PT-BR catalogs + rotate ThemePicker/hook/App test fixtures (THM-04 / D-07 D-12)
- [x] 39-04-PLAN.md — Surgical excise moss/slate/dusk from index.html FOUC script (THM-07 / D-08)
- [x] 39-05-PLAN.md — Add Phase 39 drift-guard test + closing green gate (THM-01..03 / D-03 D-04 D-05 D-06) (completed 2026-05-21)

### Phase 40: Timbre preview cue
**Goal**: Switching the Timbre selection in App Settings plays the inhale cue once at the current pitch — operator-added requirement, lands the audio surface change before the visual rebuild starts.
**Depends on**: Phase 36 (independent of 37/38/39 — placed here so the audio surface change lands before TOK)
**Requirements**: PREV-01, PREV-02, PREV-03, PREV-04, PREV-05
**Success Criteria** (what must be TRUE):
  1. Selecting a different Timbre in App Settings plays the inhale-only cue once at the current pitch — no looping, no exhale cue (PREV-01).
  2. The preview routes through the existing `cueSynth` scheduler (same code path as in-session cues — no duplicated audio code) (PREV-02).
  3. The preview plays even when the `MuteToggle` is muted (it is a preview, not a session cue — operator can audition without unmuting), and the preview is suppressed during an active session (PREV-03, PREV-04).
  4. Preview latency from picker tap to first audio sample is ≤ 100 ms on commodity hardware (PREV-05).
**Plans**: 4 plans
- [x] 40-01-PLAN.md — Create previewContext.ts singleton module + unit tests (PREV-02 PREV-05 / D-01 D-02 D-03 D-06 D-10a-d D-12)
- [x] 40-02-PLAN.md — Lock PREV-03 via structural import-graph drift-guard (PREV-03 / D-11 D-15)
- [x] 40-03-PLAN.md — Wire TimbrePicker onClick to playInhalePreview + wiring tests (PREV-01 PREV-04 / D-04 D-05 D-09 D-10e-g)
- [x] 40-04-PLAN.md — Add 40-HUMAN-UAT.md with 4 empirical items (PREV-01 PREV-03 PREV-05 / D-08 D-13)

### Phase 41: Spike 010 Mono Zen — full implementation
**Goal**: Implement the spike-010 Monochrome Zen visual system end-to-end across all 5 app surfaces. Absorbs the originally-planned Phases 41 (palette + tokens), 42 (new orb), and 43 (five-surface redesign) into a single tightly-coupled implementation using a spike-loop format (per-item propose/go/implement/approve 4-step cycle), with the architecture refactor loop (items A-I) as preparation.
**Depends on**: Phase 39 (theme set collapsed) + Phase 38 (variants removed) + Phase 37 (StatsFooter gone) + Phase 40 (timbre preview wiring intact through redesign)
**Requirements**: TOK-01..08, ORB-01..11, UX-01..22 (less UX-12/13/14 dropped per operator J13 decision), POLISH-07 (partial), POLISH-08, POLISH-09
**Success Criteria** (what must be TRUE):
  1. Mono Zen light + dark palettes applied in `theme.css` (cool slate); new tokens `borderSoft` / `textSoft` / `onAccent` / `orbHalo1/2/3` consumed across components; legacy orb gradient + ring tokens removed; WCAG luminance contrast guard regenerated and green (TOK-01..08).
  2. Orb rebuilt as 3-layer translucent halo + solid centre disc with asymmetric organic-puddle border-radii; In/Out breath label inside disc in `onAccent`; V1 (orb-halo) + V2 (minimal) variants ship behind **query-string** flag `?breathingShape=` (operator deviation from VITE_*); idle states `?orbIdle=still|ambient` (operator deviation); ring cues preserved (outer always during Running, inner during exhale, both hidden on Idle + Complete); `MuteToggle` chrome aligned to `borderSoft` + `textSoft` with no shadow (ORB-01..11).
  3. All 5 surfaces redesigned: new App Settings page (4 sections — Appearance / Language / Feedback / About); Idle V1 Grid SetupCard (whole-card tap → SettingsSheet); SettingsSheet primitive responsive (bottom-sheet mobile / center-modal desktop); per-practice Running feedback (HRV `FeedbackTime`; Stretch + Navi `FeedbackCount`); Complete screen (checkmark orb + "Session complete" + "Take a moment" + Done — kept, not dropped); Learn restructured to SectionHeader + SectionCard pattern; desktop centered column (520 px practice / 600 px page / 320 px orb); no-jiggle invariant across all phases + practices; `LOCKED_COPY` strings verified verbatim across redesign (UX-01..11, UX-15..22).
  4. **Install banner V3 NOT implemented** — operator J13 decision dropped UX-12/13/14 per [[v2-carryforward-disposition]]; install stays only in App Settings → About → Install row, re-tokenized in J18.6 to Mono Zen quieter pairing.
  5. J18 final audit closed: 8-item orphan cleanup queue swept (dead components Card / BooleanToggle / StatusPanel deleted; dead viewmodel fields + 6 i18n keys + helper deleted; install LOCKED_COPY orphans trimmed; SettingsInstallSection re-tokenized; drift-guard `content.no-removed-keys.test.ts` locks the deletion done-state and was canary-tested); spike-fidelity walkthrough across all 5 surfaces green; per-commit green-gate maintained throughout (POLISH-07 partial, POLISH-08, POLISH-09).
**Plans**: spike-loop items J1-J18 (J7 skipped) — see `.planning/phases/41-spike-mono-zen/41-SPIKE-LOOP-ARCHIVE.md` for the per-item history; architecture-prep in `.planning/REFACTOR-LOOP-STATE.md` (items A-I).
**UI hint**: yes
**Shipped**: 2026-05-25 (J18 closed at commit `d2b886b` 2026-05-24T23:40)
**Status**: ✅ done

### Phase 44: Final polish
**Goal**: Closeout sweep against the full v2.0 surface — zero open Warning-severity findings, dispositioned Info backlog, tight test names, Tiger Style WHY-only comments, refactoring + security re-review + readability pass, with the zero-net-new-runtime-deps and per-commit green-gate invariants intact.
**Depends on**: Phase 36, 37, 38, 39, 40, 41 (sweeps the entire milestone — 42/43 absorbed into 41)
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06, POLISH-07, POLISH-08, POLISH-09
**Success Criteria** (what must be TRUE):
  1. A full `/gsd-code-review --all --fix` sweep finishes with zero Warning-severity findings open at milestone close (POLISH-01).
  2. Each of the 28 Info-severity findings from the 2026-05-16 deep review is dispositioned — fixed, deferred with reason, or marked obsolete by the v2.0 redesign — and the disposition is recorded in the phase artifacts (POLISH-02).
  3. A repo-wide comment audit returns no narration-of-WHAT comments — only WHY-comments (constraints, invariants, surprising behavior, workarounds) survive; Vitest test names are tight with no redundant cases, the final test count is recorded, and no flake surfaces in the close sweep (POLISH-03, POLISH-04).
  4. `/gsd-secure-phase 44` runs against the full milestone surface and clears the new attack surfaces (preview audio path, new env vars, dev toggles); a readability pass leaves no leftover references to Square/Diamond/Moss/Slate/Dusk/Chime in code or copy (POLISH-05..07).
  5. `dependencies` in `package.json` remains `react` + `react-dom` (zero net-new runtime deps), and `tsc && lint && build && test` exits 0 on every commit on `main` through v2.0 (POLISH-08, POLISH-09).
**Plans**: 7 plans
- [x] 44-01-PLAN.md — Code-review --all --fix mega-commit + 28 Info-finding dispositions (POLISH-01, POLISH-02)
- [x] 44-02-PLAN.md — Test cleanup: tight Vitest names + redundancy removal + no-design-locking sweep + flake check (POLISH-03)
- [x] 44-03-PLAN.md — Tiger Style WHY-only comment audit (broad sweep — Item I sibling-pattern lesson) (POLISH-04)
- [ ] 44-04-PLAN.md — Refactor pass: reconcile obsolete .orb-layer rename + extract SettingsRow primitive (POLISH-05)
- [ ] 44-05-PLAN.md — Readability remainder: zero leftover Square/Diamond/Moss/Slate/Dusk/Chime refs (POLISH-07)
- [ ] 44-06-PLAN.md — Security re-review: 44-SECURITY.md covering preview audio + query-string toggles + font asset surfaces (POLISH-06)
- [ ] 44-07-PLAN.md — Invariant verification: zero net-new deps + per-commit green-gate held + 44-VERIFICATION.md (POLISH-08, POLISH-09)

## Progress

**Execution Order:**
Phases executed in numeric order: 36 → 37 → 38 → 39 → 40 → 41 → 44 (42/43 absorbed into 41 — see reconciliation note at top of v2.0 phases block).

| Milestone | Phase | Plans Complete | Status | Completed |
| --------- | ----- | -------------- | ------ | --------- |
| v1.0 MVP | 1–6, 5.1 | All | Complete | 2026-05-11 |
| v1.0.1 Code Review Patch | 7–12 | All | Complete | 2026-05-12 |
| v1.1 Customization | 13–19 | All | Complete | 2026-05-15 |
| v1.2 BPM Stretch | 20–22 | All | Complete | 2026-05-15 |
| v1.3 Release Polish | 23–27 | All | Complete | 2026-05-16 |
| v1.4 Install Helper | 28–29 | All | Complete | 2026-05-16 |
| v1.5 Multi-Practice | 30–35 | All | Complete | 2026-05-19 |
| v2.0 New Design | 36. Housekeeping bookkeeping reset | 9/9 | Complete | 2026-05-20 |
| v2.0 New Design | 37. Stats UI removal | 0/3 | Not started | - |
| v2.0 New Design | 38. Variant removal | 4/4 | Complete | 2026-05-21 |
| v2.0 New Design | 39. Theme simplification | 0/TBD | Not started | - |
| v2.0 New Design | 40. Timbre preview cue | 0/4 | Not started | - |
| v2.0 New Design | 41. Mono Zen palette + tokens | 0/TBD | Not started | - |
| v2.0 New Design | 42. New orb implementation | 0/TBD | Not started | - |
| v2.0 New Design | 43. Five-surface redesign | 0/TBD | Not started | - |
| v2.0 New Design | 44. Final polish | 0/7 | Not started | - |
