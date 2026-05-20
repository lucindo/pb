# Phase 34: Stretch as a Distinct Practice - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 34 promotes HRV's intra-practice Stretch **mode** into a third top-level
**practice**. Today `mode: 'standard' | 'stretch'` lives *inside* the resonant
practice's `SessionSettings`, all breathing sessions (standard + stretch) count
into the single `practices.resonant.stats` slice, and `PracticeId` is
`'resonant' | 'naviKriya'`.

This phase delivers a real third practice `'stretch'`: its own per-practice
settings + stats slice, a `STATE_VERSION` v2→v3 storage migration, the
3-practice top segmented switcher (HRV · Stretch · Navi) shipping **both** label
treatments behind a developer-only env var, and EN + native-quality PT-BR copy
for all new Stretch surfaces.

Covers requirements STRETCH-01 through STRETCH-06.

**Open question resolved:** the ROADMAP flagged "whether HRV retains an internal
stretch mode or stretch moves out entirely" for RESEARCH.md — this discussion
resolved it (D-01): stretch moves out **entirely**.

**Out of scope:** the broad HRV+Navi config-values audit (kept as a standalone
todo — see Deferred); the Navi Kriya practice and shared chrome (unchanged);
v1.x carry-forward tech debt.
</domain>

<decisions>
## Implementation Decisions

### HRV's stretch mode fate
- **D-01:** Stretch moves out of HRV **entirely**. The HRV/resonant practice
  becomes standard-only — `SessionMode`, `MODE_OPTIONS`, the `mode` field, and
  the `ModeToggle` component retire from the resonant practice. There is exactly
  one way to reach a stretch session: the new Stretch practice. (Resolves the
  ROADMAP open question.)
- **D-02:** The settings types **split into two**. Resonant `SessionSettings`
  trims to standard-only fields (`bpm`, `ratio`, `durationMinutes`). A new
  `StretchSettings` type carries the ramp fields — note it MUST include `ratio`
  (the stretch ramp consumes it via `buildStretchSegments(settings, ratio)`)
  alongside `initialBpm`, `targetBpm`, `warmUpMinutes`, `rampDurationMinutes`,
  `coolDownMinutes`. `durationMinutes` is computed (read-only) for stretch and
  does not belong in `StretchSettings`. This mirrors how `NaviKriyaSettings` is
  its own type. Bigger refactor — touches `sessionController.ts`,
  `stretchRamp.ts`, the storage coercers, and `SettingsForm.tsx`.

### Storage migration (STRETCH-05)
- **D-03:** `STATE_VERSION` bumps 2→3; `migrateEnvelope` gains an idempotent
  v2→v3 ladder step. The step creates the `practices.stretch` slice. The
  `practices` map / `PracticeMap` type and `coerceActivePractice` gain the
  `'stretch'` key/id.
- **D-04:** Stretch **config migrates**. The migration lifts the stretch ramp
  fields out of `practices.resonant.settings` and seeds
  `practices.stretch.settings` with them, so a returning user's last stretch
  tuning carries over intact. The resonant slice is left with standard-only
  fields (the now-unused stretch fields become harmless orphans, consistent
  with how the v1→v2 ladder left orphan flat fields — do not add pruning).
- **D-05:** Stretch **stats start fresh**. `practices.stretch.stats` is seeded
  with `ZERO_STATS` — stretch was never tracked separately, and combined
  history cannot be retroactively split. The existing `practices.resonant.stats`
  counter is left **untouched** (it includes the user's historical stretch
  sessions; recorded history is not rewritten). Going forward each practice
  records its own. "Prior Stretch usage preserved" (STRETCH-05) therefore means
  the user's saved stretch **configuration**, not stats.

