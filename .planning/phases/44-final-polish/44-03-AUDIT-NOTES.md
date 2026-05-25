# Phase 44 Plan 03 — Audit Notes (Tiger Style WHY-only comment sweep)

**Date:** 2026-05-25
**Scope:** `src/**/*.{ts,tsx}` — comments only, zero code behavior change
**Baseline:** Post-44-02 test count = 1153

---

## Section 1 — DELETED-COMPONENT REFS (grep guard 1 + 2)

Running the 3 verification grep guards from PATTERNS.md "Audit mechanic" block:

### Guard 1a: `grep -rn 'LearnDialog\b\|SettingsDialog\b\|SettingsPanel\b' src | grep -v SettingsPanelBody`
**Result: 0 hits**
Item I (`80da948`) already cleaned these. No new candidates for this plan.

### Guard 1b: `grep -rn 'BooleanToggle\|StatusPanel\b\|primitives/Card\b' src`
**Result: 2 hits — BOTH in drift-guard test file (KEEP)**
```
src/content/content.no-removed-keys.test.ts:76: { label: "BooleanToggle import (J18.1)", pattern: /.../ },
src/content/content.no-removed-keys.test.ts:77: { label: "StatusPanel import (J18.1)", pattern: /.../ },
```
- KEEP: These are in `content.no-removed-keys.test.ts` — a J18.8 drift-guard. The strings `BooleanToggle` and `StatusPanel` appear inside regex pattern literals that LOCK the absence of those imports. Removing them would unlock the drift-guard. This is exactly the "KEEP — drift-guard self-description" pattern from PATTERNS.md. **Do not touch this file.**

### Guard 1c: `grep -rn 'Square\|Diamond\|Moss\|Slate\|Dusk\|Chime' src` (POLISH-07 overlap)
**DEFERRED TO 44-05**: This third grep is the POLISH-07 readability overlap. Per PATTERNS.md "Overlap with cluster 44-03": cluster 44-03 owns code-comment hits; cluster 44-05 owns prose/docstring hits. This guard is deferred to 44-05 by design.

**Section 1 DROP count: 0**
**Section 1 KEEP count: 2 (drift-guard pattern locks — verbatim preserve)**

---

## Section 2 — STALE PHASE-NARRATION MARKERS

`grep -rEn '^\s*//\s*Phase \d+' src` → **98 hits** total.

Classifying each by file cluster:

### `src/app/App.audio.test.tsx` (5 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 92 | `// Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (parameterized).` | **DROP** | Pure narration-of-WHAT. The code below already shows the spy call; `scheduleOutCueForTimbre` is visible in the next line. No load-bearing WHY. |
| 188 | `// Phase 3 fix: completion now waits for the surrounding cycle to finish so` | **KEEP** | Encodes the "completion holds to cycle boundary" invariant — critical to understand WHY the test advances 6 min instead of 5 min. Without this comment a reader would not know why the extra minute is required. |
| 335 | `// Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (parameterized).` | **DROP** | Identical narration-of-WHAT as line 92. |
| 374 | `// Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (parameterized).` | **DROP** | Same pattern — narration repeated a third time in this file. |
| 650 | `// Phase 18 Plan 03: engine now calls scheduleOutCueForTimbre(ctx, time, dest, timbre, durSec).` | **DROP** | Narration-of-WHAT; the spy implementation immediately below shows this. |

### `src/app/App.session.test.tsx` (4 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 98 | `// Phase 3 fix: timed completion holds until the surrounding cycle ends so` | **KEEP** | WHY-comment: encodes the same cycle-boundary completion invariant as App.audio.test.tsx:188. Required to understand why advanceTimersByTime uses 6×60_000. |
| 299 | `// Phase 31 — Navi Kriya session integration (NK-01/05/07/08/09, D-11/12/13)` | **DROP** | Section header used as a describe-block separator. The `describe()` block below already says what this is. Pure narration-of-WHAT. |
| 466 | `// Phase 34: Stretch session records stretch stats and leaves resonant untouched` | **DROP** | Section header narrating what the describe block below describes. The describe block's own title carries this. |

### `src/app/App.persistence.test.tsx` (3 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 40 | `// Phase 30: after the v1→v2 migration the authoritative resonant stats live at` | **KEEP** | WHY-comment: encodes WHERE the resonant stats write post-v1→v2 migration. The helper function uses this to extract the right subtree. Without this, the path `env.practices.resonant.stats` looks arbitrary. |
| 137 | `// Phase 30 Pitfall 3: the session records into practices.resonant.stats.` | **DROP** | Narration-of-WHAT — the code immediately does `resonantStatsOf(env)` which returns `env.practices.resonant.stats`. The reader can see this. |
| 264 | `// Phase 34 — v2→v3 envelope upgrade shows migrated stretch config` | **DROP** | Section header — the describe block below (`describe('Phase 34 — v2 envelope migrates to v3...')`) already contains this info. |

