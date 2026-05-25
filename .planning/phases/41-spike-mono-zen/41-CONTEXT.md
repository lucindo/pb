---
phase: 41-spike-mono-zen
status: Closed (retroactively documented)
gathered: 2026-05-24T23:40:00Z
documented_retroactively: 2026-05-24T (this commit)
---

# Phase 41: Spike 010 Mono Zen — full implementation

## Phase boundary

Implement the spike-010 Monochrome Zen visual system end-to-end — collapse the prior Nord palette to a cool-slate Mono Zen vocabulary, rebuild the orb as a three-layer halo + centre disc, redesign all five app surfaces (Practice Idle / Running / Complete, Learn, App Settings), and absorb the operator feedback that emerges along the way. Replaces the originally-planned Phases 41 (Mono Zen palette + tokens), 42 (New orb), and 43 (Five-surface redesign) into a single tightly-coupled implementation.

## Why this phase uses a spike-loop format (not standard plan-phase)

The standard GSD `/gsd:plan-phase` flow assumes a phase decomposes into independent atomic plans that can each be planned, executed, and verified. Phases 41/42/43 as originally written would have produced ~30+ plans across 3 sequential phases — but the visual system is **tightly coupled across all five surfaces**: changing a token affects every surface, the orb rebuild requires the new tokens, the surface redesign requires the new orb. Sequencing them as 3 phases × N plans would have meant the visual landed surface-by-surface, with intermediate broken states the operator couldn't usefully review.

The spike-loop format (`.planning/SPIKE-LOOP-STATE.md`, archived in this phase dir as `41-SPIKE-LOOP-ARCHIVE.md`) replaced the plan-phase flow with a per-item propose/go/implement/approve 4-step loop:

1. **Propose** — Section A (downstream constraints) + Section B (applicable memory rules) + Goal/Scope/Risk/Verification/Commit message. Wait for operator "go".
2. **Go / change** — Operator says "go", "continue", or proposes modifications.
3. **Implement** — Per-file edits, run verification (tsc + lint + tests + build + item-specific grep guards), commit atomically, then commit the state file with the pinned commit hash.
4. **Approve** — Operator says "next" or "approve" → mark item done, update Current Focus to the next item, commit state file.

This format kept the operator-in-the-loop on every visual increment, allowed mid-stream feedback dumps to land as inline commits (J16 absorbed ~50 such commits), and maintained a per-commit green-gate throughout. Items J1-J18 plus the architectural refactor loop (`.planning/REFACTOR-LOOP-STATE.md`, items A-I, archived separately) cover the full delivery.

## Items

**Architecture refactor loop (items A-I, 2026-05-23):** preparation work. Established design-primitive library (`Card`, `Pill`, `SegmentedControl`, `IconButton`, `Eyebrow`, `ArrowLink`, `Stepper`, `Toggle`), centralized icon set, `PageShell` + `TopAppBar` primitives, view-model / hook / domain / audio / storage separation, test harness consolidation. Closed at commit `a0d8452`. See `.planning/REFACTOR-LOOP-STATE.md` for the per-item history.

**Spike loop (items J1-J18, 2026-05-24):** the visual implementation. J1 theme tokens, J2 font system, J3 no-jiggle layout, J4 orb body, J5 V2 minimal variant, J6 idle orb, J7 skipped (false-positive item from stale memory), J8 SetupCard primitive, J9 SettingsSheet primitive, J10 wire SetupCard→Sheet, J11 FeedbackTime + FeedbackCount primitives, J12 MuteToggle re-tokenization, J13 InstallBanner deviation (banner removed; install stays in App Settings only), J14 App Settings restructure, J15 desktop responsive, J16 operator feedback pass (4 dumps + many subsequent items, ~50 atomic commits), J17 locked-copy verification, J18 final audit + orphan cleanup + drift guards. Closed at commit `d2b886b`. See `41-SPIKE-LOOP-ARCHIVE.md` (formerly `.planning/SPIKE-LOOP-STATE.md`) for the per-item history.

## In scope

