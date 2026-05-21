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

- [x] **Phase 36: Housekeeping bookkeeping reset** (9 plans) - Retroactively close the v1.x procedural backlog (Phase 12 VALIDATION + SECURITY, Phase 33/35 Nyquist VALIDATION, Phase 31 VERIFICATION re-flip, SUMMARY frontmatter backfill, legacy human_needed flips, 28-01/28-03 SUMMARY drift, v1→v2→v3 chained-migration regression test), remove root `CLAUDE.md` + `.claude/skills/spike-findings-hrv/`, gitignore `.claude/`, push to origin/main
- [ ] **Phase 37: Stats UI removal** (3 plans) - Remove `StatsFooter`, `ResetStatsDialog`, and the Practice Settings "Reset stats" affordance; keep `recordSession` computation + localStorage persistence intact
- [ ] **Phase 38: Variant removal** (TBD plans) - Drop the Square + Diamond shape variants from code/tokens/picker/Start-capture refs; coerce persisted `variant: 'square'|'diamond'` to `'orb'`
- [ ] **Phase 39: Theme simplification** (TBD plans) - Remove Moss/Slate/Dusk palettes; reduce ThemePicker to Light/Dark/System; coerce persisted theme outside `{light, dark, system}` to `'system'`; regenerate WCAG guard
- [ ] **Phase 40: Timbre preview cue** (TBD plans) - Switching the Timbre selection in App Settings plays the inhale cue once at the current pitch via the existing `cueSynth` scheduler (preview plays even when muted)
- [ ] **Phase 41: Mono Zen palette + tokens** (TBD plans) - Apply the spike-010 light + dark cool-slate palettes, add `borderSoft` / `textSoft` / `orbHalo1/2/3` / `onAccent` tokens, switch to semibold Inter typography, regenerate the WCAG contrast guard
- [ ] **Phase 42: New orb implementation** (TBD plans) - Rebuild the orb as a three-layer translucent-halo + solid centre disc with the breath label inside the disc in `onAccent`; ship V1 (orb-halo) + V2 (minimal) behind `VITE_BREATHING_SHAPE`; add `VITE_ORB_IDLE_BEHAVIOR=still|ambient`; preserve end-of-phase ring cues (hidden on Idle/Complete); align `MuteToggle` chrome to `borderSoft`/`textSoft`
- [ ] **Phase 43: Five-surface redesign** (TBD plans) - Redesign Learn / App Settings / Idle / Running / Complete (Appearance/Language/Audio/About on App Settings; Idle V1 Grid SetupCard; Practice Settings bottom-sheet on mobile + center-modal on desktop; per-practice Running feedback with `FeedbackCount` primitive; V3 inline-card install banner; desktop centered column 520/600 px; no-jiggle invariant)
- [ ] **Phase 44: Final polish** (TBD plans) - Full-codebase `/gsd-code-review --all --fix` sweep, disposition the 28 Info-severity findings from 2026-05-16, test-name cleanup, Tiger Style WHY-only comment audit, refactoring + security re-review + readability pass, zero-Warning closeout

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
- [ ] 37-03-PLAN.md — Add STATS-05 drift-guard test in src/content/content.no-stats-ui.test.ts and run the closing green gate (STATS-05 / D-09 D-10 D-11)

### Phase 38: Variant removal
**Goal**: Reduce the shape vocabulary to Orb-only — drop Square and Diamond from code, tokens, picker, and Start-capture, so the Phase 42 orb rewrite has exactly one shape to dispatch to.
**Depends on**: Phase 37
**Requirements**: VAR-01, VAR-02, VAR-03, VAR-04, VAR-05, VAR-06
**Success Criteria** (what must be TRUE):
  1. `BreathingShape.tsx` and the `Variant` union no longer reference `Square` or `Diamond`; the `sessionVariantRef` Start-capture invariant is gone since there is one shape (VAR-01, VAR-02, VAR-04).
  2. The user `SettingsDialog` has no visible variant picker (VAR-03).
  3. A returning user with persisted `variant: 'square'` or `variant: 'diamond'` lands on `'orb'` via `coerceSettings` — no `STATE_VERSION` bump, no FOUC, no broken UI (VAR-05).
  4. A repo-wide search for variant-specific tokens / CSS classes / EN+PT-BR strings / test fixtures returns zero leftover references (VAR-06).
**Plans**: TBD

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
**Plans**: TBD