### `src/app/App.dialog.test.tsx` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 131 | `// Phase 3 fix: completion now waits for the surrounding cycle to finish;` | **KEEP** | Same WHY-comment pattern as App.session/audio tests — encodes the cycle-boundary invariant that explains why `vi.advanceTimersByTime(6 * 60_000)` is used after a 5-min session. |

### `src/content/content.no-variants.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 38 VAR-06 drift-guard.` | **KEEP** | Drift-guard self-description. This is the KEEP analog from PATTERNS.md. Documents which phase locked this drift state and its purpose. |

### `src/content/content.no-review-markers.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 26 D-12: marker-guard. Fails if "// TODO: native-speaker review" appears` | **KEEP** | Drift-guard self-description — documents Phase 26 D-12 as the origin decision. Load-bearing WHY for future readers. |

### `src/content/learnContent.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 2 | `// Phase 32: restructured into per-practice partition. The shared base retains` | **KEEP** | Encodes WHY this file has the structure it does — per-practice partition from Phase 32. A reader editing learnContent needs this to understand why the shared base exists and what the design intent is. |

### `src/content/lockedCopy.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 1 | `// Phase 19 I18N-06 — D-01 physical separation of locked claim-safe copy from` | **KEEP** | WHY-comment: explains the design decision behind the file's existence — physical separation to protect claim-safe copy from accidental mutation. This is a constraint future editors need. |

### `src/content/content.no-removed-themes.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 39 drift-guard (CONTEXT D-03 / D-04 / D-05 / D-06).` | **KEEP** | Drift-guard self-description. Same pattern as no-variants.test.ts. |

### `src/content/content.no-stats-ui.test.ts` (2 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 37 STATS-05 anti-gamification drift-guard.` | **KEEP** | Drift-guard self-description. |
| 38 | `// Phase 37 must scan .tsx as well because the deleted components and their App consumers` | **KEEP** | WHY-comment: explains why the file scanner includes .tsx (not just .ts). Encodes a non-obvious constraint. |

### `src/storage/storage.ts` (5 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 4 D-16/D-17: silent-fallback envelope adapter for localStorage.` | **KEEP** | References a decision (D-16/D-17) that explains the silent-swallow-all-errors posture. Without D-16/D-17 the reader would be puzzled by the broad catch blocks. |
| 26 | `// Phase 30 PRACTICE-04: the first real migration step lands here. STATE_VERSION` | **KEEP** | WHY-comment: documents the origin and meaning of the migration step. Context a future schema-version bumper needs. |
| 38 | `// Phase 34 STRETCH-03: bumped 2→3. The v2→v3 ladder in migrateEnvelope seeds the` | **KEEP** | WHY-comment: documents the version bump origin and the migration's effect. |
| 59 | `// Phase 14 D-11: static type acknowledges the runtime forward-compat already proven` | **KEEP** | WHY-comment: explains WHY `prefs?: unknown` is typed as unknown (forward-compat posture from D-11). |
| 63 | `// Phase 30 PRACTICE-02/04: the v2 per-practice subtree. `practices` holds a` | **KEEP** | WHY-comment: documents the structural meaning of the `practices` field. |

### `src/storage/settings.ts` (2 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 4 D-14/D-15: per-field validate-and-fallback for settings + mute.` | **KEEP** | WHY-comment: references the decision that establishes the validate-and-fallback posture for this module. |
| 8 | `// Phase 34 D-01/D-02: coerceSettings trimmed to standard-only (3 fields).` | **KEEP** | WHY-comment: explains WHY only 3 fields are coerced (not more). |

### `src/storage/stats.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 4 D-01/D-02/D-11/D-18: stats aggregator.` | **KEEP** | WHY-comment: references the design decisions that constrain this module. |

### `src/storage/prefs.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 14 D-10/D-17: per-field coerce-and-fallback for user prefs.` | **KEEP** | WHY-comment: same pattern as storage/settings.ts — references the decisions constraining the module's design. |

### `src/storage/installDismissed.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 28 INSTALL-04: dismissal persistence for the phone install banner.` | **KEEP** | WHY-comment: references the requirement (INSTALL-04) that spawned this file. |