- All TOK-01..08 (Mono Zen palette + new tokens) — originally Phase 41 requirements
- All ORB-01..11 (three-layer halo + centre disc + idle states + dev flags) — originally Phase 42 requirements
- All UX-01..22 (five-surface redesign + desktop responsive + no-jiggle + LOCKED_COPY carry-through) — originally Phase 43 requirements, except for UX-12/UX-13/UX-14 (install banner V3) which were intentionally dropped per operator decision at J13 (install kept only in App Settings; banner removed from practice surface entirely)
- A subset of POLISH (POLISH-07 readability via J18 orphan sweep; POLISH-08 zero net-new runtime deps maintained; POLISH-09 per-commit green-gate maintained)

## Out of scope

- POLISH-01..06 (full code review sweep, info-severity disposition, test cleanup, Tiger Style audit, refactoring pass, security re-review) — remain in Phase 44
- J19 (Complete-screen distinct-surface decision) — gated on a separate operator call, no longer a spike-loop item
- Future requirements (STATSDISPLAY-01, IOSAUD-01..02, WAKELOCK-01..02) — v2.x carry-forward

## Operator decisions during the phase (key deviations from REQUIREMENTS.md)

- **ORB-05 / ORB-06 — dev toggles use query-string params, NOT VITE_* build-time env vars.** Original REQUIREMENTS said `VITE_BREATHING_SHAPE` + `VITE_ORB_IDLE_BEHAVIOR`. Operator chose query-string flags (`?breathingShape=` and `?orbIdle=`) at J5 + J6 propose time so the variants can be toggled per-tab without a rebuild. Feature flags wired via `src/featureFlags.ts`.
- **UX-12 / UX-13 / UX-14 — install banner V3 DROPPED entirely.** Original REQUIREMENTS specified a V3 inline-card install banner on the practice surface. Operator decided at J13 that install belongs only in App Settings (where `SettingsInstallSection` already lives); no separate banner. The corresponding LOCKED_COPY entries (`install.bannerText` / `regionLabel` / `dismiss`) were swept in J18.3.
- **UX-06 — Practice Settings sheet content per practice — sourced from real app domain, NOT the spike's illustrative SETUP_SUMMARY.** Spike showed illustrative cell labels (PACE / RATIO / STRETCHES); production sources from existing `settingsForm.*` + `nkControls.*` strings (BPM / Ratio / Duration / Front OMs / etc.). Operator OQ-1 decision at J10.
- **UX-10 — Complete screen kept, not dropped.** REQUIREMENTS noted "operator may drop this screen at implementation". Operator chose to keep it; J16 commit `afe45eb` landed the checkmark orb + "Session complete" + "Take a moment" + Done button. J17 commit `7d7ca2a` brought Navi to parity (HRV+Stretch already rendered both lines via SessionReadout; Navi was missing the takeAMoment subtitle).
- **Cue picker option labels stay "Text" / "Arrow" / "Nose"** (production), not spike's illustrative "Dot" / "Ring" / "Pulse" / "None". J16 dump #3 C operator note: spike was visual reference, not content; existing CueGlyph component kept.
- **Theme picker keeps 3 options (Light / Dark / System).** Spike showed Light + Dark only. Operator validated all 3 during design (separate from this phase) — picker stays at 3, J18.7 prune dropped per Decision B at J18 propose.

## Quality bar / verification approach

- Per-item green-gate: `npx tsc --noEmit -p tsconfig.app.json` clean + `npm run lint` clean + `npx vitest run` all pass + `npm run build` clean.
- Per-item atomic commit with descriptive subject; state file commits separately to keep the resume-prompt landing on truth.
- J17 verified every visible string across all 5 surfaces against spike + operator dumps; produced a drift table with 1 real fix + 6 dispositions.
- J18 swept the orphan queue (8 items, 7 atomic sub-commits + state transition), added a structural drift-guard (`src/content/content.no-removed-keys.test.ts`) that locks the deletion done-state and is canary-tested end-to-end.

## Artifacts in this phase dir

- `41-CONTEXT.md` (this file) — phase framing + decisions + scope.
- `41-SUMMARY.md` — the final deliverable summary with metrics + commit traceability.
- `41-VERIFICATION.md` — requirements coverage with per-requirement status + deviation notes.
- `41-SPIKE-LOOP-ARCHIVE.md` — the full SPIKE-LOOP-STATE.md content as-of phase close, archived here as the canonical implementation log.