### Developer-only label-treatment toggle (STRETCH-02)
- **D-06:** Both switcher treatments are built — **A: text-only equal pills**
  (today's `PracticeToggle`, extended to 3) and **B: icon + label**. Selection
  is a **build-time env var** `VITE_SWITCHER_TREATMENT`. Switching treatments
  requires a rebuild + redeploy. It is NOT a user-facing setting and MUST NOT
  appear in the Settings dialog.
- **D-07:** When `VITE_SWITCHER_TREATMENT` is unset or holds an invalid value,
  the switcher falls back to **treatment A** (text-only pills) — the validated
  existing component, smallest-surprise default.
- **D-08:** Treatment B's glyphs adopt the spike-007 motifs as final: HRV =
  orb/circle (breathing), Stretch = a ramp / descending line (the BPM
  walk-down), Navi = counting dots (OM counting). Small inline SVGs styled with
  theme tokens, in the spirit of the existing `CueGlyph`.

### Stretch practice screen & copy (STRETCH-01, STRETCH-06)
- **D-09:** The Stretch practice screen is a **straight mirror of the HRV
  screen** — shared orb, inline per-practice controls, practice heading, stats
  footer. It reuses the breathing session engine, the one-clock `SessionFrame`,
  and the app-wide variant + cue chrome. Stretch is a breathing practice; only
  the controls (the stretch ramp knobs) and the heading differ. No new
  Stretch-specific screen element.
- **D-10:** Practice copy: the switcher label **and** the practice heading are
  both **"Stretch"** (EN) / **"Alongar"** (PT-BR). Spike 007 confirmed "Alongar"
  — the widest label — fits the 320px 3-practice switcher with no compaction.
  All new Stretch copy ships in EN + native-quality PT-BR.
- **D-11:** Switcher order is **HRV · Stretch · Navi** (`PRACTICE_IDS` =
  `['resonant', 'stretch', 'naviKriya']`).

### Claude's Discretion
- Exact `StretchSettings` field set and coercer shape (within D-02's
  constraints) — planner/executor decides, mirroring `coerceNaviKriyaSettings`.
- Whether the in-session switcher lock is dimmed-in-place (D-06 of Phase 30) —
  reuse the established posture.
- How treatment A vs B is wired into `PracticeToggle` (one component branching
  on treatment vs two) — implementation detail.
- Test reworking for the removed `mode`/`ModeToggle` surface.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike findings (authoritative)
- `.claude/skills/spike-findings-hrv/SKILL.md` — multi-practice requirements +
  findings index; the Stretch-promotion decision from spike 007.
- `.claude/skills/spike-findings-hrv/references/multi-practice-architecture.md` —
  the `practice` concept above `mode`, the `AppState` shape, the top
  segmented-control switcher (~3–4 practice ceiling), the `STATE_VERSION`
  migration pattern, the "what to avoid" list. **Primary architecture reference.**
- `.planning/spikes/007-three-practice-switcher/README.md` — the 3-practice
  switcher validation: both treatments A/B ship behind a developer-only toggle,
  treatment B glyphs are a build-time pass, "Alongar" fits 320px. **Primary
  reference for the switcher work.**
- `.planning/spikes/002-switcher-ux/README.md` — the top segmented control was
  chosen head-to-head; holds comfortably for ~3–4 practices.
- `.planning/spikes/MANIFEST.md` — spike 007 operator decision (verbatim
  Stretch-promotion notes).

### Prior phase context (storage + practice model — locked)
- `.planning/phases/30-multi-practice-architecture-switcher/30-CONTEXT.md` — the
  `practice` concept, per-practice persistence, the v1→v2 migration, the
  practice-aware `SettingsForm`, switcher styling/lock decisions.
- `.planning/phases/33-close-gap-practice-02-resonant-settings-read-write-split-bra/33-CONTEXT.md` —
  the corrected resonant settings read/write path (`practices.resonant.settings`).

### Requirements
- `.planning/REQUIREMENTS.md` — STRETCH-01..06 (this phase), delivering Future
  requirement PRACTICE-F1.
- `.planning/ROADMAP.md` Phase 34 — goal, success criteria, the resolved open
  question.

### Source files to modify (canonical paths)
- `src/storage/practices.ts` — `PracticeId`, `PracticeMap`, coercers,
  `coerceActivePractice`, per-practice save/record/reset functions.
- `src/storage/storage.ts` — `STATE_VERSION`, `migrateEnvelope` (v2→v3 step).
- `src/domain/settings.ts` — `SessionSettings`/`SessionMode`/`MODE_OPTIONS`
  split; new `StretchSettings` type + defaults + validators.
- `src/domain/sessionController.ts`, `src/domain/stretchRamp.ts` — consume the
  practice/`StretchSettings` model instead of `mode === 'stretch'`.
- `src/components/PracticeToggle.tsx` — 3-practice switcher, both treatments.
- `src/components/ModeToggle.tsx` — retired (D-01).
- `src/components/SettingsForm.tsx` — practice-aware `stretch` branch.
- `src/content/strings.ts` — Stretch practice copy, EN + PT-BR.
- `src/app/App.tsx` — `'stretch'` practice wiring (settings/stats plumbing).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/storage/practices.ts` — `coerceNaviKriyaSettings` is the model for a new
  `coerceStretchSettings`; `coercePracticeSlice` and the per-practice
  save/record/reset functions (`saveResonantSettings`, `recordResonantSession`,
  `resetPracticeStats`) already follow the slice-isolation pattern a third
  practice slots into. `recordResonantSession` is the template for a
  `recordStretchSession`.
- `src/storage/storage.ts` — `migrateEnvelope` already has the v1→v2 ladder and
  an explicit "idempotent, lossless, orphan-tolerant" contract; the v2→v3 step
  is the same pattern. `STATE_KEY`'s `:v1` suffix stays — in-envelope
  `STATE_VERSION` bump only (sync note in `index.html` FOUC script unaffected).
- `src/domain/settings.ts` — `DEFAULT_STRETCH_SETTINGS` already isolates the
  stretch defaults; `STRETCH_INITIAL_BPM_OPTIONS`, `WARMUP_MINUTES_OPTIONS`,
  `COOLDOWN_OPTIONS`, `RAMP_DURATION_OPTIONS` are the stretch option enums.
- `src/domain/stretchRamp.ts` — `buildStretchSegments`, `getStretchFrame`,
  `computeStretchTotalMs` are the stretch session math, reused unchanged.
- `src/components/SettingsForm.tsx` — already practice-aware (`activePractice`
  dispatch between resonant knobs and the NK scaffold); gains a `stretch` branch.
- `src/components/PracticeToggle.tsx` — equal-`flex-1` pills, accent-border
  active state, theme-token styled, in-session `disabled` posture; extends to 3
  pills and gains the A/B treatment branch.
- `StatsFooter` / `ResetStatsDialog` — already active-practice-scoped (Phase 30
  D-07/D-08); a third practice id flows through.

### Established Patterns
- Per-field, non-throwing, prototype-pollution-safe coercion at the storage
  boundary — a new `coerceStretchSettings` and the v2→v3 migration MUST follow it.
- The `practice` concept sits one level above the intra-practice `mode`. D-01
  removes `mode` entirely — the standard/stretch distinction is now expressed by
  *which practice is active*, not a settings field. `sessionController.ts` and
  `stretchRamp.ts` currently branch on `lockedSettings.mode === 'stretch'`; that
  branch must be re-sourced from the active practice / `StretchSettings`.
- Migration is lossless and idempotent: orphan fields are left in place, never
  pruned (v1→v2 precedent).
- In-session switcher lock: dimmed-in-place, reusing the chrome-picker
  `disabled` posture.

### Integration Points
- `src/app/App.tsx` — gains `'stretch'` in the practice-scoped settings/stats
  state, the switcher (now 3 pills), and stretch session plumbing. Note
  `App.tsx:320` still reads `settings.mode === 'stretch'` for the lead-in
  readout — that path moves to a practice check.
- `src/storage/storage.ts` `migrateEnvelope` — the v2→v3 step.
- `vite.config.ts` / `.env` — the new `VITE_SWITCHER_TREATMENT` env var (D-06).
- `src/content/strings.ts` — `UiStrings.practice` gains Stretch fields; EN +
  PT-BR. The frozen-EN `LOCKED_COPY` byte-equality guard and
  `Record<LocaleId, UiStrings>` completeness must stay green.

</code_context>

<specifics>
## Specific Ideas

- The 3-practice switcher order is **HRV · Stretch · Navi** — Stretch sits in
  the middle.
- Treatment B glyphs map to each practice's mechanic: orb = breathing, ramp =
  the BPM walk-down, counting dots = OM counting.
- `VITE_SWITCHER_TREATMENT` is a build-time-only knob — the operator picks the
  final default treatment from real-app testing across rebuilds, then this env
  var (and the unused treatment) can be retired in a future cleanup.
- The Stretch practice is deliberately *not* visually distinct from HRV beyond
  its controls and heading — consistency is the goal.

</specifics>

<deferred>
## Deferred Ideas

- **Picking a single final switcher treatment** — both A and B ship behind
  `VITE_SWITCHER_TREATMENT`; choosing one and removing the other (and the env
  var) is a deliberate later cleanup once the operator has tested in the real
  app.
- **A fourth+ practice** — the top segmented control is sized for ~3–4
  practices; beyond that the switcher mechanism must be revisited (spike 002).
- **v1.x carry-forward tech debt** — remains deferred (see STATE.md Deferred
  Items).

### Reviewed Todos (not folded)
- **Review all app config values and defaults**
  (`.planning/todos/pending/2026-05-17-review-all-app-config-values-and-defaults.md`) —
  matched on "settings"/"before" (score 0.4). It is a broad cross-practice
  config audit (every HRV + Navi + Stretch default/min/max/step), not specific
  to promoting Stretch. Not folded — stays a standalone todo for a dedicated
  config-review pass.

</deferred>

---

*Phase: 34-stretch-as-a-distinct-practice*
*Context gathered: 2026-05-18*