### `src/storage/practices.ts` (5 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 30 PRACTICE-02: the per-practice persistence layer. A v2 envelope holds a` | **KEEP** | WHY-comment: explains the structural design (v2 envelope, per-practice subtree). |
| 7 | `// Phase 34 STRETCH-03/04/05: the stretch practice becomes a first-class slice.` | **KEEP** | WHY-comment: explains WHY the stretch slice was added. |
| 115 | `// Phase 34 T-34-02: coerceStretchSettings modeled exactly on coerceNaviKriyaSettings.` | **KEEP** | WHY-comment: explains WHY the implementation mirrors the NK analog — design symmetry as a constraint. |
| 210 | `// Phase 34 STRETCH-04: modeled exactly on saveResonantSettings (lines above).` | **KEEP** | WHY-comment: same design-symmetry constraint. |
| 257 | `// Phase 34 STRETCH-05: modeled exactly on recordResonantSession above.` | **KEEP** | WHY-comment: same design-symmetry constraint. |

### `src/storage/settings.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 80 | `// Phase 34 D-01/D-02: coerceSettings is now standard-only (3 fields).` | **KEEP** | WHY-comment in test: explains WHY only 3 fields are tested. Mirrors the production code rationale. |

### `src/styles/favicon.sync.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 21 Plan 01: D-07 automated sync guard.` | **KEEP** | Drift-guard self-description pattern — documents the phase and decision (D-07) that mandated the guard. |

### `src/styles/faviconPalette.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 21 Plan 01: Single source of truth for per-palette favicon colors and the` | **KEEP** | WHY-comment: encodes WHY this file is a single source of truth (D-07 contract). |

### `src/styles/theme.alpha-probe.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 16.1 / Wave 0 / CONTEXT.md D-02: alpha-modifier strategy probe.` | **KEEP** | WHY-comment: documents the strategy decision (D-02 alpha-modifier) that this probe tests. |

### `src/styles/theme.contrast.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 129 | `// Phase 16.1 D-01: new --color-breathing-on-accent token is the foreground role` | **KEEP** | WHY-comment: explains WHY this specific token is being tested. Encodes a design invariant about the foreground role of the token. |

### `src/styles/theme.no-hardcoded-classes.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 16.1 THEME-UI-01 / D-04: regression guard — no production .tsx file` | **KEEP** | Drift-guard self-description. |

### `src/components/OrbShape.test.tsx` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 9 | `// Phase 25 Plan 03 — cue prop threading tests are at the bottom of this file.` | **DROP** | Pure narration-of-what — "tests are at the bottom of this file" is structural wayfinding that is not a WHY-comment and is visible from the file itself. |

### `src/components/OrbShape.tsx` (4 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 15 | `// Phase 25 Plan 03: OPTIONAL, default 'labels' — zero-regression for callers` | **KEEP** | WHY-comment: explains WHY `cue` is optional with default 'labels' — the zero-regression contract for pre-Phase-25 callers is a constraint future editors must know. |
| 18 | `// Phase 31: NKShape passes 'front' \| 'back' to render its locked MID_SCALE` | **KEEP** | WHY-comment: explains WHY `nkPhase` prop exists and what NKShape's contract is. |
| 69 | `// Phase 38 D-03: OrbShape is the sole shape — it now owns the idle null-return` | **KEEP** | WHY-comment: explains WHY OrbShape owns the null-return guard post-Phase-38 (the guard moved from BreathingShape). Future editors need this to avoid re-introducing BreathingShape. |
| 203 | `// Phase 3 D-14: the lead-in is a neutral pre-state — orb locked at MID_SCALE` | **KEEP** | WHY-comment: encodes the design invariant for the lead-in state. Includes the NK locked-shell explanation. |

### `src/components/MuteToggle.tsx` (2 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 1 | `// Phase 3 D-05/D-06/D-07/D-10/D-17: inline icon-button toggle for the audio cues.` | **KEEP** | WHY-comment: references decisions (D-05 through D-17) that shape the toggle's constraints. |
| 32 | `// Phase 3 D-10 'unavailable' takes highest priority and outranks needsResume because` | **KEEP** | WHY-comment: encodes the priority ordering invariant. Critical for future editors who might be tempted to reorder. |

### `src/components/PracticeToggle.tsx` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 1 | `// Phase 30 PRACTICE-01 + PRACTICE-03` | **DROP** | Pure narration — just lists requirement IDs with no WHY. No reader benefit — the file name and code speak for themselves. |

### `src/components/IosInstallSteps.tsx` (1 hit) + `src/components/IosInstallSteps.test.tsx` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| `.tsx:1` | `// Phase 29 Plan 01: Shared iOS install steps component.` | **DROP** | Narration-of-WHAT — the file is self-explanatory. |
| `.test.tsx:1` | `// Phase 29 Plan 01: IosInstallSteps component tests.` | **DROP** | Narration-of-WHAT — test file header restating the file name. |