### Phase 40: Timbre preview cue
**Goal**: Switching the Timbre selection in App Settings plays the inhale cue once at the current pitch — operator-added requirement, lands the audio surface change before the visual rebuild starts.
**Depends on**: Phase 36 (independent of 37/38/39 — placed here so the audio surface change lands before TOK)
**Requirements**: PREV-01, PREV-02, PREV-03, PREV-04, PREV-05
**Success Criteria** (what must be TRUE):
  1. Selecting a different Timbre in App Settings plays the inhale-only cue once at the current pitch — no looping, no exhale cue (PREV-01).
  2. The preview routes through the existing `cueSynth` scheduler (same code path as in-session cues — no duplicated audio code) (PREV-02).
  3. The preview plays even when the `MuteToggle` is muted (it is a preview, not a session cue — operator can audition without unmuting), and the preview is suppressed during an active session (PREV-03, PREV-04).
  4. Preview latency from picker tap to first audio sample is ≤ 100 ms on commodity hardware (PREV-05).
**Plans**: TBD

### Phase 41: Mono Zen palette + tokens
**Goal**: Apply the spike-010 Monochrome Zen visual vocabulary — cool-slate light + dark palettes, the new `borderSoft` / `textSoft` / `orbHalo*` / `onAccent` tokens, and semibold Inter typography app-wide — so Phase 42 and 43 can build the new orb and surfaces against the locked token set.
**Depends on**: Phase 39 (theme set must be collapsed first so the Mono Zen palette replaces fewer palettes) and Phase 38 (no variant tokens left to thread through)
**Requirements**: TOK-01, TOK-02, TOK-03, TOK-04, TOK-05, TOK-06, TOK-07, TOK-08
**Success Criteria** (what must be TRUE):
  1. The light palette in `theme.css` reads `bg #f3f5f7` / `surface #ffffff` / `accent #5d6877`; the dark palette reads `bg #1a1d24` / `surface #252932` / `accent #b4bac4` (cool dimmed mid-slate, explicitly not bleached white) (TOK-01, TOK-02).
  2. The theme token vocabulary includes `borderSoft`, `textSoft`, `onAccent`, and `orbHalo1` / `orbHalo2` / `orbHalo3` (rgba) — and the legacy orb gradient + ring tokens they replace are removed (TOK-03..06).
  3. Inter semibold renders app-wide; no surface still uses the previous weight (TOK-07).
  4. The WCAG luminance contrast guard passes on the new light + dark palettes — ≥ 1.5 on orb In/Out midpoints and ≥ 4.5 AA on text-against-surface combinations (TOK-08).
**Plans**: TBD

### Phase 42: New orb implementation
**Goal**: Rebuild the orb per spike-010 — three-layer translucent-halo + solid centre disc with the in-disc breath label, two dev-toggled shape variants (V1 halo / V2 minimal), preserved end-of-phase ring cues, and `MuteToggle` chrome aligned to the new tokens.
**Depends on**: Phase 41 (token vocabulary must exist) and Phase 38 (single shape to dispatch to)
**Requirements**: ORB-01, ORB-02, ORB-03, ORB-04, ORB-05, ORB-06, ORB-07, ORB-08, ORB-09, ORB-10, ORB-11
**Success Criteria** (what must be TRUE):
  1. The orb renders as a three-layer translucent-halo (using `orbHalo1/2/3`) plus a solid centre disc with asymmetric border-radii (organic-puddle feel); the In/Out label is inside the centre disc in `onAccent` (ORB-01, ORB-02).
  2. `VITE_BREATHING_SHAPE=orb-halo` ships V1 and `VITE_BREATHING_SHAPE=minimal-rings` ships V2; `VITE_ORB_IDLE_BEHAVIOR=still|ambient` toggles between empty-disc-no-animation and gentle-scale-no-label idle behaviors (ORB-03..06).
  3. During a Running session, the outer ring cue is always visible (end-of-inhale) and the inner ring cue appears only during exhale (end-of-exhale); both V1 and V2 carry the same cue contract (ORB-07, ORB-08, ORB-11).
  4. Both ring cues are hidden on Idle (A) and Complete (C) even when ambient-breath idle is on — only the breathing shape itself scales there (ORB-09).
  5. `MuteToggle.tsx` chrome reads `borderSoft` / `textSoft` (matching the top-bar icons), the 44 px hit area is preserved (size-11), and only colour classes change (ORB-10).
**Plans**: TBD
**UI hint**: yes

