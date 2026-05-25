# Phase 37: Stats UI removal — Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Strip every visible stats surface from the app while preserving `recordSession()` computation + per-practice `localStorage` persistence, pending a future deliberate decision on whether/how to re-introduce a calm stats display.

**In scope:**
- Delete `StatsFooter.tsx` + tests
- Delete `ResetStatsDialog.tsx` + tests
- Remove the "Reset stats" affordance (Practice Settings — currently lives inside `StatsFooter` via `onResetClick`)
- Remove all unconsumed stats UI code from `src/app/App.tsx` (imports, state, render, dialog wiring)
- Surgical strip of reset-stats branches from `App.dialog.test.tsx` / `App.persistence.test.tsx`
- Delete the stats-related i18n surface (type + EN + PT-BR catalogs)
- Delete `resetPracticeStats` (+ tests) from `src/storage/practices.ts`
- Delete `formatLastSession` (+ tests) from `src/storage/format.ts`
- Prune App.tsx `activeStats` subscription (no UI consumer)
- Add a STATS-04 record-and-persist regression test (unit, in `practices.test.ts`)
- Add a STATS-05 drift-guard test that fails CI if forbidden stats tokens reappear in `src/components/` or `src/app/`

**Out of scope (other phases):**
- Complete-screen redesign / "Session complete · Take a moment" copy — Phase 43
- Single-orb shape (variant removal) — Phase 38
- Re-introduction of any stats display — future milestone, deliberate decision
- Changes to `recordResonantSession` / `recordStretchSession` / `recordNaviKriyaSession` — these remain identical
- Changes to `loadStats` / `loadEnvelope` / `practices.*.stats` envelope shape — no `STATE_VERSION` bump

</domain>

<decisions>
## Implementation Decisions

### i18n strings disposition
- **D-01:** Clean cut — delete the `UiStrings.stats` block, `practice.resetStatsTitle`, and `resetStatsDialog` from the `UiStrings` type AND from both EN and PT-BR catalogs in `src/content/strings.ts`. Re-introduction (whenever it happens) will design fresh copy + key shape anyway; keeping orphans risks rot and unused-export lint noise. The Phase 26 `content/no-review-markers.test.ts` drift guard remains intact (no review markers are introduced — the strings disappear entirely).

### Data-layer surface
- **D-02:** Delete `resetPracticeStats` from `src/storage/practices.ts` plus its tests. No UI consumers remain after `ResetStatsDialog` deletion. Re-introduction will design reset semantics from scratch (per-practice? global? scheduled?) so any preserved scaffolding would be misleading.
- **D-03:** Delete `formatLastSession` from `src/storage/format.ts` plus its tests. Sole consumer is `StatsFooter`; pure-function status doesn't justify keeping dead code.
- **D-04:** Prune `App.tsx`'s `activeStats` subscription. The `activeStats.totalSessions > 0` render gate goes away with `StatsFooter`. `recordXSession` functions internally re-read the envelope via the WR-07 single-read pattern, so they need no App-level state. `loadStats` stays exported (test surface + internal use).
- **D-05:** STATS-04 invariant — `recordResonantSession`, `recordStretchSession`, `recordNaviKriyaSession` keep their exact current signatures, persistence behavior, and `practices.{slice}.stats` write targets. No `STATE_VERSION` bump.