### `src/components/NKShape.tsx` (2 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 10 | `// Phase 38 (VAR-01/VAR-02): shape variants removed; NKShape always renders OrbShape.` | **KEEP** | WHY-comment: encodes WHY `NKShape` always renders OrbShape — variants were removed in Phase 38. Future editors need this to not re-introduce branching. |
| 44 | `// Phase 31: count === 0 is the post-marker lead-in window — the user performs` | **KEEP** | WHY-comment: encodes the meaning of count=0 (post-marker lead-in, not a zero-count state). Critical for NK behavior. |

### `src/components/SettingsAnchor.test.tsx` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 11 | `// Phase 15 D-08, D-18: the anchor's disabled-during-session behavior is unit-testable` | **KEEP** | WHY-comment: explains WHY the anchor's disabled-during-session behavior is unit-testable (not an App integration concern). Decision D-08/D-18 reference. |

### `src/components/TimbrePicker.test.tsx` (5 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 6 | `// Phase 40 D-10(e/f/g) wiring: stub the preview module so the radio-click tests` | **KEEP** | WHY-comment: explains WHY the preview module is stubbed — prevents audio in tests. Encodes the D-10 testing constraint. |
| 22 | `// Phase 18 plan 05 test coverage — verbatim parity with ThemePicker.test.tsx (D-06 mirror).` | **DROP** | Narration-of-WHAT — "verbatim parity with ThemePicker" is implementation history, not a WHY constraint. D-06 mirror is not a constraint future editors must honor. |
| 133 | `// Phase 40 D-10(e): tap fires playInhalePreview with the new TimbreId.` | **KEEP** | WHY-comment: documents the spec requirement (D-10(e)) that the test verifies. |
| 144 | `// Phase 40 D-10(f): PREV-04 wiring lock — disabled button never reaches preview.` | **KEEP** | WHY-comment: documents the spec requirement (D-10(f)) and the invariant it locks. |
| 154 | `// Phase 40 D-10(g): re-audition semantics — same-id re-tap fires the preview again.` | **KEEP** | WHY-comment: documents D-10(g) spec requirement + the non-obvious re-audition semantic. |

### `src/audio/cueSynth.ts` (7 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 4 | `// Phase 18 D-02: Bowl preset DSP recipes now live in src/audio/timbres.ts` | **KEEP** | WHY-comment: explains WHY Bowl recipes are in timbres.ts (not cueSynth). Orienting info for audio engineers. |
| 48 | `// Phase 18 D-12: these constants stay module-level and are SHARED across all` | **KEEP** | WHY-comment: encodes the sharing constraint (not per-timbre). Future editor might try to move them per-timbre. |
| 59 | `// Phase 18 D-07: the tick is FIXED across all timbres — the countdown role` | **KEEP** | WHY-comment: encodes the invariant that tick is fixed. "Perceptually distinct" is the WHY. |
| 83 | `// Phase 18 D-01: per-call resolution of fundamental + decay from the preset` | **KEEP** | WHY-comment: explains the per-call lookup design (vs cached). |
| 194 | `// Phase 18 D-01: new per-timbre dispatch surface. These functions look up the` | **KEEP** | WHY-comment: explains the design of the dispatch surface and its relation to callers. |
| 220 | `// Phase 18 D-01 option (a): Bowl-only thin wrappers preserved for TIMBRE-02` | **KEEP** | WHY-comment: encodes WHY the thin wrappers exist (TIMBRE-02 signature stability). Future editor must not delete them without understanding this. |
| 249 | `// Phase 18 D-07: body is byte-identical to v1.0.1 — tick stays fixed across all timbres.` | **KEEP** | WHY-comment: "byte-identical to v1.0.1" is the invariant. Future editors must not change the tick body. |

### `src/audio/audioEngine.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 161 | `// Phase 18 D-08: capture timbre once at construction. Immutable for this` | **KEEP** | WHY-comment: encodes the immutability invariant for timbre capture. Critical to the audio engine's correctness. |

### `src/audio/previewContext.no-audioengine-import.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 40 drift-guard (CONTEXT D-11) — PREV-03 structural lock.` | **KEEP** | Drift-guard self-description. |

### `src/audio/cueSynth.test.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 406 | `// Phase 18 Plan 03 Task 3: parameterized per-timbre coverage for the new` | **DROP** | Narration-of-WHAT — describes what the tests below do. No WHY needed; tests are self-describing. |