### Phase 43: Five-surface redesign
**Goal**: Land the full spike-010 visual + interaction redesign across Learn / App Settings / Idle / Running / Complete — new App Settings page, V1 Grid SetupCard, Practice Settings bottom-sheet/center-modal, per-practice Running feedback, V3 inline-card install banner, desktop centered column, and the no-jiggle invariant.
**Depends on**: Phase 42 (orb shape locked) and Phase 41 (token vocabulary locked) and Phase 37 (no StatsFooter to thread around)
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09, UX-10, UX-11, UX-12, UX-13, UX-14, UX-15, UX-16, UX-17, UX-18, UX-19, UX-20, UX-21, UX-22
**Success Criteria** (what must be TRUE):
  1. The top app bar carries an info icon (opens Learn — About Forrest / per-practice intros / Resources) and a gear icon (opens the new App Settings page with Appearance / Language / Audio / About sections); the theme picker now lives in App Settings → Appearance, not in Practice Settings (UX-01, UX-02, UX-11).
  2. The Idle screen renders a V1 2×3 Grid SetupCard for the active practice — 1 row for HRV/Navi's 3 settings, 2 rows for Stretch's 6 settings — and the whole card is the tap target with a right-chevron affordance vertically centred; tapping opens the Practice Settings sheet on mobile or the center modal on desktop, carrying the per-practice steppers + cue timbre + cue sound (UX-03..06, UX-16).
  3. The Running screen renders the orb (In/Out inside disc) with practice-specific feedback under it — HRV uses a time-based primitive (large remaining time + small pace caption), Stretch and Navi share the `FeedbackCount` primitive (big primary number + small "of N" mid + small uppercase tracked context line); the practice switcher is disabled and only End + Mute controls are exposed (UX-07..09).
  4. The Complete screen renders the orb (still + subtle check marker in the centre disc), the line "Session complete · Take a moment", and Done + Mute (operator may drop this screen at implementation — decision deferred per spike-010) (UX-10).
  5. The V3 inline-card install banner ships — surface card with `borderSoft` border, app-icon glyph + two-line title/`bannerText`, right chevron, small dismiss X; mobile-only + idle-only, renders below the top app bar (no orb shift on appear/dismiss); action label branches on `isIOS` (Install vs How to install with inline `IosInstallSteps`) (UX-12..14).
  6. Desktop layout renders the locked mobile design inside a centered column — 520 px wide for A/B/C, 600 px for Learn + App Settings, orb scales up to 320 px; the no-jiggle invariant holds on all five surfaces at 320 px in EN + PT-BR, including Stretch's 6-setting Idle SetupCard, and `LOCKED_COPY` strings carry verbatim with the frozen-EN byte-equality guard intact (UX-15, UX-17..22).
**Plans**: TBD
**UI hint**: yes

### Phase 44: Final polish
**Goal**: Closeout sweep against the full v2.0 surface — zero open Warning-severity findings, dispositioned Info backlog, tight test names, Tiger Style WHY-only comments, refactoring + security re-review + readability pass, with the zero-net-new-runtime-deps and per-commit green-gate invariants intact.
**Depends on**: Phase 36, 37, 38, 39, 40, 41, 42, 43 (sweeps the entire milestone)
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06, POLISH-07, POLISH-08, POLISH-09
**Success Criteria** (what must be TRUE):
  1. A full `/gsd-code-review --all --fix` sweep finishes with zero Warning-severity findings open at milestone close (POLISH-01).
  2. Each of the 28 Info-severity findings from the 2026-05-16 deep review is dispositioned — fixed, deferred with reason, or marked obsolete by the v2.0 redesign — and the disposition is recorded in the phase artifacts (POLISH-02).
  3. A repo-wide comment audit returns no narration-of-WHAT comments — only WHY-comments (constraints, invariants, surprising behavior, workarounds) survive; Vitest test names are tight with no redundant cases, the final test count is recorded, and no flake surfaces in the close sweep (POLISH-03, POLISH-04).
  4. `/gsd-secure-phase 44` runs against the full milestone surface and clears the new attack surfaces (preview audio path, new env vars, dev toggles); a readability pass leaves no leftover references to Square/Diamond/Moss/Slate/Dusk/Chime in code or copy (POLISH-05..07).
  5. `dependencies` in `package.json` remains `react` + `react-dom` (zero net-new runtime deps), and `tsc && lint && build && test` exits 0 on every commit on `main` through v2.0 (POLISH-08, POLISH-09).
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 36 → 37 → 38 → 39 → 40 → 41 → 42 → 43 → 44

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
| v2.0 New Design | 38. Variant removal | 0/TBD | Not started | - |
| v2.0 New Design | 39. Theme simplification | 0/TBD | Not started | - |
| v2.0 New Design | 40. Timbre preview cue | 0/TBD | Not started | - |
| v2.0 New Design | 41. Mono Zen palette + tokens | 0/TBD | Not started | - |
| v2.0 New Design | 42. New orb implementation | 0/TBD | Not started | - |
| v2.0 New Design | 43. Five-surface redesign | 0/TBD | Not started | - |
| v2.0 New Design | 44. Final polish | 0/TBD | Not started | - |