### Tests retention
- **D-06:** Delete `StatsFooter.test.tsx` and `ResetStatsDialog.test.tsx` in the same commit as their components (delete-with-component policy; matches the Phase 36 spike-findings-hrv removal precedent).
- **D-07:** Surgically strip reset-stats interaction branches from `src/app/App.dialog.test.tsx` and any reset-stats persistence branches from `src/app/App.persistence.test.tsx`. Keep the rest of those files intact.
- **D-08:** STATS-04 regression test shape — unit test in `src/storage/practices.test.ts` (or `stats.test.ts`, planner's call). For each of the three practices: call `recordXSession` → reload envelope via `loadEnvelope` → assert `totalSessions+1`, `totalElapsedSeconds+N`, `lastSessionAtMs` set. No React render, no integration smoke. Cheap, fast, focused on the actual contract.

### STATS-05 audit mechanism
- **D-09:** Automated drift-guard test (in the spirit of `src/content/no-review-markers.test.ts`). Plan a single fs-scan vitest case that fails CI if forbidden tokens appear in any file under `src/components/` or `src/app/`. Test files (`*.test.tsx`, `*.test.ts`) are excluded via filename filter.
- **D-10:** Forbidden token list:
  - Component names: `StatsFooter`, `ResetStatsDialog`
  - Visual regex (case-insensitive): `MIN TODAY`, `STREAK`, `SESSIONS` (when uppercase), `TOTAL TIME`
- **D-11:** Future-deliberate-decision exit — when/if a future phase intentionally re-introduces a stats display, that phase explicitly deletes this drift-guard test with rationale logged in its SUMMARY. The test is the lock; deleting it is the unlock.
- **D-12:** Surface coverage — Idle, Running, Complete, Learn, App Settings. All five surfaces will already be free of stats components after D-01..D-08; the drift-guard locks this state going forward.

### Claude's Discretion
- File-level grouping of commits (single atomic vs split UI/data/i18n/tests/audit) — planner chooses based on git history clarity, but Tiger Style "small atomic commits" favors split. Defer to PATTERNS.md if it exists for Phase 37 at plan time.
- Exact filename for the drift-guard test (e.g., `src/app/no-stats-ui.test.ts`, `src/components/stats-ui-absence.test.ts`) — naming follows the closest analog the planner finds in `src/content/no-review-markers.test.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike & milestone alignment
- `.planning/spikes/MANIFEST.md` §Decisions/Anti-gamification — locks the "stats computation continues, no visible surface anywhere including Complete screen" stance from spike 010.
- `.planning/PROJECT.md` §Current Milestone: v2.0 New Design — lists Phase 37 alongside the rest of the v2.0 surface so the planner understands the sequencing context (37 lands before 41/42/43 surface redesigns).
- `.planning/ROADMAP.md` §Phase 37 — goal + 3 ROADMAP success criteria (STATS-01..03 mapping; STATS-04 regression test; STATS-05 surface audit).
- `.planning/REQUIREMENTS.md` §STATS — STATS-01..05 normative statements.

### Pattern analogs (planner reuses these in PATTERNS.md)
- `src/content/no-review-markers.test.ts` — the analog for the STATS-05 drift-guard test (fs-scan, regex match, fail-on-occurrence).
- `.planning/milestones/v1.5-phases/35-flute-cue-timbre/35-CONTEXT.md` — rename + storage-coercion precedent (chime → flute); similar shape for the i18n + persisted-shape pruning here, except STATS-05 has no `STATE_VERSION` bump because the envelope shape doesn't change.
- `.planning/phases/36-housekeeping-bookkeeping-reset/36-08-PLAN.md` + 36-08-SUMMARY.md — recent precedent for tightly-coupled multi-file deletion with a combined commit (CLAUDE.md + spike-findings-hrv + .gitignore).

### Codebase touchpoints (full path list — feeds the planner directly)
- `src/components/StatsFooter.tsx` + `src/components/StatsFooter.test.tsx` — delete
- `src/components/ResetStatsDialog.tsx` + `src/components/ResetStatsDialog.test.tsx` — delete
- `src/app/App.tsx` — strip imports L13-14, `resetPracticeStats` import L68, comments L131/L300/L505/L511, render block L1270-1278, dialog block L1304-1310, plus `onResetClick` / `confirmReset` / `cancelReset` / `resetDialogOpen` state machine and `activeStats` subscription
- `src/app/App.dialog.test.tsx` — strip reset-stats dialog interaction branches
- `src/app/App.persistence.test.tsx` — strip reset-stats persistence branches if present
- `src/content/strings.ts` — delete `UiStrings.stats` block (L114-123), `practice.resetStatsTitle` rows (L210, L345), `resetStatsDialog` blocks (L296, L477), plus matching PT-BR catalog rows
- `src/storage/stats.ts` — keep `recordSession` (and its callers); revisit `formatLastSession` callsite consequences if any
- `src/storage/practices.ts` — delete `resetPracticeStats` (and any associated practices.test.ts cases)
- `src/storage/format.ts` — delete `formatLastSession` and `formatLastSessionDate` if the latter is consumed only by the former (verify at plan time)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/content/no-review-markers.test.ts`** — fs-scan drift-guard pattern. Iterates files under `src/content/`, regex-matches forbidden token (`// TODO: native-speaker review`), fails on match. The STATS-05 drift-guard test reuses this exact pattern with different scope (`src/components/` + `src/app/`) and different token list.
- **WR-07 single-envelope-read pattern in `src/storage/stats.ts`** — `recordSession` reads + writes the envelope in one round-trip without calling `loadStats`. This is what lets us prune the App.tsx `activeStats` subscription without breaking the record path.
- **`coerceStats`, `ZERO_STATS` in `src/storage/stats.ts`** — kept untouched; still consumed by `loadEnvelope` migration paths for v1→v2→v3 envelope coercion (Phase 30 / Phase 34 PRACTICE-04 / STRETCH-01..06).

### Established Patterns
- **Typed catalog with frozen-EN guard** (Phase 19 I18N + Phase 26 I18N-07) — `UiStrings` is a typed `Record<LocaleId, UiStrings>`. Removing a block from the type AND both catalogs is the clean path; the type system catches any stale consumers at compile time.
- **Locked-copy byte-equality guard** (Phase 19) — `LOCKED_COPY` covers claim-safe Forrest/medical copy only. Stats strings are NOT in `LOCKED_COPY`, so deletion is safe without touching that guard.
- **Per-practice slice pattern** (Phase 30 PRACTICE-01..06) — `practices.{resonant,stretch,naviKriya}.{settings,stats}`. The stats slices remain in the envelope shape after Phase 37; only the UI consumer goes.
- **Atomic commit per logical change** (Tiger Style, reinforced by Phase 36 PATTERNS) — small, focused commits with conventional-commit messages scoped to `(37)`.

### Integration Points
- **App.tsx render gate** (L1270): `{!inSessionView && !nkSessionActive && activeStats.totalSessions > 0 && (<StatsFooter ... />)}` — the entire gate condition (including `activeStats.totalSessions > 0`) plus the `<StatsFooter>` element disappear. The `!inSessionView && !nkSessionActive` part is a generic UI gate used elsewhere — verify before deletion.
- **App.tsx dialog block** (L1304-1310): `<ResetStatsDialog>` — disappears wholesale along with the surrounding state (`resetDialogOpen`, `confirmReset`, `cancelReset`) and the `resetPracticeStats(activePractice)` call at L686.
- **`SettingsDialog.tsx` comment debt** — lines 21 and 25-28 reference `ResetStatsDialog` structurally ("differs from ResetStatsDialog which focuses Keep" / "Three structural deltas from ResetStatsDialog"). After deletion, these comments dangle. Planner should either rewrite as standalone documentation or delete (Tiger Style: WHY-only comments — if the WHY no longer references a live sibling, the comment loses purpose).

</code_context>

<specifics>
## Specific Ideas

- The drift-guard test feels like the load-bearing artifact of this phase — it's how the anti-gamification invariant survives future contributions. Treat it as a first-class deliverable, not an afterthought.
- The STATS-04 regression test is small and obvious. The STATS-05 drift-guard test is the one that defines the phase's long-term value.

</specifics>

<deferred>
## Deferred Ideas

- **Future stats re-introduction** — when/if a stats display is re-introduced, it will design fresh copy, fresh component(s), fresh reset semantics, and explicitly delete the STATS-05 drift-guard test with rationale in the introducing phase's SUMMARY. Owned by a future milestone, not v2.0.
- **`StatsFooter` rounds-completed (NK) data exposure** — the `roundsCompletedLabel` and `showRounds={activePractice === 'naviKriya'}` branch disappears with the component. If a future calm stats display ever surfaces rounds, that's a fresh design exercise.

</deferred>

---

*Phase: 37-stats-ui-removal*
*Context gathered: 2026-05-20*