### `src/audio/audioEngine.test.ts` (2 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 135 | `// Phase 18 Plan 03: dispatch signature is (ac, when, dest, timbre, phaseDurationSec),` | **DROP** | Narration-of-WHAT — the spy call immediately below shows the signature. |
| 403 | `// Phase 18 Plan 03 Task 4: timbre-propagation tests verifying that the` | **DROP** | Narration-of-WHAT — section header narrating what the tests do. |

### `src/hooks/useAudioCues.ts` (8 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 24 | `// Phase 18 Plan 04: TimbreId is captured per-session via start(plan, timbre) and` | **KEEP** | WHY-comment: explains the D-08 capture posture that shapes the entire hook design. |
| 95 | `// Phase 4 D-14 / LOCL-01: persisted mute preference is restored at construction time` | **KEEP** | WHY-comment: explains WHY `initialMuted` is needed and the LOCL-01 reference. |
| 97 | `// Phase 3 D-07 first-visit default (muted=false / audio ON).` | **KEEP** | WHY-comment: explains the first-visit default and why it's `false`. |
| 110 | `// Phase 18 D-08: mirror of mutedRef's synchronous-pre-await capture posture for` | **KEEP** | WHY-comment: long and critical — explains WHY timbreRef mirrors mutedRef's posture. Key invariant for concurrent-safety. |
| 189 | `// Phase 5.1 D-01..D-05, D-08, D-09 (Plan 01) + Plan 06 D-39 / Pitfall 5:` | **KEEP** | WHY-comment: long block explaining the visibility-resume listener and its many design decisions. Highly load-bearing. |
| 232 | `// Phase 18 D-08: synchronous pre-await capture — mirror of mutedRef posture` | **KEEP** | WHY-comment: explains WHY `timbreRef.current = timbre` happens before the await. Concurrent-safety invariant. |
| 315 | `// Phase 18 D-11: capture session's original timbre BEFORE any await. Reconstruction` | **KEEP** | WHY-comment: explains the D-11 invariant (never re-read prefs for timbre). |
| 333 | `// Phase 18 D-11: passes the session-captured timbre (NOT a fresh prefs read)` | **KEEP** | WHY-comment: reinforces the D-11 invariant at the call site. |

### `src/hooks/useSessionEngine.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 220 | `// Phase 34: when a stretch settings object is wired in, start a stretch` | **KEEP** | WHY-comment: explains WHY the stretch branch exists and what it enables. |

### `src/hooks/useLocaleChoice.ts` (1 hit) + related hooks (5 more hits)

| File/Line | Comment | Classification | Rationale |
|-----------|---------|----------------|-----------|
| `useLocaleChoice.ts:3` | `// Phase 19: Picker-side companion hook for LanguagePicker.tsx (D-08 + D-21 — no App-side` | **KEEP** | WHY-comment: documents the D-08/D-21 posture (no App-side orchestration). |
| `useTimbreChoice.ts:3` | `// Phase 18: Picker-side companion hook for TimbrePicker.tsx (D-08 — no App-side` | **KEEP** | WHY-comment: same posture documentation. |
| `useCueChoice.ts:3` | `// Phase 25 Plan 02: Picker-side companion hook to useVisualCue (A-02).` | **KEEP** | WHY-comment: identifies the architectural role (companion to A-02). |
| `useTheme.ts:3` | `// Phase 16 Plan 02: App-side orchestrator hook that wires user theme choices` | **KEEP** | WHY-comment: documents the App-side orchestrator role. |
| `useThemeChoice.ts:3` | `// Phase 16 Plan 02: Picker-side companion hook to useTheme (A-02).` | **KEEP** | WHY-comment: companion/orchestrator pattern documentation. |
| `useVisualCue.ts:3` | `// Phase 25 Plan 02: App-side orchestrator hook for the cue dimension.` | **KEEP** | WHY-comment: orchestrator role documentation. |

### `src/hooks/useFavicon.ts` (1 hit) + `src/hooks/useFavicon.test.ts` (1 hit)

| File/Line | Comment | Classification | Rationale |
|-----------|---------|----------------|-----------|
| `useFavicon.ts:3` | `// Phase 21 Plan 02: App-side orchestrator hook for the favicon dimension (D-04, D-05).` | **KEEP** | WHY-comment: documents D-04/D-05 as the constraints. |
| `useFavicon.test.ts:3` | `// Phase 21 Plan 02: Tests for the useFavicon orchestrator hook.` | **DROP** | Narration-of-WHAT — the file name already says this. No decision referenced. |

### `src/hooks/useLocale.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 3 | `// Phase 19 I18N-01..I18N-07: App-side orchestrator hook for the locale dimension.` | **KEEP** | WHY-comment: documents the I18N requirement cluster this hook implements. |

### `src/hooks/useSessionEngine.test.tsx` (3 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 81 | `// Phase 3 fix: completion holds until the cycle that contains the` | **KEEP** | WHY-comment: same cycle-boundary invariant — explains why the test advances time past the configured duration. |
| 141 | `// Phase 10 HOOKS-03 / HOOKS-04 / HOOKS-02 identity contracts.` | **KEEP** | WHY-comment: documents WHY this section tests identity (not just behavior). HOOKS-02/03/04 reference constrains future test changes. |
| 415 | `// Phase 34: stretch session engine path (Plan 34-05).` | **DROP** | Narration-of-WHAT section header — the describe block below says "stretch session". |

### `src/hooks/useAudioCues.test.tsx` (3 hits)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 157 | `// Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (which forwards` | **DROP** | Narration-of-WHAT — the spy/mock call below shows this. |
| 1026 | `// Phase 10 HOOKS-01 callback identity contract.` | **KEEP** | WHY-comment: documents WHY this test exists (HOOKS-01 contract). |
| 1131 | `// Phase 18 Plan 04 timbre capture + reconstruction (D-08 + D-11).` | **KEEP** | WHY-comment: documents the D-08/D-11 invariants this test verifies. |

### `src/domain/sessionMath.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 32 | `// Phase 3 fix: completion holds until the current cycle finishes so audio cues` | **KEEP** | WHY-comment: encodes the completion-holds-to-cycle-boundary invariant in the implementation itself. Critical — future editors must not remove the `Math.ceil` rounding. |

### `src/domain/sessionMath.test.ts` (1 hit) + `src/domain/sessionController.test.ts` (1 hit)

| File/Line | Comment | Classification | Rationale |
|-----------|---------|----------------|-----------|
| `sessionMath.test.ts:56` | `// Phase 3 fix: timed completion holds until the current cycle ends so cues` | **KEEP** | WHY-comment: same invariant, in the test verifying it. |
| `sessionController.test.ts:49` | `// Phase 3 fix: completion holds to the next cycle boundary so cues never` | **KEEP** | WHY-comment: same invariant in controller test. |

### `src/domain/settings.ts` (1 hit)

| Line | Comment | Classification | Rationale |
|------|---------|----------------|-----------|
| 125 | `// Phase 14 D-01: v1.1 customization enum surfaces — predicates are FINAL;` | **KEEP** | WHY-comment: "predicates are FINAL" is an invariant — future editors must not add new values to the enum. |

---

## Section 2 Summary

| Classification | Count |
|----------------|-------|
| KEEP | 75 |
| DROP | 23 |
| **Total hits** | **98** |

**DROP candidates** (23 comments to remove):

1. `src/app/App.audio.test.tsx:92` — "Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (parameterized)."
2. `src/app/App.audio.test.tsx:335` — same (duplicate in AUDIO-02 test)
3. `src/app/App.audio.test.tsx:374` — same (duplicate in paired no-clamp test)
4. `src/app/App.audio.test.tsx:650` — "Phase 18 Plan 03: engine now calls scheduleOutCueForTimbre(ctx, time, dest, timbre, durSec)."
5. `src/app/App.session.test.tsx:299` — "Phase 31 — Navi Kriya session integration (NK-01/05/07/08/09, D-11/12/13)"
6. `src/app/App.session.test.tsx:466` — "Phase 34: Stretch session records stretch stats and leaves resonant untouched"
7. `src/app/App.persistence.test.tsx:137` — "Phase 30 Pitfall 3: the session records into practices.resonant.stats."
8. `src/app/App.persistence.test.tsx:264` — "Phase 34 — v2→v3 envelope upgrade shows migrated stretch config"
9. `src/components/OrbShape.test.tsx:9` — "Phase 25 Plan 03 — cue prop threading tests are at the bottom of this file."
10. `src/components/PracticeToggle.tsx:1` — "Phase 30 PRACTICE-01 + PRACTICE-03"
11. `src/components/IosInstallSteps.tsx:1` — "Phase 29 Plan 01: Shared iOS install steps component."
12. `src/components/IosInstallSteps.test.tsx:1` — "Phase 29 Plan 01: IosInstallSteps component tests."
13. `src/components/TimbrePicker.test.tsx:22` — "Phase 18 plan 05 test coverage — verbatim parity with ThemePicker.test.tsx (D-06 mirror)."
14. `src/audio/cueSynth.test.ts:406` — "Phase 18 Plan 03 Task 3: parameterized per-timbre coverage for the new"
15. `src/audio/audioEngine.test.ts:135` — "Phase 18 Plan 03: dispatch signature is (ac, when, dest, timbre, phaseDurationSec),"
16. `src/audio/audioEngine.test.ts:403` — "Phase 18 Plan 03 Task 4: timbre-propagation tests verifying that the"
17. `src/hooks/useAudioCues.test.tsx:157` — "Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (which forwards"
18. `src/hooks/useFavicon.test.ts:3` — "Phase 21 Plan 02: Tests for the useFavicon orchestrator hook."
19. `src/hooks/useSessionEngine.test.tsx:415` — "Phase 34: stretch session engine path (Plan 34-05)."

Wait — I count 19 here. Let me reconcile.

Actually reviewing again: the "Phase N" section header comments in App.session.test.tsx (lines 299, 466) and App.persistence.test.tsx (264) — these are section dividers that use `// ---` + `// Phase N` + `// ---` patterns. Let me verify they are pure comments (not section `describe` labels).

The describe block at App.session.test.tsx line 299 is OUTSIDE a describe — it's a free-standing section header comment. The describe block follows immediately (`// Phase 31 — Navi Kriya...` then `interface NKSeed { ... }`). The comment is a visual divider only, and the describe block heading is not in this same comment. Drop is correct.

For App.persistence.test.tsx:264: `// Phase 34 — v2→v3 envelope upgrade shows migrated stretch config` — followed by `describe('Phase 34 — v2 envelope migrates to v3...')`. The describe already has the info. Drop correct.

**Final Section 2 DROP count: 19 comments across 12 files**

---

## Section 3 — SCHEDULED-FOR-REMOVAL / LEGACY / DEPRECATED / TODO / FIXME / XXX / HACK

`grep -rn 'scheduled for removal\|legacy modal\|deprecated\|TODO\|FIXME\|XXX\|HACK' src`

**Result: 4 hits**

| File | Line | Comment | Classification | Notes |
|------|------|---------|----------------|-------|
| `content.no-review-markers.test.ts:3` | 3 | `// Phase 26 D-12: marker-guard. Fails if "// TODO: native-speaker review" appears` | **KEEP** | The `TODO:` string appears inside a description of what the marker-guard detects. This is a drift-guard self-description, not a TODO marker. |
| `content.no-review-markers.test.ts:36` | 36 | `const REVIEW_MARKER = 'TODO: native-speaker review'` | **KEEP** | This is a string literal constant (not a comment). It's the pattern being tested. Cannot and should not be changed. |
| `content.no-review-markers.test.ts:39` | 39 | `it('no "// TODO: native-speaker review" marker remains in src/content/', ...)` | **KEEP** | Test description string (not a comment). |
| `content.no-removed-themes.test.ts:36` | 36 | `// that re-introduces a deprecated palette (or claims one of these reserved names)` | **KEEP** | The word `deprecated` here describes Moss/Slate/Dusk themes that are deprecated. This is a WHY-comment in the drift-guard — it explains WHY these palette names are reserved. |
| `storage/prefs.test.ts:233` | 233 | `it('coerces deprecated persisted theme values to "system" on read — THM-05 ...')` | **KEEP** | Test name string (not a comment). Cannot be changed without modifying test behavior. |
| `storage/prefs.test.ts:234` | 234 | `for (const deprecated of ['moss', 'slate', 'dusk']) {` | **KEEP** | Variable name `deprecated` in code (not a comment). This is a code change — out of scope for this plan. |
| `storage/prefs.test.ts:237` | 237 | `prefs: { theme: deprecated, timbre: 'bowl', cue: 'arrow', locale: 'en' },` | **KEEP** | Code line — out of scope. |
| `storage/prefs.test.ts:243` | 243 | `it('re-persists deprecated theme as "system" on the next savePrefs...')` | **KEEP** | Test name string — not a comment. |

**Section 3 analysis:**
- None of the hits are actual TODO/FIXME/XXX/HACK action markers
- `TODO:` in `content.no-review-markers.test.ts` is a **target string** being tested for absence, not an action item
- `deprecated` in `content.no-removed-themes.test.ts:36` is a descriptive adjective in a WHY-comment
- `deprecated` in `prefs.test.ts` is a variable name and test name string — these are code, not comments
- Zero hits require edits in this plan

**Section 3 DROP count: 0**
**Cross-reference with 44-INFO-FINDINGS.md:** None of these patterns are action TODOs that would need adding to 44-INFO-FINDINGS.md.

---

## Section 4 — AMBIGUOUS WHY CANDIDATES (KEEP-WITH-RATIONALE)

The following KEEP decisions in Section 2 are non-obvious and warrant explicit rationale:

**1. `src/app/App.audio.test.tsx:188` / `App.session.test.tsx:98` / `App.dialog.test.tsx:131` / `useSessionEngine.test.tsx:81` / `sessionMath.test.ts:56` / `sessionController.test.ts:49` / `sessionMath.ts:32`**
*"Phase 3 fix: completion holds until [cycle] boundary"* — KEEP
WHY: These are the same invariant. The cycle-boundary completion hold is WHY the tests advance timers more than the configured duration. Without this comment, every future test writer will "fix" the advance to match the configured duration exactly and break the test. The comment is a guard against a common mistake.

**2. `src/audio/cueSynth.ts:220` — "Phase 18 D-01 option (a): Bowl-only thin wrappers preserved for TIMBRE-02"**
KEEP because "preserved for TIMBRE-02 signature stability" is a constraint — someone might delete `scheduleInCue` / `scheduleOutCue` thinking they're unused, but they're compatibility wrappers. The WHY ("Existing v1.0.1 callers that haven't yet migrated to the per-timbre dispatch") must be known.

**3. `src/components/OrbShape.tsx:69` — "Phase 38 D-03: OrbShape is the sole shape..."**
KEEP because post-Phase-38, `BreathingShape` no longer owns the null-return. The comment explains a structural responsibility shift. Without it, a reader might wonder why OrbShape owns the guard.

**4. `src/hooks/useAudioCues.ts:189` — "Phase 5.1 D-01..D-05..."**
KEEP — the longest WHY-comment in the file. Covers the visibility-resume listener's multiple design decisions, cross-references Plan 01/06 decisions, and explains the non-obvious `visibilityResumeAttemptedRef = true` gate. This is exactly the "surprising behavior / workaround" category.

**5. `src/domain/settings.ts:125` — "predicates are FINAL"**
KEEP — "FINAL" is a constraint that cannot be inferred from code alone. It prevents future editors from adding new enum values.

---

## Section 5 — TIGER STYLE INTERPRETATION

**General posture:** Per CONTEXT D-05 "when in doubt, prefer fix-or-defer over obsolete" — analogously, when uncertain between KEEP and DROP, bias toward KEEP. This sweep applied KEEP whenever a Phase-N comment references a decision code (D-XX), requirement code (POLISH-XX, TIMBRE-XX, etc.), or encodes a non-obvious constraint or invariant.

**Dropped comments are genuinely narration-of-WHAT:**
- "Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (parameterized)." — the code below shows this.
- "Phase 34 — v2→v3 envelope upgrade shows migrated stretch config" — the describe block says this.
- "Phase 29 Plan 01: Shared iOS install steps component." — the file name says this.
- "Phase 18 Plan 03 Task 3: parameterized per-timbre coverage for the new" — the tests describe themselves.
- "Phase 21 Plan 02: Tests for the useFavicon orchestrator hook." — file name already says this.

**No ambiguous cases required Rule 4 escalation** — all decisions fit within the Tiger Style "drop narration-of-WHAT, keep WHY" framework.

**Cross-cluster overlap confirmed:** The third grep guard (Square/Diamond/Moss/Slate/Dusk/Chime) is deferred to 44-05. The 44-03 sweep found no hits for these patterns in code comments (only in drift-guard test files where they are locked string patterns, not removable).

---

## Audit Summary

| Category | DROP | KEEP |
|----------|------|------|
| Section 1 (deleted-component refs) | 0 | 2 (drift-guard patterns) |
| Section 2 (Phase-N narration markers) | 19 | 75 |
| Section 3 (TODO/FIXME/scheduled-for-removal) | 0 | all hits are non-action |
| **Total** | **19** | **77** |

**Files requiring edits (DROP applies):**
1. `src/app/App.audio.test.tsx` — 4 drops
2. `src/app/App.session.test.tsx` — 2 drops
3. `src/app/App.persistence.test.tsx` — 2 drops
4. `src/components/OrbShape.test.tsx` — 1 drop
5. `src/components/PracticeToggle.tsx` — 1 drop
6. `src/components/IosInstallSteps.tsx` — 1 drop
7. `src/components/IosInstallSteps.test.tsx` — 1 drop
8. `src/components/TimbrePicker.test.tsx` — 1 drop
9. `src/audio/cueSynth.test.ts` — 1 drop
10. `src/audio/audioEngine.test.ts` — 2 drops
11. `src/hooks/useAudioCues.test.tsx` — 1 drop
12. `src/hooks/useFavicon.test.ts` — 1 drop
13. `src/hooks/useSessionEngine.test.tsx` — 1 drop
